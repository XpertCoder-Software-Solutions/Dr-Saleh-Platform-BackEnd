import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CartItemType } from '@prisma/client';
import { Transform } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsUUID, Min } from 'class-validator';
import { toOptionalNumber } from './dto-transformers';

export class AddCartItemDto {
  @ApiProperty({
    enum: CartItemType,
    enumName: 'CartItemType',
    example: CartItemType.COURSE,
    description: 'Cart item type. Supported values: COURSE, BOOK, PRODUCT.',
  })
  @IsEnum(CartItemType)
  itemType: CartItemType;

  @ApiProperty({
    example: '7cb9f85b-420f-4f4e-9330-85ab0675df90',
    description:
      'UUID of the course, book format, or product. For BOOK, use BookFormat.id so the cart can validate Physical, Digital, or Audio rules.',
  })
  @IsUUID()
  itemId: string;

  @ApiPropertyOptional({
    example: 1,
    default: 1,
    minimum: 1,
    description: 'Quantity. Courses, digital books, and audio books must be 1.',
  })
  @Transform(toOptionalNumber)
  @IsOptional()
  @IsInt()
  @Min(1)
  quantity?: number;
}
