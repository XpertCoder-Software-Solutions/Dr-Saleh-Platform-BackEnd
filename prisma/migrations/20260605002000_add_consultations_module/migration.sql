-- Drop old request/user and category description structure.
ALTER TABLE "consultation_requests" DROP CONSTRAINT IF EXISTS "consultation_requests_userId_fkey";
ALTER TABLE "consultation_requests" DROP CONSTRAINT IF EXISTS "consultation_requests_consultationCategoryId_fkey";

DROP INDEX IF EXISTS "consultation_requests_userId_idx";
DROP INDEX IF EXISTS "consultation_requests_consultationCategoryId_idx";
DROP INDEX IF EXISTS "consultation_requests_whatsapp_idx";

ALTER TABLE "consultation_categories"
DROP COLUMN IF EXISTS "descriptionAr",
DROP COLUMN IF EXISTS "descriptionEn";

ALTER TABLE "consultation_requests"
RENAME COLUMN "consultationCategoryId" TO "categoryId";

ALTER TABLE "consultation_requests"
RENAME COLUMN "whatsapp" TO "whatsApp";

ALTER TABLE "consultation_requests"
DROP COLUMN IF EXISTS "userId",
DROP COLUMN IF EXISTS "isClosed",
DROP COLUMN IF EXISTS "closedAt",
DROP COLUMN IF EXISTS "updatedAt",
ADD COLUMN     "email" TEXT,
ADD COLUMN     "consultationTopic" TEXT,
ADD COLUMN     "notes" TEXT;

UPDATE "consultation_requests"
SET "email" = ''
WHERE "email" IS NULL;

UPDATE "consultation_requests"
SET "consultationTopic" = ''
WHERE "consultationTopic" IS NULL;

ALTER TABLE "consultation_requests"
ALTER COLUMN "email" SET NOT NULL,
ALTER COLUMN "consultationTopic" SET NOT NULL;

CREATE INDEX "consultation_requests_categoryId_idx" ON "consultation_requests"("categoryId");
CREATE INDEX "consultation_requests_whatsApp_idx" ON "consultation_requests"("whatsApp");
CREATE INDEX "consultation_requests_email_idx" ON "consultation_requests"("email");
CREATE INDEX "consultation_requests_createdAt_idx" ON "consultation_requests"("createdAt");

ALTER TABLE "consultation_requests"
ADD CONSTRAINT "consultation_requests_categoryId_fkey"
FOREIGN KEY ("categoryId") REFERENCES "consultation_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
