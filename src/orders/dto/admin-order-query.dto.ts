import { ApiPropertyOptional } from '@nestjs/swagger';
import { OrderStatus, PaymentStatus } from '@prisma/client';
import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { OrderQueryDto } from './order-query.dto';

export class AdminOrderQueryDto extends OrderQueryDto {
  @ApiPropertyOptional({
    enum: OrderStatus,
    enumName: 'OrderStatus',
    example: OrderStatus.PENDING,
  })
  @IsOptional()
  @IsEnum(OrderStatus)
  status?: OrderStatus;

  @ApiPropertyOptional({
    enum: PaymentStatus,
    enumName: 'PaymentStatus',
    example: PaymentStatus.PENDING,
  })
  @IsOptional()
  @IsEnum(PaymentStatus)
  paymentStatus?: PaymentStatus;

  @ApiPropertyOptional({
    example: '6ea44107-c306-4c06-bf6f-8cf8ebf0ab33',
  })
  @IsOptional()
  @IsUUID()
  userId?: string;
}
