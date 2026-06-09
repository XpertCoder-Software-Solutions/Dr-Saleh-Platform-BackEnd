DO $$
BEGIN
  CREATE TYPE "CartItemType" AS ENUM ('COURSE', 'BOOK', 'PRODUCT');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "cart_items" DROP CONSTRAINT IF EXISTS "cart_items_courseId_fkey";
ALTER TABLE "cart_items" DROP CONSTRAINT IF EXISTS "cart_items_bookFormatId_fkey";
ALTER TABLE "cart_items" DROP CONSTRAINT IF EXISTS "cart_items_productId_fkey";

DROP INDEX IF EXISTS "cart_items_cartId_courseId_key";
DROP INDEX IF EXISTS "cart_items_cartId_bookFormatId_key";
DROP INDEX IF EXISTS "cart_items_cartId_productId_key";
DROP INDEX IF EXISTS "cart_items_courseId_idx";
DROP INDEX IF EXISTS "cart_items_bookFormatId_idx";
DROP INDEX IF EXISTS "cart_items_productId_idx";

ALTER TABLE "cart_items" ADD COLUMN IF NOT EXISTS "itemId" UUID;

UPDATE "cart_items"
SET "itemId" = CASE "itemType"::text
  WHEN 'COURSE' THEN "courseId"
  WHEN 'BOOK' THEN "bookFormatId"
  WHEN 'PRODUCT' THEN "productId"
  ELSE NULL
END
WHERE "itemId" IS NULL;

DELETE FROM "cart_items"
WHERE "itemId" IS NULL;

DELETE FROM "cart_items" current_item
USING "cart_items" duplicate_item
WHERE current_item.ctid < duplicate_item.ctid
  AND current_item."cartId" = duplicate_item."cartId"
  AND current_item."itemType" = duplicate_item."itemType"
  AND current_item."itemId" = duplicate_item."itemId";

ALTER TABLE "cart_items"
  ALTER COLUMN "itemType" TYPE "CartItemType"
  USING "itemType"::text::"CartItemType";

ALTER TABLE "cart_items" ALTER COLUMN "itemId" SET NOT NULL;

ALTER TABLE "cart_items" DROP COLUMN IF EXISTS "courseId";
ALTER TABLE "cart_items" DROP COLUMN IF EXISTS "bookFormatId";
ALTER TABLE "cart_items" DROP COLUMN IF EXISTS "productId";

CREATE UNIQUE INDEX "cart_items_cartId_itemType_itemId_key" ON "cart_items"("cartId", "itemType", "itemId");
