import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  BookFormatType,
  CartItemType,
  Currency,
  OrderItemType,
  PaymentStatus,
  Prisma,
} from '@prisma/client';
import { isPrismaUniqueConstraintError } from '../common/utils/prisma-errors';
import { PrismaService } from '../database/prisma.service';
import { AddCartItemDto } from './dto/add-cart-item.dto';
import { CartQueryDto } from './dto/cart-query.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';

const cartItemSelect = {
  id: true,
  cartId: true,
  itemType: true,
  itemId: true,
  quantity: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.CartItemSelect;

const cartHeaderSelect = {
  id: true,
  userId: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.CartSelect;

const cartSelect = {
  ...cartHeaderSelect,
  items: {
    select: cartItemSelect,
    orderBy: { createdAt: 'desc' as const },
  },
} satisfies Prisma.CartSelect;

const courseCartSelect = {
  id: true,
  titleAr: true,
  titleEn: true,
  thumbnailImage: true,
  priceEGP: true,
  priceUSD: true,
  discountPriceEGP: true,
  discountPriceUSD: true,
  isActive: true,
} satisfies Prisma.CourseSelect;

const bookCartSelect = {
  id: true,
  slug: true,
  titleAr: true,
  titleEn: true,
  coverImage: true,
  priceEgp: true,
  priceUsd: true,
  discountPriceEgp: true,
  discountPriceUsd: true,
  isActive: true,
} satisfies Prisma.BookSelect;

const bookFormatCartSelect = {
  id: true,
  bookId: true,
  formatType: true,
  sku: true,
  stock: true,
  priceEgp: true,
  priceUsd: true,
  discountPriceEgp: true,
  discountPriceUsd: true,
  isActive: true,
  book: {
    select: bookCartSelect,
  },
} satisfies Prisma.BookFormatSelect;

const productCartSelect = {
  id: true,
  slug: true,
  nameAr: true,
  nameEn: true,
  coverImage: true,
  priceEgp: true,
  priceUsd: true,
  discountPriceEgp: true,
  discountPriceUsd: true,
  stock: true,
  sku: true,
  isActive: true,
} satisfies Prisma.ProductSelect;

type CartHeaderRecord = Prisma.CartGetPayload<{
  select: typeof cartHeaderSelect;
}>;
type CartRecord = Prisma.CartGetPayload<{ select: typeof cartSelect }>;
type CartItemRecord = Prisma.CartItemGetPayload<{
  select: typeof cartItemSelect;
}>;
type CourseCartRecord = Prisma.CourseGetPayload<{
  select: typeof courseCartSelect;
}>;
type BookFormatCartRecord = Prisma.BookFormatGetPayload<{
  select: typeof bookFormatCartSelect;
}>;
type ProductCartRecord = Prisma.ProductGetPayload<{
  select: typeof productCartSelect;
}>;
type EmptyData = Record<string, never>;

type LoadedCartCatalogItem =
  | { itemType: 'COURSE'; item: CourseCartRecord }
  | { itemType: 'BOOK'; item: BookFormatCartRecord }
  | { itemType: 'PRODUCT'; item: ProductCartRecord };

type CartCatalogItem = {
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
};

type CartItemResponse = {
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
  item: CartCatalogItem | null;
};

type CartSummary = {
  currency: Currency;
  subtotal: number;
  discount: number;
  total: number;
  grandTotal: number;
  itemsCount: number;
};

type CartResponse = {
  id: string | null;
  userId: string;
  createdAt: Date | null;
  updatedAt: Date | null;
  items: CartItemResponse[];
};

@Injectable()
export class CartService {
  constructor(private readonly prisma: PrismaService) {}

  async addItem(
    userId: string,
    addCartItemDto: AddCartItemDto,
  ): Promise<{ message: string; data: { cartItem: CartItemResponse } }> {
    const cart = await this.getOrCreateCart(userId);

    await this.ensureCartItemDoesNotExist(
      cart.id,
      addCartItemDto.itemType,
      addCartItemDto.itemId,
    );

    const quantity = await this.validateTargetForAdd(
      userId,
      addCartItemDto.itemType,
      addCartItemDto.itemId,
      addCartItemDto.quantity,
    );

    try {
      const cartItem = await this.prisma.cartItem.create({
        data: {
          cartId: cart.id,
          itemType: addCartItemDto.itemType,
          itemId: addCartItemDto.itemId,
          quantity,
        },
        select: cartItemSelect,
      });
      const catalogItems = await this.loadCatalogItems([cartItem]);

      return {
        message: 'Cart item added successfully',
        data: {
          cartItem: this.toCartItem(cartItem, catalogItems, Currency.EGP),
        },
      };
    } catch (error) {
      this.handleDuplicateCartItemError(error);
    }
  }

  async getCart(
    userId: string,
    query: CartQueryDto,
  ): Promise<{
    message: string;
    data: { cart: CartResponse; summary: CartSummary };
  }> {
    const currency = this.resolveCurrency(query.currency);
    const data = await this.buildCart(userId, currency);

    return {
      message: 'Cart returned successfully',
      data,
    };
  }

  async updateQuantity(
    userId: string,
    cartItemId: string,
    updateCartItemDto: UpdateCartItemDto,
  ): Promise<{ message: string; data: { cartItem: CartItemResponse } }> {
    const cartItem = await this.findOwnedCartItemOrThrow(userId, cartItemId);

    await this.validateTargetForQuantityUpdate(
      cartItem.itemType,
      cartItem.itemId,
      updateCartItemDto.quantity,
    );

    const updatedCartItem = await this.prisma.cartItem.update({
      where: { id: cartItem.id },
      data: { quantity: updateCartItemDto.quantity },
      select: cartItemSelect,
    });
    const catalogItems = await this.loadCatalogItems([updatedCartItem]);

    return {
      message: 'Cart item quantity updated successfully',
      data: {
        cartItem: this.toCartItem(updatedCartItem, catalogItems, Currency.EGP),
      },
    };
  }

  async removeItem(
    userId: string,
    cartItemId: string,
  ): Promise<{ message: string; data: EmptyData }> {
    const cartItem = await this.findOwnedCartItemOrThrow(userId, cartItemId);

    await this.prisma.cartItem.delete({
      where: { id: cartItem.id },
    });

    return {
      message: 'Cart item removed successfully',
      data: {},
    };
  }

  async clearCart(
    userId: string,
  ): Promise<{ message: string; data: EmptyData }> {
    const cart = await this.prisma.cart.findUnique({
      where: { userId },
      select: { id: true },
    });

    if (cart) {
      await this.prisma.cartItem.deleteMany({
        where: { cartId: cart.id },
      });
    }

    return {
      message: 'Cart cleared successfully',
      data: {},
    };
  }

  async getSummary(
    userId: string,
    query: CartQueryDto,
  ): Promise<{ message: string; data: CartSummary }> {
    const currency = this.resolveCurrency(query.currency);
    const { summary } = await this.buildCart(userId, currency);

    return {
      message: 'Cart summary returned successfully',
      data: summary,
    };
  }

  private async getOrCreateCart(userId: string): Promise<CartHeaderRecord> {
    return this.prisma.cart.upsert({
      where: { userId },
      update: {},
      create: { userId },
      select: cartHeaderSelect,
    });
  }

  private async buildCart(
    userId: string,
    currency: Currency,
  ): Promise<{ cart: CartResponse; summary: CartSummary }> {
    const cart = await this.prisma.cart.findUnique({
      where: { userId },
      select: cartSelect,
    });

    if (!cart) {
      return {
        cart: {
          id: null,
          userId,
          createdAt: null,
          updatedAt: null,
          items: [],
        },
        summary: this.emptySummary(currency),
      };
    }

    return this.toCartResponse(cart, currency);
  }

  private async ensureCartItemDoesNotExist(
    cartId: string,
    itemType: CartItemType,
    itemId: string,
  ): Promise<void> {
    const existingCartItem = await this.prisma.cartItem.findUnique({
      where: {
        cartId_itemType_itemId: {
          cartId,
          itemType,
          itemId,
        },
      },
      select: { id: true },
    });

    if (existingCartItem) {
      throw new ConflictException('Item already exists in cart.');
    }
  }

  private async validateTargetForAdd(
    userId: string,
    itemType: CartItemType,
    itemId: string,
    requestedQuantity?: number,
  ): Promise<number> {
    switch (itemType) {
      case CartItemType.COURSE:
        return this.validateCourseForAdd(userId, itemId, requestedQuantity);
      case CartItemType.BOOK:
        return this.validateBookFormatForAdd(userId, itemId, requestedQuantity);
      case CartItemType.PRODUCT:
        return this.validateProductForAdd(itemId, requestedQuantity);
    }
  }

  private async validateCourseForAdd(
    userId: string,
    courseId: string,
    requestedQuantity?: number,
  ): Promise<number> {
    this.assertSingleQuantity(requestedQuantity, 'Course quantity must be 1.');

    const [course, userCourse] = await this.prisma.$transaction([
      this.prisma.course.findFirst({
        where: { id: courseId, isActive: true },
        select: { id: true },
      }),
      this.prisma.userCourse.findUnique({
        where: {
          userId_courseId: {
            userId,
            courseId,
          },
        },
        select: { id: true },
      }),
    ]);

    if (!course) {
      throw new NotFoundException('Course not found.');
    }

    if (userCourse) {
      throw new ConflictException('Course already purchased.');
    }

    return 1;
  }

  private async validateBookFormatForAdd(
    userId: string,
    bookFormatId: string,
    requestedQuantity?: number,
  ): Promise<number> {
    const bookFormat = await this.findActiveBookFormatOrThrow(bookFormatId);

    if (bookFormat.formatType !== BookFormatType.Physical) {
      this.assertSingleQuantity(
        requestedQuantity,
        'Digital and audio book quantity must be 1.',
      );

      const alreadyPurchased = await this.hasPurchasedBookFormat(
        userId,
        bookFormatId,
      );

      if (alreadyPurchased) {
        throw new ConflictException('Book format already purchased.');
      }

      return 1;
    }

    const quantity = requestedQuantity ?? 1;
    this.assertStockAvailable(bookFormat.stock, quantity, 'Book');

    return quantity;
  }

  private async validateProductForAdd(
    productId: string,
    requestedQuantity?: number,
  ): Promise<number> {
    const quantity = requestedQuantity ?? 1;
    const product = await this.prisma.product.findFirst({
      where: { id: productId, isActive: true },
      select: { id: true, stock: true },
    });

    if (!product) {
      throw new NotFoundException('Product not found.');
    }

    this.assertStockAvailable(product.stock, quantity, 'Product');

    return quantity;
  }

  private async validateTargetForQuantityUpdate(
    itemType: CartItemType,
    itemId: string,
    quantity: number,
  ): Promise<void> {
    switch (itemType) {
      case CartItemType.COURSE:
        throw new BadRequestException('Course quantity cannot be updated.');
      case CartItemType.BOOK: {
        const bookFormat = await this.findActiveBookFormatOrThrow(itemId);

        if (bookFormat.formatType !== BookFormatType.Physical) {
          throw new BadRequestException(
            'Only physical book quantity can be updated.',
          );
        }

        this.assertStockAvailable(bookFormat.stock, quantity, 'Book');
        return;
      }
      case CartItemType.PRODUCT: {
        const product = await this.prisma.product.findFirst({
          where: { id: itemId, isActive: true },
          select: { id: true, stock: true },
        });

        if (!product) {
          throw new NotFoundException('Product not found.');
        }

        this.assertStockAvailable(product.stock, quantity, 'Product');
        return;
      }
    }
  }

  private async findOwnedCartItemOrThrow(
    userId: string,
    cartItemId: string,
  ): Promise<CartItemRecord> {
    const cartItem = await this.prisma.cartItem.findFirst({
      where: {
        id: cartItemId,
        cart: { userId },
      },
      select: cartItemSelect,
    });

    if (!cartItem) {
      throw new NotFoundException('Cart item not found.');
    }

    return cartItem;
  }

  private async findActiveBookFormatOrThrow(bookFormatId: string): Promise<{
    id: string;
    formatType: BookFormatType;
    stock: number | null;
  }> {
    const bookFormat = await this.prisma.bookFormat.findFirst({
      where: {
        id: bookFormatId,
        isActive: true,
        book: { isActive: true },
      },
      select: {
        id: true,
        formatType: true,
        stock: true,
      },
    });

    if (!bookFormat) {
      throw new NotFoundException('Book format not found.');
    }

    return bookFormat;
  }

  private async hasPurchasedBookFormat(
    userId: string,
    bookFormatId: string,
  ): Promise<boolean> {
    const [userBook, purchasedOrderItem] = await this.prisma.$transaction([
      this.prisma.userBook.findUnique({
        where: {
          userId_bookFormatId: {
            userId,
            bookFormatId,
          },
        },
        select: { id: true },
      }),
      this.prisma.orderItem.findFirst({
        where: {
          itemType: OrderItemType.BOOK,
          itemId: bookFormatId,
          order: {
            userId,
            paymentStatus: PaymentStatus.PAID,
          },
        },
        select: { id: true },
      }),
    ]);

    return userBook !== null || purchasedOrderItem !== null;
  }

  private async toCartResponse(
    cart: CartRecord,
    currency: Currency,
  ): Promise<{ cart: CartResponse; summary: CartSummary }> {
    const catalogItems = await this.loadCatalogItems(cart.items);
    const items = cart.items.map((cartItem) =>
      this.toCartItem(cartItem, catalogItems, currency),
    );

    return {
      cart: {
        id: cart.id,
        userId: cart.userId,
        createdAt: cart.createdAt,
        updatedAt: cart.updatedAt,
        items,
      },
      summary: this.calculateSummary(items, currency),
    };
  }

  private async loadCatalogItems(
    cartItems: CartItemRecord[],
  ): Promise<Map<string, LoadedCartCatalogItem>> {
    const courseIds = this.uniqueItemIds(cartItems, CartItemType.COURSE);
    const bookFormatIds = this.uniqueItemIds(cartItems, CartItemType.BOOK);
    const productIds = this.uniqueItemIds(cartItems, CartItemType.PRODUCT);
    const [courses, bookFormats, products] = await Promise.all([
      this.findCartCourses(courseIds),
      this.findCartBookFormats(bookFormatIds),
      this.findCartProducts(productIds),
    ]);
    const catalogItems = new Map<string, LoadedCartCatalogItem>();

    for (const course of courses) {
      catalogItems.set(this.mapKey(CartItemType.COURSE, course.id), {
        itemType: CartItemType.COURSE,
        item: course,
      });
    }

    for (const bookFormat of bookFormats) {
      catalogItems.set(this.mapKey(CartItemType.BOOK, bookFormat.id), {
        itemType: CartItemType.BOOK,
        item: bookFormat,
      });
    }

    for (const product of products) {
      catalogItems.set(this.mapKey(CartItemType.PRODUCT, product.id), {
        itemType: CartItemType.PRODUCT,
        item: product,
      });
    }

    return catalogItems;
  }

  private async findCartCourses(ids: string[]): Promise<CourseCartRecord[]> {
    if (ids.length === 0) {
      return [];
    }

    return this.prisma.course.findMany({
      where: { id: { in: ids } },
      select: courseCartSelect,
    });
  }

  private async findCartBookFormats(
    ids: string[],
  ): Promise<BookFormatCartRecord[]> {
    if (ids.length === 0) {
      return [];
    }

    return this.prisma.bookFormat.findMany({
      where: { id: { in: ids } },
      select: bookFormatCartSelect,
    });
  }

  private async findCartProducts(ids: string[]): Promise<ProductCartRecord[]> {
    if (ids.length === 0) {
      return [];
    }

    return this.prisma.product.findMany({
      where: { id: { in: ids } },
      select: productCartSelect,
    });
  }

  private uniqueItemIds(
    cartItems: CartItemRecord[],
    itemType: CartItemType,
  ): string[] {
    return [
      ...new Set(
        cartItems
          .filter((cartItem) => cartItem.itemType === itemType)
          .map((cartItem) => cartItem.itemId),
      ),
    ];
  }

  private toCartItem(
    cartItem: CartItemRecord,
    catalogItems: Map<string, LoadedCartCatalogItem>,
    currency: Currency,
  ): CartItemResponse {
    const loadedCatalogItem = catalogItems.get(
      this.mapKey(cartItem.itemType, cartItem.itemId),
    );
    const item = loadedCatalogItem
      ? this.toCatalogItem(loadedCatalogItem)
      : null;
    const pricing = this.calculateLinePricing(
      item,
      cartItem.quantity,
      currency,
    );

    return {
      id: cartItem.id,
      cartId: cartItem.cartId,
      itemType: cartItem.itemType,
      itemId: cartItem.itemId,
      quantity: cartItem.quantity,
      currency,
      ...pricing,
      createdAt: cartItem.createdAt,
      updatedAt: cartItem.updatedAt,
      item,
    };
  }

  private toCatalogItem(
    loadedCatalogItem: LoadedCartCatalogItem,
  ): CartCatalogItem {
    switch (loadedCatalogItem.itemType) {
      case CartItemType.COURSE:
        return this.toCourseCatalogItem(loadedCatalogItem.item);
      case CartItemType.BOOK:
        return this.toBookFormatCatalogItem(loadedCatalogItem.item);
      case CartItemType.PRODUCT:
        return this.toProductCatalogItem(loadedCatalogItem.item);
    }

    return this.assertNever(loadedCatalogItem);
  }

  private toCourseCatalogItem(course: CourseCartRecord): CartCatalogItem {
    return {
      id: course.id,
      itemType: CartItemType.COURSE,
      nameAr: course.titleAr,
      nameEn: course.titleEn,
      image: course.thumbnailImage,
      priceEGP: this.toNumberFromDecimal(course.priceEGP),
      discountPriceEGP: this.toOptionalNumberOrNull(course.discountPriceEGP),
      priceUSD: this.toNumberFromDecimal(course.priceUSD),
      discountPriceUSD: this.toOptionalNumberOrNull(course.discountPriceUSD),
      isActive: course.isActive,
    };
  }

  private toBookFormatCatalogItem(
    bookFormat: BookFormatCartRecord,
  ): CartCatalogItem {
    return {
      id: bookFormat.id,
      itemType: CartItemType.BOOK,
      bookId: bookFormat.bookId,
      slug: bookFormat.book.slug,
      sku: bookFormat.sku,
      formatType: bookFormat.formatType,
      nameAr: bookFormat.book.titleAr,
      nameEn: bookFormat.book.titleEn,
      image: bookFormat.book.coverImage,
      priceEGP: this.toNumberFromDecimal(
        bookFormat.priceEgp ?? bookFormat.book.priceEgp,
      ),
      discountPriceEGP: this.toOptionalNumberOrNull(
        bookFormat.discountPriceEgp ?? bookFormat.book.discountPriceEgp,
      ),
      priceUSD: this.toNumberFromDecimal(
        bookFormat.priceUsd ?? bookFormat.book.priceUsd,
      ),
      discountPriceUSD: this.toOptionalNumberOrNull(
        bookFormat.discountPriceUsd ?? bookFormat.book.discountPriceUsd,
      ),
      stock: bookFormat.stock,
      isActive: bookFormat.isActive && bookFormat.book.isActive,
    };
  }

  private toProductCatalogItem(product: ProductCartRecord): CartCatalogItem {
    return {
      id: product.id,
      itemType: CartItemType.PRODUCT,
      slug: product.slug,
      sku: product.sku,
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

  private calculateLinePricing(
    item: CartCatalogItem | null,
    quantity: number,
    currency: Currency,
  ) {
    if (!item) {
      return {
        unitPrice: 0,
        discountUnitPrice: null,
        lineSubtotal: 0,
        lineDiscount: 0,
        lineTotal: 0,
      };
    }

    const unitPrice = currency === Currency.USD ? item.priceUSD : item.priceEGP;
    const discountUnitPrice =
      currency === Currency.USD ? item.discountPriceUSD : item.discountPriceEGP;
    const effectiveUnitPrice = discountUnitPrice ?? unitPrice;
    const lineSubtotal = this.roundMoney(unitPrice * quantity);
    const lineTotal = this.roundMoney(effectiveUnitPrice * quantity);

    return {
      unitPrice,
      discountUnitPrice,
      lineSubtotal,
      lineDiscount: this.roundMoney(lineSubtotal - lineTotal),
      lineTotal,
    };
  }

  private calculateSummary(
    items: CartItemResponse[],
    currency: Currency,
  ): CartSummary {
    const subtotal = this.roundMoney(
      items.reduce((total, item) => total + item.lineSubtotal, 0),
    );
    const discount = this.roundMoney(
      items.reduce((total, item) => total + item.lineDiscount, 0),
    );
    const total = this.roundMoney(
      items.reduce((currentTotal, item) => currentTotal + item.lineTotal, 0),
    );

    return {
      currency,
      subtotal,
      discount,
      total,
      grandTotal: total,
      itemsCount: items.reduce((count, item) => count + item.quantity, 0),
    };
  }

  private emptySummary(currency: Currency): CartSummary {
    return {
      currency,
      subtotal: 0,
      discount: 0,
      total: 0,
      grandTotal: 0,
      itemsCount: 0,
    };
  }

  private assertSingleQuantity(
    requestedQuantity: number | undefined,
    message: string,
  ): void {
    if (requestedQuantity !== undefined && requestedQuantity !== 1) {
      throw new BadRequestException(message);
    }
  }

  private assertStockAvailable(
    stock: number | null,
    quantity: number,
    label: 'Book' | 'Product',
  ): void {
    if (stock === null) {
      throw new BadRequestException(`${label} stock is unavailable.`);
    }

    if (stock < quantity) {
      throw new ConflictException(`${label} stock is insufficient.`);
    }
  }

  private resolveCurrency(currency?: Currency): Currency {
    return currency ?? Currency.EGP;
  }

  private mapKey(itemType: CartItemType, itemId: string): string {
    return `${itemType}:${itemId}`;
  }

  private roundMoney(value: number): number {
    return Number(value.toFixed(2));
  }

  private toNumberFromDecimal(decimal: Prisma.Decimal): number {
    return Number(decimal.toString());
  }

  private toOptionalNumberOrNull(
    decimal: Prisma.Decimal | null,
  ): number | null {
    return decimal === null ? null : this.toNumberFromDecimal(decimal);
  }

  private assertNever(value: never): never {
    void value;
    throw new BadRequestException('Unsupported cart catalog item.');
  }

  private handleDuplicateCartItemError(error: unknown): never {
    if (isPrismaUniqueConstraintError(error)) {
      throw new ConflictException('Item already exists in cart.');
    }

    throw error;
  }
}
