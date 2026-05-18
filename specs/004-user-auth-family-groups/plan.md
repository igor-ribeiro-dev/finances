# Implementation Plan: Autenticação de Usuários e Grupos Familiares

**Branch**: `004-user-auth-family-groups` | **Date**: 2026-05-17 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/004-user-auth-family-groups/spec.md`

## Summary

Implementar cadastro, login, logout e recuperação de senha de usuários, além de criação e entrada em grupos familiares via convite. Backend em Node.js/TypeScript com Express e Prisma (PostgreSQL); frontend em React/TypeScript com React Router. Sessões por token opaco em banco, cookies httpOnly, validade de 30 dias com renovação automática. Onboarding obrigatório para usuários sem grupo.

## Technical Context

**Language/Version**: Node.js 20 LTS + TypeScript 5 (strict mode)

**Primary Dependencies**:
- Backend: Express 4, Prisma 5 (ORM + Migrate), bcrypt, nodemailer, cookie-parser
- Frontend: React 18, React Router v6

**Storage**: PostgreSQL 15 — tabelas: `User`, `FamilyGroup`, `Invite`, `Session`, `PasswordResetToken`

**Testing**: Jest + Supertest (backend); Jest + React Testing Library (frontend)

**Target Platform**: Node.js 20 server (backend) + navegador moderno (frontend SPA)

**Project Type**: Web application — monorepo com workspace `backend` e `frontend`

**Performance Goals**: SC-001 — cadastro + login em menos de 2 minutos; SC-002 — convite gerado e membro entrou em menos de 3 minutos

**Constraints**:
- Senhas armazenadas exclusivamente como hash bcrypt (custo 12)
- Sessões armazenadas em banco; cookie `httpOnly`, `SameSite=Lax`, `Secure` ativado apenas em produção (`NODE_ENV === 'production'`)
- Tokens de reset com TTL 1 hora; um convite ativo por grupo
- Interface exclusivamente em PT-BR

**Scale/Scope**: App familiar — até ~10 usuários por grupo; sem requisitos de alta escala nesta feature

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design.*

| Princípio | Status | Notas |
|-----------|--------|-------|
| I. API-First | ✅ PASS | Contrato OpenAPI definido em `contracts/openapi.yaml` antes de qualquer código |
| II. Test-First | ✅ PASS | TDD obrigatório — testes escritos e falhando antes da implementação |
| III. Security & Data Integrity | ✅ PASS | Senhas em bcrypt; sessões em DB; endpoints protegidos por middleware de auth; input validado na borda da API |
| IV. Simplicity | ✅ PASS | Token opaco em DB (sem JWT); sem abstrações desnecessárias; React Context sem biblioteca de estado global |
| V. Observability | ✅ PASS | Logs estruturados JSON em todas as operações de auth; `/health` já existe; erros com `code` + `message` |

**Sem violações. Nenhuma entrada em Complexity Tracking necessária.**

## Project Structure

### Documentation (this feature)

```text
specs/004-user-auth-family-groups/
├── plan.md              ← este arquivo
├── research.md          ← Phase 0: decisões técnicas
├── data-model.md        ← Phase 1: modelo de entidades e schema Prisma
├── contracts/
│   └── openapi.yaml     ← Phase 1: contrato OpenAPI completo
├── quickstart.md        ← Phase 1: guia de setup e uso
└── tasks.md             ← Phase 2 (/speckit-tasks — não criado aqui)
```

### Source Code Impact

```text
backend/
├── prisma/
│   ├── schema.prisma                    ← User, FamilyGroup, Invite, Session, PasswordResetToken
│   └── migrations/
│       └── 001_auth_family_groups/
├── src/
│   ├── domain/
│   │   ├── user/
│   │   │   └── user.repository.ts
│   │   ├── family-group/
│   │   │   └── family-group.repository.ts
│   │   └── invite/
│   │       └── invite.repository.ts
│   ├── application/
│   │   ├── auth/
│   │   │   ├── register.use-case.ts
│   │   │   ├── login.use-case.ts
│   │   │   ├── logout.use-case.ts
│   │   │   ├── get-me.use-case.ts
│   │   │   ├── forgot-password.use-case.ts
│   │   │   └── reset-password.use-case.ts
│   │   └── family-group/
│   │       ├── create-group.use-case.ts
│   │       ├── join-group.use-case.ts
│   │       ├── regenerate-invite.use-case.ts
│   │       └── leave-group.use-case.ts
│   ├── api/
│   │   ├── auth/
│   │   │   └── auth.router.ts
│   │   └── family-group/
│   │       └── family-group.router.ts
│   ├── middleware/
│   │   └── auth.middleware.ts
│   └── infra/
│       ├── prisma.ts
│       └── email.ts
└── tests/
    ├── unit/
    │   ├── auth/           ← testes de use cases de auth
    │   └── family-group/   ← testes de use cases de grupos
    └── integration/
        ├── auth/           ← testes de endpoints /auth/*
        └── family-group/   ← testes de endpoints /groups/*

frontend/
├── src/
│   ├── pages/
│   │   ├── LoginPage.tsx
│   │   ├── RegisterPage.tsx
│   │   ├── ForgotPasswordPage.tsx
│   │   ├── ResetPasswordPage.tsx
│   │   └── OnboardingPage.tsx
│   ├── components/
│   │   └── auth/
│   │       ├── LoginForm.tsx
│   │       ├── RegisterForm.tsx
│   │       └── PasswordInput.tsx
│   ├── services/
│   │   └── auth.service.ts
│   ├── contexts/
│   │   └── AuthContext.tsx
│   └── router/
│       ├── AppRouter.tsx
│       └── ProtectedRoute.tsx
└── tests/
    └── unit/
        ├── pages/
        └── components/
```

**Structure Decision**: Web application (Option 2) — backend e frontend separados no monorepo existente. Estrutura de pastas segue `domain → application → api` no backend para separar responsabilidades sem over-engineering.

---

## Phase 0: Research

Todas as decisões foram tomadas com base na stack existente do projeto e nos requisitos do spec. Ver [research.md](research.md) para o log completo.

**Principais decisões**:
- Token de sessão opaco em banco (não JWT) — suporta renovação de 30 dias e revogação imediata
- bcrypt custo 12 para hashing de senhas
- Nodemailer + SMTP para e-mails de recuperação de senha
- Código de convite: 8 chars alfanuméricos maiúsculos
- Prisma como ORM + Prisma Migrate para schema
- React Router v6 + `ProtectedRoute` para roteamento protegido
- React Context para estado de autenticação no frontend

**Constitution re-check após Phase 0: PASS.**

---

## Phase 1: Design

### Data Model

Ver [data-model.md](data-model.md) para o modelo completo com campos, constraints e schema Prisma.

**Entidades**: `User`, `FamilyGroup`, `Invite`, `Session`, `PasswordResetToken`

**Regra crítica de roteamento frontend**:
- `GET /api/v1/auth/me` retorna `familyGroupId: null` → redirecionar para `/onboarding`
- `GET /api/v1/auth/me` retorna 401 → redirecionar para `/login`
- `GET /api/v1/auth/me` retorna `familyGroupId: <uuid>` → permitir acesso ao app

### API Contracts

Ver [contracts/openapi.yaml](contracts/openapi.yaml) para o contrato completo.

**Endpoints**:

| Método | Path | Auth |
|--------|------|------|
| POST | /api/v1/auth/register | Não |
| POST | /api/v1/auth/login | Não |
| POST | /api/v1/auth/logout | Sim |
| GET | /api/v1/auth/me | Sim |
| POST | /api/v1/auth/forgot-password | Não |
| POST | /api/v1/auth/reset-password | Não |
| POST | /api/v1/groups | Sim |
| POST | /api/v1/groups/join | Sim |
| POST | /api/v1/groups/invite/regenerate | Sim |
| DELETE | /api/v1/groups/members/me | Sim |

**Autenticação**: Cookie `session_id` (httpOnly, SameSite=Lax). Middleware `auth.middleware.ts` valida o token em banco e renova `expiresAt` a cada request.

### Maintenance Process

- O schema Prisma é a fonte de verdade para o modelo de dados; qualquer alteração exige uma nova migration.
- O contrato OpenAPI em `contracts/openapi.yaml` é a fonte de verdade para a API; alterações quebra-contrato exigem bump de versão (`/api/v2`).
