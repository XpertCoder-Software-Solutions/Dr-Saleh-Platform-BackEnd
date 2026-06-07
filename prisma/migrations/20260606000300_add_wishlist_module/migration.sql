-- Convert the initial per-type wishlist table into the generic wishlist model.
ALTER TABLE "wishlist_items" DROP CONSTRAINT IF EXISTS "wishlist_items_userId_fkey";
ALTER TABLE "wishlist_items" DROP CONSTRAINT IF EXISTS "wishlist_items_courseId_fkey";
ALTER TABLE "wishlist_items" DROP CONSTRAINT IF EXISTS "wishlist_items_bookId_fkey";
ALTER TABLE "wishlist_items" DROP CONSTRAINT IF EXISTS "wishlist_items_productId_fkey";

DROP INDEX IF EXISTS "wishlist_items_userId_courseId_key";
DROP INDEX IF EXISTS "wishlist_items_userId_bookId_key";
DROP INDEX IF EXISTS "wishlist_items_userId_productId_key";
DROP INDEX IF EXISTS "wishlist_items_userId_idx";
DROP INDEX IF EXISTS "wishlist_items_courseId_idx";
DROP INDEX IF EXISTS "wishlist_items_bookId_idx";
DROP INDEX IF EXISTS "wishlist_items_productId_idx";

ALTER TABLE "wishlist_items" RENAME CONSTRAINT "wishlist_items_pkey" TO "wishlists_pkey";
ALTER TABLE "wishlist_items" RENAME TO "wishlists";

ALTER TABLE "wishlists" ADD COLUMN "itemId" UUID;

UPDATE "wishlists"
SET "itemId" = CASE "itemType"
  WHEN 'COURSE' THEN "courseId"
  WHEN 'BOOK' THEN "bookId"
  WHEN 'PRODUCT' THEN "productId"
END;

DELETE FROM "wishlists"
WHERE "itemId" IS NULL;

DELETE FROM "wishlists" current_row
USING "wishlists" duplicate_row
WHERE current_row.ctid < duplicate_row.ctid
  AND current_row."userId" = duplicate_row."userId"
  AND current_row."itemType" = duplicate_row."itemType"
  AND current_row."itemId" = duplicate_row."itemId";

ALTER TABLE "wishlists"
ALTER COLUMN "itemId" SET NOT NULL,
DROP COLUMN "courseId",
DROP COLUMN "bookId",
DROP COLUMN "productId";

CREATE UNIQUE INDEX "wishlists_userId_itemType_itemId_key" ON "wishlists"("userId", "itemType", "itemId");
CREATE INDEX "wishlists_userId_idx" ON "wishlists"("userId");
CREATE INDEX "wishlists_itemType_idx" ON "wishlists"("itemType");
CREATE INDEX "wishlists_itemId_idx" ON "wishlists"("itemId");

ALTER TABLE "wishlists"
ADD CONSTRAINT "wishlists_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
