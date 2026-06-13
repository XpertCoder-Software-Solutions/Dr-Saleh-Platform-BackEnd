import { PaymentMethod, PaymentProvider, PaymentStatus } from '@prisma/client';
export declare class PaymentResponseDto {
    id: string;
    orderId: string;
    userId: string;
    provider: PaymentProvider;
    method: PaymentMethod;
    status: PaymentStatus;
    amount: number;
    currency: string;
    merchantRefNumber: string;
    providerReferenceNumber: string | null;
    paypalOrderId: string | null;
    providerPaymentReference: string | null;
    providerStatus: string | null;
    paidAt: Date | null;
    cancelledAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
}
export declare class FawryCreatePaymentDataDto {
    payment: PaymentResponseDto;
    referenceNumber: string | null;
    merchantRefNumber: string;
}
export declare class FawryStatusDataDto {
    payment: PaymentResponseDto;
}
export declare class FawryWebhookDataDto {
    received: boolean;
}
export declare class PaypalCreatePaymentDataDto {
    payment: PaymentResponseDto;
    paypalOrderId: string;
    approvalUrl: string;
}
export declare class PaypalStatusDataDto {
    payment: PaymentResponseDto;
}
export declare class PaypalWebhookDataDto {
    received: boolean;
}
export declare class FawryCreatePaymentApiResponseDto {
    success: boolean;
    message: string;
    data: FawryCreatePaymentDataDto;
}
export declare class FawryStatusApiResponseDto {
    success: boolean;
    message: string;
    data: FawryStatusDataDto;
}
export declare class FawryWebhookApiResponseDto {
    success: boolean;
    message: string;
    data: FawryWebhookDataDto;
}
export declare class PaypalCreatePaymentApiResponseDto {
    success: boolean;
    message: string;
    data: PaypalCreatePaymentDataDto;
}
export declare class PaypalStatusApiResponseDto {
    success: boolean;
    message: string;
    data: PaypalStatusDataDto;
}
export declare class PaypalWebhookApiResponseDto {
    success: boolean;
    message: string;
    data: PaypalWebhookDataDto;
}
