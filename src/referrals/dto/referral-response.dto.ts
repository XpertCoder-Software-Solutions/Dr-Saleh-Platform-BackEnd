import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CouponType } from '@prisma/client';

export class ReferralCodeDto {
  @ApiProperty({ example: 'ABC123' })
  referralCode: string;
}

export class ReferralUserDto {
  @ApiProperty({ example: '6ea44107-c306-4c06-bf6f-8cf8ebf0ab33' })
  id: string;

  @ApiProperty({ example: 'Ahmed Saleh' })
  fullName: string;

  @ApiProperty({ example: 'ahmed@example.com' })
  email: string;

  @ApiProperty({ example: '+201001234567' })
  phoneNumber: string;
}

export class ReferralRewardCouponDto {
  @ApiProperty({ example: 'd0cd9afd-23d6-4c2d-b7c9-4328756da109' })
  id: string;

  @ApiProperty({ example: 'REF-ABC123-8F2K9D' })
  code: string;

  @ApiProperty({
    enum: CouponType,
    enumName: 'CouponType',
    example: CouponType.PERCENTAGE,
  })
  type: CouponType;

  @ApiProperty({ example: 10 })
  value: number;

  @ApiProperty({ example: '2026-07-08T00:00:00.000Z' })
  expiresAt: Date;
}

export class ReferralResponseDto {
  @ApiProperty({ example: 'd0cd9afd-23d6-4c2d-b7c9-4328756da109' })
  id: string;

  @ApiProperty({ example: '6ea44107-c306-4c06-bf6f-8cf8ebf0ab33' })
  referrerUserId: string;

  @ApiProperty({ example: '73d95ad4-471d-42ea-9f5f-a1662ebc719c' })
  referredUserId: string;

  @ApiProperty({ example: 'ABC123' })
  referralCode: string;

  @ApiProperty({
    example: 'd0cd9afd-23d6-4c2d-b7c9-4328756da109',
    nullable: true,
  })
  rewardCouponId: string | null;

  @ApiProperty({ example: false })
  isRewarded: boolean;

  @ApiProperty({ example: '2026-06-08T12:00:00.000Z', nullable: true })
  rewardedAt: Date | null;

  @ApiProperty({ example: '2026-06-08T12:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2026-06-08T12:00:00.000Z' })
  updatedAt: Date;

  @ApiPropertyOptional({ type: ReferralUserDto })
  referrerUser?: ReferralUserDto;

  @ApiPropertyOptional({ type: ReferralUserDto })
  referredUser?: ReferralUserDto;

  @ApiProperty({ type: ReferralRewardCouponDto, nullable: true })
  rewardCoupon: ReferralRewardCouponDto | null;
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

export class ReferralCodeDataDto {
  @ApiProperty({ type: ReferralCodeDto })
  referral: ReferralCodeDto;
}

export class ReferralDataDto {
  @ApiProperty({ type: ReferralResponseDto })
  referral: ReferralResponseDto;
}

export class ReferralListDataDto {
  @ApiProperty({ type: [ReferralResponseDto] })
  items: ReferralResponseDto[];

  @ApiProperty({ type: PaginationDto })
  pagination: PaginationDto;
}

export class ReferralCodeApiResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ example: 'Referral code returned successfully' })
  message: string;

  @ApiProperty({ type: ReferralCodeDataDto })
  data: ReferralCodeDataDto;
}

export class ReferralApiResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ example: 'Referral returned successfully' })
  message: string;

  @ApiProperty({ type: ReferralDataDto })
  data: ReferralDataDto;
}

export class ReferralListApiResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ example: 'Referrals returned successfully' })
  message: string;

  @ApiProperty({ type: ReferralListDataDto })
  data: ReferralListDataDto;
}
