/*
  Warnings:

  - You are about to drop the column `image` on the `book_categories` table. All the data in the column will be lost.
  - You are about to drop the column `slug` on the `book_categories` table. All the data in the column will be lost.
  - You are about to drop the column `rating` on the `books` table. All the data in the column will be lost.
  - You are about to drop the column `reviewsCount` on the `books` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "book_categories_slug_key";

-- AlterTable
ALTER TABLE "book_categories" DROP COLUMN "image",
DROP COLUMN "slug";

-- AlterTable
ALTER TABLE "books" DROP COLUMN "rating",
DROP COLUMN "reviewsCount",
ADD COLUMN     "isFeatured" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "book_images" (
    "id" UUID NOT NULL,
    "bookId" UUID NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "book_images_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "book_images_bookId_idx" ON "book_images"("bookId");

-- AddForeignKey
ALTER TABLE "book_images" ADD CONSTRAINT "book_images_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "books"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
