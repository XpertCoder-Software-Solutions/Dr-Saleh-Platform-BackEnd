import { ApiPropertyOptional } from '@nestjs/swagger';
import { CouponType } from '@prisma/client';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import {
  toOptionalBoolean,
  toOptionalNumber,
  trimOptionalString,
} from './dto-transformers';

export class CouponQueryDto {
  @ApiPropertyOptional({ example: 1, default: 1, minimum: 1 })
  @Transform(toOptionalNumber)
  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ example: 20, default: 20, minimum: 1, maximum: 100 })
  @Transform(toOptionalNumber)
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional({ example: 'WELCOME' })
  @Transform(trimOptionalString)
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    enum: CouponType,
    enumName: 'CouponType',
    example: CouponType.PERCENTAGE,
  })
  @IsOptional()
  @IsEnum(CouponType)
  type?: CouponType;

  @ApiPropertyOptional({ example: true })
  @Transform(toOptionalBoolean)
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ example: false })
  @Transform(toOptionalBoolean)
  @IsOptional()
  @IsBoolean()
  isReferralCoupon?: boolean;
}
