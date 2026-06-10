-- 007_expense_categories
--
-- Adds the Category model (root + sub-category, max depth 2), the optional
-- Expense.categoryId FK (ON DELETE RESTRICT), and refactors IdempotencyKey to the
-- polymorphic (resourceType + resourceId) shape so the same 24h-TTL dedupe table
-- serves both EXPENSE and CATEGORY creations (FR-015 / data-model.md).
--
-- Hand-authored additions on top of the Prisma baseline (Prisma cannot express
-- these): the ICU collation, the GENERATED normalizedName column, and the two
-- partial unique indexes enforcing case/whitespace-insensitive uniqueness per
-- scope (FR-005 / FR-028, race-safe at the DB).

-- Collation pt_BR_ci_as: case-insensitive ("Alimentação" = "alimentação"),
-- accent-sensitive ("Aves" <> "Avés"). deterministic=false is required for
-- non-binary equality so it can back a unique index. Created idempotently.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_collation WHERE collname = 'pt_BR_ci_as') THEN
    CREATE COLLATION "pt_BR_ci_as" (
      provider = icu,
      locale = 'pt-BR-u-ks-level2',
      deterministic = false
    );
  END IF;
END $$;

-- CreateEnum
CREATE TYPE "ResourceType" AS ENUM ('EXPENSE', 'CATEGORY');

-- DropForeignKey
ALTER TABLE "IdempotencyKey" DROP CONSTRAINT "IdempotencyKey_expenseId_fkey";

-- AlterTable
ALTER TABLE "Expense" ADD COLUMN     "categoryId" TEXT;

-- AlterTable: IdempotencyKey -> polymorphic. The cache was emptied before this
-- migration (24h TTL throwaway data), so the NOT NULL adds are safe.
ALTER TABLE "IdempotencyKey" DROP COLUMN "expenseId",
ADD COLUMN     "resourceId" TEXT NOT NULL,
ADD COLUMN     "resourceType" "ResourceType" NOT NULL;

-- CreateTable: Category. normalizedName is a STORED generated column collated
-- pt_BR_ci_as — it is the authoritative normalization (trim + collapse internal
-- whitespace + lowercase) backing the two partial unique indexes below.
CREATE TABLE "Category" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "name" VARCHAR(60) NOT NULL,
    "parentId" TEXT,
    "normalizedName" TEXT COLLATE "pt_BR_ci_as" GENERATED ALWAYS AS (lower(regexp_replace(btrim("name"), '\s+', ' ', 'g'))) STORED,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "category_group_idx" ON "Category"("groupId");

-- CreateIndex: partial index for the (parentId) read path (sub-categories only).
CREATE INDEX "category_parent_idx" ON "Category"("parentId") WHERE "parentId" IS NOT NULL;

-- CreateIndex: uniqueness for ROOT categories — Postgres treats NULL as distinct
-- in plain uniques, so two roots with the same normalized name would slip through
-- without this partial predicate.
CREATE UNIQUE INDEX "category_root_unique" ON "Category"("groupId", "normalizedName") WHERE "parentId" IS NULL;

-- CreateIndex: uniqueness for SUB-categories within the same parent.
CREATE UNIQUE INDEX "category_subcategory_unique" ON "Category"("groupId", "parentId", "normalizedName") WHERE "parentId" IS NOT NULL;

-- CreateIndex
CREATE INDEX "expense_category_idx" ON "Expense"("categoryId") WHERE "categoryId" IS NOT NULL;

-- CreateIndex
CREATE INDEX "idempotency_resource_idx" ON "IdempotencyKey"("resourceType", "resourceId");

-- AddForeignKey
ALTER TABLE "Category" ADD CONSTRAINT "Category_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "FamilyGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Category" ADD CONSTRAINT "Category_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
