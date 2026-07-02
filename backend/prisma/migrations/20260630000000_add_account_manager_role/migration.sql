-- AlterEnum
-- NOTE: ALTER TYPE ... ADD VALUE must run outside a transaction block.
-- Prisma's migrate deploy/dev handles this automatically. Do not wrap
-- this in a manual transaction if applying by hand.
ALTER TYPE "UserRole" ADD VALUE 'account_manager';

-- AlterTable
ALTER TABLE "User" ADD COLUMN "accountManager" TEXT;