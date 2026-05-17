# Research: Base Monorepo Architecture

**Feature**: `001-monorepo-architecture`
**Date**: 2026-05-17

## Decision 1: Package Manager & Workspace Tool

**Decision**: npm workspaces (built into npm ≥ v7)

**Rationale**: npm workspaces require zero additional tooling — no pnpm or
yarn installation step that new developers must complete. A single root
`package.json` with a `"workspaces"` field links `backend/` and `frontend/`
and makes all root-level scripts (`npm run start`, `npm run lint`, etc.)
delegate to both services. This is the simplest option and directly satisfies
Constitution Principle IV (Simplicity).

**Alternatives considered**:
- **pnpm workspaces**: Faster installs, better disk deduplication, but requires
  developers to have pnpm installed globally — an extra onboarding step.
- **Yarn Berry (v3+) workspaces**: More features (Plug'n'Play), but higher
  complexity and worse compatibility with some tools.
- **Turborepo/Nx**: Powerful build orchestration for large monorepos, but
  premature for a two-service project; violates Simplicity.

---

## Decision 2: Backend Framework

**Decision**: Express.js with TypeScript

**Rationale**: Express is the minimal Node.js HTTP framework. For the base
architecture feature, which only needs to prove that a backend service can
start, respond to `/health`, and be independently testable, Express requires
less boilerplate than NestJS. The Simplicity principle (IV) mandates starting
with the simplest solution; NestJS conventions (modules, decorators, DI
containers) are valuable in large apps but premature at this stage.

**Alternatives considered**:
- **NestJS**: Opinionated, feature-rich, great for large teams and complex
  domains. Adds ~15 dependencies and requires understanding of Angular-style
  DI. Deferred — re-evaluate when the feature set justifies the complexity.
- **Fastify**: Faster than Express, but less ecosystem familiarity; marginal
  benefit at this scale.
- **Hono**: Minimal and fast, but smaller community and fewer Supertest
  integration examples.

---

## Decision 3: Frontend Framework

**Decision**: React + Vite (TypeScript template)

**Rationale**: The budget planner is a client-side application — data fetched
from the backend API, rendered in the browser. No server-side rendering is
needed for budget category views and spending charts. Vite provides fast local
development (HMR) and simple build output. Next.js SSR would add complexity
(server infrastructure, hydration concerns) with no user-facing benefit at
this stage.

**Alternatives considered**:
- **Next.js**: Valuable if SEO or server-rendered initial loads are needed.
  Deferred — can be migrated later if requirements change.
- **Remix**: Full-stack framework; same concern as Next.js — over-engineered
  for a client-side budget planner.
- **Vue / Svelte**: Different ecosystems; the constitution aligns the team on
  React + TypeScript for consistency.

---

## Decision 4: Multi-Service Process Orchestration

**Decision**: `concurrently` npm package at the root workspace level

**Rationale**: `concurrently` runs multiple npm scripts in parallel and
prefixes each line with a configurable label (e.g., `[backend]` / `[frontend]`).
This directly satisfies FR-011 and SC-006. It is a single dev dependency with
no peer dependencies and requires one line of configuration.

**Alternatives considered**:
- **npm-run-all**: Similar to `concurrently` but less flexible prefix
  configuration; output interleaving can be harder to read.
- **Process managers (PM2, Foreman)**: Designed for production process
  management; overkill for local development orchestration.
- **Shell `&` operator**: Not cross-platform (fails on Windows CMD); no
  service labeling; no unified exit on failure.

---

## Decision 5: Pre-Commit Hook Tooling

**Decision**: `husky` + `lint-staged`

**Rationale**: `husky` installs git hooks via npm scripts (`prepare` hook),
so no manual `git config` step is needed. `lint-staged` runs lint and format
only on staged files, keeping pre-commit checks fast even as the codebase
grows. Together they satisfy FR-005 (pre-commit style enforcement).

**Alternatives considered**:
- **lefthook**: Faster than husky, single binary, but less widely known;
  adds a non-npm dependency.
- **simple-git-hooks**: Simpler than husky but less maintained.
- **Manual git hooks in `.git/hooks/`**: Not committed to the repo; every
  developer must install them manually — violates FR-007 (self-documenting
  setup).

---

## Decision 6: Shared TypeScript Configuration

**Decision**: `tsconfig.base.json` at the project root; each service has its
own `tsconfig.json` that extends it.

**Rationale**: A single base config enforces `strict: true` and shared compiler
options (target, module resolution) across both services. Service-level configs
add only service-specific overrides (e.g., `jsx` for frontend, `outDir` paths).
This avoids duplication while preserving service independence.

**Alternatives considered**:
- **Single root `tsconfig.json` for all**: Breaks service independence — one
  service's TS errors affect the other's build.
- **Fully independent configs with duplicated rules**: Leads to drift where
  one service drifts to less strict settings over time.

---

## Decision 7: Startup Environment Validation

**Decision**: Inline validation function in each service's entry point,
executed before any framework initialization

**Rationale**: A small `validateEnv()` function (≤15 lines) checks `process.env`
for required variable names and calls `process.exit(1)` with a formatted error
message listing every missing variable. This satisfies FR-009 without adding a
library dependency (`envalid`, `zod`, `dotenv-safe`), keeping the dependency
footprint minimal. The function is unit-testable independently of the framework.

**Alternatives considered**:
- **`dotenv-safe`**: Validates against a `.env.example` automatically, but adds
  a dependency and requires `.env.example` to stay in sync manually.
- **`envalid` / `zod`**: Powerful schema validation for env vars, appropriate
  once the env config grows complex. Deferred — re-evaluate when more than
  ~5 required variables exist per service.

---

## Resolved NEEDS CLARIFICATION Items

All technical unknowns from the plan template are now resolved:

| Field | Resolved Value |
|---|---|
| Language/Version | Node.js LTS + TypeScript 5.x (strict) |
| Backend framework | Express.js |
| Frontend framework | React 18 + Vite |
| Workspace tool | npm workspaces |
| Testing | Jest + ts-jest (unit); Supertest (backend integration) |
| Pre-commit | husky + lint-staged |
| Process orchestration | concurrently |
| TS config sharing | tsconfig.base.json extended per service |
| Env validation | Inline validateEnv() in each service entry point |
