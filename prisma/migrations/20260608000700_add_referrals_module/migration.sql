ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "referralCode" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "referredByUserId" UUID;

UPDATE "users"
SET "referralCode" = 'DS' || replace("id"::text, '-', '')
WHERE "referralCode" IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "users_referralCode_key" ON "users"("referralCode");
CREATE INDEX IF NOT EXISTS "users_referredByUserId_idx" ON "users"("referredByUserId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'users_referredByUserId_fkey'
  ) THEN
    ALTER TABLE "users"
    ADD CONSTRAINT "users_referredByUserId_fkey"
    FOREIGN KEY ("referredByUserId") REFERENCES "users"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

ALTER TABLE "referrals" RENAME COLUMN "isRewardGranted" TO "isRewarded";
ALTER TABLE "referrals" RENAME COLUMN "rewardGrantedAt" TO "rewardedAt";
ALTER TABLE "referrals" ADD COLUMN IF NOT EXISTS "referralCode" TEXT;
ALTER TABLE "referrals" ADD COLUMN IF NOT EXISTS "rewardCouponId" UUID;

UPDATE "referrals" AS r
SET "referralCode" = u."referralCode"
FROM "users" AS u
WHERE r."referrerUserId" = u."id"
  AND r."referralCode" IS NULL;

UPDATE "referrals"
SET "referralCode" = 'LEGACY-' || replace("id"::text, '-', '')
WHERE "referralCode" IS NULL;

ALTER TABLE "referrals" ALTER COLUMN "referralCode" SET NOT NULL;

UPDATE "users" AS u
SET "referredByUserId" = r."referrerUserId"
FROM "referrals" AS r
WHERE u."id" = r."referredUserId"
  AND u."referredByUserId" IS NULL;

CREATE INDEX IF NOT EXISTS "referrals_referredUserId_idx" ON "referrals"("referredUserId");
CREATE INDEX IF NOT EXISTS "referrals_rewardCouponId_idx" ON "referrals"("rewardCouponId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'referrals_rewardCouponId_fkey'
  ) THEN
    ALTER TABLE "referrals"
    ADD CONSTRAINT "referrals_rewardCouponId_fkey"
    FOREIGN KEY ("rewardCouponId") REFERENCES "coupons"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
