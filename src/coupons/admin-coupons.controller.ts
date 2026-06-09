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
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { AdminGuard } from '../auth/admin.guard';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CouponsService } from './coupons.service';
import { CouponQueryDto } from './dto/coupon-query.dto';
import {
  CouponApiResponseDto,
  CouponDeleteApiResponseDto,
  CouponListApiResponseDto,
} from './dto/coupon-response.dto';
import { CreateCouponDto } from './dto/create-coupon.dto';
import { UpdateCouponDto } from './dto/update-coupon.dto';

@ApiTags('Admin Coupons')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, AdminGuard)
@Controller('admin/coupons')
export class AdminCouponsController {
  constructor(private readonly couponsService: CouponsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Admin: create coupon.',
    description:
      'Creates percentage or fixed amount coupons for courses, books, and products.',
  })
  @ApiCreatedResponse({
    description: 'Coupon created successfully.',
    type: CouponApiResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Invalid coupon payload, value, or date range.',
  })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
  @ApiForbiddenResponse({ description: 'Admin access is required.' })
  @ApiConflictResponse({ description: 'Coupon code already exists.' })
  create(@Body() createCouponDto: CreateCouponDto) {
    return this.couponsService.adminCreate(createCouponDto);
  }

  @Get()
  @ApiOperation({
    summary: 'Admin: list coupons.',
    description:
      'Supports pagination plus search, type, active, and referral filters.',
  })
  @ApiOkResponse({
    description: 'Coupons returned successfully.',
    type: CouponListApiResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Invalid query filters.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
  @ApiForbiddenResponse({ description: 'Admin access is required.' })
  findAll(@Query() query: CouponQueryDto) {
    return this.couponsService.adminFindAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Admin: get one coupon.' })
  @ApiOkResponse({
    description: 'Coupon returned successfully.',
    type: CouponApiResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
  @ApiForbiddenResponse({ description: 'Admin access is required.' })
  @ApiNotFoundResponse({ description: 'Coupon not found.' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.couponsService.adminFindOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Admin: update coupon.' })
  @ApiOkResponse({
    description: 'Coupon updated successfully.',
    type: CouponApiResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Invalid coupon payload, value, or date range.',
  })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
  @ApiForbiddenResponse({ description: 'Admin access is required.' })
  @ApiNotFoundResponse({ description: 'Coupon not found.' })
  @ApiConflictResponse({ description: 'Coupon code already exists.' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateCouponDto: UpdateCouponDto,
  ) {
    return this.couponsService.adminUpdate(id, updateCouponDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Admin: delete coupon.',
    description:
      'Hard deletes unused coupons. Referenced coupons return 409 Conflict.',
  })
  @ApiOkResponse({
    description: 'Coupon deleted successfully.',
    type: CouponDeleteApiResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
  @ApiForbiddenResponse({ description: 'Admin access is required.' })
  @ApiNotFoundResponse({ description: 'Coupon not found.' })
  @ApiConflictResponse({
    description: 'Coupon is already referenced by orders or usages.',
  })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.couponsService.adminDelete(id);
  }
}
