# Tasks: Dashboard de Orçamentos e Despesas

**Input**: Design documents from `/specs/009-budget-dashboard/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/openapi.yaml, quickstart.md

**Tests**: INCLUÍDOS — TDD é obrigatório pela Constituição (Princípio II, NON-NEGOTIABLE). Cada grupo de testes deve ser escrito antes e **falhar** antes da implementação correspondente.

**Organization**: Tarefas agrupadas por user story para permitir implementação e teste independentes. A feature é um read-model puro: **zero migrações, zero dependências novas** — não há fase de banco de dados.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Pode rodar em paralelo (arquivos diferentes, sem dependência de tarefa incompleta)
- **[Story]**: User story da tarefa (US1–US4)
- Caminhos exatos nos textos das tarefas

## Path Conventions

Web monorepo (npm workspaces): `backend/src/`, `backend/tests/`, `frontend/src/` — estrutura das features 001/004–008, conforme plan.md.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Gate de contrato exigido pela Constituição antes de qualquer tarefa Foundational.

- [X] T001 Revisar e aprovar o contrato `specs/009-budget-dashboard/contracts/openapi.yaml` (gate "Contract review" da Constituição — conferir envelope `MonthDashboard`, regras de derivação R1–R8 do research.md e os 7 invariantes do data-model.md); registrar aprovação no PR/descrição da branch

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Plumbing do endpoint e do cliente que TODAS as user stories consomem.

**⚠️ CRITICAL**: Nenhuma user story pode começar antes desta fase completa.

- [X] T002 [P] Escrever testes de contrato de plumbing **falhando** em `backend/tests/api/dashboard/dashboard-auth.test.ts`: GET `/api/v1/dashboard` → 401 sem cookie de sessão; 403 autenticado sem grupo; 400 `dashboard.invalid_month` com `fieldErrors[{field:"month"}]` para month ausente, `2026-13`, `2026-1`, `abc`
- [X] T003 [P] Criar tipos do envelope no frontend em `frontend/src/types/dashboard.ts` (`MonthDashboard`, `FamilySummary`, `MemberSpending`, `CategorySpending`, reuso do shape `ResolvedLimit` de `frontend/src/types/budget.ts`) — espelho 1:1 do contrato
- [X] T004 Adicionar `aggregateMonthSpending(groupId, month)` em `backend/src/domain/expense/expense.repository.ts`: duas queries `prisma.expense.groupBy` (`by: ['ownerMemberId']` e `by: ['categoryId']`, `_sum: { amountCents }`) na faixa de data civil `[YYYY-MM-01, primeiro dia do mês seguinte)` (research R3)
- [X] T005 Criar módulo dashboard no backend: `backend/src/api/dashboard/dashboard.validators.ts` (Zod: `month` obrigatório, regex `^\d{4}-(0[1-9]|1[0-2])$`) + `backend/src/api/dashboard/dashboard.router.ts` (GET com `auth` + `requireMembership`, resposta provisória `{ month }`) + mount `/api/v1/dashboard` em `backend/src/app.ts` — T002 deve ficar **verde**
- [X] T006 [P] Criar cliente HTTP `frontend/src/services/dashboard.service.ts` (GET `/api/v1/dashboard?month=`, mapeamento do envelope de erro flat `{ code, message, fieldErrors? }` no padrão de `frontend/src/services/budget.service.ts`)

**Checkpoint**: Endpoint montado com auth/validação e cliente pronto — user stories podem começar.

---

## Phase 3: User Story 1 - Ver o Resumo do Mês: Gasto Total vs. Orçamento da Família (Priority: P1) 🎯 MVP

**Goal**: Dashboard em `/` mostra, para o mês corrente, total gasto da família vs. orçamento da família (percentual consumido, saldo/estouro), com estados "orçamento não definido" e mês vazio.

**Independent Test**: Com orçamento da família (ex.: R$ 5.000) e despesas somando R$ 3.250 no mês corrente, abrir `/` e ver R$ 3.250 / R$ 5.000 / 65% / saldo R$ 1.750 — sem nenhuma outra seção.

### Tests for User Story 1 (escrever primeiro — devem FALHAR) ⚠️

- [X] T007 [P] [US1] Testes de contrato **falhando** em `backend/tests/api/dashboard/dashboard-family.test.ts`: `family.spentCents` soma despesas CASH_OR_DEBIT + CREDIT_CARD pela data civil da despesa (FR-002/FR-003); `family.budget` com `resolvedCents` quando definido; `budget: null` quando ausente/zero (FR-005); mês sem despesas → `spentCents: 0` sem erro (FR-016); despesa de outro grupo nunca aparece (FR-019)
- [X] T008 [P] [US1] Testes unitários **falhando** do agregador em `backend/tests/application/dashboard/dashboard-aggregator.test.ts` (parte família): total = Σ somas por membro; mês vazio → zeros; invariante 1 do data-model.md
- [X] T011 [P] [US1] Testes unitários **falhando** de `frontend/src/utils/percent.test.ts`: `consumptionPercent`/`sharePercent` com `Math.round` inteiro sobre centavos, denominador ≤ 0 → `null` (nunca ∞/NaN), > 100 permitido
- [X] T013 [P] [US1] Testes RTL **falhando** em `frontend/src/components/dashboard/FamilySummaryCard.test.tsx` (valores formatados BRL, 65%, estouro 116% + R$ excedido destacado, "orçamento não definido" com link `/orcamentos`) e `frontend/src/pages/DashboardPage.test.tsx` (loading, erro com toast/mensagem, mês vazio com estado explicativo, mês corrente identificado por extenso PT-BR)

### Implementation for User Story 1

- [X] T009 [US1] Implementar `backend/src/application/dashboard/dashboard-aggregator.ts` (função pura — parte família: `spentCents` a partir do groupBy por membro; `budget` = FAMILY do `MonthBudget` da 008) até T008 verde
- [X] T010 [US1] Implementar `backend/src/application/dashboard/get-month-dashboard.use-case.ts` (compõe `aggregateMonthSpending` + `get-month-budget.use-case` da 008 → aggregator) + `backend/src/api/dashboard/dashboard.serializer.ts`; ligar no `dashboard.router.ts` substituindo a resposta provisória — T007 verde
- [X] T012 [US1] Implementar `frontend/src/utils/percent.ts` até T011 verde
- [X] T014 [US1] Implementar `frontend/src/hooks/useMonthDashboard.ts` (loading/error/data via `dashboard.service`) + `frontend/src/components/dashboard/BudgetProgressBar.tsx` (barra acessível: percentual e valores em texto, cor apenas como reforço — WCAG AA) + `frontend/src/components/dashboard/FamilySummaryCard.tsx`
- [X] T015 [US1] Substituir o placeholder de `frontend/src/pages/DashboardPage.tsx` pela página real (mês corrente fixo nesta fase): hook + `FamilySummaryCard` + estados vazio/carregando/erro — T013 verde

**Checkpoint**: MVP funcional — US1 testável de ponta a ponta de forma independente.

---

## Phase 4: User Story 2 - Acompanhar o Gasto de Cada Membro vs. Seu Orçamento Individual (Priority: P1)

**Goal**: Seção com cada membro (gasto, limite resolvido, %, saldo), destaque de estouro, "sem orçamento definido", e ex-membros como linha inativa.

**Independent Test**: Dois membros com orçamentos R$ 2.000/R$ 1.500 e gastos R$ 1.200/R$ 1.800 → duas linhas com %, saldo e o segundo destacado por estouro.

### Tests for User Story 2 (escrever primeiro — devem FALHAR) ⚠️

- [X] T016 [P] [US2] Testes de contrato **falhando** em `backend/tests/api/dashboard/dashboard-members.test.ts`: membro ativo sem despesas → `spentCents: 0`; budget PERCENT → `resolvedCents` correto; sem budget → `null`; percentual não resolvível (família ausente) → `resolvedCents: null` (FR-007); ex-membro com despesas → presente com `isExMember: true` e `budget: null`; ex-membro sem despesas → ausente; invariante Σ `members[].spentCents` = `family.spentCents` (Clarification Q2); **consistência no grupo (FR-017/SC-004)**: autenticar um segundo membro do mesmo grupo e asserir que o `MonthDashboard` retornado é idêntico
- [X] T017 [P] [US2] Testes unitários **falhando** do agregador (membros) em `backend/tests/application/dashboard/dashboard-aggregator.test.ts` — casos Q2: merge ativos × groupBy, ex-membro, nomes preservados
- [X] T019 [P] [US2] Testes RTL **falhando** em `frontend/src/components/dashboard/MemberSpendingList.test.tsx`: linha por membro com gasto/limite/%/saldo; estouro destacado (>100% + valor excedido); "sem orçamento definido"; ex-membro renderizado como inativo ("ex-membro") sem barra de consumo

### Implementation for User Story 2

- [X] T018 [US2] Estender `dashboard-aggregator.ts` + `get-month-dashboard.use-case.ts` (lookup de membros ativos do grupo + donos de despesas do mês via `ownerMember`; `isExMember` = `familyGroupId !== groupId`, research R4) + `dashboard.serializer.ts` com `members[]` — T016/T017 verdes
- [X] T020 [US2] Implementar `frontend/src/components/dashboard/MemberSpendingList.tsx` (reusa `BudgetProgressBar`) e integrar na `frontend/src/pages/DashboardPage.tsx` — T019 verde

**Checkpoint**: US1 + US2 funcionais e independentes.

---

## Phase 5: User Story 3 - Ver a Distribuição de Gastos por Categoria com Percentuais (Priority: P2)

**Goal**: Distribuição por categoria raiz (% do total do mês, ordem decrescente), expansão para sub-categorias (% relativo à raiz), grupo "Sem categoria" e consumo vs. teto quando definido.

**Independent Test**: Despesas em 2+ raízes e uma sem categoria → cada raiz com valor e % do total, "Sem categoria" com o restante, percentuais somando ~100%.

### Tests for User Story 3 (escrever primeiro — devem FALHAR) ⚠️

- [X] T021 [P] [US3] Testes de contrato **falhando** em `backend/tests/api/dashboard/dashboard-categories.test.ts`: raiz com `spentCents = directSpentCents + Σ subs` (Clarification Q1); sub com `spentCents = directSpentCents`; `uncategorizedSpentCents` para despesas sem categoria (FR-010); categoria com teto e gasto zero presente no envelope; budget de categoria resolvido; invariante Σ raízes + uncategorized = família
- [X] T022 [P] [US3] Testes unitários **falhando** do agregador (categorias) em `backend/tests/application/dashboard/dashboard-aggregator.test.ts`: árvore 2 níveis, Q1, despesas direto na raiz + nas subs, categoria sem gasto
- [X] T024 [P] [US3] Testes RTL **falhando** em `frontend/src/components/dashboard/CategorySpendingList.test.tsx`: raízes ordenadas por participação desc (FR-009); exibe raiz com gasto > 0 OU teto definido (research R8); expansão mostra subs com % relativo à raiz (Clarification Q3) + agrupamento "lançadas na raiz" quando houver ambos os níveis (FR-011); "Sem categoria" como grupo; consumo vs. teto com destaque de estouro (FR-012); estado vazio sem divisão por zero

### Implementation for User Story 3

- [X] T023 [US3] Estender `dashboard-aggregator.ts` (merge groupBy por categoria × árvore de categorias do `MonthBudget`; `directSpentCents`/`spentCents`/`uncategorizedSpentCents`) + `dashboard.serializer.ts` com `categories[]` — T021/T022 verdes
- [X] T025 [US3] Implementar `frontend/src/components/dashboard/CategorySpendingList.tsx` (expansão acessível com `aria-expanded`, % via `utils/percent.ts`) e integrar na `frontend/src/pages/DashboardPage.tsx` — T024 verde

**Checkpoint**: As três seções do dashboard funcionais no mês corrente.

---

## Phase 6: User Story 4 - Navegar para Meses Anteriores (Priority: P2)

**Goal**: Abre no mês corrente; navegação para qualquer mês passado (todas as seções refletem o mês); sem meses futuros; "voltar ao mês atual" em uma ação.

**Independent Test**: Com dados em um mês anterior, navegar até ele (seções mudam juntas) e voltar ao corrente em um clique; botão de avançar trava no mês corrente.

### Tests for User Story 4 (escrever primeiro — devem FALHAR) ⚠️

- [X] T026 [P] [US4] Teste de contrato **falhando** em `backend/tests/api/dashboard/dashboard-months.test.ts`: despesas/orçamentos em meses distintos não vazam entre meses (FR-014); `month` ecoado; mês sem dados → totais zerados (research R6 — endpoint aceita qualquer mês válido)
- [X] T027 [P] [US4] Testes RTL **falhando** em `frontend/src/components/dashboard/DashboardMonthSelector.test.tsx`: inicia no mês corrente com label por extenso PT-BR (FR-015); botão "próximo" desabilitado no mês corrente (FR-013); "voltar ao mês atual" em uma ação; e em `frontend/src/pages/DashboardPage.test.tsx` (estender): trocar mês dispara refetch e re-renderiza as três seções

### Implementation for User Story 4

- [X] T028 [US4] Adicionar props **opcionais** `maxMonth`/ação "ir para o mês atual" ao `frontend/src/components/budget/MonthSelector.tsx` (defaults preservam o comportamento da 008 — rodar a suíte da 008 para confirmar) OU compor wrapper sem tocar no original — escolher o menor diff (research R7)
- [X] T029 [US4] Implementar `frontend/src/components/dashboard/DashboardMonthSelector.tsx` + estado de mês em `frontend/src/pages/DashboardPage.tsx` (default mês corrente local; refetch ao trocar via `useMonthDashboard`) — T026/T027 verdes

**Checkpoint**: Todas as user stories independentes e funcionais.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Observabilidade, acessibilidade, performance e validação final.

- [X] T030 [P] Log JSON estruturado no GET `/api/v1/dashboard` (`userId`, `groupId`, `month`, `outcome` — sem valores monetários em claro, Princípio V) em `backend/src/api/dashboard/dashboard.router.ts` + asserção de não-vazamento no teste de contrato
- [X] T031 [P] Revisão de acessibilidade WCAG 2.1 AA dos componentes `frontend/src/components/dashboard/*`: barras com equivalente textual, foco visível, navegação por teclado na expansão de categorias, contraste do destaque de estouro
- [X] T032 [P] Teste de carga do contrato em `backend/tests/api/dashboard/dashboard-performance.test.ts`: seed 500 despesas / 50 categorias / 10 membros → resposta única correta (invariantes 1–2 do data-model.md) e duração registrada (SC-002 ≤ 2 s de ponta a ponta; alvo backend p95 < 200 ms)
- [ ] T033 Rodar suítes completas (`npm test --workspace backend`, `npm test --workspace frontend`) e executar a validação manual do `specs/009-budget-dashboard/quickstart.md` (US1–US4 + invariantes da seção final), corrigindo regressões antes do PR

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: T001 é gate da Constituição — bloqueia a Phase 2.
- **Foundational (Phase 2)**: bloqueia todas as user stories. Internamente: T002/T003/T006 paralelos; T004 → T005 (router usa o repositório? não — T005 depende só de T002 para o red/green; T004 independente, consumido na US1).
- **US1 (Phase 3)**: depende da Phase 2. É o MVP.
- **US2 (Phase 4)** e **US3 (Phase 5)**: dependem da Phase 2; **backend** de ambas estende `dashboard-aggregator.ts`/`serializer.ts` (mesmos arquivos da US1) → executar sequencialmente após a US1 (ou em branches coordenadas); os **testes** [P] de cada uma são independentes entre si.
- **US4 (Phase 6)**: frontend depende da `DashboardPage` existir (US1); o teste de contrato T026 só depende da Phase 3 (backend).
- **Polish (Phase 7)**: depende de US1–US4.

### User Story Dependencies

- **US1 (P1)**: nenhuma — MVP.
- **US2 (P1)**: independente em valor; compartilha arquivos de backend com US1 (ordem sequencial recomendada).
- **US3 (P2)**: idem US2.
- **US4 (P2)**: integra com a página criada na US1; backend já pronto desde a Phase 2/3.

### Within Each User Story

- Testes escritos primeiro e **vermelhos** antes da implementação (gate da Constituição).
- Aggregator (puro) → use case/serializer → router; util → hook/componente → página.

### Parallel Opportunities

- Phase 2: T002 ∥ T003 ∥ T006 (T004 ∥ T002/T003/T006 também — arquivos distintos).
- Em cada story: todos os testes marcados [P] podem ser escritos em paralelo (arquivos distintos).
- Frontend e backend de uma mesma story podem andar em paralelo após os testes vermelhos (contrato congelado no T001).
- T030 ∥ T031 ∥ T032 no Polish.

---

## Parallel Example: User Story 1

```bash
# Escrever todos os testes da US1 juntos (devem falhar):
Task: "T007 contract tests família em backend/tests/api/dashboard/dashboard-family.test.ts"
Task: "T008 unit tests aggregator em backend/tests/application/dashboard/dashboard-aggregator.test.ts"
Task: "T011 unit tests percent em frontend/src/utils/percent.test.ts"
Task: "T013 RTL tests em frontend/src/components/dashboard/FamilySummaryCard.test.tsx + DashboardPage.test.tsx"

# Depois, implementação em duas frentes paralelas:
#   Backend: T009 → T010        |   Frontend: T012 → T014 → T015
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Phase 1 (T001 — revisão do contrato) → Phase 2 (T002–T006).
2. Phase 3 completa (T007–T015).
3. **STOP and VALIDATE**: quickstart §US1 — família vs. orçamento no mês corrente, estados vazio/não definido.
4. Deploy/demo: a página inicial `/` já entrega valor.

### Incremental Delivery

1. Setup + Foundational → endpoint com auth/validação no ar.
2. US1 → MVP (resumo da família).
3. US2 → seção de membros (mesmo envelope, seção nova).
4. US3 → distribuição por categoria.
5. US4 → navegação de meses (fecha o escopo do spec).
6. Polish → observabilidade, a11y, performance, validação final.

### Parallel Team Strategy

Com dois devs após a Phase 2: Dev A segue o backend (T007/T008 → T009/T010, depois T016→T018, T021→T023, T026) enquanto Dev B segue o frontend (T011→T015, depois T019→T020, T024→T025, T027→T029) — o contrato aprovado no T001 é a interface entre os dois.

---

## Notes

- 33 tarefas: Setup 1 · Foundational 5 · US1 9 · US2 5 · US3 5 · US4 4 · Polish 4.
- [P] = arquivos diferentes e sem dependência pendente; tarefas de backend das US2/US3 tocam os mesmos arquivos da US1 — não paralelizar entre stories no backend.
- Verificar que cada grupo de testes FALHA antes de implementar (Princípio II).
- Testes RTL devem asserir labels/mensagens em PT-BR (FR-020); o rótulo "ex-membro" na UI deriva de `isExMember`, nunca do campo `name`.
- **Desvios registrados na implementação** (2026-06-11): (a) testes de frontend ficam em `frontend/tests/unit/**` (convenção do `jest.config` do repo — `testMatch: **/tests/**`), não co-localizados como escrito nas tarefas; (b) `dashboard.serializer.ts` não foi criado — o envelope é montado pela função pura `dashboard-aggregator.ts` (um serializer separado seria pass-through; Princípio IV), espelhando o papel do `budget.serializer.ts` da 008; (c) T028 resolvido pela opção "props opcionais": `MonthSelector` ganhou `maxMonth?` (default preserva o comportamento da 008 — suíte da 008 verde); (d) teste de performance em `backend/tests/performance/month-dashboard.perf.test.ts` (padrão do repo, auto-skip sem `DATABASE_URL`) — executado e aprovado contra Postgres real.
- Commits convencionais por tarefa ou grupo lógico (`test:`, `feat:`, `chore:`); parar em qualquer checkpoint para validar a story isoladamente.
