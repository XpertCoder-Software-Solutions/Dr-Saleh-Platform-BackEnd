import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsUUID,
  Max,
  Min,
} from 'class-validator';
import { toOptionalBoolean, toOptionalNumber } from './dto-transformers';

export class ReferralQueryDto {
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
}

export class AdminReferralQueryDto extends ReferralQueryDto {
  @ApiPropertyOptional({ example: '6ea44107-c306-4c06-bf6f-8cf8ebf0ab33' })
  @IsOptional()
  @IsUUID()
  referrerUserId?: string;

  @ApiPropertyOptional({ example: '73d95ad4-471d-42ea-9f5f-a1662ebc719c' })
  @IsOptional()
  @IsUUID()
  referredUserId?: string;

  @ApiPropertyOptional({ example: true })
  @Transform(toOptionalBoolean)
  @IsOptional()
  @IsBoolean()
  isRewarded?: boolean;
}
