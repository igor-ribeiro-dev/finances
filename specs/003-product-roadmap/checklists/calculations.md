# Calculation Rules Checklist: Product Roadmap Guide

**Purpose**: Validate that all financial calculation rules — budget totals, cash-outflow totals, double-counting prevention, and alert thresholds — are completely, consistently, and unambiguously specified. Blocking issues only.
**Created**: 2026-05-17
**Feature**: [spec.md](../spec.md) | [data-model.md](../data-model.md)

---

## Budget Calculation Rules

*Are the rules for what counts toward a budget complete and consistent?*

- [ ] CHK037 — Is it unambiguously specified that ALL expenses (both CASH_OR_DEBIT and CREDIT_CARD) count toward budget totals at expenseDate, with no exceptions? [Clarity, Spec §005, data-model.md Expense]
- [ ] CHK038 — Are budget totals defined as applying per calendar month (year-month boundary), and is there a clear rule for which month an expense at exactly midnight on a month boundary belongs to? [Clarity, Gap]
- [x] CHK039 — Is the budget hierarchy constraint (sub-category limit cannot exceed root-category cap) specified as either a validation rule or an advisory warning? The spec says sub-category budgets are "optional" but does not define what happens when their sum exceeds the root cap. [Ambiguity, Spec §007] → RESOLVED: advisory warning only; save is never blocked
- [ ] CHK040 — Is the alertThresholdPercent rule — default 80%, per-budget override — specified consistently in both the spec (feature 010) and data-model (Budget.alertThresholdPercent)? [Consistency, Spec §010, data-model.md]
- [x] CHK041 — Are budget totals defined for the family level AND per-member level as independent calculations, or is the family total derived from summing member totals? The spec defines both but does not clarify the relationship. [Clarity, Ambiguity, Spec §007] → RESOLVED: independent — family budget set directly; no required relationship to member totals

---

## Cash-Outflow Calculation Rules

*Is the definition of "total cash paid" complete and unambiguous across all features that use it?*

- [ ] CHK042 — Is the cash-outflow formula ("CASH_OR_DEBIT expenses + fatura BillPayments; CREDIT_CARD expenses excluded") documented in every feature that aggregates payment totals — specifically features 013 (Reports) and 015 (Monthly Payment Tracker)? [Consistency, Spec §013, Spec §015]
- [ ] CHK043 — When a fatura BillPayment is created, the linked Expense record represents the cash outflow. Is it specified that this Expense must have paymentMethod = CASH_OR_DEBIT so it is correctly included in cash-outflow totals (not double-excluded)? [Clarity, data-model.md BillPayment]
- [ ] CHK044 — Is "total cash paid" defined the same way in feature 013 (Reports) and feature 015 (Payment Tracker summary)? Are there any features where the formula is referenced without being fully stated? [Consistency, Spec §013, Spec §015]
- [ ] CHK045 — For the pending fatura indicator in feature 015, is the calculation ("sum of CREDIT_CARD expenses with creditCardId = X that have no corresponding paid fatura BillPayment in the current period") fully specified, or is it implied? [Clarity, Gap, Spec §015]

---

## Double-Counting Prevention

*Is the parent-child credit card model specified clearly enough to prevent misinterpretation?*

- [ ] CHK046 — Is the parent-child relationship explicitly defined: CREDIT_CARD expense = child (budget impact at purchase date); fatura BillPayment = parent (cash-outflow impact at payment date)? Are both explicitly excluded from each other's calculation domain? [Clarity, Spec §016, data-model.md]
- [ ] CHK047 — Is the example "R$100 water bill on card + R$1.000 fatura = R$1.000 cash out, not R$1.100" generalizable to a testable rule — i.e., for any credit card X in period M, cash-outflow total = fatura BillPayment amount for X in M (not fatura + individual expenses)? [Measurability, data-model.md]
- [ ] CHK048 — Is there a specified rule for how the system handles a month where CREDIT_CARD expenses exist for a card but no fatura BillPayment has been recorded yet — specifically, are those expenses excluded from cash-outflow totals for that period (pending fatura state)? [Coverage, Edge Case, Spec §016]
- [ ] CHK049 — Are the two calculation contexts (budget totals vs. cash-outflow totals) consistently named across spec and data-model? Is there any location where "total spent" or "total paid" is used without specifying which formula applies? [Terminology, Consistency]

---

## State Machine Completeness

*Are all entity state transitions unambiguously specified for financial correctness?*

- [ ] CHK050 — Is the BillPayment PAID → PENDING undo transition fully specified: does it nullify paidAmountCents, paymentDate, and delete the linked Expense? Are there constraints on when undo is allowed (e.g., only if the linked Expense hasn't already been referenced by another calculation)? [Completeness, data-model.md BillPayment]
- [ ] CHK051 — Is the recurrenceStatus lifecycle (ACTIVE → PAUSED → ACTIVE resume; ACTIVE → STOPPED permanently) defined with all valid transitions? Is PAUSED → STOPPED allowed, and is STOPPED → ACTIVE (restart) defined or explicitly excluded? [Completeness, data-model.md Bill]
- [x] CHK052 — When a recurring Bill transitions to STOPPED, is it specified whether existing future-dated BillPayment entries (already generated for upcoming months) are cancelled or left as-is? [Edge Case, Gap, Spec §012] → RESOLVED: auto-cancelled (PENDING → CANCELLED); past entries preserved

---

## Monetary Data Integrity

*Are monetary value rules sufficient to prevent calculation errors?*

- [ ] CHK053 — Is the "all monetary values stored as integers (cents)" rule consistently stated across spec, data-model, and plan? Are there any fields (amountCents, limitCents, paidAmountCents, totalCents, estimatedAmountCents) missing the integer constraint in the data-model? [Consistency, data-model.md, Spec §Constitution]
- [x] CHK054 — Is it specified what happens when a budget limitCents is set to zero — does it mean "no spending allowed" (triggers alert immediately) or "no budget set" (alerts disabled)? [Clarity, Ambiguity, data-model.md Budget] → RESOLVED: zero = budget inactive; no alerts; spending unconstrained

## Notes

- Mark items as `[x]` when resolved; add findings inline
- CHK039, CHK041, and CHK054 are the highest-risk ambiguities — resolve before starting feature 007's spec
- CHK052 is a state machine gap that must be resolved before starting feature 012's spec
- All other items are consistency/clarity checks that can be resolved in situ during individual feature specs
