ALTER TABLE "orders" ALTER COLUMN "status" DROP DEFAULT;

CREATE TYPE "OrderStatus_new" AS ENUM ('PENDING', 'PAID', 'CANCELLED', 'REFUNDED');

ALTER TABLE "orders"
  ALTER COLUMN "status" TYPE "OrderStatus_new"
  USING (
    CASE "status"::text
      WHEN 'PENDING' THEN 'PENDING'
      WHEN 'REFUNDED' THEN 'REFUNDED'
      WHEN 'CANCELED' THEN 'CANCELLED'
      ELSE 'PAID'
    END
  )::"OrderStatus_new";

DROP TYPE "OrderStatus";
ALTER TYPE "OrderStatus_new" RENAME TO "OrderStatus";

ALTER TABLE "orders" ALTER COLUMN "status" SET DEFAULT 'PENDING';

ALTER TABLE "orders" ALTER COLUMN "paymentStatus" DROP DEFAULT;
ALTER TABLE "payment_transactions" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "refunds" ALTER COLUMN "status" DROP DEFAULT;

CREATE TYPE "PaymentStatus_new" AS ENUM ('PENDING', 'PAID', 'FAILED', 'REFUNDED');

ALTER TABLE "orders"
  ALTER COLUMN "paymentStatus" TYPE "PaymentStatus_new"
  USING (
    CASE "paymentStatus"::text
      WHEN 'PAID' THEN 'PAID'
      WHEN 'FAILED' THEN 'FAILED'
      WHEN 'REFUNDED' THEN 'REFUNDED'
      WHEN 'PARTIALLY_REFUNDED' THEN 'REFUNDED'
      WHEN 'CANCELED' THEN 'FAILED'
      ELSE 'PENDING'
    END
  )::"PaymentStatus_new";

ALTER TABLE "payment_transactions"
  ALTER COLUMN "status" TYPE "PaymentStatus_new"
  USING (
    CASE "status"::text
      WHEN 'PAID' THEN 'PAID'
      WHEN 'FAILED' THEN 'FAILED'
      WHEN 'REFUNDED' THEN 'REFUNDED'
      WHEN 'PARTIALLY_REFUNDED' THEN 'REFUNDED'
      WHEN 'CANCELED' THEN 'FAILED'
      ELSE 'PENDING'
    END
  )::"PaymentStatus_new";

ALTER TABLE "refunds"
  ALTER COLUMN "status" TYPE "PaymentStatus_new"
  USING (
    CASE "status"::text
      WHEN 'PAID' THEN 'PAID'
      WHEN 'FAILED' THEN 'FAILED'
      WHEN 'REFUNDED' THEN 'REFUNDED'
      WHEN 'PARTIALLY_REFUNDED' THEN 'REFUNDED'
      WHEN 'CANCELED' THEN 'FAILED'
      ELSE 'PENDING'
    END
  )::"PaymentStatus_new";

DROP TYPE "PaymentStatus";
ALTER TYPE "PaymentStatus_new" RENAME TO "PaymentStatus";

ALTER TABLE "orders" ALTER COLUMN "paymentStatus" SET DEFAULT 'PENDING';
ALTER TABLE "payment_transactions" ALTER COLUMN "status" SET DEFAULT 'PENDING';
ALTER TABLE "refunds" ALTER COLUMN "status" SET DEFAULT 'PENDING';

ALTER TABLE "orders" DROP CONSTRAINT IF EXISTS "orders_shippingGovernorateId_fkey";
DROP INDEX IF EXISTS "orders_shippingGovernorateId_idx";

ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "hasPhysicalItems" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "paidAt" TIMESTAMP(3);

UPDATE "orders"
SET "paidAt" = "updatedAt"
WHERE "paymentStatus" = 'PAID'
  AND "paidAt" IS NULL;

UPDATE "orders" order_row
SET "hasPhysicalItems" = EXISTS (
  SELECT 1
  FROM "order_items" order_item
  LEFT JOIN "book_formats" book_format
    ON order_item."bookFormatId" = book_format."id"
  WHERE order_item."orderId" = order_row."id"
    AND (
      order_item."itemType"::text = 'PRODUCT'
      OR (
        order_item."itemType"::text = 'BOOK'
        AND book_format."formatType"::text = 'PHYSICAL'
      )
    )
);

ALTER TABLE "orders" ALTER COLUMN "currency" TYPE TEXT USING "currency"::text;
ALTER TABLE "orders" ALTER COLUMN "discountAmount" DROP DEFAULT;

ALTER TABLE "orders" DROP COLUMN IF EXISTS "shippingGovernorateId";
ALTER TABLE "orders" DROP COLUMN IF EXISTS "shippingFullName";
ALTER TABLE "orders" DROP COLUMN IF EXISTS "shippingPhoneNumber";
ALTER TABLE "orders" DROP COLUMN IF EXISTS "shippingAddressLine1";
ALTER TABLE "orders" DROP COLUMN IF EXISTS "shippingAddressLine2";
ALTER TABLE "orders" DROP COLUMN IF EXISTS "shippingCity";
ALTER TABLE "orders" DROP COLUMN IF EXISTS "shippingPostalCode";
ALTER TABLE "orders" DROP COLUMN IF EXISTS "shippingCountry";
ALTER TABLE "orders" DROP COLUMN IF EXISTS "couponDiscountAmount";
ALTER TABLE "orders" DROP COLUMN IF EXISTS "shippingCost";
ALTER TABLE "orders" DROP COLUMN IF EXISTS "placedAt";

ALTER TABLE "order_items" DROP CONSTRAINT IF EXISTS "order_items_courseId_fkey";
ALTER TABLE "order_items" DROP CONSTRAINT IF EXISTS "order_items_bookFormatId_fkey";
ALTER TABLE "order_items" DROP CONSTRAINT IF EXISTS "order_items_productId_fkey";

DROP INDEX IF EXISTS "order_items_orderId_courseId_key";
DROP INDEX IF EXISTS "order_items_orderId_bookFormatId_key";
DROP INDEX IF EXISTS "order_items_orderId_productId_key";
DROP INDEX IF EXISTS "order_items_courseId_idx";
DROP INDEX IF EXISTS "order_items_bookFormatId_idx";
DROP INDEX IF EXISTS "order_items_productId_idx";

ALTER TABLE "order_items" ADD COLUMN IF NOT EXISTS "itemId" UUID;
ALTER TABLE "order_items" ADD COLUMN IF NOT EXISTS "titleAr" TEXT;
ALTER TABLE "order_items" ADD COLUMN IF NOT EXISTS "titleEn" TEXT;
ALTER TABLE "order_items" ADD COLUMN IF NOT EXISTS "discountPrice" DECIMAL(12, 2);
ALTER TABLE "order_items" ADD COLUMN IF NOT EXISTS "totalPrice" DECIMAL(12, 2);

UPDATE "order_items"
SET "itemId" = CASE "itemType"::text
  WHEN 'COURSE' THEN "courseId"
  WHEN 'BOOK' THEN "bookFormatId"
  WHEN 'PRODUCT' THEN "productId"
  ELSE NULL
END
WHERE "itemId" IS NULL;

UPDATE "order_items" order_item
SET
  "titleAr" = course."titleAr",
  "titleEn" = course."titleEn"
FROM "courses" course
WHERE order_item."itemType"::text = 'COURSE'
  AND order_item."courseId" = course."id"
  AND order_item."titleAr" IS NULL;

UPDATE "order_items" order_item
SET
  "titleAr" = book."titleAr",
  "titleEn" = book."titleEn"
FROM "book_formats" book_format
JOIN "books" book
  ON book_format."bookId" = book."id"
WHERE order_item."itemType"::text = 'BOOK'
  AND order_item."bookFormatId" = book_format."id"
  AND order_item."titleAr" IS NULL;

UPDATE "order_items" order_item
SET
  "titleAr" = product."nameAr",
  "titleEn" = product."nameEn"
FROM "products" product
WHERE order_item."itemType"::text = 'PRODUCT'
  AND order_item."productId" = product."id"
  AND order_item."titleAr" IS NULL;

UPDATE "order_items"
SET
  "discountPrice" = "discountUnitPrice",
  "totalPrice" = "lineTotal"
WHERE "totalPrice" IS NULL;

DELETE FROM "order_items"
WHERE "itemId" IS NULL;

UPDATE "order_items"
SET
  "titleAr" = COALESCE("titleAr", 'Unknown item'),
  "titleEn" = COALESCE("titleEn", 'Unknown item');

ALTER TABLE "order_items" ALTER COLUMN "itemId" SET NOT NULL;
ALTER TABLE "order_items" ALTER COLUMN "titleAr" SET NOT NULL;
ALTER TABLE "order_items" ALTER COLUMN "titleEn" SET NOT NULL;
ALTER TABLE "order_items" ALTER COLUMN "totalPrice" SET NOT NULL;
ALTER TABLE "order_items" ALTER COLUMN "quantity" DROP DEFAULT;

ALTER TABLE "order_items" DROP COLUMN IF EXISTS "courseId";
ALTER TABLE "order_items" DROP COLUMN IF EXISTS "bookFormatId";
ALTER TABLE "order_items" DROP COLUMN IF EXISTS "productId";
ALTER TABLE "order_items" DROP COLUMN IF EXISTS "discountUnitPrice";
ALTER TABLE "order_items" DROP COLUMN IF EXISTS "lineTotal";
