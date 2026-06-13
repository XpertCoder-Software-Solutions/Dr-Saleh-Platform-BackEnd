import { ApiPropertyOptional } from '@nestjs/swagger';
import { NotificationStatus, NotificationType } from '@prisma/client';
import { Transform } from 'class-transformer';
import {
  IsDateString,
  IsEmail,
  IsEnum,
  IsInt,
  IsOptional,
  Max,
  Min,
} from 'class-validator';
import {
  normalizeEmail,
  toOptionalNumber,
} from '../../common/utils/dto-transformers';

export class AdminNotificationLogsQueryDto {
  @ApiPropertyOptional({ example: 1, default: 1 })
  @Transform(toOptionalNumber)
  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ example: 20, default: 20, maximum: 100 })
  @Transform(toOptionalNumber)
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional({
    enum: NotificationType,
    enumName: 'NotificationType',
    example: NotificationType.PAYMENT_SUCCESS,
  })
  @IsOptional()
  @IsEnum(NotificationType)
  type?: NotificationType;

  @ApiPropertyOptional({
    enum: NotificationStatus,
    enumName: 'NotificationStatus',
    example: NotificationStatus.SENT,
  })
  @IsOptional()
  @IsEnum(NotificationStatus)
  status?: NotificationStatus;

  @ApiPropertyOptional({ example: 'student@example.com' })
  @Transform(normalizeEmail)
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: '2026-06-01T00:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @ApiPropertyOptional({ example: '2026-06-12T23:59:59.999Z' })
  @IsOptional()
  @IsDateString()
  dateTo?: string;
}
