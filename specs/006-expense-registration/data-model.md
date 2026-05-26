# Data Model: Registro de Despesas

**Feature**: 006-expense-registration | **Phase**: 1 — Design & Contracts | **Date**: 2026-05-25

Modela as duas tabelas novas (`Expense`, `IdempotencyKey`) e o enum `PaymentMethod`. Reusa `User` e `FamilyGroup` da feature 004 sem mudanças. Convenções: snake_case nos nomes de coluna SQL, camelCase no Prisma/TS, UUID v4 strings como identificadores.

---

## 1. Entidades

### 1.1 Expense

Registro principal: um gasto único atribuído a um membro de um grupo familiar.

| Campo            | Tipo (Prisma)      | Tipo (Postgres)   | Constraints                                          | Notas                                                                                                            |
|------------------|--------------------|-------------------|------------------------------------------------------|------------------------------------------------------------------------------------------------------------------|
| `id`             | `String`           | `UUID`            | `@id @default(uuid()) @db.Uuid`                      | PK gerada via `gen_random_uuid()` (extensão `pgcrypto`).                                                          |
| `groupId`        | `String`           | `UUID`            | FK → `FamilyGroup.id`, `ON DELETE RESTRICT`, NOT NULL | Proprietário implícito. Derivado de `res.locals.groupId` na criação.                                              |
| `amountCents`    | `Int`              | `INTEGER`         | `> 0`, NOT NULL, validação Zod `<= 2_000_000_000`    | Valor em centavos. Sem ponto flutuante.                                                                          |
| `date`           | `DateTime`         | `DATE`            | NOT NULL, `<= CURRENT_DATE`, validação Zod           | `@db.Date` no Prisma. Sem hora, sem timezone.                                                                    |
| `description`    | `String`           | `VARCHAR(200)`    | NOT NULL, trim no Zod, length 1–200                  | Texto livre.                                                                                                     |
| `paymentMethod`  | `PaymentMethod`    | enum nativo PG    | NOT NULL                                             | `CASH_OR_DEBIT` ou `CREDIT_CARD`.                                                                                |
| `ownerMemberId`  | `String`           | `UUID`            | FK → `User.id`, `ON DELETE RESTRICT`, NOT NULL       | Membro responsável pela despesa. Editável.                                                                       |
| `createdById`    | `String`           | `UUID`            | FK → `User.id`, `ON DELETE RESTRICT`, NOT NULL       | Autor do registro. **Write-once**: ignorado em PATCH (FR-025).                                                   |
| `updatedById`    | `String`           | `UUID`            | FK → `User.id`, `ON DELETE RESTRICT`, NOT NULL       | Último editor. Definido server-side em POST (= `createdById`) e sobrescrito em cada PATCH (FR-028).               |
| `createdAt`      | `DateTime`         | `TIMESTAMPTZ`     | NOT NULL, `@default(now())`                          | Auditoria.                                                                                                       |
| `updatedAt`      | `DateTime`         | `TIMESTAMPTZ`     | NOT NULL, `@updatedAt`                               | Auto-atualizado pelo Prisma em qualquer write.                                                                   |

**Relations**:
- `group FamilyGroup @relation(fields: [groupId], references: [id])`
- `ownerMember User @relation("ExpenseOwner", fields: [ownerMemberId], references: [id])`
- `createdBy User @relation("ExpenseAuthor", fields: [createdById], references: [id])`
- `updatedBy User @relation("ExpenseEditor", fields: [updatedById], references: [id])`

**Índices**:
- `expense_group_date_id_idx`: `(groupId, date DESC, id DESC)` — cobre listagem com cursor.
- (Implícito) PK em `id`.

**Regras de validação adicionais (use case, não DB)**:
- `ownerMemberId` DEVE ser um `User` cujo `familyGroupId === res.locals.groupId` no momento da operação. Se não, erro 400 com `field: "ownerMemberId"`, `code: "owner_not_in_group"`.
- `createdById` é sempre `res.locals.userId` em POST. PATCH ignora.
- `updatedById` é sempre `res.locals.userId` em POST (igual ao `createdById` na criação) e em cada PATCH bem-sucedido. PATCH ignora se enviado no body.

**Serialização na API**: as respostas JSON dos endpoints `GET/POST/PATCH /api/v1/expenses` DEVEM incluir, além de `ownerMemberId`, um objeto aninhado `ownerMember: { id, name, isExMember }` derivado em runtime pelo backend (`isExMember = ownerMember.familyGroupId !== expense.groupId`). O frontend usa esse campo para o indicador "ex-membro" (FR-018) sem precisar de chamada adicional. O contrato completo está em `contracts/openapi.yaml#/components/schemas/Expense`.

**Por que `ON DELETE RESTRICT` em vez de `CASCADE`**:
- `FamilyGroup` ainda não tem fluxo de deleção; se ganhar um, eliminar as despesas junto exige decisão de produto (não silenciosamente perder histórico).
- `User`: FR-018 diz que despesas de ex-membros permanecem. Deletar o `User` físico apagaria as despesas — proibido. (Sair do grupo é setar `familyGroupId = null` no `User`, não deletar.)

---

### 1.2 PaymentMethod (enum)

```prisma
enum PaymentMethod {
  CASH_OR_DEBIT
  CREDIT_CARD
}
```

Postgres: `CREATE TYPE "PaymentMethod" AS ENUM ('CASH_OR_DEBIT', 'CREDIT_CARD');`

A feature 016 (Credit Card Management) NÃO altera este enum — ela adiciona uma coluna opcional `creditCardId` em `Expense` referenciando uma nova tabela `CreditCard`. O `paymentMethod` continua sendo a discriminator binária (cash/débito vs crédito).

---

### 1.3 IdempotencyKey

Armazena chaves enviadas em `POST /api/v1/expenses` para dedupe sob retry / duplo-clique. TTL operacional de 24h.

| Campo         | Tipo (Prisma) | Tipo (Postgres) | Constraints                                        | Notas                                                                          |
|---------------|---------------|-----------------|----------------------------------------------------|--------------------------------------------------------------------------------|
| `key`         | `String`      | `VARCHAR(64)`   | `@id`                                              | UUID v4 string ou outro token gerado pelo cliente. Tamanho máx prático ≤ 64.   |
| `userId`      | `String`      | `UUID`          | FK → `User.id`, `ON DELETE CASCADE`, NOT NULL      | Usuário que enviou a chave.                                                    |
| `expenseId`   | `String`      | `UUID`          | FK → `Expense.id`, `ON DELETE CASCADE`, NOT NULL   | Despesa criada pela primeira requisição com essa chave.                        |
| `createdAt`   | `DateTime`    | `TIMESTAMPTZ`   | NOT NULL, `@default(now())`                        | Usado pelo job de cleanup (TTL 24h).                                           |

**Relations**:
- `user User @relation(fields: [userId], references: [id], onDelete: Cascade)`
- `expense Expense @relation(fields: [expenseId], references: [id], onDelete: Cascade)`

**Índices**:
- `idempotency_user_idx`: `(userId)` — útil para auditoria/inspeção; não-crítico para o caminho quente.
- `idempotency_created_at_idx`: `(createdAt)` — acelera o `DELETE WHERE createdAt < ...` do cleanup job.

**Comportamento do POST** (resolvido por `create-expense.use-case.ts`):

```
1. Recebe header `Idempotency-Key: <key>` (opcional, mas a UI sempre envia)
2. Se a chave foi enviada:
   a. SELECT key, userId, expenseId FROM IdempotencyKey WHERE key = ?
   b. Se encontrado:
      - userId === res.locals.userId → retorna 200 com a Expense já existente
      - userId ≠ res.locals.userId → retorna 409 (code: "idempotency_key_conflict")
   c. Se não encontrado: prossegue
3. Numa transação Prisma:
   - Cria a Expense
   - Insere IdempotencyKey (key, userId, expense.id, now)
   - Commit
4. Retorna 201 com a Expense
```

**Cleanup**: script standalone `backend/scripts/cleanup-idempotency-keys.ts`:
```sql
DELETE FROM "IdempotencyKey" WHERE "createdAt" < NOW() - INTERVAL '24 hours';
```

---

## 2. Schema Prisma completo a adicionar

```prisma
enum PaymentMethod {
  CASH_OR_DEBIT
  CREDIT_CARD
}

model Expense {
  id              String          @id @default(uuid()) @db.Uuid
  groupId         String          @db.Uuid
  group           FamilyGroup     @relation(fields: [groupId], references: [id])
  amountCents     Int
  date            DateTime        @db.Date
  description     String          @db.VarChar(200)
  paymentMethod   PaymentMethod
  ownerMemberId   String          @db.Uuid
  ownerMember     User            @relation("ExpenseOwner", fields: [ownerMemberId], references: [id])
  createdById     String          @db.Uuid
  createdBy       User            @relation("ExpenseAuthor", fields: [createdById], references: [id])
  updatedById     String          @db.Uuid
  updatedBy       User            @relation("ExpenseEditor", fields: [updatedById], references: [id])
  createdAt       DateTime        @default(now())
  updatedAt       DateTime        @updatedAt
  idempotencyKeys IdempotencyKey[]

  @@index([groupId, date(sort: Desc), id(sort: Desc)], map: "expense_group_date_id_idx")
}

model IdempotencyKey {
  key       String   @id @db.VarChar(64)
  userId    String   @db.Uuid
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  expenseId String   @db.Uuid
  expense   Expense  @relation(fields: [expenseId], references: [id], onDelete: Cascade)
  createdAt DateTime @default(now())

  @@index([userId], map: "idempotency_user_idx")
  @@index([createdAt], map: "idempotency_created_at_idx")
}
```

**Mudanças em modelos existentes**:

```prisma
model User {
  // ... campos existentes
  expensesAuthored Expense[]        @relation("ExpenseAuthor")
  expensesEdited   Expense[]        @relation("ExpenseEditor")
  expensesOwned    Expense[]        @relation("ExpenseOwner")
  idempotencyKeys  IdempotencyKey[]
}

model FamilyGroup {
  // ... campos existentes
  expenses Expense[]
}
```

---

## 3. State transitions

`Expense` tem ciclo de vida trivial: **criada → (editada N vezes) → excluída**. Sem máquina de estados explícita; não há campo `status`. Auditoria de quem criou está em `createdById`/`createdAt`; auditoria de "última edição" é apenas `updatedAt` (sem `lastModifiedById` — não foi requerido pelo spec).

`IdempotencyKey` tem ciclo: **inserida no momento da criação da Expense → deletada pelo cleanup após 24h** (ou em cascata se a Expense ou o User for deletado).

---

## 4. Volume e escala esperados

| Métrica                                  | Estimativa             | Implicação                                                       |
|------------------------------------------|------------------------|------------------------------------------------------------------|
| Despesas por família por ano             | 200–1 000              | Índice composto cobre query sem hot-spot.                        |
| Famílias na base (primeiro ano)          | 1–10 (uso pessoal)     | Tamanho trivial.                                                 |
| Despesas totais (5 anos, projeção)       | ≤ 50 000               | Cabe folgadamente em qualquer Postgres.                          |
| `IdempotencyKey` linhas vivas (steady)   | ≤ 100 (TTL 24h)        | Cleanup diário mantém a tabela enxuta.                            |
| Tamanho da página de listagem            | 50 itens               | Fixo no schema Zod; ~10–20 kB JSON por página.                   |

Cursor pagination garante que listar a 100ª página seja igual em custo à 1ª (uma index seek, não scan).

---

## 5. Relação com features adjacentes

- **Feature 007 (Categorias)** adicionará `categoryId String?` em `Expense`. Tipo opcional preserva compatibilidade com registros criados antes da 007.
- **Feature 016 (Cartões)** adicionará `creditCardId String?` em `Expense` e uma nova tabela `CreditCard`. Quando `paymentMethod = CREDIT_CARD` e a 016 estiver entregue, o frontend exigirá `creditCardId`; até lá, o campo permanece nulo.
- **Feature 015 (Monthly Payment Tracker)** introduzirá `Bill` / `BillPayment`. A `Bill.creditCardId` referenciará a mesma `CreditCard`. Sem mudanças em `Expense`.
- **Feature 011 (Histórico/Filtros)** vai adicionar filtros à query de listagem (não muda o schema; só o validador Zod e o `WHERE`). Cursor permanece compatível.

Nenhuma dessas features futuras invalida o data-model atual — só estende.

---

## 6. Decisões NÃO tomadas (deliberadamente)

- **Soft-delete de Expense**: não implementado. Hard-delete simplifica o modelo e o spec é explícito (FR-006 + Assumptions: "exclusão definitiva, não há lixeira").
- **Trilha de auditoria (audit log)**: não implementado. `createdById`/`createdAt`/`updatedAt` cobrem o básico; auditoria completa é candidata a feature futura se compliance exigir.
- **Versionamento de Expense**: não implementado. Last-write-wins (FR-017) descarta a necessidade.
- **Multi-currency**: não implementado. Single-currency é decisão do produto (roadmap 003).
- **`Membership` como tabela separada**: não criada. Membership = `User.familyGroupId === FamilyGroup.id` (decisão registrada em `research.md §1`).
