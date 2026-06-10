# Implementation Plan: Categorias de Despesas

**Branch**: `007-expense-categories` | **Date**: 2026-06-08 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/007-expense-categories/spec.md`

## Summary

Entregar a estrutura de categorias que classifica despesas — fundação para Orçamentos (roadmap 007), Dashboard (008), Analytics (009) e Filtros de Histórico (011). Backend Express + Prisma 7 adiciona um modelo `Category` com `parentId` self-referencing (profundidade máxima de 2), normalização case/whitespace-insensitive enforçada **no banco** via coluna `GENERATED ALWAYS AS … STORED` (collation `pt-BR-x-icu`) e dois índices únicos parciais cobrindo o caso `parentId IS NULL` vs `IS NOT NULL`. O modelo `Expense` ganha **um único** novo campo opcional — `categoryId` FK para `Category(id)` (single-column design da clarification Q5) — que aponta tanto para raízes quanto para sub-categorias; o caminho hierárquico (`category` + `subCategory`) é derivado server-side via duplo `LEFT JOIN` em uma única query paginada. Delete usa `ON DELETE RESTRICT` em todas as FKs de categoria — bloqueio simétrico (sem cascade, sem nullificação implícita), com `GET /api/v1/categories/:id/delete-preview` alimentando dois modos de modal no frontend (destrutivo padrão vs bloqueante com botão único OK). A tabela `IdempotencyKey` da feature 006 é generalizada para polimorfismo (`resourceType` + `resourceId`, perdendo a FK direta a Expense) para reusar o mesmo cleanup TTL 24h sob a regra explícita da FR-015. Frontend React adiciona uma página `/categorias` com árvore alfabética e modal CRUD overlay (FR-022), estende o modal de despesa com seletores raiz + sub-categoria (FR-007) — mapeando UI de 2 seletores para 1 ID no payload (FR-008) — e renderiza uma etiqueta `<raiz> · <sub>` na listagem de despesas. Sem novas dependências em nenhum dos lados.

## Technical Context

**Language/Version**: Node.js 20 LTS + TypeScript 5 (strict mode) — backend Express e frontend React SPA, inalterado desde features 004/006.

**Primary Dependencies**:

- **Backend existentes** (sem mudanças): Express 4, Prisma 7 com `@prisma/adapter-pg`, `cookie-parser`, Zod 4, Jest 30 + Supertest, `bcrypt`.
- **Backend novas**: nenhuma. O `pt-BR-x-icu` collation já vem com Postgres 15 (ICU built-in); `crypto.randomUUID()` cobre UUIDs server-side.
- **Frontend existentes** (sem mudanças): React 18, React Router DOM v7, Tailwind 3 (tokens da feature 005), Lucide icons, Jest + React Testing Library.
- **Frontend novas**: nenhuma. Reconstrução da árvore de categorias em memória é `O(n)` com `Map<id, Category>`; sem libs de tree-view externas — componente próprio simples.

**Storage**: Postgres 15 (já em uso desde feature 001). Tabela nova **`Category`** (id, groupId, name, parentId nullable, normalizedName gerada, timestamps); coluna nova **`Expense.categoryId`** (nullable, FK `ON DELETE RESTRICT`); refactor estrutural na **`IdempotencyKey`** existente (renomeia `expenseId` → `resourceId`, adiciona enum `resourceType`, descarta FK direta para Expense em favor de id solto + cleanup). Migração única `007_expense_categories` cobre todas as três mudanças em uma transação Prisma.

**Testing**:

- Backend: Jest + Supertest — testes unitários por use case (`backend/tests/application/category/`) e testes de contrato HTTP (`backend/tests/api/category/`); cobertura adicional nos testes de expense que precisam validar `categoryId` no body e a denormalização de `category`/`subCategory` na resposta.
- Frontend: Jest + React Testing Library (jsdom) — componentes (CategoriesPage, CategoryTree, CategoryFormModal, DeleteCategoryModal nas duas variantes), hooks de mutação otimista, e atualização nos testes de ExpenseFormModal para cobrir os novos seletores e o estado vazio (FR-025).

**Target Platform**: Backend roda em Node.js 20 LTS (Linux/macOS); frontend roda em navegadores modernos (Chrome 115+, Firefox 120+, Safari 17+). Inalterado.

**Project Type**: Web monorepo (npm workspaces) com `backend/` e `frontend/`, estrutura estabelecida pela feature 001 e estendida pelas features 004/005/006.

**Performance Goals**:

- SC-006: até 50 categorias por grupo carregadas em ≤ 1 s na tela `/categorias` e no formulário de despesa.
- SC-001: criação inicial da árvore (~5–10 raízes + 10–20 sub-cats) em < 5 min de uso da tela.
- Listagem de despesa com duplo `LEFT JOIN` (categoria direta + raiz pai) DEVE manter SC-006 da feature 006 (500 despesas ≤ 2 s) — o JOIN encadeado tem custo desprezível sob o índice `(parentId)` que será criado.
- DELETE preview p95 < 100 ms (duas `COUNT(*)` simples sob índices `(parentId)` e `(categoryId)`).

**Constraints**:

- WCAG 2.1 AA herdado da feature 005 — modais de categoria seguem o mesmo padrão de focus trap, ESC, e Tab order já estabelecido.
- PT-BR exclusivamente — labels, mensagens, toasts, ordering alfabético via collation `pt-BR-x-icu`.
- Categoria opcional na despesa: mantida (FR-008); nada quebra o comportamento já mergeado da feature 006.
- `Expense.categoryId` é a **única** FK para Category; backend resolve hierarquia em runtime via JOIN (FR-026); frontend NUNCA inspeciona o ID direto para decidir o que renderizar (consome `category`/`subCategory` denormalizados da resposta).
- Toda resposta de erro segue o envelope flat `{ code, message, fieldErrors? }` da feature 004/006 — superset, zero breakage.

**Scale/Scope**: Família com 2–10 membros e ~5–50 categorias no longo prazo (SC-006); ~100–500 despesas no primeiro ano, ~5 000 no longo prazo. JOIN encadeado de duas categorias por linha é desprezível mesmo com 5 000 expenses paginadas em pedaços de 50.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Princípio | Status | Notas |
|-----------|--------|-------|
| **I. API-First** | PASS | OpenAPI contract em `contracts/openapi.yaml` definido no Phase 1 ANTES de qualquer código. Cobre os 5 novos endpoints de categoria (`POST/GET/GET:id/PATCH/DELETE` + `GET :id/delete-preview`) e a evolução de 5 endpoints de despesa (denormalização `{ category, subCategory }` na resposta + `categoryId` opcional no body). Envelope de erro com `fieldErrors`, `Idempotency-Key` no POST, `warnings: ["category.removed_concurrently"]` na resposta de despesa quando aplicável. |
| **II. Test-First (NON-NEGOTIABLE)** | APPLIES | TDD obrigatório. Ordem: (1) testes Jest+Supertest do contrato HTTP por endpoint **falhando** → (2) implementação até passar → (3) testes RTL de componente/hook falhando → (4) implementação. Cobertura crítica: validação Zod por campo, profundidade máxima de 2 (parentId deve apontar para raiz), unicidade case-insensitive sob race (POSTs concorrentes com o mesmo nome), FK RESTRICT no DELETE, derivação correta de `category`/`subCategory` na denormalização (Casos A/B/C de FR-026), warning de `category.removed_concurrently` quando FK viola em expense INSERT/UPDATE. |
| **III. Security & Data Integrity** | PASS | Auth obrigatória em todos os endpoints novos via `auth.middleware.ts` existente; `requireMembership` (já entregue na feature 006) injeta `res.locals.groupId` e bloqueia 401/403. Scoping garantido: queries SQL sempre filtram por `groupId = res.locals.groupId`; toda resposta 404 quando o `:id` não pertence ao grupo, indistinguível de "não existe". Unicidade enforçada **no banco** (FR-028) — TOCTOU-safe sob concorrência. FK `ON DELETE RESTRICT` impede despesa órfã. Sem PII em logs. Sem novos endpoints públicos. |
| **IV. Simplicity** | PASS | Reuso integral da arquitetura em camadas (`api/application/domain/middleware`). Sem novas bibliotecas. Sem state management global no frontend — `useState` + custom hook por mutação, padrão idêntico à feature 006. Sem coluna `subCategoryId` em Expense — single-column design (Q5) elimina classe inteira de bugs sem adicionar complexidade. Sem trigger PL/pgSQL — todo enforcement via FK + generated column + unique index, primitivas declarativas do schema. |
| **V. Observability** | PASS | `AppError` herdado da feature 004/006 com `code` machine-readable; estende com novos códigos (`category.duplicate_name`, `category.has_dependencies`, `category.parent_not_root`, etc.). Logs estruturados JSON via middleware existente; endpoints sensíveis (POST/PATCH/DELETE de categoria) logam `userId`, `groupId`, `categoryId`, `action`, `outcome`. Sem nomes de categoria em texto claro em logs (apesar de não serem dados financeiros sensíveis, mantemos a postura coerente da feature 006). |

**Gate result: PASS** — Phase 0 pode iniciar.

## Project Structure

### Documentation (this feature)

```text
specs/007-expense-categories/
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
│   ├── schema.prisma                              # MODIFICADO — adiciona Category; campo Expense.categoryId; refactor IdempotencyKey (resourceType + resourceId)
│   └── migrations/
│       └── <timestamp>_007_expense_categories/
│           └── migration.sql                       # CREATE TABLE Category + generated col + unique partial indexes; ALTER TABLE Expense ADD categoryId; refactor IdempotencyKey (rename + drop FK + add enum)
└── src/
    ├── api/
    │   ├── category/
    │   │   ├── category.router.ts                  # 5 rotas REST sob /api/v1/categories + /:id/delete-preview
    │   │   └── category.validators.ts              # Zod schemas (create, update, list)
    │   └── expense/
    │       ├── expense.router.ts                   # MODIFICADO — endpoints existentes ganham resposta denormalizada
    │       └── expense.validators.ts               # MODIFICADO — body aceita categoryId opcional (UUID ou null)
    ├── application/
    │   ├── category/
    │   │   ├── create-category.use-case.ts         # POST (idempotency reusada do polimorfismo)
    │   │   ├── list-categories.use-case.ts         # GET flat list
    │   │   ├── update-category.use-case.ts         # PATCH full-body (rename + move)
    │   │   ├── delete-category.use-case.ts         # DELETE com captura de P2003 → 409
    │   │   └── preview-delete-category.use-case.ts # GET /:id/delete-preview
    │   └── expense/
    │       ├── create-expense.use-case.ts          # MODIFICADO — body categoryId; FK violation → warning + null
    │       ├── update-expense.use-case.ts          # MODIFICADO — idem
    │       ├── list-expenses.use-case.ts           # MODIFICADO — duplo LEFT JOIN para category + root
    │       └── get-expense.use-case.ts             # MODIFICADO — mesmo JOIN
    ├── domain/
    │   ├── category/
    │   │   └── category.repository.ts              # Prisma queries (list, create, patch, delete, preview, by-id)
    │   └── expense/
    │       └── expense.repository.ts               # MODIFICADO — query JOIN
    ├── middleware/
    │   ├── auth.middleware.ts                      # (sem mudanças)
    │   └── require-membership.middleware.ts        # (sem mudanças)
    └── infra/
        └── prisma.ts                               # (sem mudanças)

backend/tests/
├── api/
│   ├── category/
│   │   ├── create-category.contract.test.ts       # Supertest — POST + Idempotency-Key + 422 fieldErrors
│   │   ├── list-categories.contract.test.ts       # Supertest — GET flat, ordering pt-BR
│   │   ├── update-category.contract.test.ts       # Supertest — PATCH rename + move + role_immutable
│   │   ├── delete-category.contract.test.ts       # Supertest — 204 vs 409 with blockers; cross-group 404
│   │   └── preview-delete.contract.test.ts        # Supertest — counts
│   └── expense/
│       ├── create-expense.contract.test.ts        # MODIFICADO — categoryId no body; resposta denormalizada
│       ├── list-expenses.contract.test.ts         # MODIFICADO — paginação ainda estável; resposta denormalizada
│       ├── update-expense.contract.test.ts        # MODIFICADO — idem
│       ├── get-expense.contract.test.ts           # MODIFICADO — denormalizada
│       └── concurrent-category-removal.test.ts    # NOVO — race POST/PATCH expense × DELETE category → warning
└── application/
    ├── category/
    │   ├── create-category.use-case.test.ts       # Zod, unicidade DB (P2002 catch), idempotency replay, parent root validation
    │   ├── list-categories.use-case.test.ts       # Group scoping, ordering
    │   ├── update-category.use-case.test.ts       # Role immutable, parent_not_root, parent same group, rename normalized
    │   ├── delete-category.use-case.test.ts       # 204 sem deps, 409 com sub/com despesa, mensagem correta
    │   └── preview-delete-category.use-case.test.ts # Counts corretos para root vs sub
    └── expense/
        ├── create-expense.use-case.test.ts        # MODIFICADO — categoryId set, fk violation → null + warning
        ├── update-expense.use-case.test.ts        # MODIFICADO — idem
        └── list-expenses.use-case.test.ts         # MODIFICADO — JOIN entrega category + subCategory corretos (3 casos)

frontend/src/
├── pages/
│   └── CategoriesPage.tsx                          # NOVO — árvore + botão "+ Nova" + modal
├── components/
│   ├── category/
│   │   ├── CategoryTree.tsx                        # Render árvore agrupada por raiz, alfabética
│   │   ├── CategoryRow.tsx                         # Linha (nome + ícones editar/excluir)
│   │   ├── CategoryFormModal.tsx                   # Criar/editar — seletor de "Categoria pai" condicional
│   │   └── DeleteCategoryModal.tsx                 # Duas variantes (destrutiva padrão / bloqueante)
│   └── expense/
│       ├── ExpenseFormModal.tsx                    # MODIFICADO — adiciona RootCategoryPicker + SubCategoryPicker + hint FR-025
│       └── ExpenseListItem.tsx                     # MODIFICADO — renderiza etiqueta "<raiz> · <sub>"
├── services/
│   ├── category.service.ts                         # NOVO — fetch wrappers
│   └── expense.service.ts                          # MODIFICADO — types: response shape + categoryId no body
├── hooks/
│   ├── useCategoriesList.ts                        # NOVO — GET + cache local + invalidate em mutações
│   ├── useCreateCategory.ts                        # NOVO — POST + Idempotency-Key + optimistic
│   ├── useUpdateCategory.ts                        # NOVO — PATCH + optimistic
│   ├── useDeleteCategory.ts                        # NOVO — DELETE + handle 409 vs 204 + optimistic
│   ├── useDeletePreview.ts                         # NOVO — GET delete-preview pré-modal
│   ├── useCreateExpense.ts                         # MODIFICADO — envia categoryId
│   ├── useUpdateExpense.ts                         # MODIFICADO — envia categoryId
│   └── useExpensesList.ts                          # MODIFICADO — types da resposta
├── config/
│   └── navigation.ts                               # MODIFICADO — Categorias: status `active`
├── router/
│   └── AppRouter.tsx                               # MODIFICADO — rota /categorias adicionada
└── types/
    └── category.ts                                 # NOVO — Category, CategoryFormPayload, DeletePreview

frontend/tests/unit/
├── components/category/
│   ├── CategoriesPage.test.tsx                     # Empty state, tree render, abre modal
│   ├── CategoryFormModal.test.tsx                  # Validação inline, foco, ESC, submit, parent picker condicional
│   └── DeleteCategoryModal.test.tsx                # Variante destrutiva vs bloqueante
├── hooks/
│   ├── useCreateCategory.test.ts                   # Optimistic + rollback + 422 duplicate_name
│   ├── useUpdateCategory.test.ts                   # Move + rename + role_immutable
│   ├── useDeleteCategory.test.ts                   # 204 path + 409 path
│   └── useDeletePreview.test.ts                    # Counts retornados corretamente
└── components/expense/
    ├── ExpenseFormModal.test.tsx                   # MODIFICADO — pickers + estado vazio FR-025
    └── ExpenseListItem.test.tsx                    # MODIFICADO — etiqueta com 3 casos (raiz só / raiz+sub / sem)
```

**Structure Decision**: Mantém o monorepo backend + frontend estabelecido na feature 001 e expandido nas features 004/005/006. Esta feature **adiciona** as pastas `backend/src/{api,application,domain}/category/`, a página `frontend/src/pages/CategoriesPage.tsx`, os componentes em `frontend/src/components/category/` e os hooks em `frontend/src/hooks/`. **Modifica** seletivamente arquivos de expense (router/validators/use-cases/repository/componente/hook) para suportar `categoryId` no body e a denormalização na resposta. **Modifica** `prisma/schema.prisma`, `frontend/src/config/navigation.ts` (`coming-soon` → `active`) e `frontend/src/router/AppRouter.tsx`. Nenhuma pasta existente é renomeada ou removida.

## Complexity Tracking

| Decisão Estrutural | Por que necessária | Alternativa Simples Rejeitada Porque |
|---|---|---|
| Refactor estrutural na `IdempotencyKey` (rename `expenseId` → `resourceId`, drop FK direta a Expense, adicionar enum `resourceType`) | FR-015 mandato explícito: **mesma tabela de idempotência** que feature 006. POST de categoria precisa do mesmo dedupe matrix (replay 200, conflito de chave 409). | Criar tabela `CategoryIdempotencyKey` paralela duplicaria schema, cleanup job, e regra de TTL — viola Simplicidade por proliferação. Manter `expenseId` típico + adicionar `categoryId` nullable obrigaria CHECK de exclusividade e quebraria o modelo polimórfico que outras features (08+ orçamentos) reaproveitam. |
| Duplo `LEFT JOIN` na query de listagem de despesa (categoria direta + raiz pai) | FR-026 mandato explícito de denormalização server-side para evitar N+1 e join client-side. FR-019 garante que rename auto-reflete na próxima resposta. | Sidecar dictionary (`included.categories`) ou fetch separado de categorias no frontend foi explicitamente rejeitado em Q1 da sessão backend — adicionaria orquestração de cache no frontend. |
| Coluna gerada `normalizedName` + dois índices únicos parciais (`WHERE parentId IS NULL` e `WHERE parentId IS NOT NULL`) | Postgres trata NULL como distinto em unique constraints — sem índice parcial duas raízes do mesmo grupo poderiam ter o mesmo nome normalizado. FR-005 + FR-028 exigem unicidade enforcada no banco como única autoridade (race-safe). | App-layer check antes do insert foi explicitamente rejeitado em Q4 (TOCTOU sob concorrência). Trigger PL/pgSQL adicionaria código procedural — primitivas declarativas (generated column + partial unique index) são mais simples e auditáveis. |

> Nenhuma das três entradas acima é uma violação real do constitution; cada uma é uma escolha estrutural justificada explicitamente por decisão da sessão de clarification. A tabela existe para documentar que essas escolhas foram conscientes e não acidentais.
