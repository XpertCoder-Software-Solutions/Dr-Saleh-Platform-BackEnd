import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { toOptionalBoolean, trimString } from './dto-transformers';

export class CreateConsultationCategoryDto {
  @ApiProperty({ example: 'استشارات أسرية' })
  @Transform(trimString)
  @IsString()
  @IsNotEmpty()
  nameAr: string;

  @ApiProperty({ example: 'Family Consultations' })
  @Transform(trimString)
  @IsString()
  @IsNotEmpty()
  nameEn: string;

  @ApiPropertyOptional({ example: true, default: true })
  @Transform(toOptionalBoolean)
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
