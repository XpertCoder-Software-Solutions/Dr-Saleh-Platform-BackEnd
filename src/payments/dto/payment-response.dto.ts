import { ApiProperty } from '@nestjs/swagger';
import { PaymentMethod, PaymentProvider, PaymentStatus } from '@prisma/client';

export class PaymentResponseDto {
  @ApiProperty({ example: 'd0cd9afd-23d6-4c2d-b7c9-4328756da109' })
  id: string;

  @ApiProperty({ example: 'd60c84b5-470b-4dde-a0a4-d0be057e8922' })
  orderId: string;

  @ApiProperty({ example: '6ea44107-c306-4c06-bf6f-8cf8ebf0ab33' })
  userId: string;

  @ApiProperty({
    enum: PaymentProvider,
    enumName: 'PaymentProvider',
    example: PaymentProvider.FAWRY,
  })
  provider: PaymentProvider;

  @ApiProperty({
    enum: PaymentMethod,
    enumName: 'PaymentMethod',
    example: PaymentMethod.FAWRY_REFERENCE,
  })
  method: PaymentMethod;

  @ApiProperty({
    enum: PaymentStatus,
    enumName: 'PaymentStatus',
    example: PaymentStatus.PENDING,
  })
  status: PaymentStatus;

  @ApiProperty({ example: 1900 })
  amount: number;

  @ApiProperty({ example: 'EGP' })
  currency: string;

  @ApiProperty({ example: 'DS-2026-000001' })
  merchantRefNumber: string;

  @ApiProperty({ example: '963455678', nullable: true })
  providerReferenceNumber: string | null;

  @ApiProperty({ example: '5O190127TN364715T', nullable: true })
  paypalOrderId: string | null;

  @ApiProperty({ example: '369552233', nullable: true })
  providerPaymentReference: string | null;

  @ApiProperty({ example: 'PAID', nullable: true })
  providerStatus: string | null;

  @ApiProperty({ example: '2026-06-08T12:00:00.000Z', nullable: true })
  paidAt: Date | null;

  @ApiProperty({ example: '2026-06-08T12:00:00.000Z', nullable: true })
  cancelledAt: Date | null;

  @ApiProperty({ example: '2026-06-08T12:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2026-06-08T12:00:00.000Z' })
  updatedAt: Date;
}

export class FawryCreatePaymentDataDto {
  @ApiProperty({ type: PaymentResponseDto })
  payment: PaymentResponseDto;

  @ApiProperty({ example: '963455678', nullable: true })
  referenceNumber: string | null;

  @ApiProperty({ example: 'DS-2026-000001' })
  merchantRefNumber: string;
}

export class FawryStatusDataDto {
  @ApiProperty({ type: PaymentResponseDto })
  payment: PaymentResponseDto;
}

export class FawryWebhookDataDto {
  @ApiProperty({ example: true })
  received: boolean;
}

export class PaypalCreatePaymentDataDto {
  @ApiProperty({ type: PaymentResponseDto })
  payment: PaymentResponseDto;

  @ApiProperty({ example: '5O190127TN364715T' })
  paypalOrderId: string;

  @ApiProperty({
    example:
      'https://www.sandbox.paypal.com/checkoutnow?token=5O190127TN364715T',
  })
  approvalUrl: string;
}

export class PaypalStatusDataDto {
  @ApiProperty({ type: PaymentResponseDto })
  payment: PaymentResponseDto;
}

export class PaypalWebhookDataDto {
  @ApiProperty({ example: true })
  received: boolean;
}

export class FawryCreatePaymentApiResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ example: 'Fawry payment request created successfully' })
  message: string;

  @ApiProperty({ type: FawryCreatePaymentDataDto })
  data: FawryCreatePaymentDataDto;
}

export class FawryStatusApiResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ example: 'Fawry payment status returned successfully' })
  message: string;

  @ApiProperty({ type: FawryStatusDataDto })
  data: FawryStatusDataDto;
}

export class FawryWebhookApiResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ example: 'Fawry webhook processed successfully' })
  message: string;

  @ApiProperty({ type: FawryWebhookDataDto })
  data: FawryWebhookDataDto;
}

export class PaypalCreatePaymentApiResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ example: 'PayPal order created successfully' })
  message: string;

  @ApiProperty({ type: PaypalCreatePaymentDataDto })
  data: PaypalCreatePaymentDataDto;
}

export class PaypalStatusApiResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ example: 'PayPal payment status returned successfully' })
  message: string;

  @ApiProperty({ type: PaypalStatusDataDto })
  data: PaypalStatusDataDto;
}

export class PaypalWebhookApiResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ example: 'PayPal webhook processed successfully' })
  message: string;

  @ApiProperty({ type: PaypalWebhookDataDto })
  data: PaypalWebhookDataDto;
}
