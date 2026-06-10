---

description: "Task list for feature 008 — Gestão de Orçamentos"
---

# Tasks: Gestão de Orçamentos

**Input**: Design documents in `specs/008-budget-management/`

**Prerequisites**: plan.md ✅ | spec.md ✅ | research.md ✅ | data-model.md ✅ | contracts/openapi.yaml ✅ | quickstart.md ✅

**Tests**: Incluídos — Constitution Principle II (Test-First) é NON-NEGOTIABLE. Cada use case, endpoint e componente tem teste vermelho antes da implementação (contrato HTTP Jest+Supertest → implementação → RTL → implementação).

**Organization**: Tarefas agrupadas por User Story para entrega incremental e testagem independente. US1 e US2 são P1; US1 (orçamento da família) é o MVP — entrega o ciclo GET/PUT ponta-a-ponta. Cada fase de story estende o mesmo trio de endpoints agregados (`GET`/`PUT /api/v1/budgets`, `POST /api/v1/budgets/copy`) com mais um alvo, mantendo cada fatia testável isoladamente.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Pode rodar em paralelo (arquivos diferentes, sem dependências incompletas)
- **[Story]**: User story correspondente (US1, US2, US3, US4)
- Caminhos de arquivo exatos incluídos em todas as descrições

---

## Phase 1: Setup (Schema + Migration)

**Purpose**: Adicionar o modelo `Budget` e os dois enums ao schema, gerar e editar a migration aditiva (índices únicos parciais + FKs `ON DELETE CASCADE`), aplicar e regenerar o Prisma client.

- [ ] T001 Editar `backend/prisma/schema.prisma`: adicionar `enum BudgetTargetType { FAMILY MEMBER CATEGORY }` e `enum BudgetLimitType { ABSOLUTE PERCENT }`; adicionar `model Budget` (id uuid, groupId, month `DateTime @db.Date`, targetType, targetMemberId?, targetCategoryId?, limitType, amountCents Int?, percent Int?, createdAt/updatedAt, `@@index([groupId, month], map: "budget_group_month_idx")`) com relações `group FamilyGroup @relation(onDelete: Cascade)`, `targetMember User? @relation("MemberBudget", onDelete: Cascade)`, `targetCategory Category? @relation(onDelete: Cascade)`; adicionar as relações inversas `budgets Budget[]` em `FamilyGroup`, `memberBudgets Budget[] @relation("MemberBudget")` em `User` e `budgets Budget[]` em `Category`. Conforme `data-model.md §Esboço Prisma`. **Não** estender o enum `ResourceType` (copy é naturalmente idempotente).

- [ ] T002 Gerar a migration baseline: `cd backend && npx prisma migrate dev --create-only --name 008_budget_management`. Confirmar que cria `backend/prisma/migrations/<timestamp>_008_budget_management/migration.sql` com `CREATE TYPE "BudgetTargetType"`, `CREATE TYPE "BudgetLimitType"`, `CREATE TABLE "Budget"` (com FKs) e o índice `budget_group_month_idx`.

- [ ] T003 Editar à mão `backend/prisma/migrations/<timestamp>_008_budget_management/migration.sql` para incluir os 3 índices ÚNICOS PARCIAIS que Prisma não infere, conforme `data-model.md §Índices`: `CREATE UNIQUE INDEX budget_family_uq ON "Budget"("groupId","month") WHERE "targetType"='FAMILY'`; `CREATE UNIQUE INDEX budget_member_uq ON "Budget"("groupId","month","targetMemberId") WHERE "targetType"='MEMBER'`; `CREATE UNIQUE INDEX budget_category_uq ON "Budget"("groupId","month","targetCategoryId") WHERE "targetType"='CATEGORY'`. Garantir que as 3 FKs estão como `ON DELETE CASCADE` (group, targetMember, targetCategory).

- [ ] T004 Aplicar a migration: `cd backend && npx prisma migrate dev`. Verificar via `psql`: `\d "Budget"` mostra colunas e FKs CASCADE; os 3 índices parciais existem (`\d budget_family_uq`, `\d budget_member_uq`, `\d budget_category_uq`) com suas cláusulas `WHERE`.

- [ ] T005 Regenerar Prisma client: `cd backend && npx prisma generate`. Confirmar que `PrismaClient` expõe `budget` (model) e os enums `BudgetTargetType`/`BudgetLimitType`, e que o backend compila sem erros.

**Checkpoint Phase 1**: Tabela `Budget`, índices parciais e Prisma client prontos.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Esqueleto compartilhado dos endpoints agregados (validators, resolver core, repositório, serializer base, router com auth+membership, registro no app) e o shell do frontend (service, types, página, rota). Sem isso nenhuma story pode rodar ponta-a-ponta.

**⚠️ CRITICAL**: Nenhuma fase de user story começa até esta fase terminar.

- [ ] T006 [P] Adicionar `BudgetErrorCode` (`budget.invalid_month`, `budget.target_not_found`, `budget.invalid_percent`) ao módulo de erros em `backend/src/api/errors.ts`, seguindo o padrão de `CategoryErrorCode`.

- [ ] T007 [P] Criar `backend/src/api/budget/budget.validators.ts`: Zod `monthQuery` (regex `^\d{4}-(0[1-9]|1[0-2])$` + checagem de mês válido reutilizando o padrão `isValidCalendarDate` de `expense.validators.ts`); `limitInput` (discriminado por `limitType`: ABSOLUTE ⇒ `amountCents` int 1..2_000_000_000; PERCENT ⇒ `percent` int positivo, **sem decimais**, mensagem PT-BR); schemas de corpo `upsertMonthBudgetBody` e `copyMonthBudgetBody`; reusar `zodErrorToFieldErrors`.

- [ ] T008 [P] Criar `backend/src/application/budget/budget-resolver.ts` (módulo puro): helper `resolvePercent(percent, baseCents) = Math.round((percent*baseCents)/100)` (half-up, FR-021); passthrough ABSOLUTE; tipos `ResolvedLimit`/`MonthPicture`. Apenas a base matemática + ABSOLUTE neste momento; ramos MEMBER/CATEGORY/warnings entram nas stories.

- [ ] T009 Criar `backend/src/domain/budget/budget.repository.ts` (Prisma): `findByGroupMonth(groupId, monthDate)`, `bulkUpsert(rows[])`, `bulkDelete(keys[])`; normalização `YYYY-MM` → `DATE` 1º dia (UTC). Inclui helper `monthStringToDate`/`dateToMonthString`.

- [ ] T010 Criar `backend/src/api/budget/budget.serializer.ts`: builder do envelope agregado (`month`, `family`, `members[]`, `categories[]`, `summary`, `warnings`) a partir da saída do resolver — esqueleto que já monta `family` e arrays vazios; ramos de membros/categorias/summary/warnings preenchidos nas stories.

- [ ] T011 Criar `backend/src/api/budget/budget.router.ts`: `Router()` + `authMiddleware` + `requireMembership` em todas as rotas; rotas `GET /` e `PUT /` chamando os use cases (a serem criados nas stories); helper `logMutation` (JSON estruturado, sem valores monetários em claro — Princípio V) e `sendAppError` mapeando `AppError` → envelope, seguindo `category.router.ts`.

- [ ] T012 Registrar o router em `backend/src/app.ts`: `app.use('/api/v1/budgets', budgetRouter)` (importar de `./api/budget/budget.router`).

- [ ] T013 [P] Criar `frontend/src/types/budget.ts` (tipos do envelope: `ResolvedLimit`, `MemberBudget`, `CategoryBudget`, `AllocationSummary`, `Warning`, `MonthBudget`) e `frontend/src/services/budget.service.ts` (`getMonth(month)`, `saveMonth(month, body)`, `copyPrevious(fromMonth, toMonth)`), seguindo `category.service.ts`.

- [ ] T014 [P] Criar `frontend/src/hooks/useMonthBudget.ts` (GET) e `frontend/src/hooks/useSaveMonthBudget.ts` (PUT otimista), seguindo o padrão de `useCategoriesList`/`useCreateCategory`.

- [ ] T015 Criar `frontend/src/pages/BudgetsPage.tsx` (shell: default mês corrente, usa `useMonthBudget`, renderiza placeholders das três seções) e ativar a rota em `frontend/src/router/AppRouter.tsx` — substituir o `<div className="p-8 text-gray-500">Em breve</div>` da rota `/orcamentos` por `<BudgetsPage/>`.

**Checkpoint Phase 2**: GET/PUT respondem (ainda sem ramos de membro/categoria) e a página `/orcamentos` carrega.

---

## Phase 3: User Story 1 — Orçamento da Família (Priority: P1) 🎯 MVP

**Goal**: Definir/editar/limpar o orçamento global da família para um mês (valor absoluto, base dos percentuais).

**Independent Test**: Definir família = R$ 5.000,00 no mês corrente, salvar, reabrir e ver o valor persistido; limpar (zero) e ver "não definido".

- [ ] T016 [P] [US1] Teste de contrato em `backend/tests/api/budget/family.test.ts`: `GET /api/v1/budgets?month=2026-06` → 200 com `family:null` quando vazio; 400 `budget.invalid_month`; 401 sem sessão; 403 sem grupo; `PUT` define `family ABSOLUTE` e retorna `resolvedCents`; `PUT family:null` remove (FR-008).

- [ ] T017 [P] [US1] Teste unitário em `backend/tests/application/budget/resolver-family.test.ts`: família ABSOLUTE resolve para o próprio `amountCents`; ausência ⇒ `family:null`.

- [ ] T018 [P] [US1] Teste de componente em `frontend/src/components/budget/FamilyBudgetSection.test.tsx`: renderiza campo, máscara R$, dispara save, mostra estado "não definido" quando vazio.

- [ ] T019 [US1] Implementar `backend/src/application/budget/get-month-budget.use-case.ts` (ramo família): lê `Budget` do grupo/mês via repositório, monta a família resolvida.

- [ ] T020 [US1] Implementar `backend/src/application/budget/upsert-month-budget.use-case.ts` (ramo família): valida `family` sempre ABSOLUTE; valor>0 ⇒ upsert; zero/null ⇒ delete (FR-008); transação Prisma.

- [ ] T021 [US1] Preencher o ramo `family` em `backend/src/api/budget/budget.serializer.ts` (valor bruto + `resolvedCents`).

- [ ] T022 [P] [US1] Criar `frontend/src/components/budget/FamilyBudgetSection.tsx` (input de valor absoluto em R$).

- [ ] T023 [US1] Integrar `FamilyBudgetSection` no `BudgetsPage.tsx` ligado a `useSaveMonthBudget`; toasts PT-BR de sucesso/erro.

**Checkpoint US1 (MVP)**: orçamento da família totalmente funcional ponta-a-ponta.

---

## Phase 4: User Story 2 — Orçamentos por Membro (Priority: P1)

**Goal**: Definir teto por membro em valor absoluto OU percentual do orçamento da família; independentes entre si e da família (FR-007).

**Independent Test**: Com família = R$ 5.000, definir membro A = 30% (resolve R$ 1.500) e membro B = R$ 1.500; somar > família não bloqueia; sem família, percentual fica "não resolvível".

- [ ] T024 [P] [US2] Teste de contrato em `backend/tests/api/budget/members.test.ts`: `PUT` membro ABSOLUTE e PERCENT; resolução do percentual sobre a família; `family` ausente ⇒ `resolvedCents:null`; `memberId` de outro grupo ⇒ 404 `budget.target_not_found`; soma de membros > família NÃO gera warning (FR-007).

- [ ] T025 [P] [US2] Teste unitário em `backend/tests/application/budget/resolver-member.test.ts`: percentual de membro sobre família (incl. half-up); `null` quando família indefinida; ABSOLUTE passthrough.

- [ ] T026 [P] [US2] Teste de componente em `frontend/src/components/budget/MemberBudgetList.test.tsx`: linha por membro, toggle valor/percentual, exibição do valor resolvido e do estado "não resolvível".

- [ ] T027 [US2] Estender `budget-resolver.ts`: ramo MEMBER (ABSOLUTE passthrough; PERCENT = `resolvePercent(percent, familyAmountCents)`; `null` se família indefinida).

- [ ] T028 [US2] Estender `get-month-budget.use-case.ts`: listar membros ATUAIS do grupo (filtrar ex-membros) e anexar seus orçamentos resolvidos.

- [ ] T029 [US2] Estender `upsert-month-budget.use-case.ts`: ramo MEMBER — validar que `memberId` pertence ao grupo (senão `budget.target_not_found`); zero/null ⇒ delete.

- [ ] T030 [US2] Preencher o ramo `members[]` em `budget.serializer.ts` (memberId, name, budget resolvido|null).

- [ ] T031 [P] [US2] Criar `frontend/src/components/budget/MemberBudgetList.tsx` (linha por membro com toggle valor/percentual e badge do valor resolvido).

- [ ] T032 [US2] Integrar `MemberBudgetList` no `BudgetsPage.tsx`.

**Checkpoint US2**: família + membros (valor/percentual) funcionais; independência preservada.

---

## Phase 5: User Story 3 — Orçamentos por Categoria (Priority: P2)

**Goal**: Tetos por categoria raiz (valor ou % da família) e sub-categoria (valor ou % da raiz pai), com aviso consultivo de excedente e barra de saldo em tempo real.

**Independent Test**: Família R$ 5.000; "Pagar Contas" = 40% (R$ 2.000); uma raiz em valor; uma sub em % da raiz; forçar excedente (raízes > 100%) → aviso consultivo aparece e salva; rejeitar percentual com decimal.

- [ ] T033 [P] [US3] Teste de contrato em `backend/tests/api/budget/categories.test.ts`: `PUT` raiz/sub ABSOLUTE e PERCENT; resolução raiz sobre família e sub sobre raiz resolvida; warnings `category.allocation_exceeds_family` (soma > família **e** Σ% raiz > 100) e `subcategory.exceeds_root`; percentual com decimal ⇒ 400 `budget.invalid_percent`; `categoryId` cross-group ⇒ 404.

- [ ] T034 [P] [US3] Teste unitário em `backend/tests/application/budget/resolver-category.test.ts`: raiz % sobre família; sub % sobre raiz resolvida; cascata `null` (raiz não resolvível ⇒ sub `null`); cálculo dos dois warnings; soma exatamente 100% / igual à família ⇒ sem warning.

- [ ] T035 [P] [US3] Teste de componente em `frontend/src/components/budget/CategoryBudgetTree.test.tsx` e `AllocationSummaryBar.test.tsx`: árvore raiz+sub, toggle por linha, saldo alocado/restante em tempo real (FR-023).

- [ ] T036 [US3] Estender `budget-resolver.ts`: ramo CATEGORY (raiz PERCENT sobre família; sub PERCENT sobre raiz resolvida; `null` em cascata) e cálculo dos warnings `category.allocation_exceeds_family` + `subcategory.exceeds_root`.

- [ ] T037 [US3] Estender `get-month-budget.use-case.ts`: carregar categorias do grupo (raízes + subs, ordem alfabética pt-BR), resolver, e computar `summary` (totalAllocatedCents = Σ raízes) + `warnings`.

- [ ] T038 [US3] Estender `upsert-month-budget.use-case.ts`: ramo CATEGORY — validar que `categoryId` pertence ao grupo; zero/null ⇒ delete (a remoção em massa por exclusão de categoria é coberta pela FK CASCADE, sem código).

- [ ] T039 [US3] Preencher os ramos `categories[]`, `summary` e `warnings` em `budget.serializer.ts`.

- [ ] T040 [P] [US3] Criar `frontend/src/components/budget/CategoryBudgetTree.tsx` (raiz expansível + subs; toggle valor/percentual por linha).

- [ ] T041 [P] [US3] Criar `frontend/src/components/budget/AllocationSummaryBar.tsx` (saldo alocado/restante em tempo real; espelha a fórmula do resolver no cliente para feedback imediato; warnings autoritativos vêm do PUT).

- [ ] T042 [US3] Integrar `CategoryBudgetTree` + `AllocationSummaryBar` no `BudgetsPage.tsx`; exibir aviso consultivo não-bloqueante ao salvar.

**Checkpoint US3**: três dimensões completas; valor/percentual misturáveis; avisos consultivos.

---

## Phase 6: User Story 4 — Gerir Orçamentos ao Longo dos Meses (Priority: P2)

**Goal**: Navegar entre meses, copiar o mês anterior de forma não-destrutiva, e perguntar ao registrar despesa em mês sem orçamento (FR-025).

**Independent Test**: Definir um mês completo; ir ao mês seguinte (vazio); copiar mês anterior → valores e tipos replicados; editar não afeta a origem; registrar despesa em mês sem orçamento → app pergunta; recusar mantém o mês vazio.

- [ ] T043 [P] [US4] Teste de contrato em `backend/tests/api/budget/copy.test.ts`: `POST /api/v1/budgets/copy` preenche só alvos vazios no destino (não-destrutivo, FR-014); preserva `limitType`; `copiedCount` correto; `fromMonth` vazio ⇒ `copiedCount:0`; retry não duplica (naturalmente idempotente).

- [ ] T044 [P] [US4] Teste unitário em `backend/tests/application/budget/copy-previous-month.test.ts`: cálculo do mês anterior (virada de ano), fill-only-blanks, contagem.

- [ ] T045 [P] [US4] Teste de componente em `frontend`: `MonthSelector.test.tsx` (navegação prev/next), `CopyPreviousMonthDialog.test.tsx` (confirmar/recusar) e `useBudgetCopyPrompt.test.ts` (prompt após criar despesa em mês sem orçamento; recusa não bloqueia).

- [ ] T046 [US4] Estender `backend/src/domain/budget/budget.repository.ts`: `copyInto(groupId, fromMonth, toMonth)` — insere apenas alvos sem linha no destino (não-destrutivo) e retorna a contagem.

- [ ] T047 [US4] Criar `backend/src/application/budget/copy-previous-month.use-case.ts`: resolve `toMonth` → mês anterior, chama `copyInto`, devolve o retrato do destino + `copiedCount`.

- [ ] T048 [US4] Adicionar a rota `POST /copy` em `backend/src/api/budget/budget.router.ts` (valida `copyMonthBudgetBody`, chama o use case, loga a mutação). Header `Idempotency-Key` aceito mas não persistido (idempotência natural).

- [ ] T049 [P] [US4] Criar `frontend/src/hooks/useCopyPreviousMonth.ts` (POST /copy).

- [ ] T050 [P] [US4] Criar `frontend/src/components/budget/MonthSelector.tsx` (navegação para qualquer mês passado/futuro) e elevar o estado de mês no `BudgetsPage.tsx` (FR-013).

- [ ] T051 [P] [US4] Criar `frontend/src/components/budget/CopyPreviousMonthDialog.tsx` (confirmação com focus trap/ESC — WCAG, herdado da feature 005).

- [ ] T052 [US4] Criar `frontend/src/hooks/useBudgetCopyPrompt.ts` e integrá-lo ao fluxo de criação de despesa (`frontend/src/hooks/useCreateExpense.ts` / modal de despesa): após salvar uma despesa, se o mês dela não tem orçamento e o mês anterior tem, abrir `CopyPreviousMonthDialog`; confirmar ⇒ `useCopyPreviousMonth`; recusar ⇒ nada (FR-025, nunca bloqueia o registro).

**Checkpoint US4**: navegação entre meses, cópia não-destrutiva e prompt FR-025 funcionais.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Observabilidade, acessibilidade, performance e validação final.

- [ ] T053 [P] Garantir logs estruturados JSON nas mutações (`PUT`, `POST /copy`) com `userId`, `groupId`, `month`, `action`, `outcome` — sem valores monetários em claro (Princípio V) em `backend/src/api/budget/budget.router.ts`.

- [ ] T054 [P] Revisão de acessibilidade WCAG 2.1 AA dos componentes de orçamento (focus trap/ESC/tab order no `CopyPreviousMonthDialog`, labels dos toggles e inputs) — `frontend/src/components/budget/`.

- [ ] T055 [P] Teste de re-resolução (FR-024): alterar a família re-resolve percentuais de membros/raízes/subs na próxima leitura — `backend/tests/application/budget/resolver-reresolution.test.ts`.

- [ ] T056 [P] Validação de performance SC-003: `GET /budgets?month` com 50 categorias + 10 membros responde ≤ 1 s (uma query + resolução O(n)) — anotar no `quickstart.md` ou teste de carga leve.

- [ ] T057 Smoke test manual ponta-a-ponta seguindo `specs/008-budget-management/quickstart.md §Validação manual` (passos 1–7) e marcar os critérios SC-001..SC-009.

---

## Dependencies & Execution Order

```
Phase 1 (Setup: T001–T005)
  └─▶ Phase 2 (Foundational: T006–T015)   ← BLOQUEIA todas as stories
        ├─▶ Phase 3 US1 Família  (T016–T023)  🎯 MVP
        │     └─▶ Phase 4 US2 Membros (T024–T032)   [precisa da família como base]
        │           └─▶ Phase 5 US3 Categorias (T033–T042)
        │                 └─▶ Phase 6 US4 Meses/Cópia (T043–T052)
        └─────────────────────────────────────▶ Phase 7 Polish (T053–T057)
```

- **US2 depende de US1** (resolução de percentual de membro usa o valor da família).
- **US3 depende de US1** (percentual de raiz usa a família) e reusa o resolver estendido em US2.
- **US4 depende de US1–US3** (a cópia replica todos os alvos; o prompt FR-025 assume o ciclo completo).
- Dentro de cada story, os testes `[P]` rodam antes da implementação (TDD).

## Parallel Execution Examples

- **Foundational**: T006, T007, T008, T013, T014 podem rodar em paralelo (arquivos distintos); T009/T010/T011 dependem de T007/T008; T012/T015 fecham a fase.
- **US1**: T016, T017, T018 (testes) em paralelo → T019→T020→T021 (backend, mesmo módulo) → T022 [P] (frontend) → T023.
- **US3**: T033, T034, T035 (testes) em paralelo; T040 e T041 (componentes distintos) em paralelo após o backend.
- **Polish**: T053, T054, T055, T056 todos `[P]`.

## Implementation Strategy

1. **MVP = US1** (Phases 1+2+3): orçamento da família ponta-a-ponta — já entrega valor (definir e revisar o teto mensal).
2. **Incremento P1** = + US2 (membros) — completa as duas dimensões P1 do produto.
3. **Incremento P2** = + US3 (categorias/percentuais) e + US4 (meses/cópia/FR-025).
4. **Fechamento** = Phase 7 (observabilidade, a11y, performance, smoke).

**Total**: 57 tasks — Setup 5 · Foundational 10 · US1 8 · US2 9 · US3 10 · US4 10 · Polish 5.
