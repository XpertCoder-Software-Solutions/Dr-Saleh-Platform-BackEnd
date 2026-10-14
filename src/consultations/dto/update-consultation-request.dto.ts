import { ApiPropertyOptional } from '@nestjs/swagger';
import { ConsultationRequestStatus } from '@prisma/client';
import { Transform } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import { trimString } from './dto-transformers';

export class UpdateConsultationRequestDto {
  @ApiPropertyOptional({
    enum: ConsultationRequestStatus,
    example: ConsultationRequestStatus.SCHEDULED,
  })
  @IsOptional()
  @IsEnum(ConsultationRequestStatus)
  status?: ConsultationRequestStatus;

  @ApiPropertyOptional({
    example: '2026-10-20T17:00:00.000Z',
    nullable: true,
    description: 'Session date agreed with the client. Send null to clear.',
  })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsDateString()
  scheduledAt?: string | null;

  @ApiPropertyOptional({ example: 'اتكلمنا معاه وهيأكد بكرة', nullable: true })
  @Transform(trimString)
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  @MaxLength(2000)
  adminNotes?: string | null;
}
