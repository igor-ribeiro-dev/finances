# Implementation Plan: Credit Card Management (Gerenciamento de Cartões de Crédito)

**Branch**: `012-credit-card-management` | **Date**: 2026-06-16 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/012-credit-card-management/spec.md`

## Summary

Introduzir a entidade **CreditCard (Cartão de Crédito)** no grupo familiar e
estender a `Bill` (feature 010/011) para suportar dois papéis ligados a um
cartão — **compra no cartão** e **fatura** — sem dupla contagem no orçamento.
Sobre o modelo consolidado (toda despesa é uma `Bill` Paga), as entregas são:

1. **CRUD de cartões** — novo módulo `credit-card/` com criar, renomear,
   arquivar e listar cartões do grupo (nome + dia de fechamento). Nome único
   entre cartões **ativos**; cartão com contas/faturas não é deletável, só
   arquivável (FR-001, FR-002).
2. **Atribuir compra a um cartão** — o fluxo "registrar gasto"
   (`POST /bills/log`) e os fluxos de criar/editar conta ganham `creditCardId`.
   Regra de borda: método `CREDIT_CARD` ⇒ `creditCardId` obrigatório (cartão
   ativo do grupo); `CASH_OR_DEBIT` ⇒ sem cartão (FR-003). A compra segue
   contando no orçamento na data da compra, inalterado (FR-004).
3. **Visão por cartão + total em aberto** — `GET /credit-cards/:id` lista as
   compras em aberto do cartão (não quitadas por fatura paga) com total
   corrente; `GET /credit-cards` traz `openChargesCents` por cartão, consumido
   tanto pela página de Cartões quanto pela seção-resumo no tracker (FR-006,
   FR-007).
4. **Registrar e pagar fatura sem dupla contagem** — ação dedicada
   `POST /credit-cards/:id/faturas` cria uma `Bill` com marcador `isFatura=true`
   no estado **PENDING** (FR-005, FR-008). No máximo **uma** fatura pendente por
   cartão (FR-012a, índice único parcial). **Pagar** a fatura (reaproveitando
   `POST /bills/:id/pay`) quita por **snapshot** as compras em aberto do cartão
   naquele instante: marca `settledByFaturaId` nas compras abertas; **reverter**
   a fatura limpa exatamente esse vínculo (FR-009). A fatura é **excluída** do
   orçamento/dashboard (`isFatura=false` no `aggregateMonthSpending`), pois as
   compras-filhas já contaram na data da compra (FR-010).
5. **Frontend** — nova página "Cartões" (nav + CRUD + visão por cartão),
   seleção de cartão no `QuickLogModal`/`BillFormModal` quando o método é
   crédito, modal dedicado "registrar fatura", e seção-resumo de aberto por
   cartão no `PaymentsPage` (FR-013, PT-BR).

Saldo de complexidade: **positivo controlado** — 1 entidade nova justificada por
necessidade presente, 3 colunas na `Bill` (1 FK de cartão, 1 flag de fatura,
1 self-FK de quitação), 1 módulo vertical novo e ~6 endpoints. A regra de
quitação é a mais simples que honra snapshot + reversão (FR-009).

## Technical Context

**Language/Version**: Node.js 20 LTS + TypeScript 5 (strict) — backend Express,
frontend React SPA, inalterado desde as features 004–011.

**Primary Dependencies**:

- **Backend** (sem libs novas): Express 4, Prisma 7 com `@prisma/adapter-pg`,
  Zod 4, Jest 30 + Supertest. Reutiliza `auth.middleware` +
  `require-membership.middleware`, o envelope de erro flat
  `{ code, message, fieldErrors? }`, `zodErrorToFieldErrors` e o padrão de
  unicidade case-insensitive por coluna gerada `normalizedName` (igual a
  `Category`). Estende o módulo `bill/` (pay/revert + validators) e adiciona o
  módulo `credit-card/` nas três camadas.
- **Frontend** (sem libs novas): React 18, React Router DOM v7, Tailwind 3,
  Lucide, Jest + React Testing Library. Reaproveita `PaymentsPage`,
  `QuickLogModal`, `BillFormModal`, `MonthSelector`, `utils/money.ts`. Adiciona
  página/serviço/tipos de cartão.

**Storage**: Postgres 15 — **1 migração nova**
(`2026XXXX_012_credit_card_management`): cria `CreditCard` + enum
`CreditCardStatus`; adiciona `Bill.creditCardId` (FK `CreditCard`, **Restrict**),
`Bill.isFatura` (Boolean default false) e `Bill.settledByFaturaId` (self-FK,
**SetNull**); índices `(creditCardId)` e os dois **parciais em SQL bruto**:
unicidade de nome por cartão ativo `(groupId, normalizedName) WHERE status=ACTIVE`
e **uma fatura pendente por cartão** `(creditCardId) WHERE isFatura AND status=PENDING`.
Sem conversão de dados: bills `CREDIT_CARD` históricas ficam com `creditCardId`
nulo (grandfathered — fora das visões por cartão). Detalhes em data-model.md.

**Testing**:

- Backend: Jest + Supertest — unitários do CRUD de cartão (nome único entre
  ativos, dia de fechamento 1–31, guarda de deleção, arquivamento); validação
  de `creditCardId` em `log-spending`/create/update (crédito⇒obrigatório;
  débito⇒ausente; cartão ativo do grupo); **quitação por snapshot** em
  `pay-bill` quando `isFatura` (marca `settledByFaturaId` nas abertas;
  idempotente; revert limpa exatamente o conjunto = FR-009); guarda de **uma
  fatura pendente por cartão** (FR-012a); `aggregateMonthSpending` **exclui
  faturas** (FR-010/SC-004) e mantém compras; cálculo de `openChargesCents`
  (soma de compras `CREDIT_CARD` pagas do cartão com `settledByFaturaId` nulo =
  SC-003/SC-005). Contratos HTTP dos 6 endpoints (201/200/400 por campo/401/403,
  isolamento de grupo).
- Frontend: Jest + RTL — `CreditCardsPage`/`CreditCardFormModal` (CRUD,
  validação), `CreditCardDetail` (lista de abertos + total), seletor de cartão
  no `QuickLogModal`/`BillFormModal` (aparece só no método crédito),
  `RegisterFaturaModal`, seção-resumo por cartão no `PaymentsPage`, item de nav
  "Cartões".

**Target Platform**: Backend Node.js 20 LTS; frontend navegadores modernos
(Chrome 115+, Firefox 120+, Safari 17+). Inalterado.

**Project Type**: Web monorepo (npm workspaces) com `backend/` e `frontend/`,
estrutura das features 001/004–011.

**Performance Goals**:

- SC-001: registrar um cartão e tê-lo disponível na seleção em < 30 s — criar
  cartão é 1 INSERT; a lista de cartões fica em cache da página.
- `openChargesCents` por cartão: 1 `groupBy(creditCardId)` sobre `Bill` filtrando
  `(groupId, isFatura=false, paymentMethod=CREDIT_CARD, status=PAID,
  settledByFaturaId=null)`, suportado pelo índice `(creditCardId)`. Visão por
  cartão: 1 `findMany` com o mesmo filtro para um `creditCardId`.
- Dashboard: a única mudança é acrescentar `isFatura=false` ao `where` do
  `aggregateMonthSpending` — sem custo adicional relevante.

**Constraints**:

- Valores monetários sempre `Int` (centavos) ponta a ponta (Princípio III).
- Mês civil sem timezone: atribuição de orçamento por `paidDate` (inalterado);
  o **dia de fechamento** é informativo/agrupamento (FR-001a) e **não** governa
  quitação — quitação é por estado no pagamento (snapshot, FR-009).
- Estados/transições da `Bill` inalterados (010/011); a fatura é uma `Bill`
  comum com `isFatura=true` e segue PENDING/PAID/CANCELLED. Pagar/reverter a
  fatura aciona quitação/estorno das compras em transação.
- PT-BR exclusivamente (FR-013); WCAG 2.1 AA herdado.
- Envelope de erro flat reutilizado; novos códigos sob `credit_card.*` e
  `fatura.*` (ex.: `credit_card.has_bills`, `fatura.pending_exists`).

**Scale/Scope**: Família 2–10 membros, 1–6 cartões, ~5–40 compras/mês por
cartão. 1 entidade nova, 1 enum, 3 colunas + 3 índices na/relativos à `Bill`,
1 módulo vertical novo (api/application/domain), ~6 endpoints, 1 página nova +
ajustes em 3 componentes existentes, 1 migração de schema **sem** conversão de
dados.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Princípio | Status | Notas |
|-----------|--------|-------|
| **I. API-First** | PASS | `contracts/openapi.yaml` definido no Phase 1 ANTES do código: 6 operações novas (`/credit-cards` CRUD + `/credit-cards/:id/faturas`) e os campos **aditivos** `creditCardId` em `POST /bills/log`, `POST /bills`, `PATCH /bills/:id`, mais `creditCard`/`isFatura` no envelope de conta. Nenhuma quebra de contrato existente (apenas adições). |
| **II. Test-First (NON-NEGOTIABLE)** | APPLIES | TDD. Ordem: (1) unit de cartão (CRUD/unicidade/guarda), de quitação snapshot em `pay/revert` e do `openChargesCents`/exclusão de fatura no agregador **falhando** → implementação; (2) contratos HTTP dos 6 endpoints + campos aditivos **falhando** → backend; (3) RTL de `CreditCardsPage`/`CreditCardDetail`/seletor de cartão/`RegisterFaturaModal`/resumo no tracker **falhando** → frontend. Cobertura crítica: SC-003 (total em aberto = compras não quitadas), SC-004 (zero dupla contagem: fatura fora do orçamento), SC-005 (pagar/reverter fatura move o aberto exatamente), FR-012a (1 fatura pendente). |
| **III. Security & Data Integrity** | PASS | Auth + `requireMembership` em todos os endpoints; escopo por `groupId` (cartão e suas contas); centavos inteiros; Zod na borda (nome 1–60, fechamento 1–31, valor>0, `creditCardId` é cartão ativo do grupo). Quit/estorno de fatura em **transação** (snapshot consistente). FKs com `onDelete` explícito: `Bill.creditCardId` **Restrict** (não deleta cartão com contas — reforça FR-002), `settledByFaturaId` **SetNull**. Sem valores monetários em log. |
| **IV. Simplicity** | PASS | 1 entidade nova é necessidade presente (não há como atribuir gasto a cartão sem ela). Quitação modelada por **um** campo `settledByFaturaId` (snapshot + reversão exata) — alternativas (intervalo por data de corte, seleção manual) foram rejeitadas na clarificação por exigirem mais modelagem/fricção. Sem conversão de dados (históricas grandfathered). Reaproveita pay/revert/validators existentes em vez de endpoints paralelos. Sem entradas em Complexity Tracking. |
| **V. Observability** | PASS | Log JSON estruturado nas mutações de cartão e fatura (userId, groupId, creditCardId/billId, action, outcome — sem valores). Erros machine-readable (`credit_card.*`, `fatura.*` + validação). `/health` inalterado. |

**Gate result: PASS** — Phase 0 pode iniciar. Re-avaliado após o Phase 1
(abaixo): **PASS mantido**, sem entradas em Complexity Tracking.

## Project Structure

### Documentation (this feature)

```text
specs/012-credit-card-management/
├── plan.md              # Este arquivo
├── spec.md              # Especificação (1 sessão de clarification: Q1–Q5)
├── research.md          # Phase 0 output (R1–R8)
├── data-model.md        # Phase 1 output (CreditCard; mudanças em Bill; migração)
├── quickstart.md        # Phase 1 output
├── contracts/
│   └── openapi.yaml     # Phase 1 output — /credit-cards + /faturas + campos aditivos
├── checklists/
│   └── requirements.md  # Feito no /speckit-specify
└── tasks.md             # Phase 2 output (gerado por /speckit-tasks)
```

### Source Code (repository root)

```text
backend/
├── prisma/
│   ├── schema.prisma                               # MODIFICADO — + model CreditCard + enum CreditCardStatus; Bill ganha creditCardId (FK Restrict) / isFatura (default false) / settledByFaturaId (self-FK SetNull) + relações; índice Bill(creditCardId)
│   └── migrations/2026XXXX_012_credit_card_management/  # NOVO — cria CreditCard (+ normalizedName generated, pt_BR_ci_as); add colunas/índice na Bill; 2 índices únicos parciais (nome por ativo; 1 fatura pendente/cartão). SEM conversão de dados
└── src/
    ├── api/
    │   ├── credit-card/
    │   │   ├── credit-card.router.ts              # NOVO — POST/GET/GET:id/PATCH:id/archive + POST :id/faturas
    │   │   ├── credit-card.validators.ts          # NOVO — createCardBody, updateCardBody, registerFaturaBody (Zod)
    │   │   └── credit-card.serializer.ts          # NOVO — card + openChargesCents; visão por cartão
    │   └── bill/
    │       ├── bill.validators.ts                 # MODIFICADO — creditCardId em log/create/update (crédito⇒obrig.; débito⇒ausente)
    │       └── bill.serializer.ts                 # MODIFICADO — + creditCard { id, name }, isFatura
    ├── application/
    │   ├── credit-card/
    │   │   ├── create-credit-card.use-case.ts     # NOVO — FR-001 (nome único ativo, fechamento 1–31)
    │   │   ├── update-credit-card.use-case.ts     # NOVO — renomear / dia de fechamento
    │   │   ├── archive-credit-card.use-case.ts    # NOVO — FR-002
    │   │   ├── list-credit-cards.use-case.ts      # NOVO — cartões + openChargesCents (FR-007)
    │   │   ├── get-credit-card.use-case.ts        # NOVO — visão por cartão: abertos + total (FR-006)
    │   │   └── register-fatura.use-case.ts        # NOVO — cria Bill isFatura PENDING; bloqueia 2ª pendente (FR-005/008/012a)
    │   └── bill/
    │       ├── log-spending.use-case.ts           # MODIFICADO — aceita/valida creditCardId (FR-003)
    │       ├── create-bill.use-case.ts            # MODIFICADO — idem
    │       ├── update-bill.use-case.ts            # MODIFICADO — idem; mover entre cartões recalcula aberto
    │       ├── pay-bill.use-case.ts               # MODIFICADO — se isFatura: quita por snapshot (settledByFaturaId) em transação (FR-009)
    │       └── revert-payment.use-case.ts         # MODIFICADO — se isFatura: limpa o conjunto quitado (FR-009)
    ├── domain/
    │   ├── credit-card/credit-card.repository.ts  # NOVO — CRUD; openChargesByCard (groupBy); openChargesList
    │   └── bill/bill.repository.ts                # MODIFICADO — include creditCard; create/update aceitam creditCardId/isFatura/settledByFaturaId; aggregateMonthSpending + isFatura:false; settle/unsettle helpers
    └── app.ts                                      # MODIFICADO — mount creditCardRouter em /api/v1/credit-cards

frontend/
└── src/
    ├── config/navigation.ts                        # MODIFICADO — + item "cartões"
    ├── router/AppRouter.tsx                         # MODIFICADO — rota /cartoes → CreditCardsPage
    ├── pages/
    │   ├── CreditCardsPage.tsx                     # NOVO — lista + CRUD + entrada para visão por cartão
    │   └── PaymentsPage.tsx                        # MODIFICADO — seção-resumo de aberto por cartão
    ├── components/credit-cards/
    │   ├── CreditCardList.tsx                      # NOVO
    │   ├── CreditCardFormModal.tsx                 # NOVO — criar/renomear/fechamento
    │   ├── CreditCardDetail.tsx                    # NOVO — abertos + total corrente (FR-006)
    │   ├── CreditCardSummarySection.tsx            # NOVO — resumo por cartão no tracker (FR-007)
    │   └── RegisterFaturaModal.tsx                 # NOVO — ação dedicada "registrar fatura" (FR-005)
    ├── components/bills/
    │   ├── QuickLogModal.tsx                       # MODIFICADO — seletor de cartão quando método=crédito (FR-003)
    │   └── BillFormModal.tsx                       # MODIFICADO — idem
    ├── hooks/useCreditCards.ts                      # NOVO — query/mutations de cartão + fatura
    ├── services/credit-card.service.ts             # NOVO
    └── types/credit-card.ts                         # NOVO + creditCardId/isFatura em types/bill.ts (MODIFICADO)

backend/tests/
├── application/credit-card/*.test.ts               # NOVO — CRUD, unicidade, guarda, register-fatura/1-pendente
├── application/bill/pay-fatura-settlement.test.ts  # NOVO — snapshot + revert exato (FR-009/SC-005)
├── application/bill/aggregate-excludes-fatura.test.ts # NOVO — FR-010/SC-004
├── application/bill/log-spending.test.ts           # MODIFICADO — validação creditCardId (FR-003)
├── api/credit-cards/*.test.ts                      # NOVO — contratos dos 6 endpoints
└── api/bills/*.test.ts                             # MODIFICADO — campos aditivos creditCardId/isFatura

frontend/src/components/credit-cards/*.test.tsx     # NOVO
frontend/src/components/bills/QuickLogModal.test.tsx# MODIFICADO — seletor de cartão
```

**Structure Decision**: Web monorepo existente (Opção 2). A feature é
predominantemente **aditiva**: cria um módulo vertical `credit-card/` nas três
camadas (espelhando o padrão de `bill/`) e estende a `Bill`/o módulo `bill/`
nos pontos de integração (validação de `creditCardId`, quitação de fatura em
pay/revert, exclusão de fatura no agregador do dashboard). Nenhum contrato
existente é quebrado; nenhuma conversão de dados é necessária (bills de crédito
históricas ficam sem cartão, fora das visões por cartão).

## Complexity Tracking

> Sem violações de constituição a justificar — tabela intencionalmente vazia.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| — | — | — |
