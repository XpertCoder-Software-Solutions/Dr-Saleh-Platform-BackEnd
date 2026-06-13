import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';
import {
  toOptionalNumber,
  trimOptionalString,
} from '../../common/utils/dto-transformers';

export class AuditLogQueryDto {
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
    example: '6ea44107-c306-4c06-bf6f-8cf8ebf0ab33',
  })
  @IsOptional()
  @IsUUID()
  actorUserId?: string;

  @ApiPropertyOptional({ example: 'COURSE_CREATED' })
  @Transform(trimOptionalString)
  @IsOptional()
  @IsString()
  action?: string;

  @ApiPropertyOptional({ example: 'Course' })
  @Transform(trimOptionalString)
  @IsOptional()
  @IsString()
  entityType?: string;

  @ApiPropertyOptional({
    example: 'd0cd9afd-23d6-4c2d-b7c9-4328756da109',
  })
  @Transform(trimOptionalString)
  @IsOptional()
  @IsString()
  entityId?: string;

  @ApiPropertyOptional({ example: '2026-06-01T00:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @ApiPropertyOptional({ example: '2026-06-13T23:59:59.999Z' })
  @IsOptional()
  @IsDateString()
  dateTo?: string;
}
