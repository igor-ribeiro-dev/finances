# Implementation Plan: Base Monorepo Architecture

**Branch**: `001-monorepo-architecture` | **Date**: 2026-05-17 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/001-monorepo-architecture/spec.md`

## Summary

Establish a monorepo containing a Node.js/TypeScript Express backend and a
React/Vite frontend, structured so each service is fully independent (own
dependencies, scripts, tests, build output) while sharing root-level tooling
(npm workspaces, TypeScript base config, ESLint, Prettier, husky pre-commit
hooks). Both services run simultaneously from the project root with
`[backend]`/`[frontend]` log prefixes via `concurrently`.

## Technical Context

**Language/Version**: Node.js 20 LTS + TypeScript 5.x (strict mode)

**Primary Dependencies**:
- Root: `concurrently`, `husky`, `lint-staged`, `eslint`, `prettier`, `typescript`
- Backend: `express`, `@types/express`, `ts-node`, `jest`, `ts-jest`, `supertest`
- Frontend: `react`, `react-dom`, `vite`, `@vitejs/plugin-react`, `jest`, `ts-jest`

**Storage**: N/A — this feature establishes project structure, not data persistence

**Testing**: Jest + ts-jest (unit); Supertest (backend integration)

**Target Platform**: Developer workstation (macOS/Linux/Windows via cross-env)

**Project Type**: Monorepo (web-app: backend API + frontend SPA)

**Performance Goals**: Developer onboarding ≤ 5 minutes (SC-001)

**Constraints**:
- Each service independently startable, testable, buildable (FR-002)
- No cross-service build dependencies
- Log output prefixed per service (FR-011)
- Fail-fast on missing env vars (FR-009) and port conflicts (FR-010)

**Scale/Scope**: 1 repo, 2 services, foundational feature — no production load targets

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design.*

| Principle | Status | Notes |
|---|---|---|
| I. API-First | ✅ PASS | `/health` contract defined in `contracts/health.yaml` before implementation |
| II. Test-First | ✅ PASS | Test files scaffolded; tests must be written and fail before implementation |
| III. Security & Data Integrity | ✅ PASS | No user data; `.env` files gitignored; secrets not committed |
| IV. Simplicity | ✅ PASS | Express over NestJS, Vite over Next.js, npm over pnpm — simplest viable choice at each decision |
| V. Observability | ✅ PASS | `[backend]`/`[frontend]` log prefixes; `/health` endpoint; structured error responses |

**No violations found. No Complexity Tracking entries required.**

## Project Structure

### Documentation (this feature)

```text
specs/001-monorepo-architecture/
├── plan.md              # This file
├── research.md          # Technology decisions and rationale
├── data-model.md        # Workspace structural model
├── quickstart.md        # Developer setup guide
├── contracts/
│   └── health.yaml      # OpenAPI contract for GET /health
└── tasks.md             # Phase 2 output (/speckit-tasks — not created here)
```

### Source Code (repository root)

```text
finances/
├── package.json                   # Workspace manifest + root scripts
├── tsconfig.base.json             # Shared TS config (strict: true, ES2022)
├── .eslintrc.js                   # Shared ESLint config (ts-eslint + prettier)
├── .prettierrc                    # Shared Prettier config
├── .husky/
│   └── pre-commit                 # Runs lint-staged on commit
├── .gitignore                     # node_modules, dist/, .env
├── README.md                      # Onboarding doc (mirrors quickstart.md)
│
├── backend/
│   ├── package.json               # Backend manifest
│   ├── tsconfig.json              # Extends ../../tsconfig.base.json
│   ├── jest.config.ts             # Jest + ts-jest config for backend
│   ├── .env.example               # Required: PORT
│   └── src/
│       ├── index.ts               # Entry: calls validateEnv(), then app.listen()
│       ├── env.ts                 # validateEnv() — exits with error list if vars missing
│       ├── app.ts                 # Express app factory (no listen — testable)
│       └── routes/
│           └── health.ts          # GET /health → {status, service, timestamp}
│   └── tests/
│       ├── unit/
│       │   └── env.test.ts        # validateEnv() unit tests (missing vars, all present)
│       └── integration/
│           └── health.test.ts     # Supertest: GET /health → 200, correct shape
│
└── frontend/
    ├── package.json               # Frontend manifest
    ├── tsconfig.json              # Extends ../../tsconfig.base.json; jsx: react-jsx
    ├── vite.config.ts             # Port config, proxy /api → backend
    ├── jest.config.ts             # Jest + ts-jest + jsdom for frontend
    ├── .env.example               # Required: VITE_API_URL
    └── src/
        ├── main.tsx               # React entry point
        └── App.tsx                # Root component (placeholder)
    └── tests/
        └── unit/
            └── App.test.tsx       # Smoke test: App renders without throwing
```

**Structure Decision**: Option 2 (Web application — `backend/` + `frontend/` at repo root).
Service-level configs extend a shared root `tsconfig.base.json`. Root scripts
delegate to each service via npm workspace `-w` flag.

## Complexity Tracking

> No Constitution violations — this table is intentionally empty.
