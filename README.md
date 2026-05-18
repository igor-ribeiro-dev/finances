# Finances

A personal budget planning application. Backend and frontend live in the same repository with internal separation — each service is independently runnable, testable, and deployable.

## Prerequisites

| Requirement | Minimum version | Check |
|---|---|---|
| Node.js LTS | 20.x | `node --version` |
| npm | 10.x | `npm --version` |
| Git | Any recent | `git --version` |

## Setup

### 1. Install all dependencies

```bash
npm install
```

This installs root and both service dependencies in one step.

### 2. Configure environment variables

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

Edit each `.env` file with the required values (see **Environment Variables** below).

## Running the application

### Start both services together

```bash
npm run dev
```

Each log line is prefixed with the originating service:

```
[backend] Server listening on port 3001
[frontend]  VITE v5.x  ready in 300ms
[frontend]  ➜  Local: http://localhost:5173/
```

### Start services independently

**Backend only:**
```bash
npm run dev -w backend
# or: cd backend && npm run dev
```

**Frontend only:**
```bash
npm run dev -w frontend
# or: cd frontend && npm run dev
```

## Verification

```bash
# Backend health check
curl http://localhost:3001/health
# Expected: {"status":"ok","service":"backend","timestamp":"..."}

# Frontend
open http://localhost:5173
```

## Testing

**All tests:**
```bash
npm run test
```

**Backend only:**
```bash
npm run test -w backend
```

**Frontend only:**
```bash
npm run test -w frontend
```

## Code quality

**Lint both services:**
```bash
npm run lint
```

**Format all code:**
```bash
npm run format
```

Pre-commit hooks run automatically on staged files before every commit.

## Building for deployment

```bash
npm run build
```

Outputs:
- `backend/dist/` — Node.js server (independent)
- `frontend/dist/` — Static web assets (independent)

## Environment Variables

### Backend (`backend/.env`)

| Variable | Required | Default | Description |
|---|---|---|---|
| `PORT` | Yes | — | Port the backend server listens on |

### Frontend (`frontend/.env`)

| Variable | Required | Default | Description |
|---|---|---|---|
| `VITE_API_URL` | Yes | — | Backend base URL (e.g., `http://localhost:3001`) |
| `VITE_PORT` | No | `5173` | Port the Vite dev server listens on |

## Troubleshooting

| Problem | Solution |
|---|---|
| `Missing required env vars: PORT` | Add `PORT=3001` to `backend/.env` |
| `Missing required env vars: VITE_API_URL` | Add `VITE_API_URL=http://localhost:3001` to `frontend/.env` |
| `Error: Port 3001 is already in use` | Change `PORT` in `backend/.env` or stop the process using that port |
| Lint errors on commit | Run `npm run lint` to see all violations and fix before committing |
