import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { Request as ExpressRequest } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { AuthenticatedUser } from '../auth/jwt.strategy';
import { CreateOrderDto } from './dto/create-order.dto';
import {
  OrderApiResponseDto,
  OrderListApiResponseDto,
} from './dto/order-response.dto';
import { OrderQueryDto } from './dto/order-query.dto';
import { OrdersService } from './orders.service';

type AuthenticatedRequest = ExpressRequest & {
  user: AuthenticatedUser;
};

@ApiTags('Orders')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create an order from the current user cart.',
    description:
      'Snapshots cart items into order items. Payment is not processed and access is not granted here.',
  })
  @ApiCreatedResponse({
    description: 'Order created successfully.',
    type: OrderApiResponseDto,
  })
  @ApiBadRequestResponse({
    description:
      'Cart is empty, quantity is invalid, or shippingAddressId is missing for physical items.',
  })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
  @ApiNotFoundResponse({
    description: 'Cart target, shipping address, or coupon not found.',
  })
  @ApiConflictResponse({
    description: 'Already purchased item or insufficient stock.',
  })
  create(
    @Request() request: AuthenticatedRequest,
    @Body() createOrderDto: CreateOrderDto,
  ) {
    return this.ordersService.createFromCart(request.user.id, createOrderDto);
  }

  @Get()
  @ApiOperation({
    summary: 'Get current user orders.',
    description: 'Returns paginated orders owned by the authenticated user.',
  })
  @ApiOkResponse({
    description: 'Orders returned successfully.',
    type: OrderListApiResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Invalid pagination query.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
  findAll(
    @Request() request: AuthenticatedRequest,
    @Query() query: OrderQueryDto,
  ) {
    return this.ordersService.findMyOrders(request.user.id, query);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get one current user order.',
    description: 'A user can access only orders owned by that user.',
  })
  @ApiOkResponse({
    description: 'Order returned successfully.',
    type: OrderApiResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
  @ApiNotFoundResponse({ description: 'Order not found.' })
  findOne(
    @Request() request: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.ordersService.findMyOrder(request.user.id, id);
  }

  @Patch(':id/cancel')
  @ApiOperation({
    summary: 'Cancel one current user order.',
    description: 'Only pending unpaid orders can be cancelled.',
  })
  @ApiOkResponse({
    description: 'Order cancelled successfully.',
    type: OrderApiResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
  @ApiNotFoundResponse({ description: 'Order not found.' })
  @ApiConflictResponse({
    description: 'Only pending unpaid orders can be cancelled.',
  })
  cancel(
    @Request() request: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.ordersService.cancelMyOrder(request.user.id, id);
  }
}
