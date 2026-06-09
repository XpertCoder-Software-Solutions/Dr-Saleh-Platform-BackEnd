import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import {
  toOptionalBoolean,
  trimOptionalString,
  trimString,
} from './dto-transformers';

export class CreateCourseCategoryDto {
  @ApiProperty({ example: 'القلق والاكتئاب' })
  @Transform(trimString)
  @IsString()
  @IsNotEmpty()
  nameAr: string;

  @ApiProperty({ example: 'Anxiety and Depression' })
  @Transform(trimString)
  @IsString()
  @IsNotEmpty()
  nameEn: string;

  @ApiPropertyOptional({
    example: 'courses/thumbnails/category-image.webp',
    nullable: true,
  })
  @Transform(trimOptionalString)
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  image?: string;

  @ApiPropertyOptional({ example: true, default: true })
  @Transform(toOptionalBoolean)
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
