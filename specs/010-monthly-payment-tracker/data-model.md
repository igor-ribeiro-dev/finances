# Data Model: Monthly Payment Tracker (010)

Uma migração (`010_monthly_payment_tracker`): 2 enums, 2 tabelas novas,
0 alterações destrutivas em tabelas existentes.

## Enums

```prisma
enum BillStatus {
  PENDING
  PAID
  CANCELLED
}

enum RecurrenceInterval {
  MONTHLY
  ANNUAL
}

enum RecurringBillStatus {
  ACTIVE
  PAUSED
  STOPPED
}
```

`PaymentMethod` (CASH_OR_DEBIT | CREDIT_CARD) é reutilizado da feature 006.

## RecurringBill (Conta Fixa — template)

| Campo | Tipo | Regras |
|-------|------|--------|
| `id` | String @id uuid | |
| `groupId` | String FK → FamilyGroup | Cascade; toda query filtra por groupId |
| `description` | VarChar(200) | obrigatório, 1–200 chars (mesmo limite de Expense) |
| `expectedAmountCents` | Int | > 0 (estimativa — FR-018) |
| `dueDay` | Int | 1–31 (validação Zod na borda) |
| `interval` | RecurrenceInterval | MONTHLY ou ANNUAL |
| `startMonth` | DateTime @db.Date | normalizado dia 1; âncora anual = mês deste campo (FR-019) |
| `activeFromMonth` | DateTime @db.Date | dia 1; init = startMonth (ou mês seguinte se "incluir mês atual?" recusado); resume → max(atual, valor) — research R2 |
| `status` | RecurringBillStatus | ACTIVE ↔ PAUSED; → STOPPED (terminal) |
| `categoryId` | String? FK → Category | SetNull (categoria removida → template segue sem categoria, edge case) |
| `ownerMemberId` | String? FK → User | SetNull (responsável padrão opcional) |
| `deletedAt` | DateTime? | soft-delete (FR-024, research R4); some das listagens |
| `createdAt` / `updatedAt` | DateTime | padrão do repo |

Índice: `@@index([groupId])`.

**Transições de status do template**:

```
ACTIVE ──pause──▶ PAUSED ──resume──▶ ACTIVE   (resume avança activeFromMonth)
ACTIVE | PAUSED ──stop──▶ STOPPED             (terminal; cancela Pendentes futuras)
qualquer ──delete──▶ deletedAt setado         (mesmo efeito do stop + oculto)
```

Operações sobre template STOPPED ou deletado: 409 `recurring_bill.invalid_transition`
(exceto delete de STOPPED, permitido).

## Bill (Conta — instância mensal)

| Campo | Tipo | Regras |
|-------|------|--------|
| `id` | String @id uuid | |
| `groupId` | String FK → FamilyGroup | Cascade |
| `description` | VarChar(200) | obrigatório |
| `expectedAmountCents` | Int | > 0; preservado após pagamento (FR-005) |
| `dueDate` | DateTime @db.Date | data civil, sem timezone (padrão Expense.date) |
| `month` | DateTime @db.Date | dia 1, derivado de dueDate; editar dueDate recalcula (move de mês — assumption da spec) |
| `status` | BillStatus | default PENDING |
| `categoryId` | String? FK → Category | SetNull |
| `ownerMemberId` | String? FK → User | SetNull; responsável padrão (pré-preenche pagamento) |
| `recurringBillId` | String? FK → RecurringBill | Restrict (template nunca é hard-deleted — R4); null = avulsa |
| `paidDate` | DateTime? @db.Date | NOT NULL ⇔ status = PAID (invariante de aplicação) |
| `actualAmountCents` | Int? | > 0; NOT NULL ⇔ PAID |
| `paidByMemberId` | String? FK → User | NOT NULL ⇔ PAID (membro responsável pelo pagamento) |
| `paymentMethod` | PaymentMethod? | NOT NULL ⇔ PAID |
| `expenseId` | String? FK → Expense **@unique** | NOT NULL ⇔ PAID; despesa vinculada (FR-006/007) |
| `createdAt` / `updatedAt` | DateTime | |

Índices/uniques:

- `@@index([groupId, month])` — listagem do checklist e resumo.
- `@@unique([recurringBillId, month])` — **parcial** (`WHERE "recurringBillId" IS NOT NULL`,
  declarado em SQL raw na migração, padrão já usado nas features 007/008) —
  idempotência da materialização pelo job/catch-up (R1).
- `expenseId` unique — 1 conta ↔ 1 despesa; lookup reverso barato para a
  guarda do módulo de despesas (FR-007).

**Invariante de pagamento** (checada nos use cases e testada): os 5 campos
`paidDate`, `actualAmountCents`, `paidByMemberId`, `paymentMethod`,
`expenseId` são todos NULL quando status ≠ PAID e todos NOT NULL quando
status = PAID.

**Transições de status da instância** (FR-009; violação → 409
`bill.invalid_transition`):

```
PENDING ──pay──▶ PAID          (transação: + cria Expense, seta expenseId)
PAID ──revert──▶ PENDING       (transação: limpa pagamento, deleta Expense)
PENDING ──cancel──▶ CANCELLED
CANCELLED ──reactivate──▶ PENDING
PAID ──cancel──▶ ✗ proibido    (reverter antes — FR-009)
```

Edição de campos base (description, expectedAmountCents, dueDate,
categoryId, ownerMemberId): apenas em PENDING (FR-012). Edição de campos de
pagamento: apenas em PAID, sincronizando a Expense na mesma transação
(FR-016). Delete: apenas status ≠ PAID, com confirmação na UI (FR-012).

## Expense (existente — mudanças aditivas, sem migração)

- **Nenhuma coluna nova**: o vínculo é `Bill.expenseId` (unique); a direção
  Bill→Expense evita tocar a tabela com mais linhas.
- `update-expense.use-case` / `delete-expense.use-case`: guarda nova — se
  existe Bill com `expenseId = id`, devolve 409 `expense.managed_by_bill`
  (FR-007).
- `expense.serializer`: campo aditivo `billId: string | null` no envelope
  (resolvido por lookup no índice unique), para a UI travar edição e exibir
  o aviso apontando para o tracker.
- Delete da Expense vinculada só ocorre via `revert-payment.use-case`
  (mesma transação que volta a Bill para PENDING).

## Relações novas em modelos existentes

- `FamilyGroup`: `bills Bill[]`, `recurringBills RecurringBill[]`.
- `User`: `billsOwned Bill[]`, `billsPaid Bill[]`, `recurringBillsOwned RecurringBill[]`.
- `Category`: `bills Bill[]`, `recurringBills RecurringBill[]` (ambas SetNull —
  nota: Category→Expense é Restrict; para Bills o SetNull implementa o edge
  case "categoria removida → conta segue sem categoria". A exclusão de
  categoria da feature 007 permanece Restrita por Expense; quando a categoria
  não tem despesas, Bills apontando para ela são desvinculadas).
- `Expense`: relação reversa `bill Bill?`.

## Funções puras (sem persistência)

- `recurrence-engine.ts`:
  - `isApplicableMonth(template, month)`: MONTHLY → todo mês ≥ activeFromMonth;
    ANNUAL → mesmo mês do startMonth e ano ≥ ano do activeFromMonth.
  - `instanceDueDate(template, month)`: `min(dueDay, lastDayOf(month))` (FR-019).
- `bill-summary.ts` (FR-010, centavos inteiros):
  - `totalExpectedCents` = Σ expected de PENDING + PAID
  - `totalPaidCents` = Σ actual de PAID
  - `totalPendingCents` = Σ expected de PENDING
  - CANCELLED fora de todos os totais.

## Materialização por job agendado (R1) — algoritmo

Janela de geração = {mês corrente, mês seguinte}. Executado pelo scheduler
in-process (boot + 1×/dia) para todos os grupos, e como catch-up síncrono
na criação/retomada/edição de template (apenas para o template afetado):

```
materializeWindow():                        # scheduler / catch-up
  for month in [currentMonth, nextMonth]:
    templates = recurringBills WHERE status=ACTIVE, deletedAt IS NULL,
                activeFromMonth <= month, isApplicableMonth(template, month)
    rows = templates SEM instância (LEFT JOIN bills ON recurringBillId+month)
    createMany(rows → Bill PENDING com dueDate=instanceDueDate(...),
               campos copiados do template), skipDuplicates  # unique (recurringBillId, month)
```

`GET /bills?month` é **leitura pura**. Para o mês requisitado, além das
instâncias persistidas, calcula as **projeções** (`projectedBills`,
FR-025):

```
projectBills(groupId, month, persistedBills):
  templates = recurringBills WHERE groupId, status=ACTIVE, deletedAt IS NULL,
              activeFromMonth <= month, isApplicableMonth(template, month)
  return templates sem instância persistida no mês
         → { recurringBillId, description, expectedAmountCents,
             dueDate=instanceDueDate(template, month) }   # virtual, sem id de Bill
```

Em condições normais a janela está materializada e projeções só aparecem em
meses > seguinte; a regra uniforme também cobre lacunas excepcionais. O
resumo do mês ganha `projectedCents = Σ expectedAmountCents` das projeções,
sempre separado dos três totais de contas reais (FR-010).

Propagação de edição do template (FR-023) e cancelamento em stop/delete
(FR-022/024) operam sobre `Bill WHERE recurringBillId = X AND status =
PENDING AND month > mêsAtual` (na prática, no máximo o mês seguinte) —
last-edit-wins documentado na spec; projeções refletem o template por
construção.
