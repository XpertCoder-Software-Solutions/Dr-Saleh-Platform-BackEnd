-- Align wishlists with the final Wishlist module contract.
DROP INDEX IF EXISTS "wishlists_itemId_idx";

ALTER TABLE "wishlists"
DROP COLUMN IF EXISTS "updatedAt";
