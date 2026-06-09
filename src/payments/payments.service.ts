import {
  BadGatewayException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
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
import { createHash, timingSafeEqual } from 'crypto';
import fawryConfig, { type FawryConfig } from '../config/fawry.config';
import paypalConfig, { type PaypalConfig } from '../config/paypal.config';
import { PrismaService } from '../database/prisma.service';
import { ReferralsService } from '../referrals/referrals.service';
import { CreateFawryPaymentDto } from './dto/create-fawry-payment.dto';
import { CreatePaypalPaymentDto } from './dto/create-paypal-payment.dto';
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

type PaymentRecord = Prisma.PaymentGetPayload<{ select: typeof paymentSelect }>;
type OrderPaymentRecord = Prisma.OrderGetPayload<{
  select: typeof orderPaymentSelect;
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
    private readonly referralsService: ReferralsService,
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
    return {
      intent: 'CAPTURE',
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
        await tx.order.update({
          where: { id: payment.orderId },
          data: {
            status: OrderStatus.CANCELLED,
            paymentStatus: PaymentStatus.CANCELLED,
          },
        });
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

    if (nextStatus === PaymentStatus.PAID) {
      await this.referralsService.rewardReferralAfterFirstPaidOrder(
        payment.userId,
      );
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
        await tx.order.update({
          where: { id: payment.orderId },
          data: {
            status: OrderStatus.CANCELLED,
            paymentStatus: PaymentStatus.CANCELLED,
          },
        });
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

    if (nextStatus === PaymentStatus.PAID) {
      await this.referralsService.rewardReferralAfterFirstPaidOrder(
        payment.userId,
      );
    }

    return updatedPaymentResult;
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

      await tx.order.update({
        where: { id: payment.orderId },
        data: {
          status: OrderStatus.CANCELLED,
          paymentStatus: PaymentStatus.CANCELLED,
        },
      });
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
    return value === undefined || value === null ? '' : String(value);
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
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new ConflictException(message);
    }

    throw error;
  }
}
