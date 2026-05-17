<!--
SYNC IMPACT REPORT
==================
Version change: [template] → 1.0.0 (initial ratification)

Modified principles: N/A (first write)

Added sections:
  - Core Principles (I–V)
  - Technology Stack & Constraints
  - Development Workflow
  - Governance

Removed sections: N/A

Templates requiring updates:
  - .specify/templates/plan-template.md  ✅ reviewed — Constitution Check section already present; no changes needed
  - .specify/templates/spec-template.md  ✅ reviewed — aligns with API-First and TDD principles
  - .specify/templates/tasks-template.md ✅ reviewed — TDD task ordering (tests before implementation) already enforced
  - .specify/extensions/git/commands/*.md ✅ reviewed — no outdated agent-specific references found

Follow-up TODOs: none — all fields resolved.
-->

# Finances Constitution

## Core Principles

### I. API-First

Every feature MUST begin with a defined API contract before any implementation
starts. Contracts (OpenAPI/JSON Schema) are the source of truth for
frontend–backend interaction. No code that crosses a service boundary may be
written until the contract is reviewed and approved. Breaking an existing
contract requires a versioning decision (see Governance).

**Rationale**: Budget planning data flows across layers (UI, backend, storage).
Defining contracts upfront prevents integration surprises and enables parallel
frontend/backend development.

### II. Test-First (NON-NEGOTIABLE)

TDD is mandatory on this project. The cycle is:

1. Write tests → verify they **fail**
2. Get explicit approval (or self-review) on the failing tests
3. Implement until tests pass
4. Refactor under green tests

Unit tests MUST cover all domain logic. Integration tests MUST cover all API
contracts. No feature is considered complete until its tests pass in CI. Tests
MUST NOT be written after-the-fact to satisfy coverage metrics.

**Rationale**: Financial logic (budgets, balances, category aggregations) is
correctness-critical. Post-hoc testing cannot be trusted to catch regressions.

### III. Security & Data Integrity

Financial data MUST be treated as sensitive at all times:

- All API endpoints MUST require authentication; unauthenticated access is
  forbidden except for `/health` and public auth flows.
- User data MUST be scoped — a user MUST NOT access another user's records.
- Secrets (API keys, DB credentials) MUST NOT be committed to the repository.
- Input validation MUST happen at the API boundary before any business logic.
- Monetary values MUST be stored and computed as integers (cents) or using a
  decimal library — never as IEEE 754 floats.

**Rationale**: Incorrect financial data or unauthorized access causes real harm.
Floating-point arithmetic silently produces wrong monetary totals.

### IV. Simplicity

Start with the simplest solution that satisfies the user story. Abstractions
MUST be justified by a concrete, present need — not a hypothetical future one.
Duplication is preferred over premature abstraction. Any complexity added beyond
the minimal solution MUST be documented in the plan's Complexity Tracking table.

**Rationale**: Budget planners have a natural tendency to scope-creep into
full accounting systems. Simplicity discipline keeps the product focused and
maintainable.

### V. Observability

Every significant operation MUST produce structured logs (JSON). Error responses
MUST include a machine-readable error code and a human-readable message. The
API MUST expose a `/health` endpoint that reports service status. Logs MUST NOT
contain sensitive user data (PII, raw financial values in plain text).

**Rationale**: Diagnosing production issues in a financial app without logs is
dangerous. Structured logs make automated alerting and auditing feasible.

## Technology Stack & Constraints

**Runtime**: Node.js (LTS) with TypeScript (strict mode enabled)

**Backend**: Express or NestJS — decision deferred to first feature spec

**Frontend**: React + TypeScript (or Next.js if SSR is required)

**Storage**: PostgreSQL (primary), with migrations managed via a dedicated
migration tool (e.g., Prisma Migrate or Flyway)

**Testing**: Jest for unit/integration; Supertest for API contract testing

**Monetary values**: All stored as `INTEGER` (cents) in the database; all
computations use integer arithmetic or a decimal library (e.g., `decimal.js`)

**Environments**: Development, Staging, Production — each with isolated
databases. No shared state between environments.

**Dependency policy**: All production dependencies MUST have active maintenance
and a published security policy. No dependency with a known high/critical CVE
may be merged.

## Development Workflow

- **Branching**: Every feature lives on its own branch created by `/speckit-git-feature`.
  Direct commits to `main` are forbidden.
- **Spec before code**: `/speckit-specify` → `/speckit-clarify` → `/speckit-plan`
  → `/speckit-tasks` → implementation. Skipping steps requires written justification.
- **Contract review gate**: API contracts in `specs/[###-feature]/contracts/` MUST
  be reviewed before Phase 2 (Foundational) tasks begin.
- **Test gate**: All tests MUST be red before implementation; all tests MUST be
  green before a PR is opened.
- **PR review**: Every PR requires at least one review before merge. The reviewer
  MUST verify Constitution compliance.
- **Commit style**: Conventional Commits (`feat:`, `fix:`, `docs:`, `test:`, `chore:`).

## Governance

This Constitution supersedes all other practices, style guides, and verbal
agreements. When a conflict exists between this document and any other artifact,
this document wins.

**Amendment procedure**:
1. Open a PR with the proposed change to this file.
2. State the reason and the version bump type (MAJOR/MINOR/PATCH) in the PR
   description.
3. Obtain approval from the project lead before merging.
4. Update `LAST_AMENDED_DATE` and `CONSTITUTION_VERSION` atomically with the
   merge commit.
5. Propagate changes to affected templates and document in the Sync Impact
   Report (HTML comment at top of this file).

**Versioning policy**:
- MAJOR: Principle removed, renamed, or redefined in a backward-incompatible way
- MINOR: New principle or section added, or materially expanded guidance
- PATCH: Clarifications, wording fixes, typo corrections

**Compliance review**: Every PR description MUST include a one-line Constitution
Check confirming no principles are violated (or documenting the justified
exception in the Complexity Tracking table of the relevant plan).

**Version**: 1.0.0 | **Ratified**: 2026-05-17 | **Last Amended**: 2026-05-17
