-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('super_admin', 'accounts_team', 'employee');

-- CreateEnum
CREATE TYPE "EmployeeMode" AS ENUM ('view', 'view_edit');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('pending', 'partial', 'collected', 'overdue', 'waived');

-- CreateEnum
CREATE TYPE "GSTStatus" AS ENUM ('Y', 'N');

-- CreateEnum
CREATE TYPE "ContractStatus" AS ENUM ('active', 'stopped');

-- CreateEnum
CREATE TYPE "PaymentType" AS ENUM ('onboarding', 'renewal');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "mode" "EmployeeMode",
    "salesperson" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Contract" (
    "id" TEXT NOT NULL,
    "salesperson" TEXT NOT NULL,
    "clientName" TEXT NOT NULL,
    "product" TEXT NOT NULL,
    "accountManager" TEXT NOT NULL,
    "contractId" TEXT,
    "profiles" INTEGER NOT NULL,
    "gstStatus" "GSTStatus" NOT NULL,
    "dealValue" DOUBLE PRECISION NOT NULL,
    "contractTermMonths" INTEGER NOT NULL,
    "firstRenewalDate" TEXT NOT NULL,
    "contractStatus" "ContractStatus" NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Contract_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RenewalMonth" (
    "id" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "overriddenAmount" DOUBLE PRECISION,
    "status" "PaymentStatus" NOT NULL DEFAULT 'pending',

    CONSTRAINT "RenewalMonth_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "renewalYear" INTEGER NOT NULL,
    "renewalMonth" INTEGER NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "paidOn" TEXT NOT NULL,
    "notes" TEXT,
    "recordedBy" TEXT NOT NULL,
    "type" "PaymentType" NOT NULL DEFAULT 'renewal',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Promise" (
    "id" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "clientName" TEXT NOT NULL,
    "salesperson" TEXT NOT NULL,
    "renewalYear" INTEGER NOT NULL,
    "renewalMonth" INTEGER NOT NULL,
    "paidAmount" DOUBLE PRECISION NOT NULL,
    "remainingAmount" DOUBLE PRECISION NOT NULL,
    "promisedDate" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Promise_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClientNote" (
    "id" TEXT NOT NULL,
    "clientName" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT NOT NULL,

    CONSTRAINT "ClientNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OnboardingPayment" (
    "id" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "clientName" TEXT NOT NULL,
    "salesperson" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "amountCollected" DOUBLE PRECISION NOT NULL,
    "paidOn" TEXT NOT NULL,
    "notes" TEXT,

    CONSTRAINT "OnboardingPayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PriceOverride" (
    "id" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "fromYear" INTEGER NOT NULL,
    "fromMonth" INTEGER NOT NULL,
    "newAmount" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PriceOverride_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContractEdit" (
    "id" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "changes" JSONB NOT NULL,
    "previousValues" JSONB NOT NULL,
    "editedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "editedBy" TEXT NOT NULL,

    CONSTRAINT "ContractEdit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "RenewalMonth_contractId_year_month_key" ON "RenewalMonth"("contractId", "year", "month");

-- CreateIndex
CREATE UNIQUE INDEX "OnboardingPayment_contractId_key" ON "OnboardingPayment"("contractId");

-- AddForeignKey
ALTER TABLE "RenewalMonth" ADD CONSTRAINT "RenewalMonth_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "Contract"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "Contract"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Promise" ADD CONSTRAINT "Promise_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "Contract"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OnboardingPayment" ADD CONSTRAINT "OnboardingPayment_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "Contract"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PriceOverride" ADD CONSTRAINT "PriceOverride_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "Contract"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractEdit" ADD CONSTRAINT "ContractEdit_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "Contract"("id") ON DELETE CASCADE ON UPDATE CASCADE;
