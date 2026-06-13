import { ConflictException } from '@nestjs/common';
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
import { NotificationsService } from '../notifications/notifications.service';
import { OrdersService } from './orders.service';

type MockPrismaClient = {
  $executeRaw: jest.Mock;
  $transaction: jest.Mock;
  bookFormat: {
    findMany: jest.Mock;
    update: jest.Mock;
    updateMany: jest.Mock;
  };
  cart: {
    findUnique: jest.Mock;
  };
  cartItem: {
    deleteMany: jest.Mock;
  };
  course: {
    findMany: jest.Mock;
  };
  order: {
    create: jest.Mock;
    findFirst: jest.Mock;
    findUnique: jest.Mock;
    update: jest.Mock;
  };
  orderItem: {
    findMany: jest.Mock;
  };
  product: {
    findMany: jest.Mock;
    update: jest.Mock;
    updateMany: jest.Mock;
  };
  userAddress: {
    findFirst: jest.Mock;
  };
  userBook: {
    findMany: jest.Mock;
  };
  userCourse: {
    findMany: jest.Mock;
  };
};

const userId = '3c5a4f7b-f332-4c1b-9716-32ea75789cc5';
const orderId = '2a1710fe-b59a-4c66-b0e9-5830d2b0f719';
const productId = 'ce0aa134-e17e-4907-8b46-45a76fa58d85';
const bookFormatId = 'ce7d43f7-2360-4c08-8454-303d0ebcf3be';
const shippingAddressId = '5486ca1f-a934-4b98-9c8d-85c466b7d8c2';

describe('OrdersService Phase 0 launch safety', () => {
  let prisma: MockPrismaClient;
  let notificationsService: Pick<NotificationsService, 'sendOrderCreated'>;
  let service: OrdersService;

  beforeEach(() => {
    prisma = createPrismaMock();
    notificationsService = {
      sendOrderCreated: jest.fn(),
    };
    service = new OrdersService(
      prisma as unknown as PrismaService,
      notificationsService as NotificationsService,
    );
  });

  it('decrements product and physical book stock when an order is created', async () => {
    mockCart([
      {
        id: 'cart-product',
        itemId: productId,
        itemType: CartItemType.PRODUCT,
        quantity: 2,
      },
      {
        id: 'cart-book',
        itemId: bookFormatId,
        itemType: CartItemType.BOOK,
        quantity: 1,
      },
    ]);
    prisma.userAddress.findFirst.mockResolvedValue(createShippingAddress());
    prisma.product.findMany.mockResolvedValue([createProduct({ stock: 5 })]);
    prisma.bookFormat.findMany.mockResolvedValue([
      createPhysicalBookFormat({ stock: 3 }),
    ]);
    prisma.userBook.findMany.mockResolvedValue([]);
    prisma.orderItem.findMany.mockResolvedValue([]);
    prisma.order.findFirst.mockResolvedValue(null);
    prisma.product.updateMany.mockResolvedValue({ count: 1 });
    prisma.bookFormat.updateMany.mockResolvedValue({ count: 1 });
    prisma.order.create.mockResolvedValue(createOrderRecord());

    await service.createFromCart(userId, { shippingAddressId });

    expect(prisma.product.updateMany).toHaveBeenCalledWith({
      where: {
        id: productId,
        stock: { gte: 2 },
      },
      data: {
        stock: { decrement: 2 },
      },
    });
    expect(prisma.bookFormat.updateMany).toHaveBeenCalledWith({
      where: {
        id: bookFormatId,
        formatType: BookFormatType.Physical,
        stock: { gte: 1 },
      },
      data: {
        stock: { decrement: 1 },
      },
    });
    expect(prisma.cartItem.deleteMany).toHaveBeenCalledWith({
      where: { cartId: 'cart-id' },
    });
  });

  it('fails with 409 and keeps the cart when atomic stock reservation fails', async () => {
    mockCart([
      {
        id: 'cart-product',
        itemId: productId,
        itemType: CartItemType.PRODUCT,
        quantity: 2,
      },
    ]);
    prisma.userAddress.findFirst.mockResolvedValue(createShippingAddress());
    prisma.product.findMany.mockResolvedValue([createProduct({ stock: 5 })]);
    prisma.order.findFirst.mockResolvedValue(null);
    prisma.product.updateMany.mockResolvedValue({ count: 0 });

    await expect(
      service.createFromCart(userId, { shippingAddressId }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(prisma.order.create).not.toHaveBeenCalled();
    expect(prisma.cartItem.deleteMany).not.toHaveBeenCalled();
  });

  it('does not allow admins to manually set an order as paid', async () => {
    await expect(
      service.adminUpdateStatus(orderId, {
        paymentStatus: PaymentStatus.PAID,
      }),
    ).rejects.toBeInstanceOf(ConflictException);
    await expect(
      service.adminUpdateStatus(orderId, {
        status: OrderStatus.PAID,
      }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(prisma.order.update).not.toHaveBeenCalled();
  });

  it('releases reserved stock when admin cancels a pending unpaid order', async () => {
    prisma.order.findUnique.mockResolvedValue({
      id: orderId,
      paymentStatus: PaymentStatus.PENDING,
      status: OrderStatus.PENDING,
    });
    prisma.orderItem.findMany.mockResolvedValue([
      {
        itemId: productId,
        itemType: OrderItemType.PRODUCT,
        quantity: 2,
      },
      {
        itemId: bookFormatId,
        itemType: OrderItemType.BOOK,
        quantity: 1,
      },
    ]);
    prisma.bookFormat.findMany.mockResolvedValue([{ id: bookFormatId }]);
    prisma.order.update.mockResolvedValue({
      ...createOrderRecord(),
      paymentStatus: PaymentStatus.CANCELLED,
      status: OrderStatus.CANCELLED,
    });

    await service.adminUpdateStatus(orderId, {
      paymentStatus: PaymentStatus.CANCELLED,
      status: OrderStatus.CANCELLED,
    });

    expect(prisma.product.update).toHaveBeenCalledWith({
      where: { id: productId },
      data: { stock: { increment: 2 } },
    });
    expect(prisma.bookFormat.update).toHaveBeenCalledWith({
      where: { id: bookFormatId },
      data: { stock: { increment: 1 } },
    });
    const orderUpdateArgs = getFirstMockArg<{
      where: { id: string };
      data: { paymentStatus: PaymentStatus; status: OrderStatus };
      select: object;
    }>(prisma.order.update);

    expect(orderUpdateArgs.where).toEqual({ id: orderId });
    expect(orderUpdateArgs.data).toEqual({
      paymentStatus: PaymentStatus.CANCELLED,
      status: OrderStatus.CANCELLED,
    });
    expect(orderUpdateArgs.select).toBeDefined();
  });

  function mockCart(
    items: Array<{
      id: string;
      itemId: string;
      itemType: CartItemType;
      quantity: number;
    }>,
  ): void {
    prisma.cart.findUnique.mockResolvedValue({
      id: 'cart-id',
      userId,
      items: items.map((item) => ({
        cartId: 'cart-id',
        ...item,
      })),
    });
  }
});

function getFirstMockArg<T>(mock: jest.Mock): T {
  const calls = mock.mock.calls as readonly unknown[][];
  const firstCall = calls[0];

  if (!firstCall) {
    throw new Error('Expected mock to have been called.');
  }

  return firstCall[0] as T;
}

function createPrismaMock(): MockPrismaClient {
  const prisma: MockPrismaClient = {
    $executeRaw: jest.fn().mockResolvedValue(undefined),
    $transaction: jest.fn(),
    bookFormat: {
      findMany: jest.fn().mockResolvedValue([]),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    cart: {
      findUnique: jest.fn(),
    },
    cartItem: {
      deleteMany: jest.fn(),
    },
    course: {
      findMany: jest.fn().mockResolvedValue([]),
    },
    order: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    orderItem: {
      findMany: jest.fn().mockResolvedValue([]),
    },
    product: {
      findMany: jest.fn().mockResolvedValue([]),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    userAddress: {
      findFirst: jest.fn(),
    },
    userBook: {
      findMany: jest.fn().mockResolvedValue([]),
    },
    userCourse: {
      findMany: jest.fn().mockResolvedValue([]),
    },
  };

  prisma.$transaction.mockImplementation(
    async (
      input:
        | Promise<unknown>[]
        | ((transactionClient: MockPrismaClient) => Promise<unknown>),
    ) => {
      if (Array.isArray(input)) {
        return Promise.all(input);
      }

      return input(prisma);
    },
  );

  return prisma;
}

function createProduct({ stock }: { stock: number }) {
  return {
    discountPriceEgp: null,
    discountPriceUsd: null,
    id: productId,
    isActive: true,
    nameAr: 'منتج اختبار',
    nameEn: 'Test Product',
    priceEgp: new Prisma.Decimal(100),
    priceUsd: new Prisma.Decimal(5),
    stock,
  };
}

function createPhysicalBookFormat({ stock }: { stock: number }) {
  return {
    book: {
      discountPriceEgp: null,
      discountPriceUsd: null,
      id: '2067a88b-f7e5-4f07-93d2-d4992499af5a',
      isActive: true,
      priceEgp: new Prisma.Decimal(200),
      priceUsd: new Prisma.Decimal(10),
      titleAr: 'كتاب اختبار',
      titleEn: 'Test Book',
    },
    discountPriceEgp: null,
    discountPriceUsd: null,
    formatType: BookFormatType.Physical,
    id: bookFormatId,
    isActive: true,
    priceEgp: null,
    priceUsd: null,
    stock,
  };
}

function createShippingAddress() {
  return {
    apartment: null,
    buildingNumber: null,
    city: 'Cairo',
    floor: null,
    fullName: 'Student Example',
    governorate: {
      id: '9dc2063a-025a-45d8-beb7-0b57424d5047',
      isActive: true,
      nameAr: 'القاهرة',
      nameEn: 'Cairo',
      shippingCost: new Prisma.Decimal(20),
    },
    governorateId: '9dc2063a-025a-45d8-beb7-0b57424d5047',
    id: shippingAddressId,
    landmark: null,
    notes: null,
    phoneNumber: '01000000000',
    street: null,
  };
}

function createOrderRecord() {
  const timestamp = new Date('2026-06-14T00:00:00.000Z');

  return {
    couponId: null,
    createdAt: timestamp,
    currency: Currency.EGP,
    discountAmount: new Prisma.Decimal(0),
    hasPhysicalItems: true,
    id: orderId,
    items: [
      {
        createdAt: timestamp,
        discountPrice: null,
        id: 'f573d4f8-71fb-4ce2-ab42-8a449df275d1',
        itemId: productId,
        itemType: OrderItemType.PRODUCT,
        orderId,
        quantity: 2,
        titleAr: 'منتج اختبار',
        titleEn: 'Test Product',
        totalPrice: new Prisma.Decimal(200),
        unitPrice: new Prisma.Decimal(100),
        updatedAt: timestamp,
      },
    ],
    notes: null,
    orderNumber: 'DS-2026-000001',
    paidAt: null,
    paymentStatus: PaymentStatus.PENDING,
    shippingAddress: createShippingAddress(),
    shippingAddressId,
    shippingCost: new Prisma.Decimal(20),
    status: OrderStatus.PENDING,
    subtotal: new Prisma.Decimal(200),
    totalAmount: new Prisma.Decimal(220),
    updatedAt: timestamp,
    user: {
      email: 'student@example.com',
      fullName: 'Student Example',
      id: userId,
      phoneNumber: '01000000000',
    },
    userId,
  };
}
