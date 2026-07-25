-- Adds a distinct "promised" status: renewal has been renewed, ₹0 collected
-- so far, but a full-balance payment promise exists for a future date.
-- Previously this case was indistinguishable from plain "pending" (renewal
-- not yet actioned at all).
ALTER TYPE "PaymentStatus" ADD VALUE IF NOT EXISTS 'promised';