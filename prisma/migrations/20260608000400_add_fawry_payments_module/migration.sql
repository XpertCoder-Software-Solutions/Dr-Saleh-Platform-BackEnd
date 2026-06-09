ALTER TYPE "PaymentStatus" ADD VALUE IF NOT EXISTS 'CANCELLED';

ALTER TABLE "payment_transactions" ALTER COLUMN "provider" DROP DEFAULT;

CREATE TYPE "PaymentProvider_new" AS ENUM ('FAWRY');

ALTER TABLE "payment_transactions"
  ALTER COLUMN "provider" TYPE "PaymentProvider_new"
  USING 'FAWRY'::"PaymentProvider_new";

DROP TYPE "PaymentProvider";
ALTER TYPE "PaymentProvider_new" RENAME TO "PaymentProvider";

DO $$
BEGIN
  CREATE TYPE "PaymentMethod" AS ENUM ('FAWRY_REFERENCE');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE "user_books" (
  "id" UUID NOT NULL,
  "userId" UUID NOT NULL,
  "bookFormatId" UUID NOT NULL,
  "purchasedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "user_books_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "user_books_userId_bookFormatId_key" ON "user_books"("userId", "bookFormatId");
CREATE INDEX "user_books_userId_idx" ON "user_books"("userId");
CREATE INDEX "user_books_bookFormatId_idx" ON "user_books"("bookFormatId");
CREATE INDEX "user_books_purchasedAt_idx" ON "user_books"("purchasedAt");

ALTER TABLE "user_books"
  ADD CONSTRAINT "user_books_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "user_books"
  ADD CONSTRAINT "user_books_bookFormatId_fkey"
  FOREIGN KEY ("bookFormatId") REFERENCES "book_formats"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "payments" (
  "id" UUID NOT NULL,
  "orderId" UUID NOT NULL,
  "userId" UUID NOT NULL,
  "provider" "PaymentProvider" NOT NULL,
  "method" "PaymentMethod" NOT NULL,
  "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
  "amount" DECIMAL(12, 2) NOT NULL,
  "currency" TEXT NOT NULL,
  "merchantRefNumber" TEXT NOT NULL,
  "providerReferenceNumber" TEXT,
  "providerPaymentReference" TEXT,
  "providerStatus" TEXT,
  "providerResponse" JSONB,
  "failureReason" TEXT,
  "paidAt" TIMESTAMP(3),
  "cancelledAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "payments_merchantRefNumber_key" ON "payments"("merchantRefNumber");
CREATE UNIQUE INDEX "payments_providerReferenceNumber_key" ON "payments"("providerReferenceNumber");
CREATE UNIQUE INDEX "payments_orderId_provider_method_key" ON "payments"("orderId", "provider", "method");
CREATE INDEX "payments_orderId_idx" ON "payments"("orderId");
CREATE INDEX "payments_userId_idx" ON "payments"("userId");
CREATE INDEX "payments_provider_idx" ON "payments"("provider");
CREATE INDEX "payments_status_idx" ON "payments"("status");

ALTER TABLE "payments"
  ADD CONSTRAINT "payments_orderId_fkey"
  FOREIGN KEY ("orderId") REFERENCES "orders"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "payments"
  ADD CONSTRAINT "payments_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "payment_transactions" ADD COLUMN IF NOT EXISTS "paymentId" UUID;
ALTER TABLE "payment_transactions" ADD COLUMN IF NOT EXISTS "method" "PaymentMethod";

CREATE INDEX "payment_transactions_paymentId_idx" ON "payment_transactions"("paymentId");

ALTER TABLE "payment_transactions"
  ADD CONSTRAINT "payment_transactions_paymentId_fkey"
  FOREIGN KEY ("paymentId") REFERENCES "payments"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
