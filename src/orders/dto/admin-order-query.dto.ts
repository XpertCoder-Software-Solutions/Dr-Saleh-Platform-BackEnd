import { ApiPropertyOptional } from '@nestjs/swagger';
import { OrderStatus, PaymentStatus, ShippingStatus } from '@prisma/client';
import { Transform } from 'class-transformer';
import {
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { trimOptionalString } from '../../common/utils/dto-transformers';
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

  @ApiPropertyOptional({
    example: 'DS-2026-000003',
    description: 'Order number, customer name, email or phone.',
  })
  @Transform(trimOptionalString)
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;

  @ApiPropertyOptional({ enum: ShippingStatus, enumName: 'ShippingStatus' })
  @IsOptional()
  @IsEnum(ShippingStatus)
  shippingStatus?: ShippingStatus;
}
