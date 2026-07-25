-- Adds an optional per-renewal date override.
-- Nullable, so this is a safe no-backfill migration:
--   NULL = no manual correction, effective due date is still derived
--   from Contract.firstRenewalDate + (year, month) exactly as before.
ALTER TABLE "RenewalMonth" ADD COLUMN "actualDueDate" TIMESTAMP(3);