import { ApiProperty } from '@nestjs/swagger';
import { Currency, OrderStatus, PaymentStatus } from '@prisma/client';
import { DashboardRevenuePeriod } from './dashboard-query.dto';

export class DashboardOverviewDto {
  @ApiProperty({ example: 1250 })
  totalUsers: number;

  @ApiProperty({ example: 32 })
  totalCourses: number;

  @ApiProperty({ example: 18 })
  totalBooks: number;

  @ApiProperty({ example: 24 })
  totalProducts: number;

  @ApiProperty({ example: 430 })
  totalOrders: number;

  @ApiProperty({ example: 185000 })
  totalRevenueEGP: number;

  @ApiProperty({ example: 6200 })
  totalRevenueUSD: number;

  @ApiProperty({ example: 12 })
  pendingOrders: number;

  @ApiProperty({ example: 355 })
  paidOrders: number;

  @ApiProperty({ example: 9 })
  failedPayments: number;

  @ApiProperty({ example: 44 })
  consultationRequestsCount: number;

  @ApiProperty({ example: 73 })
  contactMessagesCount: number;
}

export class DashboardOverviewDataDto {
  @ApiProperty({ type: DashboardOverviewDto })
  overview: DashboardOverviewDto;
}

export class DashboardOverviewApiResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ example: 'Dashboard overview returned successfully' })
  message: string;

  @ApiProperty({ type: DashboardOverviewDataDto })
  data: DashboardOverviewDataDto;
}

export class DashboardRevenuePointDto {
  @ApiProperty({ example: '2026-06-01' })
  date: string;

  @ApiProperty({ example: 12500 })
  revenue: number;
}

export class DashboardRevenueDto {
  @ApiProperty({
    enum: DashboardRevenuePeriod,
    enumName: 'DashboardRevenuePeriod',
    example: DashboardRevenuePeriod.Monthly,
  })
  period: DashboardRevenuePeriod;

  @ApiProperty({ enum: Currency, enumName: 'Currency', example: Currency.EGP })
  currency: Currency;

  @ApiProperty({ type: [DashboardRevenuePointDto] })
  items: DashboardRevenuePointDto[];
}

export class DashboardRevenueDataDto {
  @ApiProperty({ type: DashboardRevenueDto })
  revenue: DashboardRevenueDto;
}

export class DashboardRevenueApiResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ example: 'Dashboard revenue returned successfully' })
  message: string;

  @ApiProperty({ type: DashboardRevenueDataDto })
  data: DashboardRevenueDataDto;
}

export class DashboardRecentOrderDto {
  @ApiProperty({ example: 'd60c84b5-470b-4dde-a0a4-d0be057e8922' })
  id: string;

  @ApiProperty({ example: 'DS-2026-000001' })
  orderNumber: string;

  @ApiProperty({ enum: OrderStatus, enumName: 'OrderStatus' })
  status: OrderStatus;

  @ApiProperty({ enum: PaymentStatus, enumName: 'PaymentStatus' })
  paymentStatus: PaymentStatus;

  @ApiProperty({ example: 'EGP' })
  currency: string;

  @ApiProperty({ example: 2400 })
  totalAmount: number;

  @ApiProperty({ example: '2026-06-08T12:00:00.000Z', nullable: true })
  paidAt: Date | null;

  @ApiProperty({ example: '2026-06-08T12:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: 'Ahmed Saleh' })
  customerName: string;
}

export class DashboardOrdersDto {
  @ApiProperty({
    example: {
      PENDING: 12,
      PAID: 355,
      CANCELLED: 40,
      REFUNDED: 23,
    },
    additionalProperties: { type: 'number' },
  })
  ordersByStatus: Record<OrderStatus, number>;

  @ApiProperty({
    example: {
      PENDING: 10,
      PAID: 355,
      FAILED: 9,
      REFUNDED: 18,
      CANCELLED: 38,
    },
    additionalProperties: { type: 'number' },
  })
  paymentsByStatus: Record<PaymentStatus, number>;

  @ApiProperty({ type: [DashboardRecentOrderDto] })
  recentOrders: DashboardRecentOrderDto[];
}

export class DashboardOrdersDataDto {
  @ApiProperty({ type: DashboardOrdersDto })
  orders: DashboardOrdersDto;
}

export class DashboardOrdersApiResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ example: 'Dashboard orders returned successfully' })
  message: string;

  @ApiProperty({ type: DashboardOrdersDataDto })
  data: DashboardOrdersDataDto;
}

export class DashboardUsersDto {
  @ApiProperty({ example: 1250 })
  totalUsers: number;

  @ApiProperty({ example: 1205 })
  activeUsers: number;

  @ApiProperty({ example: 45 })
  inactiveUsers: number;

  @ApiProperty({ example: 88 })
  newUsersThisMonth: number;
}

export class DashboardUsersDataDto {
  @ApiProperty({ type: DashboardUsersDto })
  users: DashboardUsersDto;
}

export class DashboardUsersApiResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ example: 'Dashboard users returned successfully' })
  message: string;

  @ApiProperty({ type: DashboardUsersDataDto })
  data: DashboardUsersDataDto;
}

export class DashboardContentDto {
  @ApiProperty({ example: 30 })
  activeCourses: number;

  @ApiProperty({ example: 16 })
  activeBooks: number;

  @ApiProperty({ example: 22 })
  activeProducts: number;

  @ApiProperty({ example: 6 })
  homeDisplayedCourses: number;

  @ApiProperty({ example: 4 })
  homeDisplayedBooks: number;

  @ApiProperty({ example: 8 })
  homeDisplayedProducts: number;
}

export class DashboardContentDataDto {
  @ApiProperty({ type: DashboardContentDto })
  content: DashboardContentDto;
}

export class DashboardContentApiResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ example: 'Dashboard content returned successfully' })
  message: string;

  @ApiProperty({ type: DashboardContentDataDto })
  data: DashboardContentDataDto;
}
