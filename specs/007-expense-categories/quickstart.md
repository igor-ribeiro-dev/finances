# Phase 1 — Quickstart: Categorias de Despesas

**Date**: 2026-06-08 | **Feature**: 007-expense-categories

This is the runbook for verifying the feature end-to-end after implementation
lands on `007-expense-categories`. Follow it during PR review and as the basis
for the manual QA pass before merging.

---

## 0. Prerequisites

- Branch `007-expense-categories` checked out.
- Postgres 15+ available with ICU support (the migration creates the
  `pt_BR_ci_as` collation — fails fast on systems without ICU).
- Dependencies installed (`npm install` at the repo root).
- `.env` files match the feature 006 setup; no new env vars introduced.

```bash
git checkout 007-expense-categories
npm install
```

---

## 1. Apply the migration

```bash
cd backend
npx prisma migrate dev --name 007_expense_categories
```

Expected output:

- New table `Category` created.
- Two partial unique indexes (`category_root_unique`, `category_subcategory_unique`).
- `Expense.category_id` column added with FK `ON DELETE RESTRICT`.
- `IdempotencyKey` refactored: `expense_id` → `resource_id`, FK to Expense
  dropped, `resource_type` enum added.
- `ResourceType` enum exposed to Prisma client.

Sanity-check:

```bash
npx prisma studio   # confirm Category model + Expense.categoryId field appear
```

---

## 2. Run the test suites

Backend (Jest + Supertest):

```bash
cd backend && npm test
```

Expected:

- All new tests under `tests/api/category/*.contract.test.ts` pass.
- All new tests under `tests/application/category/*.use-case.test.ts` pass.
- Updated tests under `tests/api/expense/*` pass (denormalized `category` /
  `subCategory` on responses; `categoryId` accepted on body).
- New test `tests/api/expense/concurrent-category-removal.test.ts` exercises
  the P2003 retry path (FR-018) and asserts `warnings: ["category.removed_concurrently"]`.

Frontend (Jest + RTL):

```bash
cd frontend && npm test
```

Expected:

- New tests under `tests/unit/components/category/*` pass.
- New tests under `tests/unit/hooks/*` for category pass.
- Updated tests under `tests/unit/components/expense/ExpenseFormModal.test.tsx`
  cover the empty-state hint (FR-025), the conditional sub-category picker
  (FR-007 + FR-008), and the single `categoryId` payload mapping.
- Updated tests under `tests/unit/components/expense/ExpenseListItem.test.tsx`
  cover the three label cases (no category / root only / root + sub).

---

## 3. Manual smoke test

Start the local stack:

```bash
# Terminal A
cd backend && npm run dev

# Terminal B
cd frontend && npm run dev
```

Authenticate with an existing test user (or create one via the feature 004 flow):
must be a member of a family group.

### 3.1 — Empty state

Open `/categorias`:

- Expect an empty-state CTA prompting to create the first root category.
- Click "+ Nova categoria" → modal opens with two fields: `Nome` and
  `Categoria pai` (the parent picker is empty / pre-selected as "Sem pai —
  criar como raiz").
- Cancel via `Esc`, click outside, and Cancelar — each closes without
  persisting. Refresh — list remains empty.

### 3.2 — Create root + sub-category (US1)

- Open the modal again, type `Alimentação`, leave parent as "Sem pai", save.
- Expect: row "Alimentação" appears immediately (optimistic UI, FR-017); a
  toast/feedback confirms.
- Open the modal again, type `Mercado`, select parent `Alimentação`, save.
- Expect: "Mercado" appears nested under "Alimentação".
- Open another browser as a second group member → confirm both categories
  visible.

### 3.3 — Assign category on expense (US2)

- Open `/despesas`.
- Click "+ Nova despesa" → expense modal opens.
- Verify the two category selectors are now present below the existing
  fields. With at least one category cadastrada the hint of FR-025 is NOT
  shown.
- Pick "Alimentação", leave sub-category blank, save the expense.
- Expect: row shows the label `Alimentação` next to the standard 5 fields.
- Edit that expense → pick "Alimentação → Mercado". Expect label updates to
  `Alimentação · Mercado`.

### 3.4 — Single-column mapping check (FR-008)

Open the browser devtools Network tab. Submit an expense with only the root
selected → the POST body should carry `categoryId: <root.id>`. Submit one with
sub-category → the body carries `categoryId: <subCategory.id>`. There is no
`subCategoryId` field on the wire (FR-008 / FR-026).

### 3.5 — Empty-state hint (FR-025)

- Drop the local DB: `cd backend && npx prisma migrate reset --force`.
- Reapply migration: `npx prisma migrate dev`.
- Create a fresh user + group; do NOT create any categories.
- Open `/despesas` → click "+ Nova despesa".
- Expect: both selectors visible with `(sem categoria)` as the only option;
  below them, a discreet text "Cadastre categorias em → Categorias" linking
  to `/categorias`. Submit works without any category.

### 3.6 — Edit / move / rename (US3 happy path)

- On `/categorias`, click the edit icon on "Mercado".
- Modal opens pre-filled. Parent picker shows only OTHER roots (currently no
  others exist, so picker shows just "Alimentação" disabled, since you can't
  set its own root as parent).
- Cancel, then create a new root "Lazer".
- Re-edit "Mercado", set parent to "Lazer", save.
- Expect: "Mercado" now nested under "Lazer".
- Re-edit "Mercado" trying to clear the parent (turn it into a root) →
  expect 422 `category.role_immutable` (PT-BR message rendered inline).

### 3.7 — Delete: 204 happy path

- Create a brand-new root "Saúde" (no children, no expenses).
- Click delete on "Saúde" → confirmation modal (destructive variant) opens.
- Confirm → row disappears optimistically, DELETE returns 204, no toast
  error.

### 3.8 — Delete: 409 blocking path (FR-013 + FR-014)

- Try deleting "Alimentação" (has the sub "Mercado" with at least 1 expense).
- Before the modal opens, `GET /api/v1/categories/<id>/delete-preview` is
  called; verify in Network tab that it returns
  `{ subCategoriesCount: 1, affectedExpensesCount: ≥1 }`.
- The modal opened is the BLOCKING variant: title "Não é possível excluir
  esta categoria", body lists exact counts, a single `OK` button. No
  "Excluir" button is rendered. Confirm by inspecting the DOM that no
  DELETE request is fired when you press OK.

### 3.9 — Concurrent removal warning (FR-018)

Two terminals, two browsers:

- Browser A: open the expense form modal, pick a fresh category just
  created (no other expense uses it yet). Don't submit.
- Browser B: delete that category (it should succeed because it has no
  expenses yet).
- Browser A: submit the expense form.
- Expect: expense saves; toast says "A categoria selecionada foi removida;
  a despesa foi salva sem categoria." The expense row shows no category
  label. Inspect the POST response payload to confirm
  `warnings: ["category.removed_concurrently"]`.

### 3.10 — Uniqueness under race (FR-005 / FR-028)

```bash
# Use curl or a quick script — two POSTs in parallel with same payload.
for i in 1 2; do
  curl -X POST http://localhost:3000/api/v1/categories \
    -H 'Content-Type: application/json' \
    -H "Cookie: sid=$SID" \
    -H "Idempotency-Key: $(uuidgen)" \
    --data '{"name":"Outros","parentId":null}' &
done
wait
```

Expect: exactly one 201 and exactly one 422 with code `category.duplicate_name`.
Postgres enforces the unique partial index; no duplicate rows in DB.

---

## 4. Lint and type-check

```bash
cd backend && npm run lint && npm run build
cd frontend && npm run lint && npm run build
```

Both must pass cleanly.

---

## 5. Acceptance criteria mapping

| Spec ID | Verified by step |
|---|---|
| US1 (create tree) | 3.1, 3.2 |
| US2 (assign category) | 3.3, 3.4 |
| US3 (reorganize) | 3.6, 3.7, 3.8 |
| FR-005 / FR-028 (unicidade) | 3.10 |
| FR-007 / FR-025 (picker + empty hint) | 3.3, 3.5 |
| FR-008 (single-column payload) | 3.4 |
| FR-013 / FR-014 (delete block + preview) | 3.7, 3.8 |
| FR-017 (optimistic UI) | 3.2, 3.7 |
| FR-018 (concurrent removal) | 3.9 |
| FR-022 (modal pattern) | 3.1, 3.6 |
| FR-026 (denormalized response) | 3.3 (DevTools inspection) |
| FR-027 (flat list response) | Test suite + DevTools inspection |
| FR-021 (nav active) | Sidebar — "Categorias" is no longer "Em breve" |
| SC-001 (5 min tree setup) | Wall-clock during 3.2 |
| SC-006 (50 cats ≤ 1s) | DevTools timing on `/categorias` and the expense form picker |

---

## 6. Rollback procedure (if needed)

This feature touches the existing `Expense` and `IdempotencyKey` tables.
Rollback steps if production deploy needs to be reverted:

```sql
-- 1. Remove the new FK + column on Expense
ALTER TABLE "Expense" DROP CONSTRAINT "Expense_categoryId_fkey";
ALTER TABLE "Expense" DROP COLUMN "category_id";

-- 2. Restore typed FK on IdempotencyKey
ALTER TABLE "IdempotencyKey" RENAME COLUMN "resource_id" TO "expense_id";
ALTER TABLE "IdempotencyKey" DROP COLUMN "resource_type";
ALTER TABLE "IdempotencyKey"
  ADD CONSTRAINT "IdempotencyKey_expenseId_fkey"
  FOREIGN KEY ("expense_id") REFERENCES "Expense"("id") ON DELETE CASCADE;
DROP TYPE "ResourceType";

-- 3. Drop the Category table
DROP TABLE "Category" CASCADE;

-- 4. Drop the custom collation (if no other table uses it)
DROP COLLATION IF EXISTS "pt_BR_ci_as";
```

Frontend rollback: revert the commit on the feature branch; the
`Categorias` nav item reverts to `coming-soon`.
