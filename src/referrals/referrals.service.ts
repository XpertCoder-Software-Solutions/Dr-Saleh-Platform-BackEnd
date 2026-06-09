import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PaymentStatus, Prisma } from '@prisma/client';
import { randomBytes } from 'crypto';
import referralConfig, { type ReferralConfig } from '../config/referral.config';
import { PrismaService } from '../database/prisma.service';
import { ApplyReferralCodeDto } from './dto/apply-referral-code.dto';
import {
  AdminReferralQueryDto,
  ReferralQueryDto,
} from './dto/referral-query.dto';

const referralUserSelect = {
  id: true,
  fullName: true,
  email: true,
  phoneNumber: true,
} satisfies Prisma.UserSelect;

const referralSelect = {
  id: true,
  referrerUserId: true,
  referredUserId: true,
  referralCode: true,
  rewardCouponId: true,
  isRewarded: true,
  rewardedAt: true,
  createdAt: true,
  updatedAt: true,
  referrerUser: {
    select: referralUserSelect,
  },
  referredUser: {
    select: referralUserSelect,
  },
  rewardCoupon: {
    select: {
      id: true,
      code: true,
      type: true,
      value: true,
      expiresAt: true,
    },
  },
} satisfies Prisma.ReferralSelect;

type ReferralRecord = Prisma.ReferralGetPayload<{
  select: typeof referralSelect;
}>;

type ReferrerRecord = {
  id: string;
  referralCode: string | null;
};

@Injectable()
export class ReferralsService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(referralConfig.KEY)
    private readonly referralConfiguration: ReferralConfig,
  ) {}

  async getMyCode(userId: string) {
    const referralCode = await this.ensureReferralCodeForUser(userId);

    return {
      message: 'Referral code returned successfully',
      data: {
        referral: { referralCode },
      },
    };
  }

  async findMyReferrals(userId: string, query: ReferralQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;
    const where: Prisma.ReferralWhereInput = { referrerUserId: userId };

    const [total, referrals] = await this.prisma.$transaction([
      this.prisma.referral.count({ where }),
      this.prisma.referral.findMany({
        where,
        select: referralSelect,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
    ]);

    return {
      message: 'Referrals returned successfully',
      data: {
        items: referrals.map((referral) => this.toReferral(referral)),
        pagination: this.toPagination(page, limit, total),
      },
    };
  }

  async applyCode(userId: string, applyReferralCodeDto: ApplyReferralCodeDto) {
    const referralCode = applyReferralCodeDto.referralCode;
    const [currentUser, referrer, paidOrdersCount] = await Promise.all([
      this.findReferralApplicantOrThrow(userId),
      this.findReferrerByCodeOrThrow(referralCode),
      this.countPaidOrders(userId),
    ]);

    if (referrer.id === userId) {
      throw new ConflictException('User cannot refer himself.');
    }

    if (currentUser.referredByUserId || currentUser.referralReceived) {
      throw new ConflictException('User has already been referred.');
    }

    if (paidOrdersCount > 0) {
      throw new ConflictException(
        'Referral code cannot be applied after placing a paid order.',
      );
    }

    await this.ensureReferralCodeForUser(userId);

    try {
      const referral = await this.prisma.$transaction(async (tx) => {
        const updatedUser = await tx.user.updateMany({
          where: {
            id: userId,
            referredByUserId: null,
          },
          data: {
            referredByUserId: referrer.id,
          },
        });

        if (updatedUser.count !== 1) {
          throw new ConflictException('User has already been referred.');
        }

        return tx.referral.create({
          data: {
            referrerUserId: referrer.id,
            referredUserId: userId,
            referralCode: referrer.referralCode ?? referralCode,
          },
          select: referralSelect,
        });
      });

      return {
        message: 'Referral code applied successfully',
        data: {
          referral: this.toReferral(referral),
        },
      };
    } catch (error) {
      this.handleReferralPersistenceError(error);
    }
  }

  async adminFindAll(query: AdminReferralQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;
    const where: Prisma.ReferralWhereInput = {
      ...(query.referrerUserId ? { referrerUserId: query.referrerUserId } : {}),
      ...(query.referredUserId ? { referredUserId: query.referredUserId } : {}),
      ...(query.isRewarded === undefined
        ? {}
        : { isRewarded: query.isRewarded }),
    };

    const [total, referrals] = await this.prisma.$transaction([
      this.prisma.referral.count({ where }),
      this.prisma.referral.findMany({
        where,
        select: referralSelect,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
    ]);

    return {
      message: 'Referrals returned successfully',
      data: {
        items: referrals.map((referral) => this.toReferral(referral)),
        pagination: this.toPagination(page, limit, total),
      },
    };
  }

  async adminFindOne(id: string) {
    const referral = await this.prisma.referral.findUnique({
      where: { id },
      select: referralSelect,
    });

    if (!referral) {
      throw new NotFoundException('Referral not found.');
    }

    return {
      message: 'Referral returned successfully',
      data: {
        referral: this.toReferral(referral),
      },
    };
  }

  async rewardReferralAfterFirstPaidOrder(userId: string): Promise<void> {
    const [referral, paidOrdersCount] = await Promise.all([
      this.prisma.referral.findUnique({
        where: { referredUserId: userId },
        select: {
          id: true,
          referrerUserId: true,
          referredUserId: true,
          referralCode: true,
          isRewarded: true,
        },
      }),
      this.countPaidOrders(userId),
    ]);

    if (!referral || referral.isRewarded || paidOrdersCount === 0) {
      return;
    }

    for (let attempt = 0; attempt < 5; attempt += 1) {
      try {
        await this.prisma.$transaction(async (tx) => {
          const now = new Date();
          const rewardGate = await tx.referral.updateMany({
            where: {
              id: referral.id,
              isRewarded: false,
            },
            data: {
              isRewarded: true,
              rewardedAt: now,
            },
          });

          if (rewardGate.count !== 1) {
            return;
          }

          const coupon = await tx.coupon.create({
            data: {
              code: this.generateRewardCouponCode(referral.referralCode),
              name: 'Referral Reward',
              description:
                'Referral reward coupon issued after the referred user completed their first paid order.',
              type: this.referralConfiguration.rewardType,
              value: this.referralConfiguration.rewardValue,
              usageLimit: 1,
              usedCount: 0,
              startsAt: now,
              expiresAt: this.addDays(
                now,
                this.referralConfiguration.couponExpiresDays,
              ),
              isReferralCoupon: true,
              isActive: true,
            },
            select: { id: true },
          });

          await tx.referral.update({
            where: { id: referral.id },
            data: {
              rewardCouponId: coupon.id,
            },
          });
        });

        return;
      } catch (error) {
        if (this.isUniqueConstraintError(error) && attempt < 4) {
          continue;
        }

        throw error;
      }
    }
  }

  async ensureReferralCodeForUser(userId: string): Promise<string> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        referralCode: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found.');
    }

    if (user.referralCode) {
      return user.referralCode;
    }

    for (let attempt = 0; attempt < 5; attempt += 1) {
      try {
        const referralCode = this.generateReferralCode();
        await this.prisma.user.update({
          where: { id: user.id },
          data: { referralCode },
        });

        return referralCode;
      } catch (error) {
        if (this.isUniqueConstraintError(error) && attempt < 4) {
          continue;
        }

        throw error;
      }
    }

    throw new ConflictException('Could not generate a unique referral code.');
  }

  async findReferrerByCodeOrThrow(
    referralCode: string,
  ): Promise<ReferrerRecord> {
    const referrer = await this.prisma.user.findUnique({
      where: { referralCode },
      select: {
        id: true,
        referralCode: true,
      },
    });

    if (!referrer) {
      throw new NotFoundException('Referral code not found.');
    }

    return referrer;
  }

  private async findReferralApplicantOrThrow(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        referralCode: true,
        referredByUserId: true,
        referralReceived: {
          select: { id: true },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found.');
    }

    return user;
  }

  private async countPaidOrders(userId: string): Promise<number> {
    return this.prisma.order.count({
      where: {
        userId,
        paymentStatus: PaymentStatus.PAID,
      },
    });
  }

  private generateReferralCode(): string {
    return randomBytes(4).toString('hex').toUpperCase();
  }

  private generateRewardCouponCode(referralCode: string): string {
    return `REF-${referralCode.slice(0, 12)}-${randomBytes(3).toString('hex').toUpperCase()}`;
  }

  private addDays(date: Date, days: number): Date {
    const nextDate = new Date(date);
    nextDate.setDate(nextDate.getDate() + days);

    return nextDate;
  }

  private toReferral(referral: ReferralRecord) {
    return {
      id: referral.id,
      referrerUserId: referral.referrerUserId,
      referredUserId: referral.referredUserId,
      referralCode: referral.referralCode,
      rewardCouponId: referral.rewardCouponId,
      isRewarded: referral.isRewarded,
      rewardedAt: referral.rewardedAt,
      createdAt: referral.createdAt,
      updatedAt: referral.updatedAt,
      referrerUser: referral.referrerUser,
      referredUser: referral.referredUser,
      rewardCoupon: referral.rewardCoupon
        ? {
            id: referral.rewardCoupon.id,
            code: referral.rewardCoupon.code,
            type: referral.rewardCoupon.type,
            value: this.toNumberFromDecimal(referral.rewardCoupon.value),
            expiresAt: referral.rewardCoupon.expiresAt,
          }
        : null,
    };
  }

  private toPagination(page: number, limit: number, total: number) {
    return {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    };
  }

  private toNumberFromDecimal(decimal: Prisma.Decimal): number {
    return Number(decimal.toString());
  }

  private isUniqueConstraintError(error: unknown): boolean {
    return (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    );
  }

  private handleReferralPersistenceError(error: unknown): never {
    if (this.isUniqueConstraintError(error)) {
      throw new ConflictException('User has already been referred.');
    }

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2003'
    ) {
      throw new BadRequestException('Referral relation is invalid.');
    }

    throw error;
  }
}
