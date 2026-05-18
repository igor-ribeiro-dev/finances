# Calculation Rules Checklist: Product Roadmap Guide

**Purpose**: Validate that all financial calculation rules — budget totals, cash-outflow totals, double-counting prevention, and alert thresholds — are completely, consistently, and unambiguously specified. Blocking issues only.
**Created**: 2026-05-17
**Feature**: [spec.md](../spec.md) | [data-model.md](../data-model.md)

---

## Budget Calculation Rules

*Are the rules for what counts toward a budget complete and consistent?*

- [x] CHK037 — Is it unambiguously specified that ALL expenses (both CASH_OR_DEBIT and CREDIT_CARD) count toward budget totals at expenseDate, with no exceptions? [Clarity, Spec §005, data-model.md Expense] → RESOLVED: stated in data-model.md Expense calculation rule and Spec §005
- [x] CHK038 — Are budget totals defined as applying per calendar month (year-month boundary), and is there a clear rule for which month an expense at exactly midnight on a month boundary belongs to? [Clarity, Gap] → DEFERRED to spec 005 (Expense Registration) — midnight boundary edge case belongs in that feature's spec
- [x] CHK039 — Is the budget hierarchy constraint (sub-category limit cannot exceed root-category cap) specified as either a validation rule or an advisory warning? [Ambiguity, Spec §007] → RESOLVED: advisory warning only; save is never blocked
- [x] CHK040 — Is the alertThresholdPercent rule — default 80%, per-budget override — specified consistently in both the spec (feature 010) and data-model (Budget.alertThresholdPercent)? [Consistency, Spec §010, data-model.md] → RESOLVED: feature 010 description updated and Budget.alertThresholdPercent added to data-model.md
- [x] CHK041 — Are budget totals defined for the family level AND per-member level as independent calculations, or is the family total derived from summing member totals? [Clarity, Ambiguity, Spec §007] → RESOLVED: independent — family budget set directly; no required relationship to member totals

---

## Cash-Outflow Calculation Rules

*Is the definition of "total cash paid" complete and unambiguous across all features that use it?*

- [x] CHK042 — Is the cash-outflow formula ("CASH_OR_DEBIT expenses + fatura BillPayments; CREDIT_CARD expenses excluded") documented in every feature that aggregates payment totals — specifically features 013 (Reports) and 015 (Monthly Payment Tracker)? [Consistency, Spec §013, Spec §015] → RESOLVED: formula stated in both feature descriptions and data-model.md double-counting rule
- [x] CHK043 — When a fatura BillPayment is created, the linked Expense record represents the cash outflow. Is it specified that this Expense must have paymentMethod = CASH_OR_DEBIT? [Clarity, data-model.md BillPayment] → RESOLVED: stated in data-model.md BillPayment notes ("CASH_OR_DEBIT type")
- [x] CHK044 — Is "total cash paid" defined the same way in feature 013 (Reports) and feature 015 (Payment Tracker summary)? [Consistency, Spec §013, Spec §015] → RESOLVED: both reference the same cash-outflow formula
- [x] CHK045 — For the pending fatura indicator in feature 015, is the calculation fully specified? [Clarity, Gap, Spec §015] → RESOLVED: stated in feature 015 description and data-model.md double-counting prevention note

---

## Double-Counting Prevention

*Is the parent-child credit card model specified clearly enough to prevent misinterpretation?*

- [x] CHK046 — Is the parent-child relationship explicitly defined: CREDIT_CARD expense = child (budget impact); fatura BillPayment = parent (cash-outflow impact)? [Clarity, Spec §016, data-model.md] → RESOLVED: parent-child model documented in data-model.md and Spec §016
- [x] CHK047 — Is the example "R$100 water bill on card + R$1.000 fatura = R$1.000 cash out, not R$1.100" generalizable to a testable rule? [Measurability, data-model.md] → RESOLVED: generalizable rule stated in data-model.md calculation rule section
- [x] CHK048 — Is there a specified rule for how the system handles a month where CREDIT_CARD expenses exist for a card but no fatura BillPayment has been recorded yet? [Coverage, Edge Case, Spec §016] → RESOLVED: pending fatura indicator described in feature 015 and 016; card expenses excluded from cash-outflow until fatura is paid
- [x] CHK049 — Are the two calculation contexts (budget totals vs. cash-outflow totals) consistently named across spec and data-model? [Terminology, Consistency] → RESOLVED: "budget totals" and "cash-outflow totals" used consistently; data-model.md defines both explicitly

---

## State Machine Completeness

*Are all entity state transitions unambiguously specified for financial correctness?*

- [x] CHK050 — Is the BillPayment PAID → PENDING undo transition fully specified? [Completeness, data-model.md BillPayment] → DEFERRED to spec 015 (Monthly Payment Tracker) — undo constraints belong in that feature's spec
- [x] CHK051 — Is the recurrenceStatus lifecycle (ACTIVE → PAUSED → ACTIVE resume; ACTIVE → STOPPED permanently) defined with all valid transitions? [Completeness, data-model.md Bill] → DEFERRED to spec 012 (Recurring Expenses) — full state machine belongs in that feature's spec
- [x] CHK052 — When a recurring Bill transitions to STOPPED, is it specified whether existing future-dated BillPayment entries are cancelled or left as-is? [Edge Case, Gap, Spec §012] → RESOLVED: auto-cancelled (PENDING → CANCELLED); past entries preserved

---

## Monetary Data Integrity

*Are monetary value rules sufficient to prevent calculation errors?*

- [x] CHK053 — Is the "all monetary values stored as integers (cents)" rule consistently stated across spec, data-model, and plan? [Consistency, data-model.md, Spec §Constitution] → RESOLVED: stated in constitution Principle III, data-model.md entity fields, and plan.md Technical Context
- [x] CHK054 — Is it specified what happens when a budget limitCents is set to zero? [Clarity, Ambiguity, data-model.md Budget] → RESOLVED: zero = budget inactive; no alerts; spending unconstrained

## Notes

- All items resolved or explicitly deferred to the owning feature spec
- Deferred items: CHK038 → spec 005; CHK050 → spec 015; CHK051 → spec 012
- Resolved items: CHK037, CHK039–CHK049, CHK052–CHK054
