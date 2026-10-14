-- Shipping progress for orders with physical items.
CREATE TYPE "ShippingStatus" AS ENUM ('PREPARING', 'SHIPPED', 'DELIVERED');

ALTER TABLE "orders"
  ADD COLUMN "shippingStatus" "ShippingStatus",
  ADD COLUMN "trackingNumber" TEXT,
  ADD COLUMN "shippingCarrier" TEXT,
  ADD COLUMN "shippedAt" TIMESTAMP(3),
  ADD COLUMN "deliveredAt" TIMESTAMP(3);
