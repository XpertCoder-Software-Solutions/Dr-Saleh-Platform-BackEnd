import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
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

export class CreateProductDto {
  @ApiProperty({
    example: '7cb9f85b-420f-4f4e-9330-85ab0675df90',
    description: 'Product category UUID.',
  })
  @Transform(trimString)
  @IsUUID()
  categoryId: string;

  @ApiProperty({ example: 'منتج العناية اليومي' })
  @Transform(trimString)
  @IsString()
  @IsNotEmpty()
  nameAr: string;

  @ApiProperty({ example: 'Daily Care Product' })
  @Transform(trimString)
  @IsString()
  @IsNotEmpty()
  nameEn: string;

  @ApiPropertyOptional({
    example: 'daily-care-product',
    description: 'Optional. Generated from nameEn when omitted.',
  })
  @Transform(trimOptionalString)
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  slug?: string;

  @ApiProperty({ example: 'وصف تفصيلي للمنتج.' })
  @Transform(trimString)
  @IsString()
  @IsNotEmpty()
  descriptionAr: string;

  @ApiProperty({ example: 'Detailed product description.' })
  @Transform(trimString)
  @IsString()
  @IsNotEmpty()
  descriptionEn: string;

  @ApiProperty({ example: 450 })
  @Transform(toOptionalNumber)
  @IsNumber()
  @IsPositive()
  priceEGP: number;

  @ApiPropertyOptional({ example: 350 })
  @Transform(toOptionalNumber)
  @IsOptional()
  @IsNumber()
  @IsPositive()
  discountPriceEGP?: number;

  @ApiProperty({ example: 20 })
  @Transform(toOptionalNumber)
  @IsNumber()
  @IsPositive()
  priceUSD: number;

  @ApiPropertyOptional({ example: 15 })
  @Transform(toOptionalNumber)
  @IsOptional()
  @IsNumber()
  @IsPositive()
  discountPriceUSD?: number;

  @ApiProperty({ example: 25 })
  @Transform(toOptionalNumber)
  @IsInt()
  @Min(0)
  stock: number;

  @ApiPropertyOptional({ example: 'DRS-CARE-001' })
  @Transform(trimOptionalString)
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  sku?: string;

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
