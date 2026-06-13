import { ApiPropertyOptional } from '@nestjs/swagger';
import { OrderStatus, PaymentStatus } from '@prisma/client';
import { IsEnum, IsOptional } from 'class-validator';

export class UpdateOrderStatusDto {
  @ApiPropertyOptional({
    enum: OrderStatus,
    enumName: 'OrderStatus',
    example: OrderStatus.CANCELLED,
    description:
      'Admin status updates cannot manually set PAID. Verified payment providers set PAID.',
  })
  @IsOptional()
  @IsEnum(OrderStatus)
  status?: OrderStatus;

  @ApiPropertyOptional({
    enum: PaymentStatus,
    enumName: 'PaymentStatus',
    example: PaymentStatus.CANCELLED,
    description:
      'Admin payment status updates cannot manually set PAID. Verified payment providers set PAID.',
  })
  @IsOptional()
  @IsEnum(PaymentStatus)
  paymentStatus?: PaymentStatus;
}
