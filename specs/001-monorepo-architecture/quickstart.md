# Quickstart: Base Monorepo Architecture

**Target**: Developer setting up the Finances project for the first time.
**Time**: Under 5 minutes.

---

## Prerequisites

| Requirement | Minimum version | Check command |
|---|---|---|
| Node.js LTS | 20.x | `node --version` |
| npm | 10.x | `npm --version` |
| Git | Any recent | `git --version` |

---

## 1. Clone and install

```bash
git clone <repo-url> finances
cd finances
npm install
```

This installs dependencies for the root workspace **and** both services
(`backend/` and `frontend/`) in a single step.

---

## 2. Configure environment variables

Each service requires its own `.env` file. Copy the examples and fill in
any values marked `REQUIRED`:

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

**`backend/.env`**:
```
PORT=3001
```

**`frontend/.env`**:
```
VITE_API_URL=http://localhost:3001
```

> **Important**: Both services will fail immediately at startup with a clear
> error if any required variable is missing (see FR-009).

---

## 3. Start both services together

```bash
npm run dev
```

Output will be prefixed by service name:

```
[backend] Server listening on port 3001
[frontend]  VITE v5.x  ready in 300ms
[frontend]  ➜  Local: http://localhost:5173/
```

---

## 4. Verify both services are running

```bash
# Backend health check
curl http://localhost:3001/health
# Expected: {"status":"ok","service":"backend","timestamp":"..."}

# Frontend
open http://localhost:5173
# Expected: React app loads in browser
```

---

## 5. Start services independently

**Backend only** (from project root):
```bash
npm run dev -w backend
# or: cd backend && npm run dev
```

**Frontend only** (from project root):
```bash
npm run dev -w frontend
# or: cd frontend && npm run dev
```

---

## 6. Run tests

**All tests** (from project root):
```bash
npm run test
```

**Backend tests only**:
```bash
npm run test -w backend
```

**Frontend tests only**:
```bash
npm run test -w frontend
```

---

## 7. Lint and format

**Lint both services** (from project root):
```bash
npm run lint
```

**Format all code**:
```bash
npm run format
```

> Pre-commit hooks will run lint automatically on staged files before
> each commit. A commit with lint violations will be blocked.

---

## 8. Build for deployment

**Both services**:
```bash
npm run build
```

Output:
- `backend/dist/` — Node.js server bundle
- `frontend/dist/` — Static web assets

Each output is independently deployable.

---

## Troubleshooting

| Problem | Solution |
|---|---|
| `Missing required env vars: PORT` | Add `PORT=3001` to `backend/.env` |
| `Missing required env vars: VITE_API_URL` | Add `VITE_API_URL=http://localhost:3001` to `frontend/.env` |
| `Error: Port 3001 is already in use` | Change `PORT` in `backend/.env` or stop the process using port 3001 |
| `Error: Port 5173 is already in use` | Change `VITE_PORT` in `frontend/.env` or stop the process using port 5173 |
| Lint errors on commit | Run `npm run lint` to see all violations; fix before committing |
