# Roadmap Completeness Checklist: Product Roadmap Guide

**Purpose**: Validate that each feature entry contains sufficient detail to initiate a `/speckit-specify` session without requiring additional research. Author self-review gate before `/speckit-tasks`.
**Created**: 2026-05-17
**Feature**: [spec.md](../spec.md) | [data-model.md](../data-model.md)

---

## Feature Entry Completeness

*Are individual feature descriptions specific enough to start a spec?*

- [ ] CHK001 — Is the scope of feature 004 (Auth & Family Groups) sufficient to specify session management, logout, and password-reset flows without ambiguity? [Completeness, Gap]
- [ ] CHK002 — Does feature 004 define what happens when an invite link/code is reused, expired, or used after the group already has members? [Edge Case, Gap]
- [ ] CHK003 — Does feature 004 specify whether a member can leave or be removed from a family group, and what happens to their expenses? [Completeness, Gap]
- [ ] CHK004 — Does feature 005 (Expense Registration) specify whether expenses can be edited or deleted after creation, and what constraints apply? [Completeness, Gap]
- [ ] CHK005 — Does feature 006 (Categories) specify whether categories can be renamed or deleted, and what happens to expenses assigned to a deleted category? [Completeness, Gap]
- [ ] CHK006 — Does feature 006 define whether the app ships with default/seed categories or starts empty? [Completeness, Gap]
- [ ] CHK007 — Does feature 007 (Budget Management) define what happens when a sub-category budget exceeds its root-category cap? [Consistency, Gap]
- [ ] CHK008 — Does feature 007 specify whether a monthly budget can be copied or rolled over from the previous month? [Completeness, Gap]
- [x] CHK009 — Does feature 008 (Dashboard) define whether the user can view past months, or only the current calendar month? [Completeness, Gap] → RESOLVED: defaults to current month, navigable to any past month
- [ ] CHK010 — Does feature 008 specify what the dashboard displays when there is no data yet for the current month (empty state)? [Edge Case, Gap]
- [ ] CHK011 — Does feature 010 (Budget Alerts) quantify "approaching" a budget limit with a specific threshold (e.g., 80%, 90%, configurable)? [Clarity, Ambiguity]
- [x] CHK012 — Does feature 010 specify how alerts are delivered — in-app notification only, or additional channels? [Completeness, Gap] → RESOLVED: in-app only; no push or email
- [x] CHK013 — Does feature 011 (Expense History) specify whether filtering by payment method (credit card vs. cash) or by specific card is supported? [Completeness, Gap] → RESOLVED: filter by payment method AND specific credit card both supported
- [ ] CHK014 — Does feature 011 define sort order and pagination requirements for large expense histories? [Completeness, Gap]
- [x] CHK015 — Does feature 012 (Recurring Expenses) enumerate the supported recurrence intervals (e.g., monthly, weekly, annual)? [Completeness, Gap] → RESOLVED: monthly and annual
- [x] CHK016 — Does feature 012 specify what happens when a recurring expense is paused, cancelled, or reaches an end date? [Completeness, Gap] → RESOLVED: pause (skips future periods) and stop (permanent); past entries always preserved
- [ ] CHK017 — Does feature 013 (Reports) define how many periods can be compared simultaneously and whether report results can be exported? [Completeness, Gap]
- [ ] CHK018 — Does feature 014 (Data Export) specify which entities are included (expenses only, or also budgets and bills), the column schema, and whether a date range filter is available? [Completeness, Gap]
- [ ] CHK019 — Does feature 015 (Monthly Payment Tracker) specify the month navigation model — default to current month, can navigate to past months, and how far back? [Completeness, Gap]
- [ ] CHK020 — Does feature 016 (Credit Card Management) define whether a credit card can be deactivated or deleted, and what happens to its associated expenses? [Completeness, Gap]

---

## Domain Model Completeness

*Are all entities, relationships, and calculation rules documented well enough to prevent misinterpretation?*

- [ ] CHK021 — Are monetary validation rules (minimum/maximum amount, zero-value handling) defined for Expense.amountCents and Budget.limitCents in the data model? [Completeness, Gap]
- [ ] CHK022 — Is the maximum depth constraint for the Category hierarchy (root + one sub-level only) explicitly documented and consistently stated across spec and data-model? [Consistency, Spec §006, data-model.md]
- [ ] CHK023 — Is the double-counting prevention rule (CREDIT_CARD expenses excluded from cash-outflow totals) consistently referenced in all features that aggregate payment data (008, 011, 013, 015, 016)? [Consistency, Ambiguity]
- [ ] CHK024 — Does the data model define what "month" means for Budget and BillPayment — calendar month boundary (Jan 1 – Jan 31), and how the system handles entries at midnight on month boundaries? [Clarity, Gap]
- [ ] CHK025 — Are the valid state transitions for BillPayment (PENDING → PAID → PENDING undo, PENDING → CANCELLED → PENDING) documented and consistent with the spec's description of the payment tracker? [Consistency, data-model.md]
- [ ] CHK026 — Is the calculation rule for "pending fatura total" per card (sum of CREDIT_CARD expenses with matching creditCardId that have no corresponding paid fatura BillPayment) unambiguously specified? [Clarity, Gap]

---

## Feature Dependencies & Priorities

*Are the dependency graph and priority tiers consistent and free of blocking conflicts?*

- [x] CHK027 — Does feature 009 (Category Analytics) clarify whether the selected period for analysis is the same as the dashboard month or independently configurable? [Completeness, Gap] → RESOLVED: mirrors the dashboard month; no independent period selector
- [ ] CHK028 — Are all P1 features (004–008, 015, 016) achievable as an independent MVP without any P2 or P3 dependencies? [Consistency, Spec §Priority Tiers]
- [ ] CHK029 — Is the dependency of feature 016 on feature 015 correctly ordered — i.e., can a fatura Bill with creditCardId be created only after the payment tracker (015) exists? [Consistency, Spec §016]
- [ ] CHK030 — Are features 012 (Recurring, P3) and 016 (Credit Cards, P1) correctly marked as optional enrichments of feature 015 rather than hard prerequisites? [Consistency, Spec §015]

---

## Cross-Cutting Constraints

*Are product-wide rules applied consistently across all features?*

- [ ] CHK031 — Does every UI-bearing feature (004–016) implicitly rely on the PT-BR language constraint, and is this constraint sufficient without per-feature UI copy specifications? [Completeness, Spec §Cross-Cutting Constraints]
- [ ] CHK032 — Is the "manual entry only, no bank sync" constraint consistently reflected in all features that could be misread as requiring external data (005, 012, 016)? [Consistency, Spec §Assumptions]
- [ ] CHK033 — Is the single-currency constraint (no multi-currency) sufficient for all monetary features (005, 007, 008, 013, 014, 015, 016), or do any feature descriptions leave currency handling ambiguous? [Consistency, Spec §Assumptions]

---

## Identified Ambiguities

*Vague terms or unquantified requirements that would block writing testable acceptance criteria.*

- [x] CHK034 — Is "approaching a budget limit" in feature 010 quantified, or does it remain vague and therefore untestable? [Ambiguity, Spec §010] → RESOLVED: defaults to 80%, optional per-budget override
- [ ] CHK035 — Does feature 009 specify what "percentage share for each category" means when a category has zero expenses — is it shown as 0%, hidden, or omitted? [Edge Case, Gap]
- [x] CHK036 — Does the spec define what "automatically logged at its defined interval" means for feature 012 — specifically, on what day of the month the recurring expense is created, and what happens if that day does not exist in a given month (e.g., Feb 30)? [Clarity, Ambiguity] → RESOLVED: clamped to last day of month

## Notes

- Mark items as `[x]` when resolved; add findings inline
- Items marked `[Gap]` indicate missing requirements that must be addressed in the individual feature's `/speckit-specify` session, not necessarily in this roadmap
- Items marked `[Ambiguity]` are blocking — the roadmap itself must be updated before proceeding
- CHK034 (budget alert threshold) is the only currently blocking ambiguity; all others are deferrable to individual feature specs
