---

description: "Task list — Credit Card Management (feature 012)"
status: "Complete"
completed_on: "2026-06-17"
---

# Tasks: Credit Card Management (Gerenciamento de Cartões de Crédito)

**Input**: Design documents from `specs/012-credit-card-management/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/openapi.yaml

**Tests**: INCLUÍDOS — a constituição do projeto torna TDD não-negociável
(Princípio II). Cada história escreve testes que **falham** antes da
implementação.

**Organization**: Tarefas agrupadas por user story (todas P1) na ordem natural de
dependência US1 → US2 → US3 → US4. Caminhos seguem o monorepo `backend/` +
`frontend/` do plan.md.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Pode rodar em paralelo (arquivos diferentes, sem dependência pendente)
- **[Story]**: US1–US4 conforme spec.md

## Path Conventions

- Backend: `backend/src/{api,application,domain}/...`, testes `backend/tests/...`
- Frontend: `frontend/src/...`, testes co-localizados `*.test.tsx`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Estrutura de pastas do novo módulo vertical (o monorepo já existe).

- [X] T001 [P] Criar pastas do módulo backend `backend/src/api/credit-card/`, `backend/src/application/credit-card/`, `backend/src/domain/credit-card/` e a pasta frontend `frontend/src/components/credit-cards/`
- [X] T002 [P] Criar o diretório da migração `backend/prisma/migrations/2026XXXX_012_credit_card_management/` (skeleton `migration.sql` vazio)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Schema e migração que TODAS as histórias dependem.

**⚠️ CRITICAL**: Nenhuma user story começa até esta fase terminar.

- [X] T003 Atualizar `backend/prisma/schema.prisma`: adicionar `model CreditCard` (id, groupId, name VarChar(60), normalizedName generated `@ignore`, closingDay Int, status, timestamps) + `enum CreditCardStatus { ACTIVE, ARCHIVED }`; adicionar à `Bill` os campos `creditCardId` (FK `CreditCard`, `onDelete: Restrict`), `isFatura Boolean @default(false)`, `settledByFaturaId` (self-FK relação `FaturaSettlement`, `onDelete: SetNull`) + relações `creditCard`/`settledByFatura`/`settledCharges` e `@@index([creditCardId])`
- [X] T004 Escrever `backend/prisma/migrations/2026XXXX_012_credit_card_management/migration.sql`: `CREATE TYPE "CreditCardStatus"`; `CREATE TABLE "CreditCard"` + coluna gerada `normalizedName` (`GENERATED ALWAYS` collation `pt_BR_ci_as`); índice `credit_card_group_idx`; **único parcial** `(groupId, normalizedName) WHERE status='ACTIVE'`; `ALTER TABLE "Bill"` add `creditCardId`/`isFatura`/`settledByFaturaId` + FKs + índice `bill_credit_card_idx` + **único parcial** `(creditCardId) WHERE isFatura AND status='PENDING'`. SEM conversão de dados (data-model.md §Migração)
- [X] T005 [P] Teste estrutural da migração em `backend/tests/migration/credit-card-management.test.ts`: tabela/colunas/enum/índices existem; bills `CREDIT_CARD` pré-feature permanecem `creditCardId=NULL`/`isFatura=false` (R4); nenhum total histórico alterado
- [X] T006 Aplicar a migração e regenerar o client (`npm -w backend run prisma:migrate` + `prisma generate`)

**Checkpoint**: Schema pronto — as histórias podem começar.

---

## Phase 3: User Story 1 - Registrar e gerenciar cartões (Priority: P1) 🎯 MVP

**Goal**: CRUD de cartões do grupo (nome + dia de fechamento), com nome único
entre ativos, arquivamento e guarda de deleção.

**Independent Test**: Criar um cartão, vê-lo na lista, renomear, arquivar (some
da seleção, permanece no histórico); deletar cartão com contas é bloqueado.

### Tests for User Story 1 ⚠️ (escrever falhando primeiro)

- [X] T007 [P] [US1] Testes de contrato dos endpoints de cartão em `backend/tests/api/credit-cards/crud.test.ts` (POST 201/400 nome duplicado-ativo/fechamento inválido; GET lista 200; GET :id 200/404; PATCH 200/400/404; archive 200; DELETE 204/409 `credit_card.has_bills`; 401/403; isolamento de grupo)
- [X] T008 [P] [US1] Testes unitários em `backend/tests/application/credit-card/manage.test.ts` (criar com nome único entre ativos, fechamento 1–31; renomear; arquivar; guarda de deleção)

### Implementation for User Story 1

- [X] T009 [US1] `backend/src/domain/credit-card/credit-card.repository.ts`: `create`, `findById` (escopo grupo), `listByGroup`, `update`, `archive`, `countBills`, `delete`
- [X] T010 [P] [US1] `backend/src/api/credit-card/credit-card.validators.ts`: `createCardBody` (nome 1–60, closingDay 1–31), `updateCardBody`
- [X] T011 [P] [US1] `backend/src/api/credit-card/credit-card.serializer.ts`: mapear cartão → `{ id, name, closingDay, status, openChargesCents }` (aberto fixo em 0 até US3)
- [X] T012 [US1] `backend/src/application/credit-card/create-credit-card.use-case.ts` (nome único entre ativos → `credit_card.duplicate_name`)
- [X] T013 [P] [US1] `backend/src/application/credit-card/update-credit-card.use-case.ts` (renomear/closingDay)
- [X] T014 [P] [US1] `backend/src/application/credit-card/archive-credit-card.use-case.ts`
- [X] T015 [P] [US1] `backend/src/application/credit-card/delete-credit-card.use-case.ts` (bloqueia se `countBills>0` → `credit_card.has_bills`)
- [X] T016 [P] [US1] `backend/src/application/credit-card/list-credit-cards.use-case.ts` e `get-credit-card.use-case.ts` (cartão; aberto vazio/0 até US3)
- [X] T017 [US1] `backend/src/api/credit-card/credit-card.router.ts`: POST/GET/GET:id/PATCH/`:id/archive`/DELETE com `authMiddleware`+`requireMembership` e logs JSON estruturados; montar em `backend/src/app.ts` sob `/api/v1/credit-cards`
- [X] T018 [P] [US1] Frontend base: `frontend/src/types/credit-card.ts`, `frontend/src/services/credit-card.service.ts`, `frontend/src/hooks/useCreditCards.ts` (CRUD)
- [X] T019 [US1] `frontend/src/pages/CreditCardsPage.tsx` + `frontend/src/components/credit-cards/CreditCardList.tsx` + `CreditCardFormModal.tsx`; item de nav em `frontend/src/config/navigation.ts`; rota `/cartoes` em `frontend/src/router/AppRouter.tsx`
- [X] T020 [P] [US1] RTL em `frontend/src/components/credit-cards/CreditCards.test.tsx` (lista, criar/renomear/arquivar, validação PT-BR)

**Checkpoint**: US1 funcional e testável de forma independente (CRUD de cartões).

---

## Phase 4: User Story 2 - Atribuir um gasto a um cartão (Priority: P1)

**Goal**: Ao registrar gasto no crédito, exigir e gravar o cartão; débito não
carrega cartão; editar pode mover a compra entre cartões.

**Independent Test**: Registrar gasto no crédito selecionando um cartão; conta
no orçamento na data da compra e fica vinculado ao cartão; débito não oferece
cartão.

**Depends on**: Foundational (colunas na Bill). US1 fornece cartões para
selecionar.

### Tests for User Story 2 ⚠️

- [X] T021 [P] [US2] Unit em `backend/tests/application/bill/credit-card-link.test.ts` (crédito ⇒ `creditCardId` obrigatório e cartão ativo do grupo; débito ⇒ ausente; editar move entre cartões)
- [X] T022 [P] [US2] Contrato em `backend/tests/api/bills/credit-card-field.test.ts` (`POST /bills/log`, `POST /bills`, `PATCH /bills/:id` com `creditCardId`; 400 `credit_card.required`/`credit_card.not_allowed`)

### Implementation for User Story 2

- [X] T023 [US2] `backend/src/domain/bill/bill.repository.ts`: incluir `creditCard` no `billInclude`; `create`/`update` aceitam `creditCardId`; estender `BillWithRelations`/`CreateBillData`/`UpdateBillData` com `creditCardId`/`isFatura`
- [X] T024 [P] [US2] `backend/src/api/bill/bill.serializer.ts`: adicionar `creditCard { id, name }` e `isFatura` ao envelope
- [X] T025 [P] [US2] `backend/src/api/bill/bill.validators.ts`: `creditCardId` em `logSpendingBody`/`createBillBody`/`updateBillBody` com regra cruzada (crédito⇒obrigatório; débito⇒proibido)
- [X] T026 [US2] `backend/src/application/bill/log-spending.use-case.ts`: validar cartão ativo do grupo (`credit_card.required`/`not_allowed`)
- [X] T027 [US2] `backend/src/application/bill/create-bill.use-case.ts` e `update-bill.use-case.ts`: mesma validação; editar mantém consistência de cartão
- [X] T028 [P] [US2] `frontend/src/types/bill.ts`: `creditCardId`/`isFatura`/`creditCard`
- [X] T029 [US2] `frontend/src/components/bills/QuickLogModal.tsx`: seletor de cartão visível apenas quando método = crédito (obrigatório)
- [X] T030 [US2] `frontend/src/components/bills/BillFormModal.tsx`: idem
- [X] T031 [P] [US2] RTL em `frontend/src/components/bills/QuickLogModal.test.tsx` (seletor aparece/some por método; envio com cartão)

**Checkpoint**: Compras de crédito ficam atribuídas a um cartão.

---

## Phase 5: User Story 3 - Ver o que está acumulando no cartão (Priority: P1)

**Goal**: Visão por cartão com compras em aberto + total corrente; resumo de
aberto por cartão no tracker; agrupamento por ciclo via dia de fechamento.

**Independent Test**: Com compras de crédito em um cartão e sem fatura paga, a
visão por cartão lista os abertos e o total = soma; o tracker mostra o mesmo
total por cartão.

**Depends on**: US1 (cartões) + US2 (compras vinculadas).

### Tests for User Story 3 ⚠️

- [X] T032 [P] [US3] Unit em `backend/tests/application/credit-card/open-charges.test.ts` (`openChargesByCard` = soma de compras crédito PAID com `settledByFaturaId` nulo; lista por cartão; agrupamento de ciclo por `closingDay`)
- [X] T033 [P] [US3] Contrato em `backend/tests/api/credit-cards/open-charges.test.ts` (`GET /credit-cards` traz `openChargesCents`; `GET /credit-cards/:id` traz `openCharges[]` + total)

### Implementation for User Story 3

- [X] T034 [US3] `backend/src/domain/credit-card/credit-card.repository.ts`: `openChargesByCard` (`groupBy(creditCardId)` filtrando `isFatura=false, paymentMethod=CREDIT_CARD, status=PAID, settledByFaturaId=null`) e `openChargesList(cardId)`
- [X] T035 [P] [US3] `backend/src/application/credit-card/credit-card-cycle.ts`: helper que deriva o ciclo corrente a partir de `closingDay` + hoje para rotular/agrupar abertos (FR-001a; sem efeito em quitação)
- [X] T036 [US3] `list-credit-cards.use-case.ts` e `get-credit-card.use-case.ts`: ligar o `openChargesCents` real e os abertos agrupados por ciclo
- [X] T037 [US3] `backend/src/api/credit-card/credit-card.serializer.ts`: serializar `openCharges[]` (OpenCharge) e `openChargesCents` reais
- [X] T038 [US3] `frontend/src/components/credit-cards/CreditCardDetail.tsx`: lista de abertos + total corrente; ligar a partir de `CreditCardsPage`
- [X] T039 [US3] `frontend/src/components/credit-cards/CreditCardSummarySection.tsx` + integrar em `frontend/src/pages/PaymentsPage.tsx` (resumo de aberto por cartão)
- [X] T040 [P] [US3] RTL em `frontend/src/components/credit-cards/CreditCardDetail.test.tsx` e do resumo no tracker

**Checkpoint**: Visibilidade de aberto por cartão funcional.

---

## Phase 6: User Story 4 - Registrar fatura sem dupla contagem (Priority: P1)

**Goal**: Registrar fatura (ação dedicada, 1 pendente por cartão); pagar quita
por snapshot as compras abertas; reverter desfaz exatamente; fatura paga fora do
orçamento.

**Independent Test**: Com aberto em um cartão, registrar+pagar a fatura derruba o
aberto e NÃO aumenta o total do dashboard; reverter restaura o aberto.

**Depends on**: US2 (compras vinculadas) + US3 (cálculo de aberto).

### Tests for User Story 4 ⚠️

- [X] T041 [P] [US4] Unit `register-fatura` em `backend/tests/application/credit-card/register-fatura.test.ts` (cria Bill `isFatura` PENDING; bloqueia 2ª pendente `fatura.pending_exists` — FR-012a; **aceita cartão arquivado** do grupo — edge case "arquivar cartão com aberto e ainda registrar/pagar a fatura"; **valor pode diferir** da soma dos abertos e ainda salva/quita — FR-012)
- [X] T042 [P] [US4] Unit quitação em `backend/tests/application/bill/pay-fatura-settlement.test.ts` (pagar marca `settledByFaturaId` nos abertos do cartão; idempotente; reverter limpa exatamente o conjunto — FR-009/SC-005)
- [X] T043 [P] [US4] Unit exclusão em `backend/tests/application/bill/aggregate-excludes-fatura.test.ts` (`aggregateMonthSpending` ignora `isFatura=true`; compras seguem contando — FR-010/SC-004)
- [X] T044 [P] [US4] Contrato em `backend/tests/api/credit-cards/faturas.test.ts` (`POST /credit-cards/:id/faturas` 201/400/409; efeito de pagar/reverter no aberto)

### Implementation for User Story 4

- [X] T045 [P] [US4] `backend/src/api/credit-card/credit-card.validators.ts`: `registerFaturaBody` (valor>0, dueDate, descrição opcional)
- [X] T046 [US4] `backend/src/application/credit-card/register-fatura.use-case.ts`: cria Bill `isFatura=true` PENDING; valida cartão **do grupo, ativo OU arquivado** (a regra "somente ativo" vale só para compras em T026/T027, não para fatura — FR-002/edge case); aceita valor que difere da soma dos abertos (FR-012); guarda `fatura.pending_exists` (FR-012a)
- [X] T047 [US4] `backend/src/domain/bill/bill.repository.ts`: `settleOpenCharges(cardId, faturaId, tx)` + `unsettle(faturaId, tx)`; adicionar `isFatura: false` ao `where` de `aggregateMonthSpending` (FR-010)
- [X] T048 [US4] `backend/src/application/bill/pay-bill.use-case.ts`: se `bill.isFatura`, quitar abertos por snapshot na mesma transação do pagamento (FR-009)
- [X] T049 [US4] `backend/src/application/bill/revert-payment.use-case.ts`: se `bill.isFatura`, estornar (`unsettle`) na mesma transação (FR-009)
- [X] T050 [US4] `backend/src/api/credit-card/credit-card.router.ts`: `POST /:id/faturas` com logs; pagar/reverter reaproveitam `POST /bills/:id/pay` e `DELETE /bills/:id/payment`
- [X] T051 [US4] `frontend/src/components/credit-cards/RegisterFaturaModal.tsx` + ligar a `CreditCardDetail`/`CreditCardsPage`
- [X] T052 [US4] `frontend/src/hooks/useCreditCards.ts`: mutação `registerFatura`; pagar/reverter via serviço de conta existente
- [X] T053 [P] [US4] RTL em `frontend/src/components/credit-cards/RegisterFaturaModal.test.tsx` (registrar; bloqueio de 2ª pendente; fluxo pagar→aberto zera)

**Checkpoint**: Ciclo completo de fatura sem dupla contagem.

---

## Phase 7: Polish & Cross-Cutting Concerns

- [X] T054 [P] Revisar mensagens/códigos de erro PT-BR (`credit_card.*`, `fatura.*`) e consistência do envelope flat
- [X] T055 [P] Confirmar logs JSON estruturados em todas as mutações de cartão/fatura (sem valores monetários — Princípio V)
- [X] T056 Validar `quickstart.md` de ponta a ponta (passos 1–7)
- [X] T057 Suíte completa verde (backend + frontend); confirmar que totais históricos do dashboard não mudaram (SC-002 não afetado)
- [X] T058 [P] Teste-guarda em `backend/tests/application/bill/no-fatura-from-recurring-or-copy.test.ts`: `copy-previous-month` e a materialização de recorrência **nunca** produzem `isFatura=true` (FR-005 — fatura só pela ação dedicada)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Fase 1)**: sem dependências.
- **Foundational (Fase 2)**: depende do Setup — **bloqueia** todas as histórias.
- **US1 (Fase 3)**: após Foundational. MVP independente.
- **US2 (Fase 4)**: após Foundational; usa cartões de US1 na UI.
- **US3 (Fase 5)**: após US1 + US2 (precisa de compras vinculadas).
- **US4 (Fase 6)**: após US2 + US3 (aberto para quitar).
- **Polish (Fase 7)**: após as histórias desejadas.

### Within Each User Story

- Testes escritos e **falhando** antes da implementação (Princípio II).
- Repository/model antes de use case; use case antes de router/UI.

### Parallel Opportunities

- Setup T001/T002 em paralelo.
- Dentro de cada história, tarefas `[P]` (arquivos distintos) em paralelo — ex.
  validators + serializer + tipos de frontend; todos os testes `[P]` de uma
  história juntos.
- Backend e frontend de uma mesma história podem andar em paralelo após o
  contrato (serializer/tipos) estar definido.

---

## Parallel Example: User Story 1

```bash
# Testes da US1 juntos (devem falhar primeiro):
Task: "T007 contrato dos endpoints de cartão em backend/tests/api/credit-cards/crud.test.ts"
Task: "T008 unit de manage em backend/tests/application/credit-card/manage.test.ts"

# Implementação paralela (arquivos distintos):
Task: "T010 credit-card.validators.ts"
Task: "T011 credit-card.serializer.ts"
Task: "T018 frontend base (types/service/hook)"
```

---

## Implementation Strategy

### MVP First (US1)

1. Fase 1 Setup → 2. Fase 2 Foundational → 3. Fase 3 US1 → 4. **VALIDAR** CRUD de
   cartões isolado → 5. demo.

### Incremental Delivery

US1 (cartões) → US2 (vincular gasto) → US3 (ver aberto) → US4 (fatura sem dupla
contagem). Cada incremento agrega valor sem quebrar o anterior.

---

## Notes

- `[P]` = arquivos diferentes, sem dependência pendente.
- Verificar que os testes falham antes de implementar (TDD, Princípio II).
- Commit após cada tarefa ou grupo lógico.
- Total: **58 tarefas** — Setup 2, Foundational 4, US1 14, US2 11, US3 9,
  US4 13, Polish 5.
