import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';
import {
  toOptionalBoolean,
  toOptionalNumber,
  trimOptionalString,
  trimString,
} from './dto-transformers';

export class CreateCourseDto {
  @ApiProperty({ example: '7cb9f85b-420f-4f4e-9330-85ab0675df90' })
  @Transform(trimString)
  @IsUUID()
  categoryId: string;

  @ApiProperty({ example: 'دورة علاج القلق' })
  @Transform(trimString)
  @IsString()
  @IsNotEmpty()
  titleAr: string;

  @ApiProperty({ example: 'Anxiety Therapy Course' })
  @Transform(trimString)
  @IsString()
  @IsNotEmpty()
  titleEn: string;

  @ApiProperty({ example: 'وصف عربي مختصر للدورة.' })
  @Transform(trimString)
  @IsString()
  @IsNotEmpty()
  shortDescriptionAr: string;

  @ApiProperty({ example: 'A short English course description.' })
  @Transform(trimString)
  @IsString()
  @IsNotEmpty()
  shortDescriptionEn: string;

  @ApiProperty({ example: 'الوصف العربي الكامل للدورة.' })
  @Transform(trimString)
  @IsString()
  @IsNotEmpty()
  descriptionAr: string;

  @ApiProperty({ example: 'The full English course description.' })
  @Transform(trimString)
  @IsString()
  @IsNotEmpty()
  descriptionEn: string;

  @ApiPropertyOptional({
    example: 'courses/thumbnails/course-thumbnail.webp',
    nullable: true,
  })
  @Transform(trimOptionalString)
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  thumbnailImage?: string;

  @ApiPropertyOptional({
    example: 'courses/videos/promo.mp4',
    nullable: true,
  })
  @Transform(trimOptionalString)
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  promoVideoUrl?: string;

  @ApiProperty({ example: 1200 })
  @Transform(toOptionalNumber)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  priceEGP: number;

  @ApiProperty({ example: 40 })
  @Transform(toOptionalNumber)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  priceUSD: number;

  @ApiPropertyOptional({ example: 950, nullable: true })
  @Transform(toOptionalNumber)
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  discountPriceEGP?: number;

  @ApiPropertyOptional({ example: 30, nullable: true })
  @Transform(toOptionalNumber)
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  discountPriceUSD?: number;

  @ApiPropertyOptional({ example: true, default: false })
  @Transform(toOptionalBoolean)
  @IsOptional()
  @IsBoolean()
  certificateEnabled?: boolean;

  @ApiPropertyOptional({ example: true, default: false })
  @Transform(toOptionalBoolean)
  @IsOptional()
  @IsBoolean()
  isFeatured?: boolean;

  @ApiPropertyOptional({ example: true, default: false })
  @Transform(toOptionalBoolean)
  @IsOptional()
  @IsBoolean()
  isHomeDisplay?: boolean;

  @ApiPropertyOptional({ example: true, default: true })
  @Transform(toOptionalBoolean)
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
