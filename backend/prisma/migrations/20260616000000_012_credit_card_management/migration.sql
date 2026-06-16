-- 012_credit_card_management
--
-- Adds the CreditCard model and extends Bill for two card-linked roles
-- (credit-card purchase and fatura) on top of the consolidated bills model
-- (features 010/011). No data conversion: pre-existing CREDIT_CARD bills keep
-- creditCardId = NULL (grandfathered, outside per-card views).
--
-- Hand-authored additions Prisma cannot express: the GENERATED normalizedName
-- column on CreditCard (collated pt_BR_ci_as, reusing the collation created in
-- migration 007), the partial unique index for active-card name uniqueness, and
-- the partial unique index enforcing one pending fatura per card (FR-012a).

-- CreateEnum
CREATE TYPE "CreditCardStatus" AS ENUM ('ACTIVE', 'ARCHIVED');

-- CreateTable: CreditCard. normalizedName is STORED generated, collated
-- pt_BR_ci_as (created in 007) — case-insensitive / accent-sensitive — backing
-- the partial unique index on ACTIVE cards.
CREATE TABLE "CreditCard" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "name" VARCHAR(60) NOT NULL,
    "closingDay" INTEGER NOT NULL,
    "status" "CreditCardStatus" NOT NULL DEFAULT 'ACTIVE',
    "normalizedName" TEXT COLLATE "pt_BR_ci_as" GENERATED ALWAYS AS (lower(regexp_replace(btrim("name"), '\s+', ' ', 'g'))) STORED,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CreditCard_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "credit_card_group_idx" ON "CreditCard"("groupId");

-- CreateIndex: name unique among ACTIVE cards in the group (archived names freed).
CREATE UNIQUE INDEX "credit_card_active_name_unique" ON "CreditCard"("groupId", "normalizedName") WHERE "status" = 'ACTIVE';

-- AlterTable: Bill gains the card link, fatura marker, and settlement self-link.
ALTER TABLE "Bill"
  ADD COLUMN "creditCardId" TEXT,
  ADD COLUMN "isFatura" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "settledByFaturaId" TEXT;

-- CreateIndex
CREATE INDEX "bill_credit_card_idx" ON "Bill"("creditCardId");

-- CreateIndex: at most one PENDING fatura per card (FR-012a), race-safe at the DB.
CREATE UNIQUE INDEX "bill_one_pending_fatura_per_card" ON "Bill"("creditCardId") WHERE "isFatura" = true AND "status" = 'PENDING';

-- AddForeignKey: card link is RESTRICT so a card with bills cannot be deleted (FR-002).
ALTER TABLE "Bill" ADD CONSTRAINT "Bill_creditCardId_fkey" FOREIGN KEY ("creditCardId") REFERENCES "CreditCard"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey: settlement self-link is SET NULL (reverting a fatura clears it).
ALTER TABLE "Bill" ADD CONSTRAINT "Bill_settledByFaturaId_fkey" FOREIGN KEY ("settledByFaturaId") REFERENCES "Bill"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreditCard" ADD CONSTRAINT "CreditCard_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "FamilyGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;
