import {
  Body,
  Controller,
  Delete,
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
  ApiUnauthorizedResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { Request as ExpressRequest } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { AuthenticatedUser } from '../auth/jwt.strategy';
import { CartService } from './cart.service';
import { AddCartItemDto } from './dto/add-cart-item.dto';
import { CartQueryDto } from './dto/cart-query.dto';
import {
  CartApiResponseDto,
  CartDeleteApiResponseDto,
  CartItemApiResponseDto,
  CartSummaryApiResponseDto,
} from './dto/cart-response.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';

type AuthenticatedRequest = ExpressRequest & {
  user: AuthenticatedUser;
};

@ApiTags('Cart')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('cart')
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Post('items')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Add an item to the current user cart.',
    description:
      'Supports mixed carts with courses, book formats, and products. Duplicate items return 409 Conflict.',
  })
  @ApiCreatedResponse({
    description: 'Cart item added successfully.',
    type: CartItemApiResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Invalid item type, UUID, or quantity.',
  })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
  @ApiNotFoundResponse({
    description: 'Course, book format, or product not found.',
  })
  @ApiConflictResponse({
    description:
      'Duplicate item, already purchased item, or insufficient stock.',
  })
  addItem(
    @Request() request: AuthenticatedRequest,
    @Body() addCartItemDto: AddCartItemDto,
  ) {
    return this.cartService.addItem(request.user.id, addCartItemDto);
  }

  @Get()
  @ApiOperation({
    summary: 'Get the current user cart.',
    description:
      'Returns cart items with selected-currency prices, discounts, and grand total.',
  })
  @ApiOkResponse({
    description: 'Cart returned successfully.',
    type: CartApiResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Invalid currency.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
  getCart(
    @Request() request: AuthenticatedRequest,
    @Query() query: CartQueryDto,
  ) {
    return this.cartService.getCart(request.user.id, query);
  }

  @Patch('items/:id')
  @ApiOperation({
    summary: 'Update cart item quantity.',
    description:
      'Only products and physical books can have their quantity updated.',
  })
  @ApiOkResponse({
    description: 'Cart item quantity updated successfully.',
    type: CartItemApiResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Invalid quantity or quantity update is not allowed.',
  })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
  @ApiNotFoundResponse({
    description: 'Cart item, book format, or product not found.',
  })
  @ApiConflictResponse({ description: 'Insufficient stock.' })
  updateQuantity(
    @Request() request: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateCartItemDto: UpdateCartItemDto,
  ) {
    return this.cartService.updateQuantity(
      request.user.id,
      id,
      updateCartItemDto,
    );
  }

  @Delete('items/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Remove one cart item.',
    description: 'A user can remove only items from his own cart.',
  })
  @ApiOkResponse({
    description: 'Cart item removed successfully.',
    type: CartDeleteApiResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
  @ApiNotFoundResponse({ description: 'Cart item not found.' })
  removeItem(
    @Request() request: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.cartService.removeItem(request.user.id, id);
  }

  @Delete()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Clear the current user cart.' })
  @ApiOkResponse({
    description: 'Cart cleared successfully.',
    type: CartDeleteApiResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
  clearCart(@Request() request: AuthenticatedRequest) {
    return this.cartService.clearCart(request.user.id);
  }

  @Get('summary')
  @ApiOperation({
    summary: 'Get the current user cart summary.',
    description:
      'Returns subtotal, discount, total, grandTotal, and itemsCount.',
  })
  @ApiOkResponse({
    description: 'Cart summary returned successfully.',
    type: CartSummaryApiResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Invalid currency.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
  getSummary(
    @Request() request: AuthenticatedRequest,
    @Query() query: CartQueryDto,
  ) {
    return this.cartService.getSummary(request.user.id, query);
  }
}
