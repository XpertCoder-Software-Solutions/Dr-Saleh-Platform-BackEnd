-- AlterTable
ALTER TABLE "book_formats"
ADD COLUMN     "weight" DECIMAL(8,2),
ADD COLUMN     "priceEgp" DECIMAL(12,2),
ADD COLUMN     "discountPriceEgp" DECIMAL(12,2),
ADD COLUMN     "priceUsd" DECIMAL(12,2),
ADD COLUMN     "discountPriceUsd" DECIMAL(12,2),
ADD COLUMN     "readerFile" TEXT,
ADD COLUMN     "audioFile" TEXT,
ADD COLUMN     "audioDuration" INTEGER;

-- Migrate existing uploaded format files into the new typed file columns.
UPDATE "book_formats"
SET "readerFile" = "fileUrl"
WHERE "formatType" = 'DIGITAL' AND "fileUrl" IS NOT NULL;

UPDATE "book_formats"
SET "audioFile" = "fileUrl",
    "audioDuration" = "durationMinutes"
WHERE "formatType" = 'AUDIO';

-- Digital and audio formats must never carry stock.
UPDATE "book_formats"
SET "stock" = NULL
WHERE "formatType" IN ('DIGITAL', 'AUDIO');

-- Drop obsolete columns.
ALTER TABLE "book_formats"
DROP COLUMN "fileUrl",
DROP COLUMN "sampleUrl",
DROP COLUMN "pagesCount",
DROP COLUMN "durationMinutes";
