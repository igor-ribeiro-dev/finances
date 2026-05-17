# Implementation Plan: Product Roadmap Guide

**Branch**: `003-product-roadmap` | **Date**: 2026-05-17 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/003-product-roadmap/spec.md`

## Summary

Establish and maintain a living product roadmap for the family budget tracker.
This planning artifact defines the full product scope, 12 product features across
3 priority tiers, the domain entity model, and the key design decisions governing
the entire application. No application code is produced by this spec — it guides
all downstream feature specifications.

## Technical Context

**Language/Version**: N/A — documentation artifact only

**Primary Dependencies**: N/A

**Storage**: N/A — roadmap and data model live as Markdown files under
`specs/003-product-roadmap/`

**Testing**: Acceptance review against SC-001 through SC-005

**Target Platform**: N/A

**Project Type**: Planning artifact (product roadmap + domain model)

**Performance Goals**: SC-001 — any team member can identify the next feature
to specify within 5 minutes of reading the roadmap

**Constraints**:
- Technology-agnostic; readable by non-technical stakeholders
- All UI in Brazilian Portuguese (PT-BR) — fixed product constraint
- Single currency; no bank sync; manual expense entry only
- Credit card double-counting prevention rule must be enforced across all
  cash-outflow calculations

**Scale/Scope**: Single-household family budget tracker; 12 product features
(P1: 6 core, P2: 3 important, P3: 3 extended)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. API-First | N/A | No service boundary code in this feature |
| II. Test-First | N/A | No application code produced |
| III. Security & Data Integrity | ✅ PASS | No sensitive data; monetary values documented as integers (cents) in data-model |
| IV. Simplicity | ✅ PASS | Flat Markdown tables; no tooling required |
| V. Observability | N/A | No runtime component |

**No violations. No Complexity Tracking entries required.**

## Project Structure

### Documentation (this feature)

```text
specs/003-product-roadmap/
├── plan.md              ← this file
├── research.md          ← Phase 0: all product decisions documented
├── data-model.md        ← Phase 1: full domain entity overview
└── tasks.md             ← Phase 2 output (/speckit-tasks — not created here)
```

### Source Code Impact

This feature produces no source code. All subsequent features (004–016) add
source code under the monorepo established in spec 001:

```text
backend/
├── src/
│   ├── domain/          ← entities and domain logic per feature
│   ├── application/     ← use cases per feature
│   └── api/             ← HTTP handlers and routes per feature
└── tests/

frontend/
├── src/
│   ├── pages/           ← screens per major feature
│   ├── components/      ← shared UI components
│   └── services/        ← API client per feature
└── tests/
```

**Structure Decision**: Web application (backend: Node.js/TypeScript Express;
frontend: React/TypeScript). Both workspaces in the monorepo from spec 001.

---

## Phase 0: Research

All decisions were reached through `/speckit-specify` and `/speckit-clarify`
sessions. See [research.md](research.md) for the complete decisions log.

**All Phase 0 unknowns resolved. Constitution re-check: PASS.**

---

## Phase 1: Design

### Data Model

The complete domain entity overview is in [data-model.md](data-model.md).

**Key entities**: FamilyGroup, Member, Category (two-level hierarchy),
CreditCard, Expense (with paymentMethod + creditCardId), Budget (root +
optional sub-category levels, monthly), Bill (with optional creditCardId for
fatura identification), BillPayment.

**Critical calculation rule** (enforced across all features):
- **Budget totals**: all expenses (CASH_OR_DEBIT + CREDIT_CARD) at expenseDate
- **Cash-outflow totals**: CASH_OR_DEBIT expenses + fatura BillPayments only;
  CREDIT_CARD child expenses excluded to prevent double-counting
- Example: R$100 water via card + R$1.000 fatura = R$1.000 cash out, not R$1.100

No contracts directory — this feature exposes no API endpoints.

### Maintenance Process

The roadmap is a living document governed by these rules:

1. **Status updates**: When a feature changes status, update the `Status`
   column within 1 working day.
2. **Adding features**: Assign the next sequential number; place in the
   appropriate priority tier; update `.specify/feature.json`.
3. **Removing/superseding**: Mark as "Superseded"; note the replacement number.
4. **Priority changes**: Move the row; document the reason in Clarifications.
5. **No forward-looking implementation details**: Keep entries tech-agnostic.
