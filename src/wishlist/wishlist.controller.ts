import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
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
  ApiQuery,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CheckWishlistItemDto } from './dto/check-wishlist-item.dto';
import { CreateWishlistItemDto } from './dto/create-wishlist-item.dto';
import {
  WishlistCheckApiResponseDto,
  WishlistDeleteApiResponseDto,
  WishlistItemApiResponseDto,
  WishlistListApiResponseDto,
} from './dto/wishlist-response.dto';
import { WishlistQueryDto } from './dto/wishlist-query.dto';
import { WishlistService } from './wishlist.service';

@ApiTags('Wishlist')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('wishlist')
export class WishlistController {
  constructor(private readonly wishlistService: WishlistService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Add a course, book, or product to the current user wishlist.',
    description:
      'Creates one wishlist row per user, itemType, and itemId. Duplicate items return 409 Conflict.',
  })
  @ApiCreatedResponse({
    description: 'Wishlist item added successfully.',
    type: WishlistItemApiResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Invalid itemType or itemId.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
  @ApiNotFoundResponse({ description: 'Course, book, or product not found.' })
  @ApiConflictResponse({ description: 'Item already exists in wishlist.' })
  add(
    @CurrentUser('id') userId: string,
    @Body() createWishlistItemDto: CreateWishlistItemDto,
  ) {
    return this.wishlistService.add(userId, createWishlistItemDto);
  }

  @Get()
  @ApiOperation({
    summary: 'Get the current user wishlist.',
    description:
      'Returns paginated wishlist items. itemType is optional and filters by COURSE, BOOK, or PRODUCT.',
  })
  @ApiOkResponse({
    description: 'Wishlist returned successfully.',
    type: WishlistListApiResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Invalid pagination or itemType.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
  findMyWishlist(
    @CurrentUser('id') userId: string,
    @Query() query: WishlistQueryDto,
  ) {
    return this.wishlistService.findMyWishlist(userId, query);
  }

  @Get('check')
  @ApiOperation({
    summary: 'Check if an item exists in the current user wishlist.',
  })
  @ApiQuery({
    name: 'itemType',
    enum: ['COURSE', 'BOOK', 'PRODUCT'],
    example: 'BOOK',
  })
  @ApiQuery({
    name: 'itemId',
    example: '7cb9f85b-420f-4f4e-9330-85ab0675df90',
  })
  @ApiOkResponse({
    description: 'Wishlist check returned successfully.',
    type: WishlistCheckApiResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Invalid itemType or itemId.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
  check(
    @CurrentUser('id') userId: string,
    @Query() checkWishlistItemDto: CheckWishlistItemDto,
  ) {
    return this.wishlistService.check(userId, checkWishlistItemDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Remove one current user wishlist item.',
    description: 'A user can remove only wishlist items owned by that user.',
  })
  @ApiOkResponse({
    description: 'Wishlist item removed successfully.',
    type: WishlistDeleteApiResponseDto,
  })
  @ApiNotFoundResponse({ description: 'Wishlist item not found.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
  remove(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.wishlistService.remove(userId, id);
  }
}
