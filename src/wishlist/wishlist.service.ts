import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, WishlistItemType } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { CheckWishlistItemDto } from './dto/check-wishlist-item.dto';
import { CreateWishlistItemDto } from './dto/create-wishlist-item.dto';
import { WishlistQueryDto } from './dto/wishlist-query.dto';

const wishlistSelect = {
  id: true,
  userId: true,
  itemType: true,
  itemId: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.WishlistSelect;

const courseSummarySelect = {
  id: true,
  slug: true,
  titleAr: true,
  titleEn: true,
  image: true,
  priceEgp: true,
  discountPriceEgp: true,
  priceUsd: true,
  discountPriceUsd: true,
  isActive: true,
  isDisplayed: true,
} satisfies Prisma.CourseSelect;

const bookSummarySelect = {
  id: true,
  slug: true,
  titleAr: true,
  titleEn: true,
  coverImage: true,
  priceEgp: true,
  discountPriceEgp: true,
  priceUsd: true,
  discountPriceUsd: true,
  isActive: true,
} satisfies Prisma.BookSelect;

const productSummarySelect = {
  id: true,
  slug: true,
  nameAr: true,
  nameEn: true,
  coverImage: true,
  priceEgp: true,
  discountPriceEgp: true,
  priceUsd: true,
  discountPriceUsd: true,
  stock: true,
  isActive: true,
} satisfies Prisma.ProductSelect;

type WishlistRecord = Prisma.WishlistGetPayload<{
  select: typeof wishlistSelect;
}>;
type CourseSummaryRecord = Prisma.CourseGetPayload<{
  select: typeof courseSummarySelect;
}>;
type BookSummaryRecord = Prisma.BookGetPayload<{
  select: typeof bookSummarySelect;
}>;
type ProductSummaryRecord = Prisma.ProductGetPayload<{
  select: typeof productSummarySelect;
}>;

type WishlistCatalogItem = {
  id: string;
  itemType: WishlistItemType;
  slug: string;
  nameAr: string;
  nameEn: string;
  image: string;
  priceEGP: number;
  discountPriceEGP: number | null;
  priceUSD: number;
  discountPriceUSD: number | null;
  isActive: boolean;
  isDisplayed?: boolean;
  stock?: number;
};

type WishlistItemResponse = {
  id: string;
  userId: string;
  itemType: WishlistItemType;
  itemId: string;
  createdAt: Date;
  updatedAt: Date;
  item: WishlistCatalogItem | null;
};

@Injectable()
export class WishlistService {
  constructor(private readonly prisma: PrismaService) {}

  async add(
    userId: string,
    createWishlistItemDto: CreateWishlistItemDto,
  ): Promise<{
    message: string;
    data: { wishlistItem: WishlistItemResponse };
  }> {
    await this.ensureWishlistTargetExists(
      createWishlistItemDto.itemType,
      createWishlistItemDto.itemId,
    );

    try {
      const wishlist = await this.prisma.wishlist.create({
        data: {
          userId,
          itemType: createWishlistItemDto.itemType,
          itemId: createWishlistItemDto.itemId,
        },
        select: wishlistSelect,
      });
      const catalogItems = await this.loadCatalogItems([wishlist]);

      return {
        message: 'Wishlist item added successfully',
        data: {
          wishlistItem: this.toWishlistItem(wishlist, catalogItems),
        },
      };
    } catch (error) {
      this.handleDuplicateWishlistError(error);
    }
  }

  async findMyWishlist(
    userId: string,
    query: WishlistQueryDto,
  ): Promise<{
    message: string;
    data: {
      items: WishlistItemResponse[];
      pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
      };
    };
  }> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;
    const where: Prisma.WishlistWhereInput = {
      userId,
      ...(query.itemType ? { itemType: query.itemType } : {}),
    };

    const [total, wishlists] = await this.prisma.$transaction([
      this.prisma.wishlist.count({ where }),
      this.prisma.wishlist.findMany({
        where,
        select: wishlistSelect,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
    ]);
    const catalogItems = await this.loadCatalogItems(wishlists);

    return {
      message: 'Wishlist returned successfully',
      data: {
        items: wishlists.map((wishlist) =>
          this.toWishlistItem(wishlist, catalogItems),
        ),
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    };
  }

  async remove(
    userId: string,
    wishlistId: string,
  ): Promise<{ message: string; data: Record<string, never> }> {
    const wishlist = await this.prisma.wishlist.findFirst({
      where: {
        id: wishlistId,
        userId,
      },
      select: { id: true },
    });

    if (!wishlist) {
      throw new NotFoundException('Wishlist item not found.');
    }

    await this.prisma.wishlist.delete({
      where: { id: wishlist.id },
    });

    return {
      message: 'Wishlist item removed successfully',
      data: {},
    };
  }

  async check(
    userId: string,
    checkWishlistItemDto: CheckWishlistItemDto,
  ): Promise<{ message: string; data: { exists: boolean } }> {
    const exists = await this.prisma.wishlist.findFirst({
      where: {
        userId,
        itemType: checkWishlistItemDto.itemType,
        itemId: checkWishlistItemDto.itemId,
      },
      select: { id: true },
    });

    return {
      message: 'Wishlist check returned successfully',
      data: {
        exists: exists !== null,
      },
    };
  }

  private async ensureWishlistTargetExists(
    itemType: WishlistItemType,
    itemId: string,
  ): Promise<void> {
    let exists: { id: string } | null;

    switch (itemType) {
      case WishlistItemType.COURSE:
        exists = await this.prisma.course.findFirst({
          where: {
            id: itemId,
            isActive: true,
            isDisplayed: true,
          },
          select: { id: true },
        });
        break;
      case WishlistItemType.BOOK:
        exists = await this.prisma.book.findFirst({
          where: {
            id: itemId,
            isActive: true,
          },
          select: { id: true },
        });
        break;
      case WishlistItemType.PRODUCT:
        exists = await this.prisma.product.findFirst({
          where: {
            id: itemId,
            isActive: true,
          },
          select: { id: true },
        });
        break;
    }

    if (!exists) {
      throw new NotFoundException(
        `${this.getItemTypeLabel(itemType)} not found.`,
      );
    }
  }

  private async loadCatalogItems(
    wishlists: WishlistRecord[],
  ): Promise<Map<string, WishlistCatalogItem>> {
    const idsByType: Record<WishlistItemType, Set<string>> = {
      [WishlistItemType.COURSE]: new Set<string>(),
      [WishlistItemType.BOOK]: new Set<string>(),
      [WishlistItemType.PRODUCT]: new Set<string>(),
    };

    for (const wishlist of wishlists) {
      idsByType[wishlist.itemType].add(wishlist.itemId);
    }

    const [courses, books, products] = await Promise.all([
      this.prisma.course.findMany({
        where: {
          id: { in: Array.from(idsByType[WishlistItemType.COURSE]) },
        },
        select: courseSummarySelect,
      }),
      this.prisma.book.findMany({
        where: {
          id: { in: Array.from(idsByType[WishlistItemType.BOOK]) },
        },
        select: bookSummarySelect,
      }),
      this.prisma.product.findMany({
        where: {
          id: { in: Array.from(idsByType[WishlistItemType.PRODUCT]) },
        },
        select: productSummarySelect,
      }),
    ]);

    const catalogItems = new Map<string, WishlistCatalogItem>();

    for (const course of courses) {
      catalogItems.set(
        this.catalogItemKey(WishlistItemType.COURSE, course.id),
        this.toCourseCatalogItem(course),
      );
    }

    for (const book of books) {
      catalogItems.set(
        this.catalogItemKey(WishlistItemType.BOOK, book.id),
        this.toBookCatalogItem(book),
      );
    }

    for (const product of products) {
      catalogItems.set(
        this.catalogItemKey(WishlistItemType.PRODUCT, product.id),
        this.toProductCatalogItem(product),
      );
    }

    return catalogItems;
  }

  private toWishlistItem(
    wishlist: WishlistRecord,
    catalogItems: Map<string, WishlistCatalogItem>,
  ): WishlistItemResponse {
    return {
      id: wishlist.id,
      userId: wishlist.userId,
      itemType: wishlist.itemType,
      itemId: wishlist.itemId,
      createdAt: wishlist.createdAt,
      updatedAt: wishlist.updatedAt,
      item:
        catalogItems.get(
          this.catalogItemKey(wishlist.itemType, wishlist.itemId),
        ) ?? null,
    };
  }

  private toCourseCatalogItem(
    course: CourseSummaryRecord,
  ): WishlistCatalogItem {
    return {
      id: course.id,
      itemType: WishlistItemType.COURSE,
      slug: course.slug,
      nameAr: course.titleAr,
      nameEn: course.titleEn,
      image: course.image,
      priceEGP: this.toNumberFromDecimal(course.priceEgp),
      discountPriceEGP: this.toOptionalNumberOrNull(course.discountPriceEgp),
      priceUSD: this.toNumberFromDecimal(course.priceUsd),
      discountPriceUSD: this.toOptionalNumberOrNull(course.discountPriceUsd),
      isActive: course.isActive,
      isDisplayed: course.isDisplayed,
    };
  }

  private toBookCatalogItem(book: BookSummaryRecord): WishlistCatalogItem {
    return {
      id: book.id,
      itemType: WishlistItemType.BOOK,
      slug: book.slug,
      nameAr: book.titleAr,
      nameEn: book.titleEn,
      image: book.coverImage,
      priceEGP: this.toNumberFromDecimal(book.priceEgp),
      discountPriceEGP: this.toOptionalNumberOrNull(book.discountPriceEgp),
      priceUSD: this.toNumberFromDecimal(book.priceUsd),
      discountPriceUSD: this.toOptionalNumberOrNull(book.discountPriceUsd),
      isActive: book.isActive,
    };
  }

  private toProductCatalogItem(
    product: ProductSummaryRecord,
  ): WishlistCatalogItem {
    return {
      id: product.id,
      itemType: WishlistItemType.PRODUCT,
      slug: product.slug,
      nameAr: product.nameAr,
      nameEn: product.nameEn,
      image: product.coverImage,
      priceEGP: this.toNumberFromDecimal(product.priceEgp),
      discountPriceEGP: this.toOptionalNumberOrNull(product.discountPriceEgp),
      priceUSD: this.toNumberFromDecimal(product.priceUsd),
      discountPriceUSD: this.toOptionalNumberOrNull(product.discountPriceUsd),
      stock: product.stock,
      isActive: product.isActive,
    };
  }

  private catalogItemKey(itemType: WishlistItemType, itemId: string): string {
    return `${itemType}:${itemId}`;
  }

  private getItemTypeLabel(itemType: WishlistItemType): string {
    switch (itemType) {
      case WishlistItemType.COURSE:
        return 'Course';
      case WishlistItemType.BOOK:
        return 'Book';
      case WishlistItemType.PRODUCT:
        return 'Product';
    }
  }

  private toNumberFromDecimal(decimal: Prisma.Decimal): number {
    return Number(decimal.toString());
  }

  private toOptionalNumberOrNull(
    decimal: Prisma.Decimal | null,
  ): number | null {
    return decimal === null ? null : this.toNumberFromDecimal(decimal);
  }

  private handleDuplicateWishlistError(error: unknown): never {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new ConflictException('Item already exists in wishlist.');
    }

    throw error;
  }
}
