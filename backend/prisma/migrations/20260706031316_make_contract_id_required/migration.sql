/*
  Warnings:

  - Made the column `contractId` on table `Contract` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "Contract" ALTER COLUMN "contractId" SET NOT NULL;

-- CreateIndex
CREATE INDEX "Contract_contractId_idx" ON "Contract"("contractId");
