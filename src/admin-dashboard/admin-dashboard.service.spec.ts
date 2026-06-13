import { Currency, OrderStatus, PaymentStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { AdminDashboardService } from './admin-dashboard.service';
import { DashboardRevenuePeriod } from './dto/dashboard-query.dto';

type PrismaMock = {
  $queryRaw: jest.Mock;
  $transaction: jest.Mock;
  book: {
    count: jest.Mock;
  };
  contactMessage: {
    count: jest.Mock;
  };
  consultationRequest: {
    count: jest.Mock;
  };
  course: {
    count: jest.Mock;
  };
  order: {
    count: jest.Mock;
    findMany: jest.Mock;
    groupBy: jest.Mock;
  };
  payment: {
    count: jest.Mock;
    groupBy: jest.Mock;
  };
  product: {
    count: jest.Mock;
  };
  user: {
    count: jest.Mock;
  };
};

describe('AdminDashboardService', () => {
  let prisma: PrismaMock;
  let service: AdminDashboardService;

  beforeEach(() => {
    prisma = createPrismaMock();
    service = new AdminDashboardService(prisma as unknown as PrismaService);
  });

  it('returns overview counts and revenue by currency', async () => {
    prisma.user.count.mockResolvedValueOnce(10);
    prisma.course.count.mockResolvedValueOnce(3);
    prisma.book.count.mockResolvedValueOnce(4);
    prisma.product.count.mockResolvedValueOnce(5);
    prisma.order.count
      .mockResolvedValueOnce(20)
      .mockResolvedValueOnce(2)
      .mockResolvedValueOnce(12);
    prisma.order.groupBy.mockResolvedValueOnce([
      {
        currency: Currency.EGP,
        _sum: { totalAmount: new Prisma.Decimal(1500.5) },
      },
      {
        currency: Currency.USD,
        _sum: { totalAmount: new Prisma.Decimal(99.99) },
      },
    ]);
    prisma.payment.count.mockResolvedValueOnce(1);
    prisma.consultationRequest.count.mockResolvedValueOnce(6);
    prisma.contactMessage.count.mockResolvedValueOnce(7);

    const response = await service.getOverview();

    expect(response.data.overview).toEqual({
      contactMessagesCount: 7,
      consultationRequestsCount: 6,
      failedPayments: 1,
      paidOrders: 12,
      pendingOrders: 2,
      totalBooks: 4,
      totalCourses: 3,
      totalOrders: 20,
      totalProducts: 5,
      totalRevenueEGP: 1500.5,
      totalRevenueUSD: 99.99,
      totalUsers: 10,
    });
    expect(prisma.order.groupBy).toHaveBeenCalledWith({
      by: ['currency'],
      orderBy: { currency: 'asc' },
      where: { paymentStatus: PaymentStatus.PAID },
      _sum: { totalAmount: true },
    });
  });

  it('returns paid order revenue grouped by date', async () => {
    prisma.$queryRaw.mockResolvedValueOnce([
      { date: '2026-06-01', revenue: '1200.25' },
      { date: '2026-07-01', revenue: '500.00' },
    ]);

    const response = await service.getRevenue(
      DashboardRevenuePeriod.Monthly,
      Currency.EGP,
    );

    expect(response.data.revenue).toEqual({
      currency: Currency.EGP,
      items: [
        { date: '2026-06-01', revenue: 1200.25 },
        { date: '2026-07-01', revenue: 500 },
      ],
      period: DashboardRevenuePeriod.Monthly,
    });
    expect(prisma.$queryRaw).toHaveBeenCalledTimes(1);
  });

  it('returns status breakdowns with zero-filled enum keys and recent orders', async () => {
    const createdAt = new Date('2026-06-12T00:00:00.000Z');
    prisma.order.groupBy.mockResolvedValueOnce([
      { status: OrderStatus.PENDING, _count: { _all: 2 } },
      { status: OrderStatus.PAID, _count: { _all: 8 } },
    ]);
    prisma.payment.groupBy.mockResolvedValueOnce([
      { status: PaymentStatus.PAID, _count: { _all: 8 } },
      { status: PaymentStatus.FAILED, _count: { _all: 1 } },
    ]);
    prisma.order.findMany.mockResolvedValueOnce([
      {
        createdAt,
        currency: Currency.EGP,
        id: 'order-id',
        orderNumber: 'DS-2026-000001',
        paidAt: null,
        paymentStatus: PaymentStatus.PENDING,
        status: OrderStatus.PENDING,
        totalAmount: new Prisma.Decimal(250),
        user: {
          fullName: 'Student Example',
        },
      },
    ]);

    const response = await service.getOrders();

    expect(response.data.orders.ordersByStatus).toEqual({
      CANCELLED: 0,
      PAID: 8,
      PENDING: 2,
      REFUNDED: 0,
    });
    expect(response.data.orders.paymentsByStatus).toEqual({
      CANCELLED: 0,
      FAILED: 1,
      PAID: 8,
      PENDING: 0,
      REFUNDED: 0,
    });
    expect(response.data.orders.recentOrders).toEqual([
      {
        createdAt,
        currency: Currency.EGP,
        customerName: 'Student Example',
        id: 'order-id',
        orderNumber: 'DS-2026-000001',
        paidAt: null,
        paymentStatus: PaymentStatus.PENDING,
        status: OrderStatus.PENDING,
        totalAmount: 250,
      },
    ]);
  });

  it('returns user statistics', async () => {
    prisma.user.count
      .mockResolvedValueOnce(100)
      .mockResolvedValueOnce(91)
      .mockResolvedValueOnce(9)
      .mockResolvedValueOnce(14);

    const response = await service.getUsers();

    expect(response.data.users).toEqual({
      activeUsers: 91,
      inactiveUsers: 9,
      newUsersThisMonth: 14,
      totalUsers: 100,
    });
    expect(prisma.user.count).toHaveBeenLastCalledWith({
      where: {
        createdAt: {
          gte: expect.any(Date) as Date,
        },
      },
    });
  });

  it('returns content statistics', async () => {
    prisma.course.count.mockResolvedValueOnce(10).mockResolvedValueOnce(3);
    prisma.book.count.mockResolvedValueOnce(8).mockResolvedValueOnce(2);
    prisma.product.count.mockResolvedValueOnce(12).mockResolvedValueOnce(4);

    const response = await service.getContent();

    expect(response.data.content).toEqual({
      activeBooks: 8,
      activeCourses: 10,
      activeProducts: 12,
      homeDisplayedBooks: 2,
      homeDisplayedCourses: 3,
      homeDisplayedProducts: 4,
    });
  });
});

function createPrismaMock(): PrismaMock {
  const prisma: PrismaMock = {
    $queryRaw: jest.fn(),
    $transaction: jest.fn(),
    book: {
      count: jest.fn(),
    },
    contactMessage: {
      count: jest.fn(),
    },
    consultationRequest: {
      count: jest.fn(),
    },
    course: {
      count: jest.fn(),
    },
    order: {
      count: jest.fn(),
      findMany: jest.fn(),
      groupBy: jest.fn(),
    },
    payment: {
      count: jest.fn(),
      groupBy: jest.fn(),
    },
    product: {
      count: jest.fn(),
    },
    user: {
      count: jest.fn(),
    },
  };

  prisma.$transaction.mockImplementation(
    async (operations: Array<Promise<unknown>>) => Promise.all(operations),
  );

  return prisma;
}
