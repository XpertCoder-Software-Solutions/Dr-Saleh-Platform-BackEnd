import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { WishlistItemType } from '@prisma/client';

export class WishlistCatalogItemDto {
  @ApiProperty({ example: '7cb9f85b-420f-4f4e-9330-85ab0675df90' })
  id: string;

  @ApiProperty({
    enum: WishlistItemType,
    enumName: 'WishlistItemType',
    example: WishlistItemType.BOOK,
  })
  itemType: WishlistItemType;

  @ApiPropertyOptional({ example: 'book-slug' })
  slug?: string;

  @ApiProperty({ example: 'Arabic item name' })
  nameAr: string;

  @ApiProperty({ example: 'English item name' })
  nameEn: string;

  @ApiProperty({ example: '/uploads/books/covers/book.jpg', nullable: true })
  image: string | null;

  @ApiProperty({ example: 1200 })
  priceEGP: number;

  @ApiProperty({ example: 950, nullable: true })
  discountPriceEGP: number | null;

  @ApiProperty({ example: 40 })
  priceUSD: number;

  @ApiProperty({ example: 30, nullable: true })
  discountPriceUSD: number | null;

  @ApiProperty({ example: true })
  isActive: boolean;

  @ApiPropertyOptional({ example: true })
  isDisplayed?: boolean;

  @ApiPropertyOptional({ example: 15 })
  stock?: number;
}

export class WishlistItemResponseDto {
  @ApiProperty({ example: 'd98fb0df-d660-443b-bbb5-980f32cba086' })
  id: string;

  @ApiProperty({ example: '6ea44107-c306-4c06-bf6f-8cf8ebf0ab33' })
  userId: string;

  @ApiProperty({
    enum: WishlistItemType,
    enumName: 'WishlistItemType',
    example: WishlistItemType.BOOK,
  })
  itemType: WishlistItemType;

  @ApiProperty({ example: '7cb9f85b-420f-4f4e-9330-85ab0675df90' })
  itemId: string;

  @ApiProperty({ example: '2026-06-06T12:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ type: WishlistCatalogItemDto, nullable: true })
  item: WishlistCatalogItemDto | null;
}

export class PaginationDto {
  @ApiProperty({ example: 1 })
  page: number;

  @ApiProperty({ example: 20 })
  limit: number;

  @ApiProperty({ example: 42 })
  total: number;

  @ApiProperty({ example: 3 })
  totalPages: number;
}

export class WishlistItemDataDto {
  @ApiProperty({ type: WishlistItemResponseDto })
  wishlistItem: WishlistItemResponseDto;
}

export class WishlistListDataDto {
  @ApiProperty({ type: [WishlistItemResponseDto] })
  items: WishlistItemResponseDto[];

  @ApiProperty({ type: PaginationDto })
  pagination: PaginationDto;
}

export class WishlistCheckDataDto {
  @ApiProperty({ example: true })
  exists: boolean;
}

export class EmptyWishlistDataDto {}

export class WishlistItemApiResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ example: 'Wishlist item added successfully' })
  message: string;

  @ApiProperty({ type: WishlistItemDataDto })
  data: WishlistItemDataDto;
}

export class WishlistListApiResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ example: 'Wishlist returned successfully' })
  message: string;

  @ApiProperty({ type: WishlistListDataDto })
  data: WishlistListDataDto;
}

export class WishlistCheckApiResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ example: 'Wishlist check returned successfully' })
  message: string;

  @ApiProperty({ type: WishlistCheckDataDto })
  data: WishlistCheckDataDto;
}

export class WishlistDeleteApiResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ example: 'Wishlist item removed successfully' })
  message: string;

  @ApiProperty({ type: EmptyWishlistDataDto })
  data: EmptyWishlistDataDto;
}
