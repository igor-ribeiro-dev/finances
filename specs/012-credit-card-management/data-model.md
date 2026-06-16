# Phase 1 — Data Model: Credit Card Management

Estende o schema das features 010/011. Todos os valores monetários em `Int`
(centavos). 1 migração estrutural, **sem** conversão de dados.

## Nova entidade: CreditCard (Cartão de Crédito)

| Campo | Tipo | Regras |
|-------|------|--------|
| `id` | String (uuid) | PK |
| `groupId` | String | FK → `FamilyGroup`, `onDelete: Cascade`. Escopo do grupo |
| `name` | String `VarChar(60)` | 1–60 chars, não-branco |
| `normalizedName` | String (generated) | `GENERATED ALWAYS`, collation `pt_BR_ci_as`, `@ignore` no Prisma. Backing dos índices únicos parciais |
| `closingDay` | Int | 1–31. **Informativo/agrupamento** (FR-001a); não governa quitação |
| `status` | `CreditCardStatus` | `ACTIVE` \| `ARCHIVED`, default `ACTIVE` |
| `createdAt` / `updatedAt` | DateTime | timestamps |

**Relações**: `group` (FamilyGroup), `bills` (`Bill[]` — compras e faturas).

**Enum novo**: `CreditCardStatus { ACTIVE, ARCHIVED }`.

**Índices**:

- `@@index([groupId])` (`credit_card_group_idx`).
- **Único parcial (SQL bruto)**: `(groupId, normalizedName) WHERE status =
  'ACTIVE'` — nome único entre cartões ativos (FR-001, R5).

**Regras de negócio**:

- **Arquivar** (FR-002): `status → ARCHIVED`. Some das listas de seleção de novo
  gasto; permanece em compras/faturas e na visão por cartão.
- **Deletar** (FR-002): permitido apenas se não houver nenhuma `Bill` com
  `creditCardId = id`. Reforçado por `Bill.creditCardId onDelete: Restrict` +
  guarda de aplicação `credit_card.has_bills`.

## Mudanças em Bill

Adições (todas anuláveis/aditivas — nenhuma quebra das colunas existentes):

| Campo | Tipo | Regras |
|-------|------|--------|
| `creditCardId` | String? | FK → `CreditCard`, **`onDelete: Restrict`**. Em **compra**: cartão usado. Em **fatura**: cartão cujo extrato é quitado |
| `isFatura` | Boolean | `default false`. Marcador explícito do papel fatura (R2/FR-005) |
| `settledByFaturaId` | String? | self-FK → `Bill`, **`onDelete: SetNull`**. Em uma **compra**: a fatura que a quitou (NULL = em aberto). Relação `FaturaSettlement` |

**Relações novas na Bill**:

- `creditCard CreditCard?  @relation(fields: [creditCardId], references: [id], onDelete: Restrict)`
- `settledByFatura Bill?   @relation("FaturaSettlement", fields: [settledByFaturaId], references: [id], onDelete: SetNull)`
- `settledCharges  Bill[]  @relation("FaturaSettlement")` (inverso — compras quitadas por esta fatura)

**Índices novos**:

- `@@index([creditCardId])` (`bill_credit_card_idx`) — visão por cartão e
  agregação de aberto.
- **Único parcial (SQL bruto)**: `(creditCardId) WHERE isFatura = true AND
  status = 'PENDING'` — no máximo uma fatura pendente por cartão (FR-012a, R6).

### Invariantes (camada de aplicação, Zod + use cases)

1. **Compra de crédito** (FR-003): `paymentMethod = CREDIT_CARD` ⇒
   `creditCardId` obrigatório e cartão **ativo** do grupo. `isFatura = false`,
   `settledByFaturaId` pode ser NULL (aberta) ou apontar a fatura.
2. **Débito/dinheiro** (FR-003): `paymentMethod = CASH_OR_DEBIT` ⇒
   `creditCardId = NULL`, `isFatura = false`.
3. **Fatura** (FR-005): `isFatura = true` ⇒ `creditCardId` obrigatório (cartão
   do grupo, pode estar arquivado). Não tem `settledByFaturaId`. Não conta no
   orçamento (FR-010).
4. **Histórica grandfathered** (R4): bills `CREDIT_CARD` pré-feature têm
   `creditCardId = NULL`; válidas; fora das visões por cartão. Só passam a
   exigir cartão se forem editadas mantendo o método crédito.

### Compra "em aberto" (open charge)

Uma compra está **em aberto** para o cartão X quando:
`creditCardId = X AND isFatura = false AND paymentMethod = CREDIT_CARD AND
status = PAID AND settledByFaturaId IS NULL`.

`openChargesCents(X)` = `SUM(actualAmountCents)` sobre esse conjunto
(`groupBy(creditCardId)`). Reverter uma compra de PAID→PENDING a remove do
aberto (deixa de ser `status=PAID`).

## Transições e efeitos colaterais

| Ação | Efeito |
|------|--------|
| Registrar compra de crédito (`POST /bills/log` ou `POST /bills`) | Cria `Bill` com `creditCardId`, `isFatura=false`. Se PAID, entra no aberto do cartão |
| Editar compra: trocar cartão (FR-011) | Move do aberto do cartão antigo para o novo (recálculo automático via `creditCardId`) |
| Registrar fatura (`POST /credit-cards/:id/faturas`) | Cria `Bill` `isFatura=true`, `status=PENDING`, `creditCardId`. Bloqueia se já há fatura pendente do cartão (FR-012a) |
| **Pagar** fatura (`POST /bills/:id/pay`, `isFatura=true`) | Em transação: marca pagamento da fatura **e** `settledByFaturaId = faturaId` em todas as compras abertas do cartão (snapshot, R1/FR-009). Fatura **não** entra no orçamento (FR-010) |
| **Reverter** fatura (`DELETE /bills/:id/payment`, `isFatura=true`) | Em transação: limpa pagamento **e** `settledByFaturaId = NULL` onde `= faturaId` (estorno exato, FR-009) |
| Arquivar cartão | `status=ARCHIVED`; abertos/visão preservados |
| Deletar cartão | Bloqueado se houver qualquer `Bill` com esse `creditCardId` (`credit_card.has_bills`) |

## Migração `2026XXXX_012_credit_card_management`

1. `CREATE TYPE "CreditCardStatus" AS ENUM ('ACTIVE','ARCHIVED');`
2. `CREATE TABLE "CreditCard"` (+ coluna gerada `normalizedName` em SQL bruto,
   collation `pt_BR_ci_as`); índice `credit_card_group_idx`; único parcial de
   nome por ativo.
3. `ALTER TABLE "Bill"` add `creditCardId` (FK Restrict), `isFatura BOOLEAN NOT
   NULL DEFAULT false`, `settledByFaturaId` (self-FK SetNull); índice
   `bill_credit_card_idx`; único parcial "1 fatura pendente por cartão".
4. **Sem** `UPDATE`/`INSERT…SELECT` de dados — bills existentes ficam
   `isFatura=false`, `creditCardId=NULL` (R4).

**Reversível**: sim (drop das colunas/tabela/enum). Nenhuma perda de dado
histórico, pois nada é convertido.
