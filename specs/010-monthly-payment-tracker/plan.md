# Implementation Plan: Monthly Payment Tracker (Contas do Mês)

**Branch**: `010-monthly-payment-tracker` | **Date**: 2026-06-11 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/010-monthly-payment-tracker/spec.md`

## Summary

Entregar o controle de pagamentos mensais: um checklist por mês civil de
obrigações financeiras (**Bill/Conta**) com três estados (Pendente, Paga,
Cancelada), valor esperado separado do valor real pago, e criação automática
da despesa correspondente ao pagar — integrando-se ao orçamento e dashboard
existentes sem dupla contagem. Inclui **contas fixas (RecurringBill)**: um
template cadastrado uma vez (intervalo mensal ou anual, dia de vencimento,
valor estimado) gera a instância Pendente de cada mês aplicável
automaticamente, com pausa, encerramento e exclusão preservando histórico.
Backend ganha duas tabelas novas (`Bill`, `RecurringBill`, 1 migração) e dois
módulos verticais REST (`/api/v1/bills`, `/api/v1/recurring-bills`); a
geração de instâncias é feita por **job agendado in-process** (timer diário
+ boot, com catch-up na criação/retomada do template) materializando apenas
a **janela mês corrente + seguinte** — idempotente via unique
`(recurringBillId, month)` + regra `activeFromMonth`; meses além da janela
aparecem como **projeções virtuais read-only ("Prevista")** calculadas do
template no GET, que é 100% leitura (ver research R1/R2). Pagar uma conta cria a `Expense` na mesma transação; a
despesa vinculada (`Bill.expenseId` unique) fica somente leitura no módulo de
despesas (409 `expense.managed_by_bill` em update/delete) e é
atualizada/removida pelas operações de pagamento da conta. Frontend adiciona
a rota `/pagamentos` (nav no `AppLayout`), página com seletor de mês
reutilizado (008/009), resumo (esperado/pago/pendente em centavos),
checklist com ações por estado, modal de pagamento, ação "copiar mês
anterior" (só avulsas, com contagem prévia) e gestão de contas fixas.

## Technical Context

**Language/Version**: Node.js 20 LTS + TypeScript 5 (strict mode) — backend Express e frontend React SPA, inalterado desde as features 004–009.

**Primary Dependencies**:

- **Backend existentes** (sem mudanças): Express 4, Prisma 7 com `@prisma/adapter-pg`, Zod 4, Jest 30 + Supertest. Middlewares `auth.middleware.ts` + `require-membership.middleware.ts` reutilizados em todos os endpoints novos. `create-expense.use-case.ts` NÃO é reutilizado diretamente (idempotência/validações próprias de borda); a criação da despesa vinculada ocorre via `expense.repository` dentro da transação de pagamento (ver research R3).
- **Backend novas**: nenhuma.
- **Frontend existentes** (sem mudanças): React 18, React Router DOM v7, Tailwind 3 (tokens da feature 005), Lucide icons, Jest + React Testing Library. `MonthSelector` (008) reutilizado **sem teto de mês futuro** (tracker permite meses futuros, ao contrário do dashboard); `utils/money.ts` e `utils/month.ts` reutilizados.
- **Frontend novas**: nenhuma.

**Storage**: Postgres 15 — **1 migração nova** (`010_monthly_payment_tracker`): enums `BillStatus (PENDING|PAID|CANCELLED)` e `RecurrenceInterval (MONTHLY|ANNUAL)`; tabela `RecurringBill` (template com `activeFromMonth`, `deletedAt` para soft-delete); tabela `Bill` (instância mensal, `month DATE` normalizado para dia 1, campos de pagamento nullable, `expenseId` FK **unique** para `Expense`, `recurringBillId` FK `SetNull`-proof via soft-delete do template); unique parcial `(recurringBillId, month)` garante idempotência da materialização. `creditCardId` NÃO é criado agora (feature 016 adicionará a coluna; modelo não a impede). Detalhes em data-model.md.

**Testing**:

- Backend: Jest + Supertest — unitários das funções puras (`recurrence-engine.ts`: meses elegíveis, âncora anual = mês do `startMonth`, dia 31 → último dia do mês, `activeFromMonth` pós-resume, janela pausada não gera nem projeta; `bill-summary.ts`: esperado/pago/pendente, canceladas fora, total projetado separado), unitários da materialização (`materialize-window.use-case`: janela {mês corrente, seguinte}, idempotência — rodar 2× não duplica, catch-up pós-downtime no boot, includeStartMonth) e contrato HTTP (`backend/tests/api/bills/`, `backend/tests/api/recurring-bills/`: CRUD, GET com `projectedBills` para meses além da janela (vazio para template pausado/encerrado/excluído), transições de estado válidas/inválidas (409), pagar cria despesa na transação, editar pagamento sincroniza despesa, reverter remove despesa, copiar mês anterior ignora instâncias de recorrência e canceladas, stop/delete cancela Pendentes futuras e preserva passadas, 401/403, isolamento entre grupos, despesa vinculada bloqueada no módulo de despesas).
- Frontend: Jest + React Testing Library — `PaymentsPage` (vazio/carregando/erro, resumo, navegação de mês incluindo futuro), `BillItem` (ações por estado, vencida, badges "fixa"/"Prevista" sem ações), modais de criação/pagamento (pré-preenchimento: valor esperado e data de hoje), copiar mês anterior (confirmação com contagem), gestão de contas fixas (pausar/encerrar/excluir com confirmações, pergunta "incluir mês atual?" quando vencimento já passou), `ExpensesPage` (despesa vinculada sem editar/excluir, aviso apontando para o tracker).

**Target Platform**: Backend Node.js 20 LTS; frontend navegadores modernos (Chrome 115+, Firefox 120+, Safari 17+). Inalterado.

**Project Type**: Web monorepo (npm workspaces) com `backend/` e `frontend/`, estrutura das features 001/004–009.

**Performance Goals**:

- SC-002: resumo do mês visível em ≤ 5 s na abertura — `GET /bills?month` é leitura pura: 1 listagem indexada `(groupId, month)` + projeções calculadas em memória a partir dos templates ativos (≤ ~20); p95 esperado < 200 ms. O job de materialização roda fora do caminho da requisição (boot + timer diário).
- SC-001: cadastro de conta em < 1 min — formulário com 3 campos obrigatórios (descrição, valor, vencimento) e defaults.
- SC-003/SC-006: pagamento/reversão e a despesa correspondente são atômicos (uma transação) — consistência imediata no dashboard ao recarregar.

**Constraints**:

- Valores monetários sempre `Int` (centavos) ponta a ponta (Princípio III); `expectedAmountCents` e `actualAmountCents` separados (FR-005).
- Mês civil sem timezone: `Bill.dueDate DATE` e `Bill.month DATE` (dia 1), mesmo padrão de `Expense.date`/`Budget.month`; a despesa vinculada usa a data do pagamento e por isso conta no orçamento do mês do pagamento (FR-006).
- Estados e transições impostos no backend: `PENDING→PAID` (pay), `PAID→PENDING` (revert), `PENDING→CANCELLED` (cancel), `CANCELLED→PENDING` (reactivate); `PAID→CANCELLED` proibido (FR-009) → 409 `bill.invalid_transition`.
- Despesa vinculada: imutável fora do tracker (FR-007) — `update-expense`/`delete-expense` use cases checam vínculo e devolvem 409 `expense.managed_by_bill`; serializer de despesas expõe `billId` para a UI travar edição.
- PT-BR exclusivamente ("Pendente", "Paga", "Cancelada", "Conta fixa"); WCAG 2.1 AA herdado (estado não comunicado só por cor — badge textual; conta vencida com texto, não só vermelho).
- Envelope de erro flat `{ code, message, fieldErrors? }` reutilizado; códigos novos com prefixos `bill.*` e `recurring_bill.*`.

**Scale/Scope**: Família 2–10 membros, ~5–40 contas/mês, ~3–20 contas fixas. 2 tabelas, 17 endpoints novos em 2 routers (10 em /bills, 7 em /recurring-bills), 1 página + ~9 componentes novos, 1 migração, 2 use cases de despesa modificados.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Princípio | Status | Notas |
|-----------|--------|-------|
| **I. API-First** | PASS | `contracts/openapi.yaml` definido no Phase 1 ANTES de qualquer código — cobre os routers `/api/v1/bills` e `/api/v1/recurring-bills` completos (CRUD, pay/payment/revert, cancel/reactivate, copy com `dryRun`, pause/resume/stop/delete) e a única mudança em contrato existente: campo **aditivo** `billId` no envelope de despesa + erro 409 `expense.managed_by_bill` em PATCH/DELETE de despesa vinculada (não quebra clientes — campo novo nullable e erro novo em situação antes impossível). |
| **II. Test-First (NON-NEGOTIABLE)** | APPLIES | TDD obrigatório. Ordem: (1) testes unitários de `recurrence-engine`/`bill-summary` **falhando** → implementação; (2) testes de contrato HTTP dos dois routers **falhando** → implementação backend; (3) testes RTL **falhando** → implementação frontend. Cobertura crítica: atomicidade pagar/reverter ↔ despesa, idempotência da materialização (2 GETs concorrentes não duplicam instância), stop/delete cancela só Pendentes de meses > atual, âncora anual, dia inexistente → último dia, copy ignora recorrentes/canceladas, bloqueio da despesa vinculada, isolamento entre grupos. |
| **III. Security & Data Integrity** | PASS | Auth + `requireMembership` em todos os endpoints; todas as queries filtram por `groupId` (instâncias e templates pertencem ao grupo). Centavos inteiros ponta a ponta; validação Zod na borda (valores > 0, `dueDay` 1–31, datas válidas). Pagamento/reversão/edição de pagamento em transação Prisma — nunca existe despesa órfã nem conta Paga sem despesa (SC-003/SC-006). Unique `(recurringBillId, month)` previne duplicação em corrida. Sem dados sensíveis em logs (ids e outcome, sem valores em claro). |
| **IV. Simplicity** | PASS | Sem cron/job/scheduler: materialização lazy no GET do mês (research R1) — zero infraestrutura nova. Sem histórico de status do template: regra `activeFromMonth` única cobre pausa/retomada (R2). Reuso de `MonthSelector`, `money.ts`, `month.ts`, padrões de modal/lista das features 006–009. Soft-delete do template (`deletedAt`) em vez de FK SetNull + flag — uma coluna resolve exclusão, "copy ignora recorrentes" e auditoria (R4). Duas entidades novas é o mínimo: template ≠ instância está na própria spec (FR-018–024). |
| **V. Observability** | PASS | Códigos machine-readable novos (`bill.invalid_transition`, `bill.not_found`, `expense.managed_by_bill`, `recurring_bill.not_found`, etc.); log JSON estruturado nas mutações (userId, groupId, billId/recurringBillId, ação, outcome) sem valores monetários em claro; `/health` inalterado. |

**Gate result: PASS** — Phase 0 pode iniciar. Re-avaliado após o Phase 1 (abaixo): **PASS mantido**, sem entradas em Complexity Tracking.

## Project Structure

### Documentation (this feature)

```text
specs/010-monthly-payment-tracker/
├── plan.md              # Este arquivo
├── spec.md              # Especificação (2 sessões de clarification integradas)
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output (Bill, RecurringBill, mudanças em Expense)
├── quickstart.md        # Phase 1 output
├── contracts/
│   └── openapi.yaml     # Phase 1 output — /api/v1/bills + /api/v1/recurring-bills
├── checklists/
│   └── requirements.md  # Feito no /speckit-specify
└── tasks.md             # Phase 2 output (gerado por /speckit-tasks)
```

### Source Code (repository root)

```text
backend/
├── prisma/
│   ├── schema.prisma                                # MODIFICADO — enums BillStatus/RecurrenceInterval; models Bill, RecurringBill; relação em Expense/User/FamilyGroup/Category
│   └── migrations/2026XXXX_010_monthly_payment_tracker/
└── src/
    ├── api/
    │   ├── bill/
    │   │   ├── bill.router.ts                       # GET/POST /bills, PATCH/DELETE /bills/:id, POST :id/pay, PATCH/DELETE :id/payment, POST :id/cancel, :id/reactivate, POST /bills/copy
    │   │   ├── bill.validators.ts                   # Zod: month YYYY-MM, payloads de criação/edição/pagamento/cópia
    │   │   └── bill.serializer.ts                   # Envelope: conta (+ pagamento, + origem recorrente) e resumo do mês
    │   └── recurring-bill/
    │       ├── recurring-bill.router.ts             # GET/POST /recurring-bills, PATCH/DELETE /:id, POST /:id/pause, /:id/resume, /:id/stop
    │       ├── recurring-bill.validators.ts         # Zod: dueDay 1–31, interval, startMonth, includeStartMonth
    │       └── recurring-bill.serializer.ts
    ├── application/
    │   ├── bill/
    │   │   ├── list-month-bills.use-case.ts         # Materializa instâncias do mês (R1) + lista + resumo
    │   │   ├── create-bill.use-case.ts
    │   │   ├── update-bill.use-case.ts              # Só PENDING (FR-012); recalcula month se dueDate mudar
    │   │   ├── delete-bill.use-case.ts              # Só não-PAID (FR-012)
    │   │   ├── pay-bill.use-case.ts                 # Transação: status PAID + cria Expense vinculada (FR-005/006)
    │   │   ├── update-payment.use-case.ts           # Transação: edita pagamento + sincroniza Expense (FR-016)
    │   │   ├── revert-payment.use-case.ts           # Transação: PAID→PENDING + remove Expense (FR-008)
    │   │   ├── cancel-bill.use-case.ts              # PENDING→CANCELLED; reactivate CANCELLED→PENDING (FR-009)
    │   │   ├── copy-previous-month.use-case.ts      # FR-017: avulsas não-canceladas; dryRun devolve contagem
    │   │   └── bill-summary.ts                      # Função pura: esperado/pago/pendente em centavos (FR-010)
    │   ├── recurring-bill/
    │   │   ├── create-recurring-bill.use-case.ts    # FR-018/019: includeStartMonth quando vencimento já passou
    │   │   ├── update-recurring-bill.use-case.ts    # FR-023: propaga p/ Pendentes de meses > atual
    │   │   ├── pause-resume.use-case.ts             # FR-021: PAUSED↔ACTIVE; resume avança activeFromMonth (R2)
    │   │   ├── stop-recurring-bill.use-case.ts      # FR-022: STOPPED + cancela Pendentes de meses > atual
    │   │   ├── delete-recurring-bill.use-case.ts    # FR-024: soft-delete (deletedAt) + mesmo efeito do stop
    │   │   └── recurrence-engine.ts                 # Função pura: meses aplicáveis, âncora anual, dia → último dia, activeFromMonth
    │   └── expense/
    │       ├── update-expense.use-case.ts           # MODIFICADO — 409 expense.managed_by_bill se vinculada (FR-007)
    │       └── delete-expense.use-case.ts           # MODIFICADO — idem
    ├── domain/
    │   ├── bill/
    │   │   └── bill.repository.ts                   # CRUD + findByMonth + materialização em transação + summary
    │   └── recurring-bill/
    │       └── recurring-bill.repository.ts         # CRUD + listActiveForMonth + cancelFuturePending
    ├── api/expense/expense.serializer.ts            # MODIFICADO — expõe billId (nullable) no envelope
    └── app.ts                                       # MODIFICADO — monta bill.router e recurring-bill.router

frontend/
└── src/
    ├── pages/
    │   └── PaymentsPage.tsx                         # Rota /pagamentos: seletor de mês + resumo + checklist + ações
    ├── components/
    │   ├── bills/
    │   │   ├── MonthBillsSummary.tsx                # Esperado / pago / pendente (FR-010)
    │   │   ├── BillChecklist.tsx                    # Lista ordenada por vencimento; seções por estado; projeções "Prevista" ao final
    │   │   ├── BillItem.tsx                         # Estados, vencida, badges "Conta fixa"/"Prevista" (read-only), ações por transição
    │   │   ├── BillFormModal.tsx                    # Criar/editar avulsa (FR-001/012)
    │   │   ├── PayBillModal.tsx                     # Pagar/editar pagamento (pré-preenchido, FR-005/016)
    │   │   ├── CopyPreviousMonthButton.tsx          # dryRun → confirmação com contagem → cópia (FR-017)
    │   │   ├── RecurringBillsSection.tsx            # Gestão de contas fixas (lista, pausar/retomar/encerrar/excluir)
    │   │   └── RecurringBillFormModal.tsx           # Criar/editar template; pergunta "incluir mês atual?" (FR-019)
    │   └── layout/AppLayout.tsx                     # MODIFICADO — item de nav "Pagamentos" → /pagamentos
    ├── pages/ExpensesPage.tsx (+ componentes de despesa) # MODIFICADO — despesa com billId: sem editar/excluir + aviso
    ├── hooks/
    │   ├── useMonthBills.ts                         # GET /bills?month + mutações com recarga
    │   └── useRecurringBills.ts
    ├── services/
    │   ├── bill.service.ts
    │   └── recurring-bill.service.ts
    ├── types/
    │   └── bill.ts                                  # Tipos dos envelopes (Bill, RecurringBill, MonthSummary)
    └── router/AppRouter.tsx                         # MODIFICADO — rota protegida /pagamentos

backend/tests/
├── application/bill/                                # Unitários: bill-summary, copy (filtros), transições
├── application/recurring-bill/                      # Unitários: recurrence-engine (âncora, dia 31, pausa/resume)
├── api/bills/                                       # Contrato HTTP: CRUD, pay/revert/payment, cancel, copy, auth, isolamento
└── api/recurring-bills/                             # Contrato HTTP: CRUD, pause/resume/stop/delete, materialização via GET /bills

frontend/src/components/bills/*.test.tsx              # Componentes + PaymentsPage + hooks (co-localizados, padrão do repo)
```

**Structure Decision**: Web monorepo existente (Opção 2), com dois módulos verticais novos (`bill/`, `recurring-bill/`) nas três camadas do backend — mesmo recorte por agregado usado em expense/category/budget. A engine de recorrência e o resumo do mês são funções puras em `application/`, testáveis sem banco. Modificações em arquivos existentes mínimas e aditivas: `app.ts` (mount), `expense.serializer.ts` (campo `billId`), `update/delete-expense.use-case.ts` (guarda de vínculo), `AppLayout.tsx`/`AppRouter.tsx` (rota e nav), componentes de despesa (estado somente leitura).

## Complexity Tracking

> Sem violações de constituição a justificar — tabela intencionalmente vazia.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| — | — | — |
