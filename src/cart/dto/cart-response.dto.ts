import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BookFormatType, CartItemType, Currency } from '@prisma/client';

export class CartCatalogItemDto {
  @ApiProperty({ example: '7cb9f85b-420f-4f4e-9330-85ab0675df90' })
  id: string;

  @ApiProperty({
    enum: CartItemType,
    enumName: 'CartItemType',
    example: CartItemType.BOOK,
  })
  itemType: CartItemType;

  @ApiPropertyOptional({ example: 'book-slug' })
  slug?: string;

  @ApiPropertyOptional({ example: 'BK-001' })
  sku?: string | null;

  @ApiPropertyOptional({
    enum: BookFormatType,
    enumName: 'BookFormatType',
    example: BookFormatType.Physical,
  })
  formatType?: BookFormatType;

  @ApiPropertyOptional({
    example: '2f03475b-c4ed-4dec-8564-fb890dcf706d',
    description: 'Parent book UUID when itemType is BOOK.',
  })
  bookId?: string;

  @ApiProperty({ example: 'Arabic item name' })
  nameAr: string;

  @ApiProperty({ example: 'English item name' })
  nameEn: string;

  @ApiProperty({ example: '/uploads/products/product.jpg', nullable: true })
  image: string | null;

  @ApiProperty({ example: 1200 })
  priceEGP: number;

  @ApiProperty({ example: 950, nullable: true })
  discountPriceEGP: number | null;

  @ApiProperty({ example: 40 })
  priceUSD: number;

  @ApiProperty({ example: 30, nullable: true })
  discountPriceUSD: number | null;

  @ApiPropertyOptional({ example: 15, nullable: true })
  stock?: number | null;

  @ApiProperty({ example: true })
  isActive: boolean;
}

export class CartItemResponseDto {
  @ApiProperty({ example: 'd98fb0df-d660-443b-bbb5-980f32cba086' })
  id: string;

  @ApiProperty({ example: '31da1322-33f1-4afa-8f76-5643f489d9a5' })
  cartId: string;

  @ApiProperty({
    enum: CartItemType,
    enumName: 'CartItemType',
    example: CartItemType.PRODUCT,
  })
  itemType: CartItemType;

  @ApiProperty({ example: '7cb9f85b-420f-4f4e-9330-85ab0675df90' })
  itemId: string;

  @ApiProperty({ example: 2 })
  quantity: number;

  @ApiProperty({
    enum: Currency,
    enumName: 'Currency',
    example: Currency.EGP,
  })
  currency: Currency;

  @ApiProperty({ example: 1200 })
  unitPrice: number;

  @ApiProperty({ example: 950, nullable: true })
  discountUnitPrice: number | null;

  @ApiProperty({ example: 2400 })
  lineSubtotal: number;

  @ApiProperty({ example: 500 })
  lineDiscount: number;

  @ApiProperty({ example: 1900 })
  lineTotal: number;

  @ApiProperty({ example: '2026-06-08T12:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2026-06-08T12:00:00.000Z' })
  updatedAt: Date;

  @ApiProperty({ type: CartCatalogItemDto, nullable: true })
  item: CartCatalogItemDto | null;
}

export class CartSummaryDto {
  @ApiProperty({
    enum: Currency,
    enumName: 'Currency',
    example: Currency.EGP,
  })
  currency: Currency;

  @ApiProperty({ example: 2400 })
  subtotal: number;

  @ApiProperty({ example: 500 })
  discount: number;

  @ApiProperty({ example: 1900 })
  total: number;

  @ApiProperty({ example: 1900 })
  grandTotal: number;

  @ApiProperty({ example: 2 })
  itemsCount: number;
}

export class CartDto {
  @ApiProperty({
    example: '31da1322-33f1-4afa-8f76-5643f489d9a5',
    nullable: true,
  })
  id: string | null;

  @ApiProperty({ example: '6ea44107-c306-4c06-bf6f-8cf8ebf0ab33' })
  userId: string;

  @ApiProperty({
    example: '2026-06-08T12:00:00.000Z',
    nullable: true,
  })
  createdAt: Date | null;

  @ApiProperty({
    example: '2026-06-08T12:00:00.000Z',
    nullable: true,
  })
  updatedAt: Date | null;

  @ApiProperty({ type: [CartItemResponseDto] })
  items: CartItemResponseDto[];
}

export class CartDataDto {
  @ApiProperty({ type: CartDto })
  cart: CartDto;

  @ApiProperty({ type: CartSummaryDto })
  summary: CartSummaryDto;
}

export class CartItemDataDto {
  @ApiProperty({ type: CartItemResponseDto })
  cartItem: CartItemResponseDto;
}

export class EmptyCartDataDto {}

export class CartApiResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ example: 'Cart returned successfully' })
  message: string;

  @ApiProperty({ type: CartDataDto })
  data: CartDataDto;
}

export class CartItemApiResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ example: 'Cart item added successfully' })
  message: string;

  @ApiProperty({ type: CartItemDataDto })
  data: CartItemDataDto;
}

export class CartSummaryApiResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ example: 'Cart summary returned successfully' })
  message: string;

  @ApiProperty({ type: CartSummaryDto })
  data: CartSummaryDto;
}

export class CartDeleteApiResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ example: 'Cart item removed successfully' })
  message: string;

  @ApiProperty({ type: EmptyCartDataDto })
  data: EmptyCartDataDto;
}
