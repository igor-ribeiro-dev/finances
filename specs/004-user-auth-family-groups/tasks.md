# Tasks: Autenticação de Usuários e Grupos Familiares

**Input**: Design documents from `specs/004-user-auth-family-groups/`

**Prerequisites**: [plan.md](plan.md) | [spec.md](spec.md) | [data-model.md](data-model.md) | [contracts/openapi.yaml](contracts/openapi.yaml) | [research.md](research.md)

**Tests**: Obrigatórios — TDD mandatório pela Constitution. Todo teste DEVE ser escrito e estar FALHANDO antes da implementação correspondente.

**Stack**: Node.js 20 + TypeScript 5, Express 4, Prisma 5, bcrypt, nodemailer, cookie-parser (backend) | React 18, React Router v6 (frontend)

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Pode rodar em paralelo (arquivos diferentes, sem dependências incompletas)
- **[Story]**: User story correspondente (US1–US4)
- Caminhos relativos a partir da raiz do monorepo

---

## Phase 1: Setup (Infraestrutura Compartilhada)

**Purpose**: Instalar dependências e criar estrutura de diretórios do feature

- [x] T001 Instalar dependências do backend: `npm install prisma @prisma/client bcrypt nodemailer cookie-parser -w backend` e devDeps: `npm install -D @types/bcrypt @types/nodemailer @types/cookie-parser prisma -w backend`
- [x] T002 [P] Instalar dependências do frontend: `npm install react-router-dom -w frontend` e `npm install -D @types/react-router-dom -w frontend`
- [x] T003 [P] Criar estrutura de diretórios do backend: `backend/prisma/migrations/`, `backend/src/domain/user/`, `backend/src/domain/family-group/`, `backend/src/domain/invite/`, `backend/src/application/auth/`, `backend/src/application/family-group/`, `backend/src/api/auth/`, `backend/src/api/family-group/`, `backend/src/middleware/`, `backend/src/infra/`, `backend/tests/unit/auth/`, `backend/tests/unit/family-group/`, `backend/tests/integration/auth/`, `backend/tests/integration/family-group/`
- [x] T004 [P] Criar estrutura de diretórios do frontend: `frontend/src/pages/`, `frontend/src/components/auth/`, `frontend/src/services/`, `frontend/src/contexts/`, `frontend/src/router/`, `frontend/tests/unit/pages/`, `frontend/tests/unit/components/`
- [x] T005 Atualizar `backend/.env.example` com as variáveis: `SESSION_COOKIE_DOMAIN`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `FRONTEND_URL`

---

## Phase 2: Foundational (Pré-requisitos Bloqueantes)

**Purpose**: Infraestrutura central que DEVE estar completa antes de qualquer user story

**⚠️ CRÍTICO**: Nenhuma user story pode começar até esta fase estar completa

- [x] T000Criar `backend/prisma/schema.prisma` com os modelos: `User`, `FamilyGroup`, `Invite`, `Session`, `PasswordResetToken` — conforme `data-model.md` (campos, tipos, constraints, relações e índices)
- [x] T000Executar migração inicial: `cd backend && npx prisma migrate dev --name init_auth_family_groups` — gera `backend/prisma/migrations/`
- [x] T000[P] Criar singleton Prisma client em `backend/src/infra/prisma.ts` (exporta instância única de `PrismaClient`)
- [x] T000[P] Criar serviço de e-mail em `backend/src/infra/email.ts` (Nodemailer com SMTP via env vars; exporta `sendPasswordResetEmail(to, token)`)
- [x] T010 [P] Criar helper de erros padronizados em `backend/src/api/errors.ts` (classe `AppError` com `code: string` e `message: string`; função `sendError(res, status, code, message)`)
- [x] T011 Implementar middleware de autenticação em `backend/src/middleware/auth.middleware.ts` (lê cookie `session_id`, valida em banco, renova `expiresAt = now() + 30d`, injeta `req.userId`; retorna 401 com `UNAUTHORIZED` se inválido/expirado)
- [x] T012 Atualizar `backend/src/app.ts` para: montar routers sob `/api/v1/auth` e `/api/v1/groups`; adicionar `cookie-parser`; configurar CORS para `FRONTEND_URL`
- [x] T013 [P] Criar `frontend/src/services/auth.service.ts` com funções base: `register`, `login`, `logout`, `getMe` (fetch com credentials; intercepta 401 e emite evento `session:expired`)
- [x] T014 [P] Criar `frontend/src/contexts/AuthContext.tsx` com estado `{ user, loading }` e ações `{ register, login, logout }` (carrega `getMe` na inicialização)
- [x] T015 Criar `frontend/src/router/ProtectedRoute.tsx` (verifica `AuthContext`: se loading → spinner; se não autenticado → `/login`; se autenticado sem grupo → `/onboarding`; se autenticado com grupo → renderiza children)
- [x] T016 Criar `frontend/src/router/AppRouter.tsx` com rotas: `/login`, `/register`, `/forgot-password`, `/reset-password`, `/onboarding` (sem proteção), `/` (protegida via ProtectedRoute); montar em `frontend/src/main.tsx`

**Checkpoint**: Fundação pronta — implementação das user stories pode começar

---

## Phase 3: User Story 1 — Cadastro e Login (P1) 🎯 MVP

**Goal**: Usuário consegue criar conta, fazer login, ver dados próprios e fazer logout

**Independent Test**: Criar conta via `POST /api/v1/auth/register`, fazer login via `POST /api/v1/auth/login`, confirmar cookie de sessão, chamar `GET /api/v1/auth/me`, fazer `POST /api/v1/auth/logout` e confirmar que `GET /api/v1/auth/me` retorna 401

### Testes — US1 ⚠️ Escrever primeiro, confirmar que FALHAM

- [x] T017 [P] [US1] Escrever testes unitários falhando para register use-case em `backend/tests/unit/auth/register.test.ts`: e-mail duplicado → `EMAIL_ALREADY_IN_USE`; senha fraca → `INVALID_PASSWORD`; sucesso → usuário criado com hash bcrypt
- [x] T018 [P] [US1] Escrever testes unitários falhando para login use-case em `backend/tests/unit/auth/login.test.ts`: credenciais inválidas → `INVALID_CREDENTIALS`; sucesso → sessão criada com `expiresAt = now() + 30d`
- [x] T019 [P] [US1] Escrever testes de integração falhando para `POST /auth/register` e `POST /auth/login` em `backend/tests/integration/auth/auth.test.ts` (usando Supertest; verifica cookie `httpOnly` no response)
- [x] T020 [P] [US1] Escrever testes unitários falhando para `PasswordInput` em `frontend/tests/unit/components/PasswordInput.test.tsx`: exibe feedback de regras (comprimento, número, maiúscula) a cada keystroke
- [x] T021 [P] [US1] Escrever testes unitários falhando para `LoginForm` em `frontend/tests/unit/components/LoginForm.test.tsx`: submissão com campos vazios exibe erros; submissão válida chama `login`

### Implementação — US1

- [x] T022 [P] [US1] Implementar `backend/src/domain/user/user.repository.ts`: `findByEmail(email)`, `create({ name, email, passwordHash })`, `findById(id)`, `updatePassword(userId, passwordHash)` (usa Prisma client de `infra/prisma.ts`)
- [x] T023 [US1] Implementar `backend/src/application/auth/register.use-case.ts`: normaliza email para lowercase; valida unicidade; valida força de senha (≥8 chars, ≥1 número, ≥1 maiúscula); hasheia com `bcrypt` custo 12; cria `User`; cria `Session` com `expiresAt = now() + 30d`; retorna usuário + sessionId
- [x] T024 [US1] Implementar `backend/src/application/auth/login.use-case.ts`: busca usuário por email; compara senha com `bcrypt.compare`; cria nova `Session`; retorna usuário + sessionId (erro genérico `INVALID_CREDENTIALS` se qualquer validação falhar)
- [x] T025 [US1] Implementar `backend/src/application/auth/logout.use-case.ts`: deleta `Session` pelo `sessionId` do cookie
- [x] T026 [US1] Implementar `backend/src/application/auth/get-me.use-case.ts`: busca `User` via `req.userId` (injetado pelo auth middleware); retorna `{ id, name, email, familyGroupId }`
- [x] T027 [US1] Implementar `backend/src/api/auth/auth.router.ts` com os handlers: `POST /register`, `POST /login` (define cookie `session_id` com `httpOnly: true`, `sameSite: 'lax'`, `maxAge: 2592000`, `secure: process.env.NODE_ENV === 'production'`), `POST /logout` (limpa cookie), `GET /me` (requer auth middleware)
- [x] T028 [P] [US1] Implementar `frontend/src/components/auth/PasswordInput.tsx`: input de senha com toggle show/hide e lista de regras inline (comprimento ✓/✗, número ✓/✗, maiúscula ✓/✗) atualizadas a cada keystroke
- [x] T029 [P] [US1] Implementar `frontend/src/components/auth/RegisterForm.tsx`: campos nome, e-mail, senha (usa `PasswordInput`); submissão chama `AuthContext.register`; exibe erro de API (ex.: `EMAIL_ALREADY_IN_USE`)
- [x] T030 [P] [US1] Implementar `frontend/src/components/auth/LoginForm.tsx`: campos e-mail e senha; submissão chama `AuthContext.login`; exibe `INVALID_CREDENTIALS` como mensagem genérica
- [x] T031 [P] [US1] Implementar `frontend/src/pages/RegisterPage.tsx` e `frontend/src/pages/LoginPage.tsx` (montam os forms; link cruzado entre as páginas)
- [x] T032 [US1] Adicionar listener de `session:expired` em `frontend/src/router/AppRouter.tsx` que redireciona para `/login?expired=1` e exibe "Sua sessão expirou. Faça login novamente."

**Checkpoint**: US1 completa — registro, login, logout e redirecionamento de sessão expirada funcionam de ponta a ponta

---

## Phase 4: User Story 2 — Criar Grupo Familiar (P2)

**Goal**: Usuário autenticado sem grupo pode criar um grupo e receber link/código de convite

**Independent Test**: Fazer login, chamar `POST /api/v1/groups` com nome → receber `{ id, name, invite: { code, link, expiresAt } }`; chamar `GET /api/v1/auth/me` → confirmar `familyGroupId` preenchido

### Testes — US2 ⚠️ Escrever primeiro, confirmar que FALHAM

- [x] T033 [P] [US2] Escrever testes unitários falhando para create-group use-case em `backend/tests/unit/family-group/create-group.test.ts`: usuário já em grupo → `ALREADY_IN_GROUP`; sucesso → grupo criado, convite de 8 chars gerado, `User.familyGroupId` atualizado
- [x] T034 [P] [US2] Escrever testes de integração falhando para `POST /groups` em `backend/tests/integration/family-group/create-group.test.ts` (verifica resposta com `invite.code`, `invite.expiresAt`)
- [x] T035 [P] [US2] Escrever testes unitários falhando para `OnboardingPage` em `frontend/tests/unit/pages/OnboardingPage.test.tsx`: renderiza opções "Criar grupo" e "Entrar com código"; formulário de criação valida nome não vazio
- [x] T035b [P] [US2] Escrever testes unitários falhando para regenerate-invite use-case em `backend/tests/unit/family-group/regenerate-invite.test.ts`: usuário sem grupo → erro `FORBIDDEN`; sucesso → convite anterior deletado e novo convite de 8 chars gerado; testar integração via `POST /groups/invite/regenerate` retornando `{ code, link, expiresAt }`

### Implementação — US2

- [x] T036 [P] [US2] Implementar `backend/src/domain/family-group/family-group.repository.ts`: `create({ name })`, `findById(id)`
- [x] T037 [P] [US2] Implementar `backend/src/domain/invite/invite.repository.ts`: `create({ familyGroupId, code, expiresAt })`, `deleteByGroupId(groupId)`, `findByCode(code)`, `findByGroupId(groupId)`
- [x] T038 [US2] Implementar `backend/src/application/family-group/create-group.use-case.ts`: verifica `user.familyGroupId === null`; cria `FamilyGroup`; gera código 8-char com `crypto.randomBytes` (base36 uppercase); cria `Invite` com `expiresAt = now() + 7d`; atualiza `User.familyGroupId`; retorna grupo + invite
- [x] T039 [US2] Implementar `backend/src/application/family-group/regenerate-invite.use-case.ts`: verifica que usuário tem grupo; deleta convite anterior; gera e insere novo convite; retorna novo invite
- [x] T040 [US2] Implementar `backend/src/api/family-group/family-group.router.ts` com: `POST /groups` (requer auth), `POST /groups/invite/regenerate` (requer auth)
- [x] T041 [US2] Implementar `frontend/src/pages/OnboardingPage.tsx`: tabs "Criar grupo" / "Entrar com código"; formulário de criação chama `POST /api/v1/groups`; ao sucesso, atualiza `AuthContext.user.familyGroupId` e redireciona para `/`

**Checkpoint**: US2 completa — criação de grupo e geração de convite funcionam

---

## Phase 5: User Story 3 — Entrar em Grupo Familiar (P3)

**Goal**: Usuário autenticado pode entrar em grupo via código ou link de convite; histórico de membros que saem é preservado

**Independent Test**: Segunda conta faz `POST /api/v1/groups/join` com código válido → `familyGroupId` preenchido e igual ao do criador; `DELETE /api/v1/groups/members/me` → `familyGroupId` volta a `null`

### Testes — US3 ⚠️ Escrever primeiro, confirmar que FALHAM

- [x] T042 [P] [US3] Escrever testes unitários falhando para join-group use-case em `backend/tests/unit/family-group/join-group.test.ts`: código inválido → `INVALID_INVITE_CODE`; expirado → `INVALID_INVITE_CODE`; já em grupo → `ALREADY_IN_GROUP`; sucesso → `User.familyGroupId` atualizado
- [x] T043 [P] [US3] Escrever testes de integração falhando para `POST /groups/join` e `DELETE /groups/members/me` em `backend/tests/integration/family-group/join-leave.test.ts`

### Implementação — US3

- [x] T044 [US3] Implementar `backend/src/application/family-group/join-group.use-case.ts`: busca convite por código; verifica `expiresAt > now()` e que usuário não tem grupo; atualiza `User.familyGroupId`; retorna grupo
- [x] T045 [US3] Implementar `backend/src/application/family-group/leave-group.use-case.ts`: verifica que usuário tem grupo; seta `User.familyGroupId = null` (dados históricos do usuário permanecem no grupo)
- [x] T046 [US3] Adicionar `POST /groups/join` e `DELETE /groups/members/me` ao router `backend/src/api/family-group/family-group.router.ts`
- [x] T047 [US3] Adicionar aba "Entrar com código" ao `frontend/src/pages/OnboardingPage.tsx`: input de código (8 chars, uppercase automático); submissão chama `POST /api/v1/groups/join`; ao sucesso, redireciona para `/`
- [x] T048 [US3] Adicionar suporte a rota `/join/:code` em `frontend/src/router/AppRouter.tsx`: se autenticado sem grupo → redireciona para `/onboarding` com código pré-preenchido; se não autenticado → redireciona para `/register?join=:code`

**Checkpoint**: US3 completa — entrar e sair de grupo funcionam; dados históricos preservados

---

## Phase 6: User Story 4 — Recuperação de Senha (P4)

**Goal**: Usuário que esqueceu a senha recebe link por e-mail, redefine com nova senha e todas as outras sessões são invalidadas

**Independent Test**: `POST /auth/forgot-password` com e-mail válido → 200 (mesmo para e-mail inexistente); usar token do banco → `POST /auth/reset-password` → 200; tentar reutilizar mesmo token → 400 `INVALID_RESET_TOKEN`

### Testes — US4 ⚠️ Escrever primeiro, confirmar que FALHAM

- [x] T049 [P] [US4] Escrever testes unitários falhando para forgot-password use-case em `backend/tests/unit/auth/forgot-password.test.ts`: e-mail inexistente → retorna 200 sem enviar (não revela); e-mail válido → token criado com `expiresAt = now() + 1h`
- [x] T050 [P] [US4] Escrever testes unitários falhando para reset-password use-case em `backend/tests/unit/auth/reset-password.test.ts`: token expirado → `INVALID_RESET_TOKEN`; token já usado → `INVALID_RESET_TOKEN`; sucesso → senha atualizada, outras sessões deletadas, token marcado `usedAt`
- [x] T051 [P] [US4] Escrever testes de integração falhando para `POST /auth/forgot-password` e `POST /auth/reset-password` em `backend/tests/integration/auth/password-reset.test.ts`

### Implementação — US4

- [x] T052 [US4] Implementar `backend/src/application/auth/forgot-password.use-case.ts`: busca usuário por e-mail; se não existir, retorna sem ação (sem revelar); gera token de 64 bytes hex com `crypto.randomBytes(64).toString('hex')`; cria `PasswordResetToken` com `expiresAt = now() + 1h`; envia e-mail via `infra/email.ts` com link `${FRONTEND_URL}/reset-password?token=<token>`
- [x] T053 [US4] Implementar `backend/src/application/auth/reset-password.use-case.ts`: busca token por valor; valida `expiresAt > now()` e `usedAt IS NULL`; valida força da nova senha; hasheia com bcrypt 12; atualiza `User.passwordHash`; seta `token.usedAt = now()`; deleta TODAS as `Session` do usuário exceto a atual (se houver)
- [x] T054 [US4] Adicionar `POST /auth/forgot-password` e `POST /auth/reset-password` ao `backend/src/api/auth/auth.router.ts`
- [x] T055 [P] [US4] Implementar `frontend/src/pages/ForgotPasswordPage.tsx`: campo e-mail; submissão chama `POST /auth/forgot-password`; exibe mensagem de sucesso genérica independente do resultado
- [x] T056 [P] [US4] Implementar `frontend/src/pages/ResetPasswordPage.tsx`: lê `?token=` da URL; campo nova senha (usa `PasswordInput` com validação inline); submissão chama `POST /auth/reset-password`; ao sucesso redireciona para `/login`
- [x] T057 [US4] Adicionar link "Esqueceu a senha?" em `frontend/src/components/auth/LoginForm.tsx` apontando para `/forgot-password`

**Checkpoint**: US4 completa — recuperação de senha funciona de ponta a ponta

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Melhorias transversais que afetam múltiplas user stories

- [x] T058 [P] Adicionar logs estruturados JSON (usando `console.log(JSON.stringify({...}))` ou biblioteca de log mínima) em todos os use-cases: auth register/login/logout, group create/join/leave, password reset — incluir `{ action, userId, timestamp }` sem dados sensíveis (sem senha, sem token completo)
- [x] T059 [P] Adicionar validação de request body nos routers (verificar campos obrigatórios, tipos e limites) antes de chamar use-cases — retornar 400 com `VALIDATION_ERROR` se inválido
- [x] T060 [P] Executar o fluxo completo do `quickstart.md` manualmente e atualizar o arquivo com correções necessárias
- [x] T061 Atualizar `specs/003-product-roadmap/spec.md` — alterar status da feature 004 de "Planned" para "Complete"

---

## Dependencies & Execution Order

### Dependências entre Fases

- **Phase 1 (Setup)**: Nenhuma dependência — pode começar imediatamente
- **Phase 2 (Foundational)**: Depende da Phase 1 — bloqueia todas as user stories
- **Phase 3 (US1)**: Depende da Phase 2 — MVP mínimo
- **Phase 4 (US2)**: Depende da Phase 2 e da Phase 3 (usa `auth middleware` e `User.familyGroupId`)
- **Phase 5 (US3)**: Depende da Phase 4 (usa grupo e convite criados em US2)
- **Phase 6 (US4)**: Depende da Phase 3 (usa `User` e `Session` de US1)
- **Phase 7 (Polish)**: Depende de todas as user stories desejadas estarem completas

### Dependências entre User Stories

- **US1 (P1)**: Independente após Phase 2 — sem dependências de outras stories
- **US2 (P2)**: Depende de US1 (precisa do usuário autenticado para criar grupo)
- **US3 (P3)**: Depende de US2 (precisa do convite gerado em US2)
- **US4 (P4)**: Depende de US1 (usa User e Session); pode ser desenvolvida em paralelo com US2/US3

### Dentro de Cada User Story

1. Testes escritos e FALHANDO (antes de qualquer implementação)
2. Repositories (domain layer)
3. Use-cases (application layer)
4. Routers/handlers (api layer)
5. Frontend (services → context → components → pages)

---

## Parallel Example: User Story 1

```bash
# Escrever todos os testes de US1 em paralelo (devem FALHAR):
T017: testes unitários de register
T018: testes unitários de login
T019: testes de integração auth
T020: testes de PasswordInput
T021: testes de LoginForm

# Após testes falhando, implementar em paralelo onde possível:
T022: user.repository.ts       # independente
T028: PasswordInput.tsx        # independente
T029: RegisterForm.tsx         # independente (depende de T028)
T030: LoginForm.tsx            # independente

# Sequencial (depende dos repositories):
T023 → T024 → T025 → T026 → T027  # use-cases → router
T031 → T032                         # pages → session handler
```

---

## Implementation Strategy

### MVP (User Story 1 apenas)

1. Completar Phase 1 + Phase 2
2. Completar Phase 3 (US1) com TDD
3. **PARAR e VALIDAR**: registro, login, logout e redirecionamentos funcionam
4. Demonstrar / fazer deploy do MVP

### Entrega Incremental

1. Setup + Foundational → base pronta
2. US1 → login/registro funciona (MVP)
3. US4 → recuperação de senha (pode ser desenvolvida em paralelo com US2)
4. US2 → criação de grupo
5. US3 → entrada no grupo (feature completa)
6. Polish → qualidade e observabilidade

---

## Notes

- **[P]**: arquivos diferentes, sem dependências incompletas — podem ser delegados a agentes paralelos
- **[US?]**: mapeia a task à user story para rastreabilidade
- TDD obrigatório — testes DEVEM estar vermelhos antes de qualquer implementação
- Fazer commit após cada fase ou grupo lógico de tasks
- Parar em qualquer checkpoint para validar a user story de forma independente
- Cada use-case é testável isoladamente com mocks do Prisma client
