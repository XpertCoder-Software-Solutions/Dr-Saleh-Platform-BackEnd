import { Injectable } from '@nestjs/common';
import { Currency, OrderStatus, PaymentStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { DashboardRevenuePeriod } from './dto/dashboard-query.dto';

type DecimalLike = Prisma.Decimal | number | string | null | undefined;

type RevenueRow = {
  date: string;
  revenue: string | number | Prisma.Decimal | null;
};

type CountGroup<TStatus extends string> = {
  status: TStatus;
  _count?: true | { _all?: number };
};

@Injectable()
export class AdminDashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getOverview() {
    const [
      totalUsers,
      totalCourses,
      totalBooks,
      totalProducts,
      totalOrders,
      revenueByCurrency,
      pendingOrders,
      paidOrders,
      failedPayments,
      consultationRequestsCount,
      contactMessagesCount,
    ] = await this.prisma.$transaction([
      this.prisma.user.count(),
      this.prisma.course.count(),
      this.prisma.book.count(),
      this.prisma.product.count(),
      this.prisma.order.count(),
      this.prisma.order.groupBy({
        by: ['currency'],
        orderBy: { currency: 'asc' },
        where: {
          paymentStatus: PaymentStatus.PAID,
        },
        _sum: {
          totalAmount: true,
        },
      }),
      this.prisma.order.count({
        where: { status: OrderStatus.PENDING },
      }),
      this.prisma.order.count({
        where: { status: OrderStatus.PAID },
      }),
      this.prisma.payment.count({
        where: { status: PaymentStatus.FAILED },
      }),
      this.prisma.consultationRequest.count(),
      this.prisma.contactMessage.count(),
    ]);

    return {
      message: 'Dashboard overview returned successfully',
      data: {
        overview: {
          totalUsers,
          totalCourses,
          totalBooks,
          totalProducts,
          totalOrders,
          totalRevenueEGP: this.findCurrencyRevenue(
            revenueByCurrency,
            Currency.EGP,
          ),
          totalRevenueUSD: this.findCurrencyRevenue(
            revenueByCurrency,
            Currency.USD,
          ),
          pendingOrders,
          paidOrders,
          failedPayments,
          consultationRequestsCount,
          contactMessagesCount,
        },
      },
    };
  }

  async getRevenue(
    period: DashboardRevenuePeriod = DashboardRevenuePeriod.Daily,
    currency: Currency = Currency.EGP,
  ) {
    const rows = await this.prisma.$queryRaw<RevenueRow[]>(Prisma.sql`
      SELECT
        to_char(date_trunc(${period}, "paidAt"), 'YYYY-MM-DD') AS "date",
        COALESCE(SUM("totalAmount"), 0)::text AS "revenue"
      FROM "orders"
      WHERE "paymentStatus" = ${PaymentStatus.PAID}
        AND "paidAt" IS NOT NULL
        AND "currency" = ${currency}
      GROUP BY date_trunc(${period}, "paidAt")
      ORDER BY date_trunc(${period}, "paidAt") ASC
    `);

    return {
      message: 'Dashboard revenue returned successfully',
      data: {
        revenue: {
          period,
          currency,
          items: rows.map((row) => ({
            date: row.date,
            revenue: this.toNumber(row.revenue),
          })),
        },
      },
    };
  }

  async getOrders() {
    const [orderGroups, paymentGroups, recentOrders] =
      await this.prisma.$transaction([
        this.prisma.order.groupBy({
          by: ['status'],
          orderBy: { status: 'asc' },
          _count: {
            _all: true,
          },
        }),
        this.prisma.payment.groupBy({
          by: ['status'],
          orderBy: { status: 'asc' },
          _count: {
            _all: true,
          },
        }),
        this.prisma.order.findMany({
          select: {
            id: true,
            orderNumber: true,
            status: true,
            paymentStatus: true,
            currency: true,
            totalAmount: true,
            paidAt: true,
            createdAt: true,
            user: {
              select: {
                fullName: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: 10,
        }),
      ]);

    return {
      message: 'Dashboard orders returned successfully',
      data: {
        orders: {
          ordersByStatus: this.buildStatusCounts(
            Object.values(OrderStatus),
            orderGroups,
          ),
          paymentsByStatus: this.buildStatusCounts(
            Object.values(PaymentStatus),
            paymentGroups,
          ),
          recentOrders: recentOrders.map((order) => ({
            id: order.id,
            orderNumber: order.orderNumber,
            status: order.status,
            paymentStatus: order.paymentStatus,
            currency: order.currency,
            totalAmount: this.toNumber(order.totalAmount),
            paidAt: order.paidAt,
            createdAt: order.createdAt,
            customerName: order.user.fullName,
          })),
        },
      },
    };
  }

  async getUsers() {
    const monthStart = this.getCurrentMonthStart();
    const [totalUsers, activeUsers, inactiveUsers, newUsersThisMonth] =
      await this.prisma.$transaction([
        this.prisma.user.count(),
        this.prisma.user.count({ where: { isActive: true } }),
        this.prisma.user.count({ where: { isActive: false } }),
        this.prisma.user.count({
          where: {
            createdAt: {
              gte: monthStart,
            },
          },
        }),
      ]);

    return {
      message: 'Dashboard users returned successfully',
      data: {
        users: {
          totalUsers,
          activeUsers,
          inactiveUsers,
          newUsersThisMonth,
        },
      },
    };
  }

  async getContent() {
    const [
      activeCourses,
      activeBooks,
      activeProducts,
      homeDisplayedCourses,
      homeDisplayedBooks,
      homeDisplayedProducts,
    ] = await this.prisma.$transaction([
      this.prisma.course.count({ where: { isActive: true } }),
      this.prisma.book.count({ where: { isActive: true } }),
      this.prisma.product.count({ where: { isActive: true } }),
      this.prisma.course.count({
        where: { isActive: true, isHomeDisplay: true },
      }),
      this.prisma.book.count({
        where: { isActive: true, isHomeDisplay: true },
      }),
      this.prisma.product.count({
        where: { isActive: true, isHomeDisplay: true },
      }),
    ]);

    return {
      message: 'Dashboard content returned successfully',
      data: {
        content: {
          activeCourses,
          activeBooks,
          activeProducts,
          homeDisplayedCourses,
          homeDisplayedBooks,
          homeDisplayedProducts,
        },
      },
    };
  }

  private buildStatusCounts<TStatus extends string>(
    statuses: TStatus[],
    groups: CountGroup<TStatus>[],
  ): Record<TStatus, number> {
    const counts = Object.fromEntries(
      statuses.map((status) => [status, 0]),
    ) as Record<TStatus, number>;

    for (const group of groups) {
      counts[group.status] =
        group._count && group._count !== true ? (group._count._all ?? 0) : 0;
    }

    return counts;
  }

  private findCurrencyRevenue(
    groups: Array<{
      currency: string;
      _sum?: {
        totalAmount?: Prisma.Decimal | null;
      };
    }>,
    currency: Currency,
  ): number {
    const group = groups.find((item) => item.currency === currency);

    return this.toNumber(group?._sum?.totalAmount);
  }

  private toNumber(value: DecimalLike): number {
    if (value === null || value === undefined) {
      return 0;
    }

    if (typeof value === 'number') {
      return value;
    }

    return Number(value);
  }

  private getCurrentMonthStart(): Date {
    const now = new Date();

    return new Date(now.getFullYear(), now.getMonth(), 1);
  }
}
