# Phase 1 — Data Model: Categorias de Despesas

**Date**: 2026-06-08 | **Feature**: 007-expense-categories | **Status**: Frozen for implementation

---

## Schema overview

```text
FamilyGroup (existente)
   ├──< Category (NOVA)
   │     ├──< Category (auto-rel parent → children)
   │     └──< Expense (categoryId FK)
   └──< Expense (existente; ganha categoryId)

User (existente)
   └──< IdempotencyKey (existente; refactor poliforme)

IdempotencyKey (refactor)
   └── resourceId + resourceType:EXPENSE|CATEGORY (sem FK direta)
```

---

## Entity: `Category` (NOVA)

| Campo | Tipo SQL | Tipo TS | Nulável | Default | Notas |
|---|---|---|---|---|---|
| `id` | `uuid` | `string` | NO | `gen_random_uuid()` | PK |
| `group_id` | `uuid` | `string` | NO | — | FK → `FamilyGroup.id` `ON DELETE CASCADE` (família removida → suas categorias também) |
| `name` | `varchar(60)` | `string` | NO | — | 1–60 caracteres após `trim()`; validação Zod no boundary |
| `parent_id` | `uuid` | `string \| null` | YES | `null` | FK → `Category.id` `ON DELETE RESTRICT`; `null` indica raiz |
| `normalized_name` | `text` | `string` (DB-only) | NO | gerada | `GENERATED ALWAYS AS (lower(regexp_replace(btrim(name), '\s+', ' ', 'g'))) STORED COLLATE "pt_BR_ci_as"`; `@ignore` no Prisma client |
| `created_at` | `timestamp` | `Date` | NO | `now()` | |
| `updated_at` | `timestamp` | `Date` | NO | `now()` | `@updatedAt` |

### Constraints e índices

```sql
-- Collation ICU (idempotente)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_collation WHERE collname = 'pt_BR_ci_as') THEN
    CREATE COLLATION "pt_BR_ci_as" (
      provider = icu,
      locale = 'pt-BR-u-ks-level2',
      deterministic = false
    );
  END IF;
END $$;

-- Índices únicos parciais (FR-005 / FR-028)
CREATE UNIQUE INDEX category_root_unique
  ON "Category" (group_id, normalized_name)
  WHERE parent_id IS NULL;

CREATE UNIQUE INDEX category_subcategory_unique
  ON "Category" (group_id, parent_id, normalized_name)
  WHERE parent_id IS NOT NULL;

-- Índices de leitura
CREATE INDEX category_group_idx ON "Category" (group_id);
CREATE INDEX category_parent_idx ON "Category" (parent_id) WHERE parent_id IS NOT NULL;
```

### Regras de validação (camada de aplicação / Zod)

1. `name`: string, trim, 1 ≤ length ≤ 60.
2. `parentId`: UUID v4 OR `null`.
3. Se `parentId !== null`:
   - DEVE existir uma `Category` com `id = parentId` no mesmo `groupId`.
   - Essa categoria DEVE ter `parentId === null` (ou seja, é raiz). Caso contrário: 422 `category.parent_not_root`.
4. Em `PATCH`:
   - Tentativa de mudar o "papel" hierárquico (raiz → sub ou sub → raiz) rejeita com 422 `category.role_immutable`.
   - Sub-categoria PODE mover entre raízes do mesmo grupo (novo `parentId` ainda apontando para uma raiz).

### Lifecycle

```text
[create] → ACTIVE
[rename]/[move] → ACTIVE (mesma identidade)
[delete] →
  ├── sem dependências: REMOVED (linha deletada do banco)
  └── com dependências: bloqueado por FK; estado inalterado
```

Não há soft-delete, não há lifecycle states intermediários, não há revisão histórica.

---

## Entity: `Expense` (MODIFICADA)

Mudanças em relação ao schema atual (feature 006):

| Campo | Mudança |
|---|---|
| `category_id` | **NOVO** — `uuid` nullable, FK → `Category.id` `ON DELETE RESTRICT` |

Todos os demais campos (`id`, `group_id`, `amount_cents`, `date`, `description`, `payment_method`, `owner_member_id`, `created_by_id`, `updated_by_id`, `created_at`, `updated_at`) ficam inalterados.

### Constraints novas

```sql
ALTER TABLE "Expense"
  ADD COLUMN "category_id" uuid NULL,
  ADD CONSTRAINT "Expense_categoryId_fkey"
    FOREIGN KEY ("category_id") REFERENCES "Category"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX expense_category_idx ON "Expense" (category_id) WHERE category_id IS NOT NULL;
```

### Regras de validação no use case

1. `categoryId` no body do POST/PATCH: UUID v4 OR `null`. Validação Zod.
2. Backend NÃO valida ownership de categoria antes do INSERT/UPDATE — a FK do Postgres faz isso. P2003 (FK violation) é capturada e tratada conforme R-07 (retry com `categoryId: null` + `warnings`).
3. Backend NÃO valida que `categoryId` pertence ao mesmo grupo — a FK + filtro de listagem garantem isolamento; tentativa de usar categoria de outro grupo viola FK (categoria do grupo errado tem `groupId` diferente e simplesmente não existe sob o usuário corrente; o backend não a vê → 404 ao tentar referenciar).

### Lifecycle (estendido)

```text
[create] → CREATED (com ou sem categoryId)
[update] → UPDATED (categoryId pode mudar livremente; null → uuid, uuid → null, uuid → outro uuid)
[delete] → REMOVED
[categoria deletada por outro membro]:
  ├── POST/PATCH em progresso: P2003 capturado → categoryId nulificado → warning na resposta
  └── despesa já existente: impossível — FK RESTRICT bloqueia o DELETE da categoria
```

---

## Entity: `IdempotencyKey` (REFACTOR estrutural)

Esquema atual (feature 006):

```text
key, userId, expenseId, createdAt
└── FK: expenseId → Expense.id ON DELETE CASCADE
└── FK: userId → User.id ON DELETE CASCADE
```

Esquema novo (após esta feature):

| Campo | Tipo | Nulável | Notas |
|---|---|---|---|
| `key` | `varchar(64)` | NO | PK (UUID v4 enviada via header `Idempotency-Key`) |
| `user_id` | `uuid` | NO | FK → `User.id` `ON DELETE CASCADE` (inalterado) |
| `resource_type` | `ResourceType` enum | NO | `EXPENSE` ou `CATEGORY` (NOVO) |
| `resource_id` | `uuid` | NO | ID do recurso criado pela operação (renomeado de `expense_id`); SEM FK |
| `created_at` | `timestamp` | NO | TTL: registros > 24h são purgados pelo job `cleanup:idempotency` |

```sql
CREATE TYPE "ResourceType" AS ENUM ('EXPENSE', 'CATEGORY');

ALTER TABLE "IdempotencyKey"
  DROP CONSTRAINT "IdempotencyKey_expenseId_fkey";

ALTER TABLE "IdempotencyKey"
  RENAME COLUMN "expense_id" TO "resource_id";

ALTER TABLE "IdempotencyKey"
  ADD COLUMN "resource_type" "ResourceType" NOT NULL DEFAULT 'EXPENSE';

-- Após backfill (default cobre rows existentes), remove default para forçar o tipo explícito daqui pra frente.
ALTER TABLE "IdempotencyKey"
  ALTER COLUMN "resource_type" DROP DEFAULT;

DROP INDEX IF EXISTS "idempotency_user_idx";
DROP INDEX IF EXISTS "idempotency_created_at_idx";

CREATE INDEX idempotency_user_idx ON "IdempotencyKey" (user_id);
CREATE INDEX idempotency_created_at_idx ON "IdempotencyKey" (created_at);
CREATE INDEX idempotency_resource_idx ON "IdempotencyKey" (resource_type, resource_id);
```

### Regras de uso (mesma matriz da feature 006, agora poliforme)

| Cenário | Resposta |
|---|---|
| Chave nova → processa POST → grava `(key, userId, resourceType, resourceId)` | 201 |
| Chave existente, mesmo `userId`, mesmo `resourceType` → retorna o recurso existente | 200 |
| Chave existente, outro `userId` → bloqueia | 409 |
| Chave existente, mesmo `userId`, OUTRO `resourceType` | 409 (defesa: chave não pode ser polivalente entre recursos) |
| Sem header `Idempotency-Key` → segue sem dedupe | 201 normal |

---

## Cross-entity invariants (garantias estruturais)

1. **Hierarquia máxima de 2 níveis**: garantida no use case `create-category` e `update-category` — `parentId !== null` ⇒ a categoria referenciada DEVE ter `parentId === null`. Validação aplicacional (impossível enforçar via FK ou CHECK em Postgres sem trigger; mantemos no app para evitar trigger PL/pgSQL).
2. **Despesa sem categoria órfã**: garantida por FK `Expense.categoryId → Category.id ON DELETE RESTRICT`.
3. **Sub-categoria sem pai órfã**: garantida por FK `Category.parentId → Category.id ON DELETE RESTRICT`.
4. **Caminho hierárquico consistente em despesa**: impossível haver mismatch — Expense tem apenas `categoryId`; o "caminho" é derivado server-side via JOIN. Sem dois campos para manter em sincronia.
5. **Unicidade case/whitespace-insensitive por escopo**: garantida pelos dois índices únicos parciais sobre `normalized_name` gerada por DB.
6. **Idempotência sob retry**: garantida pelo PK `key`. Conflito de `userId` ou `resourceType` para a mesma chave → 409.

---

## Migration script structure (`007_expense_categories/migration.sql`)

```text
1.  CREATE COLLATION "pt_BR_ci_as" (ICU, deterministic = false)
2.  CREATE TABLE "Category" (id, group_id, name, parent_id, normalized_name GENERATED…, created_at, updated_at)
3.  ALTER TABLE "Category" ADD FK group_id → FamilyGroup ON DELETE CASCADE
4.  ALTER TABLE "Category" ADD FK parent_id → Category ON DELETE RESTRICT
5.  CREATE UNIQUE INDEX category_root_unique ON Category (group_id, normalized_name) WHERE parent_id IS NULL
6.  CREATE UNIQUE INDEX category_subcategory_unique ON Category (group_id, parent_id, normalized_name) WHERE parent_id IS NOT NULL
7.  CREATE INDEX category_group_idx ON Category (group_id)
8.  CREATE INDEX category_parent_idx ON Category (parent_id) WHERE parent_id IS NOT NULL
9.  ALTER TABLE "Expense" ADD COLUMN category_id uuid NULL
10. ALTER TABLE "Expense" ADD FK category_id → Category ON DELETE RESTRICT
11. CREATE INDEX expense_category_idx ON Expense (category_id) WHERE category_id IS NOT NULL
12. CREATE TYPE "ResourceType" AS ENUM ('EXPENSE','CATEGORY')
13. ALTER TABLE "IdempotencyKey" DROP CONSTRAINT IdempotencyKey_expenseId_fkey
14. ALTER TABLE "IdempotencyKey" RENAME COLUMN expense_id TO resource_id
15. ALTER TABLE "IdempotencyKey" ADD COLUMN resource_type "ResourceType" NOT NULL DEFAULT 'EXPENSE'
16. ALTER TABLE "IdempotencyKey" ALTER COLUMN resource_type DROP DEFAULT
17. DROP INDEX IF EXISTS idempotency_*
18. CREATE INDEX idempotency_user_idx / idempotency_created_at_idx / idempotency_resource_idx
```

Tudo dentro de uma transação Prisma (`BEGIN; … COMMIT;`). Reversível via `prisma migrate reset` para dev; produção usa `prisma migrate deploy`.

---

## Prisma schema delta (representação em `schema.prisma`)

```prisma
enum ResourceType {
  EXPENSE
  CATEGORY
}

model Category {
  id             String    @id @default(uuid())
  groupId        String    @map("group_id")
  group          FamilyGroup @relation(fields: [groupId], references: [id], onDelete: Cascade)
  name           String    @db.VarChar(60)
  parentId       String?   @map("parent_id")
  parent         Category? @relation("CategoryHierarchy", fields: [parentId], references: [id], onDelete: Restrict)
  children       Category[] @relation("CategoryHierarchy")
  // normalizedName is a Postgres GENERATED column; ignored by the client
  // (declared in raw SQL migration). The unique enforcement lives in two partial
  // indexes also declared in raw SQL.
  expenses       Expense[]
  createdAt      DateTime  @default(now()) @map("created_at")
  updatedAt      DateTime  @updatedAt @map("updated_at")

  @@index([groupId], map: "category_group_idx")
  @@map("Category")
}

model Expense {
  // ... campos existentes ...
  categoryId     String?   @map("category_id")
  category       Category? @relation(fields: [categoryId], references: [id], onDelete: Restrict)
  // ... resto ...

  @@index([categoryId], map: "expense_category_idx")
}

model IdempotencyKey {
  key            String       @id @db.VarChar(64)
  userId         String       @map("user_id")
  user           User         @relation(fields: [userId], references: [id], onDelete: Cascade)
  resourceType   ResourceType @map("resource_type")
  resourceId     String       @map("resource_id")
  createdAt      DateTime     @default(now()) @map("created_at")

  @@index([userId], map: "idempotency_user_idx")
  @@index([createdAt], map: "idempotency_created_at_idx")
  @@index([resourceType, resourceId], map: "idempotency_resource_idx")
}
```

Notes:

- O Prisma client não conhece `normalized_name`; tudo bem — operações são por `name` + Prisma escreve `normalized_name` automaticamente (DB calcula).
- Removida a FK direta `IdempotencyKey → Expense`: o cleanup job é a única coisa que mantém a tabela limpa.

---

## Field-level summary for API contract

Os shapes a seguir são consumidos pelo `contracts/openapi.yaml`:

### `Category` (response shape)

```json
{
  "id": "8d6b7e54-...",
  "groupId": "01f9a4cd-...",
  "name": "Alimentação",
  "parentId": null,
  "createdAt": "2026-06-08T13:42:11.001Z",
  "updatedAt": "2026-06-08T13:42:11.001Z"
}
```

(`groupId` é incluído por simetria com a feature 006; cliente já sabe — vem do contexto de sessão — mas explicitar não custa nada e ajuda em debugging.)

### Expense `category` / `subCategory` (denormalized)

```json
{
  "id": "...",
  "amountCents": 12345,
  "date": "2026-06-07",
  "description": "Supermercado",
  "paymentMethod": "CASH_OR_DEBIT",
  "ownerMemberId": "...",
  "createdById": "...",
  "updatedById": "...",
  "category": { "id": "...", "name": "Alimentação" },
  "subCategory": { "id": "...", "name": "Mercado" },
  "createdAt": "...",
  "updatedAt": "..."
}
```

### Delete preview

```json
{
  "subCategoriesCount": 3,
  "affectedExpensesCount": 12
}
```

### Delete blocker response (409)

```json
{
  "code": "category.has_dependencies",
  "message": "Esta categoria ainda possui 3 sub-categorias e 12 despesas vinculadas. Reorganize esses registros antes de excluí-la.",
  "blockers": { "subCategoriesCount": 3, "affectedExpensesCount": 12 }
}
```
