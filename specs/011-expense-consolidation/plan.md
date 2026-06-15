# Implementation Plan: Expense Consolidation (Consolidação de Despesas)

**Branch**: `011-expense-consolidation` | **Date**: 2026-06-14 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/011-expense-consolidation/spec.md`

## Summary

Eliminar a entidade autônoma **Expense (Despesa)** e unificar todo registro de
gasto sob o **Monthly Payment Tracker** (feature 010): o estado **Paga** de uma
`Bill` passa a ser, por si só, o registro do gasto — não há mais despesa
paralela. Entregas:

1. **Registrar gasto em um passo** — novo endpoint `POST /api/v1/bills/log`
   ("registrar gasto") cria uma `Bill` já **PAID** capturando descrição, valor
   pago, data da compra (= data de pagamento = vencimento = mês), método de
   pagamento, membro responsável e categoria opcional. A data da compra (não o
   mês exibido) determina o mês do item (Clarification Q1).
2. **Dashboard a partir de contas Pagas** — a agregação mensal de gasto migra
   de `Expense` para `Bill`: `groupBy(paidByMemberId)` e `groupBy(categoryId)`
   somando `actualAmountCents` onde `status=PAID` e **`paidDate`** no mês
   (mês do pagamento, não do vencimento). Totais idênticos antes/depois
   (FR-006/SC-002).
3. **Migração única e irreversível** (Clarification Q2) — converte cada despesa
   avulsa em exatamente uma `Bill` Paga; despesas vinculadas a contas (feature
   010) não duplicam (a conta já carrega os dados de pagamento); a tabela
   `Expense` é **dropada** após backfill de autoria. A `Bill` ganha
   `createdById`/`updatedById` para preservar autoria (FR-004).
4. **Mapeamento de membro** (Clarification Q3) — registro rápido e migração
   definem apenas `paidByMemberId` (pagador = responsável); `ownerMemberId`
   fica nulo. O checklist passa a exibir `paidByMember` nas contas Pagas
   (preserva ex-membros, Cenário 4 da US2) — exige `payment.paidByMember` no
   serializer.
5. **Remoção da tela/rota/API de Despesas** (FR-007) — `/despesas` redireciona
   para `/pagamentos`; o item de nav "Despesas" some; `expenseRouter` é
   desmontado (`/api/v1/expenses/*` → 404); pay/revert/update-payment deixam de
   criar/sincronizar despesa (simplificação). Helpers compartilhados que viviam
   no módulo de despesa (`zodErrorToFieldErrors`, `idempotency.repository`)
   são **realocados** para módulos neutros, pois categorias/orçamentos/contas
   ainda dependem deles.
6. **Integridade de categoria** (item Outstanding da clarificação) — a guarda
   de exclusão de categoria deixa de contar `Expense` e passa a contar `Bill`;
   `Bill.categoryId` muda de `SetNull` para `Restrict` (paridade com a regra
   antiga de despesa, preserva atribuição histórica de categoria).

Saldo líquido de complexidade: **negativo** (remove uma entidade, um router,
uma tela e o acoplamento conta↔despesa); o que se acrescenta é mínimo
(1 endpoint, 2 colunas anuláveis, 1 índice).

## Technical Context

**Language/Version**: Node.js 20 LTS + TypeScript 5 (strict) — backend Express
e frontend React SPA, inalterado desde as features 004–010.

**Primary Dependencies**:

- **Backend** (sem libs novas): Express 4, Prisma 7 com `@prisma/adapter-pg`,
  Zod 4, Jest 30 + Supertest. Middlewares `auth.middleware.ts` +
  `require-membership.middleware.ts` reutilizados no novo `POST /bills/log`. O
  módulo `bill/` (010) é estendido; o módulo `expense/` é **removido** (com
  realocação de 2 helpers compartilhados).
- **Frontend** (sem libs novas): React 18, React Router DOM v7, Tailwind 3,
  Lucide, Jest + React Testing Library. Reaproveita `PaymentsPage`,
  `BillChecklist`, `PayBillModal`, `MonthSelector`, `utils/money.ts`,
  `utils/month.ts`. Remove a página/componentes de despesa.

**Storage**: Postgres 15 — **1 migração nova**
(`2026XXXX_011_expense_consolidation`): adiciona `Bill.createdById`/
`Bill.updatedById` (FK `User`, anuláveis) e índice `(groupId, paidDate)`;
muda `Bill.categoryId` para `onDelete: Restrict`; **converte** despesas avulsas
em contas Pagas e **dropa** a tabela `Expense` (e a coluna/FK `Bill.expenseId`)
após backfill de autoria; apaga linhas órfãs de `IdempotencyKey`
(`resourceType=EXPENSE`). A tabela `IdempotencyKey` e o enum `ResourceType`
**permanecem** (categorias usam `ResourceType.CATEGORY`). Detalhes em
data-model.md.

**Testing**:

- Backend: Jest + Supertest — unitários de `log-spending` (validação espelhando
  despesa: valor>0, data não futura, descrição 1–200, método válido, membro
  ativo; `ownerMemberId` nulo / `paidByMemberId` setado) e da nova
  `billRepository.aggregateMonthSpending` (soma por pagador/categoria sobre
  `paidDate`, só PAID, canceladas/pendentes fora); **teste de conversão da
  migração** (avulsa→1 conta Paga lossless, vinculada não duplica, totais
  família/membro/categoria idênticos = SC-002/SC-003); contrato HTTP de
  `POST /bills/log` (201, 400 por campo, 401/403, isolamento de grupo);
  ajuste dos testes de `pay/revert/update-payment` (sem efeito colateral em
  despesa); ajuste dos testes de dashboard (semeiam contas Pagas, não
  despesas); guarda de exclusão de categoria contando contas. Remoção das
  suítes de despesa (`tests/api/expenses`, `tests/application/expense`).
- Frontend: Jest + RTL — `QuickLogModal` (validação, envio, pré-preenchimento
  de data=hoje), `PaymentsPage` (ação "registrar gasto"), `BillItem` (exibe
  `paidByMember` em contas Pagas; ex-membro), redirecionamento `/despesas` →
  `/pagamentos`, ausência do item de nav "Despesas". Remoção das suítes de
  despesa.

**Target Platform**: Backend Node.js 20 LTS; frontend navegadores modernos
(Chrome 115+, Firefox 120+, Safari 17+). Inalterado.

**Project Type**: Web monorepo (npm workspaces) com `backend/` e `frontend/`,
estrutura das features 001/004–010.

**Performance Goals**:

- SC-001: registrar gasto da abertura ao checklist em < 30 s e em uma só tela —
  `POST /bills/log` é 1 INSERT; o modal já abre com data=hoje e os membros/
  categorias em cache da página.
- Dashboard inalterado em latência: a agregação passa a 2 `groupBy` sobre
  `Bill` filtrando `(groupId, status=PAID, paidDate∈mês)`, suportada pelo novo
  índice `(groupId, paidDate)` — paridade com o antigo `expense_group_date_id_idx`.

**Constraints**:

- Valores monetários sempre `Int` (centavos) ponta a ponta (Princípio III).
- Mês civil sem timezone: `paidDate DATE` governa a atribuição de orçamento
  (mês do pagamento, FR-003), **não** `Bill.month` (mês do vencimento).
- Estados/transições da `Bill` inalterados (010): registrar gasto cria direto
  em PAID; reverter (PAID→PENDING), cancelar (PENDING→CANCELLED) etc. seguem as
  mesmas regras (FR-009).
- PT-BR exclusivamente (FR-012); WCAG 2.1 AA herdado (membro responsável
  comunicado por texto, não só cor).
- Envelope de erro flat `{ code, message, fieldErrors? }` reutilizado; sem
  códigos `expense.*` novos (módulo removido).

**Scale/Scope**: Família 2–10 membros, ~5–40 gastos/mês. 1 endpoint novo,
1 use case novo, 2 colunas + 1 índice + 1 mudança de FK na `Bill`, 1 migração
com conversão de dados. **Remoções**: módulo de despesa (backend: ~8 arquivos;
frontend: ~11 arquivos), 1 router, 1 página, 1 item de nav. **Realocações**:
2 helpers compartilhados.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Princípio | Status | Notas |
|-----------|--------|-------|
| **I. API-First** | PASS | `contracts/openapi.yaml` definido no Phase 1 ANTES do código: novo `POST /api/v1/bills/log`, campo **aditivo** `payment.paidByMember` no envelope de conta, e a **remoção** documentada de `/api/v1/expenses/*` (+ do campo `billId`/erro `expense.managed_by_bill` da despesa). A remoção é uma quebra deliberada e versionada (decisão de versionamento, Governança): o único cliente é o frontend próprio, atualizado em lockstep nesta mesma feature. |
| **II. Test-First (NON-NEGOTIABLE)** | APPLIES | TDD. Ordem: (1) unit de `log-spending`/`bill.aggregateMonthSpending` + **teste de conversão da migração** (lossless) **falhando** → implementação; (2) contrato HTTP `POST /bills/log` e ajuste dos contratos de pay/revert/dashboard **falhando** → backend; (3) RTL de `QuickLogModal`/`PaymentsPage`/`BillItem`/redirect **falhando** → frontend. Cobertura crítica: SC-002 (totais idênticos pós-migração), avulsa→1 conta sem perda/duplicação, vinculada não duplica, `paidDate` governa o mês, membro mapeado só em `paidByMemberId`, guarda de categoria contando contas. Remoção das suítes de despesa acompanha a remoção do código. |
| **III. Security & Data Integrity** | PASS | Auth + `requireMembership` em `POST /bills/log`; query/escopo por `groupId`; centavos inteiros; Zod na borda (valor>0, data não futura, descrição 1–200, método válido, `paidByMemberId` membro ativo do grupo). Migração lossless em transação, precedida de **backup** (irreversível, Q2); `Bill.categoryId` → `Restrict` reforça integridade histórica de categoria. Sem valores monetários em log. |
| **IV. Simplicity** | PASS | Saldo de complexidade **negativo**: remove a entidade `Expense`, o acoplamento conta↔despesa (pay/revert/update-payment ficam sem transação dupla) e uma tela inteira. O que entra é mínimo e justificado por necessidade presente: 1 endpoint reaproveitando a infra de `Bill`, 2 colunas anuláveis (autoria, FR-004), 1 índice (paridade de performance). Helpers são **movidos**, não abstraídos. Sem entradas em Complexity Tracking. |
| **V. Observability** | PASS | Log JSON estruturado em `POST /bills/log` (userId, groupId, billId, outcome — sem valores) e na migração (contagens convertidas, sem valores). Erros machine-readable reaproveitados (validação + `bill.*`); códigos `expense.*` removidos com o módulo. `/health` inalterado. |

**Gate result: PASS** — Phase 0 pode iniciar. Re-avaliado após o Phase 1
(abaixo): **PASS mantido**, sem entradas em Complexity Tracking.

## Project Structure

### Documentation (this feature)

```text
specs/011-expense-consolidation/
├── plan.md              # Este arquivo
├── spec.md              # Especificação (1 sessão de clarification: Q1/Q2/Q3)
├── research.md          # Phase 0 output (R1–R10)
├── data-model.md        # Phase 1 output (mudanças em Bill; remoção de Expense; migração)
├── quickstart.md        # Phase 1 output
├── contracts/
│   └── openapi.yaml     # Phase 1 output — POST /bills/log + envelope de pagamento + remoções
├── checklists/
│   └── requirements.md  # Feito no /speckit-specify
└── tasks.md             # Phase 2 output (gerado por /speckit-tasks)
```

### Source Code (repository root)

```text
backend/
├── prisma/
│   ├── schema.prisma                               # MODIFICADO — drop model Expense; Bill ganha createdById/updatedById (BillAuthor/BillEditor) + @@index([groupId, paidDate]); Bill.categoryId onDelete SetNull→Restrict; remove expenseId/expense; remove relações Expense em User/FamilyGroup/Category; ResourceType.EXPENSE mantido (remoção opcional)
│   └── migrations/2026XXXX_011_expense_consolidation/   # NOVO — add colunas/índice; backfill autoria; INSERT…SELECT avulsas→Bill Paga; drop expenseId; DROP TABLE Expense; purga IdempotencyKey EXPENSE
└── src/
    ├── api/
    │   ├── bill/
    │   │   ├── bill.router.ts                      # MODIFICADO — + POST /bills/log
    │   │   ├── bill.validators.ts                  # MODIFICADO — + logSpendingBody (data não futura); importa zodErrorToFieldErrors do novo helper
    │   │   └── bill.serializer.ts                  # MODIFICADO — payment.paidByMember { id, name }
    │   ├── zod-helpers.ts                          # NOVO — zodErrorToFieldErrors (realocado de expense.validators)
    │   ├── budget/budget.validators.ts             # MODIFICADO — import do helper realocado
    │   ├── category/category.validators.ts         # MODIFICADO — import do helper realocado
    │   ├── recurring-bill/recurring-bill.validators.ts # MODIFICADO — import do helper realocado
    │   └── expense/                                # REMOVIDO — router, serializer, validators
    ├── application/
    │   ├── bill/
    │   │   ├── log-spending.use-case.ts            # NOVO — cria Bill PAID em 1 passo (FR-001/010, Q1/Q3)
    │   │   ├── pay-bill.use-case.ts                # MODIFICADO — não cria Expense; só seta pagamento + updatedById
    │   │   ├── update-payment.use-case.ts          # MODIFICADO — não sincroniza Expense
    │   │   └── revert-payment.use-case.ts          # MODIFICADO — não remove Expense; só limpa pagamento
    │   ├── dashboard/
    │   │   ├── get-month-dashboard.use-case.ts     # MODIFICADO — usa billRepository.aggregateMonthSpending; ex-membros por id (inalterado)
    │   │   └── dashboard-aggregator.ts             # MODIFICADO — comentários "expense owners"→"bill payers" (lógica inalterada)
    │   ├── category/
    │   │   ├── create-category.use-case.ts         # MODIFICADO — import idempotency do módulo realocado
    │   │   ├── delete-category.use-case.ts          # MODIFICADO — backstop conta Bill (não Expense)
    │   │   └── preview-delete-category.use-case.ts  # MODIFICADO — preview conta Bill
    │   └── expense/                                # REMOVIDO — create/update/delete/get/list/cursor/helpers
    ├── domain/
    │   ├── bill/bill.repository.ts                 # MODIFICADO — include paidByMember; create seta autoria; + aggregateMonthSpending; remove include/uso de expense
    │   ├── idempotency/idempotency.repository.ts   # NOVO (MOVIDO de domain/expense/) — usado por categorias
    │   ├── category/category.repository.ts         # MODIFICADO — affectedCount conta Bill (não Expense)
    │   └── expense/                                # REMOVIDO — expense.repository (idempotency movido para cima)
    └── app.ts                                      # MODIFICADO — remove mount de expenseRouter

frontend/
└── src/
    ├── config/navigation.ts                        # MODIFICADO — remove item "despesas"
    ├── router/AppRouter.tsx                         # MODIFICADO — /despesas → <Navigate to="/pagamentos" replace/>; remove import ExpensesPage
    ├── pages/PaymentsPage.tsx                       # MODIFICADO — ação "registrar gasto" abre QuickLogModal
    ├── components/bills/
    │   ├── QuickLogModal.tsx                        # NOVO — formulário de registro rápido (FR-001/010)
    │   ├── BillItem.tsx                             # MODIFICADO — exibe paidByMember em contas Pagas
    │   └── BillChecklist.tsx                        # MODIFICADO — botão "registrar gasto"
    ├── hooks/useMonthBills.ts                       # MODIFICADO — mutação logSpending
    ├── services/bill.service.ts                     # MODIFICADO — logSpending()
    ├── types/bill.ts                                # MODIFICADO — payment.paidByMember; LogSpendingRequest
    ├── pages/ExpensesPage.tsx                       # REMOVIDO
    ├── components/expense/                          # REMOVIDO — ExpenseList/Item/FormModal/DeleteModal
    ├── hooks/use{Create,Update,Delete}Expense.ts    # REMOVIDO
    ├── hooks/useExpensesList.ts                     # REMOVIDO
    ├── services/expense.service.ts                  # REMOVIDO
    └── types/expense.ts                             # REMOVIDO

backend/tests/
├── application/bill/log-spending.test.ts           # NOVO
├── application/bill/aggregate-month-spending.test.ts # NOVO
├── migration/expense-consolidation.test.ts          # NOVO — conversão lossless (SC-002/003)
├── api/bills/log.test.ts                            # NOVO — contrato POST /bills/log
├── api/bills/* , application/bill/pay-revert-*      # MODIFICADO — sem efeito em despesa
├── api/dashboard/* , application/dashboard/*        # MODIFICADO — semeiam contas Pagas
├── application/category/*delete*                    # MODIFICADO — guarda conta Bill
├── api/expenses/ , application/expense/             # REMOVIDO

frontend/src/components/bills/QuickLogModal.test.tsx  # NOVO
frontend/src/components/bills/BillItem.test.tsx       # MODIFICADO — paidByMember
frontend/src/router/AppRouter.test.tsx (ou equivalente)# MODIFICADO — redirect /despesas
frontend/src/**/expense*                              # REMOVIDO — suítes de despesa
```

**Structure Decision**: Web monorepo existente (Opção 2). A feature é
predominantemente **subtrativa**: estende o módulo vertical `bill/` já existente
(010) com um caso de uso de registro rápido e uma agregação de gasto, e **remove**
o módulo `expense/` nas três camadas. Duas dependências transversais do módulo
removido (`zodErrorToFieldErrors`, `idempotency.repository`) são realocadas para
módulos neutros (`api/zod-helpers.ts`, `domain/idempotency/`) para não quebrar
categorias/orçamentos/contas. A migração de dados acompanha a migração de schema
(INSERT…SELECT) e é coberta por teste de conversão lossless.

## Complexity Tracking

> Sem violações de constituição a justificar — tabela intencionalmente vazia.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| — | — | — |
