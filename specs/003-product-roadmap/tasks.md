# Tasks: Product Roadmap Guide

**Input**: Design documents from `specs/003-product-roadmap/`

**Prerequisites**: plan.md ✅ | spec.md ✅ | research.md ✅ | data-model.md ✅

**Note**: This is a documentation/planning artifact. Tasks deliver a complete, accurate, and ready-to-use product roadmap — not application code. Each task produces or validates a document in `specs/003-product-roadmap/`.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Verify artifact structure is complete and consistent.

- [x] T001 Confirm specs/003-product-roadmap/ directory contains spec.md, plan.md, research.md, data-model.md, and checklists/
- [x] T002 [P] Confirm .specify/feature.json points to specs/003-product-roadmap
- [x] T003 [P] Confirm CLAUDE.md references specs/003-product-roadmap/plan.md between SPECKIT markers

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Resolve all high-priority calculation ambiguities flagged by the checklist before any user story can be validated. These gaps would block feature specs 007 and 012 if left open.

**⚠️ CRITICAL**: Resolve these before any user story work.

- [x] T004 Resolve CHK039 in specs/003-product-roadmap/spec.md — define whether sub-category budget totals exceeding root cap triggers a validation error or an advisory warning [Spec §007, data-model.md Budget] — update feature 007 description inline AND append decision to Clarifications; update data-model.md Budget entity if a constraint is added
- [x] T005 Resolve CHK041 in specs/003-product-roadmap/spec.md — clarify whether the family budget total is independent of member budgets or derived as their sum [Spec §007] — update feature 007 description inline AND append decision to Clarifications
- [x] T006 Resolve CHK052 in specs/003-product-roadmap/spec.md and data-model.md — specify whether future BillPayment entries are cancelled when a recurring Bill is STOPPED [Spec §012, data-model.md Bill] — update feature 012 description inline AND update data-model.md Bill recurrenceStatus notes AND append to Clarifications
- [x] T007 Resolve CHK054 in specs/003-product-roadmap/spec.md and data-model.md — define whether Budget.limitCents = 0 means "no spending allowed" (immediate alert) or "no budget set" (alerts disabled) [data-model.md Budget] — update data-model.md Budget entity AND append to Clarifications
- [x] T008 [P] Update specs/003-product-roadmap/research.md with decisions from T004–T007 as Decisions 23–26

**Checkpoint**: All blocking checklist items resolved — user story validation can now begin.

---

## Phase 3: User Story 1 — Feature Selection for Next Sprint (Priority: P1) 🎯 MVP

**Goal**: Any team member can read the roadmap and identify the highest-priority unspecified feature within 5 minutes, with enough detail to immediately start `/speckit-specify`.

**Independent Test**: Read only `specs/003-product-roadmap/spec.md`. Identify the next P1 feature to specify. Confirm its description is sufficient to write a full spec without consulting any other document.

### Implementation for User Story 1

- [x] T009 [US1] Review all P1 feature entries (004, 005, 006, 007, 008, 015, 016) in specs/003-product-roadmap/spec.md against CHK001–CHK008 — add a one-line note for any entry where a known gap must be addressed in its own spec
- [x] T010 [P] [US1] Verify P1 feature dependency chain (004→005→006→007→008; 005→015; 005+015→016) is accurate and cycle-free in specs/003-product-roadmap/spec.md
- [x] T011 [US1] Write specs/003-product-roadmap/quickstart.md — a ≤1-page guide with three sections: (1) How to read priority tiers (P1/P2/P3 definitions), (2) How to select the next feature (pick highest-priority Planned entry and run /speckit-specify), (3) How to update a feature status (change the Status column in the spec table within 1 working day)
- [x] T012 [P] [US1] Mark CHK001–CHK008 items in specs/003-product-roadmap/checklists/roadmap.md as deferred with the expected feature spec number that will resolve each gap

**Checkpoint**: US1 validated — product owner can select the next feature to specify in under 5 minutes.

---

## Phase 4: User Story 2 — New Team Member Orientation (Priority: P2)

**Goal**: A new team member can read the roadmap and describe the intended product in their own words, name the next two features to be worked on, and distinguish P1 from P2 from P3 — all within 5 minutes.

**Independent Test**: Hand the spec to someone with no prior context. They should be able to answer: "What problem does this app solve?", "What is the most important feature to build first?", and "What is out of scope?" without assistance.

### Implementation for User Story 2

- [x] T013 [US2] Review the Product Vision paragraph in specs/003-product-roadmap/spec.md — ensure it describes the app in plain language without technical terms, jargon, or implementation details
- [x] T014 [P] [US2] Review the Cross-Cutting Constraints section in specs/003-product-roadmap/spec.md — confirm PT-BR, single-currency, manual-entry, and no-bank-sync constraints are each stated in one clear sentence
- [x] T015 [P] [US2] Review the Assumptions section in specs/003-product-roadmap/spec.md — ensure each assumption is expressed as a verifiable statement, not a design decision
- [x] T016 [US2] Verify the P3 features (012, 013, 014) in specs/003-product-roadmap/spec.md are clearly marked as "Extended / not essential for launch" so a new team member does not treat them as MVP scope

**Checkpoint**: US2 validated — new team member onboarding does not require verbal explanation of the roadmap.

---

## Phase 5: User Story 3 — Architectural Decision Support (Priority: P3)

**Goal**: A developer making a data model decision can consult the roadmap and data-model.md to understand which upcoming features interact with the model they are designing.

**Independent Test**: A developer designing the Budget entity reads data-model.md and the spec. They should be able to identify all features that read or write Budget data, and confirm no planned feature would require a breaking schema change.

### Implementation for User Story 3

- [x] T017 [US3] Review specs/003-product-roadmap/data-model.md — confirm every entity listed maps to at least one feature in the spec, and every feature that introduces new entities is referenced in the Notes section
- [x] T018 [P] [US3] Cross-check the double-counting calculation rule in data-model.md against features 005, 007, 008, 011, 013, 015, and 016 in spec.md — confirm the rule is referenced or implied in each feature that aggregates payment data
- [x] T019 [P] [US3] Verify entity relationships in data-model.md diagram are consistent with the spec's feature dependency table — no entity referenced in a feature that doesn't depend on the feature that defines it
- [x] T020 [US3] Add a "Key Architectural Rules" summary block at the top of specs/003-product-roadmap/data-model.md listing: (1) monetary values as integers, (2) calculation rule split, (3) category max depth 2, (4) monthly budget period

**Checkpoint**: US3 validated — developers can use the roadmap as an architectural reference without consulting a person.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Final consistency pass and branch closure.

- [x] T021 [P] Verify all 13 feature entries in specs/003-product-roadmap/spec.md Planned Features tables carry a valid FR-005 status value (Planned, In Specification, Specified, In Development, or Complete)
- [x] T021b [P] Confirm specs/003-product-roadmap/plan.md Summary and Scale/Scope reflect 13 features / P1: 7 core (already updated by analysis remediation; verify no other stale counts remain)
- [x] T022 [P] Mark any remaining open checklist items in specs/003-product-roadmap/checklists/roadmap.md and calculations.md as either resolved, deferred-to-feature, or outstanding with the owning feature number
- [x] T023 Run a final terminology consistency check across spec.md and data-model.md — confirm "fatura", "Bill", "BillPayment", "CreditCard", "CREDIT_CARD", "cash-outflow", "budget total" are used with consistent capitalisation and meaning throughout
- [x] T024 [P] Verify specs/003-product-roadmap/research.md contains entries for all 22+ decisions (Decisions 1–22 already present; add any from T004–T007)
- [ ] T025 Open a PR from branch `003-product-roadmap` to `main` with a description referencing the roadmap spec, data model, and all resolved checklist items — PR description MUST include a one-line Constitution Check confirming no applicable principles are violated (required by constitution Governance §Development Workflow)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — verify immediately
- **Phase 2 (Foundational)**: Depends on Phase 1 — BLOCKS US1 and US3 validation
- **Phase 3 (US1)**: Depends on Phase 2 completion
- **Phase 4 (US2)**: Can start after Phase 1; independent of Phase 2 and US1
- **Phase 5 (US3)**: Depends on Phase 2 completion (calculation rules must be resolved)
- **Phase 6 (Polish)**: Depends on Phases 3, 4, and 5

### User Story Dependencies

- **US1 (P1)**: Requires Phase 2 complete (blocking checklist gaps affect feature descriptions)
- **US2 (P2)**: Independent — can run in parallel with Phase 2 and US1
- **US3 (P3)**: Requires Phase 2 complete (architectural rules must be resolved)

### Parallel Opportunities

- T002, T003 — parallel with T001
- T008 — parallel with T004–T007 (once decisions are made)
- T010, T012 — parallel with T009, T011
- T014, T015, T016 — parallel with T013
- T018, T019 — parallel with T017
- T021, T022, T024 — parallel with T023

---

## Parallel Example: User Story 2

```text
# All of these can run simultaneously after Phase 1:
T013 — Review Product Vision paragraph
T014 — Review Cross-Cutting Constraints section
T015 — Review Assumptions section
T016 — Verify P3 features are clearly non-MVP
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Verify structure
2. Complete Phase 2: Resolve blocking checklist items (T004–T008)
3. Complete Phase 3: Validate US1 (feature selection works)
4. **STOP and VALIDATE**: Can a team member pick the next feature in <5 min?
5. Proceed to US2 and US3 if time allows

### Incremental Delivery

1. Phase 1 + 2 → Blocking issues resolved
2. Phase 3 (US1) → Roadmap usable as a planning tool ← MVP
3. Phase 4 (US2) → Roadmap usable for onboarding
4. Phase 5 (US3) → Roadmap usable as architectural reference
5. Phase 6 (Polish) → Branch ready to merge

---

## Notes

- [P] tasks = can run in parallel (different documents, no task dependencies)
- [Story] label maps each task to a specific user story for traceability
- This feature produces no application code — all tasks are document-level
- After merging this branch, the next step is `/speckit-specify` for feature 004 (User Authentication & Family Groups)
