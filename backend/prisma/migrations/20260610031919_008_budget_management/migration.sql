-- 008_budget_management
-- Adds the polymorphic Budget table (FAMILY / MEMBER / CATEGORY targets), two
-- enums, three PARTIAL unique indexes (one per targetType) and a read index.
-- All FKs use ON DELETE CASCADE — excluir grupo/membro/categoria remove os
-- orçamentos associados (FR-015), o oposto do RESTRICT de Expense.categoryId.
--
-- NOTE: the Prisma diff also emitted an `ALTER TABLE "Category" ... normalizedName`
-- block; it was removed on purpose. `normalizedName` is a GENERATED ALWAYS STORED
-- column (created in migration 007) that Prisma misrepresents as a plain required
-- String, so every later diff tries to "fix" it; DROP DEFAULT on a generated column
-- would error. This migration leaves the Category table untouched.

-- CreateEnum
CREATE TYPE "BudgetTargetType" AS ENUM ('FAMILY', 'MEMBER', 'CATEGORY');

-- CreateEnum
CREATE TYPE "BudgetLimitType" AS ENUM ('ABSOLUTE', 'PERCENT');

-- CreateTable
CREATE TABLE "Budget" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "month" DATE NOT NULL,
    "targetType" "BudgetTargetType" NOT NULL,
    "targetMemberId" TEXT,
    "targetCategoryId" TEXT,
    "limitType" "BudgetLimitType" NOT NULL,
    "amountCents" INTEGER,
    "percent" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Budget_pkey" PRIMARY KEY ("id")
);

-- CreateIndex (read path for the month picture)
CREATE INDEX "budget_group_month_idx" ON "Budget"("groupId", "month");

-- CreateIndex — PARTIAL UNIQUE: at most one budget per (group, month, target)
CREATE UNIQUE INDEX "budget_family_uq"
    ON "Budget"("groupId", "month")
    WHERE "targetType" = 'FAMILY';

CREATE UNIQUE INDEX "budget_member_uq"
    ON "Budget"("groupId", "month", "targetMemberId")
    WHERE "targetType" = 'MEMBER';

CREATE UNIQUE INDEX "budget_category_uq"
    ON "Budget"("groupId", "month", "targetCategoryId")
    WHERE "targetType" = 'CATEGORY';

-- AddForeignKey
ALTER TABLE "Budget" ADD CONSTRAINT "Budget_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "FamilyGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Budget" ADD CONSTRAINT "Budget_targetMemberId_fkey" FOREIGN KEY ("targetMemberId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Budget" ADD CONSTRAINT "Budget_targetCategoryId_fkey" FOREIGN KEY ("targetCategoryId") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;
