ALTER TABLE "user_courses" ADD COLUMN "startedAt" TIMESTAMP(3);
ALTER TABLE "user_courses" ADD COLUMN "completedAt" TIMESTAMP(3);
ALTER TABLE "user_courses" ADD COLUMN "completionPercentage" DECIMAL(5,2) NOT NULL DEFAULT 0;
