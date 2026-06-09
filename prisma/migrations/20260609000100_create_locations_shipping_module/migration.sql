DO $$
BEGIN
  IF to_regclass('public.governorates') IS NULL
     AND to_regclass('public.shipping_governorates') IS NOT NULL THEN
    ALTER TABLE "shipping_governorates" RENAME TO "governorates";
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "governorates" (
    "id" UUID NOT NULL,
    "nameAr" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "shippingCost" DECIMAL(12,2) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "governorates_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "governorates" DROP COLUMN IF EXISTS "slug";

ALTER TABLE "user_addresses" DROP CONSTRAINT IF EXISTS "user_addresses_shippingGovernorateId_fkey";
ALTER TABLE "user_addresses" DROP CONSTRAINT IF EXISTS "user_addresses_governorateId_fkey";

DROP INDEX IF EXISTS "user_addresses_shippingGovernorateId_idx";
DROP INDEX IF EXISTS "user_addresses_governorateId_idx";

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'user_addresses'
      AND column_name = 'shippingGovernorateId'
  ) AND NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'user_addresses'
      AND column_name = 'governorateId'
  ) THEN
    ALTER TABLE "user_addresses" RENAME COLUMN "shippingGovernorateId" TO "governorateId";
  END IF;
END $$;

ALTER TABLE "user_addresses" ADD COLUMN IF NOT EXISTS "governorateId" UUID;
ALTER TABLE "user_addresses" ADD COLUMN IF NOT EXISTS "street" TEXT;
ALTER TABLE "user_addresses" ADD COLUMN IF NOT EXISTS "buildingNumber" TEXT;
ALTER TABLE "user_addresses" ADD COLUMN IF NOT EXISTS "floor" TEXT;
ALTER TABLE "user_addresses" ADD COLUMN IF NOT EXISTS "apartment" TEXT;
ALTER TABLE "user_addresses" ADD COLUMN IF NOT EXISTS "landmark" TEXT;

UPDATE "user_addresses"
SET "street" = COALESCE("street", "addressLine1")
WHERE "street" IS NULL
  AND "addressLine1" IS NOT NULL;

ALTER TABLE "user_addresses" ALTER COLUMN "countryId" DROP NOT NULL;
ALTER TABLE "user_addresses" ALTER COLUMN "cityId" DROP NOT NULL;
ALTER TABLE "user_addresses" ALTER COLUMN "state" DROP NOT NULL;
ALTER TABLE "user_addresses" ALTER COLUMN "addressLine1" DROP NOT NULL;

CREATE INDEX "user_addresses_governorateId_idx" ON "user_addresses"("governorateId");

ALTER TABLE "user_addresses" ADD CONSTRAINT "user_addresses_governorateId_fkey"
FOREIGN KEY ("governorateId") REFERENCES "governorates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "shippingCost" DECIMAL(12,2) NOT NULL DEFAULT 0;
