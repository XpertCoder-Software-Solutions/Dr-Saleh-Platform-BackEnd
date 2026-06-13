CREATE TYPE "NotificationType" AS ENUM (
  'EMAIL_VERIFICATION_OTP',
  'PASSWORD_RESET_OTP',
  'PASSWORD_CHANGED',
  'ORDER_CREATED',
  'PAYMENT_SUCCESS',
  'PAYMENT_FAILED',
  'REFUND_PROCESSED',
  'COURSE_ACCESS_GRANTED',
  'COURSE_COMPLETED',
  'CONSULTATION_REQUEST_SUBMITTED',
  'CONSULTATION_REQUEST_ADMIN',
  'CONTACT_MESSAGE_RECEIVED'
);

CREATE TYPE "NotificationStatus" AS ENUM (
  'PENDING',
  'SENT',
  'FAILED'
);

CREATE TABLE "notification_logs" (
  "id" UUID NOT NULL,
  "userId" UUID,
  "email" TEXT NOT NULL,
  "type" "NotificationType" NOT NULL,
  "status" "NotificationStatus" NOT NULL DEFAULT 'PENDING',
  "errorMessage" TEXT,
  "sentAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "notification_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "notification_logs_userId_idx" ON "notification_logs"("userId");
CREATE INDEX "notification_logs_email_idx" ON "notification_logs"("email");
CREATE INDEX "notification_logs_type_idx" ON "notification_logs"("type");
CREATE INDEX "notification_logs_status_idx" ON "notification_logs"("status");
CREATE INDEX "notification_logs_createdAt_idx" ON "notification_logs"("createdAt");

ALTER TABLE "notification_logs" ADD CONSTRAINT "notification_logs_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
