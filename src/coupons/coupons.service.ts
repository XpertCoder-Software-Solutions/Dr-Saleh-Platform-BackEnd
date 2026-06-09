import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  CouponType,
  Currency,
  OrderStatus,
  PaymentStatus,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { CouponActionDto } from './dto/coupon-action.dto';
import { CouponQueryDto } from './dto/coupon-query.dto';
import { CreateCouponDto } from './dto/create-coupon.dto';
import { UpdateCouponDto } from './dto/update-coupon.dto';

const couponSelect = {
  id: true,
  code: true,
  name: true,
  description: true,
  type: true,
  value: true,
  minimumOrderAmount: true,
  maximumDiscountAmount: true,
  usageLimit: true,
  usedCount: true,
  startsAt: true,
  expiresAt: true,
  isReferralCoupon: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.CouponSelect;

const orderCouponSelect = {
  id: true,
  userId: true,
  orderNumber: true,
  status: true,
  paymentStatus: true,
  currency: true,
  subtotal: true,
  discountAmount: true,
  totalAmount: true,
  couponId: true,
  items: {
    select: {
      quantity: true,
      unitPrice: true,
      discountPrice: true,
    },
  },
  couponUsage: {
    select: {
      id: true,
      couponId: true,
      discountAmount: true,
    },
  },
  payments: {
    select: {
      id: true,
      status: true,
    },
  },
} satisfies Prisma.OrderSelect;

type CouponRecord = Prisma.CouponGetPayload<{ select: typeof couponSelect }>;
type OrderCouponRecord = Prisma.OrderGetPayload<{
  select: typeof orderCouponSelect;
}>;

type CouponCalculation = {
  coupon: CouponRecord;
  currency: string;
  eligibleAmount: number;
  couponDiscountAmount: number;
  totalAfterDiscount: number;
};

@Injectable()
export class CouponsService {
  constructor(private readonly prisma: PrismaService) {}

  async adminCreate(createCouponDto: CreateCouponDto) {
    this.assertCouponPayload(createCouponDto);

    try {
      const coupon = await this.prisma.coupon.create({
        data: {
          code: createCouponDto.code,
          name: createCouponDto.name,
          description: createCouponDto.description,
          type: createCouponDto.type,
          value: createCouponDto.value,
          minimumOrderAmount: createCouponDto.minimumOrderAmount,
          maximumDiscountAmount: createCouponDto.maximumDiscountAmount,
          usageLimit: createCouponDto.usageLimit,
          startsAt: new Date(createCouponDto.startsAt),
          expiresAt: new Date(createCouponDto.expiresAt),
          isReferralCoupon: createCouponDto.isReferralCoupon ?? false,
          isActive: createCouponDto.isActive ?? true,
        },
        select: couponSelect,
      });

      return {
        message: 'Coupon created successfully',
        data: { coupon: this.toCoupon(coupon) },
      };
    } catch (error) {
      this.handleCouponPersistenceError(error);
    }
  }

  async adminFindAll(query: CouponQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;
    const where: Prisma.CouponWhereInput = {
      ...(query.search
        ? {
            OR: [
              { code: { contains: query.search, mode: 'insensitive' } },
              { name: { contains: query.search, mode: 'insensitive' } },
              { description: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
      ...(query.type ? { type: query.type } : {}),
      ...(query.isActive === undefined ? {} : { isActive: query.isActive }),
      ...(query.isReferralCoupon === undefined
        ? {}
        : { isReferralCoupon: query.isReferralCoupon }),
    };

    const [total, coupons] = await this.prisma.$transaction([
      this.prisma.coupon.count({ where }),
      this.prisma.coupon.findMany({
        where,
        select: couponSelect,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
    ]);

    return {
      message: 'Coupons returned successfully',
      data: {
        items: coupons.map((coupon) => this.toCoupon(coupon)),
        pagination: this.toPagination(page, limit, total),
      },
    };
  }

  async adminFindOne(id: string) {
    const coupon = await this.findCouponByIdOrThrow(id);

    return {
      message: 'Coupon returned successfully',
      data: { coupon: this.toCoupon(coupon) },
    };
  }

  async adminUpdate(id: string, updateCouponDto: UpdateCouponDto) {
    const currentCoupon = await this.findCouponByIdOrThrow(id);
    const mergedCoupon = {
      code: updateCouponDto.code ?? currentCoupon.code,
      name: updateCouponDto.name ?? currentCoupon.name,
      description:
        updateCouponDto.description === undefined
          ? (currentCoupon.description ?? undefined)
          : updateCouponDto.description,
      type: updateCouponDto.type ?? currentCoupon.type,
      value:
        updateCouponDto.value ?? this.toNumberFromDecimal(currentCoupon.value),
      minimumOrderAmount:
        updateCouponDto.minimumOrderAmount ??
        this.toOptionalNumberOrUndefined(currentCoupon.minimumOrderAmount),
      maximumDiscountAmount:
        updateCouponDto.maximumDiscountAmount ??
        this.toOptionalNumberOrUndefined(currentCoupon.maximumDiscountAmount),
      usageLimit:
        updateCouponDto.usageLimit ?? currentCoupon.usageLimit ?? undefined,
      startsAt:
        updateCouponDto.startsAt ?? currentCoupon.startsAt.toISOString(),
      expiresAt:
        updateCouponDto.expiresAt ?? currentCoupon.expiresAt.toISOString(),
      isReferralCoupon:
        updateCouponDto.isReferralCoupon ?? currentCoupon.isReferralCoupon,
      isActive: updateCouponDto.isActive ?? currentCoupon.isActive,
    };

    this.assertCouponPayload(mergedCoupon);

    try {
      const coupon = await this.prisma.coupon.update({
        where: { id: currentCoupon.id },
        data: {
          code: updateCouponDto.code,
          name: updateCouponDto.name,
          description:
            updateCouponDto.description === undefined
              ? undefined
              : updateCouponDto.description,
          type: updateCouponDto.type,
          value: updateCouponDto.value,
          minimumOrderAmount:
            updateCouponDto.minimumOrderAmount === undefined
              ? undefined
              : updateCouponDto.minimumOrderAmount,
          maximumDiscountAmount:
            updateCouponDto.maximumDiscountAmount === undefined
              ? undefined
              : updateCouponDto.maximumDiscountAmount,
          usageLimit:
            updateCouponDto.usageLimit === undefined
              ? undefined
              : updateCouponDto.usageLimit,
          startsAt: updateCouponDto.startsAt
            ? new Date(updateCouponDto.startsAt)
            : undefined,
          expiresAt: updateCouponDto.expiresAt
            ? new Date(updateCouponDto.expiresAt)
            : undefined,
          isReferralCoupon: updateCouponDto.isReferralCoupon,
          isActive: updateCouponDto.isActive,
        },
        select: couponSelect,
      });

      return {
        message: 'Coupon updated successfully',
        data: { coupon: this.toCoupon(coupon) },
      };
    } catch (error) {
      this.handleCouponPersistenceError(error);
    }
  }

  async adminDelete(id: string) {
    await this.findCouponByIdOrThrow(id);

    try {
      await this.prisma.coupon.delete({ where: { id } });
    } catch (error) {
      this.handleCouponPersistenceError(
        error,
        'Coupon is already referenced by orders or usages.',
      );
    }

    return {
      message: 'Coupon deleted successfully',
      data: {},
    };
  }

  async validateCoupon(userId: string, couponActionDto: CouponActionDto) {
    const [order, coupon] = await Promise.all([
      this.findOwnedPendingOrderOrThrow(userId, couponActionDto.orderId),
      this.findCouponByCodeOrThrow(couponActionDto.code),
    ]);
    const calculation = this.calculateApplicableCoupon(coupon, order);

    return {
      message: 'Coupon is valid',
      data: this.toCouponCalculation(calculation),
    };
  }

  async applyCoupon(userId: string, couponActionDto: CouponActionDto) {
    const [order, coupon] = await Promise.all([
      this.findOwnedPendingOrderOrThrow(userId, couponActionDto.orderId),
      this.findCouponByCodeOrThrow(couponActionDto.code),
    ]);
    const calculation = this.calculateApplicableCoupon(coupon, order);

    if (order.couponId === coupon.id && order.couponUsage) {
      return {
        message: 'Coupon already applied',
        data: {
          ...this.toCouponCalculation(calculation),
          order: this.toOrderSummary(order),
        },
      };
    }

    const updatedOrder = await this.prisma.$transaction(async (tx) => {
      const incrementedCoupon = await tx.coupon.updateMany({
        where: {
          id: coupon.id,
          ...(coupon.usageLimit === null
            ? {}
            : { usedCount: { lt: coupon.usageLimit } }),
        },
        data: {
          usedCount: { increment: 1 },
        },
      });

      if (incrementedCoupon.count !== 1) {
        throw new ConflictException('Coupon usage limit has been reached.');
      }

      await tx.couponUsage.create({
        data: {
          couponId: coupon.id,
          userId,
          orderId: order.id,
          discountAmount: calculation.couponDiscountAmount,
          currency: this.toCurrencyEnum(order.currency),
        },
      });

      return tx.order.update({
        where: { id: order.id },
        data: {
          couponId: coupon.id,
          discountAmount: this.roundMoney(
            this.calculateOrderItemDiscount(order) +
              calculation.couponDiscountAmount,
          ),
          totalAmount: calculation.totalAfterDiscount,
        },
        select: orderCouponSelect,
      });
    });

    return {
      message: 'Coupon applied successfully',
      data: {
        ...this.toCouponCalculation(calculation),
        order: this.toOrderSummary(updatedOrder),
      },
    };
  }

  async removeCoupon(userId: string, orderId: string) {
    const order = await this.findOwnedPendingOrderOrThrow(userId, orderId);

    if (!order.couponId) {
      throw new BadRequestException('No coupon is applied to this order.');
    }

    const itemDiscount = this.calculateOrderItemDiscount(order);
    const totalAfterRemoval = this.roundMoney(
      this.toNumberFromDecimal(order.subtotal) - itemDiscount,
    );
    const updatedOrder = await this.prisma.$transaction(async (tx) => {
      if (order.couponUsage) {
        await tx.couponUsage.delete({
          where: { id: order.couponUsage.id },
        });
        await tx.coupon.updateMany({
          where: {
            id: order.couponUsage.couponId,
            usedCount: { gt: 0 },
          },
          data: {
            usedCount: { decrement: 1 },
          },
        });
      }

      return tx.order.update({
        where: { id: order.id },
        data: {
          couponId: null,
          discountAmount: itemDiscount,
          totalAmount: totalAfterRemoval,
        },
        select: orderCouponSelect,
      });
    });

    return {
      message: 'Coupon removed successfully',
      data: {
        order: this.toOrderSummary(updatedOrder),
      },
    };
  }

  private async findCouponByIdOrThrow(id: string): Promise<CouponRecord> {
    const coupon = await this.prisma.coupon.findUnique({
      where: { id },
      select: couponSelect,
    });

    if (!coupon) {
      throw new NotFoundException('Coupon not found.');
    }

    return coupon;
  }

  private async findCouponByCodeOrThrow(code: string): Promise<CouponRecord> {
    const coupon = await this.prisma.coupon.findUnique({
      where: { code },
      select: couponSelect,
    });

    if (!coupon) {
      throw new NotFoundException('Coupon not found.');
    }

    return coupon;
  }

  private async findOwnedPendingOrderOrThrow(
    userId: string,
    orderId: string,
  ): Promise<OrderCouponRecord> {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, userId },
      select: orderCouponSelect,
    });

    if (!order) {
      throw new NotFoundException('Order not found.');
    }

    if (order.status !== OrderStatus.PENDING) {
      throw new ConflictException(
        'Coupons can be used only on pending orders.',
      );
    }

    if (order.paymentStatus !== PaymentStatus.PENDING) {
      throw new ConflictException('Coupons can be used only on unpaid orders.');
    }

    const activePaymentStatuses = new Set<PaymentStatus>([
      PaymentStatus.PENDING,
      PaymentStatus.PAID,
    ]);

    if (
      order.payments.some((payment) =>
        activePaymentStatuses.has(payment.status),
      )
    ) {
      throw new ConflictException(
        'Coupon cannot be changed after a payment request has been created.',
      );
    }

    if (order.items.length === 0) {
      throw new BadRequestException('Order has no items.');
    }

    return order;
  }

  private calculateApplicableCoupon(
    coupon: CouponRecord,
    order: OrderCouponRecord,
  ): CouponCalculation {
    this.assertCouponIsAvailable(coupon);

    if (order.couponId && order.couponId !== coupon.id) {
      throw new ConflictException(
        'Only one coupon can be applied to an order. Remove the current coupon first.',
      );
    }

    const eligibleAmount = this.calculateCouponEligibleAmount(order);
    const minimumOrderAmount = this.toOptionalNumberOrNull(
      coupon.minimumOrderAmount,
    );

    if (minimumOrderAmount !== null && eligibleAmount < minimumOrderAmount) {
      throw new ConflictException(
        `Minimum order amount for this coupon is ${minimumOrderAmount}.`,
      );
    }

    const couponDiscountAmount = this.calculateCouponDiscount(
      coupon,
      eligibleAmount,
    );

    if (couponDiscountAmount <= 0) {
      throw new BadRequestException(
        'Coupon discount amount must be greater than 0.',
      );
    }

    return {
      coupon,
      currency: order.currency,
      eligibleAmount,
      couponDiscountAmount,
      totalAfterDiscount: this.roundMoney(
        eligibleAmount - couponDiscountAmount,
      ),
    };
  }

  private assertCouponIsAvailable(coupon: CouponRecord): void {
    const now = new Date();

    if (!coupon.isActive) {
      throw new ConflictException('Coupon is inactive.');
    }

    if (coupon.startsAt > now) {
      throw new ConflictException('Coupon has not started yet.');
    }

    if (coupon.expiresAt < now) {
      throw new ConflictException('Coupon has expired.');
    }

    if (coupon.usageLimit !== null && coupon.usedCount >= coupon.usageLimit) {
      throw new ConflictException('Coupon usage limit has been reached.');
    }
  }

  private calculateCouponEligibleAmount(order: OrderCouponRecord): number {
    return this.roundMoney(
      this.toNumberFromDecimal(order.subtotal) -
        this.calculateOrderItemDiscount(order),
    );
  }

  private calculateOrderItemDiscount(order: OrderCouponRecord): number {
    return this.roundMoney(
      order.items.reduce((total, item) => {
        const unitPrice = this.toNumberFromDecimal(item.unitPrice);
        const discountPrice = this.toOptionalNumberOrNull(item.discountPrice);

        return (
          total + (unitPrice - (discountPrice ?? unitPrice)) * item.quantity
        );
      }, 0),
    );
  }

  private calculateCouponDiscount(
    coupon: CouponRecord,
    eligibleAmount: number,
  ): number {
    const couponValue = this.toNumberFromDecimal(coupon.value);
    const rawDiscount =
      coupon.type === CouponType.PERCENTAGE
        ? eligibleAmount * (couponValue / 100)
        : couponValue;
    const maximumDiscountAmount = this.toOptionalNumberOrNull(
      coupon.maximumDiscountAmount,
    );
    const cappedDiscount =
      maximumDiscountAmount === null
        ? rawDiscount
        : Math.min(rawDiscount, maximumDiscountAmount);

    return this.roundMoney(Math.min(cappedDiscount, eligibleAmount));
  }

  private assertCouponPayload(
    coupon: Pick<
      CreateCouponDto,
      | 'type'
      | 'value'
      | 'minimumOrderAmount'
      | 'maximumDiscountAmount'
      | 'usageLimit'
      | 'startsAt'
      | 'expiresAt'
    >,
  ): void {
    if (coupon.type === CouponType.PERCENTAGE && coupon.value > 100) {
      throw new BadRequestException(
        'Percentage coupon value must be between 0.01 and 100.',
      );
    }

    const startsAt = new Date(coupon.startsAt);
    const expiresAt = new Date(coupon.expiresAt);

    if (Number.isNaN(startsAt.getTime()) || Number.isNaN(expiresAt.getTime())) {
      throw new BadRequestException('Coupon date range is invalid.');
    }

    if (startsAt >= expiresAt) {
      throw new BadRequestException('expiresAt must be after startsAt.');
    }

    if (
      coupon.minimumOrderAmount !== undefined &&
      coupon.maximumDiscountAmount !== undefined &&
      coupon.maximumDiscountAmount > coupon.minimumOrderAmount &&
      coupon.type === CouponType.FIXED_AMOUNT
    ) {
      throw new BadRequestException(
        'maximumDiscountAmount cannot exceed minimumOrderAmount for fixed coupons.',
      );
    }
  }

  private toCoupon(coupon: CouponRecord) {
    return {
      id: coupon.id,
      code: coupon.code,
      name: coupon.name,
      description: coupon.description,
      type: coupon.type,
      value: this.toNumberFromDecimal(coupon.value),
      minimumOrderAmount: this.toOptionalNumberOrNull(
        coupon.minimumOrderAmount,
      ),
      maximumDiscountAmount: this.toOptionalNumberOrNull(
        coupon.maximumDiscountAmount,
      ),
      usageLimit: coupon.usageLimit,
      usedCount: coupon.usedCount,
      startsAt: coupon.startsAt,
      expiresAt: coupon.expiresAt,
      isReferralCoupon: coupon.isReferralCoupon,
      isActive: coupon.isActive,
      createdAt: coupon.createdAt,
      updatedAt: coupon.updatedAt,
    };
  }

  private toCouponCalculation(calculation: CouponCalculation) {
    return {
      coupon: this.toCoupon(calculation.coupon),
      currency: calculation.currency,
      eligibleAmount: calculation.eligibleAmount,
      couponDiscountAmount: calculation.couponDiscountAmount,
      totalAfterDiscount: calculation.totalAfterDiscount,
    };
  }

  private toOrderSummary(order: OrderCouponRecord) {
    return {
      id: order.id,
      orderNumber: order.orderNumber,
      currency: order.currency,
      subtotal: this.toNumberFromDecimal(order.subtotal),
      discountAmount: this.toNumberFromDecimal(order.discountAmount),
      totalAmount: this.toNumberFromDecimal(order.totalAmount),
      couponId: order.couponId,
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

  private roundMoney(value: number): number {
    return Number(value.toFixed(2));
  }

  private toCurrencyEnum(currency: string): Currency {
    return currency === Currency.USD ? Currency.USD : Currency.EGP;
  }

  private toNumberFromDecimal(decimal: Prisma.Decimal): number {
    return Number(decimal.toString());
  }

  private toOptionalNumberOrNull(
    decimal: Prisma.Decimal | null,
  ): number | null {
    return decimal === null ? null : this.toNumberFromDecimal(decimal);
  }

  private toOptionalNumberOrUndefined(
    decimal: Prisma.Decimal | null,
  ): number | undefined {
    return decimal === null ? undefined : this.toNumberFromDecimal(decimal);
  }

  private handleCouponPersistenceError(
    error: unknown,
    foreignKeyMessage = 'Coupon cannot be deleted because it is already referenced.',
  ): never {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new ConflictException('Coupon code already exists.');
    }

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2003'
    ) {
      throw new ConflictException(foreignKeyMessage);
    }

    throw error;
  }
}
