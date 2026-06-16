# Phase 1 — Data Model: Expense Consolidation

Mudanças de modelo em torno de **eliminar `Expense`** e tornar a **`Bill` Paga**
o único registro de gasto. Centavos inteiros e datas `DATE` sem timezone
(Princípio III) mantidos.

---

## 1. Bill (Conta) — MODIFICADA

A entidade do tracker (feature 010) passa a ser o registro único de gasto.

### Campos adicionados

| Campo | Tipo | Nulo? | Notas |
|-------|------|-------|-------|
| `createdById` | `String` (FK `User`) | **Sim** | Autoria (FR-004). Setado em toda criação nova (create-bill, copy, materialização, log-spending) e no backfill da migração; `NULL` para contas Pendentes/Canceladas legadas sem autor registrado. |
| `updatedById` | `String` (FK `User`) | **Sim** | Último editor. Mesma regra de preenchimento. |

Relações novas em `User`: `billsAuthored Bill[] @relation("BillAuthor")`,
`billsEdited Bill[] @relation("BillEditor")`.

### Campos alterados / removidos

| Campo | Antes (010) | Depois (011) |
|-------|-------------|--------------|
| `expenseId` | `String? @unique` FK→`Expense` (`onDelete: Restrict`) | **REMOVIDO** (coluna + FK) |
| `expense` | relação `Expense?` | **REMOVIDA** |
| `categoryId` | FK `Category?` `onDelete: SetNull` | FK `Category?` **`onDelete: Restrict`** (R8 — paridade com a antiga despesa; preserva categoria histórica) |
| `ownerMemberId` | `String?` (opcional) | inalterado, porém **`NULL` em contas registradas/migradas** (Q3) |
| `paidByMemberId` | `String?` (não-nulo ⇔ PAID) | inalterado; é o **responsável** do gasto (Q3) e a chave de orçamento por membro (R4) |

### Índices

| Índice | Estado |
|--------|--------|
| `@@index([groupId, month])` (`bill_group_month_idx`) | mantido |
| `@@index([groupId, paidDate])` | **NOVO** — suporta a agregação de gasto do dashboard por mês de pagamento (R4); paridade com o antigo `expense_group_date_id_idx` |
| unique parcial `(recurringBillId, month)` | mantido |

### Invariantes (inalteradas, exceto onde indicado)

- Campos de pagamento (`paidDate`, `actualAmountCents`, `paidByMemberId`,
  `paymentMethod`) **todos NULL ⇔ `status ≠ PAID`**; **todos NOT NULL ⇔ PAID**.
- Conta registrada via `log-spending`: criada **diretamente `PAID`**, com
  `expectedAmountCents = actualAmountCents`, `dueDate = paidDate = date`,
  `month = 1º dia do mês de date`, `ownerMemberId = NULL`,
  `recurringBillId = NULL`, `createdById = updatedById = userId`.

---

## 2. Expense (Despesa) — REMOVIDA

`DROP TABLE "Expense"` na migração 011 (Q2). Removidas também:

- Relações em `User`: `expensesAuthored`, `expensesEdited`, `expensesOwned`.
- Relação em `FamilyGroup`: `expenses`.
- Relação em `Category`: `expenses`.
- Índices `expense_group_date_id_idx`, `expense_category_idx`.

Os dados são **absorvidos** em contas Pagas antes do drop (ver Migração).

---

## 3. IdempotencyKey / ResourceType — RETIDOS

- Tabela `IdempotencyKey` e enum `ResourceType` **permanecem** —
  `ResourceType.CATEGORY` é usado por categorias.
- Linhas `resourceType = 'EXPENSE'` são **apagadas** na migração (órfãs).
- O **valor de enum `EXPENSE`** é mantido (remoção opcional/adiada — R6).
- O arquivo `idempotency.repository.ts` é **movido** `domain/expense/` →
  `domain/idempotency/` (mudança de localização, não de modelo).

---

## 4. Mapeamento de conversão (Expense → Bill Paga)

| Campo da Bill | Origem (Expense `e`) |
|---------------|----------------------|
| `description` | `e.description` |
| `expectedAmountCents` | `e.amountCents` |
| `actualAmountCents` | `e.amountCents` |
| `dueDate` | `e.date` |
| `paidDate` | `e.date` |
| `month` | 1º dia do mês de `e.date` |
| `status` | `PAID` |
| `paymentMethod` | `e.paymentMethod` |
| `paidByMemberId` | `e.ownerMemberId` (Q3 — pagador = responsável) |
| `ownerMemberId` | `NULL` (Q3) |
| `categoryId` | `e.categoryId` |
| `createdById` | `e.createdById` |
| `updatedById` | `e.updatedById` |
| `createdAt` / `updatedAt` | `e.createdAt` / `e.updatedAt` (auditoria preservada) |
| `recurringBillId` | `NULL` |

**Despesa vinculada a conta** (existe `Bill.expenseId = e.id`): **não** gera
conta nova (FR-005); apenas `createdById/updatedById` da conta recebem
`e.createdById/e.updatedById` (backfill). A conta já carrega
`paidByMemberId`/`paymentMethod`/`paidDate`/`actualAmountCents`/`categoryId`.

---

## 5. Migração `2026XXXX_011_expense_consolidation` (ordem)

> Transação única; **precedida de backup** (irreversível — Q2).

1. `ALTER TABLE "Bill"` add `createdById`, `updatedById` (nullable, FK `User`);
   `CREATE INDEX bill_group_paiddate_idx ON "Bill"("groupId","paidDate")`;
   trocar a FK `Bill.categoryId` para `ON DELETE RESTRICT`.
2. Backfill autoria das contas vinculadas:
   `UPDATE "Bill" b SET "createdById"=e."createdById", "updatedById"=e."updatedById"
   FROM "Expense" e WHERE b."expenseId"=e."id";`
3. Converter avulsas (`INSERT…SELECT`) — despesas sem conta vinculada
   (`e.id NOT IN (SELECT "expenseId" FROM "Bill" WHERE "expenseId" IS NOT NULL)`)
   conforme o mapeamento da §4.
4. `ALTER TABLE "Bill" DROP COLUMN "expenseId";` (+ constraint FK).
5. `DROP TABLE "Expense";` (+ índices).
6. `DELETE FROM "IdempotencyKey" WHERE "resourceType"='EXPENSE';`

**Pós-condições verificáveis (teste de conversão — SC-002/003)**:
- nº de contas Pagas adicionadas == nº de despesas avulsas;
- nenhuma despesa vinculada gerou conta;
- para todo mês histórico: soma família, por `paidByMemberId` e por `categoryId`
  sobre contas Pagas == os mesmos totais que a lógica antiga produzia sobre
  despesas.

---

## 6. Regras de validação — `log-spending` (FR-001/FR-010)

Idênticas às da antiga despesa (Zod, na borda):

| Campo | Regra | Mensagem (PT-BR) |
|-------|-------|------------------|
| `amountCents` | inteiro, `> 0`, `≤ 2_000_000_000` | "O valor deve ser maior que zero." |
| `date` | `YYYY-MM-DD` válido, **não futura** | "A data não pode estar no futuro." |
| `description` | `trim`, 1–200 | "A descrição é obrigatória." / "…no máximo 200 caracteres." |
| `paymentMethod` | `CASH_OR_DEBIT` \| `CREDIT_CARD` | "Método de pagamento inválido." |
| `paidByMemberId` | UUID, **membro ativo do grupo** (checado no use case) | "Membro responsável não pertence ao grupo." |
| `categoryId` | UUID opcional/nulo | "Categoria inválida." |

---

## 7. Transições de estado (inalteradas — FR-009)

Reaproveita a máquina da feature 010. Única adição: **entrada direta em `PAID`**
via `log-spending` (em vez de `PENDING→PAID` por `pay`). A partir daí, todas as
transições valem igual: `PAID→PENDING` (reverter, limpa pagamento),
`PENDING→CANCELLED`, `CANCELLED→PENDING`; `PAID→CANCELLED` proibido (409
`bill.invalid_transition`). Reverter uma conta registrada produz uma Pendente
com `expectedAmountCents`/`dueDate` herdados do registro.

---

## 8. Impacto em agregações (dashboard) — R4

`billRepository.aggregateMonthSpending(groupId, month)`:
```
where = { groupId, status: 'PAID', paidDate: { gte: início, lt: próximo } }
byMember   = groupBy(['paidByMemberId'], _sum: { actualAmountCents })
byCategory = groupBy(['categoryId'],     _sum: { actualAmountCents })
```
`get-month-dashboard.use-case` consome essa função (no lugar de
`expenseRepository.aggregateMonthSpending`); a resolução de nomes de ex-membros
por id permanece. Pendentes/Canceladas ficam fora (só `PAID` conta — FR-011).
