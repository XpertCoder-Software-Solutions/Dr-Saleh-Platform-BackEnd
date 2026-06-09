import { ConfigType, registerAs } from '@nestjs/config';
import { CouponType } from '@prisma/client';

const referralConfig = registerAs('referral', () => ({
  rewardType: (process.env.REFERRAL_REWARD_TYPE ??
    CouponType.PERCENTAGE) as CouponType,
  rewardValue: Number(process.env.REFERRAL_REWARD_VALUE ?? 10),
  couponExpiresDays: Number(process.env.REFERRAL_COUPON_EXPIRES_DAYS ?? 30),
}));

export type ReferralConfig = ConfigType<typeof referralConfig>;

export default referralConfig;
