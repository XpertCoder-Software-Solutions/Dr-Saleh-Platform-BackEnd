import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CouponType } from '@prisma/client';

export class CouponResponseDto {
  @ApiProperty({ example: 'd0cd9afd-23d6-4c2d-b7c9-4328756da109' })
  id: string;

  @ApiProperty({ example: 'WELCOME10' })
  code: string;

  @ApiProperty({ example: 'Welcome discount' })
  name: string;

  @ApiProperty({ example: 'Ten percent discount.', nullable: true })
  description: string | null;

  @ApiProperty({
    enum: CouponType,
    enumName: 'CouponType',
    example: CouponType.PERCENTAGE,
  })
  type: CouponType;

  @ApiProperty({ example: 10 })
  value: number;

  @ApiProperty({ example: 500, nullable: true })
  minimumOrderAmount: number | null;

  @ApiProperty({ example: 250, nullable: true })
  maximumDiscountAmount: number | null;

  @ApiProperty({ example: 100, nullable: true })
  usageLimit: number | null;

  @ApiProperty({ example: 3 })
  usedCount: number;

  @ApiProperty({ example: '2026-06-08T00:00:00.000Z' })
  startsAt: Date;

  @ApiProperty({ example: '2026-07-08T00:00:00.000Z' })
  expiresAt: Date;

  @ApiProperty({ example: false })
  isReferralCoupon: boolean;

  @ApiProperty({ example: true })
  isActive: boolean;

  @ApiProperty({ example: '2026-06-08T12:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2026-06-08T12:00:00.000Z' })
  updatedAt: Date;
}

export class CouponOrderSummaryDto {
  @ApiProperty({ example: 'd60c84b5-470b-4dde-a0a4-d0be057e8922' })
  id: string;

  @ApiProperty({ example: 'DS-2026-000001' })
  orderNumber: string;

  @ApiProperty({ example: 'EGP' })
  currency: string;

  @ApiProperty({ example: 2400 })
  subtotal: number;

  @ApiProperty({ example: 500 })
  discountAmount: number;

  @ApiProperty({ example: 1900 })
  totalAmount: number;

  @ApiProperty({
    example: 'd0cd9afd-23d6-4c2d-b7c9-4328756da109',
    nullable: true,
  })
  couponId: string | null;
}

export class CouponCalculationDto {
  @ApiProperty({ type: CouponResponseDto })
  coupon: CouponResponseDto;

  @ApiProperty({ example: 'EGP' })
  currency: string;

  @ApiProperty({ example: 1900 })
  eligibleAmount: number;

  @ApiProperty({ example: 190 })
  couponDiscountAmount: number;

  @ApiProperty({ example: 1710 })
  totalAfterDiscount: number;
}

export class CouponDataDto {
  @ApiProperty({ type: CouponResponseDto })
  coupon: CouponResponseDto;
}

export class PaginationDto {
  @ApiProperty({ example: 1 })
  page: number;

  @ApiProperty({ example: 20 })
  limit: number;

  @ApiProperty({ example: 42 })
  total: number;

  @ApiProperty({ example: 3 })
  totalPages: number;
}

export class CouponListDataDto {
  @ApiProperty({ type: [CouponResponseDto] })
  items: CouponResponseDto[];

  @ApiProperty({ type: PaginationDto })
  pagination: PaginationDto;
}

export class CouponApplyDataDto extends CouponCalculationDto {
  @ApiProperty({ type: CouponOrderSummaryDto })
  order: CouponOrderSummaryDto;
}

export class CouponRemoveDataDto {
  @ApiProperty({ type: CouponOrderSummaryDto })
  order: CouponOrderSummaryDto;
}

export class EmptyCouponDataDto {}

export class CouponApiResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ example: 'Coupon returned successfully' })
  message: string;

  @ApiProperty({ type: CouponDataDto })
  data: CouponDataDto;
}

export class CouponListApiResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ example: 'Coupons returned successfully' })
  message: string;

  @ApiProperty({ type: CouponListDataDto })
  data: CouponListDataDto;
}

export class CouponDeleteApiResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ example: 'Coupon deleted successfully' })
  message: string;

  @ApiProperty({ type: EmptyCouponDataDto })
  data: EmptyCouponDataDto;
}

export class CouponValidateApiResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ example: 'Coupon is valid' })
  message: string;

  @ApiProperty({ type: CouponCalculationDto })
  data: CouponCalculationDto;
}

export class CouponApplyApiResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ example: 'Coupon applied successfully' })
  message: string;

  @ApiProperty({ type: CouponApplyDataDto })
  data: CouponApplyDataDto;
}

export class CouponRemoveApiResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ example: 'Coupon removed successfully' })
  message: string;

  @ApiProperty({ type: CouponRemoveDataDto })
  data: CouponRemoveDataDto;
}
