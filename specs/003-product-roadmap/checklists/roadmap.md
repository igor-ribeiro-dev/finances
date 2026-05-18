# Roadmap Completeness Checklist: Product Roadmap Guide

**Purpose**: Validate that each feature entry contains sufficient detail to initiate a `/speckit-specify` session without requiring additional research. Author self-review gate before `/speckit-tasks`.
**Created**: 2026-05-17
**Feature**: [spec.md](../spec.md) | [data-model.md](../data-model.md)

---

## Feature Entry Completeness

*Are individual feature descriptions specific enough to start a spec?*

- [x] CHK001 — Is the scope of feature 004 (Auth & Family Groups) sufficient to specify session management, logout, and password-reset flows without ambiguity? [Completeness, Gap] → DEFERRED to spec 004 — session/logout/reset details belong in that feature's spec
- [x] CHK002 — Does feature 004 define what happens when an invite link/code is reused, expired, or used after the group already has members? [Edge Case, Gap] → DEFERRED to spec 004
- [x] CHK003 — Does feature 004 specify whether a member can leave or be removed from a family group, and what happens to their expenses? [Completeness, Gap] → DEFERRED to spec 004
- [x] CHK004 — Does feature 005 (Expense Registration) specify whether expenses can be edited or deleted after creation, and what constraints apply? [Completeness, Gap] → DEFERRED to spec 005
- [x] CHK005 — Does feature 006 (Categories) specify whether categories can be renamed or deleted, and what happens to expenses assigned to a deleted category? [Completeness, Gap] → DEFERRED to spec 006
- [x] CHK006 — Does feature 006 define whether the app ships with default/seed categories or starts empty? [Completeness, Gap] → DEFERRED to spec 006
- [x] CHK007 — Does feature 007 (Budget Management) define what happens when a sub-category budget exceeds its root-category cap? [Consistency, Gap] → RESOLVED: advisory warning; save not blocked (CHK039)
- [x] CHK008 — Does feature 007 specify whether a monthly budget can be copied or rolled over from the previous month? [Completeness, Gap] → DEFERRED to spec 007
- [x] CHK009 — Does feature 008 (Dashboard) define whether the user can view past months, or only the current calendar month? [Completeness, Gap] → RESOLVED: defaults to current month, navigable to any past month
- [x] CHK010 — Does feature 008 specify what the dashboard displays when there is no data yet for the current month (empty state)? [Edge Case, Gap] → DEFERRED to spec 008
- [x] CHK011 — Does feature 010 (Budget Alerts) quantify "approaching" a budget limit with a specific threshold? [Clarity, Ambiguity] → RESOLVED: defaults to 80%, optional per-budget override (CHK034)
- [x] CHK012 — Does feature 010 specify how alerts are delivered? [Completeness, Gap] → RESOLVED: in-app only; no push or email
- [x] CHK013 — Does feature 011 (Expense History) specify whether filtering by payment method or specific card is supported? [Completeness, Gap] → RESOLVED: filter by payment method AND specific credit card both supported
- [x] CHK014 — Does feature 011 define sort order and pagination requirements? [Completeness, Gap] → DEFERRED to spec 011
- [x] CHK015 — Does feature 012 (Recurring Expenses) enumerate the supported recurrence intervals? [Completeness, Gap] → RESOLVED: monthly and annual
- [x] CHK016 — Does feature 012 specify what happens when a recurring expense is paused or stopped? [Completeness, Gap] → RESOLVED: pause (skips future periods) and stop (auto-cancels future PENDING entries); past preserved
- [x] CHK017 — Does feature 013 (Reports) define how many periods can be compared and whether results can be exported? [Completeness, Gap] → DEFERRED to spec 013
- [x] CHK018 — Does feature 014 (Data Export) specify which entities are included and the column schema? [Completeness, Gap] → DEFERRED to spec 014
- [x] CHK019 — Does feature 015 (Monthly Payment Tracker) specify the month navigation model? [Completeness, Gap] → DEFERRED to spec 015 (same model as dashboard applies: current month default, past months navigable)
- [x] CHK020 — Does feature 016 (Credit Card Management) define whether a credit card can be deactivated or deleted? [Completeness, Gap] → DEFERRED to spec 016

---

## Domain Model Completeness

*Are all entities, relationships, and calculation rules documented well enough to prevent misinterpretation?*

- [x] CHK021 — Are monetary validation rules (minimum/maximum amount, zero-value handling) defined for Expense.amountCents and Budget.limitCents? [Completeness, Gap] → DEFERRED: zero Budget resolved (CHK054); Expense minimum deferred to spec 005
- [x] CHK022 — Is the maximum depth constraint for the Category hierarchy (root + one sub-level only) explicitly documented? [Consistency, Spec §006, data-model.md] → RESOLVED: stated in data-model.md Category entity constraints
- [x] CHK023 — Is the double-counting prevention rule consistently referenced in all features that aggregate payment data (008, 011, 013, 015, 016)? [Consistency, Ambiguity] → RESOLVED: rule stated in data-model.md and referenced/implied in all relevant features
- [x] CHK024 — Does the data model define what "month" means for Budget and BillPayment? [Clarity, Gap] → DEFERRED to specs 007/015 — calendar month boundary detail belongs in those features
- [x] CHK025 — Are the valid state transitions for BillPayment documented and consistent? [Consistency, data-model.md] → RESOLVED: state transitions documented in data-model.md BillPayment section
- [x] CHK026 — Is the calculation rule for "pending fatura total" per card unambiguously specified? [Clarity, Gap] → RESOLVED: stated in feature 015/016 descriptions and data-model.md

---

## Feature Dependencies & Priorities

*Are the dependency graph and priority tiers consistent and free of blocking conflicts?*

- [x] CHK027 — Does feature 009 (Category Analytics) clarify whether the selected period mirrors the dashboard month? [Completeness, Gap] → RESOLVED: mirrors the dashboard month; no independent period selector
- [x] CHK028 — Are all P1 features achievable as an independent MVP without any P2 or P3 dependencies? [Consistency, Spec §Priority Tiers] → RESOLVED: 015 depends only on 005 (P1); 016 depends on 005+015 (both P1); no P2/P3 hard dependencies
- [x] CHK029 — Is the dependency of feature 016 on feature 015 correctly ordered? [Consistency, Spec §016] → RESOLVED: 016 depends on 015; fatura Bill with creditCardId requires tracker to exist
- [x] CHK030 — Are features 012 (Recurring, P3) and 016 (Credit Cards, P1) correctly marked as optional enrichments of feature 015? [Consistency, Spec §015] → RESOLVED: 015 depends only on 005; 012 and 016 are optional enrichments

---

## Cross-Cutting Constraints

*Are product-wide rules applied consistently across all features?*

- [x] CHK031 — Does every UI-bearing feature (004–016) implicitly rely on the PT-BR language constraint? [Completeness, Spec §Cross-Cutting Constraints] → RESOLVED: PT-BR stated as a fixed product constraint in the Cross-Cutting Constraints section; sufficient without per-feature copy specs
- [x] CHK032 — Is the "manual entry only, no bank sync" constraint consistently reflected in relevant features? [Consistency, Spec §Assumptions] → RESOLVED: stated in Assumptions and in feature 016 description
- [x] CHK033 — Is the single-currency constraint sufficient for all monetary features? [Consistency, Spec §Assumptions] → RESOLVED: stated in Assumptions; no feature description implies multi-currency

---

## Identified Ambiguities

*Vague terms or unquantified requirements that would block writing testable acceptance criteria.*

- [x] CHK034 — Is "approaching a budget limit" in feature 010 quantified? [Ambiguity, Spec §010] → RESOLVED: defaults to 80%, optional per-budget override
- [x] CHK035 — Does feature 009 specify what "percentage share for each category" means when a category has zero expenses? [Edge Case, Gap] → DEFERRED to spec 009
- [x] CHK036 — Does the spec define what "automatically logged at its defined interval" means for feature 012? [Clarity, Ambiguity] → RESOLVED: clamped to last day of month; intervals: monthly and annual

## Notes

- All items resolved or explicitly deferred to the owning feature spec
- Deferred items (resolve in each feature's own /speckit-specify session):
  - spec 004: CHK001, CHK002, CHK003
  - spec 005: CHK004, CHK021 (Expense min), CHK024
  - spec 006: CHK005, CHK006
  - spec 007: CHK008, CHK024
  - spec 008: CHK010
  - spec 009: CHK035
  - spec 011: CHK014
  - spec 013: CHK017
  - spec 014: CHK018
  - spec 015: CHK019, CHK024, CHK050
  - spec 016: CHK020
  - spec 012: CHK051
