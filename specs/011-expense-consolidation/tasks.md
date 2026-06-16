---

description: "Task list for feature 011 — Expense Consolidation"
---

# Tasks: Expense Consolidation (Consolidação de Despesas)

**Input**: Design documents from `specs/011-expense-consolidation/`

**Prerequisites**: plan.md, spec.md, research.md (R1–R10), data-model.md,
contracts/openapi.yaml

**Tests**: Incluídos (Princípio II — Test-First NON-NEGOTIABLE). Em cada story os
testes são escritos primeiro e **DEVEM FALHAR** antes da implementação.

**Organization**: Tarefas agrupadas por user story. ⚠️ **Atenção de cutover**:
esta feature é uma consolidação — derrubar o `model Expense` (T004/T005)
quebra a compilação de todo código que referencia `prisma.expense` até que os
repoints/remoções de US2 e US3 estejam prontos. Trate Foundational + US2 + US3
(backend) como **um cutover coordenado**: rode a suíte completa só depois deles.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: paralelizável (arquivos diferentes, sem dependência pendente)
- **[Story]**: US1, US2, US3 (Setup/Foundational/Polish não têm label)
- Caminhos de arquivo exatos nas descrições

## Path Conventions

Web monorepo (npm workspaces): `backend/src/`, `backend/tests/`, `frontend/src/`.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Realocações e factories (prep não-destrutivo; `Expense` ainda existe).

- [X] T001 [P] Realocar `zodErrorToFieldErrors` de `backend/src/api/expense/expense.validators.ts` para novo `backend/src/api/zod-helpers.ts` e atualizar os imports/re-exports em `backend/src/api/bill/bill.validators.ts`, `backend/src/api/budget/budget.validators.ts`, `backend/src/api/category/category.validators.ts`, `backend/src/api/recurring-bill/recurring-bill.validators.ts` (R6)
- [X] T002 [P] Mover `backend/src/domain/expense/idempotency.repository.ts` para `backend/src/domain/idempotency/idempotency.repository.ts` e atualizar o import em `backend/src/application/category/create-category.use-case.ts` (mantém `IdempotencyKey`/`ResourceType` — categorias usam `CATEGORY`) (R6)
- [X] T003 [P] Factories em `backend/tests/`: estender `createBillInDb` para aceitar `createdById`/`updatedById` e o formato "PAID direto" do registro rápido; adicionar `seedLegacyExpense` (INSERT raw via `$executeRaw` na tabela `Expense`) para o teste de conversão da migração

**Checkpoint**: helpers em módulos neutros; factories prontas.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Modelo consolidado + camada de conta compartilhada por todas as stories.

**⚠️ CRITICAL**: Nenhuma user story começa antes desta fase. Ver nota de cutover acima.

- [X] T004 Editar `backend/prisma/schema.prisma`: adicionar `Bill.createdById`/`Bill.updatedById` (FK `User` anuláveis, relações `BillAuthor`/`BillEditor`) e `@@index([groupId, paidDate])`; mudar `Bill.categoryId` para `onDelete: Restrict`; remover `Bill.expenseId`/`expense`; **remover `model Expense`** e as relações `expenses*` em `User`/`FamilyGroup`/`Category` (data-model.md §1–§2)
- [X] T005 Gerar a migração `2026XXXX_011_expense_consolidation` (`npm run -w backend prisma:migrate`) e editar `migration.sql` conforme data-model.md §5 (ordem: add colunas/índice + alter FK `Restrict`; backfill autoria das contas vinculadas; `INSERT…SELECT` avulsas→`Bill` PAID preservando `createdAt`/`updatedAt`; `DROP COLUMN expenseId`; `DROP TABLE "Expense"`; `DELETE FROM "IdempotencyKey" WHERE "resourceType"='EXPENSE'`). Correção da conversão é gated pelo teste US2/T018. **Backup antes de aplicar (Q2 — irreversível).**
- [X] T006 [P] `backend/src/domain/bill/bill.repository.ts`: incluir relação `paidByMember`; setar `createdById`/`updatedById` no `create`; adicionar `aggregateMonthSpending(groupId, month)` (`status=PAID`, `paidDate` no mês, `groupBy(['paidByMemberId'])` e `groupBy(['categoryId'])` somando `actualAmountCents`); remover include/uso de `expense` e `findByExpenseId` (R4)
- [X] T007 [P] `backend/src/api/bill/bill.serializer.ts`: adicionar `payment.paidByMember { id, name }`; remover `payment.expenseId` (Q3 / contracts)
- [X] T008 [P] `frontend/src/types/bill.ts`: adicionar `payment.paidByMember` ao tipo `BillPayment`; adicionar `LogSpendingRequest`

**Checkpoint**: schema migra; a `Bill` carrega pagador + autoria. (Suíte fica vermelha até US2+US3 — cutover.)

---

## Phase 3: User Story 1 - Registrar gasto direto no tracker (Priority: P1) 🎯 MVP

**Goal**: Ação rápida "registrar gasto" cria uma `Bill` já PAID em um passo (FR-001).

**Independent Test**: Com o tracker aberto, registrar uma compra em uma ação e
vê-la como Paga no checklist do mês da **data da compra** e refletida nos totais
do dashboard.

### Tests for User Story 1 (escrever primeiro — DEVEM FALHAR) ⚠️

- [X] T009 [P] [US1] Testes unitários em `backend/tests/application/bill/log-spending.test.ts`: validação espelhando despesa (valor>0, data **não futura**, descrição 1–200, método válido, `paidByMemberId` membro ativo) e mapeamento (`status=PAID`, `expected=actual`, `dueDate=paidDate=date`, `month` derivado de `date`, `ownerMemberId=null` — Q3)
- [X] T010 [P] [US1] Testes de contrato `POST /api/v1/bills/log` em `backend/tests/api/bills/log-spending.test.ts`: 201 conta PAID com `payment.paidByMember`, 400 por campo, 400 `owner_not_in_group`, 401/403, isolamento entre grupos, **data retroativa cai no mês da data** (Q1)
- [X] T011 [P] [US1] Testes RTL em `frontend/src/components/bills/QuickLogModal.test.tsx` (+ ação na `PaymentsPage`): data default=hoje, validações PT-BR por campo, envio bem-sucedido fecha e recarrega o mês

### Implementation for User Story 1

- [X] T012 [US1] `logSpendingBody` (Zod) em `backend/src/api/bill/bill.validators.ts`: novo `notFutureDateField`, reaproveita `descriptionField`/`expectedAmountCentsField`, importa `zodErrorToFieldErrors` de `api/zod-helpers.ts`
- [X] T013 [US1] `backend/src/application/bill/log-spending.use-case.ts`: valida membro ativo no grupo (padrão do `create-bill`) e cria a `Bill` PAID (data-model.md §1; `ownerMemberId=null`, `createdById=updatedById=userId`)
- [X] T014 [US1] Rota `POST /api/v1/bills/log` em `backend/src/api/bill/bill.router.ts` (auth + `requireMembership`); rodar T009–T010 até verde
- [X] T015 [P] [US1] `backend`→`frontend`: `logSpending()` em `frontend/src/services/bill.service.ts` e mutação correspondente em `frontend/src/hooks/useMonthBills.ts` (recarrega o mês após sucesso)
- [X] T016 [US1] `frontend/src/components/bills/QuickLogModal.tsx`: formulário PT-BR (descrição, valor, data=hoje, método cash/débito ou cartão, responsável, categoria opcional)
- [X] T017 [US1] Botão "Registrar gasto" em `frontend/src/components/bills/BillChecklist.tsx` / `frontend/src/pages/PaymentsPage.tsx` abrindo o `QuickLogModal`; rodar T011 até verde

**Checkpoint**: Registro rápido funcional ponta a ponta.

---

## Phase 4: User Story 2 - Dados históricos permanecem precisos (Priority: P1)

**Goal**: Dashboard computa de contas Pagas; a migração converte despesas sem
perda; o checklist exibe o membro responsável (pagador).

**Independent Test**: Capturar os totais (família/membro/categoria) de todo mês
antes; após a consolidação, os mesmos totais para cada mês e cada despesa antiga
aparecendo exatamente uma vez como conta Paga.

### Tests for User Story 2 (escrever primeiro — DEVEM FALHAR) ⚠️

- [X] T018 [P] [US2] Teste de conversão da migração em `backend/tests/migration/expense-consolidation.test.ts`: aplica migrações até 010, semeia (via `seedLegacyExpense`) despesas avulsas + 1 despesa vinculada a conta, aplica a 011, assere — cada avulsa vira **exatamente 1** `Bill` PAID com valores/categoria/método/autoria/`createdAt` preservados, vinculada **não** gera conta nova, contagens batem, tabela `Expense` não existe mais (SC-002/SC-003)
- [X] T019 [P] [US2] Testes unitários de `billRepository.aggregateMonthSpending` em `backend/tests/application/bill/aggregate-month-spending.test.ts`: só PAID conta; atribuição pelo **mês de `paidDate`** (inclui conta paga em mês ≠ vencimento); `groupBy` por pagador e categoria; Pendentes/Canceladas fora (FR-003/FR-011)
- [X] T020 [P] [US2] Atualizar testes de dashboard em `backend/tests/api/dashboard/*` e `backend/tests/application/dashboard/*` para **semear contas Pagas** (não despesas): total família, por membro, por categoria idênticos ao esperado; ex-membro resolvido por id
- [X] T021 [P] [US2] Atualizar testes em `backend/tests/api/bills/pay-bill.test.ts`, `update-payment.test.ts` e `revert-*`: pagar/editar/reverter **não** cria nem remove despesa; só altera campos de pagamento; sem 409 `expense.managed_by_bill`
- [X] T022 [P] [US2] Testes RTL em `frontend/src/components/bills/BillItem.test.tsx`: conta PAID exibe `payment.paidByMember.name`; ex-membro (membro fora do grupo) ainda exibido

### Implementation for User Story 2

- [X] T023 [US2] Repoint do dashboard: `backend/src/application/dashboard/get-month-dashboard.use-case.ts` passa a usar `billRepository.aggregateMonthSpending`; ajustar comentários "expense owners"→"bill payers" em `backend/src/application/dashboard/dashboard-aggregator.ts` (lógica de ex-membro inalterada); rodar T019–T020 até verde
- [X] T024 [US2] Simplificar `backend/src/application/bill/pay-bill.use-case.ts`, `update-payment.use-case.ts` e `revert-payment.use-case.ts`: removem a criação/sincronização/remoção de `Expense`; apenas mutam campos de pagamento + `updatedById` (R5); rodar T021 até verde
- [X] T025 [US2] `frontend/src/components/bills/BillItem.tsx`: exibir `payment.paidByMember.name` em contas PAID (em vez de depender de `ownerMember`); rodar T022 e T018 até verde

**Checkpoint**: dashboard idêntico ao histórico; migração lossless verificada; pagador visível.

---

## Phase 5: User Story 3 - Um só lugar para registrar (Priority: P2)

**Goal**: Remover tela, item de nav e API de Despesas; `/despesas` redireciona ao
tracker; operações de despesa deixam de existir (FR-007).

**Independent Test**: Nav sem "Despesas"; abrir `/despesas` carrega o tracker;
`/api/v1/expenses*` responde que o recurso não existe.

### Tests for User Story 3 (escrever primeiro — DEVEM FALHAR) ⚠️

- [X] T026 [P] [US3] Teste de contrato em `backend/tests/api/expenses-removed.test.ts`: `GET/POST/PATCH/DELETE /api/v1/expenses*` → 404 (recurso não existe)
- [X] T027 [P] [US3] Teste frontend em `frontend/src/router/AppRouter.test.tsx` (ou equivalente): abrir `/despesas` redireciona para `/pagamentos`; `NAV_ITEMS` não contém item "despesas"
- [X] T028 [P] [US3] Testes em `backend/tests/application/category/*delete*`: excluir categoria usada por conta PAID é **bloqueada**; `preview-delete-category` conta **contas** afetadas (não despesas)

### Implementation for User Story 3

- [X] T029 [US3] Backend: remover o mount de `expenseRouter` em `backend/src/app.ts` e deletar o módulo de despesa (`backend/src/api/expense/`, `backend/src/application/expense/`, `backend/src/domain/expense/expense.repository.ts`); rodar T026 até verde
- [X] T030 [US3] Repoint da guarda de categoria: `backend/src/domain/category/category.repository.ts` (contar `Bill` em vez de `Expense`), `backend/src/application/category/preview-delete-category.use-case.ts` e `delete-category.use-case.ts` (backstop P2003 sobre contas); rodar T028 até verde (R8)
- [X] T031 [P] [US3] Frontend: remover `frontend/src/pages/ExpensesPage.tsx`, `frontend/src/components/expense/*`, `frontend/src/hooks/use{Create,Update,Delete}Expense.ts` e `useExpensesList.ts`, `frontend/src/services/expense.service.ts`, `frontend/src/types/expense.ts`
- [X] T032 [US3] `frontend/src/router/AppRouter.tsx`: rota `/despesas` → `<Navigate to="/pagamentos" replace/>` e remover o import de `ExpensesPage`; `frontend/src/config/navigation.ts`: remover o item `despesas`; rodar T027 até verde

**Checkpoint**: ponto de entrada duplicado eliminado; cutover completo.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [X] T033 [P] Remover suítes de teste de despesa órfãs que não viraram testes de remoção: `backend/tests/api/expenses/` (exceto o de remoção), `backend/tests/application/expense/`, e `frontend/src/**/*expense*.test.tsx`
- [X] T034 [P] Logs estruturados (Observability): `POST /bills/log` (userId, groupId, billId, outcome — sem valores) e contagens da migração no `migration.sql`/script (sem valores monetários)
- [ ] T035 [P] Validar `quickstart.md` manualmente: registrar gasto em < 30 s e uma só tela (SC-001), `/despesas` redireciona, `GET /api/v1/expenses` → 404
- [X] T036 Rodar `tsc`/lint limpos em backend e frontend após realocações/remoções e a suíte completa (backend + frontend) verde

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Fase 1)**: sem dependências — pode começar já.
- **Foundational (Fase 2)**: depende do Setup. **Bloqueia todas as stories.**
- **US1 (Fase 3)**: depende de Foundational. Entrega independente do registro rápido.
- **US2 (Fase 4)**: depende de Foundational. Valida a migração (T005) e repointa dashboard/pagamento.
- **US3 (Fase 5)**: depende de Foundational. Remove o código que ainda referencia `Expense`.
- **Polish (Fase 6)**: depende de US1–US3.

### ⚠️ Cutover (importante)

`T004`/`T005` derrubam o `model Expense`. O código volta a compilar e a suíte só
fica verde quando **T023/T024 (US2)** e **T029/T030 (US3)** removem todas as
referências a `prisma.expense`. O `DROP TABLE "Expense"` da migração só é seguro
de **aplicar em produção** após US2+US3 estarem deployadas. Implemente
Foundational + US2(backend) + US3(backend) como um bloco coordenado.

### User Story Dependencies

- US1, US2, US3 são independentes entre si em escopo de produto, mas todas
  dependem de Foundational. US1 não depende de US2/US3. US2 e US3 podem ser
  feitas em paralelo após Foundational (times diferentes), respeitando o cutover.

### Within Each User Story

- Testes (escritos primeiro, falhando) → implementação → rodar até verde.

### Parallel Opportunities

- Setup: T001, T002, T003 em paralelo.
- Foundational: T006, T007, T008 em paralelo (após T004/T005).
- US1 tests: T009, T010, T011 em paralelo. US1 impl: T015 paralelo aos demais.
- US2 tests: T018–T022 em paralelo. US3 tests: T026–T028 em paralelo.
- US3 impl: T031 (frontend) paralelo a T029/T030 (backend).

---

## Parallel Example: User Story 1

```text
# Testes US1 juntos (devem falhar):
T009  unit log-spending           backend/tests/application/bill/log-spending.test.ts
T010  contrato POST /bills/log     backend/tests/api/bills/log-spending.test.ts
T011  RTL QuickLogModal            frontend/src/components/bills/QuickLogModal.test.tsx

# Depois, implementação (T012→T014 sequenciais no mesmo router; T015 em paralelo):
T012 validators → T013 use-case → T014 router  | T015 service+hook (paralelo)
T016 QuickLogModal → T017 botão na PaymentsPage
```

---

## Implementation Strategy

### MVP

US1 (registrar gasto) é o incremento de maior valor diário, mas depende de
Foundational. **MVP = Setup + Foundational + US1**, com a ressalva de que o
`DROP TABLE "Expense"` (T005) não vai a produção até US2+US3. Para uma demo
local de US1, aplique a migração no banco de dev (já com o cutover de US2/US3).

### Incremental Delivery (cutover único)

1. Setup + Foundational (schema/migração/camada de conta).
2. US2 backend (repoint dashboard + simplificação de pagamento) e US3 backend
   (remoção do módulo + guarda de categoria) — necessários para compilar.
3. US1 (registro rápido) + US2/US3 frontend.
4. Aplicar a migração (com backup) e Polish.

### Notes

- `[P]` = arquivos diferentes, sem dependência pendente.
- TDD obrigatório (Princípio II): cada teste novo deve falhar antes da implementação.
- Valores em centavos inteiros; PT-BR exclusivo; WCAG herdado.
- Q1 (mês pela data da compra), Q2 (drop irreversível + backup), Q3 (só
  `paidByMemberId`; checklist exibe pagador) já refletidos nas tarefas.
