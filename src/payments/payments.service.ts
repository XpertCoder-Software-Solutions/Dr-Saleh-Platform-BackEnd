import {
  BadGatewayException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  Optional,
  ServiceUnavailableException,
} from '@nestjs/common';
import {
  BookFormatType,
  Currency,
  OrderItemType,
  OrderStatus,
  PaymentMethod,
  PaymentProvider,
  PaymentStatus,
  Prisma,
} from '@prisma/client';
import { createHash, createHmac, timingSafeEqual } from 'crypto';
import { AuditLogService } from '../audit-logs/audit-log.service';
import {
  AuditActions,
  AuditEntityTypes,
} from '../audit-logs/audit-log.constants';
import { isPrismaUniqueConstraintError } from '../common/utils/prisma-errors';
import fawryConfig, { type FawryConfig } from '../config/fawry.config';
import paypalConfig, { type PaypalConfig } from '../config/paypal.config';
import paymobConfig, { type PaymobConfig } from '../config/paymob.config';
import { PrismaService } from '../database/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { ReferralsService } from '../referrals/referrals.service';
import { CreateFawryPaymentDto } from './dto/create-fawry-payment.dto';
import { CreatePaypalPaymentDto } from './dto/create-paypal-payment.dto';
import {
  CreatePaymobPaymentDto,
  PaymobChannel,
} from './dto/create-paymob-payment.dto';
import { FawryWebhookDto } from './dto/fawry-webhook.dto';

const paymentSelect = {
  id: true,
  orderId: true,
  userId: true,
  provider: true,
  method: true,
  status: true,
  amount: true,
  currency: true,
  merchantRefNumber: true,
  providerReferenceNumber: true,
  paypalOrderId: true,
  providerPaymentReference: true,
  providerStatus: true,
  providerResponse: true,
  failureReason: true,
  paidAt: true,
  cancelledAt: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.PaymentSelect;

const orderPaymentSelect = {
  id: true,
  userId: true,
  orderNumber: true,
  status: true,
  paymentStatus: true,
  currency: true,
  totalAmount: true,
  user: {
    select: {
      id: true,
      fullName: true,
      email: true,
      phoneNumber: true,
    },
  },
  items: {
    select: {
      id: true,
      itemType: true,
      itemId: true,
      titleAr: true,
      titleEn: true,
      quantity: true,
      unitPrice: true,
      discountPrice: true,
      totalPrice: true,
    },
    orderBy: {
      createdAt: 'asc' as const,
    },
  },
  payments: {
    select: paymentSelect,
  },
} satisfies Prisma.OrderSelect;

const paymentNotificationOrderSelect = {
  id: true,
  orderNumber: true,
  currency: true,
  totalAmount: true,
  user: {
    select: {
      id: true,
      fullName: true,
      email: true,
    },
  },
  items: {
    select: {
      itemType: true,
      titleAr: true,
      titleEn: true,
    },
    orderBy: {
      createdAt: 'asc' as const,
    },
  },
} satisfies Prisma.OrderSelect;

type PaymentRecord = Prisma.PaymentGetPayload<{ select: typeof paymentSelect }>;
type OrderPaymentRecord = Prisma.OrderGetPayload<{
  select: typeof orderPaymentSelect;
}>;
type PaymentNotificationOrderRecord = Prisma.OrderGetPayload<{
  select: typeof paymentNotificationOrderSelect;
}>;

type RequiredFawryConfig = {
  baseUrl: string;
  merchantCode: string;
  securityKey: string;
  returnUrl: string;
  notificationUrl: string;
};

type RequiredPaypalConfig = {
  clientId: string;
  clientSecret: string;
  baseUrl: string;
  webhookId: string;
};

type PaymentTransactionUpsertOptions = {
  transactionReference?: string;
  providerTransactionId?: string | null;
};

type FawryChargeResponse = {
  type?: string;
  referenceNumber?: string;
  fawryRefNumber?: string;
  merchantRefNumber?: string;
  merchantRefNum?: string;
  orderAmount?: number | string;
  paymentAmount?: number | string;
  fawryFees?: number | string;
  paymentMethod?: string;
  orderStatus?: string;
  paymentTime?: number | string;
  customerMobile?: string;
  customerMail?: string;
  signature?: string;
  statusCode?: number | string;
  statusDescription?: string;
  code?: number | string;
  description?: string;
  reason?: string;
};

type FawryStatusLikePayload = FawryChargeResponse & {
  paymentRefrenceNumber?: string;
  paymentReferenceNumber?: string;
  messageSignature?: string;
  failureReason?: string;
};

type FawryCancelResponse = {
  code?: number | string;
  statusCode?: number | string;
  description?: string;
  statusDescription?: string;
  reason?: string;
  orderStatus?: string;
};

type RequiredPaymobConfig = {
  baseUrl: string;
  checkoutUrl: string;
  secretKey: string;
  publicKey: string;
  hmacSecret: string;
  notificationUrl: string;
  redirectionUrl: string;
};

type PaymobIntentionResponse = {
  id?: string;
  client_secret?: string;
  intention_order_id?: number;
  special_reference?: string;
  status?: string;
};

/** Transaction object sent by Paymob in the processed callback (`obj`). */
type PaymobTransaction = {
  id?: number | string;
  amount_cents?: number | string;
  created_at?: string;
  currency?: string;
  error_occured?: boolean | string;
  has_parent_transaction?: boolean | string;
  integration_id?: number | string;
  is_3d_secure?: boolean | string;
  is_auth?: boolean | string;
  is_capture?: boolean | string;
  is_refunded?: boolean | string;
  is_standalone_payment?: boolean | string;
  is_voided?: boolean | string;
  order?:
    | { id?: number | string; merchant_order_id?: string }
    | number
    | string;
  owner?: number | string;
  pending?: boolean | string;
  source_data?: { pan?: string; sub_type?: string; type?: string };
  success?: boolean | string;
  data?: { message?: string };
  special_reference?: string;
  merchant_order_id?: string;
};

type PaypalLink = {
  href: string;
  rel: string;
  method?: string;
};

type PaypalCapture = {
  id?: string;
  status?: string;
  amount?: {
    currency_code?: string;
    value?: string;
  };
  create_time?: string;
  update_time?: string;
};

type PaypalOrderResponse = {
  id?: string;
  status?: string;
  links?: PaypalLink[];
  purchase_units?: Array<{
    reference_id?: string;
    custom_id?: string;
    invoice_id?: string;
    amount?: {
      currency_code?: string;
      value?: string;
    };
    payments?: {
      captures?: PaypalCapture[];
    };
  }>;
};

type PaypalAccessTokenResponse = {
  access_token?: string;
  token_type?: string;
  expires_in?: number;
};

type PaypalVerifyWebhookResponse = {
  verification_status?: 'SUCCESS' | 'FAILURE';
};

type PaypalWebhookEvent = {
  id?: string;
  event_type?: string;
  create_time?: string;
  resource?: Record<string, unknown>;
};

@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(fawryConfig.KEY)
    private readonly fawryConfiguration: FawryConfig,
    @Inject(paypalConfig.KEY)
    private readonly paypalConfiguration: PaypalConfig,
    @Inject(paymobConfig.KEY)
    private readonly paymobConfiguration: PaymobConfig,
    private readonly referralsService: ReferralsService,
    private readonly notificationsService: NotificationsService,
    @Optional()
    private readonly auditLogService?: AuditLogService,
  ) {}

  async createFawryPayment(
    userId: string,
    createFawryPaymentDto: CreateFawryPaymentDto,
  ): Promise<{
    message: string;
    data: {
      payment: ReturnType<typeof this.toPayment>;
      referenceNumber: string | null;
      merchantRefNumber: string;
    };
  }> {
    const configuration = this.getRequiredFawryConfig();
    const order = await this.findOwnedPendingOrderOrThrow(
      userId,
      createFawryPaymentDto.orderId,
    );
    const existingPayment = this.findPaymentForProvider(
      order,
      PaymentProvider.FAWRY,
      PaymentMethod.FAWRY_REFERENCE,
    );

    this.assertNoConflictingActivePayment(
      order,
      PaymentProvider.FAWRY,
      PaymentMethod.FAWRY_REFERENCE,
    );

    if (existingPayment?.status === PaymentStatus.PAID) {
      throw new ConflictException('Order is already paid.');
    }

    if (
      existingPayment?.status === PaymentStatus.PENDING &&
      existingPayment.providerReferenceNumber
    ) {
      return {
        message: 'Fawry payment request already exists',
        data: {
          payment: this.toPayment(existingPayment),
          referenceNumber: existingPayment.providerReferenceNumber,
          merchantRefNumber: existingPayment.merchantRefNumber,
        },
      };
    }

    const payment = await this.upsertPendingPayment(order, existingPayment);
    const requestPayload = this.buildFawryChargeRequest(
      order,
      payment.merchantRefNumber,
      configuration,
    );
    const fawryResponse = await this.postFawry<FawryChargeResponse>(
      '/ECommerceWeb/Fawry/payments/charge',
      requestPayload,
      configuration,
    );

    this.assertFawrySuccessResponse(fawryResponse);
    this.verifyFawryResponseSignatureIfPresent(fawryResponse, configuration);

    const updatedPayment = await this.applyFawryStatusUpdate(
      payment,
      fawryResponse,
    );

    this.logPaymentCreatedAudit(order, updatedPayment);

    return {
      message: 'Fawry payment request created successfully',
      data: {
        payment: this.toPayment(updatedPayment),
        referenceNumber:
          updatedPayment.providerReferenceNumber ??
          fawryResponse.referenceNumber ??
          fawryResponse.fawryRefNumber ??
          null,
        merchantRefNumber: updatedPayment.merchantRefNumber,
      },
    };
  }

  async handleFawryWebhook(
    webhookDto: FawryWebhookDto,
  ): Promise<{ message: string; data: { received: boolean } }> {
    const configuration = this.getRequiredFawryConfig();

    this.verifyFawryWebhookSignature(webhookDto, configuration);

    const payment = await this.findPaymentByMerchantReferenceOrThrow(
      this.toStringValue(webhookDto.merchantRefNumber),
    );

    await this.applyFawryStatusUpdate(payment, webhookDto);

    return {
      message: 'Fawry webhook processed successfully',
      data: { received: true },
    };
  }

  async pullFawryStatus(
    userId: string,
    orderId: string,
  ): Promise<{
    message: string;
    data: { payment: ReturnType<typeof this.toPayment> };
  }> {
    const configuration = this.getRequiredFawryConfig();
    const payment = await this.findOwnedFawryPaymentOrThrow(userId, orderId);
    const signature = this.sha256(
      `${configuration.merchantCode}${payment.merchantRefNumber}${configuration.securityKey}`,
    );
    const fawryResponse = await this.getFawry<FawryChargeResponse>(
      '/ECommerceWeb/Fawry/payments/status/v2',
      {
        merchantCode: configuration.merchantCode,
        merchantRefNumber: payment.merchantRefNumber,
        signature,
      },
      configuration,
    );

    this.assertFawrySuccessResponse(fawryResponse);
    this.verifyFawryResponseSignatureIfPresent(fawryResponse, configuration);

    const updatedPayment = await this.applyFawryStatusUpdate(
      payment,
      fawryResponse,
    );

    return {
      message: 'Fawry payment status returned successfully',
      data: {
        payment: this.toPayment(updatedPayment),
      },
    };
  }

  async cancelFawryPayment(
    userId: string,
    orderId: string,
  ): Promise<{
    message: string;
    data: { payment: ReturnType<typeof this.toPayment> };
  }> {
    const configuration = this.getRequiredFawryConfig();
    const payment = await this.findOwnedFawryPaymentOrThrow(userId, orderId);

    if (payment.status === PaymentStatus.PAID) {
      throw new ConflictException('Paid payments cannot be cancelled.');
    }

    if (payment.status === PaymentStatus.CANCELLED) {
      return {
        message: 'Fawry payment already cancelled',
        data: { payment: this.toPayment(payment) },
      };
    }

    if (!payment.providerReferenceNumber) {
      throw new ConflictException('Fawry reference number is not available.');
    }

    const language = 'en-gb';
    const signature = this.sha256(
      `${payment.providerReferenceNumber}${configuration.merchantCode}${language}${configuration.securityKey}`,
    );
    const fawryResponse = await this.postFawry<FawryCancelResponse>(
      '/ECommerceWeb/api/orders/cancel-unpaid-order',
      {
        merchantAccount: configuration.merchantCode,
        orderRefNo: payment.providerReferenceNumber,
        lang: language,
        signature,
      },
      configuration,
    );

    this.assertFawryCancelSuccessResponse(fawryResponse);

    const updatedPayment = await this.markPaymentCancelled(
      payment,
      fawryResponse,
    );

    return {
      message: 'Fawry payment cancelled successfully',
      data: { payment: this.toPayment(updatedPayment) },
    };
  }

  async createPaypalPayment(
    userId: string,
    createPaypalPaymentDto: CreatePaypalPaymentDto,
  ): Promise<{
    message: string;
    data: {
      payment: ReturnType<typeof this.toPayment>;
      paypalOrderId: string;
      approvalUrl: string;
    };
  }> {
    const configuration = this.getRequiredPaypalConfig();
    const order = await this.findOwnedPendingOrderOrThrow(
      userId,
      createPaypalPaymentDto.orderId,
    );

    this.assertPaypalOrderPayable(order);

    const existingPayment = this.findPaymentForProvider(
      order,
      PaymentProvider.PAYPAL,
      PaymentMethod.PAYPAL_CHECKOUT,
    );

    this.assertNoConflictingActivePayment(
      order,
      PaymentProvider.PAYPAL,
      PaymentMethod.PAYPAL_CHECKOUT,
    );

    if (existingPayment?.status === PaymentStatus.PAID) {
      throw new ConflictException('Order is already paid.');
    }

    const existingApprovalUrl = this.extractApprovalUrlFromProviderResponse(
      existingPayment?.providerResponse,
    );

    if (
      existingPayment?.status === PaymentStatus.PENDING &&
      existingPayment.paypalOrderId &&
      existingApprovalUrl
    ) {
      return {
        message: 'PayPal order already exists',
        data: {
          payment: this.toPayment(existingPayment),
          paypalOrderId: existingPayment.paypalOrderId,
          approvalUrl: existingApprovalUrl,
        },
      };
    }

    const paypalOrder = await this.postPaypal<PaypalOrderResponse>(
      '/v2/checkout/orders',
      this.buildPaypalCreateOrderRequest(order),
      configuration,
    );
    const paypalOrderId = this.optionalStringValue(paypalOrder.id);
    const approvalUrl = paypalOrder.links?.find(
      (link) => link.rel.toLowerCase() === 'approve',
    )?.href;

    if (!paypalOrderId || !approvalUrl) {
      throw new BadGatewayException(
        'PayPal order response did not include an approval URL.',
      );
    }

    const payment = await this.upsertPendingPaypalPayment(
      order,
      existingPayment,
      paypalOrder,
      approvalUrl,
    );

    this.logPaymentCreatedAudit(order, payment);

    return {
      message: 'PayPal order created successfully',
      data: {
        payment: this.toPayment(payment),
        paypalOrderId,
        approvalUrl,
      },
    };
  }

  async handlePaypalWebhook(
    headers: Record<string, unknown>,
    webhookEvent: Record<string, unknown>,
  ): Promise<{ message: string; data: { received: boolean } }> {
    const configuration = this.getRequiredPaypalConfig();
    const paypalWebhookEvent = webhookEvent as PaypalWebhookEvent;

    await this.verifyPaypalWebhook(headers, paypalWebhookEvent, configuration);

    const payment =
      await this.findPaypalPaymentFromWebhookOrThrow(paypalWebhookEvent);
    const paypalOrderId =
      payment.paypalOrderId ?? payment.providerReferenceNumber;

    if (!paypalOrderId) {
      throw new BadRequestException('PayPal order id is not available.');
    }

    const paypalOrder = await this.getAndCaptureApprovedPaypalOrder(
      payment,
      paypalOrderId,
      configuration,
    );

    await this.applyPaypalStatusUpdate(
      payment,
      paypalOrder,
      paypalWebhookEvent,
    );

    return {
      message: 'PayPal webhook processed successfully',
      data: { received: true },
    };
  }

  async pullPaypalStatus(
    userId: string,
    orderId: string,
  ): Promise<{
    message: string;
    data: { payment: ReturnType<typeof this.toPayment> };
  }> {
    const configuration = this.getRequiredPaypalConfig();
    const payment = await this.findOwnedPaypalPaymentOrThrow(userId, orderId);
    const paypalOrderId =
      payment.paypalOrderId ?? payment.providerReferenceNumber;

    if (!paypalOrderId) {
      throw new ConflictException('PayPal order id is not available.');
    }

    const paypalOrder = await this.getAndCaptureApprovedPaypalOrder(
      payment,
      paypalOrderId,
      configuration,
    );
    const updatedPayment = await this.applyPaypalStatusUpdate(
      payment,
      paypalOrder,
    );

    return {
      message: 'PayPal payment status returned successfully',
      data: {
        payment: this.toPayment(updatedPayment),
      },
    };
  }

  // ---------------------------------------------------------------- Paymob

  /**
   * Creates a Paymob payment intention for an owned pending EGP order and
   * returns the Unified Checkout URL to redirect the buyer to.
   */
  async createPaymobPayment(
    userId: string,
    dto: CreatePaymobPaymentDto,
  ): Promise<{
    message: string;
    data: { payment: ReturnType<typeof this.toPayment>; checkoutUrl: string };
  }> {
    const configuration = this.getRequiredPaymobConfig();
    const integrationId = this.getPaymobIntegrationId(dto.channel);
    const order = await this.findOwnedPendingOrderOrThrow(userId, dto.orderId);

    if (order.currency !== Currency.EGP) {
      throw new BadRequestException('Paymob payments support EGP orders only.');
    }

    this.assertNoConflictingActivePayment(
      order,
      PaymentProvider.PAYMOB,
      PaymentMethod.PAYMOB_CHECKOUT,
    );

    const existingPayment = this.findPaymentForProvider(
      order,
      PaymentProvider.PAYMOB,
      PaymentMethod.PAYMOB_CHECKOUT,
    );

    // A new intention per attempt: the buyer may switch channel (card -> wallet).
    const attempt = Date.now().toString(36).toUpperCase();
    const merchantRefNumber = `${order.orderNumber}-PAYMOB-${attempt}`;
    const intention = await this.postPaymob<PaymobIntentionResponse>(
      '/v1/intention/',
      this.buildPaymobIntentionRequest(
        order,
        merchantRefNumber,
        integrationId,
        configuration,
      ),
      configuration,
    );
    const clientSecret = this.optionalStringValue(intention.client_secret);

    if (!clientSecret) {
      throw new BadGatewayException(
        'Paymob intention response did not include a client secret.',
      );
    }

    const checkoutUrl = `${configuration.checkoutUrl}?publicKey=${encodeURIComponent(
      configuration.publicKey,
    )}&clientSecret=${encodeURIComponent(clientSecret)}`;
    const providerResponse = this.toJson({
      intentionId: intention.id,
      intentionOrderId: intention.intention_order_id,
      status: intention.status,
      channel: dto.channel,
    });
    const data = {
      status: PaymentStatus.PENDING,
      amount: order.totalAmount,
      currency: order.currency,
      merchantRefNumber,
      providerReferenceNumber: null,
      providerPaymentReference: this.optionalStringValue(intention.id) ?? null,
      providerStatus: this.optionalStringValue(intention.status) ?? null,
      providerResponse,
      failureReason: null,
      paidAt: null,
      cancelledAt: null,
    };

    let payment: PaymentRecord;

    try {
      payment = existingPayment
        ? await this.prisma.payment.update({
            where: { id: existingPayment.id },
            data,
            select: paymentSelect,
          })
        : await this.prisma.payment.create({
            data: {
              ...data,
              orderId: order.id,
              userId: order.userId,
              provider: PaymentProvider.PAYMOB,
              method: PaymentMethod.PAYMOB_CHECKOUT,
            },
            select: paymentSelect,
          });
    } catch (error) {
      this.handleDuplicatePaymentError(
        error,
        'Paymob payment already exists for this order.',
      );
    }

    this.logPaymentCreatedAudit(order, payment);

    return {
      message: 'Paymob checkout created successfully',
      data: { payment: this.toPayment(payment), checkoutUrl },
    };
  }

  /** Transaction processed callback (POST, HMAC in the `hmac` query param). */
  async handlePaymobWebhook(
    body: Record<string, unknown>,
    hmac: string | undefined,
  ): Promise<{ message: string; data: { received: boolean } }> {
    const configuration = this.getRequiredPaymobConfig();
    const transaction = (this.toRecord(body.obj) ?? {}) as PaymobTransaction;

    if (this.toStringValue(body.type).toUpperCase() !== 'TRANSACTION') {
      return { message: 'Ignored', data: { received: true } };
    }

    this.assertPaymobHmac(
      this.paymobHmacFields(transaction),
      hmac,
      configuration.hmacSecret,
    );
    await this.applyPaymobTransaction(transaction, body);

    return {
      message: 'Paymob webhook processed successfully',
      data: { received: true },
    };
  }

  /**
   * The buyer's browser comes back from Paymob with the transaction as query
   * params. The frontend forwards them here; the HMAC proves Paymob sent them,
   * so the order is confirmed even if the server callback is late.
   */
  async confirmPaymobReturn(
    userId: string,
    query: Record<string, unknown>,
  ): Promise<{
    message: string;
    data: { payment: ReturnType<typeof this.toPayment>; orderId: string };
  }> {
    const configuration = this.getRequiredPaymobConfig();
    const q = (key: string) => this.toStringValue(query[key]);

    this.assertPaymobHmac(
      [
        q('amount_cents'),
        q('created_at'),
        q('currency'),
        q('error_occured'),
        q('has_parent_transaction'),
        q('id'),
        q('integration_id'),
        q('is_3d_secure'),
        q('is_auth'),
        q('is_capture'),
        q('is_refunded'),
        q('is_standalone_payment'),
        q('is_voided'),
        q('order'),
        q('owner'),
        q('pending'),
        q('source_data.pan'),
        q('source_data.sub_type'),
        q('source_data.type'),
        q('success'),
      ],
      this.optionalStringValue(query.hmac),
      configuration.hmacSecret,
    );

    const transaction: PaymobTransaction = {
      id: q('id'),
      amount_cents: q('amount_cents'),
      currency: q('currency'),
      pending: q('pending'),
      success: q('success'),
      is_refunded: q('is_refunded'),
      is_voided: q('is_voided'),
      merchant_order_id: q('merchant_order_id'),
      data: { message: q('data.message') },
    };
    const payment = await this.applyPaymobTransaction(transaction, query);

    if (payment.userId !== userId) {
      throw new NotFoundException('Payment not found.');
    }

    return {
      message: 'Paymob payment status returned successfully',
      data: { payment: this.toPayment(payment), orderId: payment.orderId },
    };
  }

  /** Current Paymob payment for an owned order (updated by the callbacks). */
  async getPaymobStatus(
    userId: string,
    orderId: string,
  ): Promise<{
    message: string;
    data: { payment: ReturnType<typeof this.toPayment> };
  }> {
    const payment = await this.prisma.payment.findFirst({
      where: {
        orderId,
        userId,
        provider: PaymentProvider.PAYMOB,
      },
      select: paymentSelect,
    });

    if (!payment) {
      throw new NotFoundException('Paymob payment not found.');
    }

    return {
      message: 'Paymob payment status returned successfully',
      data: { payment: this.toPayment(payment) },
    };
  }

  private async applyPaymobTransaction(
    transaction: PaymobTransaction,
    rawPayload: unknown,
  ): Promise<PaymentRecord> {
    const orderField = transaction.order;
    const merchantRefNumber =
      this.optionalStringValue(transaction.merchant_order_id) ??
      (typeof orderField === 'object' && orderField !== null
        ? this.optionalStringValue(orderField.merchant_order_id)
        : undefined) ??
      this.optionalStringValue(transaction.special_reference);

    if (!merchantRefNumber) {
      throw new BadRequestException('Paymob merchant reference is missing.');
    }

    const payment = await this.prisma.payment.findUnique({
      where: { merchantRefNumber },
      select: paymentSelect,
    });

    if (!payment || payment.provider !== PaymentProvider.PAYMOB) {
      throw new NotFoundException('Paymob payment not found.');
    }

    const order = await this.prisma.order.findUnique({
      where: { id: payment.orderId },
      select: { totalAmount: true, currency: true },
    });
    const amountCents = Number(this.toStringValue(transaction.amount_cents));
    const expectedCents = Math.round(
      Number(order?.totalAmount.toString() ?? 0) * 100,
    );
    let nextStatus = this.mapPaymobStatus(transaction);

    // Never mark paid on an amount or currency mismatch.
    if (
      nextStatus === PaymentStatus.PAID &&
      (amountCents !== expectedCents ||
        this.toStringValue(transaction.currency).toUpperCase() !==
          order?.currency)
    ) {
      nextStatus = PaymentStatus.FAILED;
    }

    // Paid is final; ignore late duplicates that would move it backwards.
    if (
      payment.status === PaymentStatus.PAID &&
      nextStatus !== PaymentStatus.REFUNDED
    ) {
      return payment;
    }

    const transactionId = this.optionalStringValue(transaction.id);
    const providerResponse = this.toJson(rawPayload);
    const failureReason =
      nextStatus === PaymentStatus.FAILED
        ? (this.optionalStringValue(transaction.data?.message) ??
          'Payment was declined.')
        : null;

    const updatedPayment = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.payment.update({
        where: { id: payment.id },
        data: {
          status: nextStatus,
          providerReferenceNumber:
            transactionId ?? payment.providerReferenceNumber,
          providerStatus: nextStatus,
          providerResponse,
          failureReason,
          paidAt:
            nextStatus === PaymentStatus.PAID
              ? (payment.paidAt ?? new Date())
              : payment.paidAt,
        },
        select: paymentSelect,
      });

      await this.upsertPaymentTransaction(tx, updated, providerResponse, {
        transactionReference: transactionId
          ? `PAYMOB-${transactionId}`
          : payment.merchantRefNumber,
        providerTransactionId: transactionId ?? null,
      });

      if (nextStatus === PaymentStatus.PAID) {
        await tx.order.update({
          where: { id: payment.orderId },
          data: {
            status: OrderStatus.PAID,
            paymentStatus: PaymentStatus.PAID,
            paidAt: updated.paidAt ?? new Date(),
          },
        });
        await this.grantPaidDigitalAccess(tx, payment.orderId, payment.userId);
      } else if (nextStatus === PaymentStatus.FAILED) {
        await tx.order.update({
          where: { id: payment.orderId },
          data: { paymentStatus: PaymentStatus.FAILED },
        });
      } else if (nextStatus === PaymentStatus.REFUNDED) {
        await tx.order.update({
          where: { id: payment.orderId },
          data: {
            status: OrderStatus.REFUNDED,
            paymentStatus: PaymentStatus.REFUNDED,
          },
        });
      }

      return updated;
    });

    if (nextStatus === PaymentStatus.PAID) {
      await this.referralsService.rewardReferralAfterFirstPaidOrder(
        payment.userId,
      );
    }

    if (payment.status !== nextStatus) {
      await this.sendPaymentStatusNotification(
        payment.orderId,
        nextStatus,
        updatedPayment.failureReason,
      );
      this.logPaymentStatusAudit(updatedPayment, nextStatus);
    }

    return updatedPayment;
  }

  private mapPaymobStatus(transaction: PaymobTransaction): PaymentStatus {
    const flag = (value: unknown) => this.toStringValue(value) === 'true';

    if (flag(transaction.is_refunded)) {
      return PaymentStatus.REFUNDED;
    }

    if (flag(transaction.is_voided)) {
      return PaymentStatus.CANCELLED;
    }

    if (flag(transaction.pending)) {
      return PaymentStatus.PENDING;
    }

    return flag(transaction.success)
      ? PaymentStatus.PAID
      : PaymentStatus.FAILED;
  }

  /** Field order defined by Paymob for the transaction callback HMAC. */
  private paymobHmacFields(t: PaymobTransaction): string[] {
    const order = t.order;
    const orderId =
      typeof order === 'object' && order !== null ? order.id : order;
    return [
      t.amount_cents,
      t.created_at,
      t.currency,
      t.error_occured,
      t.has_parent_transaction,
      t.id,
      t.integration_id,
      t.is_3d_secure,
      t.is_auth,
      t.is_capture,
      t.is_refunded,
      t.is_standalone_payment,
      t.is_voided,
      orderId,
      t.owner,
      t.pending,
      t.source_data?.pan,
      t.source_data?.sub_type,
      t.source_data?.type,
      t.success,
    ].map((value) => this.toStringValue(value));
  }

  private assertPaymobHmac(
    fields: string[],
    received: string | undefined,
    secret: string,
  ): void {
    const expected = createHmac('sha512', secret)
      .update(fields.join(''))
      .digest('hex');
    const a = Buffer.from(expected);
    const b = Buffer.from((received ?? '').toLowerCase());

    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      throw new ForbiddenException('Invalid Paymob signature.');
    }
  }

  private buildPaymobIntentionRequest(
    order: OrderPaymentRecord,
    merchantRefNumber: string,
    integrationId: number,
    configuration: RequiredPaymobConfig,
  ) {
    const amountCents = Math.round(
      this.toNumberFromDecimal(order.totalAmount) * 100,
    );
    const [firstName, ...rest] = order.user.fullName.trim().split(/\s+/);

    return {
      amount: amountCents,
      currency: order.currency,
      payment_methods: [integrationId],
      // One summary line so item totals always equal the order total
      // (discounts and shipping are already inside totalAmount).
      items: [
        {
          name: `Order ${order.orderNumber}`.slice(0, 50),
          amount: amountCents,
          description: order.items
            .map((item) => item.titleAr || item.titleEn)
            .join(' / ')
            .slice(0, 255),
          quantity: 1,
        },
      ],
      billing_data: {
        first_name: firstName || 'Customer',
        last_name: rest.join(' ') || 'NA',
        email: order.user.email,
        phone_number: order.user.phoneNumber,
        apartment: 'NA',
        floor: 'NA',
        street: 'NA',
        building: 'NA',
        city: 'NA',
        state: 'NA',
        country: 'EG',
      },
      special_reference: merchantRefNumber,
      notification_url: configuration.notificationUrl,
      redirection_url: configuration.redirectionUrl,
      extras: { orderId: order.id, orderNumber: order.orderNumber },
    };
  }

  private async postPaymob<T>(
    path: string,
    body: unknown,
    configuration: RequiredPaymobConfig,
  ): Promise<T> {
    let response: Response;

    try {
      response = await fetch(
        `${configuration.baseUrl.replace(/\/$/, '')}${path}`,
        {
          method: 'POST',
          headers: {
            Authorization: `Token ${configuration.secretKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body),
        },
      );
    } catch {
      throw new BadGatewayException('Paymob request failed.');
    }

    const text = await response.text();
    let parsed: unknown;

    try {
      parsed = text ? JSON.parse(text) : {};
    } catch {
      parsed = { raw: text };
    }

    if (!response.ok) {
      throw new BadGatewayException(
        `Paymob request failed with status ${response.status}.`,
      );
    }

    return parsed as T;
  }

  private getPaymobIntegrationId(channel: PaymobChannel): number {
    const raw = {
      [PaymobChannel.CARD]: this.paymobConfiguration.integrationIdCard,
      [PaymobChannel.WALLET]: this.paymobConfiguration.integrationIdWallet,
      [PaymobChannel.APPLE_PAY]: this.paymobConfiguration.integrationIdApplePay,
    }[channel];
    const id = Number(raw);

    if (!raw || !Number.isInteger(id)) {
      throw new ServiceUnavailableException(
        `Paymob integration id for ${channel} is not configured.`,
      );
    }

    return id;
  }

  private getRequiredPaymobConfig(): RequiredPaymobConfig {
    const configuration = {
      baseUrl: this.paymobConfiguration.baseUrl,
      checkoutUrl: this.paymobConfiguration.checkoutUrl,
      secretKey: this.paymobConfiguration.secretKey,
      publicKey: this.paymobConfiguration.publicKey,
      hmacSecret: this.paymobConfiguration.hmacSecret,
      notificationUrl: this.paymobConfiguration.notificationUrl,
      redirectionUrl: this.paymobConfiguration.redirectionUrl,
    };
    const missingKeys = Object.entries(configuration)
      .filter(([, value]) => !value)
      .map(([key]) => key);

    if (missingKeys.length > 0) {
      throw new ServiceUnavailableException(
        `Paymob configuration is missing: ${missingKeys.join(', ')}.`,
      );
    }

    return configuration as RequiredPaymobConfig;
  }

  private async findOwnedPendingOrderOrThrow(
    userId: string,
    orderId: string,
  ): Promise<OrderPaymentRecord> {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, userId },
      select: orderPaymentSelect,
    });

    if (!order) {
      throw new NotFoundException('Order not found.');
    }

    if (order.status !== OrderStatus.PENDING) {
      throw new ConflictException('Only pending orders can be paid.');
    }

    if (order.paymentStatus === PaymentStatus.PAID) {
      throw new ConflictException('Order is already paid.');
    }

    if (this.toNumberFromDecimal(order.totalAmount) <= 0) {
      throw new BadRequestException(
        'Order totalAmount must be greater than 0.',
      );
    }

    return order;
  }

  private async findOwnedFawryPaymentOrThrow(
    userId: string,
    orderId: string,
  ): Promise<PaymentRecord> {
    const payment = await this.prisma.payment.findFirst({
      where: {
        orderId,
        userId,
        provider: PaymentProvider.FAWRY,
        method: PaymentMethod.FAWRY_REFERENCE,
      },
      select: paymentSelect,
    });

    if (!payment) {
      throw new NotFoundException('Fawry payment not found.');
    }

    return payment;
  }

  private async findOwnedPaypalPaymentOrThrow(
    userId: string,
    orderId: string,
  ): Promise<PaymentRecord> {
    const payment = await this.prisma.payment.findFirst({
      where: {
        orderId,
        userId,
        provider: PaymentProvider.PAYPAL,
        method: PaymentMethod.PAYPAL_CHECKOUT,
      },
      select: paymentSelect,
    });

    if (!payment) {
      throw new NotFoundException('PayPal payment not found.');
    }

    return payment;
  }

  private async findPaypalPaymentFromWebhookOrThrow(
    webhookEvent: PaypalWebhookEvent,
  ): Promise<PaymentRecord> {
    const paypalOrderId = this.extractPaypalOrderIdFromWebhook(webhookEvent);

    if (paypalOrderId) {
      const payment = await this.prisma.payment.findFirst({
        where: {
          provider: PaymentProvider.PAYPAL,
          method: PaymentMethod.PAYPAL_CHECKOUT,
          OR: [{ paypalOrderId }, { providerReferenceNumber: paypalOrderId }],
        },
        select: paymentSelect,
      });

      if (payment) {
        return payment;
      }
    }

    const localOrderId =
      this.extractLocalOrderIdFromPaypalWebhook(webhookEvent);

    if (localOrderId && this.isUuid(localOrderId)) {
      const payment = await this.prisma.payment.findFirst({
        where: {
          orderId: localOrderId,
          provider: PaymentProvider.PAYPAL,
          method: PaymentMethod.PAYPAL_CHECKOUT,
        },
        select: paymentSelect,
      });

      if (payment) {
        return payment;
      }
    }

    throw new NotFoundException('PayPal payment not found.');
  }

  private async findPaymentByMerchantReferenceOrThrow(
    merchantRefNumber: string,
  ): Promise<PaymentRecord> {
    const payment = await this.prisma.payment.findUnique({
      where: { merchantRefNumber },
      select: paymentSelect,
    });

    if (!payment) {
      throw new NotFoundException('Fawry payment not found.');
    }

    return payment;
  }

  private findPaymentForProvider(
    order: OrderPaymentRecord,
    provider: PaymentProvider,
    method: PaymentMethod,
  ): PaymentRecord | undefined {
    return order.payments.find(
      (payment) => payment.provider === provider && payment.method === method,
    );
  }

  private assertNoConflictingActivePayment(
    order: OrderPaymentRecord,
    provider: PaymentProvider,
    method: PaymentMethod,
  ): void {
    const activeStatuses = new Set<PaymentStatus>([
      PaymentStatus.PENDING,
      PaymentStatus.PAID,
    ]);
    const conflictingPayment = order.payments.find(
      (payment) =>
        (payment.provider !== provider || payment.method !== method) &&
        activeStatuses.has(payment.status),
    );

    if (conflictingPayment) {
      throw new ConflictException(
        `Another ${conflictingPayment.provider} payment already exists for this order.`,
      );
    }
  }

  private assertPaypalOrderPayable(order: OrderPaymentRecord): void {
    if (order.paymentStatus !== PaymentStatus.PENDING) {
      throw new ConflictException(
        'Only unpaid pending orders can be paid with PayPal.',
      );
    }

    if (order.currency !== Currency.USD) {
      throw new BadRequestException('PayPal payments support USD orders only.');
    }
  }

  private async upsertPendingPayment(
    order: OrderPaymentRecord,
    existingPayment?: PaymentRecord,
  ): Promise<PaymentRecord> {
    if (existingPayment) {
      return this.prisma.payment.update({
        where: { id: existingPayment.id },
        data: {
          status: PaymentStatus.PENDING,
          amount: order.totalAmount,
          currency: order.currency,
          failureReason: null,
          providerStatus: null,
          providerResponse: Prisma.JsonNull,
          cancelledAt: null,
        },
        select: paymentSelect,
      });
    }

    try {
      return await this.prisma.payment.create({
        data: {
          orderId: order.id,
          userId: order.userId,
          provider: PaymentProvider.FAWRY,
          method: PaymentMethod.FAWRY_REFERENCE,
          status: PaymentStatus.PENDING,
          amount: order.totalAmount,
          currency: order.currency,
          merchantRefNumber: order.orderNumber,
        },
        select: paymentSelect,
      });
    } catch (error) {
      this.handleDuplicatePaymentError(error);
    }
  }

  private async upsertPendingPaypalPayment(
    order: OrderPaymentRecord,
    existingPayment: PaymentRecord | undefined,
    paypalOrder: PaypalOrderResponse,
    approvalUrl: string,
  ): Promise<PaymentRecord> {
    const paypalOrderId = this.toStringValue(paypalOrder.id);
    const providerResponse = this.toJson({ ...paypalOrder, approvalUrl });

    if (existingPayment) {
      return this.prisma.payment.update({
        where: { id: existingPayment.id },
        data: {
          status: PaymentStatus.PENDING,
          amount: order.totalAmount,
          currency: order.currency,
          providerReferenceNumber: paypalOrderId,
          paypalOrderId,
          providerPaymentReference: null,
          providerStatus: this.optionalStringValue(paypalOrder.status),
          providerResponse,
          failureReason: null,
          paidAt: null,
          cancelledAt: null,
        },
        select: paymentSelect,
      });
    }

    try {
      return await this.prisma.payment.create({
        data: {
          orderId: order.id,
          userId: order.userId,
          provider: PaymentProvider.PAYPAL,
          method: PaymentMethod.PAYPAL_CHECKOUT,
          status: PaymentStatus.PENDING,
          amount: order.totalAmount,
          currency: order.currency,
          merchantRefNumber: `${order.orderNumber}-PAYPAL`,
          providerReferenceNumber: paypalOrderId,
          paypalOrderId,
          providerStatus: this.optionalStringValue(paypalOrder.status),
          providerResponse,
        },
        select: paymentSelect,
      });
    } catch (error) {
      this.handleDuplicatePaymentError(
        error,
        'PayPal payment already exists for this order.',
      );
    }
  }

  private buildFawryChargeRequest(
    order: OrderPaymentRecord,
    merchantRefNumber: string,
    configuration: RequiredFawryConfig,
  ) {
    const amount = this.formatMoney(order.totalAmount);
    const paymentMethod = 'PayAtFawry';
    const signature = this.sha256(
      `${configuration.merchantCode}${merchantRefNumber}${paymentMethod}${amount}${configuration.securityKey}`,
    );

    return {
      merchantCode: configuration.merchantCode,
      merchantRefNum: merchantRefNumber,
      customerName: order.user.fullName,
      customerMobile: order.user.phoneNumber,
      customerEmail: order.user.email,
      amount,
      currencyCode: order.currency,
      language: 'en-gb',
      orderWebHookUrl: configuration.notificationUrl,
      chargeItems: order.items.map((item) => ({
        itemId: item.itemId,
        description: item.titleEn,
        price: this.formatMoney(item.discountPrice ?? item.unitPrice),
        quantity: item.quantity,
      })),
      signature,
      paymentMethod,
      description: `Dr. Saleh order ${order.orderNumber}`,
      returnUrl: configuration.returnUrl,
    };
  }

  private buildPaypalCreateOrderRequest(order: OrderPaymentRecord) {
    const { returnUrl, cancelUrl } = this.paypalConfiguration;
    const withOrder = (url: string) =>
      `${url}${url.includes('?') ? '&' : '?'}orderId=${order.id}&provider=paypal`;

    return {
      intent: 'CAPTURE',
      // Where PayPal sends the buyer back after approving or cancelling.
      ...(returnUrl
        ? {
            application_context: {
              return_url: withOrder(returnUrl),
              cancel_url: withOrder(cancelUrl || returnUrl),
              user_action: 'PAY_NOW',
              shipping_preference: 'NO_SHIPPING',
            },
          }
        : {}),
      purchase_units: [
        {
          reference_id: order.orderNumber,
          custom_id: order.id,
          description: `Dr. Saleh order ${order.orderNumber}`,
          amount: {
            currency_code: Currency.USD,
            value: this.formatMoney(order.totalAmount),
          },
        },
      ],
    };
  }

  private async applyFawryStatusUpdate(
    payment: PaymentRecord,
    fawryPayload: FawryStatusLikePayload,
  ): Promise<PaymentRecord> {
    const nextStatus = this.mapFawryStatus(
      this.toStringValue(fawryPayload.orderStatus),
    );
    const paidAt =
      nextStatus === PaymentStatus.PAID
        ? (this.toDateFromFawryTimestamp(fawryPayload.paymentTime) ??
          new Date())
        : undefined;
    const providerReferenceNumber =
      this.optionalStringValue(fawryPayload.fawryRefNumber) ??
      this.optionalStringValue(fawryPayload.referenceNumber) ??
      payment.providerReferenceNumber;
    const providerPaymentReference =
      this.optionalStringValue(fawryPayload.paymentRefrenceNumber) ??
      this.optionalStringValue(fawryPayload.paymentReferenceNumber) ??
      payment.providerPaymentReference;
    const responseJson = this.toJson(fawryPayload);

    const updatedPaymentResult = await this.prisma.$transaction(async (tx) => {
      const updatedPayment = await tx.payment.update({
        where: { id: payment.id },
        data: {
          status: nextStatus,
          providerReferenceNumber,
          providerPaymentReference,
          providerStatus: this.optionalStringValue(fawryPayload.orderStatus),
          providerResponse: responseJson,
          failureReason:
            nextStatus === PaymentStatus.FAILED
              ? (this.optionalStringValue(fawryPayload.failureReason) ??
                this.optionalStringValue(fawryPayload.statusDescription) ??
                this.optionalStringValue(fawryPayload.description))
              : null,
          paidAt:
            nextStatus === PaymentStatus.PAID
              ? (payment.paidAt ?? paidAt)
              : payment.paidAt,
          cancelledAt:
            nextStatus === PaymentStatus.CANCELLED
              ? (payment.cancelledAt ?? new Date())
              : payment.cancelledAt,
        },
        select: paymentSelect,
      });

      await this.upsertPaymentTransaction(tx, updatedPayment, responseJson);

      if (nextStatus === PaymentStatus.PAID) {
        await tx.order.update({
          where: { id: payment.orderId },
          data: {
            status: OrderStatus.PAID,
            paymentStatus: PaymentStatus.PAID,
            paidAt: updatedPayment.paidAt ?? paidAt ?? new Date(),
          },
        });

        await this.grantPaidDigitalAccess(tx, payment.orderId, payment.userId);
      } else if (nextStatus === PaymentStatus.CANCELLED) {
        const shouldReleaseStock = await this.shouldReleaseReservedStock(
          tx,
          payment.orderId,
        );

        await tx.order.update({
          where: { id: payment.orderId },
          data: {
            status: OrderStatus.CANCELLED,
            paymentStatus: PaymentStatus.CANCELLED,
          },
        });

        if (shouldReleaseStock && payment.status !== PaymentStatus.CANCELLED) {
          await this.releasePhysicalStockReservation(tx, payment.orderId);
        }
      } else if (nextStatus === PaymentStatus.FAILED) {
        await tx.order.update({
          where: { id: payment.orderId },
          data: {
            paymentStatus: PaymentStatus.FAILED,
          },
        });
      } else if (nextStatus === PaymentStatus.REFUNDED) {
        await tx.order.update({
          where: { id: payment.orderId },
          data: {
            status: OrderStatus.REFUNDED,
            paymentStatus: PaymentStatus.REFUNDED,
          },
        });
      }

      return updatedPayment;
    });

    const statusChanged = payment.status !== nextStatus;

    if (nextStatus === PaymentStatus.PAID) {
      await this.referralsService.rewardReferralAfterFirstPaidOrder(
        payment.userId,
      );
    }

    if (statusChanged) {
      await this.sendPaymentStatusNotification(
        payment.orderId,
        nextStatus,
        updatedPaymentResult.failureReason,
      );
      this.logPaymentStatusAudit(updatedPaymentResult, nextStatus);
    }

    return updatedPaymentResult;
  }

  private async applyPaypalStatusUpdate(
    payment: PaymentRecord,
    paypalOrder: PaypalOrderResponse,
    webhookEvent?: PaypalWebhookEvent,
  ): Promise<PaymentRecord> {
    const nextStatus = this.mapPaypalStatus(
      this.toStringValue(paypalOrder.status),
      webhookEvent?.event_type,
    );
    const paypalOrderId =
      this.optionalStringValue(paypalOrder.id) ??
      payment.paypalOrderId ??
      payment.providerReferenceNumber;
    const capture = this.findPaypalCapture(paypalOrder, webhookEvent);
    const providerPaymentReference =
      this.optionalStringValue(capture?.id) ??
      this.extractPaypalCaptureIdFromWebhook(webhookEvent) ??
      payment.providerPaymentReference;
    const paidAt =
      nextStatus === PaymentStatus.PAID
        ? (this.toDateFromIso(capture?.update_time) ??
          this.toDateFromIso(capture?.create_time) ??
          this.toDateFromIso(webhookEvent?.create_time) ??
          new Date())
        : undefined;
    const providerStatus =
      this.optionalStringValue(webhookEvent?.event_type) ??
      this.optionalStringValue(paypalOrder.status);
    const providerResponse = this.toJson({ paypalOrder, webhookEvent });
    const transactionReference =
      this.optionalStringValue(webhookEvent?.id) ?? payment.merchantRefNumber;
    const providerTransactionId =
      providerPaymentReference ??
      this.optionalStringValue(webhookEvent?.id) ??
      paypalOrderId ??
      payment.providerReferenceNumber;

    const updatedPaymentResult = await this.prisma.$transaction(async (tx) => {
      const updatedPayment = await tx.payment.update({
        where: { id: payment.id },
        data: {
          status: nextStatus,
          providerReferenceNumber: paypalOrderId,
          paypalOrderId,
          providerPaymentReference,
          providerStatus,
          providerResponse,
          failureReason:
            nextStatus === PaymentStatus.FAILED
              ? this.extractPaypalFailureReason(webhookEvent)
              : null,
          paidAt:
            nextStatus === PaymentStatus.PAID
              ? (payment.paidAt ?? paidAt)
              : payment.paidAt,
          cancelledAt:
            nextStatus === PaymentStatus.CANCELLED
              ? (payment.cancelledAt ?? new Date())
              : payment.cancelledAt,
        },
        select: paymentSelect,
      });

      await this.upsertPaymentTransaction(
        tx,
        updatedPayment,
        providerResponse,
        {
          transactionReference,
          providerTransactionId,
        },
      );

      if (nextStatus === PaymentStatus.PAID) {
        await tx.order.update({
          where: { id: payment.orderId },
          data: {
            status: OrderStatus.PAID,
            paymentStatus: PaymentStatus.PAID,
            paidAt: updatedPayment.paidAt ?? paidAt ?? new Date(),
          },
        });

        await this.grantPaidDigitalAccess(tx, payment.orderId, payment.userId);
      } else if (nextStatus === PaymentStatus.CANCELLED) {
        const shouldReleaseStock = await this.shouldReleaseReservedStock(
          tx,
          payment.orderId,
        );

        await tx.order.update({
          where: { id: payment.orderId },
          data: {
            status: OrderStatus.CANCELLED,
            paymentStatus: PaymentStatus.CANCELLED,
          },
        });

        if (shouldReleaseStock && payment.status !== PaymentStatus.CANCELLED) {
          await this.releasePhysicalStockReservation(tx, payment.orderId);
        }
      } else if (nextStatus === PaymentStatus.FAILED) {
        await tx.order.update({
          where: { id: payment.orderId },
          data: {
            paymentStatus: PaymentStatus.FAILED,
          },
        });
      } else if (nextStatus === PaymentStatus.REFUNDED) {
        await tx.order.update({
          where: { id: payment.orderId },
          data: {
            status: OrderStatus.REFUNDED,
            paymentStatus: PaymentStatus.REFUNDED,
          },
        });
      }

      return updatedPayment;
    });

    const statusChanged = payment.status !== nextStatus;

    if (nextStatus === PaymentStatus.PAID) {
      await this.referralsService.rewardReferralAfterFirstPaidOrder(
        payment.userId,
      );
    }

    if (statusChanged) {
      await this.sendPaymentStatusNotification(
        payment.orderId,
        nextStatus,
        updatedPaymentResult.failureReason,
      );
      this.logPaymentStatusAudit(updatedPaymentResult, nextStatus);
    }

    return updatedPaymentResult;
  }

  private logPaymentCreatedAudit(
    order: OrderPaymentRecord,
    payment: PaymentRecord,
  ): void {
    void this.auditLogService?.logAction({
      actorUserId: order.userId,
      actorEmail: order.user.email,
      actorRole: 'User',
      action: AuditActions.PaymentCreated,
      entityType: AuditEntityTypes.Payment,
      entityId: payment.id,
      description: 'Payment request created.',
      metadata: {
        orderId: order.id,
        orderNumber: order.orderNumber,
        provider: payment.provider,
        method: payment.method,
        status: payment.status,
        amount: this.toNumberFromDecimal(payment.amount),
        currency: payment.currency,
      },
    });
  }

  private logPaymentStatusAudit(
    payment: PaymentRecord,
    status: PaymentStatus,
  ): void {
    const action = this.getPaymentStatusAuditAction(status);

    if (!action) {
      return;
    }

    void this.auditLogService?.logAction({
      action,
      entityType: AuditEntityTypes.Payment,
      entityId: payment.id,
      description: `Payment status changed to ${status}.`,
      metadata: {
        userId: payment.userId,
        orderId: payment.orderId,
        provider: payment.provider,
        method: payment.method,
        status,
        failureReason: payment.failureReason,
      },
    });

    if (status === PaymentStatus.REFUNDED) {
      void this.auditLogService?.logAction({
        action: AuditActions.RefundProcessed,
        entityType: AuditEntityTypes.Order,
        entityId: payment.orderId,
        description: 'Payment refund processed.',
        metadata: {
          userId: payment.userId,
          paymentId: payment.id,
          provider: payment.provider,
          method: payment.method,
        },
      });
    }
  }

  private getPaymentStatusAuditAction(
    status: PaymentStatus,
  ): string | undefined {
    if (status === PaymentStatus.PAID) {
      return AuditActions.PaymentSuccess;
    }

    if (status === PaymentStatus.FAILED) {
      return AuditActions.PaymentFailed;
    }

    if (status === PaymentStatus.REFUNDED) {
      return AuditActions.PaymentRefunded;
    }

    return undefined;
  }

  private async markPaymentCancelled(
    payment: PaymentRecord,
    fawryPayload: FawryCancelResponse,
  ): Promise<PaymentRecord> {
    const responseJson = this.toJson(fawryPayload);

    return this.prisma.$transaction(async (tx) => {
      const updatedPayment = await tx.payment.update({
        where: { id: payment.id },
        data: {
          status: PaymentStatus.CANCELLED,
          providerStatus:
            this.optionalStringValue(fawryPayload.orderStatus) ?? 'CANCELLED',
          providerResponse: responseJson,
          cancelledAt: payment.cancelledAt ?? new Date(),
        },
        select: paymentSelect,
      });

      const shouldReleaseStock = await this.shouldReleaseReservedStock(
        tx,
        payment.orderId,
      );

      await tx.order.update({
        where: { id: payment.orderId },
        data: {
          status: OrderStatus.CANCELLED,
          paymentStatus: PaymentStatus.CANCELLED,
        },
      });

      if (shouldReleaseStock && payment.status !== PaymentStatus.CANCELLED) {
        await this.releasePhysicalStockReservation(tx, payment.orderId);
      }
      await this.upsertPaymentTransaction(tx, updatedPayment, responseJson);

      return updatedPayment;
    });
  }

  private async grantPaidDigitalAccess(
    tx: Prisma.TransactionClient,
    orderId: string,
    userId: string,
  ): Promise<void> {
    const orderItems = await tx.orderItem.findMany({
      where: { orderId },
      select: {
        itemType: true,
        itemId: true,
      },
    });
    const courseIds = orderItems
      .filter((item) => item.itemType === OrderItemType.COURSE)
      .map((item) => item.itemId);
    const bookFormatIds = orderItems
      .filter((item) => item.itemType === OrderItemType.BOOK)
      .map((item) => item.itemId);
    const digitalBookFormats =
      bookFormatIds.length === 0
        ? []
        : await tx.bookFormat.findMany({
            where: {
              id: { in: bookFormatIds },
              formatType: {
                in: [BookFormatType.Digital, BookFormatType.Audio],
              },
            },
            select: { id: true },
          });

    await Promise.all([
      ...courseIds.map((courseId) =>
        tx.userCourse.upsert({
          where: { userId_courseId: { userId, courseId } },
          update: {},
          create: { userId, courseId },
        }),
      ),
      ...digitalBookFormats.map((bookFormat) =>
        tx.userBook.upsert({
          where: {
            userId_bookFormatId: {
              userId,
              bookFormatId: bookFormat.id,
            },
          },
          update: {},
          create: {
            userId,
            bookFormatId: bookFormat.id,
          },
        }),
      ),
    ]);
  }

  private async shouldReleaseReservedStock(
    tx: Prisma.TransactionClient,
    orderId: string,
  ): Promise<boolean> {
    const order = await tx.order.findUnique({
      where: { id: orderId },
      select: {
        status: true,
        paymentStatus: true,
      },
    });

    return (
      order !== null &&
      order.status === OrderStatus.PENDING &&
      order.paymentStatus !== PaymentStatus.PAID
    );
  }

  private async releasePhysicalStockReservation(
    tx: Prisma.TransactionClient,
    orderId: string,
  ): Promise<void> {
    const orderItems = await tx.orderItem.findMany({
      where: {
        orderId,
        itemType: { in: [OrderItemType.PRODUCT, OrderItemType.BOOK] },
      },
      select: {
        itemType: true,
        itemId: true,
        quantity: true,
      },
    });
    const bookFormatIds = orderItems
      .filter((item) => item.itemType === OrderItemType.BOOK)
      .map((item) => item.itemId);
    const physicalBookFormatIds =
      bookFormatIds.length === 0
        ? new Set<string>()
        : new Set(
            (
              await tx.bookFormat.findMany({
                where: {
                  id: { in: bookFormatIds },
                  formatType: BookFormatType.Physical,
                },
                select: { id: true },
              })
            ).map((bookFormat) => bookFormat.id),
          );

    await Promise.all(
      orderItems.map((item) => {
        if (item.itemType === OrderItemType.PRODUCT) {
          return tx.product.update({
            where: { id: item.itemId },
            data: { stock: { increment: item.quantity } },
          });
        }

        if (physicalBookFormatIds.has(item.itemId)) {
          return tx.bookFormat.update({
            where: { id: item.itemId },
            data: { stock: { increment: item.quantity } },
          });
        }

        return Promise.resolve();
      }),
    );
  }

  private async sendPaymentStatusNotification(
    orderId: string,
    status: PaymentStatus,
    failureReason?: string | null,
  ): Promise<void> {
    if (
      status !== PaymentStatus.PAID &&
      status !== PaymentStatus.FAILED &&
      status !== PaymentStatus.REFUNDED
    ) {
      return;
    }

    const order = await this.findPaymentNotificationOrder(orderId);

    if (!order) {
      return;
    }

    const input = {
      userId: order.user.id,
      email: order.user.email,
      fullName: order.user.fullName,
      orderNumber: order.orderNumber,
      totalAmount: this.toNumberFromDecimal(order.totalAmount),
      currency: order.currency,
    };

    if (status === PaymentStatus.PAID) {
      await Promise.all([
        this.notificationsService.sendPaymentSuccess(input),
        ...order.items
          .filter((item) => item.itemType === OrderItemType.COURSE)
          .map((item) =>
            this.notificationsService.sendCourseAccessGranted({
              userId: order.user.id,
              email: order.user.email,
              fullName: order.user.fullName,
              courseTitleAr: item.titleAr,
              courseTitleEn: item.titleEn,
            }),
          ),
      ]);
      return;
    }

    if (status === PaymentStatus.FAILED) {
      await this.notificationsService.sendPaymentFailed({
        ...input,
        failureReason,
      });
      return;
    }

    await this.notificationsService.sendRefundProcessed(input);
  }

  private async findPaymentNotificationOrder(
    orderId: string,
  ): Promise<PaymentNotificationOrderRecord | null> {
    return this.prisma.order.findUnique({
      where: { id: orderId },
      select: paymentNotificationOrderSelect,
    });
  }

  private async upsertPaymentTransaction(
    tx: Prisma.TransactionClient,
    payment: PaymentRecord,
    providerResponse: Prisma.InputJsonValue,
    options: PaymentTransactionUpsertOptions = {},
  ): Promise<void> {
    const transactionReference =
      options.transactionReference ?? payment.merchantRefNumber;
    const providerTransactionId =
      options.providerTransactionId ?? payment.providerReferenceNumber;

    await tx.paymentTransaction.upsert({
      where: { transactionReference },
      update: {
        paymentId: payment.id,
        provider: payment.provider,
        method: payment.method,
        providerTransactionId,
        status: payment.status,
        amount: payment.amount,
        currency: this.toCurrencyEnum(payment.currency),
        providerResponse,
        failureReason: payment.failureReason,
        paidAt: payment.paidAt,
      },
      create: {
        paymentId: payment.id,
        orderId: payment.orderId,
        provider: payment.provider,
        method: payment.method,
        status: payment.status,
        amount: payment.amount,
        currency: this.toCurrencyEnum(payment.currency),
        transactionReference,
        providerTransactionId,
        providerResponse,
        failureReason: payment.failureReason,
        paidAt: payment.paidAt,
      },
    });
  }

  private verifyFawryWebhookSignature(
    webhookDto: FawryWebhookDto,
    configuration: RequiredFawryConfig,
  ): void {
    const paymentReference =
      this.optionalStringValue(webhookDto.paymentRefrenceNumber) ??
      this.optionalStringValue(webhookDto.paymentReferenceNumber) ??
      '';
    const signatureBody = [
      this.toStringValue(webhookDto.fawryRefNumber),
      this.toStringValue(webhookDto.merchantRefNumber),
      this.formatMoney(webhookDto.paymentAmount),
      this.formatMoney(webhookDto.orderAmount),
      this.toStringValue(webhookDto.orderStatus),
      this.toStringValue(webhookDto.paymentMethod),
      paymentReference,
      configuration.securityKey,
    ].join('');
    const expectedSignature = this.sha256(signatureBody);

    if (
      !this.safeEquals(
        expectedSignature,
        this.toStringValue(webhookDto.messageSignature),
      )
    ) {
      throw new ForbiddenException('Invalid Fawry webhook signature.');
    }
  }

  private verifyFawryResponseSignatureIfPresent(
    payload: FawryChargeResponse,
    configuration: RequiredFawryConfig,
  ): void {
    if (!payload.signature) {
      return;
    }

    const signatureBody = [
      this.optionalStringValue(payload.referenceNumber) ??
        this.optionalStringValue(payload.fawryRefNumber) ??
        '',
      this.optionalStringValue(payload.merchantRefNumber) ??
        this.optionalStringValue(payload.merchantRefNum) ??
        '',
      this.formatMoney(payload.paymentAmount ?? 0),
      this.formatMoney(payload.orderAmount ?? 0),
      this.toStringValue(payload.orderStatus),
      this.toStringValue(payload.paymentMethod),
      payload.fawryFees === undefined
        ? ''
        : this.formatMoney(payload.fawryFees),
      '',
      '',
      this.optionalStringValue(payload.customerMail) ?? '',
      this.optionalStringValue(payload.customerMobile) ?? '',
      configuration.securityKey,
    ].join('');
    const expectedSignature = this.sha256(signatureBody);

    if (!this.safeEquals(expectedSignature, payload.signature)) {
      throw new BadGatewayException('Invalid Fawry response signature.');
    }
  }

  private mapFawryStatus(status: string): PaymentStatus {
    switch (status.toUpperCase()) {
      case 'PAID':
        return PaymentStatus.PAID;
      case 'FAILED':
        return PaymentStatus.FAILED;
      case 'CANCELED':
      case 'CANCELLED':
      case 'EXPIRED':
        return PaymentStatus.CANCELLED;
      case 'REFUNDED':
      case 'PARTIAL_REFUNDED':
      case 'PARTIALLY_REFUNDED':
        return PaymentStatus.REFUNDED;
      case 'NEW':
      case 'PENDING':
      default:
        return PaymentStatus.PENDING;
    }
  }

  private mapPaypalStatus(
    status: string,
    eventType: string | undefined,
  ): PaymentStatus {
    const normalizedEventType = this.toStringValue(eventType).toUpperCase();

    switch (normalizedEventType) {
      case 'PAYMENT.CAPTURE.COMPLETED':
      case 'CHECKOUT.ORDER.COMPLETED':
        return PaymentStatus.PAID;
      case 'PAYMENT.CAPTURE.DENIED':
      case 'PAYMENT.CAPTURE.DECLINED':
      case 'CHECKOUT.PAYMENT-APPROVAL.REVERSED':
        return PaymentStatus.FAILED;
      case 'PAYMENT.CAPTURE.REFUNDED':
        return PaymentStatus.REFUNDED;
      case 'CHECKOUT.ORDER.VOIDED':
        return PaymentStatus.CANCELLED;
    }

    switch (status.toUpperCase()) {
      case 'COMPLETED':
        return PaymentStatus.PAID;
      case 'VOIDED':
        return PaymentStatus.CANCELLED;
      case 'DECLINED':
      case 'DENIED':
      case 'FAILED':
        return PaymentStatus.FAILED;
      case 'REFUNDED':
        return PaymentStatus.REFUNDED;
      case 'APPROVED':
      case 'CREATED':
      case 'SAVED':
      case 'PAYER_ACTION_REQUIRED':
      default:
        return PaymentStatus.PENDING;
    }
  }

  private async verifyPaypalWebhook(
    headers: Record<string, unknown>,
    webhookEvent: PaypalWebhookEvent,
    configuration: RequiredPaypalConfig,
  ): Promise<void> {
    const authAlgo = this.getHeader(headers, 'paypal-auth-algo');
    const certUrl = this.getHeader(headers, 'paypal-cert-url');
    const transmissionId = this.getHeader(headers, 'paypal-transmission-id');
    const transmissionSig = this.getHeader(headers, 'paypal-transmission-sig');
    const transmissionTime = this.getHeader(
      headers,
      'paypal-transmission-time',
    );

    if (
      !authAlgo ||
      !certUrl ||
      !transmissionId ||
      !transmissionSig ||
      !transmissionTime
    ) {
      throw new ForbiddenException('Missing PayPal webhook signature headers.');
    }

    const verification = await this.postPaypal<PaypalVerifyWebhookResponse>(
      '/v1/notifications/verify-webhook-signature',
      {
        auth_algo: authAlgo,
        cert_url: certUrl,
        transmission_id: transmissionId,
        transmission_sig: transmissionSig,
        transmission_time: transmissionTime,
        webhook_id: configuration.webhookId,
        webhook_event: webhookEvent,
      },
      configuration,
    );

    if (verification.verification_status !== 'SUCCESS') {
      throw new ForbiddenException('Invalid PayPal webhook signature.');
    }
  }

  private async getPaypalOrder(
    paypalOrderId: string,
    configuration: RequiredPaypalConfig,
  ): Promise<PaypalOrderResponse> {
    return this.getPaypal<PaypalOrderResponse>(
      `/v2/checkout/orders/${encodeURIComponent(paypalOrderId)}`,
      configuration,
    );
  }

  private async getAndCaptureApprovedPaypalOrder(
    payment: PaymentRecord,
    paypalOrderId: string,
    configuration: RequiredPaypalConfig,
  ): Promise<PaypalOrderResponse> {
    const paypalOrder = await this.getPaypalOrder(paypalOrderId, configuration);

    if (this.toStringValue(paypalOrder.status).toUpperCase() !== 'APPROVED') {
      return paypalOrder;
    }

    return this.capturePaypalOrder(payment, paypalOrderId, configuration);
  }

  private async capturePaypalOrder(
    payment: PaymentRecord,
    paypalOrderId: string,
    configuration: RequiredPaypalConfig,
  ): Promise<PaypalOrderResponse> {
    return this.requestPaypal<PaypalOrderResponse>(
      `/v2/checkout/orders/${encodeURIComponent(paypalOrderId)}/capture`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'PayPal-Request-Id': `${payment.id}-capture`,
        },
        body: '{}',
      },
      configuration,
    );
  }

  private async postPaypal<T>(
    path: string,
    payload: Record<string, unknown>,
    configuration: RequiredPaypalConfig,
  ): Promise<T> {
    return this.requestPaypal<T>(
      path,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      },
      configuration,
    );
  }

  private async getPaypal<T>(
    path: string,
    configuration: RequiredPaypalConfig,
  ): Promise<T> {
    return this.requestPaypal<T>(
      path,
      {
        method: 'GET',
      },
      configuration,
    );
  }

  private async requestPaypal<T>(
    path: string,
    init: RequestInit,
    configuration: RequiredPaypalConfig,
  ): Promise<T> {
    const accessToken = await this.getPaypalAccessToken(configuration);
    const response = await fetch(
      this.toPaypalUrl(configuration.baseUrl, path),
      {
        ...init,
        headers: {
          Accept: 'application/json',
          ...(init.headers as Record<string, string> | undefined),
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );
    const body = await this.parsePaypalResponse(response);

    if (!response.ok) {
      throw new BadGatewayException({
        message: 'PayPal request failed.',
        statusCode: response.status,
        response: body,
      });
    }

    return body as T;
  }

  private async getPaypalAccessToken(
    configuration: RequiredPaypalConfig,
  ): Promise<string> {
    const credentials = Buffer.from(
      `${configuration.clientId}:${configuration.clientSecret}`,
    ).toString('base64');
    const response = await fetch(
      this.toPaypalUrl(configuration.baseUrl, '/v1/oauth2/token'),
      {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          Authorization: `Basic ${credentials}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: 'grant_type=client_credentials',
      },
    );
    const body = (await this.parsePaypalResponse(
      response,
    )) as PaypalAccessTokenResponse;

    if (!response.ok || !body.access_token) {
      throw new BadGatewayException({
        message: 'PayPal access token request failed.',
        statusCode: response.status,
        response: body,
      });
    }

    return body.access_token;
  }

  private async parsePaypalResponse(response: Response): Promise<unknown> {
    const text = await response.text();

    if (text.length === 0) {
      return {};
    }

    try {
      return JSON.parse(text);
    } catch {
      return { raw: text };
    }
  }

  private async postFawry<T>(
    path: string,
    payload: Record<string, unknown>,
    configuration: RequiredFawryConfig,
  ): Promise<T> {
    return this.requestFawry<T>(
      path,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      },
      configuration,
    );
  }

  private async getFawry<T>(
    path: string,
    query: Record<string, string>,
    configuration: RequiredFawryConfig,
  ): Promise<T> {
    const searchParams = new URLSearchParams(query);

    return this.requestFawry<T>(
      `${path}?${searchParams.toString()}`,
      {
        method: 'GET',
        headers: { Accept: 'application/json' },
      },
      configuration,
    );
  }

  private async requestFawry<T>(
    path: string,
    init: RequestInit,
    configuration: RequiredFawryConfig,
  ): Promise<T> {
    const response = await fetch(this.toFawryUrl(configuration.baseUrl, path), {
      ...init,
    });
    const body = await this.parseFawryResponse(response);

    if (!response.ok) {
      throw new BadGatewayException({
        message: 'Fawry request failed.',
        statusCode: response.status,
        response: body,
      });
    }

    return body as T;
  }

  private async parseFawryResponse(response: Response): Promise<unknown> {
    const text = await response.text();

    if (text.length === 0) {
      return {};
    }

    try {
      return JSON.parse(text);
    } catch {
      return { raw: text };
    }
  }

  private assertFawrySuccessResponse(response: FawryChargeResponse): void {
    const statusCode = response.statusCode ?? response.code;

    if (statusCode !== undefined && Number(statusCode) !== 200) {
      throw new BadGatewayException(
        response.statusDescription ??
          response.description ??
          'Fawry payment request failed.',
      );
    }
  }

  private assertFawryCancelSuccessResponse(
    response: FawryCancelResponse,
  ): void {
    const statusCode = response.statusCode ?? response.code;

    if (statusCode !== undefined && Number(statusCode) !== 200) {
      throw new BadGatewayException(
        response.statusDescription ??
          response.description ??
          'Fawry cancel request failed.',
      );
    }
  }

  private getRequiredFawryConfig(): RequiredFawryConfig {
    const configuration = {
      baseUrl: this.fawryConfiguration.baseUrl,
      merchantCode: this.fawryConfiguration.merchantCode,
      securityKey: this.fawryConfiguration.securityKey,
      returnUrl: this.fawryConfiguration.returnUrl,
      notificationUrl: this.fawryConfiguration.notificationUrl,
    };
    const missingKeys = Object.entries(configuration)
      .filter(([, value]) => !value)
      .map(([key]) => key);

    if (missingKeys.length > 0) {
      throw new ServiceUnavailableException(
        `Fawry configuration is missing: ${missingKeys.join(', ')}.`,
      );
    }

    return configuration as RequiredFawryConfig;
  }

  private getRequiredPaypalConfig(): RequiredPaypalConfig {
    const configuration = {
      clientId: this.paypalConfiguration.clientId,
      clientSecret: this.paypalConfiguration.clientSecret,
      baseUrl: this.paypalConfiguration.baseUrl,
      webhookId: this.paypalConfiguration.webhookId,
    };
    const missingKeys = Object.entries(configuration)
      .filter(([, value]) => !value)
      .map(([key]) => key);

    if (missingKeys.length > 0) {
      throw new ServiceUnavailableException(
        `PayPal configuration is missing: ${missingKeys.join(', ')}.`,
      );
    }

    return configuration as RequiredPaypalConfig;
  }

  private toFawryUrl(baseUrl: string, path: string): string {
    return `${baseUrl.replace(/\/$/, '')}/${path.replace(/^\//, '')}`;
  }

  private toPaypalUrl(baseUrl: string, path: string): string {
    return `${baseUrl.replace(/\/$/, '')}/${path.replace(/^\//, '')}`;
  }

  private getHeader(
    headers: Record<string, unknown>,
    headerName: string,
  ): string | undefined {
    const normalizedHeaderName = headerName.toLowerCase();
    const headerEntry = Object.entries(headers).find(
      ([key]) => key.toLowerCase() === normalizedHeaderName,
    );
    const value = headerEntry?.[1];

    if (Array.isArray(value)) {
      return this.optionalStringValue(value[0]);
    }

    return this.optionalStringValue(value);
  }

  private extractApprovalUrlFromProviderResponse(
    providerResponse: Prisma.JsonValue | null | undefined,
  ): string | null {
    const response = this.toRecord(providerResponse);

    return (
      this.optionalStringValue(response?.approvalUrl) ??
      this.findPaypalApprovalUrl(this.toPaypalLinks(response?.links)) ??
      null
    );
  }

  private extractPaypalOrderIdFromWebhook(
    webhookEvent: PaypalWebhookEvent,
  ): string | undefined {
    const resource = this.toRecord(webhookEvent.resource);
    const eventType = this.toStringValue(webhookEvent.event_type).toUpperCase();
    const resourceId = this.optionalStringValue(resource?.id);

    if (eventType.startsWith('CHECKOUT.ORDER.') && resourceId) {
      return resourceId;
    }

    const supplementaryData = this.toRecord(resource?.supplementary_data);
    const relatedIds = this.toRecord(supplementaryData?.related_ids);
    const relatedOrderId = this.optionalStringValue(relatedIds?.order_id);

    if (relatedOrderId) {
      return relatedOrderId;
    }

    const purchaseUnits = this.toRecordArray(resource?.purchase_units);
    const firstPurchaseUnit = purchaseUnits[0];

    return this.optionalStringValue(firstPurchaseUnit?.reference_id);
  }

  private extractLocalOrderIdFromPaypalWebhook(
    webhookEvent: PaypalWebhookEvent,
  ): string | undefined {
    const resource = this.toRecord(webhookEvent.resource);
    const resourceCustomId = this.optionalStringValue(resource?.custom_id);

    if (resourceCustomId) {
      return resourceCustomId;
    }

    const purchaseUnits = this.toRecordArray(resource?.purchase_units);
    const firstPurchaseUnit = purchaseUnits[0];

    return this.optionalStringValue(firstPurchaseUnit?.custom_id);
  }

  private extractPaypalCaptureIdFromWebhook(
    webhookEvent: PaypalWebhookEvent | undefined,
  ): string | undefined {
    const resource = this.toRecord(webhookEvent?.resource);
    const eventType = this.toStringValue(
      webhookEvent?.event_type,
    ).toUpperCase();

    if (eventType.startsWith('PAYMENT.CAPTURE.')) {
      return this.optionalStringValue(resource?.id);
    }

    return undefined;
  }

  private extractPaypalFailureReason(
    webhookEvent: PaypalWebhookEvent | undefined,
  ): string | null {
    const resource = this.toRecord(webhookEvent?.resource);
    const statusDetails = this.toRecord(resource?.status_details);

    return (
      this.optionalStringValue(statusDetails?.reason) ??
      this.optionalStringValue(resource?.status) ??
      null
    );
  }

  private findPaypalCapture(
    paypalOrder: PaypalOrderResponse,
    webhookEvent?: PaypalWebhookEvent,
  ): PaypalCapture | null {
    const captureId = this.extractPaypalCaptureIdFromWebhook(webhookEvent);
    const captures =
      paypalOrder.purchase_units?.flatMap(
        (purchaseUnit) => purchaseUnit.payments?.captures ?? [],
      ) ?? [];

    if (captureId) {
      const matchingCapture = captures.find(
        (capture) => capture.id === captureId,
      );

      if (matchingCapture) {
        return matchingCapture;
      }
    }

    return (
      captures.find((capture) => capture.status === 'COMPLETED') ??
      captures[0] ??
      null
    );
  }

  private findPaypalApprovalUrl(links: PaypalLink[]): string | undefined {
    return links.find((link) => link.rel.toLowerCase() === 'approve')?.href;
  }

  private toPaypalLinks(value: unknown): PaypalLink[] {
    if (!Array.isArray(value)) {
      return [];
    }

    return value
      .map((link) => this.toRecord(link))
      .filter((link): link is Record<string, unknown> => Boolean(link))
      .map((link) => ({
        href: this.toStringValue(link.href),
        rel: this.toStringValue(link.rel),
        method: this.optionalStringValue(link.method),
      }))
      .filter((link) => link.href.length > 0 && link.rel.length > 0);
  }

  private sha256(value: string): string {
    return createHash('sha256').update(value).digest('hex');
  }

  private safeEquals(expected: string, actual: string): boolean {
    const expectedBuffer = Buffer.from(expected.toLowerCase());
    const actualBuffer = Buffer.from(actual.toLowerCase());

    return (
      expectedBuffer.length === actualBuffer.length &&
      timingSafeEqual(expectedBuffer, actualBuffer)
    );
  }

  private formatMoney(value: Prisma.Decimal | number | string): string {
    return Number(value.toString()).toFixed(2);
  }

  private toDateFromFawryTimestamp(
    value: number | string | undefined,
  ): Date | undefined {
    if (value === undefined || value === null || value === '') {
      return undefined;
    }

    const timestamp = Number(value);

    return Number.isFinite(timestamp) ? new Date(timestamp) : undefined;
  }

  private toStringValue(value: unknown): string {
    if (value === undefined || value === null) {
      return '';
    }

    if (
      typeof value === 'string' ||
      typeof value === 'number' ||
      typeof value === 'boolean' ||
      typeof value === 'bigint'
    ) {
      return String(value);
    }

    if (value instanceof Date) {
      return value.toISOString();
    }

    try {
      return JSON.stringify(value) ?? '';
    } catch {
      return '';
    }
  }

  private optionalStringValue(value: unknown): string | undefined {
    const stringValue = this.toStringValue(value);

    return stringValue.length === 0 ? undefined : stringValue;
  }

  private toRecord(value: unknown): Record<string, unknown> | undefined {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      return undefined;
    }

    return value as Record<string, unknown>;
  }

  private toRecordArray(value: unknown): Record<string, unknown>[] {
    if (!Array.isArray(value)) {
      return [];
    }

    return value
      .map((item) => this.toRecord(item))
      .filter((item): item is Record<string, unknown> => Boolean(item));
  }

  private toDateFromIso(value: string | undefined): Date | undefined {
    if (!value) {
      return undefined;
    }

    const date = new Date(value);

    return Number.isNaN(date.getTime()) ? undefined : date;
  }

  private isUuid(value: string): boolean {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value,
    );
  }

  private toCurrencyEnum(currency: string): Currency {
    return currency === Currency.USD ? Currency.USD : Currency.EGP;
  }

  private toJson(value: unknown): Prisma.InputJsonValue {
    return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
  }

  private toNumberFromDecimal(decimal: Prisma.Decimal): number {
    return Number(decimal.toString());
  }

  private toPayment(payment: PaymentRecord) {
    return {
      id: payment.id,
      orderId: payment.orderId,
      userId: payment.userId,
      provider: payment.provider,
      method: payment.method,
      status: payment.status,
      amount: this.toNumberFromDecimal(payment.amount),
      currency: payment.currency,
      merchantRefNumber: payment.merchantRefNumber,
      providerReferenceNumber: payment.providerReferenceNumber,
      paypalOrderId: payment.paypalOrderId,
      providerPaymentReference: payment.providerPaymentReference,
      providerStatus: payment.providerStatus,
      paidAt: payment.paidAt,
      cancelledAt: payment.cancelledAt,
      createdAt: payment.createdAt,
      updatedAt: payment.updatedAt,
    };
  }

  private handleDuplicatePaymentError(
    error: unknown,
    message = 'Fawry payment already exists for this order.',
  ): never {
    if (isPrismaUniqueConstraintError(error)) {
      throw new ConflictException(message);
    }

    throw error;
  }
}
