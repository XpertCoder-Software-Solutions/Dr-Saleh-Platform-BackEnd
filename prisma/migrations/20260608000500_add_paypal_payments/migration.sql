ALTER TYPE "PaymentProvider" ADD VALUE IF NOT EXISTS 'PAYPAL';
ALTER TYPE "PaymentMethod" ADD VALUE IF NOT EXISTS 'PAYPAL_CHECKOUT';

ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "paypalOrderId" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "payments_paypalOrderId_key" ON "payments"("paypalOrderId");
