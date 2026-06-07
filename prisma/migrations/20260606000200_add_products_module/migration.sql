-- Align the initial product tables with the Products module business rules.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE "products" DROP CONSTRAINT IF EXISTS "products_productCategoryId_fkey";

DROP INDEX IF EXISTS "product_categories_slug_key";
DROP INDEX IF EXISTS "products_productCategoryId_idx";
DROP INDEX IF EXISTS "products_sku_key";
DROP INDEX IF EXISTS "products_isHomeDisplay_idx";

ALTER TABLE "product_categories"
DROP COLUMN IF EXISTS "slug",
DROP COLUMN IF EXISTS "descriptionAr",
DROP COLUMN IF EXISTS "descriptionEn",
DROP COLUMN IF EXISTS "image";

ALTER TABLE "products"
RENAME COLUMN "productCategoryId" TO "categoryId";

ALTER TABLE "products"
RENAME COLUMN "titleAr" TO "nameAr";

ALTER TABLE "products"
RENAME COLUMN "titleEn" TO "nameEn";

ALTER TABLE "products"
ADD COLUMN     "coverImage" TEXT,
ADD COLUMN     "isFeatured" BOOLEAN NOT NULL DEFAULT false;

UPDATE "products"
SET "coverImage" = COALESCE(NULLIF("images"[1], ''), '')
WHERE "coverImage" IS NULL;

ALTER TABLE "products"
ALTER COLUMN "coverImage" SET NOT NULL,
ALTER COLUMN "sku" DROP NOT NULL;

CREATE TABLE "product_images" (
    "id" UUID NOT NULL,
    "productId" UUID NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "displayOrder" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_images_pkey" PRIMARY KEY ("id")
);

INSERT INTO "product_images" ("id", "productId", "imageUrl", "displayOrder", "createdAt")
SELECT gen_random_uuid(), "products"."id", old_image."imageUrl", old_image."position" - 2, "products"."createdAt"
FROM "products"
CROSS JOIN LATERAL unnest("products"."images") WITH ORDINALITY AS old_image("imageUrl", "position")
WHERE old_image."position" > 1 AND old_image."imageUrl" <> '';

ALTER TABLE "products"
DROP COLUMN "images";

CREATE UNIQUE INDEX "products_sku_key" ON "products"("sku");
CREATE INDEX "products_categoryId_idx" ON "products"("categoryId");
CREATE INDEX "products_isActive_createdAt_idx" ON "products"("isActive", "createdAt");
CREATE INDEX "products_isFeatured_idx" ON "products"("isFeatured");
CREATE INDEX "products_isHomeDisplay_idx" ON "products"("isHomeDisplay");
CREATE INDEX "product_images_productId_idx" ON "product_images"("productId");

ALTER TABLE "products"
ADD CONSTRAINT "products_categoryId_fkey"
FOREIGN KEY ("categoryId") REFERENCES "product_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "product_images"
ADD CONSTRAINT "product_images_productId_fkey"
FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
