CREATE TABLE "audit_logs" (
  "id" UUID NOT NULL,
  "actorUserId" UUID,
  "actorEmail" TEXT,
  "actorRole" TEXT,
  "action" TEXT NOT NULL,
  "entityType" TEXT NOT NULL,
  "entityId" TEXT,
  "description" TEXT,
  "ipAddress" TEXT,
  "userAgent" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "audit_logs_actorUserId_idx" ON "audit_logs"("actorUserId");
CREATE INDEX "audit_logs_action_idx" ON "audit_logs"("action");
CREATE INDEX "audit_logs_entityType_idx" ON "audit_logs"("entityType");
CREATE INDEX "audit_logs_createdAt_idx" ON "audit_logs"("createdAt");
