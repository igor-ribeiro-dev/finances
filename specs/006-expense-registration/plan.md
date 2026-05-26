# Implementation Plan: Registro de Despesas

**Branch**: `006-expense-registration` | **Date**: 2026-05-25 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/006-expense-registration/spec.md`

## Summary

Entregar a primeira capacidade real de captura de dado do app: registrar, listar, editar e excluir despesas de um grupo familiar. Backend Express + Prisma 7 expõe `/api/v1/expenses` (recurso plano com `groupId` derivado do cookie de sessão da feature 004), com paginação por cursor para infinite scroll, idempotência via `Idempotency-Key` em `POST`, semântica full-body em `PATCH`, envelope de erro estendido (`fieldErrors`) e validação por Zod. Frontend React adiciona uma página `/despesas` com listagem virtual + modal de formulário + modal de confirmação de exclusão, atualização otimista de UI, máscara monetária BR (centavos puros) e tratamento explícito do 404 por delete concorrente. Sem mudança de stack — reusa cookie de sessão, schema de erros, layout shell e design tokens já entregues nas features 004 e 005.

## Technical Context

**Language/Version**: Node.js 20 LTS + TypeScript 5 (strict mode) — backend Express e frontend React SPA

**Primary Dependencies**:
- **Backend existentes**: Express 4, Prisma 7 com `@prisma/adapter-pg`, `cookie-parser`, `bcrypt`, Zod (validação), Jest + Supertest (testes)
- **Backend novas**: nenhuma — `crypto.randomUUID()` do Node 20 cobre geração de UUID quando precisarmos no servidor; sem libs extras
- **Frontend existentes**: React 18, React Router DOM v7, Tailwind 3 (com tokens da feature 005), Lucide icons, Jest + React Testing Library
- **Frontend novas**: nenhuma obrigatória — `Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })` cobre formatação; `crypto.randomUUID()` (Web Crypto) gera `Idempotency-Key`; máscara monetária e infinite scroll implementados em componentes próprios sem libs externas

**Storage**: Postgres 15 (já em uso desde feature 001) — duas tabelas novas: `Expense` (registros de despesa) e `IdempotencyKey` (dedupe de POST com TTL 24h). A `Expense` carrega tanto `createdById` (write-once, autor original) quanto `updatedById` (sobrescrito server-side a cada PATCH, igual a `createdById` na criação) — ambos FK para `User`. Sem alteração no schema das tabelas existentes (`User`, `FamilyGroup`) — apenas novas back-relations.

**Testing**:
- Backend: Jest + Supertest — testes unitários por use case (`backend/tests/application/expense/`) e testes de contrato HTTP (`backend/tests/api/expense/`).
- Frontend: Jest + React Testing Library (jsdom) — testes de componente (modal, form, lista, máscara), testes do hook de mutação otimista.

**Target Platform**: Backend roda em Node.js 20 LTS (Linux/macOS); frontend roda em navegadores modernos (Chrome 115+, Firefox 120+, Safari 17+).

**Project Type**: Web monorepo (npm workspaces) com `backend/` e `frontend/` — estrutura estabelecida na feature 001 e expandida nas features 004 e 005.

**Performance Goals**:
- SC-006: 500 despesas exibidas em ≤ 2 s (cursor pagination com `LIMIT 50` + índice `(groupId, date DESC, id DESC)`)
- POST/PATCH/DELETE p95 < 300 ms em rede local de desenvolvimento
- Modal de formulário abre em < 100 ms (componente local, sem fetch)

**Constraints**:
- WCAG 2.1 AA (contraste, navegação por teclado, foco visível) — inherited from feature 005
- PT-BR exclusivamente — labels, mensagens de erro, toasts
- Valor monetário sempre em centavos inteiros (`amountCents: Int` no Prisma, `number` no TS)
- Data sempre `DATE` Postgres (sem timezone) — formato `"YYYY-MM-DD"` no JSON
- Cookie de sessão é a única autenticação aceita; nenhum endpoint público novo
- Toda resposta de erro segue envelope `{ error: { code, message, fieldErrors? } }` — superset do helper `AppError` existente

**Scale/Scope**: Família com 2–10 membros, ~100–500 despesas no primeiro ano, ~5 000 no longo prazo. Cursor pagination escala horizontalmente sem mudanças.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Princípio | Status | Notas |
|-----------|--------|-------|
| **I. API-First** | ✅ PASS | OpenAPI contract em `contracts/openapi.yaml` definido no Phase 1 antes de qualquer código de implementação. Cobre os 5 endpoints (`POST/GET/GET:id/PATCH/DELETE`), envelope de erro com `fieldErrors`, esquema de paginação por cursor e header `Idempotency-Key`. |
| **II. Test-First (NON-NEGOTIABLE)** | ✅ APPLIES | TDD obrigatório. Ordem: (1) testes Jest+Supertest do contrato HTTP por endpoint **falhando** → (2) implementação até passar → (3) testes RTL dos componentes frontend falhando → (4) implementação. Cobertura crítica: validação Zod por campo, autorização (grupo do usuário), idempotência (replay vs novo), cursor estável, otimismo + rollback no frontend. |
| **III. Security & Data Integrity** | ✅ PASS | Auth obrigatória em todos os endpoints via `auth.middleware.ts` existente (cookie de sessão validado em DB; nenhum endpoint público novo). Scoping: middleware adicional `requireMembership` injeta `groupId` e bloqueia se usuário não pertencer a grupo. Money em `Int` (centavos). Validação Zod no boundary antes de qualquer use case. Cookie `httpOnly + SameSite=Lax + Secure em prod` herdado de 004. |
| **IV. Simplicity** | ✅ PASS | Reuso integral da arquitetura em camadas (`api/application/domain/infra/middleware`). Sem novas bibliotecas. Sem state management global no frontend — `useState` + custom hook por mutação. Nenhuma abstração nova que não atenda a um requirement direto do spec. Idempotency table é a única estrutura "extra", justificada por FR-024 e blast radius (duplo-clique cria duplicata). |
| **V. Observability** | ✅ PASS | Reutiliza `AppError` da feature 004 com `code` machine-readable; estende com `fieldErrors`. Logs estruturados (JSON) já presentes no Express via middleware da feature 001/004. Endpoints sensíveis (POST/PATCH/DELETE) logam `userId`, `groupId`, `expenseId`, `action`, `outcome` — sem valores monetários em texto claro. `/health` existente cobre status do serviço. |

**Gate result: PASS** — Phase 0 pode iniciar.

## Project Structure

### Documentation (this feature)

```text
specs/006-expense-registration/
├── plan.md              # Este arquivo
├── spec.md              # Specificação (feita)
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/
│   └── openapi.yaml     # Phase 1 output — contrato HTTP completo
├── checklists/
│   └── requirements.md  # Feito no /speckit-specify
└── tasks.md             # Phase 2 output (gerado por /speckit-tasks)
```

### Source Code (repository root)

```text
backend/
├── prisma/
│   ├── schema.prisma                            # Add Expense + IdempotencyKey models
│   └── migrations/
│       └── <timestamp>_006_expense_registration/
│           └── migration.sql
└── src/
    ├── api/
    │   └── expense/
    │       ├── expense.router.ts                # 5 rotas REST sob /api/v1/expenses
    │       └── expense.validators.ts            # Zod schemas (create, update, list query)
    ├── application/
    │   └── expense/
    │       ├── create-expense.use-case.ts       # POST (com idempotency)
    │       ├── list-expenses.use-case.ts        # GET com cursor
    │       ├── get-expense.use-case.ts          # GET :id
    │       ├── update-expense.use-case.ts       # PATCH full-body
    │       └── delete-expense.use-case.ts       # DELETE
    ├── domain/
    │   └── expense/
    │       ├── expense.repository.ts            # Prisma queries (com cursor)
    │       └── idempotency.repository.ts        # POST replay store
    └── middleware/
        └── require-membership.middleware.ts     # NOVO — injeta res.locals.groupId

backend/tests/
├── api/
│   └── expense/
│       ├── create-expense.contract.test.ts      # Supertest — POST + Idempotency-Key
│       ├── list-expenses.contract.test.ts       # Supertest — GET cursor pagination
│       ├── get-expense.contract.test.ts         # Supertest — GET :id (404 cross-group)
│       ├── update-expense.contract.test.ts      # Supertest — PATCH full-body
│       └── delete-expense.contract.test.ts      # Supertest — DELETE
└── application/
    └── expense/
        ├── create-expense.use-case.test.ts      # Validação, idempotency replay, createdById write
        ├── list-expenses.use-case.test.ts       # Cursor + ordering estável
        ├── update-expense.use-case.test.ts      # Full-body + campo imutável ignorado
        └── delete-expense.use-case.test.ts      # Idempotente em 404

frontend/src/
├── pages/
│   └── ExpensesPage.tsx                         # Rota /despesas — listagem + modais
├── components/
│   └── expense/
│       ├── ExpenseList.tsx                      # Infinite scroll
│       ├── ExpenseListItem.tsx                  # Linha (data, desc, valor, responsável, método)
│       ├── ExpenseFormModal.tsx                 # Criar/editar — overlay
│       ├── DeleteExpenseModal.tsx               # Confirmação destrutiva
│       ├── MoneyInput.tsx                       # Máscara BR (centavos)
│       ├── OwnerMemberPicker.tsx                # Lista membros ativos
│       └── PaymentMethodPicker.tsx              # 2 opções (radio/toggle)
├── services/
│   └── expense.service.ts                       # fetch wrappers (POST/GET/PATCH/DELETE)
├── hooks/
│   ├── useExpensesList.ts                       # Cursor + infinite scroll + optimistic
│   ├── useCreateExpense.ts                      # POST + Idempotency-Key + optimistic
│   ├── useUpdateExpense.ts                      # PATCH + optimistic + 404 handling
│   └── useDeleteExpense.ts                      # DELETE + optimistic + 404 silencioso
└── config/
    └── navigation.ts                            # MODIFICADO — Despesas: status active + path /despesas

frontend/tests/unit/
├── components/expense/
│   ├── ExpenseList.test.tsx                     # Renderiza linhas + empty state + load more
│   ├── ExpenseFormModal.test.tsx                # Validação inline, foco, ESC, submit
│   ├── DeleteExpenseModal.test.tsx              # Confirmação, cancela com ESC/click fora
│   └── MoneyInput.test.tsx                      # Máscara, backspace, valor em centavos
└── hooks/
    ├── useCreateExpense.test.ts                 # Optimistic + rollback em erro + Idempotency-Key
    ├── useUpdateExpense.test.ts                 # Optimistic + 404 handling
    └── useDeleteExpense.test.ts                 # Optimistic + 404 silencioso
```

**Structure Decision**: Monorepo backend + frontend já estabelecido pela feature 001. Esta feature **adiciona** as pastas `backend/src/{api,application,domain}/expense/`, o middleware `require-membership`, a página `frontend/src/pages/ExpensesPage.tsx` e os componentes/hooks em `frontend/src/components/expense/` e `frontend/src/hooks/`. Nenhuma pasta existente é renomeada ou removida. O `navigation.ts` da feature 005 ganha o item Despesas como `active` (era `coming-soon`).

## Complexity Tracking

> Nenhum desvio do constitution; a tabela permanece vazia.

A única estrutura adicional além das tabelas óbvias do domínio é `IdempotencyKey`, e essa é justificada explicitamente por FR-024 (dedupe seguro do POST sob retry ou duplo-clique com UI otimista). Não há novas dependências, nem state management novo, nem padrão de orquestração além do que 004 já estabeleceu.
