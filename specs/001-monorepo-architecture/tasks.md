---
description: "Task list for Base Monorepo Architecture"
---

# Tasks: Base Monorepo Architecture

**Input**: Design documents from `specs/001-monorepo-architecture/`

**Prerequisites**: plan.md ✅ spec.md ✅ research.md ✅ data-model.md ✅ contracts/ ✅ quickstart.md ✅

**Tests**: Included — Test-First is NON-NEGOTIABLE per Constitution Principle II.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing.

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)
- Include exact file paths in all descriptions

## Path Conventions

- Root: `package.json`, `tsconfig.base.json`, `.eslintrc.js`, `.prettierrc`, `README.md`
- Backend: `backend/src/`, `backend/tests/`
- Frontend: `frontend/src/`, `frontend/tests/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Workspace initialization and shared tooling at the project root.

- [ ] T001 Create root `package.json` with `"workspaces": ["backend", "frontend"]` and `name: "finances"`
- [ ] T002 [P] Create `tsconfig.base.json` at project root with `strict: true`, `target: "ES2022"`, `moduleResolution: "bundler"`
- [ ] T003 [P] Create `.eslintrc.js` at project root with `@typescript-eslint/recommended` + `prettier` plugin
- [ ] T004 [P] Create `.prettierrc` at project root with 2-space indent, single quotes, trailing commas
- [ ] T005 [P] Create `.gitignore` at project root covering `node_modules/`, `dist/`, `.env` for both services
- [ ] T006 [P] Create `README.md` at project root documenting: install, start (both + each), test, lint, build, and required env vars per service (mirrors `specs/001-monorepo-architecture/quickstart.md`)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Service scaffolding that MUST be complete before any user story begins.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [ ] T007 Create `backend/package.json` declaring `express`, `@types/express`, `typescript`, `ts-node`, `jest`, `ts-jest`, `@types/jest`, `supertest`, `@types/supertest` as dependencies
- [ ] T008 Create `frontend/package.json` declaring `react`, `react-dom`, `@types/react`, `@types/react-dom`, `vite`, `@vitejs/plugin-react`, `typescript`, `jest`, `ts-jest`, `@types/jest` as dependencies
- [ ] T009 Create `backend/tsconfig.json` extending `../../tsconfig.base.json`; add `outDir: "dist"`, `rootDir: "src"`
- [ ] T010 Create `frontend/tsconfig.json` extending `../../tsconfig.base.json`; add `jsx: "react-jsx"`, `outDir: "dist"`, `rootDir: "src"`
- [ ] T011 Create `backend/jest.config.ts` configuring `ts-jest` preset and `testEnvironment: "node"`
- [ ] T012 Create `frontend/jest.config.ts` configuring `ts-jest` preset and `testEnvironment: "jsdom"`
- [ ] T013 Add `concurrently` as root dev dependency and configure the root `dev` script: `concurrently -n "backend,frontend" -p "[{name}]" "npm run dev -w backend" "npm run dev -w frontend"`
- [ ] T014 Install `husky` and `lint-staged` as root dev dependencies; initialize husky with `npx husky init`; configure `.husky/pre-commit` to run `npx lint-staged`
- [ ] T015 Configure `lint-staged` in root `package.json` to run `eslint --fix` and `prettier --write` on staged `*.{ts,tsx}` files

**Checkpoint**: Foundation ready — all three user story phases can now begin.

---

## Phase 3: User Story 1 — New Developer Onboarding (Priority: P1) 🎯 MVP

**Goal**: Developer clones repo, runs install + start from root, both services are accessible in ≤ 5 min.

**Independent Test**: `git clone` into a clean directory → `npm install` → `npm run dev` → both services start with `[backend]`/`[frontend]` prefixed logs; `curl http://localhost:3001/health` returns 200.

### Tests for User Story 1 ⚠️ Write FIRST — verify they FAIL before implementing

- [ ] T016 [P] [US1] Write unit tests for `validateEnv()` in `backend/tests/unit/env.test.ts`: test passes when all vars present; test process exits with code 1 listing missing var names when vars absent
- [ ] T017 [P] [US1] Write Supertest integration test for `GET /health` in `backend/tests/integration/health.test.ts`: expects 200, `{status: "ok", service: "backend", timestamp: <ISO string>}` matching `contracts/health.yaml`
- [ ] T018 [P] [US1] Write React smoke test in `frontend/tests/unit/App.test.tsx`: renders `<App />` without throwing; asserts root element is present in DOM

### Implementation for User Story 1

- [ ] T019 [US1] Implement `validateEnv()` in `backend/src/env.ts`: checks `process.env` for `["PORT"]`; if any missing, prints `Missing required env vars: <names>` to stderr and calls `process.exit(1)`
- [ ] T020 [US1] Implement Express app factory in `backend/src/app.ts`: creates Express app, mounts health router; does NOT call `app.listen()` (keeps factory testable)
- [ ] T021 [US1] Implement `GET /health` handler in `backend/src/routes/health.ts` per `specs/001-monorepo-architecture/contracts/health.yaml`: returns `{status: "ok", service: "backend", timestamp: new Date().toISOString()}`
- [ ] T022 [US1] Implement backend entry point in `backend/src/index.ts`: calls `validateEnv()`, imports app from `app.ts`, calls `app.listen(PORT)`, catches `EADDRINUSE` and exits with `Error: Port ${PORT} is already in use. Set a different PORT in your .env file.`
- [ ] T023 [P] [US1] Create `backend/.env.example` documenting `PORT=3001` as required
- [ ] T024 [P] [US1] Implement placeholder root component in `frontend/src/App.tsx`: renders a `<div>Finances</div>`
- [ ] T025 [US1] Implement frontend entry point in `frontend/src/main.tsx`: mounts `<App />` into `#root`
- [ ] T026 [US1] Create `frontend/vite.config.ts`: set `server.port` from `VITE_PORT` env (default 5173); add proxy rule `/api → VITE_API_URL`
- [ ] T027 [P] [US1] Create `frontend/.env.example` documenting `VITE_API_URL=http://localhost:3001` as required
- [ ] T028 [US1] Add `validateEnv()` call to `frontend/src/main.tsx` (or `vite.config.ts` plugin) checking for `VITE_API_URL`; exits with `Missing required env vars: VITE_API_URL` if absent
- [ ] T029 [US1] Add `dev` script to root `package.json` using `concurrently` (T013); run `npm install` from root and verify `backend/node_modules` and `frontend/node_modules` are populated

**Checkpoint**: User Story 1 fully functional — `npm install && npm run dev` starts both services; curl health check returns 200; prefixed logs visible.

---

## Phase 4: User Story 2 — Independent Service Development (Priority: P2)

**Goal**: Each service can be started, tested, and built in full isolation from the other.

**Independent Test**: `cd backend && npm run dev` starts only backend; `cd frontend && npm run dev` starts only frontend; `npm run test -w backend` passes with no frontend dependency; `npm run build -w backend` populates `backend/dist/` only.

### Tests for User Story 2 ⚠️ Write FIRST — verify they FAIL before implementing

- [ ] T030 [P] [US2] Add isolation assertion to `backend/tests/integration/health.test.ts`: test must pass when `frontend/` directory is completely absent (document this explicitly in the test file header)
- [ ] T031 [P] [US2] Add isolation assertion to `frontend/tests/unit/App.test.tsx`: test must pass when `backend/` directory is completely absent (document this explicitly in the test file header)

### Implementation for User Story 2

- [ ] T032 [US2] Add `dev` script to `backend/package.json`: `ts-node src/index.ts` (standalone — no concurrently dependency)
- [ ] T033 [US2] Add `dev` script to `frontend/package.json`: `vite` (standalone)
- [ ] T034 [US2] Add `test` script to `backend/package.json`: `jest --runInBand`
- [ ] T035 [US2] Add `test` script to `frontend/package.json`: `jest`
- [ ] T036 [US2] Add `build` script to `backend/package.json`: `tsc --project tsconfig.json` outputting to `backend/dist/`
- [ ] T037 [US2] Add `build` script to `frontend/package.json`: `vite build` outputting to `frontend/dist/`
- [ ] T038 [US2] Add root orchestration scripts to root `package.json`: `"build": "npm run build -w backend && npm run build -w frontend"` and `"test": "npm run test -w backend && npm run test -w frontend"`
- [ ] T039 [US2] Verify build isolation: run `npm run build -w backend` and confirm only `backend/dist/` is created; run `npm run build -w frontend` and confirm only `frontend/dist/` is created (no shared output)

**Checkpoint**: User Stories 1 AND 2 both independently functional — each service starts, tests, and builds without the other.

---

## Phase 5: User Story 3 — Consistent Code Quality Enforcement (Priority: P3)

**Goal**: Shared lint and format rules enforced automatically before every commit, across both services.

**Independent Test**: Introduce a deliberate lint violation in `backend/src/env.ts` (e.g., unused variable). Run `npm run lint` from root. Violation is reported with file path. Fix violation. Re-run. No errors. Attempt `git commit` with violation staged — commit is blocked.

### Tests for User Story 3 ⚠️ Write FIRST — verify they FAIL before implementing

- [ ] T040 [P] [US3] Validate lint catches backend violation: temporarily add `const unused = 1;` to `backend/src/env.ts`, run `npm run lint -w backend`, assert non-zero exit code and file path in output; revert change
- [ ] T041 [P] [US3] Validate lint catches frontend violation: temporarily add `const unused = 1;` to `frontend/src/App.tsx`, run `npm run lint -w frontend`, assert non-zero exit code and file path in output; revert change

### Implementation for User Story 3

- [ ] T042 [US3] Add `lint` script to `backend/package.json`: `eslint src/ --ext .ts --max-warnings 0`
- [ ] T043 [US3] Add `lint` script to `frontend/package.json`: `eslint src/ --ext .ts,.tsx --max-warnings 0`
- [ ] T044 [US3] Add root `lint` script to root `package.json`: `npm run lint -w backend && npm run lint -w frontend`
- [ ] T045 [US3] Add root `format` script to root `package.json`: `prettier --write "**/*.{ts,tsx,json}" --ignore-path .gitignore`
- [ ] T046 [US3] Verify `lint-staged` config (from T015) runs correctly on a staged `.ts` file with a violation — confirm commit is blocked with lint error message

**Checkpoint**: All three user stories independently functional — lint, format, and pre-commit enforcement active.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Validation, edge-case hardening, and documentation sync.

- [ ] T047 [P] Verify port-conflict handling (FR-010): start backend on port 3001, then start a second instance pointing to the same port; confirm second instance exits with `Error: Port 3001 is already in use. Set a different PORT in your .env file.`
- [ ] T048 [P] Validate `specs/001-monorepo-architecture/quickstart.md` against the final implementation — update any step that no longer matches the actual commands or file paths
- [ ] T049 Run full test suite from root: `npm run test` — all tests MUST pass (green)
- [ ] T050 Run `npm run build` from root — confirm `backend/dist/` and `frontend/dist/` are both populated and contain no files from the other service

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 completion — BLOCKS all user stories
- **User Stories (Phases 3–5)**: All depend on Phase 2 completion
  - Stories can proceed sequentially (P1 → P2 → P3) or in parallel if staffed
- **Polish (Phase 6)**: Depends on all user stories being complete

### User Story Dependencies

- **US1 (P1)**: Can start after Phase 2 — no dependency on US2 or US3
- **US2 (P2)**: Can start after Phase 2 — no dependency on US1 (scripts are separate files)
- **US3 (P3)**: Can start after Phase 2 — no dependency on US1 or US2

### Within Each User Story

- Tests MUST be written and verified to FAIL before implementation begins
- `env.ts` before `index.ts` (startup validation before server bootstrap)
- `app.ts` before `routes/health.ts` (app factory before route mounting)
- `routes/health.ts` before `index.ts` (route before server entry)
- `App.tsx` before `main.tsx` (component before entry point)

### Parallel Opportunities

- T002–T006 (Phase 1): All root config files can be created in parallel
- T007–T015 (Phase 2): Service package.json files can be created in parallel; husky/lint-staged setup is independent
- T016–T018 (US1 tests): All three test files can be written in parallel
- T019 and T024 (US1 impl): `env.ts` and `App.tsx` can be implemented in parallel
- T023, T024, T027 (US1): `.env.example` files are fully independent
- T030–T031 (US2 tests): Both isolation assertions can be added in parallel
- T032–T037 (US2 impl): Backend and frontend service scripts can be added in parallel
- T040–T041 (US3 tests): Both lint validation tests can be run in parallel
- T042–T045 (US3 impl): Lint/format scripts can be added in parallel
- T047–T048 (Polish): Port-conflict verification and quickstart validation are independent

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL — blocks all stories)
3. Complete Phase 3: User Story 1 (tests first, then implementation)
4. **STOP and VALIDATE**: `npm install && npm run dev` → both services start; health check passes
5. Demo: show `[backend]`/`[frontend]` prefixed logs in a single terminal

### Incremental Delivery

1. Setup + Foundational → workspace scaffolded
2. US1 complete → `npm run dev` works, health check passes (**MVP!**)
3. US2 complete → each service independently startable/testable/buildable
4. US3 complete → lint + format + pre-commit hooks enforced
5. Polish → edge cases hardened, docs synced, full build verified

### Parallel Team Strategy (if staffed)

1. Team completes Phase 1 + Phase 2 together
2. Once Phase 2 is done:
   - Developer A: US1 (onboarding, health endpoint, concurrently)
   - Developer B: US2 (independent scripts, build isolation)
   - Developer C: US3 (lint config, husky, lint-staged)
3. Each story verified independently before Polish phase

---

## Notes

- `[P]` tasks = different files, no blocking dependencies — can run in parallel
- `[USn]` label maps each task to its user story for traceability
- **TDD is mandatory** — all test tasks MUST be written and verified to FAIL before the corresponding implementation tasks begin
- Commit after each checkpoint using Conventional Commits (`feat:`, `chore:`, `test:`, etc.)
- Stop at any checkpoint to validate the story independently before moving on
- `backend/dist/` and `frontend/dist/` MUST never share files — verify in T039 and T050
