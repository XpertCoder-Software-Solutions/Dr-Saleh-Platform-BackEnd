import { BookFormatType, CartItemType, Currency } from '@prisma/client';
export declare class CartCatalogItemDto {
    id: string;
    itemType: CartItemType;
    slug?: string;
    sku?: string | null;
    formatType?: BookFormatType;
    bookId?: string;
    nameAr: string;
    nameEn: string;
    image: string | null;
    priceEGP: number;
    discountPriceEGP: number | null;
    priceUSD: number;
    discountPriceUSD: number | null;
    stock?: number | null;
    isActive: boolean;
}
export declare class CartItemResponseDto {
    id: string;
    cartId: string;
    itemType: CartItemType;
    itemId: string;
    quantity: number;
    currency: Currency;
    unitPrice: number;
    discountUnitPrice: number | null;
    lineSubtotal: number;
    lineDiscount: number;
    lineTotal: number;
    createdAt: Date;
    updatedAt: Date;
    item: CartCatalogItemDto | null;
}
export declare class CartSummaryDto {
    currency: Currency;
    subtotal: number;
    discount: number;
    total: number;
    grandTotal: number;
    itemsCount: number;
}
export declare class CartDto {
    id: string | null;
    userId: string;
    createdAt: Date | null;
    updatedAt: Date | null;
    items: CartItemResponseDto[];
}
export declare class CartDataDto {
    cart: CartDto;
    summary: CartSummaryDto;
}
export declare class CartItemDataDto {
    cartItem: CartItemResponseDto;
}
export declare class EmptyCartDataDto {
}
export declare class CartApiResponseDto {
    success: boolean;
    message: string;
    data: CartDataDto;
}
export declare class CartItemApiResponseDto {
    success: boolean;
    message: string;
    data: CartItemDataDto;
}
export declare class CartSummaryApiResponseDto {
    success: boolean;
    message: string;
    data: CartSummaryDto;
}
export declare class CartDeleteApiResponseDto {
    success: boolean;
    message: string;
    data: EmptyCartDataDto;
}
