-- Update Courses module database design to CourseCategory -> Course -> Section -> Lesson.

DO $$
BEGIN
  CREATE TYPE "LessonType" AS ENUM ('VIDEO', 'PDF');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "content_sessions" DROP CONSTRAINT IF EXISTS "content_sessions_courseVideoId_fkey";
ALTER TABLE "courses" DROP CONSTRAINT IF EXISTS "courses_courseCategoryId_fkey";
ALTER TABLE "curriculums" DROP CONSTRAINT IF EXISTS "curriculums_courseId_fkey";
ALTER TABLE "course_videos" DROP CONSTRAINT IF EXISTS "course_videos_curriculumId_fkey";
ALTER TABLE "course_enrollments" DROP CONSTRAINT IF EXISTS "course_enrollments_userId_fkey";
ALTER TABLE "course_enrollments" DROP CONSTRAINT IF EXISTS "course_enrollments_courseId_fkey";
ALTER TABLE "course_enrollments" DROP CONSTRAINT IF EXISTS "course_enrollments_orderItemId_fkey";
ALTER TABLE "course_progress" DROP CONSTRAINT IF EXISTS "course_progress_courseEnrollmentId_fkey";
ALTER TABLE "course_progress" DROP CONSTRAINT IF EXISTS "course_progress_courseVideoId_fkey";
ALTER TABLE "certificates" DROP CONSTRAINT IF EXISTS "certificates_courseEnrollmentId_fkey";

DROP INDEX IF EXISTS "content_sessions_courseVideoId_idx";
DROP INDEX IF EXISTS "course_categories_slug_key";
DROP INDEX IF EXISTS "courses_slug_key";
DROP INDEX IF EXISTS "courses_courseCategoryId_idx";
DROP INDEX IF EXISTS "courses_isActive_isDisplayed_idx";
DROP INDEX IF EXISTS "courses_isHomeDisplay_idx";
DROP INDEX IF EXISTS "curriculums_courseId_idx";
DROP INDEX IF EXISTS "curriculums_courseId_position_key";
DROP INDEX IF EXISTS "course_videos_curriculumId_idx";
DROP INDEX IF EXISTS "course_videos_curriculumId_position_key";
DROP INDEX IF EXISTS "course_enrollments_orderItemId_key";
DROP INDEX IF EXISTS "course_enrollments_userId_idx";
DROP INDEX IF EXISTS "course_enrollments_courseId_idx";
DROP INDEX IF EXISTS "course_enrollments_userId_courseId_key";
DROP INDEX IF EXISTS "course_progress_courseEnrollmentId_idx";
DROP INDEX IF EXISTS "course_progress_courseVideoId_idx";
DROP INDEX IF EXISTS "course_progress_courseEnrollmentId_courseVideoId_key";
DROP INDEX IF EXISTS "certificates_courseEnrollmentId_key";

ALTER TABLE "course_categories"
DROP COLUMN IF EXISTS "slug",
DROP COLUMN IF EXISTS "descriptionAr",
DROP COLUMN IF EXISTS "descriptionEn",
ALTER COLUMN "image" DROP NOT NULL;

ALTER TABLE "courses" RENAME COLUMN "courseCategoryId" TO "categoryId";
ALTER TABLE "courses" RENAME COLUMN "image" TO "thumbnailImage";
ALTER TABLE "courses" RENAME COLUMN "promoVideo" TO "promoVideoUrl";
ALTER TABLE "courses" RENAME COLUMN "priceEgp" TO "priceEGP";
ALTER TABLE "courses" RENAME COLUMN "priceUsd" TO "priceUSD";
ALTER TABLE "courses" RENAME COLUMN "discountPriceEgp" TO "discountPriceEGP";
ALTER TABLE "courses" RENAME COLUMN "discountPriceUsd" TO "discountPriceUSD";

ALTER TABLE "courses"
ADD COLUMN "certificateEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "isFeatured" BOOLEAN NOT NULL DEFAULT false,
DROP COLUMN IF EXISTS "slug",
DROP COLUMN IF EXISTS "isRibbon",
DROP COLUMN IF EXISTS "ribbonText",
DROP COLUMN IF EXISTS "ribbonColor",
DROP COLUMN IF EXISTS "isDisplayed",
DROP COLUMN IF EXISTS "numberOfLessons",
DROP COLUMN IF EXISTS "durationMinutes",
DROP COLUMN IF EXISTS "rating",
DROP COLUMN IF EXISTS "reviewsCount",
ALTER COLUMN "thumbnailImage" DROP NOT NULL;

ALTER TABLE "content_sessions" RENAME COLUMN "courseVideoId" TO "lessonId";

ALTER TABLE "course_progress"
ADD COLUMN "userId" UUID,
ADD COLUMN "lessonId" UUID,
ADD COLUMN "completionPercentage" DECIMAL(5, 2) NOT NULL DEFAULT 0;

UPDATE "course_progress" AS progress
SET
  "userId" = enrollment."userId",
  "lessonId" = progress."courseVideoId",
  "completionPercentage" = CASE
    WHEN progress."isCompleted" THEN 100
    ELSE 0
  END
FROM "course_enrollments" AS enrollment
WHERE progress."courseEnrollmentId" = enrollment."id";

ALTER TABLE "course_progress"
ALTER COLUMN "userId" SET NOT NULL,
ALTER COLUMN "lessonId" SET NOT NULL;

ALTER TABLE "course_progress" RENAME CONSTRAINT "course_progress_pkey" TO "user_lesson_progress_pkey";
ALTER TABLE "course_progress" RENAME TO "user_lesson_progress";

ALTER TABLE "user_lesson_progress"
DROP COLUMN "courseEnrollmentId",
DROP COLUMN "courseVideoId",
DROP COLUMN IF EXISTS "completedAt";

ALTER TABLE "course_enrollments" RENAME CONSTRAINT "course_enrollments_pkey" TO "user_courses_pkey";
ALTER TABLE "course_enrollments" RENAME TO "user_courses";
ALTER TABLE "user_courses" RENAME COLUMN "enrolledAt" TO "purchasedAt";

ALTER TABLE "user_courses"
DROP COLUMN IF EXISTS "orderItemId",
DROP COLUMN IF EXISTS "progressPercent",
DROP COLUMN IF EXISTS "expiresAt",
DROP COLUMN IF EXISTS "completedAt",
DROP COLUMN IF EXISTS "isActive";

ALTER TABLE "curriculums" RENAME CONSTRAINT "curriculums_pkey" TO "course_sections_pkey";
ALTER TABLE "curriculums" RENAME TO "course_sections";
ALTER TABLE "course_sections" RENAME COLUMN "position" TO "displayOrder";

ALTER TABLE "course_sections"
DROP COLUMN IF EXISTS "descriptionAr",
DROP COLUMN IF EXISTS "descriptionEn";

ALTER TABLE "course_videos" RENAME CONSTRAINT "course_videos_pkey" TO "lessons_pkey";
ALTER TABLE "course_videos" RENAME TO "lessons";
ALTER TABLE "lessons" RENAME COLUMN "curriculumId" TO "sectionId";
ALTER TABLE "lessons" RENAME COLUMN "videoUrl" TO "videoKey";
ALTER TABLE "lessons" RENAME COLUMN "durationSeconds" TO "videoDurationSeconds";
ALTER TABLE "lessons" RENAME COLUMN "position" TO "displayOrder";

ALTER TABLE "lessons"
ADD COLUMN "lessonType" "LessonType" NOT NULL DEFAULT 'VIDEO',
ADD COLUMN "pdfKey" TEXT,
DROP COLUMN IF EXISTS "descriptionAr",
DROP COLUMN IF EXISTS "descriptionEn";

ALTER TABLE "lessons" ALTER COLUMN "lessonType" DROP DEFAULT;

ALTER TABLE "certificates"
DROP COLUMN IF EXISTS "courseEnrollmentId",
DROP COLUMN IF EXISTS "fileUrl";

CREATE INDEX "content_sessions_lessonId_idx" ON "content_sessions"("lessonId");
CREATE INDEX "course_categories_isActive_idx" ON "course_categories"("isActive");
CREATE INDEX "courses_categoryId_idx" ON "courses"("categoryId");
CREATE INDEX "courses_categoryId_isActive_idx" ON "courses"("categoryId", "isActive");
CREATE INDEX "courses_isActive_createdAt_idx" ON "courses"("isActive", "createdAt");
CREATE INDEX "courses_isFeatured_idx" ON "courses"("isFeatured");
CREATE INDEX "courses_isHomeDisplay_idx" ON "courses"("isHomeDisplay");
CREATE INDEX "course_sections_courseId_idx" ON "course_sections"("courseId");
CREATE INDEX "course_sections_isActive_idx" ON "course_sections"("isActive");
CREATE UNIQUE INDEX "course_sections_courseId_displayOrder_key" ON "course_sections"("courseId", "displayOrder");
CREATE INDEX "lessons_sectionId_idx" ON "lessons"("sectionId");
CREATE INDEX "lessons_lessonType_idx" ON "lessons"("lessonType");
CREATE INDEX "lessons_isPreview_idx" ON "lessons"("isPreview");
CREATE INDEX "lessons_isActive_idx" ON "lessons"("isActive");
CREATE UNIQUE INDEX "lessons_sectionId_displayOrder_key" ON "lessons"("sectionId", "displayOrder");
CREATE INDEX "user_courses_userId_idx" ON "user_courses"("userId");
CREATE INDEX "user_courses_courseId_idx" ON "user_courses"("courseId");
CREATE INDEX "user_courses_purchasedAt_idx" ON "user_courses"("purchasedAt");
CREATE UNIQUE INDEX "user_courses_userId_courseId_key" ON "user_courses"("userId", "courseId");
CREATE INDEX "user_lesson_progress_userId_idx" ON "user_lesson_progress"("userId");
CREATE INDEX "user_lesson_progress_lessonId_idx" ON "user_lesson_progress"("lessonId");
CREATE INDEX "user_lesson_progress_isCompleted_idx" ON "user_lesson_progress"("isCompleted");
CREATE UNIQUE INDEX "user_lesson_progress_userId_lessonId_key" ON "user_lesson_progress"("userId", "lessonId");
CREATE INDEX "course_reviews_isActive_idx" ON "course_reviews"("isActive");
CREATE UNIQUE INDEX "certificates_userId_courseId_key" ON "certificates"("userId", "courseId");
CREATE INDEX "certificates_issuedAt_idx" ON "certificates"("issuedAt");

ALTER TABLE "content_sessions"
ADD CONSTRAINT "content_sessions_lessonId_fkey"
FOREIGN KEY ("lessonId") REFERENCES "lessons"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "courses"
ADD CONSTRAINT "courses_categoryId_fkey"
FOREIGN KEY ("categoryId") REFERENCES "course_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "course_sections"
ADD CONSTRAINT "course_sections_courseId_fkey"
FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "lessons"
ADD CONSTRAINT "lessons_sectionId_fkey"
FOREIGN KEY ("sectionId") REFERENCES "course_sections"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "user_courses"
ADD CONSTRAINT "user_courses_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "user_courses"
ADD CONSTRAINT "user_courses_courseId_fkey"
FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "user_lesson_progress"
ADD CONSTRAINT "user_lesson_progress_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "user_lesson_progress"
ADD CONSTRAINT "user_lesson_progress_lessonId_fkey"
FOREIGN KEY ("lessonId") REFERENCES "lessons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
