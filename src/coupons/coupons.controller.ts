import {
  Body,
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CouponsService } from './coupons.service';
import { CouponActionDto } from './dto/coupon-action.dto';
import {
  CouponApplyApiResponseDto,
  CouponRemoveApiResponseDto,
  CouponValidateApiResponseDto,
} from './dto/coupon-response.dto';

@ApiTags('Coupons')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('coupons')
export class CouponsController {
  constructor(private readonly couponsService: CouponsService) {}

  @Post('validate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Validate coupon for an owned order.',
    description:
      'Checks coupon activity, date range, usage limit, minimum order amount, and current order ownership.',
  })
  @ApiOkResponse({
    description: 'Coupon is valid.',
    type: CouponValidateApiResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Invalid code or order payload.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
  @ApiNotFoundResponse({ description: 'Order or coupon not found.' })
  @ApiConflictResponse({
    description:
      'Coupon is inactive, expired, over usage limit, already combined, or order cannot be changed.',
  })
  validate(
    @CurrentUser('id') userId: string,
    @Body() couponActionDto: CouponActionDto,
  ) {
    return this.couponsService.validateCoupon(userId, couponActionDto);
  }

  @Post('apply')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Apply coupon to an owned order.',
    description:
      'Applies one normal or referral coupon to a pending unpaid order and recalculates order totals.',
  })
  @ApiOkResponse({
    description: 'Coupon applied successfully.',
    type: CouponApplyApiResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Invalid code or order payload.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
  @ApiNotFoundResponse({ description: 'Order or coupon not found.' })
  @ApiConflictResponse({
    description:
      'Coupon is inactive, expired, over usage limit, already combined, or order cannot be changed.',
  })
  apply(
    @CurrentUser('id') userId: string,
    @Body() couponActionDto: CouponActionDto,
  ) {
    return this.couponsService.applyCoupon(userId, couponActionDto);
  }

  @Delete('remove/:orderId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Remove coupon from an owned order.',
    description:
      'Removes the applied coupon from a pending unpaid order and restores totals to item-level pricing.',
  })
  @ApiOkResponse({
    description: 'Coupon removed successfully.',
    type: CouponRemoveApiResponseDto,
  })
  @ApiBadRequestResponse({ description: 'No coupon is applied to this order.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
  @ApiNotFoundResponse({ description: 'Order not found.' })
  @ApiConflictResponse({
    description: 'Order cannot be changed after payment starts.',
  })
  remove(
    @CurrentUser('id') userId: string,
    @Param('orderId', ParseUUIDPipe) orderId: string,
  ) {
    return this.couponsService.removeCoupon(userId, orderId);
  }
}
