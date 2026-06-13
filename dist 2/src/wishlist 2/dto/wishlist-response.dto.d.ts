import { WishlistItemType } from '@prisma/client';
export declare class WishlistCatalogItemDto {
    id: string;
    itemType: WishlistItemType;
    slug?: string;
    nameAr: string;
    nameEn: string;
    image: string | null;
    priceEGP: number;
    discountPriceEGP: number | null;
    priceUSD: number;
    discountPriceUSD: number | null;
    isActive: boolean;
    isDisplayed?: boolean;
    stock?: number;
}
export declare class WishlistItemResponseDto {
    id: string;
    userId: string;
    itemType: WishlistItemType;
    itemId: string;
    createdAt: Date;
    item: WishlistCatalogItemDto | null;
}
export declare class PaginationDto {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
}
export declare class WishlistItemDataDto {
    wishlistItem: WishlistItemResponseDto;
}
export declare class WishlistListDataDto {
    items: WishlistItemResponseDto[];
    pagination: PaginationDto;
}
export declare class WishlistCheckDataDto {
    exists: boolean;
}
export declare class EmptyWishlistDataDto {
}
export declare class WishlistItemApiResponseDto {
    success: boolean;
    message: string;
    data: WishlistItemDataDto;
}
export declare class WishlistListApiResponseDto {
    success: boolean;
    message: string;
    data: WishlistListDataDto;
}
export declare class WishlistCheckApiResponseDto {
    success: boolean;
    message: string;
    data: WishlistCheckDataDto;
}
export declare class WishlistDeleteApiResponseDto {
    success: boolean;
    message: string;
    data: EmptyWishlistDataDto;
}
