import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Currency } from '@prisma/client';
import { AdminGuard } from '../auth/admin.guard';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminDashboardService } from './admin-dashboard.service';
import {
  DashboardRevenuePeriod,
  DashboardRevenueQueryDto,
} from './dto/dashboard-query.dto';
import {
  DashboardContentApiResponseDto,
  DashboardOrdersApiResponseDto,
  DashboardOverviewApiResponseDto,
  DashboardRevenueApiResponseDto,
  DashboardUsersApiResponseDto,
} from './dto/dashboard-response.dto';

@ApiTags('Admin Dashboard')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, AdminGuard)
@Controller('admin/dashboard')
export class AdminDashboardController {
  constructor(private readonly adminDashboardService: AdminDashboardService) {}

  @Get('overview')
  @ApiOperation({
    summary: 'Admin: get dashboard overview statistics.',
    description:
      'Returns high-level counts and paid order revenue totals for the admin dashboard.',
  })
  @ApiOkResponse({
    description: 'Dashboard overview returned successfully.',
    type: DashboardOverviewApiResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
  @ApiForbiddenResponse({ description: 'Admin access is required.' })
  overview() {
    return this.adminDashboardService.getOverview();
  }

  @Get('revenue')
  @ApiOperation({
    summary: 'Admin: get revenue grouped by period.',
    description:
      'Uses paid orders only and groups revenue by day, week, month, or year.',
  })
  @ApiOkResponse({
    description: 'Dashboard revenue returned successfully.',
    type: DashboardRevenueApiResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Invalid period or currency.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
  @ApiForbiddenResponse({ description: 'Admin access is required.' })
  revenue(@Query() query: DashboardRevenueQueryDto) {
    return this.adminDashboardService.getRevenue(
      query.period ?? DashboardRevenuePeriod.Daily,
      query.currency ?? Currency.EGP,
    );
  }

  @Get('orders')
  @ApiOperation({
    summary: 'Admin: get order and payment dashboard statistics.',
    description:
      'Returns order status counts, payment status counts, and recent orders without sensitive customer data.',
  })
  @ApiOkResponse({
    description: 'Dashboard orders returned successfully.',
    type: DashboardOrdersApiResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
  @ApiForbiddenResponse({ description: 'Admin access is required.' })
  orders() {
    return this.adminDashboardService.getOrders();
  }

  @Get('users')
  @ApiOperation({
    summary: 'Admin: get user dashboard statistics.',
  })
  @ApiOkResponse({
    description: 'Dashboard users returned successfully.',
    type: DashboardUsersApiResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
  @ApiForbiddenResponse({ description: 'Admin access is required.' })
  users() {
    return this.adminDashboardService.getUsers();
  }

  @Get('content')
  @ApiOperation({
    summary: 'Admin: get content dashboard statistics.',
  })
  @ApiOkResponse({
    description: 'Dashboard content returned successfully.',
    type: DashboardContentApiResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
  @ApiForbiddenResponse({ description: 'Admin access is required.' })
  content() {
    return this.adminDashboardService.getContent();
  }
}
