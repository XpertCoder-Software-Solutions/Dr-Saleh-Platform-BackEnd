-- Paymob (cards, mobile wallets, Apple Pay) as a payment provider.
ALTER TYPE "PaymentProvider" ADD VALUE IF NOT EXISTS 'PAYMOB';
ALTER TYPE "PaymentMethod" ADD VALUE IF NOT EXISTS 'PAYMOB_CHECKOUT';
