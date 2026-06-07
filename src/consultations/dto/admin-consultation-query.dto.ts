import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsInt, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';
import { toOptionalNumber, trimString } from './dto-transformers';

export class AdminConsultationQueryDto {
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
    example: 'Ahmed',
    description:
      'Search by fullName, phone, whatsApp, email, country, or consultationTopic.',
  })
  @Transform(trimString)
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ example: '6f893ec2-5c3a-4d39-bb89-66dd3d9ad179' })
  @IsOptional()
  @IsUUID()
  categoryId?: string;
}
