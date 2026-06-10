# Implementation Plan: Gestão de Orçamentos

**Branch**: `008-budget-management` | **Date**: 2026-06-09 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/008-budget-management/spec.md`

## Summary

Entregar a definição e gestão de orçamentos mensais em três dimensões — **família** (global, sempre valor absoluto), **membro** e **categoria** (raiz + sub-categoria) — onde membros e categorias aceitam limite em **valor absoluto (centavos) ou percentual inteiro**, escolhido por alvo e misturável no mesmo mês. Backend Express + Prisma 7 adiciona um único modelo polimórfico **`Budget`** (`targetType` ∈ FAMILY/MEMBER/CATEGORY, `limitType` ∈ ABSOLUTE/PERCENT) com três **índices únicos parciais** (um por `targetType`) garantindo no banco no máximo um orçamento por (grupo, mês, alvo) — mesmo padrão de unicidade parcial já adotado na feature 007. A **resolução** de percentuais a centavos é feita server-side em runtime (sem coluna derivada): membro/raiz incidem sobre o valor do orçamento da família; sub-categoria incide sobre o valor já resolvido da raiz pai; arredondamento ao centavo mais próximo (half-up via `Math.round` em aritmética inteira de centavos, respeitando o Princípio III). FKs usam **`ON DELETE CASCADE`** para `groupId`, `targetMemberId` e `targetCategoryId` — deliberadamente diferente do `RESTRICT` de `Expense.categoryId`: excluir uma categoria remove silenciosamente seus orçamentos (FR-015), sem entrar como bloqueador no delete-preview da feature 007. A API expõe três endpoints sob `/api/v1/budgets`: `GET ?month=YYYY-MM` (retrato agregado do mês — família + membros + árvore de categorias, cada um com valor bruto + `resolvedCents` + sumário de alocação + `warnings` consultivos), `PUT ?month=YYYY-MM` (upsert em lote transacional; `null`/zero remove o alvo) e `POST /copy` (cópia **não-destrutiva** do mês anterior — preenche só os alvos vazios). O gatilho da FR-025 (perguntar ao criar despesa em mês sem orçamento) é **orquestração de frontend** sobre os endpoints existentes — zero acoplamento novo no backend de despesa. Frontend React substitui o placeholder "Em breve" da rota `/orcamentos` (já cadastrada na feature 005) por uma página de edição com três seções, seletor de mês, toggle valor/percentual por linha, barra de saldo alocado em tempo real (FR-023) e o diálogo de cópia. Sem novas dependências em nenhum dos lados.

## Technical Context

**Language/Version**: Node.js 20 LTS + TypeScript 5 (strict mode) — backend Express e frontend React SPA, inalterado desde as features 004/006/007.

**Primary Dependencies**:

- **Backend existentes** (sem mudanças): Express 4, Prisma 7 com `@prisma/adapter-pg`, `cookie-parser`, Zod 4, Jest 30 + Supertest. Middlewares `auth.middleware.ts` e `require-membership.middleware.ts` (feature 004/006) reutilizados integralmente.
- **Backend novas**: nenhuma. Resolução percentual é aritmética inteira de centavos; sem biblioteca decimal (valores armazenados como `Int` cents per Constituição).
- **Frontend existentes** (sem mudanças): React 18, React Router DOM v7 (rota `/orcamentos` já registrada), Tailwind 3 (tokens da feature 005), Lucide icons, Jest + React Testing Library. Item de menu "Orçamentos" já presente em `frontend/src/config/navigation.ts`.
- **Frontend novas**: nenhuma.

**Storage**: Postgres 15 (em uso desde a feature 001). Tabela nova **`Budget`** (id, groupId, month, targetType, targetMemberId?, targetCategoryId?, limitType, amountCents?, percent?, timestamps); dois enums novos (`BudgetTargetType`, `BudgetLimitType`); três índices únicos **parciais** (FAMILY / MEMBER / CATEGORY) + índice de leitura `(groupId, month)`. Migração única `008_budget_management`. Nenhuma alteração em tabelas existentes — a interação da FR-015 (cascade ao excluir categoria) é resolvida pela FK do próprio `Budget`, não por mudança em `Category`/`Expense`.

**Testing**:

- Backend: Jest + Supertest — unitários por use case (`backend/tests/application/budget/`: resolução de percentuais incl. arredondamento half-up, cascata raiz→sub, cálculo de warnings, upsert/remoção por zero, cópia não-destrutiva) e contrato HTTP (`backend/tests/api/budget/`: GET/PUT/POST, scoping 404 cross-group, validação Zod por campo, percentual não inteiro rejeitado).
- Frontend: Jest + React Testing Library (jsdom) — `BudgetsPage`, seções família/membros/categorias, toggle valor/percentual, barra de saldo, diálogo de cópia, e o hook de prompt da FR-025 no fluxo de criação de despesa.

**Target Platform**: Backend Node.js 20 LTS (Linux/macOS); frontend navegadores modernos (Chrome 115+, Firefox 120+, Safari 17+). Inalterado.

**Project Type**: Web monorepo (npm workspaces) com `backend/` e `frontend/`, estrutura da feature 001 estendida por 004/005/006/007.

**Performance Goals**:

- SC-003: mês com até 50 categorias + 10 membros carrega em ≤ 1 s — `GET /budgets?month` resolve em uma única query (`Budget` filtrado por `groupId` + `month`, com membros e categorias do grupo) + resolução O(n) em memória.
- SC-004: alteração visível a outro membro em < 2 s após recarregar (sem realtime; recarga sob demanda, como nas features anteriores).
- PUT em lote de um mês (≤ ~70 alvos) p95 < 200 ms numa única transação Prisma.
- SC-009: distribuir 5 raízes por percentual em < 2 min com saldo em tempo real (cálculo client-side; servidor recalcula warnings autoritativos no PUT).

**Constraints**:

- Valores monetários sempre `Int` (centavos); percentuais sempre `Int` (FR-010); resolução half-up (FR-021) — Princípio III (sem float).
- PT-BR exclusivamente — labels, mensagens, toasts; ordenação alfabética de categorias reutiliza o collation `pt-BR-x-icu` da feature 007.
- WCAG 2.1 AA herdado da feature 005 — diálogo de cópia segue o padrão de focus trap/ESC já estabelecido.
- Família sempre ABSOLUTE (FR-001); independência família × soma de membros mantida (FR-007) — nenhuma validação cruzada nem bloqueio.
- Zero/branco = não definido = ausência de linha `Budget` (FR-008) — nunca persistimos limite zero.
- Envelope de erro flat `{ code, message, fieldErrors? }` reutilizado das features 004/006/007; novos códigos sob `BudgetErrorCode`.

**Scale/Scope**: Família 2–10 membros, ~5–50 categorias (SC-003). Até ~70 linhas `Budget` por mês; histórico de poucos anos → milhares de linhas no total, triviais sob o índice `(groupId, month)`.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Princípio | Status | Notas |
|-----------|--------|-------|
| **I. API-First** | PASS | `contracts/openapi.yaml` definido no Phase 1 ANTES de qualquer código — cobre os 3 endpoints (`GET`/`PUT` `/api/v1/budgets`, `POST /api/v1/budgets/copy`), o envelope agregado de resposta (família + membros + categorias com `resolvedCents`), o sumário de alocação e os `warnings` consultivos. O `POST /copy` é **naturalmente idempotente** (cópia não-destrutiva — retry copia 0; sem persistência de `IdempotencyKey`, o enum `ResourceType` NÃO é estendido). Nenhuma mudança de contrato em endpoints existentes — a FR-025 é orquestração de frontend sobre os contratos atuais de despesa + budget. |
| **II. Test-First (NON-NEGOTIABLE)** | APPLIES | TDD obrigatório. Ordem: (1) testes de contrato HTTP por endpoint **falhando** → (2) implementação → (3) testes RTL de componente/hook falhando → (4) implementação. Cobertura crítica: resolução de percentuais com arredondamento half-up (casos de fração de centavo), cascata raiz→sub, percentual não resolvível quando a base falta (FR-022), warnings de excedente (FR-009), remoção por zero (FR-008), unicidade parcial sob POSTs concorrentes, cópia não-destrutiva (FR-014). |
| **III. Security & Data Integrity** | PASS | Auth + `requireMembership` em todos os endpoints (injeta `res.locals.groupId`); toda query filtra por `groupId`; `:memberId`/`:categoryId` de outro grupo → 404 indistinguível de inexistente. Valores monetários e percentuais são `Int` — aritmética inteira de centavos, sem float (Princípio III). Validação Zod na borda antes da lógica. Unicidade enforçada no banco (índices parciais) — TOCTOU-safe. Sem PII/valores financeiros em log claro. |
| **IV. Simplicity** | PASS | **Um único** modelo `Budget` polimórfico em vez de três tabelas — menos superfície, mesma query. Sem coluna derivada para `resolvedCents` (resolução em runtime, evita invalidação ao mudar a base — FR-024 vira recálculo, não migração de dados). Sem state global no frontend — `useState` + hooks de mutação por seção, padrão idêntico à feature 006/007. Sem novas libs. Reuso integral da arquitetura em camadas. |
| **V. Observability** | PASS | `AppError` com `code` machine-readable; novos códigos `BudgetErrorCode` (`budget.invalid_month`, `budget.target_not_found`, `budget.invalid_percent`, etc.). Logs JSON estruturados nas mutações (`PUT`/`POST copy`) com `userId`, `groupId`, `month`, `action`, `outcome` — sem valores monetários em claro. `warnings` consultivos viajam na resposta, não como erro. |

**Gate result: PASS** — Phase 0 pode iniciar. Re-avaliado após o Phase 1 (abaixo): **PASS mantido**, sem entradas em Complexity Tracking.

## Project Structure

### Documentation (this feature)

```text
specs/008-budget-management/
├── plan.md              # Este arquivo
├── spec.md              # Especificação (feita; 8 clarifications integradas)
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
│   ├── schema.prisma                              # MODIFICADO — adiciona model Budget + enums BudgetTargetType/BudgetLimitType
│   └── migrations/
│       └── <timestamp>_008_budget_management/
│           └── migration.sql                       # CREATE TYPE (2 enums) + CREATE TABLE Budget + 3 índices únicos parciais + índice (groupId, month) + FKs ON DELETE CASCADE
└── src/
    ├── api/
    │   └── budget/
    │       ├── budget.router.ts                    # GET / PUT /api/v1/budgets + POST /api/v1/budgets/copy
    │       ├── budget.validators.ts                # Zod: month YYYY-MM, limitType, amountCents>0, percent inteiro>0, body de upsert/copy
    │       └── budget.serializer.ts                # Monta o envelope agregado (família + membros + categorias + summary + warnings)
    ├── application/
    │   └── budget/
    │       ├── get-month-budget.use-case.ts        # Lê Budget+membros+categorias do grupo; resolve percentuais; calcula summary + warnings
    │       ├── upsert-month-budget.use-case.ts     # Upsert em lote transacional; zero/null → delete; valida alvos pertencem ao grupo
    │       ├── copy-previous-month.use-case.ts     # Cópia não-destrutiva do mês anterior (preenche só vazios)
    │       └── budget-resolver.ts                  # Resolução pura de percentuais → centavos (half-up) + cálculo de warnings (testável isolado)
    ├── domain/
    │   └── budget/
    │       └── budget.repository.ts                # Prisma: findByGroupMonth, bulkUpsert, bulkDelete, copyInto
    ├── middleware/                                  # (sem mudanças — auth + requireMembership reutilizados)
    └── infra/                                       # (sem mudanças)

frontend/
└── src/
    ├── pages/
    │   └── BudgetsPage.tsx                          # NOVO — substitui o placeholder "Em breve" da rota /orcamentos
    ├── components/
    │   └── budget/
    │       ├── FamilyBudgetSection.tsx              # Campo único (valor absoluto) do orçamento da família
    │       ├── MemberBudgetList.tsx                 # Linha por membro com toggle valor/percentual
    │       ├── CategoryBudgetTree.tsx               # Árvore raiz+sub com toggle valor/percentual por linha
    │       ├── AllocationSummaryBar.tsx             # Saldo alocado/restante em tempo real (FR-023)
    │       ├── MonthSelector.tsx                    # Navegação entre meses (FR-013)
    │       └── CopyPreviousMonthDialog.tsx          # Diálogo de confirmação da cópia (FR-014/FR-025)
    ├── hooks/
    │   ├── useMonthBudget.ts                        # GET /budgets?month
    │   ├── useSaveMonthBudget.ts                    # PUT /budgets?month
    │   ├── useCopyPreviousMonth.ts                  # POST /budgets/copy
    │   └── useBudgetCopyPrompt.ts                   # FR-025 — orquestra o prompt no fluxo de criação de despesa
    ├── services/
    │   └── budget.service.ts                        # Cliente HTTP dos 3 endpoints
    ├── router/AppRouter.tsx                         # MODIFICADO — rota /orcamentos passa a renderizar <BudgetsPage/>
    └── types/                                       # NOVO budget.ts — tipos do envelope de resposta

backend/tests/
├── application/budget/                              # Unitários: budget-resolver, use cases
└── api/budget/                                      # Contrato HTTP: GET/PUT/POST

frontend/src/__tests__ (ou .test.tsx co-localizados)  # Componentes + hooks de orçamento
```

**Structure Decision**: Web monorepo existente (Opção 2). A feature adiciona um módulo vertical isolado `budget/` em cada camada do backend (`api`/`application`/`domain`) — espelhando exatamente a organização de `category/` da feature 007 — e um módulo `budget/` de componentes no frontend, ativando a rota `/orcamentos` já provisionada. A única modificação em arquivos existentes é uma linha no `AppRouter.tsx` (placeholder → `<BudgetsPage/>`) e o `schema.prisma` (novo model + enums). Nenhuma tabela ou endpoint existente é alterado.

## Complexity Tracking

> Sem violações de constituição a justificar — tabela intencionalmente vazia.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| — | — | — |
