import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BookFormatType } from '@prisma/client';
import { Transform } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import {
  toBookFormatType,
  toOptionalNumber,
  trimString,
} from './dto-transformers';

export class CreateBookFormatDto {
  @ApiProperty({
    enum: BookFormatType,
    example: BookFormatType.Physical,
    description: 'Use Physical, Digital, or Audio.',
  })
  @Transform(toBookFormatType)
  @IsEnum(BookFormatType)
  formatType: BookFormatType;

  @ApiPropertyOptional({
    example: 'BOOK-001-PHYSICAL',
    description: 'Allowed only for Physical formats.',
  })
  @Transform(trimString)
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  sku?: string;

  @ApiPropertyOptional({
    example: 25,
    description:
      'Required for Physical formats. Not allowed for Digital/Audio.',
  })
  @Transform(toOptionalNumber)
  @IsOptional()
  @IsInt()
  @Min(0)
  stock?: number;

  @ApiPropertyOptional({
    example: 0.4,
    description: 'Allowed only for Physical formats.',
  })
  @Transform(toOptionalNumber)
  @IsOptional()
  @IsNumber()
  @Min(0)
  weight?: number;

  @ApiPropertyOptional({ example: 450 })
  @Transform(toOptionalNumber)
  @IsOptional()
  @IsNumber()
  @Min(0)
  priceEGP?: number;

  @ApiPropertyOptional({ example: 350 })
  @Transform(toOptionalNumber)
  @IsOptional()
  @IsNumber()
  @Min(0)
  discountPriceEGP?: number;

  @ApiPropertyOptional({ example: 20 })
  @Transform(toOptionalNumber)
  @IsOptional()
  @IsNumber()
  @Min(0)
  priceUSD?: number;

  @ApiPropertyOptional({ example: 15 })
  @Transform(toOptionalNumber)
  @IsOptional()
  @IsNumber()
  @Min(0)
  discountPriceUSD?: number;

  @ApiPropertyOptional({
    example: 180,
    description:
      'Required for Audio formats. Not allowed for Physical/Digital.',
  })
  @Transform(toOptionalNumber)
  @IsOptional()
  @IsInt()
  @Min(1)
  audioDuration?: number;
}
