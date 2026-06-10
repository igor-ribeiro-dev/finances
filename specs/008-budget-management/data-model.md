# Phase 1 — Data Model: Gestão de Orçamentos

**Feature**: 008-budget-management | **Date**: 2026-06-09 | **Migração**: `008_budget_management`

## Visão geral

Uma tabela nova (`Budget`), dois enums novos, três índices únicos parciais e um índice de leitura. **Nenhuma** tabela existente é alterada — a remoção de orçamentos ao excluir uma categoria/membro (FR-015) é resolvida pela FK `ON DELETE CASCADE` do próprio `Budget`.

---

## Enums

### `BudgetTargetType`
| Valor | Significado |
|-------|-------------|
| `FAMILY` | Orçamento global da família (um por grupo/mês). `targetMemberId` e `targetCategoryId` são `NULL`. |
| `MEMBER` | Orçamento individual de um membro. `targetMemberId` preenchido. |
| `CATEGORY` | Teto de uma categoria raiz **ou** sub-categoria. `targetCategoryId` preenchido. |

### `BudgetLimitType`
| Valor | Significado |
|-------|-------------|
| `ABSOLUTE` | Limite em centavos (`amountCents` preenchido, `percent` `NULL`). |
| `PERCENT` | Limite percentual inteiro (`percent` preenchido, `amountCents` `NULL`). |

---

## Entidade: `Budget`

| Campo | Tipo | Nulável | Regras |
|-------|------|---------|--------|
| `id` | `String` (uuid) | não | PK, `@default(uuid())`. |
| `groupId` | `String` | não | FK → `FamilyGroup.id`, **`ON DELETE CASCADE`**. Toda query filtra por aqui (scoping). |
| `month` | `DateTime @db.Date` | não | Normalizado para o 1º dia do mês (`YYYY-MM-01`, UTC). |
| `targetType` | `BudgetTargetType` | não | Discriminador do alvo. |
| `targetMemberId` | `String` | sim | FK → `User.id`, **`ON DELETE CASCADE`**. Obrigatório sse `targetType = MEMBER`. |
| `targetCategoryId` | `String` | sim | FK → `Category.id`, **`ON DELETE CASCADE`**. Obrigatório sse `targetType = CATEGORY`. Pode apontar para raiz ou sub. |
| `limitType` | `BudgetLimitType` | não | `FAMILY` é sempre `ABSOLUTE` (enforçado na aplicação). |
| `amountCents` | `Int` | sim | Preenchido sse `limitType = ABSOLUTE`. `> 0` (zero ⇒ linha não existe). |
| `percent` | `Int` | sim | Preenchido sse `limitType = PERCENT`. Inteiro `> 0` (FR-010); sem casas decimais. |
| `createdAt` | `DateTime` | não | `@default(now())`. |
| `updatedAt` | `DateTime` | não | `@updatedAt`. |

### Invariantes (enforçadas na aplicação / Zod)
1. `targetType = FAMILY` ⇒ `targetMemberId IS NULL` ∧ `targetCategoryId IS NULL` ∧ `limitType = ABSOLUTE`.
2. `targetType = MEMBER` ⇒ `targetMemberId` preenchido, pertencente ao `groupId`.
3. `targetType = CATEGORY` ⇒ `targetCategoryId` preenchido, categoria pertencente ao `groupId`.
4. `limitType = ABSOLUTE` ⇒ `amountCents > 0` ∧ `percent IS NULL`.
5. `limitType = PERCENT` ⇒ `percent` inteiro `> 0` ∧ `amountCents IS NULL`.
6. **Ausência de linha = não definido / inativo** (FR-008). Nunca persistimos zero — zero/branco no upsert ⇒ `DELETE` da linha.

### Índices (raw SQL na migração)
```sql
-- Unicidade parcial: no máximo um orçamento por (grupo, mês, alvo)
CREATE UNIQUE INDEX budget_family_uq
  ON "Budget" ("groupId", "month")
  WHERE "targetType" = 'FAMILY';

CREATE UNIQUE INDEX budget_member_uq
  ON "Budget" ("groupId", "month", "targetMemberId")
  WHERE "targetType" = 'MEMBER';

CREATE UNIQUE INDEX budget_category_uq
  ON "Budget" ("groupId", "month", "targetCategoryId")
  WHERE "targetType" = 'CATEGORY';

-- Leitura do retrato do mês
CREATE INDEX budget_group_month_idx ON "Budget" ("groupId", "month");
```

### Esboço Prisma (`schema.prisma`)
```prisma
enum BudgetTargetType {
  FAMILY
  MEMBER
  CATEGORY
}

enum BudgetLimitType {
  ABSOLUTE
  PERCENT
}

model Budget {
  id               String           @id @default(uuid())
  groupId          String
  group            FamilyGroup      @relation(fields: [groupId], references: [id], onDelete: Cascade)
  month            DateTime         @db.Date
  targetType       BudgetTargetType
  targetMemberId   String?
  targetMember     User?            @relation("MemberBudget", fields: [targetMemberId], references: [id], onDelete: Cascade)
  targetCategoryId String?
  targetCategory   Category?        @relation(fields: [targetCategoryId], references: [id], onDelete: Cascade)
  limitType        BudgetLimitType
  amountCents      Int?
  percent          Int?
  createdAt        DateTime         @default(now())
  updatedAt        DateTime         @updatedAt

  // Índices únicos parciais declarados em SQL bruto na migração (Prisma não
  // suporta WHERE em @@unique). Mantém-se o índice de leitura aqui:
  @@index([groupId, month], map: "budget_group_month_idx")
}
```
> Relações inversas a adicionar: `FamilyGroup.budgets Budget[]`, `User.memberBudgets Budget[] @relation("MemberBudget")`, `Category.budgets Budget[]`.

---

## Conceito derivado (não persistido): Limite Resolvido

Calculado em runtime (`budget-resolver.ts`), nunca em coluna. Para cada `Budget`:

| Alvo / tipo | `resolvedCents` |
|-------------|-----------------|
| FAMILY | `amountCents` |
| MEMBER / raiz · ABSOLUTE | `amountCents` |
| MEMBER / raiz · PERCENT | `round(percent × familyAmountCents / 100)`; `null` se família indefinida |
| Sub-categoria · ABSOLUTE | `amountCents` |
| Sub-categoria · PERCENT | `round(percent × resolvedRootCents / 100)`; `null` se a raiz pai não tiver valor resolvível |

`null` ⇒ estado **"não resolvível"** (FR-022). Arredondamento half-up (FR-021): `Math.round((percent * baseCents) / 100)`.

### Sumário de alocação (resposta do GET/PUT)
- `familyAmountCents`: valor da família (ou `null`).
- `totalAllocatedCents`: Σ `resolvedCents` das **categorias raiz** (sub não soma; estão contidas na raiz).
- `unallocatedCents`: `familyAmountCents − totalAllocatedCents` (pode ser negativo → excedente).
- `allocatedPercent` / `unallocatedPercent`: idem em %, relativos à família.

### Warnings (consultivos, FR-009)
- `category.allocation_exceeds_family` — `totalAllocatedCents > familyAmountCents` **ou** Σ percentuais de raiz `> 100`.
- `subcategory.exceeds_root` (por raiz) — Σ `resolvedCents` das sub `>` `resolvedCents` da raiz.

---

## Relação com entidades existentes

| Entidade | Relação | Comportamento |
|----------|---------|---------------|
| `FamilyGroup` | 1—N `Budget` | Scoping. CASCADE: apagar grupo apaga orçamentos. |
| `User` (membro) | 1—N `Budget` (MEMBER) | CASCADE no hard-delete. "Sair do grupo" (`familyGroupId=null`) não deleta o User; o GET filtra por membros atuais do grupo (ex-membros não aparecem). |
| `Category` | 1—N `Budget` (CATEGORY) | **CASCADE** (≠ `Expense` que é RESTRICT): excluir categoria remove seus orçamentos (FR-015), sem bloquear e sem entrar no delete-preview da feature 007. |

---

## Ciclo de vida

```
(não existe) ──upsert valor>0──▶ (definido) ──upsert valor>0──▶ (definido, atualizado)
     ▲                              │
     └────────upsert 0/null─────────┘   (DELETE → volta a "não definido")

Cópia não-destrutiva: cria linhas só para alvos SEM linha no mês destino.
Excluir categoria/membro (hard): CASCADE remove as linhas correspondentes.
Alterar família: não muda linhas; re-resolve percentuais na próxima leitura (FR-024).
```

---

## Notas de migração

- Migração **aditiva** — `CREATE TYPE` (2 enums) + `CREATE TABLE "Budget"` + 3 índices únicos parciais + 1 índice de leitura + 3 FKs `ON DELETE CASCADE`. Tudo numa transação Prisma.
- Sem backfill (feature nova; nenhum dado pré-existente).
- Sem alteração em `Category`, `Expense`, `User`, `FamilyGroup` além das relações inversas no `schema.prisma` (não geram DDL em tabelas existentes).
