# Implementation Plan: Dashboard de Orçamentos e Despesas

**Branch**: `009-budget-dashboard` | **Date**: 2026-06-10 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/009-budget-dashboard/spec.md`

## Summary

Entregar o dashboard mensal que conecta as features 006 (despesas) e 008 (orçamentos): total gasto da família vs. orçamento da família, gasto por membro vs. orçamento individual (com ex-membros como linha inativa), e distribuição por categoria com percentuais (raiz agrega sub-categorias; "Sem categoria" como grupo próprio), navegável do mês corrente para qualquer mês passado. **Nenhuma tabela nova e nenhuma dependência nova** — é uma feature de read-model puro. O backend ganha um único endpoint **`GET /api/v1/dashboard?month=YYYY-MM`** que compõe (a) a agregação de gastos do mês via duas queries `groupBy` no `Expense` (por `ownerMemberId` e por `categoryId`, faixa de data civil `[início do mês, início do mês seguinte)` sobre o índice `(groupId, date)` existente) com (b) os limites já resolvidos pela feature 008 (reuso integral de `get-month-budget.use-case`/`budget-resolver` — percentuais → centavos half-up, "não resolvível" = sem orçamento). A fusão é feita por uma função pura **`dashboard-aggregator.ts`** (testável isolada): soma raiz = despesas diretas + sub-categorias (Clarification Q1), linhas de membros incluem ex-membros com gasto > 0 marcados `isExMember` (Q2, soma das linhas = total da família), e o envelope devolve apenas **centavos inteiros** — percentuais de participação/consumo são derivados no frontend na exibição (inteiros, base da sub-categoria = total da raiz, Q3). Frontend substitui o placeholder de `DashboardPage` (rota `/` já registrada na feature 005) por três seções (família, membros, categorias expansíveis) + seletor de mês limitado ao mês corrente (sem futuro, FR-013), reutilizando os padrões visuais e utilitários (`utils/money.ts`, `utils/month.ts`) das features anteriores.

## Technical Context

**Language/Version**: Node.js 20 LTS + TypeScript 5 (strict mode) — backend Express e frontend React SPA, inalterado desde as features 004–008.

**Primary Dependencies**:

- **Backend existentes** (sem mudanças): Express 4, Prisma 7 com `@prisma/adapter-pg`, Zod 4, Jest 30 + Supertest. Middlewares `auth.middleware.ts` + `require-membership.middleware.ts` reutilizados. Reuso direto de `application/budget/budget-resolver.ts` e `get-month-budget.use-case.ts` (feature 008) para limites resolvidos.
- **Backend novas**: nenhuma.
- **Frontend existentes** (sem mudanças): React 18, React Router DOM v7 (rota `/` já renderiza `DashboardPage`), Tailwind 3 (tokens da feature 005), Lucide icons, Jest + React Testing Library. `MonthSelector` (feature 008) reaproveitado com prop opcional de mês máximo; `utils/money.ts` e `utils/month.ts` reutilizados.
- **Frontend novas**: nenhuma.

**Storage**: Postgres 15 — **nenhuma migração**. Leitura agregada sobre tabelas existentes: `Expense` (índice `(groupId, date DESC, id DESC)` da feature 006 cobre a faixa do mês), `Budget`, `Category`, `User`. Agregação via `prisma.expense.groupBy` (somas de `amountCents` por `ownerMemberId` e por `categoryId`).

**Testing**:

- Backend: Jest + Supertest — unitários do agregador puro (`backend/tests/application/dashboard/`: soma raiz = direta + subs, grupo "Sem categoria", ex-membro com/sem gasto, mês vazio, percentual não resolvível tratado como sem orçamento) e contrato HTTP (`backend/tests/api/dashboard/`: envelope completo, mês vazio, validação `month`, 401 sem auth, 403 sem grupo, isolamento entre grupos).
- Frontend: Jest + React Testing Library — `DashboardPage` (estados vazio/carregando/erro), cartão da família (consumo, estouro >100%, "orçamento não definido"), lista de membros (ex-membro inativo, sem orçamento), categorias (ordenação por participação, expansão de sub-categorias com % da raiz, "Sem categoria"), seletor de mês (bloqueio de futuro, voltar ao mês atual em uma ação).

**Target Platform**: Backend Node.js 20 LTS; frontend navegadores modernos (Chrome 115+, Firefox 120+, Safari 17+). Inalterado.

**Project Type**: Web monorepo (npm workspaces) com `backend/` e `frontend/`, estrutura das features 001/004–008.

**Performance Goals**:

- SC-002: dashboard de mês com ≤ 500 despesas, 10 membros e 50 categorias carrega em ≤ 2 s — `GET /dashboard?month` faz 2 `groupBy` indexados + 1 leitura de budgets/categorias/membros (mesma carga do GET da feature 008) + merge O(n) em memória; p95 esperado < 200 ms.
- SC-006: despesa nova refletida em ≤ 2 s após recarregar (sem realtime — recarga sob demanda, padrão das features anteriores).
- SC-001/SC-005: respondidos por design de UI (resumo da família no topo da página inicial `/`; seletor de mês com salto direto).

**Constraints**:

- Valores monetários sempre `Int` (centavos) ponta a ponta; nenhuma aritmética float (Princípio III). Percentuais de exibição são inteiros calculados no frontend a partir de centavos (`Math.round` sobre razão de inteiros).
- Mês = data civil da despesa (`date DATE`, FR-013 da feature 006) — sem conversão de timezone em camada alguma; faixa `[YYYY-MM-01, mês+1-01)`.
- Navegação limitada a mês corrente e passados (FR-013) — imposta na UI; o endpoint (read-only) aceita qualquer mês válido e devolve zeros para meses sem dados.
- PT-BR exclusivamente; mês exibido por extenso (`Intl.DateTimeFormat('pt-BR')`, já usado em `utils/month.ts`).
- WCAG 2.1 AA herdado da feature 005 — barras de progresso com texto equivalente (percentual e valores), não apenas cor para indicar estouro.
- Envelope de erro flat `{ code, message, fieldErrors? }` reutilizado; código novo `dashboard.invalid_month`.

**Scale/Scope**: Família 2–10 membros, ~5–50 categorias, ~centenas de despesas/mês (SC-002 usa 500 como teto de teste). 1 endpoint novo, 1 página + ~5 componentes novos, 0 migrações.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Princípio | Status | Notas |
|-----------|--------|-------|
| **I. API-First** | PASS | `contracts/openapi.yaml` definido no Phase 1 ANTES de qualquer código — cobre o único endpoint novo `GET /api/v1/dashboard?month=YYYY-MM` e seu envelope (família + membros + categorias + "Sem categoria", todos em centavos com limites resolvidos no formato `ResolvedLimit` da feature 008). Nenhum contrato existente é alterado. |
| **II. Test-First (NON-NEGOTIABLE)** | APPLIES | TDD obrigatório. Ordem: (1) testes de contrato HTTP do `GET /dashboard` **falhando** → (2) implementação backend; (3) testes RTL dos componentes/hook **falhando** → (4) implementação frontend. Cobertura crítica: agregação raiz = direta + subs (Q1), ex-membro como linha inativa com soma batendo com o total (Q2), % de sub-categoria relativo à raiz (Q3), mês vazio sem divisão por zero (FR-016), percentual não resolvível = sem orçamento (FR-007), isolamento entre grupos. |
| **III. Security & Data Integrity** | PASS | Auth + `requireMembership` no endpoint (injeta `res.locals.groupId`); todas as queries filtram por `groupId`; dados de outro grupo são inalcançáveis por construção (agregação parte do `groupId` da sessão). Somas em aritmética inteira de centavos (`groupBy _sum` do Prisma sobre coluna `Int`); zero float. Validação Zod de `month` na borda. Endpoint read-only — nenhum risco de escrita. |
| **IV. Simplicity** | PASS | Zero tabelas, zero migrações, zero dependências novas, zero snapshots persistidos — dashboard é cálculo sob demanda (Assumption do spec). Reuso integral da resolução de limites da feature 008 em vez de reimplementar. Um único endpoint agregado em vez de N chamadas compostas no cliente (ver research R1). Percentuais derivados no cliente — o contrato trafega apenas centavos, uma única fonte de verdade numérica. |
| **V. Observability** | PASS | Envelope de erro com `code` machine-readable (`dashboard.invalid_month`); 401/403 reutilizam códigos das features 004/006. Log JSON estruturado no acesso (`userId`, `groupId`, `month`, `outcome`) sem valores monetários em claro. `/health` inalterado. |

**Gate result: PASS** — Phase 0 pode iniciar. Re-avaliado após o Phase 1 (abaixo): **PASS mantido**, sem entradas em Complexity Tracking.

## Project Structure

### Documentation (this feature)

```text
specs/009-budget-dashboard/
├── plan.md              # Este arquivo
├── spec.md              # Especificação (feita; 3 clarifications integradas)
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output (read-model derivado — sem tabelas novas)
├── quickstart.md        # Phase 1 output
├── contracts/
│   └── openapi.yaml     # Phase 1 output — contrato do GET /api/v1/dashboard
├── checklists/
│   └── requirements.md  # Feito no /speckit-specify
└── tasks.md             # Phase 2 output (gerado por /speckit-tasks)
```

### Source Code (repository root)

```text
backend/
└── src/
    ├── api/
    │   └── dashboard/
    │       ├── dashboard.router.ts                 # GET /api/v1/dashboard?month=YYYY-MM (auth + requireMembership)
    │       ├── dashboard.validators.ts             # Zod: month YYYY-MM obrigatório e válido
    │       └── dashboard.serializer.ts             # Monta o envelope (família + membros + categorias + uncategorized)
    ├── application/
    │   └── dashboard/
    │       ├── get-month-dashboard.use-case.ts     # Orquestra: gastos agregados + getMonthBudget (008) → aggregator
    │       └── dashboard-aggregator.ts             # Função pura: merge gastos × limites resolvidos; raiz = direta + subs; ex-membros
    ├── domain/
    │   └── expense/
    │       └── expense.repository.ts               # MODIFICADO — adiciona aggregateMonthSpending(groupId, month):
    │                                                #   groupBy ownerMemberId + groupBy categoryId (_sum amountCents) na faixa do mês
    ├── application/budget/                          # (sem mudanças — get-month-budget.use-case reutilizado como está)
    ├── middleware/                                  # (sem mudanças)
    └── app.ts                                       # MODIFICADO — monta dashboard.router em /api/v1/dashboard

frontend/
└── src/
    ├── pages/
    │   └── DashboardPage.tsx                        # MODIFICADO — placeholder "Bem-vindo" → dashboard real (rota / já aponta aqui)
    ├── components/
    │   └── dashboard/
    │       ├── FamilySummaryCard.tsx                # Total gasto vs. orçamento da família; estouro; "orçamento não definido" + link /orcamentos
    │       ├── MemberSpendingList.tsx               # Linha por membro (gasto, limite, %, saldo); ex-membro inativo; destaque de estouro
    │       ├── CategorySpendingList.tsx             # Raízes ordenadas por participação desc; expansão → subs com % da raiz; "Sem categoria"
    │       ├── BudgetProgressBar.tsx                # Barra de consumo acessível (texto + cor), compartilhada pelas 3 seções
    │       └── DashboardMonthSelector.tsx           # Wrapper do MonthSelector (008) com teto no mês corrente + "voltar ao mês atual"
    ├── hooks/
    │   └── useMonthDashboard.ts                     # GET /dashboard?month (loading/error/data, recarga ao trocar mês)
    ├── services/
    │   └── dashboard.service.ts                     # Cliente HTTP do endpoint
    ├── types/
    │   └── dashboard.ts                             # Tipos do envelope de resposta
    └── utils/
        └── percent.ts                               # NOVO — participação/consumo como inteiro a partir de centavos (sem float acumulado)

backend/tests/
├── application/dashboard/                           # Unitários: dashboard-aggregator (Q1/Q2/Q3, mês vazio, sem categoria)
└── api/dashboard/                                   # Contrato HTTP: envelope, validação month, auth, isolamento de grupo

frontend/src/components/dashboard/*.test.tsx          # Componentes + DashboardPage + hook (co-localizados, padrão do repo)
```

**Structure Decision**: Web monorepo existente (Opção 2). A feature adiciona um módulo vertical `dashboard/` em `api/` e `application/` do backend — sem camada `domain/dashboard` própria, pois não há entidade persistida nova; a única mudança em domínio é um método de agregação no `expense.repository.ts` existente. No frontend, um módulo `dashboard/` de componentes ativa a página inicial `/` já provisionada pela feature 005. Modificações em arquivos existentes: `app.ts` (mount do router), `expense.repository.ts` (método novo), `DashboardPage.tsx` (placeholder → página real) e `MonthSelector.tsx` apenas se a prop de teto for adicionada lá (alternativa: wrapper compõe sem tocar no original — decidir na implementação pela opção de menor diff).

## Complexity Tracking

> Sem violações de constituição a justificar — tabela intencionalmente vazia.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| — | — | — |
