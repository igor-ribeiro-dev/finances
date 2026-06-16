-- ═══════════════════════════════════════════════════════════════════════════
-- Feature 011: Expense Consolidation
-- ⚠️  IRREVERSIBLE — run a full database backup before applying in production.
-- All steps run in a single transaction for atomicity.
-- ═══════════════════════════════════════════════════════════════════════════

-- Step 1a: Add authorship columns to Bill (nullable — legacy bills have no author).
ALTER TABLE "Bill"
  ADD COLUMN "createdById" TEXT,
  ADD COLUMN "updatedById" TEXT;

-- Step 1b: Add performance index on (groupId, paidDate) — paridad with old expense_group_date_id_idx.
CREATE INDEX "bill_group_paiddate_idx" ON "Bill"("groupId", "paidDate");

-- Step 1c: Change Bill.categoryId FK from ON DELETE SET NULL to ON DELETE RESTRICT
--          (paridade com a antiga regra de despesa; preserva categoria histórica — R8).
ALTER TABLE "Bill" DROP CONSTRAINT "Bill_categoryId_fkey";
ALTER TABLE "Bill"
  ADD CONSTRAINT "Bill_categoryId_fkey"
  FOREIGN KEY ("categoryId") REFERENCES "Category"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- Step 1d: Add FK constraints for new authorship columns.
ALTER TABLE "Bill"
  ADD CONSTRAINT "Bill_createdById_fkey"
  FOREIGN KEY ("createdById") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Bill"
  ADD CONSTRAINT "Bill_updatedById_fkey"
  FOREIGN KEY ("updatedById") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- Step 2: Backfill authorship for Bills already linked to an Expense.
UPDATE "Bill" b
SET
  "createdById" = e."createdById",
  "updatedById" = e."updatedById"
FROM "Expense" e
WHERE b."expenseId" = e."id";

-- Step 3: Convert standalone Expenses (not linked to any Bill) → PAID Bills.
-- Log count for observability (no monetary values).
DO $$
DECLARE
  converted_count INTEGER;
BEGIN
  INSERT INTO "Bill" (
    id, "groupId", description, "expectedAmountCents",
    "dueDate", month, status,
    "categoryId", "ownerMemberId", "recurringBillId",
    "paidDate", "actualAmountCents", "paidByMemberId", "paymentMethod",
    "createdById", "updatedById",
    "createdAt", "updatedAt"
  )
  SELECT
    gen_random_uuid()::text,
    e."groupId",
    e.description,
    e."amountCents",
    e.date,
    date_trunc('month', e.date)::date,
    'PAID'::"BillStatus",
    e."categoryId",
    NULL,          -- ownerMemberId = NULL (Q3)
    NULL,          -- recurringBillId = NULL
    e.date,        -- paidDate = purchase date
    e."amountCents",
    e."ownerMemberId",  -- paidByMemberId = former owner (Q3: payer = responsible)
    e."paymentMethod",
    e."createdById",
    e."updatedById",
    e."createdAt",
    e."updatedAt"
  FROM "Expense" e
  WHERE e.id NOT IN (
    SELECT "expenseId" FROM "Bill" WHERE "expenseId" IS NOT NULL
  );

  GET DIAGNOSTICS converted_count = ROW_COUNT;
  RAISE NOTICE '011_expense_consolidation: converted % standalone expense(s) to PAID bills', converted_count;
END $$;

-- Step 4: Drop expenseId column (and its FK + unique constraint) from Bill.
ALTER TABLE "Bill" DROP CONSTRAINT IF EXISTS "Bill_expenseId_fkey";
ALTER TABLE "Bill" DROP CONSTRAINT IF EXISTS "Bill_expenseId_key";
ALTER TABLE "Bill" DROP COLUMN IF EXISTS "expenseId";

-- Step 5: Drop the Expense table and its indexes.
DROP INDEX IF EXISTS "expense_group_date_id_idx";
DROP INDEX IF EXISTS "expense_category_idx";
DROP TABLE IF EXISTS "Expense";

-- Step 6: Purge orphaned IdempotencyKey rows for EXPENSE resources.
DO $$
DECLARE
  purged_count INTEGER;
BEGIN
  DELETE FROM "IdempotencyKey" WHERE "resourceType" = 'EXPENSE';
  GET DIAGNOSTICS purged_count = ROW_COUNT;
  RAISE NOTICE '011_expense_consolidation: purged % EXPENSE idempotency key(s)', purged_count;
END $$;
