# Tasks: Monthly Payment Tracker (Contas do Mês)

**Input**: Design documents from `/specs/010-monthly-payment-tracker/`

**Prerequisites**: plan.md, spec.md, data-model.md, contracts/openapi.yaml, research.md

**Tests**: INCLUÍDOS — TDD é mandatório pela constituição (Princípio II). Em cada story, os testes vêm primeiro e DEVEM falhar antes da implementação.

**Organization**: Tasks agrupadas por user story (US1–US5 do spec.md) para implementação e teste independentes.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Pode rodar em paralelo (arquivos diferentes, sem dependência de task incompleta)
- **[Story]**: User story da task (US1–US5)

## Path Conventions

Web monorepo (plan.md): `backend/src/`, `backend/tests/`, `frontend/src/` (testes de frontend co-localizados `*.test.tsx`).

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Schema, migração e fundação de testes — bloqueia tudo.

- [X] T001 Adicionar ao `backend/prisma/schema.prisma`: enums `BillStatus` (PENDING/PAID/CANCELLED), `RecurrenceInterval` (MONTHLY/ANNUAL), `RecurringBillStatus` (ACTIVE/PAUSED/STOPPED); models `Bill` e `RecurringBill` conforme data-model.md (campos de pagamento nullable, `expenseId` unique, `recurringBillId` Restrict, `activeFromMonth`, `deletedAt`); relações reversas em `User`, `FamilyGroup`, `Category` (SetNull) e `Expense`
- [X] T002 Gerar a migração `010_monthly_payment_tracker` (`npm run -w backend prisma:migrate`) e editar o SQL para acrescentar o unique parcial `CREATE UNIQUE INDEX ... ON "Bill" ("recurringBillId", "month") WHERE "recurringBillId" IS NOT NULL` (padrão raw-SQL das features 007/008) em `backend/prisma/migrations/*_010_monthly_payment_tracker/migration.sql`
- [X] T003 [P] Criar factories de teste `createBillInDb` (qualquer status, com/sem `recurringBillId`/pagamento) e `createRecurringBillInDb` em `backend/tests/`, seguindo o padrão dos helpers/factories das features 006–009

**Checkpoint**: `prisma migrate` aplica limpo; factories disponíveis.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Repositórios e esqueleto de rota/navegação usados por todas as stories.

**⚠️ CRITICAL**: Nenhuma user story começa antes desta fase terminar.

- [X] T004 [P] Criar `backend/src/domain/bill/bill.repository.ts` (create, findById com groupId, listByMonth ordenado por dueDate/createdAt, update, updateStatus, delete, findByExpenseId, createMany com skipDuplicates)
- [X] T005 [P] Criar `backend/src/domain/recurring-bill/recurring-bill.repository.ts` (create, findById com groupId e deletedAt IS NULL, listByGroup, listAllActive, update, cancelFuturePendingInstances(recurringBillId, afterMonth))
- [X] T006 [P] Frontend: rota protegida `/pagamentos` em `frontend/src/router/AppRouter.tsx`, item de navegação "Pagamentos" em `frontend/src/components/layout/AppLayout.tsx` e placeholder `frontend/src/pages/PaymentsPage.tsx`
- [X] T007 [P] Criar `frontend/src/types/bill.ts` com os tipos do contrato (Bill, BillPayment, ProjectedBill, MonthSummary, MonthBillsResponse, RecurringBill)

**Checkpoint**: Fundação pronta — stories podem iniciar (US1 primeiro; US2/US3 em paralelo depois dela).

---

## Phase 3: User Story 1 - Register and View Monthly Bills (Priority: P1) 🎯 MVP

**Goal**: Checklist mensal de contas avulsas: criar, listar por mês (com resumo), editar/excluir Pendentes e copiar do mês anterior.

**Independent Test**: Criar uma conta com descrição/valor/vencimento e vê-la como Pendente no checklist do mês do vencimento; validações PT-BR; cópia do mês anterior com confirmação de contagem.

### Tests for User Story 1 (escrever primeiro — DEVEM FALHAR) ⚠️

- [X] T008 [P] [US1] Testes de contrato `GET /api/v1/bills?month` em `backend/tests/api/bills/list-month-bills.test.ts`: envelope `{month, summary, bills, projectedBills:[]}`, ordenação por dueDate, `isOverdue` derivado, mês passado/futuro aceito, 400 month inválido, 401/403, isolamento entre grupos
- [X] T009 [P] [US1] Testes de contrato `POST /api/v1/bills` em `backend/tests/api/bills/create-bill.test.ts`: 201 PENDING com `month` derivado do dueDate, 400 (valor ≤ 0, descrição vazia/longa, data inválida), categoria/membro opcionais validados no grupo
- [X] T010 [P] [US1] Testes de contrato `PATCH/DELETE /api/v1/bills/:id` em `backend/tests/api/bills/update-delete-bill.test.ts`: editar campos base só em PENDING (factory cria PAID e CANCELLED direto no banco → PATCH devolve 409 `bill.invalid_transition` em ambas, FR-012), mudar dueDate move o `month`, DELETE permitido em PENDING/CANCELLED e 409 em PAID, 404 para conta de outro grupo
- [X] T011 [P] [US1] Testes de contrato `POST /api/v1/bills/copy` em `backend/tests/api/bills/copy-bills.test.ts`: `dryRun:true` devolve só count, execução cria PENDING espelhadas com dia equivalente (dia 31 → último dia), ignora CANCELLED e instâncias com `recurringBillId`, mês anterior vazio → count 0
- [X] T012 [P] [US1] Testes unitários `bill-summary` em `backend/tests/application/bill/bill-summary.test.ts`: totalExpected = PENDING+PAID, totalPaid = actual de PAID, totalPending = expected de PENDING, CANCELLED fora de tudo, projectedCents separado, centavos inteiros

### Implementation for User Story 1

- [X] T013 [P] [US1] Função pura `bill-summary.ts` em `backend/src/application/bill/bill-summary.ts` (FR-010)
- [X] T014 [P] [US1] Validadores Zod em `backend/src/api/bill/bill.validators.ts` (month YYYY-MM, payloads create/update/copy; mensagens PT-BR)
- [X] T015 [US1] Use cases `list-month-bills.use-case.ts` (leitura pura: lista + summary + projectedBills vazio até US3) e `create-bill.use-case.ts` em `backend/src/application/bill/`
- [X] T016 [US1] Use cases `update-bill.use-case.ts` (PENDING only, recalcula month) e `delete-bill.use-case.ts` (não-PAID only) em `backend/src/application/bill/`
- [X] T017 [US1] Use case `copy-previous-month.use-case.ts` em `backend/src/application/bill/` (filtra avulsas não-canceladas, clamp do dia, dryRun)
- [X] T018 [US1] `bill.serializer.ts` e `bill.router.ts` em `backend/src/api/bill/` (GET/POST /bills, PATCH/DELETE /bills/:id, POST /bills/copy; auth + requireMembership) + mount em `backend/src/app.ts`; rodar T008–T012 até verde
- [X] T019 [P] [US1] Testes RTL (falhando primeiro) em `frontend/src/components/bills/BillChecklist.test.tsx`, `BillFormModal.test.tsx`, `CopyPreviousMonthButton.test.tsx` e `frontend/src/pages/PaymentsPage.test.tsx`: estados vazio/carregando/erro, item Pendente com vencida, validações do formulário, confirmação de cópia com contagem
- [X] T020 [P] [US1] Cliente HTTP `frontend/src/services/bill.service.ts` (list, create, update, remove, copy)
- [X] T021 [US1] Hook `frontend/src/hooks/useMonthBills.ts` (GET por mês, recarga após mutações)
- [X] T022 [US1] Componentes `frontend/src/components/bills/BillChecklist.tsx` e `BillItem.tsx` (Pendente, flag "Vencida" textual, ações editar/excluir com confirmação)
- [X] T023 [US1] Modal `frontend/src/components/bills/BillFormModal.tsx` (criar/editar: descrição, valor, vencimento, categoria e membro opcionais; PT-BR)
- [X] T024 [US1] `frontend/src/components/bills/CopyPreviousMonthButton.tsx` (dryRun → diálogo com contagem → executa)
- [X] T025 [US1] Montar `frontend/src/pages/PaymentsPage.tsx` (mês corrente fixo nesta fase, empty state convidando a criar a primeira conta); rodar T019 até verde

**Checkpoint**: Checklist de avulsas funcional ponta a ponta — MVP demonstrável.

---

## Phase 4: User Story 2 - Mark a Bill as Paid (Priority: P1)

**Goal**: Pagar uma conta registrando data/valor real/membro/método, criando a despesa vinculada atomicamente; corrigir pagamento sincronizando a despesa; despesa vinculada somente leitura no módulo de despesas.

**Independent Test**: Marcar uma Pendente como Paga com valor real ≠ esperado → conta exibe os dois valores e a despesa aparece em /despesas sem editar/excluir; editar o pagamento atualiza a despesa.

### Tests for User Story 2 (escrever primeiro — DEVEM FALHAR) ⚠️

- [X] T026 [P] [US2] Testes de contrato `POST /api/v1/bills/:id/pay` em `backend/tests/api/bills/pay-bill.test.ts`: 200 com payment completo, Expense criada na MESMA transação (categoria/membro/método/data/valor real), expected preservado, 409 se não-PENDING, 400 validações, atomicidade (falha na despesa → conta não muda)
- [X] T027 [P] [US2] Testes de contrato `PATCH /api/v1/bills/:id/payment` em `backend/tests/api/bills/update-payment.test.ts`: edita data/valor/membro/método e a Expense reflete na mesma transação, 409 se não-PAID
- [X] T028 [P] [US2] Testes de contrato da guarda em `backend/tests/api/expenses/managed-by-bill.test.ts`: PATCH/DELETE `/api/v1/expenses/:id` de despesa vinculada → 409 `expense.managed_by_bill`; envelope de despesa expõe `billId` (null para despesas comuns)

### Implementation for User Story 2

- [X] T029 [US2] Use case `pay-bill.use-case.ts` em `backend/src/application/bill/` (transação Prisma: PENDING→PAID + cria Expense via expense.repository + seta expenseId; valida membro/categoria do grupo)
- [X] T030 [US2] Use case `update-payment.use-case.ts` em `backend/src/application/bill/` (transação: atualiza pagamento + sincroniza Expense)
- [X] T031 [US2] Guarda de vínculo em `backend/src/application/expense/update-expense.use-case.ts` e `delete-expense.use-case.ts` (409 `expense.managed_by_bill` via `bill.repository.findByExpenseId`) + campo `billId` em `backend/src/api/expense/expense.serializer.ts`
- [X] T032 [US2] Rotas `POST /bills/:id/pay` e `PATCH /bills/:id/payment` em `backend/src/api/bill/bill.router.ts` + validadores; rodar T026–T028 até verde
- [ ] T033 [P] [US2] Testes RTL (falhando primeiro) em `frontend/src/components/bills/PayBillModal.test.tsx` (pré-preenchido com valor esperado + hoje + membro responsável, editável) e ajuste em `frontend/src/components/expense/*.test.tsx` (despesa com billId sem ações + aviso)
- [ ] T034 [US2] Modal `frontend/src/components/bills/PayBillModal.tsx` (pagar e editar pagamento; método cash/débito ou cartão)
- [ ] T035 [US2] `BillItem.tsx`: exibição Paga (esperado E real lado a lado, data), ações "Editar pagamento"
- [ ] T036 [US2] Despesa vinculada somente leitura: esconder editar/excluir e exibir aviso "Gerenciada pelo controle de pagamentos" nos componentes de despesa (`frontend/src/components/expense/`); rodar T033 até verde

**Checkpoint**: Ciclo previsão → pagamento → despesa → orçamento completo.

---

## Phase 5: User Story 3 - Recurring Bills (Priority: P1)

**Goal**: Contas fixas: template com intervalo mensal/anual, materialização automática (job, janela mês atual + seguinte), projeções "Prevista" além da janela, pausa/encerramento/exclusão e propagação de edições.

**Independent Test**: Cadastrar conta fixa mensal → instância Pendente no mês atual e seguinte sem ação; mês+2 mostra "Prevista" read-only; pausar/encerrar respeitam histórico.

### Tests for User Story 3 (escrever primeiro — DEVEM FALHAR) ⚠️

- [ ] T037 [P] [US3] Testes unitários `recurrence-engine` em `backend/tests/application/recurring-bill/recurrence-engine.test.ts`: elegibilidade mensal/anual (âncora = mês do startMonth), `activeFromMonth`, dia 31 → último dia (fev/meses de 30), bissexto
- [ ] T038 [P] [US3] Testes unitários `project-bills` em `backend/tests/application/recurring-bill/project-bills.test.ts`: projeção para mês aplicável sem instância, exclui pausada/encerrada/excluída, exclui template com instância persistida no mês, dueDate clampado
- [ ] T039 [P] [US3] Testes de `materialize-window` em `backend/tests/application/recurring-bill/materialize-window.test.ts`: materializa só {mês corrente, seguinte}, idempotente (2ª execução cria 0), respeita activeFromMonth/pausa, includeStartMonth=false pula o mês inicial, catch-up cobre janela após "downtime"
- [ ] T040 [P] [US3] Testes de contrato `GET/POST/PATCH /api/v1/recurring-bills` em `backend/tests/api/recurring-bills/crud.test.ts`: create materializa a janela sincronamente (catch-up), validações (dueDay 1–31, intervalo, startMonth), edição propaga para Pendentes de meses > atual (inclusive editadas à mão — last edit wins) sem tocar PAID/CANCELLED/passados, 401/403, isolamento
- [ ] T041 [P] [US3] Testes de contrato lifecycle em `backend/tests/api/recurring-bills/lifecycle.test.ts`: pause (sem novas instâncias/projeções; existentes intactas), resume (avança activeFromMonth — mês pausado não regenera), stop (cancela Pendentes de meses > atual, preserva atual/passados, terminal → 409), delete (soft: some da lista, mesmo efeito do stop, instâncias passadas preservadas; 404 depois)
- [ ] T042 [P] [US3] Testes de contrato projeções em `backend/tests/api/bills/projections.test.ts`: `GET /bills?month` além da janela devolve `projectedBills` + `summary.projectedCents` separado; janela normal → vazio; template pausado/encerrado não projeta

### Implementation for User Story 3

- [X] T043 [P] [US3] Função pura `recurrence-engine.ts` em `backend/src/application/recurring-bill/`
- [X] T044 [P] [US3] Função pura `project-bills.ts` em `backend/src/application/recurring-bill/` (FR-025)
- [X] T045 [P] [US3] Validadores e serializer em `backend/src/api/recurring-bill/recurring-bill.validators.ts` e `recurring-bill.serializer.ts`
- [X] T046 [US3] Use case `materialize-window.use-case.ts` em `backend/src/application/recurring-bill/` (createMany skipDuplicates na janela; por grupo ou global)
- [X] T047 [US3] Use cases `create-recurring-bill.use-case.ts` (includeStartMonth → activeFromMonth; catch-up síncrono da janela) e `update-recurring-bill.use-case.ts` (propagação FR-023) em `backend/src/application/recurring-bill/`
- [X] T048 [US3] Use cases `pause-resume.use-case.ts` (resume: activeFromMonth = max(atual)) , `stop-recurring-bill.use-case.ts` e `delete-recurring-bill.use-case.ts` (soft-delete + cancelFuturePendingInstances) em `backend/src/application/recurring-bill/`
- [X] T049 [US3] Scheduler in-process `backend/src/infra/recurring-bill-scheduler.ts` (executa materialize-window no boot + timer diário; logs estruturados) + iniciar no boot do servidor em `backend/src/index.ts`
- [X] T050 [US3] `recurring-bill.router.ts` em `backend/src/api/recurring-bill/` (GET/POST, PATCH/DELETE /:id, POST /:id/pause|resume|stop) + mount em `app.ts`
- [X] T051 [US3] Integrar projeções no `list-month-bills.use-case.ts` (projectedBills + projectedCents no summary); rodar T037–T042 até verde
- [ ] T052 [P] [US3] Testes RTL (falhando primeiro) em `frontend/src/components/bills/RecurringBillsSection.test.tsx`, `RecurringBillFormModal.test.tsx` (pergunta "incluir o mês atual?" só quando vencimento do mês inicial já passou) e projeções em `BillChecklist.test.tsx` (item "Prevista" sem ações)
- [ ] T053 [US3] `frontend/src/services/recurring-bill.service.ts` + `frontend/src/hooks/useRecurringBills.ts`
- [ ] T054 [US3] `frontend/src/components/bills/RecurringBillFormModal.tsx` (criar/editar; intervalo mensal/anual; diálogo includeStartMonth)
- [ ] T055 [US3] `frontend/src/components/bills/RecurringBillsSection.tsx` (lista com status, pausar/retomar/encerrar/excluir com confirmações PT-BR)
- [ ] T056 [US3] Projeções e badges no checklist: `BillItem.tsx` com badge "Conta fixa" (recurringBillId) e item "Prevista" read-only ao final de `BillChecklist.tsx`; rodar T052 até verde

**Checkpoint**: Contas fixas completas — cadastro único, geração automática, previsões, ciclo de vida.

---

## Phase 6: User Story 4 - Cancel a Bill and Revert States (Priority: P2)

**Goal**: Cancelar/reativar contas e reverter pagamentos removendo a despesa vinculada.

**Independent Test**: Cancelar Pendente → visível riscada e fora dos totais; reativar → volta a contar; reverter Paga → Pendente e despesa some.

### Tests for User Story 4 (escrever primeiro — DEVEM FALHAR) ⚠️

- [X] T057 [P] [US4] Testes de contrato `POST /bills/:id/cancel` e `/reactivate` em `backend/tests/api/bills/cancel-reactivate.test.ts`: PENDING→CANCELLED, CANCELLED→PENDING, PAID→cancel 409 (reverter antes), cancelada fora do summary mas presente em bills, ação concorrente (conta já mudou de estado por outro membro) → 409 `bill.invalid_transition` (edge case de concorrência)
- [X] T058 [P] [US4] Testes de contrato `DELETE /bills/:id/payment` em `backend/tests/api/bills/revert-payment.test.ts`: PAID→PENDING com payment null, Expense deletada na MESMA transação (atomicidade), 409 se não-PAID, despesa some dos agregados

### Implementation for User Story 4

- [X] T059 [US4] Use cases `cancel-bill.use-case.ts` (cancel + reactivate) e `revert-payment.use-case.ts` (transação: limpa pagamento + deleta Expense) em `backend/src/application/bill/`
- [X] T060 [US4] Rotas `POST /bills/:id/cancel`, `POST /bills/:id/reactivate`, `DELETE /bills/:id/payment` em `backend/src/api/bill/bill.router.ts`; rodar T057–T058 até verde
- [ ] T061 [P] [US4] Testes RTL (falhando primeiro): cancelada com visual distinto (riscado + badge textual), ações cancelar/reativar/reverter com confirmação, e conflito de concorrência (409 do backend → mensagem PT-BR "a conta foi alterada" + recarga do mês) em `frontend/src/components/bills/BillItem.test.tsx`
- [ ] T062 [US4] Ações e visual em `frontend/src/components/bills/BillItem.tsx` (cancelada: riscada, badge "Cancelada"; Paga: "Reverter pagamento"; Pendente: "Cancelar") + tratamento de 409 concorrente no `useMonthBills` (mensagem PT-BR e recarga); rodar T061 até verde

**Checkpoint**: Máquina de estados completa nas duas pontas.

---

## Phase 7: User Story 5 - Month Summary and Navigation (Priority: P2)

**Goal**: Resumo do mês (previsto/pago/pendente + previsto de contas fixas) e navegação livre entre meses (passado e futuro).

**Independent Test**: Mês com Paga (esp. 100, real 90), Pendente (50) e Cancelada (30) → resumo 150/90/50; navegar entre meses atualiza checklist e resumo; mês vazio tem empty state.

### Tests for User Story 5 (escrever primeiro — DEVEM FALHAR) ⚠️

- [ ] T063 [P] [US5] Testes RTL em `frontend/src/components/bills/MonthBillsSummary.test.tsx` (3 totais formatados por `utils/money.ts`, cancelada excluída, linha "Previstas" só quando projectedCents > 0) e navegação em `frontend/src/pages/PaymentsPage.test.tsx` (mês futuro permitido, "voltar ao mês atual", recarga ao trocar)

### Implementation for User Story 5

- [ ] T064 [US5] `frontend/src/components/bills/MonthBillsSummary.tsx` (FR-010; acessível — valores com rótulos textuais)
- [ ] T065 [US5] Integrar `MonthSelector` (feature 008, sem teto de futuro — research R7) na `frontend/src/pages/PaymentsPage.tsx` com atalho "voltar ao mês atual"; rodar T063 até verde

**Checkpoint**: Todas as user stories funcionais e independentes.

---

## Phase 8: Polish & Cross-Cutting Concerns

- [ ] T066 [P] Logs JSON estruturados nas mutações de bill/recurring-bill (userId, groupId, id, ação, outcome — sem valores monetários em claro) em `backend/src/application/bill/` e `backend/src/application/recurring-bill/` (Princípio V)
- [ ] T067 [P] Passe de acessibilidade WCAG 2.1 AA nos componentes de `frontend/src/components/bills/` (estado nunca só por cor; foco nos modais; aria-labels nas ações)
- [ ] T068 Rodar suítes completas + type-check + lint (`npm run -w backend test && npm run -w frontend test && npm run lint`) e corrigir regressões
- [ ] T069 Validação manual do quickstart.md (fluxos 1–7 e tabela SC-001–SC-007)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)** → **Foundational (Phase 2)** → user stories.
- **US1 (Phase 3)**: primeira story — cria router, página e checklist usados pelas demais.
- **US2 (Phase 4)**: depende de US1 (router/page/BillItem).
- **US3 (Phase 5)**: depende de US1 (checklist/summary envelope); independente de US2.
- **US4 (Phase 6)**: depende de US1; o teste de reverter (T058) depende de US2 (pay).
- **US5 (Phase 7)**: depende de US1 (summary no envelope); o teste de cancelada exige US4.
- **Polish (Phase 8)**: depois de todas as stories desejadas.

### User Story Dependencies

```
Setup → Foundational → US1 (MVP)
                        ├─→ US2 ─→ US4 (revert)
                        ├─→ US3
                        └─→ US5 (após US4 p/ teste completo)
```

### Within Each User Story

- Testes (contrato/unitários/RTL) escritos primeiro e FALHANDO (gate da constituição).
- Funções puras → use cases → router/serializer → verde no backend; depois service → hook → componentes → página no frontend.

### Parallel Opportunities

- **Phase 1**: T003 paralela a T001/T002.
- **Phase 2**: T004–T007 todas paralelas.
- **US1**: T008–T012 (testes) em paralelo; T013/T014 em paralelo; T019/T020 em paralelo.
- **Após US1**: US2 (dev A) e US3 (dev B) em paralelo — arquivos disjuntos exceto `bill.router.ts` (US2) vs. módulo recurring (US3) e a integração T051.
- **US3**: T037–T042 em paralelo; T043–T045 em paralelo.

---

## Parallel Example: User Story 1

```bash
# Testes primeiro, em paralelo (todos devem FALHAR):
Task: "T008 contract GET /bills?month em backend/tests/api/bills/list-month-bills.test.ts"
Task: "T009 contract POST /bills em backend/tests/api/bills/create-bill.test.ts"
Task: "T010 contract PATCH/DELETE /bills/:id em backend/tests/api/bills/update-delete-bill.test.ts"
Task: "T011 contract POST /bills/copy em backend/tests/api/bills/copy-bills.test.ts"
Task: "T012 unit bill-summary em backend/tests/application/bill/bill-summary.test.ts"

# Depois, funções/validadores em paralelo:
Task: "T013 bill-summary.ts"
Task: "T014 bill.validators.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Phase 1 (Setup) → Phase 2 (Foundational).
2. Phase 3 (US1): checklist de contas avulsas completo.
3. **PARAR e VALIDAR**: criar/editar/excluir/copiar contas, vencidas sinalizadas — demo possível.

### Incremental Delivery

1. US1 → MVP (lista de obrigações do mês).
2. US2 → pagamento + despesa vinculada (integração com orçamento) — maior valor incremental.
3. US3 → contas fixas (job + projeções) — maior bloco; pode ser PR separado.
4. US4 → cancelar/reverter.
5. US5 → resumo + navegação livre.
6. Phase 8 → polish, suítes completas, quickstart.

### Notes

- Contrato `contracts/openapi.yaml` deve estar revisado antes da Phase 2 começar (gate da constituição).
- Commits convencionais (`feat(010): ...`, `test(010): ...`) após cada task ou grupo lógico.
- Cada checkpoint é um ponto seguro para parar e validar a story isoladamente.
