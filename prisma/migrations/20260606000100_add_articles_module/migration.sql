-- Align the initial article tables with the Articles module business rules.
ALTER TABLE "article_article_tags" DROP CONSTRAINT IF EXISTS "article_article_tags_articleId_fkey";
ALTER TABLE "article_article_tags" DROP CONSTRAINT IF EXISTS "article_article_tags_articleTagId_fkey";
ALTER TABLE "articles" DROP CONSTRAINT IF EXISTS "articles_articleCategoryId_fkey";

DROP INDEX IF EXISTS "article_categories_slug_key";
DROP INDEX IF EXISTS "article_tags_slug_key";
DROP INDEX IF EXISTS "articles_articleCategoryId_idx";
DROP INDEX IF EXISTS "articles_isPublished_isActive_idx";
DROP INDEX IF EXISTS "article_article_tags_articleId_idx";
DROP INDEX IF EXISTS "article_article_tags_articleTagId_idx";
DROP INDEX IF EXISTS "article_article_tags_articleId_articleTagId_key";

ALTER TABLE "article_categories"
DROP COLUMN IF EXISTS "slug",
DROP COLUMN IF EXISTS "descriptionAr",
DROP COLUMN IF EXISTS "descriptionEn";

ALTER TABLE "articles"
RENAME COLUMN "articleCategoryId" TO "categoryId";

ALTER TABLE "articles"
RENAME COLUMN "excerptAr" TO "shortContentAr";

ALTER TABLE "articles"
RENAME COLUMN "excerptEn" TO "shortContentEn";

ALTER TABLE "articles"
DROP COLUMN IF EXISTS "isPublished",
DROP COLUMN IF EXISTS "publishedAt",
ADD COLUMN IF NOT EXISTS "viewsCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS "isFeatured" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS "isHomeDisplay" BOOLEAN NOT NULL DEFAULT false;

UPDATE "articles"
SET "shortContentAr" = ''
WHERE "shortContentAr" IS NULL;

UPDATE "articles"
SET "shortContentEn" = ''
WHERE "shortContentEn" IS NULL;

UPDATE "articles"
SET "coverImage" = ''
WHERE "coverImage" IS NULL;

ALTER TABLE "articles"
ALTER COLUMN "shortContentAr" SET NOT NULL,
ALTER COLUMN "shortContentEn" SET NOT NULL,
ALTER COLUMN "coverImage" SET NOT NULL;

ALTER TABLE "article_tags"
DROP COLUMN IF EXISTS "slug",
DROP COLUMN IF EXISTS "isActive";

CREATE TABLE IF NOT EXISTS "article_tag_relations" (
    "articleId" UUID NOT NULL,
    "tagId" UUID NOT NULL,

    CONSTRAINT "article_tag_relations_pkey" PRIMARY KEY ("articleId","tagId")
);

INSERT INTO "article_tag_relations" ("articleId", "tagId")
SELECT "articleId", "articleTagId"
FROM "article_article_tags"
ON CONFLICT DO NOTHING;

DROP TABLE IF EXISTS "article_article_tags";

CREATE INDEX IF NOT EXISTS "articles_categoryId_idx" ON "articles"("categoryId");
CREATE INDEX IF NOT EXISTS "articles_isActive_createdAt_idx" ON "articles"("isActive", "createdAt");
CREATE INDEX IF NOT EXISTS "articles_isFeatured_idx" ON "articles"("isFeatured");
CREATE INDEX IF NOT EXISTS "articles_isHomeDisplay_idx" ON "articles"("isHomeDisplay");
CREATE INDEX IF NOT EXISTS "article_tag_relations_articleId_idx" ON "article_tag_relations"("articleId");
CREATE INDEX IF NOT EXISTS "article_tag_relations_tagId_idx" ON "article_tag_relations"("tagId");

ALTER TABLE "articles"
ADD CONSTRAINT "articles_categoryId_fkey"
FOREIGN KEY ("categoryId") REFERENCES "article_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "article_tag_relations"
ADD CONSTRAINT "article_tag_relations_articleId_fkey"
FOREIGN KEY ("articleId") REFERENCES "articles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "article_tag_relations"
ADD CONSTRAINT "article_tag_relations_tagId_fkey"
FOREIGN KEY ("tagId") REFERENCES "article_tags"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
