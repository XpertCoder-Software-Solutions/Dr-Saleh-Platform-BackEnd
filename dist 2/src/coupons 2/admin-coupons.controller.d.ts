import { CouponsService } from './coupons.service';
import { CouponQueryDto } from './dto/coupon-query.dto';
import { CreateCouponDto } from './dto/create-coupon.dto';
import { UpdateCouponDto } from './dto/update-coupon.dto';
export declare class AdminCouponsController {
    private readonly couponsService;
    constructor(couponsService: CouponsService);
    create(createCouponDto: CreateCouponDto): Promise<{
        message: string;
        data: {
            coupon: {
                id: string;
                code: string;
                name: string;
                description: string | null;
                type: import("@prisma/client").$Enums.CouponType;
                value: number;
                minimumOrderAmount: number | null;
                maximumDiscountAmount: number | null;
                usageLimit: number | null;
                usedCount: number;
                startsAt: Date;
                expiresAt: Date;
                isReferralCoupon: boolean;
                isActive: boolean;
                createdAt: Date;
                updatedAt: Date;
            };
        };
    }>;
    findAll(query: CouponQueryDto): Promise<{
        message: string;
        data: {
            items: {
                id: string;
                code: string;
                name: string;
                description: string | null;
                type: import("@prisma/client").$Enums.CouponType;
                value: number;
                minimumOrderAmount: number | null;
                maximumDiscountAmount: number | null;
                usageLimit: number | null;
                usedCount: number;
                startsAt: Date;
                expiresAt: Date;
                isReferralCoupon: boolean;
                isActive: boolean;
                createdAt: Date;
                updatedAt: Date;
            }[];
            pagination: import("../common/utils/pagination").PaginationMeta;
        };
    }>;
    findOne(id: string): Promise<{
        message: string;
        data: {
            coupon: {
                id: string;
                code: string;
                name: string;
                description: string | null;
                type: import("@prisma/client").$Enums.CouponType;
                value: number;
                minimumOrderAmount: number | null;
                maximumDiscountAmount: number | null;
                usageLimit: number | null;
                usedCount: number;
                startsAt: Date;
                expiresAt: Date;
                isReferralCoupon: boolean;
                isActive: boolean;
                createdAt: Date;
                updatedAt: Date;
            };
        };
    }>;
    update(id: string, updateCouponDto: UpdateCouponDto): Promise<{
        message: string;
        data: {
            coupon: {
                id: string;
                code: string;
                name: string;
                description: string | null;
                type: import("@prisma/client").$Enums.CouponType;
                value: number;
                minimumOrderAmount: number | null;
                maximumDiscountAmount: number | null;
                usageLimit: number | null;
                usedCount: number;
                startsAt: Date;
                expiresAt: Date;
                isReferralCoupon: boolean;
                isActive: boolean;
                createdAt: Date;
                updatedAt: Date;
            };
        };
    }>;
    remove(id: string): Promise<{
        message: string;
        data: {};
    }>;
}
