# Quickstart — Gestão de Orçamentos (feature 008)

Guia rápido para implementar e validar a feature seguindo TDD (Princípio II) e a ordem de gates da constituição.

## Pré-requisitos

- Branch `008-budget-management` ativa.
- Stack já instalada (features 004–007): Node 20, Postgres 15, `npm install` no monorepo.
- Banco de dev com features 004/006/007 migradas (existem `User`, `FamilyGroup`, `Category`, `Expense`).

## Ordem de implementação (gates)

### 1. Contrato primeiro (Princípio I — gate de revisão)
- `contracts/openapi.yaml` já define os 3 endpoints. Revise antes de qualquer código de fronteira.

### 2. Migração + schema
```bash
# Edite backend/prisma/schema.prisma: adicione enums BudgetTargetType/BudgetLimitType,
# model Budget e as relações inversas em FamilyGroup/User/Category.
cd backend
npx prisma migrate dev --name 008_budget_management --create-only
# Edite a migration.sql gerada: adicione os 3 índices ÚNICOS PARCIAIS e as FKs ON DELETE CASCADE
# (ver data-model.md → seção Índices). Depois aplique:
npx prisma migrate dev
```

### 3. Backend — TDD por camada
Escreva os testes **falhando** primeiro, depois implemente até passar.

**Unitários puros** (`backend/tests/application/budget/budget-resolver.test.ts`):
- resolução ABSOLUTE (passthrough), PERCENT membro/raiz sobre família, PERCENT sub sobre raiz resolvida;
- arredondamento half-up: `10% de 123455 → 12346` (12345.5 → 12346);
- "não resolvível": família ausente ⇒ `resolvedCents=null`; raiz não resolvível ⇒ sub `null`;
- warnings: `category.allocation_exceeds_family` (soma raízes > família **e** Σ% raiz > 100), `subcategory.exceeds_root`;
- membros **não** geram warning (FR-007).

**Use cases** (`backend/tests/application/budget/*.test.ts`):
- `get-month-budget`: monta família+membros+categorias+summary; filtra ex-membros;
- `upsert-month-budget`: cria/atualiza; zero/null ⇒ DELETE (FR-008); só toca alvos enviados; valida alvo pertence ao grupo → `budget.target_not_found`;
- `copy-previous-month`: não-destrutiva (preenche só vazios), preserva `limitType`, `copiedCount` correto, fromMonth vazio ⇒ 0.

**Contrato HTTP** (`backend/tests/api/budget/*.test.ts` com Supertest):
- `GET /api/v1/budgets?month=2026-06` → 200 com envelope; 400 mês inválido; 401 sem sessão; 403 sem grupo;
- `PUT` → upsert, remoção por zero, `budget.invalid_percent` (percentual com decimal ou negativo), 404 alvo cross-group;
- `POST /copy` → cópia não-destrutiva; naturalmente idempotente (retry copia 0, `copiedCount=0`);
- **scoping**: recurso de outro grupo retorna 404 indistinguível.

Implemente `domain/budget/budget.repository.ts`, `application/budget/*`, `api/budget/{router,validators,serializer}.ts` e registre em `backend/src/app.ts`:
```ts
app.use('/api/v1/budgets', budgetRouter);
```

### 4. Frontend — TDD de componente/hook
- `services/budget.service.ts` (3 chamadas), `types/budget.ts`.
- Hooks: `useMonthBudget`, `useSaveMonthBudget`, `useCopyPreviousMonth`, `useBudgetCopyPrompt` (FR-025).
- Componentes: `BudgetsPage` + seções (família/membros/categorias), `AllocationSummaryBar` (saldo em tempo real, FR-023), `MonthSelector`, `CopyPreviousMonthDialog`.
- Ative a rota: em `frontend/src/router/AppRouter.tsx`, troque o placeholder `<div>Em breve</div>` de `/orcamentos` por `<BudgetsPage/>`.

## Validação manual (smoke)

```bash
# Backend
cd backend && npm run dev
# Frontend
cd frontend && npm run dev
```
1. Logue, entre num grupo com ≥2 membros e algumas categorias (features 004/006/007).
2. Abra `/orcamentos` → mês corrente vazio. Defina família = R$ 5.000,00 → salva.
3. Defina membro A = 30% → exibe R$ 1.500,00 resolvido. Defina membro B = R$ 1.500,00.
4. Categorias: "Pagar Contas" = 40% → R$ 2.000,00; misture uma raiz em valor; uma sub em % da raiz.
5. Force excedente (raízes somando > 100%) → **aviso consultivo** aparece, mas salva.
6. Navegue para o próximo mês (vazio) → "copiar mês anterior" → valores e tipos replicados; edite e confirme que o mês origem não muda.
7. Em um mês sem orçamento, registre uma despesa → o app **pergunta** se quer copiar o mês anterior (FR-025); recuse → despesa salva, mês segue sem orçamento.

## Critérios de aceite mapeados
- SC-003 (≤1s, 50 cat + 10 membros): GET agregado em uma query + resolução O(n).
- SC-005 (cópia): não-destrutiva, preserva existentes, replica tipos.
- SC-006 (excedente): salva 100% com aviso.
- SC-008 (resolução correta incl. half-up): coberto pelos unitários de `budget-resolver`.
- SC-009 (distribuir 5 raízes por % em <2min): saldo em tempo real client-side.

## Gates antes do PR
- [ ] Todos os testes vermelhos antes da implementação; verdes antes do PR (Princípio II).
- [ ] Contrato revisado antes das tasks foundational (Workflow).
- [ ] Constitution Check do PR: I–V sem violação.
- [ ] PT-BR em toda a UI; valores `Int` (centavos/percentual), sem float.
