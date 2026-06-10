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
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CreateOrderDto } from './dto/create-order.dto';
import {
  OrderApiResponseDto,
  OrderListApiResponseDto,
} from './dto/order-response.dto';
import { OrderQueryDto } from './dto/order-query.dto';
import { OrdersService } from './orders.service';

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
    @CurrentUser('id') userId: string,
    @Body() createOrderDto: CreateOrderDto,
  ) {
    return this.ordersService.createFromCart(userId, createOrderDto);
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
  findAll(@CurrentUser('id') userId: string, @Query() query: OrderQueryDto) {
    return this.ordersService.findMyOrders(userId, query);
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
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.ordersService.findMyOrder(userId, id);
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
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.ordersService.cancelMyOrder(userId, id);
  }
}
