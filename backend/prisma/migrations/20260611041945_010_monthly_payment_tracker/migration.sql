-- CreateEnum (idempotent — enums may have been created by a partially-applied migration)
DO $$ BEGIN CREATE TYPE "BillStatus" AS ENUM ('PENDING', 'PAID', 'CANCELLED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE "RecurrenceInterval" AS ENUM ('MONTHLY', 'ANNUAL');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE "RecurringBillStatus" AS ENUM ('ACTIVE', 'PAUSED', 'STOPPED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- CreateTable
CREATE TABLE "RecurringBill" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "description" VARCHAR(200) NOT NULL,
    "expectedAmountCents" INTEGER NOT NULL,
    "dueDay" INTEGER NOT NULL,
    "interval" "RecurrenceInterval" NOT NULL,
    "startMonth" DATE NOT NULL,
    "activeFromMonth" DATE NOT NULL,
    "status" "RecurringBillStatus" NOT NULL DEFAULT 'ACTIVE',
    "categoryId" TEXT,
    "ownerMemberId" TEXT,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RecurringBill_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Bill" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "description" VARCHAR(200) NOT NULL,
    "expectedAmountCents" INTEGER NOT NULL,
    "dueDate" DATE NOT NULL,
    "month" DATE NOT NULL,
    "status" "BillStatus" NOT NULL DEFAULT 'PENDING',
    "categoryId" TEXT,
    "ownerMemberId" TEXT,
    "recurringBillId" TEXT,
    "paidDate" DATE,
    "actualAmountCents" INTEGER,
    "paidByMemberId" TEXT,
    "paymentMethod" "PaymentMethod",
    "expenseId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Bill_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "recurring_bill_group_idx" ON "RecurringBill"("groupId");

-- CreateIndex
CREATE UNIQUE INDEX "Bill_expenseId_key" ON "Bill"("expenseId");

-- CreateIndex
CREATE INDEX "bill_group_month_idx" ON "Bill"("groupId", "month");

-- AddForeignKey
ALTER TABLE "RecurringBill" ADD CONSTRAINT "RecurringBill_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "FamilyGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecurringBill" ADD CONSTRAINT "RecurringBill_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecurringBill" ADD CONSTRAINT "RecurringBill_ownerMemberId_fkey" FOREIGN KEY ("ownerMemberId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bill" ADD CONSTRAINT "Bill_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "FamilyGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bill" ADD CONSTRAINT "Bill_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bill" ADD CONSTRAINT "Bill_ownerMemberId_fkey" FOREIGN KEY ("ownerMemberId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bill" ADD CONSTRAINT "Bill_recurringBillId_fkey" FOREIGN KEY ("recurringBillId") REFERENCES "RecurringBill"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bill" ADD CONSTRAINT "Bill_paidByMemberId_fkey" FOREIGN KEY ("paidByMemberId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bill" ADD CONSTRAINT "Bill_expenseId_fkey" FOREIGN KEY ("expenseId") REFERENCES "Expense"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Partial unique index: at most one Bill per (recurringBillId, month) — idempotency for the scheduler job
CREATE UNIQUE INDEX "bill_recurring_month_unique_idx" ON "Bill" ("recurringBillId", "month") WHERE "recurringBillId" IS NOT NULL;
