import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { AdminGuard } from '../auth/admin.guard';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminOrderQueryDto } from './dto/admin-order-query.dto';
import {
  OrderApiResponseDto,
  OrderListApiResponseDto,
} from './dto/order-response.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { OrdersService } from './orders.service';

@ApiTags('Admin Orders')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, AdminGuard)
@Controller('admin/orders')
export class AdminOrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get()
  @ApiOperation({
    summary: 'Admin: list orders.',
    description:
      'Supports pagination plus status, paymentStatus, and userId filters.',
  })
  @ApiOkResponse({
    description: 'Orders returned successfully.',
    type: OrderListApiResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Invalid query filters.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
  @ApiForbiddenResponse({ description: 'Admin access is required.' })
  findAll(@Query() query: AdminOrderQueryDto) {
    return this.ordersService.adminFindOrders(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Admin: get one order.' })
  @ApiOkResponse({
    description: 'Order returned successfully.',
    type: OrderApiResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
  @ApiForbiddenResponse({ description: 'Admin access is required.' })
  @ApiNotFoundResponse({ description: 'Order not found.' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.ordersService.adminFindOrder(id);
  }

  @Patch(':id/status')
  @ApiOperation({
    summary: 'Admin: update order or payment status.',
    description:
      'If status is set to PAID and paymentStatus is omitted, paymentStatus is also set to PAID. Access granting is intentionally not handled here.',
  })
  @ApiOkResponse({
    description: 'Order status updated successfully.',
    type: OrderApiResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Provide status or paymentStatus to update the order.',
  })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
  @ApiForbiddenResponse({ description: 'Admin access is required.' })
  @ApiNotFoundResponse({ description: 'Order not found.' })
  updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateOrderStatusDto: UpdateOrderStatusDto,
  ) {
    return this.ordersService.adminUpdateStatus(id, updateOrderStatusDto);
  }
}
