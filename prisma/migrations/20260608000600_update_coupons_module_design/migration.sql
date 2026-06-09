ALTER TABLE "coupons" RENAME COLUMN "title" TO "name";
ALTER TABLE "coupons" RENAME COLUMN "couponType" TO "type";

UPDATE "coupons"
SET "name" = "code"
WHERE "name" IS NULL;

ALTER TABLE "coupons" ALTER COLUMN "name" SET NOT NULL;
ALTER TABLE "coupons" ADD COLUMN "isReferralCoupon" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "coupons" DROP COLUMN IF EXISTS "currency";
ALTER TABLE "coupons" DROP COLUMN IF EXISTS "usagePerUserLimit";
