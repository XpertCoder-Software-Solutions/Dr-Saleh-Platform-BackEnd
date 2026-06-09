import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CouponType } from '@prisma/client';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';
import {
  toCouponCode,
  toOptionalBoolean,
  toOptionalNumber,
  trimOptionalString,
  trimString,
} from './dto-transformers';

export class CreateCouponDto {
  @ApiProperty({
    example: 'WELCOME10',
    maxLength: 50,
    description:
      'Unique coupon code. The API stores codes uppercase and supports letters, numbers, underscore, and dash.',
  })
  @Transform(toCouponCode)
  @IsString()
  @MaxLength(50)
  @Matches(/^[A-Z0-9_-]+$/)
  code: string;

  @ApiProperty({ example: 'Welcome discount', maxLength: 255 })
  @Transform(trimString)
  @IsString()
  @MaxLength(255)
  name: string;

  @ApiPropertyOptional({
    example: 'Ten percent discount for new customers.',
    maxLength: 1000,
  })
  @Transform(trimOptionalString)
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiProperty({
    enum: CouponType,
    enumName: 'CouponType',
    example: CouponType.PERCENTAGE,
  })
  @IsEnum(CouponType)
  type: CouponType;

  @ApiProperty({
    example: 10,
    minimum: 0.01,
    description:
      'Percentage value for PERCENTAGE coupons, or order-currency amount for FIXED_AMOUNT coupons.',
  })
  @Transform(toOptionalNumber)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  value: number;

  @ApiPropertyOptional({ example: 500, minimum: 0 })
  @Transform(toOptionalNumber)
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  minimumOrderAmount?: number;

  @ApiPropertyOptional({ example: 250, minimum: 0.01 })
  @Transform(toOptionalNumber)
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  maximumDiscountAmount?: number;

  @ApiPropertyOptional({
    example: 100,
    minimum: 1,
    description: 'Maximum total uses. Omit for unlimited uses.',
  })
  @Transform(toOptionalNumber)
  @IsOptional()
  @IsInt()
  @Min(1)
  usageLimit?: number;

  @ApiProperty({ example: '2026-06-08T00:00:00.000Z' })
  @IsDateString()
  startsAt: string;

  @ApiProperty({ example: '2026-07-08T00:00:00.000Z' })
  @IsDateString()
  expiresAt: string;

  @ApiPropertyOptional({ example: false, default: false })
  @Transform(toOptionalBoolean)
  @IsOptional()
  @IsBoolean()
  isReferralCoupon?: boolean;

  @ApiPropertyOptional({ example: true, default: true })
  @Transform(toOptionalBoolean)
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
