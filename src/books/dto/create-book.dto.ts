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
  trimString,
} from './dto-transformers';

export class CreateBookDto {
  @ApiProperty({
    example: '7cb9f85b-420f-4f4e-9330-85ab0675df90',
    description: 'Book category UUID.',
  })
  @Transform(trimString)
  @IsUUID()
  categoryId: string;

  @ApiProperty({ example: 'كتاب الرحلة' })
  @Transform(trimString)
  @IsString()
  @IsNotEmpty()
  titleAr: string;

  @ApiProperty({ example: 'The Journey Book' })
  @Transform(trimString)
  @IsString()
  @IsNotEmpty()
  titleEn: string;

  @ApiProperty({ example: 'the-journey-book' })
  @Transform(trimString)
  @IsString()
  @IsNotEmpty()
  slug: string;

  @ApiProperty({ example: 'وصف تفصيلي للكتاب.' })
  @Transform(trimString)
  @IsString()
  @IsNotEmpty()
  descriptionAr: string;

  @ApiProperty({ example: 'Detailed book description.' })
  @Transform(trimString)
  @IsString()
  @IsNotEmpty()
  descriptionEn: string;

  @ApiProperty({ example: 450 })
  @Transform(toOptionalNumber)
  @IsNumber()
  @Min(0)
  priceEGP: number;

  @ApiPropertyOptional({ example: 350 })
  @Transform(toOptionalNumber)
  @IsOptional()
  @IsNumber()
  @Min(0)
  discountPriceEGP?: number;

  @ApiProperty({ example: 20 })
  @Transform(toOptionalNumber)
  @IsNumber()
  @Min(0)
  priceUSD: number;

  @ApiPropertyOptional({ example: 15 })
  @Transform(toOptionalNumber)
  @IsOptional()
  @IsNumber()
  @Min(0)
  discountPriceUSD?: number;

  @ApiPropertyOptional({ example: false, default: false })
  @Transform(toOptionalBoolean)
  @IsOptional()
  @IsBoolean()
  isFeatured?: boolean;

  @ApiPropertyOptional({ example: false, default: false })
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
