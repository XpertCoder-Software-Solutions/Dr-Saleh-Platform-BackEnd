-- Consultation requests: support the new request form (child age, relation,
-- session type, preferred time; age/gender optional) and let the admin track
-- follow-up (status, scheduled date, notes).

CREATE TYPE "ConsultationRequestStatus" AS ENUM ('NEW', 'CONTACTED', 'SCHEDULED', 'COMPLETED', 'CANCELLED');

ALTER TABLE "consultation_requests"
ALTER COLUMN "age" DROP NOT NULL,
ALTER COLUMN "gender" DROP NOT NULL,
ADD COLUMN "updatedAt" TIMESTAMP(3),
ADD COLUMN "childAge" TEXT,
ADD COLUMN "relation" TEXT,
ADD COLUMN "sessionType" TEXT,
ADD COLUMN "preferredTime" TEXT,
ADD COLUMN "status" "ConsultationRequestStatus" NOT NULL DEFAULT 'NEW',
ADD COLUMN "scheduledAt" TIMESTAMP(3),
ADD COLUMN "adminNotes" TEXT;

CREATE INDEX "consultation_requests_status_idx" ON "consultation_requests"("status");
