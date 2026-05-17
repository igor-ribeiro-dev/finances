# Data Model Overview

**Branch**: `003-product-roadmap` | **Date**: 2026-05-17

This document provides a high-level domain entity overview for the entire
product. Individual feature specs will refine attributes, validations, and
relationships as each feature is planned.

All monetary values are stored as integers (cents) in accordance with
Constitution Principle III.

---

## Core Entities

### FamilyGroup
The shared unit connecting all household members. All data in the app belongs
to a FamilyGroup.

| Field | Notes |
|-------|-------|
| id | Unique identifier |
| name | Display name chosen by the creator |
| inviteCode | Short code/token used to join the group |
| createdAt | Timestamp |

---

### Member
A user who belongs to a FamilyGroup. All members are equal — no role
differentiation.

| Field | Notes |
|-------|-------|
| id | Unique identifier |
| familyGroupId | FK → FamilyGroup |
| displayName | Name shown in the UI |
| email | Used for authentication |
| passwordHash | Stored securely; never in plain text |
| createdAt | Timestamp |

---

### Category
A two-level expense category shared across the FamilyGroup.

| Field | Notes |
|-------|-------|
| id | Unique identifier |
| familyGroupId | FK → FamilyGroup |
| parentId | FK → Category (null for root categories) |
| name | Display name (PT-BR) |
| isRoot | Derived: true when parentId is null |

**Constraint**: Maximum depth of 2 (root + one sub-level). A sub-category
cannot itself have children.

---

### Expense
A recorded financial outflow belonging to a family member. The foundational
data entry of the app.

| Field | Notes |
|-------|-------|
| id | Unique identifier |
| familyGroupId | FK → FamilyGroup |
| memberId | FK → Member (the member the expense belongs to) |
| recordedById | FK → Member (the member who entered the data) |
| categoryId | FK → Category (nullable — category assignment is optional) |
| amountCents | Integer (cents) |
| description | Free-text description |
| expenseDate | Calendar date of the expense |
| createdAt | Timestamp |

---

### Budget
A monthly spending limit. Can be set at the family group level or for an
individual member, and at the root-category level with optional sub-category
breakdowns.

| Field | Notes |
|-------|-------|
| id | Unique identifier |
| familyGroupId | FK → FamilyGroup |
| memberId | FK → Member (null = family-level budget) |
| categoryId | FK → Category (null = total budget across all categories) |
| month | Year-month (e.g., 2026-05) |
| limitCents | Integer (cents) |

**Valid combinations**:
- `memberId=null, categoryId=null` → total family budget for the month
- `memberId=X, categoryId=null` → total individual budget for member X
- `memberId=null, categoryId=Y` → family budget for root/sub-category Y
- `memberId=X, categoryId=Y` → individual budget for member X in category Y

---

### Bill
An expected monthly financial obligation in the Monthly Payment Tracker.
Separate from an Expense — a Bill is what you *expect* to pay; an Expense is
what you *did* pay.

| Field | Notes |
|-------|-------|
| id | Unique identifier |
| familyGroupId | FK → FamilyGroup |
| memberId | FK → Member (the member responsible for this bill) |
| categoryId | FK → Category (nullable) |
| creditCardId | FK → CreditCard (null for regular bills; set when this Bill represents a fatura) |
| description | Name of the bill (e.g., "Aluguel", "Conta de luz", "Fatura Nubank") |
| estimatedAmountCents | Integer (cents) — expected amount |
| dueDay | Day of month (1–31) the bill is typically due |
| isRecurring | Boolean — if true, auto-populates every month |
| createdAt | Timestamp |

**Fatura identification**: When `creditCardId` is set, this Bill is a credit
card fatura. The system uses this to apply the double-counting prevention rule:
cash-outflow totals for the month exclude all Expenses with that `creditCardId`
and instead count only the BillPayment amount for this fatura.

---

### BillPayment
Records the settlement event for a Bill in a specific month.

| Field | Notes |
|-------|-------|
| id | Unique identifier |
| billId | FK → Bill |
| month | Year-month this payment applies to (e.g., 2026-05) |
| status | Enum: PENDING, PAID, CANCELLED |
| paidAmountCents | Integer (cents) — actual amount paid (null if not PAID) |
| paymentDate | Date the payment was made (null if not PAID) |
| expenseId | FK → Expense (created automatically when status → PAID; null otherwise) |
| updatedAt | Timestamp |

**State transitions**:
```
PENDING → PAID (records paidAmountCents, paymentDate; creates Expense)
PENDING → CANCELLED (no amount recorded; Expense not created)
PAID    → PENDING (undo; nullifies paidAmountCents and paymentDate; deletes linked Expense)
CANCELLED → PENDING (reopen)
```

---

### CreditCard
A credit card registered to the family group. Used to label which card was
used for an expense and to identify the corresponding fatura bill.

| Field | Notes |
|-------|-------|
| id | Unique identifier |
| familyGroupId | FK → FamilyGroup |
| name | Display name chosen by the user (e.g., "Nubank", "Itaú Visa") |
| createdAt | Timestamp |

---

### Expense (updated)
An Expense carries a payment method. Credit card expenses count toward
**category budgets** at purchase date but are **excluded from cash-outflow
totals** — only the fatura payment is the actual cash transaction. This
prevents double-counting: R$100 water bill on card + R$1.000 fatura ≠ R$1.100
total paid.

| Field | Notes |
|-------|-------|
| id | Unique identifier |
| familyGroupId | FK → FamilyGroup |
| memberId | FK → Member (the member this expense belongs to) |
| recordedById | FK → Member (the member who entered the data) |
| categoryId | FK → Category (nullable) |
| amountCents | Integer (cents) |
| description | Free-text description |
| expenseDate | Calendar date |
| paymentMethod | Enum: CASH_OR_DEBIT, CREDIT_CARD |
| creditCardId | FK → CreditCard (null unless paymentMethod = CREDIT_CARD) |
| createdAt | Timestamp |

**Parent-child payment model**:
- A credit card expense is a *child* record — it shows WHERE the money was spent (category, member) and contributes to budget totals.
- The fatura BillPayment is the *parent* cash event — it shows WHEN the money actually left the pocket.
- Both appear in expense history and reports as distinct line items.

**Calculation rule**:
- Budget totals: include ALL expenses (CASH_OR_DEBIT + CREDIT_CARD) at expenseDate — by category and member.
- Cash-outflow totals ("total cash paid"): include only CASH_OR_DEBIT expenses + fatura BillPayments; exclude CREDIT_CARD child expenses to prevent double-counting.
- Example: R$100 water via card + R$1.000 fatura paid → budget shows R$100 in Utilities; cash total shows R$1.000 (fatura), not R$1.100.

---

## Entity Relationship Summary

```
FamilyGroup
  ├── Member (1:N)
  ├── Category (1:N, self-referencing for sub-categories)
  ├── CreditCard (1:N)
  │     ├── Expense (1:N, via creditCardId — individual card purchases)
  │     └── Bill (0:N, via creditCardId — fatura bills)
  ├── Expense (1:N, via Member)
  ├── Budget (1:N)
  └── Bill (1:N)
        └── BillPayment (1:N, one per month per Bill)
                └── Expense (1:1, created on payment — CASH_OR_DEBIT type)
```

**Double-counting prevention**: Credit card expenses contribute to budget
category totals but are excluded from cash-outflow totals. The fatura BillPayment
is the sole cash-outflow record for credit card spending. The app must enforce
this calculation rule across all summaries, dashboards, and reports.

---

## Notes for Individual Feature Plans

- **Feature 004** (Auth & Groups): Defines Member and FamilyGroup in full detail,
  including invite-code generation and session management.
- **Feature 005** (Expense Registration): Defines Expense CRUD, ownership
  assignment, category linking, and `paymentMethod` tag (CASH_OR_DEBIT or
  CREDIT_CARD). All expenses count against the budget at registration date.
- **Feature 006** (Categories): Defines Category CRUD with the two-level
  hierarchy constraint.
- **Feature 007** (Budget Management): Defines Budget CRUD and the valid
  combination matrix. All expenses (including credit card tagged ones) count
  toward budgets at registration date.
- **Feature 015** (Monthly Payment Tracker): Defines Bill and BillPayment,
  including the state machine and the auto-creation of Expense on payment.
  Credit card faturas appear here as manually-added Bills, not auto-generated.
- **Feature 016** (Credit Card Management): Defines CreditCard entity (name
  only — no billing cycle). Adds `paymentMethod` and `creditCardId` to Expense.
  Fatura is a user-created Bill entry in the tracker. Enforces double-counting
  prevention rule across all cash-outflow calculations.
- **Feature 012** (Recurring Expenses): Extends Bill with `isRecurring=true`
  logic and the monthly auto-population of BillPayment records.
