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
  OrderStatus,
  PaymentStatus,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { AdminOrderQueryDto } from './dto/admin-order-query.dto';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrderQueryDto } from './dto/order-query.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';

const cartItemSelect = {
  id: true,
  cartId: true,
  itemType: true,
  itemId: true,
  quantity: true,
} satisfies Prisma.CartItemSelect;

const cartSelect = {
  id: true,
  userId: true,
  items: {
    select: cartItemSelect,
    orderBy: { createdAt: 'asc' as const },
  },
} satisfies Prisma.CartSelect;

const courseOrderSelect = {
  id: true,
  titleAr: true,
  titleEn: true,
  priceEGP: true,
  priceUSD: true,
  discountPriceEGP: true,
  discountPriceUSD: true,
  isActive: true,
} satisfies Prisma.CourseSelect;

const bookOrderSelect = {
  id: true,
  titleAr: true,
  titleEn: true,
  priceEgp: true,
  priceUsd: true,
  discountPriceEgp: true,
  discountPriceUsd: true,
  isActive: true,
} satisfies Prisma.BookSelect;

const bookFormatOrderSelect = {
  id: true,
  formatType: true,
  stock: true,
  priceEgp: true,
  priceUsd: true,
  discountPriceEgp: true,
  discountPriceUsd: true,
  isActive: true,
  book: {
    select: bookOrderSelect,
  },
} satisfies Prisma.BookFormatSelect;

const productOrderSelect = {
  id: true,
  nameAr: true,
  nameEn: true,
  priceEgp: true,
  priceUsd: true,
  discountPriceEgp: true,
  discountPriceUsd: true,
  stock: true,
  isActive: true,
} satisfies Prisma.ProductSelect;

const orderItemSelect = {
  id: true,
  orderId: true,
  itemType: true,
  itemId: true,
  titleAr: true,
  titleEn: true,
  quantity: true,
  unitPrice: true,
  discountPrice: true,
  totalPrice: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.OrderItemSelect;

const orderUserSelect = {
  id: true,
  fullName: true,
  email: true,
  phoneNumber: true,
} satisfies Prisma.UserSelect;

const orderShippingAddressSelect = {
  id: true,
  fullName: true,
  phoneNumber: true,
  governorateId: true,
  city: true,
  street: true,
  buildingNumber: true,
  floor: true,
  apartment: true,
  landmark: true,
  notes: true,
  governorate: {
    select: {
      id: true,
      nameAr: true,
      nameEn: true,
      shippingCost: true,
      isActive: true,
    },
  },
} satisfies Prisma.UserAddressSelect;

const ownedShippingAddressSelect = {
  ...orderShippingAddressSelect,
} satisfies Prisma.UserAddressSelect;

const orderSelect = {
  id: true,
  userId: true,
  orderNumber: true,
  status: true,
  paymentStatus: true,
  currency: true,
  subtotal: true,
  discountAmount: true,
  shippingCost: true,
  totalAmount: true,
  couponId: true,
  shippingAddressId: true,
  hasPhysicalItems: true,
  notes: true,
  paidAt: true,
  createdAt: true,
  updatedAt: true,
  user: {
    select: orderUserSelect,
  },
  shippingAddress: {
    select: orderShippingAddressSelect,
  },
  items: {
    select: orderItemSelect,
    orderBy: { createdAt: 'asc' as const },
  },
} satisfies Prisma.OrderSelect;

type CartRecord = Prisma.CartGetPayload<{ select: typeof cartSelect }>;
type CartItemRecord = Prisma.CartItemGetPayload<{
  select: typeof cartItemSelect;
}>;
type CourseOrderRecord = Prisma.CourseGetPayload<{
  select: typeof courseOrderSelect;
}>;
type BookFormatOrderRecord = Prisma.BookFormatGetPayload<{
  select: typeof bookFormatOrderSelect;
}>;
type ProductOrderRecord = Prisma.ProductGetPayload<{
  select: typeof productOrderSelect;
}>;
type OrderRecord = Prisma.OrderGetPayload<{ select: typeof orderSelect }>;
type OrderItemRecord = Prisma.OrderItemGetPayload<{
  select: typeof orderItemSelect;
}>;
type OwnedShippingAddressRecord = Prisma.UserAddressGetPayload<{
  select: typeof ownedShippingAddressSelect;
}>;

type LoadedOrderCatalogItem =
  | { itemType: 'COURSE'; item: CourseOrderRecord }
  | { itemType: 'BOOK'; item: BookFormatOrderRecord }
  | { itemType: 'PRODUCT'; item: ProductOrderRecord };

type PreparedOrderItem = {
  itemType: OrderItemType;
  itemId: string;
  titleAr: string;
  titleEn: string;
  quantity: number;
  unitPrice: number;
  discountPrice: number | null;
  totalPrice: number;
  lineSubtotal: number;
  lineDiscount: number;
  hasPhysicalItem: boolean;
};

type OrderItemResponse = {
  id: string;
  orderId: string;
  itemType: OrderItemType;
  itemId: string;
  titleAr: string;
  titleEn: string;
  quantity: number;
  unitPrice: number;
  discountPrice: number | null;
  totalPrice: number;
  createdAt: Date;
  updatedAt: Date;
};

type OrderResponse = {
  id: string;
  userId: string;
  orderNumber: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  currency: string;
  subtotal: number;
  discountAmount: number;
  shippingCost: number;
  totalAmount: number;
  hasPhysicalItems: boolean;
  notes: string | null;
  paidAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  user?: {
    id: string;
    fullName: string;
    email: string;
    phoneNumber: string;
  };
  shippingAddress: {
    id: string;
    fullName: string;
    phoneNumber: string;
    governorateId: string | null;
    city: string;
    street: string | null;
    buildingNumber: string | null;
    floor: string | null;
    apartment: string | null;
    landmark: string | null;
    notes: string | null;
    governorate: {
      id: string;
      nameAr: string;
      nameEn: string;
      shippingCost: number;
      isActive: boolean;
    } | null;
  } | null;
  items: OrderItemResponse[];
};

@Injectable()
export class OrdersService {
  constructor(private readonly prisma: PrismaService) {}

  async createFromCart(
    userId: string,
    createOrderDto: CreateOrderDto,
  ): Promise<{ message: string; data: { order: OrderResponse } }> {
    const cart = await this.findCartOrThrow(userId);
    const [shippingAddress] = await Promise.all([
      this.findOwnedShippingAddress(userId, createOrderDto.shippingAddressId),
      this.ensureCouponIsUsable(createOrderDto.couponId),
    ]);
    const currency = this.detectCurrency();
    const preparedItems = await this.prepareOrderItems(
      userId,
      cart.items,
      currency,
    );
    const hasPhysicalItems = preparedItems.some((item) => item.hasPhysicalItem);

    if (hasPhysicalItems && !shippingAddress) {
      throw new BadRequestException(
        'shippingAddressId is required when cart contains products or physical books.',
      );
    }

    const shippingCost = hasPhysicalItems
      ? this.getShippingCostOrThrow(shippingAddress)
      : 0;
    const totals = this.calculateTotals(preparedItems, shippingCost);
    const order = await this.prisma.$transaction(async (tx) => {
      const orderNumber = await this.generateOrderNumber(tx);

      const createdOrder = await tx.order.create({
        data: {
          userId,
          orderNumber,
          status: OrderStatus.PENDING,
          paymentStatus: PaymentStatus.PENDING,
          currency,
          subtotal: totals.subtotal,
          discountAmount: totals.discountAmount,
          shippingCost: totals.shippingCost,
          totalAmount: totals.totalAmount,
          couponId: createOrderDto.couponId,
          shippingAddressId: shippingAddress?.id,
          hasPhysicalItems,
          notes: createOrderDto.notes,
          items: {
            create: preparedItems.map((item) => ({
              itemType: item.itemType,
              itemId: item.itemId,
              titleAr: item.titleAr,
              titleEn: item.titleEn,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              discountPrice: item.discountPrice,
              totalPrice: item.totalPrice,
            })),
          },
        },
        select: orderSelect,
      });

      await tx.cartItem.deleteMany({
        where: { cartId: cart.id },
      });

      return createdOrder;
    });

    return {
      message: 'Order created successfully',
      data: {
        order: this.toOrder(order),
      },
    };
  }

  async findMyOrders(userId: string, query: OrderQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;
    const where: Prisma.OrderWhereInput = { userId };

    const [total, orders] = await this.prisma.$transaction([
      this.prisma.order.count({ where }),
      this.prisma.order.findMany({
        where,
        select: orderSelect,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
    ]);

    return {
      message: 'Orders returned successfully',
      data: {
        items: orders.map((order) => this.toOrder(order)),
        pagination: this.toPagination(page, limit, total),
      },
    };
  }

  async findMyOrder(
    userId: string,
    orderId: string,
  ): Promise<{ message: string; data: { order: OrderResponse } }> {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, userId },
      select: orderSelect,
    });

    if (!order) {
      throw new NotFoundException('Order not found.');
    }

    return {
      message: 'Order returned successfully',
      data: {
        order: this.toOrder(order),
      },
    };
  }

  async cancelMyOrder(
    userId: string,
    orderId: string,
  ): Promise<{ message: string; data: { order: OrderResponse } }> {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, userId },
      select: {
        id: true,
        status: true,
        paymentStatus: true,
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found.');
    }

    if (order.status !== OrderStatus.PENDING) {
      throw new ConflictException('Only pending orders can be cancelled.');
    }

    if (order.paymentStatus === PaymentStatus.PAID) {
      throw new ConflictException('Paid orders cannot be cancelled.');
    }

    const updatedOrder = await this.prisma.order.update({
      where: { id: order.id },
      data: { status: OrderStatus.CANCELLED },
      select: orderSelect,
    });

    return {
      message: 'Order cancelled successfully',
      data: {
        order: this.toOrder(updatedOrder),
      },
    };
  }

  async adminFindOrders(query: AdminOrderQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;
    const where: Prisma.OrderWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.paymentStatus ? { paymentStatus: query.paymentStatus } : {}),
      ...(query.userId ? { userId: query.userId } : {}),
    };

    const [total, orders] = await this.prisma.$transaction([
      this.prisma.order.count({ where }),
      this.prisma.order.findMany({
        where,
        select: orderSelect,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
    ]);

    return {
      message: 'Orders returned successfully',
      data: {
        items: orders.map((order) => this.toOrder(order, true)),
        pagination: this.toPagination(page, limit, total),
      },
    };
  }

  async adminFindOrder(
    orderId: string,
  ): Promise<{ message: string; data: { order: OrderResponse } }> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      select: orderSelect,
    });

    if (!order) {
      throw new NotFoundException('Order not found.');
    }

    return {
      message: 'Order returned successfully',
      data: {
        order: this.toOrder(order, true),
      },
    };
  }

  async adminUpdateStatus(
    orderId: string,
    updateOrderStatusDto: UpdateOrderStatusDto,
  ): Promise<{ message: string; data: { order: OrderResponse } }> {
    if (
      updateOrderStatusDto.status === undefined &&
      updateOrderStatusDto.paymentStatus === undefined
    ) {
      throw new BadRequestException(
        'Provide status or paymentStatus to update the order.',
      );
    }

    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        paidAt: true,
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found.');
    }

    const nextPaymentStatus =
      updateOrderStatusDto.paymentStatus ??
      (updateOrderStatusDto.status === OrderStatus.PAID
        ? PaymentStatus.PAID
        : undefined);
    const shouldSetPaidAt =
      order.paidAt === null &&
      (updateOrderStatusDto.status === OrderStatus.PAID ||
        nextPaymentStatus === PaymentStatus.PAID);

    const updatedOrder = await this.prisma.order.update({
      where: { id: order.id },
      data: {
        status: updateOrderStatusDto.status,
        paymentStatus: nextPaymentStatus,
        paidAt: shouldSetPaidAt ? new Date() : undefined,
      },
      select: orderSelect,
    });

    return {
      message: 'Order status updated successfully',
      data: {
        order: this.toOrder(updatedOrder, true),
      },
    };
  }

  private async findCartOrThrow(userId: string): Promise<CartRecord> {
    const cart = await this.prisma.cart.findUnique({
      where: { userId },
      select: cartSelect,
    });

    if (!cart || cart.items.length === 0) {
      throw new BadRequestException('Cart is empty.');
    }

    return cart;
  }

  private async findOwnedShippingAddress(
    userId: string,
    shippingAddressId?: string,
  ): Promise<OwnedShippingAddressRecord | null> {
    if (!shippingAddressId) {
      return null;
    }

    const shippingAddress = await this.prisma.userAddress.findFirst({
      where: {
        id: shippingAddressId,
        userId,
        isActive: true,
      },
      select: ownedShippingAddressSelect,
    });

    if (!shippingAddress) {
      throw new NotFoundException('Shipping address not found.');
    }

    return shippingAddress;
  }

  private async ensureCouponIsUsable(couponId?: string): Promise<void> {
    if (!couponId) {
      return;
    }

    const now = new Date();
    const coupon = await this.prisma.coupon.findFirst({
      where: {
        id: couponId,
        isActive: true,
        startsAt: { lte: now },
        expiresAt: { gte: now },
      },
      select: {
        id: true,
        usageLimit: true,
        usedCount: true,
      },
    });

    if (!coupon) {
      throw new NotFoundException('Coupon not found or inactive.');
    }

    if (coupon.usageLimit !== null && coupon.usedCount >= coupon.usageLimit) {
      throw new ConflictException('Coupon usage limit has been reached.');
    }
  }

  private async prepareOrderItems(
    userId: string,
    cartItems: CartItemRecord[],
    currency: Currency,
  ): Promise<PreparedOrderItem[]> {
    const catalogItems = await this.loadCatalogItems(cartItems);
    const courseIds = this.uniqueItemIds(cartItems, CartItemType.COURSE);
    const bookFormatIds = this.uniqueItemIds(cartItems, CartItemType.BOOK);
    const [purchasedCourseIds, purchasedBookFormatIds] = await Promise.all([
      this.findPurchasedCourseIds(userId, courseIds),
      this.findPurchasedBookFormatIds(userId, bookFormatIds),
    ]);

    return cartItems.map((cartItem) =>
      this.prepareOrderItem(
        cartItem,
        catalogItems,
        purchasedCourseIds,
        purchasedBookFormatIds,
        currency,
      ),
    );
  }

  private prepareOrderItem(
    cartItem: CartItemRecord,
    catalogItems: Map<string, LoadedOrderCatalogItem>,
    purchasedCourseIds: Set<string>,
    purchasedBookFormatIds: Set<string>,
    currency: Currency,
  ): PreparedOrderItem {
    const loadedCatalogItem = catalogItems.get(
      this.mapKey(cartItem.itemType, cartItem.itemId),
    );

    if (!loadedCatalogItem) {
      throw new NotFoundException(
        `${this.toReadableItemType(cartItem.itemType)} not found.`,
      );
    }

    switch (loadedCatalogItem.itemType) {
      case CartItemType.COURSE:
        return this.prepareCourseOrderItem(
          cartItem,
          loadedCatalogItem.item,
          purchasedCourseIds,
          currency,
        );
      case CartItemType.BOOK:
        return this.prepareBookOrderItem(
          cartItem,
          loadedCatalogItem.item,
          purchasedBookFormatIds,
          currency,
        );
      case CartItemType.PRODUCT:
        return this.prepareProductOrderItem(
          cartItem,
          loadedCatalogItem.item,
          currency,
        );
    }

    return this.assertNever(loadedCatalogItem);
  }

  private prepareCourseOrderItem(
    cartItem: CartItemRecord,
    course: CourseOrderRecord,
    purchasedCourseIds: Set<string>,
    currency: Currency,
  ): PreparedOrderItem {
    if (!course.isActive) {
      throw new NotFoundException('Course not found.');
    }

    this.assertSingleQuantity(cartItem.quantity, 'Course quantity must be 1.');

    if (purchasedCourseIds.has(course.id)) {
      throw new ConflictException('Course already purchased.');
    }

    const pricing = this.calculateLinePricing({
      quantity: 1,
      currency,
      priceEGP: this.toNumberFromDecimal(course.priceEGP),
      priceUSD: this.toNumberFromDecimal(course.priceUSD),
      discountPriceEGP: this.toOptionalNumberOrNull(course.discountPriceEGP),
      discountPriceUSD: this.toOptionalNumberOrNull(course.discountPriceUSD),
    });

    return {
      itemType: OrderItemType.COURSE,
      itemId: course.id,
      titleAr: course.titleAr,
      titleEn: course.titleEn,
      quantity: 1,
      hasPhysicalItem: false,
      ...pricing,
    };
  }

  private prepareBookOrderItem(
    cartItem: CartItemRecord,
    bookFormat: BookFormatOrderRecord,
    purchasedBookFormatIds: Set<string>,
    currency: Currency,
  ): PreparedOrderItem {
    if (!bookFormat.isActive || !bookFormat.book.isActive) {
      throw new NotFoundException('Book format not found.');
    }

    const isPhysical = bookFormat.formatType === BookFormatType.Physical;

    if (isPhysical) {
      this.assertStockAvailable(bookFormat.stock, cartItem.quantity, 'Book');
    } else {
      this.assertSingleQuantity(
        cartItem.quantity,
        'Digital and audio book quantity must be 1.',
      );

      if (purchasedBookFormatIds.has(bookFormat.id)) {
        throw new ConflictException('Book format already purchased.');
      }
    }

    const pricing = this.calculateLinePricing({
      quantity: cartItem.quantity,
      currency,
      priceEGP: this.toNumberFromDecimal(
        bookFormat.priceEgp ?? bookFormat.book.priceEgp,
      ),
      priceUSD: this.toNumberFromDecimal(
        bookFormat.priceUsd ?? bookFormat.book.priceUsd,
      ),
      discountPriceEGP: this.toOptionalNumberOrNull(
        bookFormat.discountPriceEgp ?? bookFormat.book.discountPriceEgp,
      ),
      discountPriceUSD: this.toOptionalNumberOrNull(
        bookFormat.discountPriceUsd ?? bookFormat.book.discountPriceUsd,
      ),
    });

    return {
      itemType: OrderItemType.BOOK,
      itemId: bookFormat.id,
      titleAr: bookFormat.book.titleAr,
      titleEn: bookFormat.book.titleEn,
      quantity: cartItem.quantity,
      hasPhysicalItem: isPhysical,
      ...pricing,
    };
  }

  private prepareProductOrderItem(
    cartItem: CartItemRecord,
    product: ProductOrderRecord,
    currency: Currency,
  ): PreparedOrderItem {
    if (!product.isActive) {
      throw new NotFoundException('Product not found.');
    }

    this.assertStockAvailable(product.stock, cartItem.quantity, 'Product');

    const pricing = this.calculateLinePricing({
      quantity: cartItem.quantity,
      currency,
      priceEGP: this.toNumberFromDecimal(product.priceEgp),
      priceUSD: this.toNumberFromDecimal(product.priceUsd),
      discountPriceEGP: this.toOptionalNumberOrNull(product.discountPriceEgp),
      discountPriceUSD: this.toOptionalNumberOrNull(product.discountPriceUsd),
    });

    return {
      itemType: OrderItemType.PRODUCT,
      itemId: product.id,
      titleAr: product.nameAr,
      titleEn: product.nameEn,
      quantity: cartItem.quantity,
      hasPhysicalItem: true,
      ...pricing,
    };
  }

  private async loadCatalogItems(
    cartItems: CartItemRecord[],
  ): Promise<Map<string, LoadedOrderCatalogItem>> {
    const courseIds = this.uniqueItemIds(cartItems, CartItemType.COURSE);
    const bookFormatIds = this.uniqueItemIds(cartItems, CartItemType.BOOK);
    const productIds = this.uniqueItemIds(cartItems, CartItemType.PRODUCT);
    const [courses, bookFormats, products] = await Promise.all([
      this.findCourses(courseIds),
      this.findBookFormats(bookFormatIds),
      this.findProducts(productIds),
    ]);
    const catalogItems = new Map<string, LoadedOrderCatalogItem>();

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

  private async findCourses(ids: string[]): Promise<CourseOrderRecord[]> {
    if (ids.length === 0) {
      return [];
    }

    return this.prisma.course.findMany({
      where: { id: { in: ids } },
      select: courseOrderSelect,
    });
  }

  private async findBookFormats(
    ids: string[],
  ): Promise<BookFormatOrderRecord[]> {
    if (ids.length === 0) {
      return [];
    }

    return this.prisma.bookFormat.findMany({
      where: { id: { in: ids } },
      select: bookFormatOrderSelect,
    });
  }

  private async findProducts(ids: string[]): Promise<ProductOrderRecord[]> {
    if (ids.length === 0) {
      return [];
    }

    return this.prisma.product.findMany({
      where: { id: { in: ids } },
      select: productOrderSelect,
    });
  }

  private async findPurchasedCourseIds(
    userId: string,
    courseIds: string[],
  ): Promise<Set<string>> {
    if (courseIds.length === 0) {
      return new Set();
    }

    const userCourses = await this.prisma.userCourse.findMany({
      where: {
        userId,
        courseId: { in: courseIds },
      },
      select: { courseId: true },
    });

    return new Set(userCourses.map((userCourse) => userCourse.courseId));
  }

  private async findPurchasedBookFormatIds(
    userId: string,
    bookFormatIds: string[],
  ): Promise<Set<string>> {
    if (bookFormatIds.length === 0) {
      return new Set();
    }

    const [userBooks, orderItems] = await this.prisma.$transaction([
      this.prisma.userBook.findMany({
        where: {
          userId,
          bookFormatId: { in: bookFormatIds },
        },
        select: { bookFormatId: true },
      }),
      this.prisma.orderItem.findMany({
        where: {
          itemType: OrderItemType.BOOK,
          itemId: { in: bookFormatIds },
          order: {
            userId,
            paymentStatus: PaymentStatus.PAID,
          },
        },
        select: { itemId: true },
      }),
    ]);

    return new Set([
      ...userBooks.map((userBook) => userBook.bookFormatId),
      ...orderItems.map((orderItem) => orderItem.itemId),
    ]);
  }

  private async generateOrderNumber(
    tx: Prisma.TransactionClient,
  ): Promise<string> {
    const year = new Date().getFullYear();
    const lockKey = `orders:${year}`;

    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${lockKey}))`;

    const prefix = `DS-${year}-`;
    const latestOrder = await tx.order.findFirst({
      where: {
        orderNumber: {
          startsWith: prefix,
        },
      },
      orderBy: {
        orderNumber: 'desc',
      },
      select: {
        orderNumber: true,
      },
    });
    const latestSequence = latestOrder
      ? Number(latestOrder.orderNumber.slice(prefix.length))
      : 0;
    const nextSequence = latestSequence + 1;

    return `${prefix}${String(nextSequence).padStart(6, '0')}`;
  }

  private calculateLinePricing({
    quantity,
    currency,
    priceEGP,
    priceUSD,
    discountPriceEGP,
    discountPriceUSD,
  }: {
    quantity: number;
    currency: Currency;
    priceEGP: number;
    priceUSD: number;
    discountPriceEGP: number | null;
    discountPriceUSD: number | null;
  }) {
    const unitPrice = currency === Currency.USD ? priceUSD : priceEGP;
    const discountPrice =
      currency === Currency.USD ? discountPriceUSD : discountPriceEGP;
    const effectivePrice = discountPrice ?? unitPrice;
    const lineSubtotal = this.roundMoney(unitPrice * quantity);
    const totalPrice = this.roundMoney(effectivePrice * quantity);

    return {
      unitPrice,
      discountPrice,
      totalPrice,
      lineSubtotal,
      lineDiscount: this.roundMoney(lineSubtotal - totalPrice),
    };
  }

  private calculateTotals(
    preparedItems: PreparedOrderItem[],
    shippingCost: number,
  ) {
    const itemsTotal = this.roundMoney(
      preparedItems.reduce((total, item) => total + item.totalPrice, 0),
    );

    return {
      subtotal: this.roundMoney(
        preparedItems.reduce((total, item) => total + item.lineSubtotal, 0),
      ),
      discountAmount: this.roundMoney(
        preparedItems.reduce((total, item) => total + item.lineDiscount, 0),
      ),
      shippingCost: this.roundMoney(shippingCost),
      totalAmount: this.roundMoney(itemsTotal + shippingCost),
    };
  }

  private detectCurrency(): Currency {
    return Currency.EGP;
  }

  private getShippingCostOrThrow(
    shippingAddress: OwnedShippingAddressRecord | null,
  ): number {
    if (
      !shippingAddress?.governorate ||
      !shippingAddress.governorate.isActive
    ) {
      throw new BadRequestException(
        'Shipping address must have an active governorate.',
      );
    }

    return this.toNumberFromDecimal(shippingAddress.governorate.shippingCost);
  }

  private assertSingleQuantity(quantity: number, message: string): void {
    if (quantity !== 1) {
      throw new BadRequestException(message);
    }
  }

  private assertStockAvailable(
    stock: number | null,
    quantity: number,
    label: 'Book' | 'Product',
  ): void {
    if (quantity < 1) {
      throw new BadRequestException(`${label} quantity must be at least 1.`);
    }

    if (stock === null) {
      throw new BadRequestException(`${label} stock is unavailable.`);
    }

    if (stock < quantity) {
      throw new ConflictException(`${label} stock is insufficient.`);
    }
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

  private mapKey(itemType: CartItemType, itemId: string): string {
    return `${itemType}:${itemId}`;
  }

  private toReadableItemType(itemType: CartItemType): string {
    switch (itemType) {
      case CartItemType.COURSE:
        return 'Course';
      case CartItemType.BOOK:
        return 'Book format';
      case CartItemType.PRODUCT:
        return 'Product';
    }
  }

  private toOrder(order: OrderRecord, includeUser = false): OrderResponse {
    return {
      id: order.id,
      userId: order.userId,
      orderNumber: order.orderNumber,
      status: order.status,
      paymentStatus: order.paymentStatus,
      currency: order.currency,
      subtotal: this.toNumberFromDecimal(order.subtotal),
      discountAmount: this.toNumberFromDecimal(order.discountAmount),
      shippingCost: this.toNumberFromDecimal(order.shippingCost),
      totalAmount: this.toNumberFromDecimal(order.totalAmount),
      hasPhysicalItems: order.hasPhysicalItems,
      notes: order.notes,
      paidAt: order.paidAt,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      user: includeUser ? order.user : undefined,
      shippingAddress:
        order.shippingAddress === null
          ? null
          : this.toShippingAddress(order.shippingAddress),
      items: order.items.map((item) => this.toOrderItem(item)),
    };
  }

  private toShippingAddress(address: OrderRecord['shippingAddress']) {
    if (address === null) {
      return null;
    }

    return {
      id: address.id,
      fullName: address.fullName,
      phoneNumber: address.phoneNumber,
      governorateId: address.governorateId,
      city: address.city,
      street: address.street,
      buildingNumber: address.buildingNumber,
      floor: address.floor,
      apartment: address.apartment,
      landmark: address.landmark,
      notes: address.notes,
      governorate:
        address.governorate === null
          ? null
          : {
              id: address.governorate.id,
              nameAr: address.governorate.nameAr,
              nameEn: address.governorate.nameEn,
              shippingCost: this.toNumberFromDecimal(
                address.governorate.shippingCost,
              ),
              isActive: address.governorate.isActive,
            },
    };
  }

  private toOrderItem(orderItem: OrderItemRecord): OrderItemResponse {
    return {
      id: orderItem.id,
      orderId: orderItem.orderId,
      itemType: orderItem.itemType,
      itemId: orderItem.itemId,
      titleAr: orderItem.titleAr,
      titleEn: orderItem.titleEn,
      quantity: orderItem.quantity,
      unitPrice: this.toNumberFromDecimal(orderItem.unitPrice),
      discountPrice: this.toOptionalNumberOrNull(orderItem.discountPrice),
      totalPrice: this.toNumberFromDecimal(orderItem.totalPrice),
      createdAt: orderItem.createdAt,
      updatedAt: orderItem.updatedAt,
    };
  }

  private toPagination(page: number, limit: number, total: number) {
    return {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    };
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
    throw new BadRequestException(`Unsupported order catalog item: ${value}`);
  }
}
