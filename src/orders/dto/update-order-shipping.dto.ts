import { ApiPropertyOptional } from '@nestjs/swagger';
import { ShippingStatus } from '@prisma/client';
import { Transform } from 'class-transformer';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { trimOptionalString } from '../../common/utils/dto-transformers';

export class UpdateOrderShippingDto {
  @ApiPropertyOptional({ enum: ShippingStatus, enumName: 'ShippingStatus' })
  @IsOptional()
  @IsEnum(ShippingStatus)
  shippingStatus?: ShippingStatus;

  @ApiPropertyOptional({ example: 'BOSTA-88213', maxLength: 100 })
  @Transform(trimOptionalString)
  @IsOptional()
  @IsString()
  @MaxLength(100)
  trackingNumber?: string;

  @ApiPropertyOptional({ example: 'Bosta', maxLength: 100 })
  @Transform(trimOptionalString)
  @IsOptional()
  @IsString()
  @MaxLength(100)
  shippingCarrier?: string;
}
