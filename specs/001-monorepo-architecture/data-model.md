# Data Model: Base Monorepo Architecture

**Feature**: `001-monorepo-architecture`
**Date**: 2026-05-17

> **Note**: This feature is project scaffolding — it establishes the repository
> structure rather than a domain data model. There are no database entities or
> persistent data. This document describes the **structural model** of the
> workspace instead.

---

## Workspace Structure

```
finances/                          ← Root workspace
├── package.json                   ← Workspace manifest; defines workspaces, root scripts
├── tsconfig.base.json             ← Shared TypeScript compiler options (strict: true)
├── .eslintrc.js                   ← Shared ESLint ruleset (referenced by both services)
├── .prettierrc                    ← Shared Prettier config (referenced by both services)
├── .husky/
│   └── pre-commit                 ← Hook: runs lint-staged on staged files
├── .gitignore                     ← Covers node_modules, dist/, .env for both services
├── README.md                      ← Onboarding doc (install, start, test, env vars)
│
├── backend/                       ← Backend service (independent workspace)
│   ├── package.json               ← Service manifest; declares its own dependencies
│   ├── tsconfig.json              ← Extends ../../tsconfig.base.json; adds outDir, etc.
│   ├── .env.example               ← Documents required env vars (PORT, etc.)
│   ├── src/
│   │   ├── index.ts               ← Entry point; calls validateEnv(), starts server
│   │   ├── env.ts                 ← validateEnv() — fails fast if vars missing
│   │   ├── app.ts                 ← Express app factory (testable without listening)
│   │   └── routes/
│   │       └── health.ts          ← GET /health handler
│   └── tests/
│       ├── unit/
│       │   └── env.test.ts        ← Tests for validateEnv() fail-fast logic
│       └── integration/
│           └── health.test.ts     ← Supertest integration test for GET /health
│
└── frontend/                      ← Frontend service (independent workspace)
    ├── package.json               ← Service manifest; declares its own dependencies
    ├── tsconfig.json              ← Extends ../../tsconfig.base.json; adds jsx, etc.
    ├── vite.config.ts             ← Vite configuration (port, proxy to backend)
    ├── .env.example               ← Documents required env vars (VITE_API_URL, etc.)
    ├── src/
    │   ├── main.tsx               ← React entry point
    │   └── App.tsx                ← Root component (placeholder for feature expansion)
    └── tests/
        └── unit/
            └── App.test.tsx       ← Smoke test: App renders without error
```

---

## Structural Entity Definitions

### Root Workspace

| Attribute | Value |
|---|---|
| Location | `/` (repository root) |
| Manifest | `package.json` with `"workspaces": ["backend", "frontend"]` |
| Responsibilities | Unified scripts, shared configs, pre-commit hooks |
| Does NOT own | Source code, service-specific dependencies |

**Root scripts contract**:

| Script | Delegates to |
|---|---|
| `npm install` | Installs all workspace dependencies |
| `npm run dev` | `concurrently "[backend] ..." "[frontend] ..."` |
| `npm run build` | `npm run build -w backend && npm run build -w frontend` |
| `npm run test` | `npm run test -w backend && npm run test -w frontend` |
| `npm run lint` | `npm run lint -w backend && npm run lint -w frontend` |
| `npm run format` | `prettier --write "**/*.{ts,tsx,json}"` |

---

### Backend Service

| Attribute | Value |
|---|---|
| Location | `backend/` |
| Framework | Express.js |
| Default port | `3001` (configurable via `PORT` env var) |
| Required env vars | `PORT` |
| Build output | `backend/dist/` |
| Test runner | Jest + ts-jest + Supertest |

**Env validation rules**:
- `PORT` — required; must be a valid port number string; service exits with
  code 1 if absent, printing: `Missing required env vars: PORT`

---

### Frontend Service

| Attribute | Value |
|---|---|
| Location | `frontend/` |
| Framework | React 18 + Vite |
| Default port | `5173` (Vite default; configurable via `VITE_PORT` env var) |
| Required env vars | `VITE_API_URL` |
| Build output | `frontend/dist/` |
| Test runner | Jest + ts-jest |

**Env validation rules**:
- `VITE_API_URL` — required; must be a non-empty string; service exits with
  code 1 if absent.

---

### Shared Configuration

| File | Scope | Purpose |
|---|---|---|
| `tsconfig.base.json` | Both services | `strict: true`, `target: ES2022`, `moduleResolution: bundler` |
| `.eslintrc.js` | Both services | TypeScript ESLint recommended + Prettier plugin |
| `.prettierrc` | Both services | 2-space indent, single quotes, trailing commas |
| `.husky/pre-commit` | Commit-time | Runs `lint-staged` on staged `.ts`/`.tsx` files |

---

## Port Conflict Behavior

Per FR-010: When a service attempts to bind its configured port and the port is
already in use, the service MUST catch the `EADDRINUSE` error and exit with:

```
Error: Port 3001 is already in use. Set a different PORT in your .env file.
```

(Replace `3001` with the actual configured port at runtime.)
