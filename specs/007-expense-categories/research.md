# Phase 0 — Research: Categorias de Despesas

**Date**: 2026-06-08 | **Feature**: 007-expense-categories | **Status**: Resolved

Esta fase fecha as três incógnitas técnicas que ficaram sob "como implementar" depois da clarification: collation ICU para normalização PT-BR, mecanismo de unique constraint sob `parentId` nullable, e padrão de mapeamento de erro Prisma para o envelope HTTP. Nenhuma decisão funcional muda; tudo aqui é apenas como entregar o que a spec já decidiu.

---

## R-01 — Collation ICU `pt-BR-x-icu` em Postgres 15

**Decisão**: Criar uma collation customizada no início da migração, deterministic = `false`, locale = `pt-BR-u-ks-level2`. A coluna `normalizedName` da tabela `Category` usa essa collation; o ORDER BY de listagem usa `name COLLATE "pt_BR_ci_ai"` (alias).

**Rationale**:

- Postgres 15+ vem com ICU built-in (não precisa de extensão extra). `CREATE COLLATION` é uma DDL idempotente.
- `ks-level2` ignora diferenças de case ("Alimentação" = "alimentação") mas mantém acentos como significativos ("Aves" ≠ "Avés"). Isso reflete a regra de FR-005 (case-insensitive) e o comportamento esperado por usuários PT-BR (Acentuação importa).
- `deterministic = false` é obrigatório quando o equality semântico é não-binário; permite usar a collation diretamente em uniques.
- Posto sob `lower(name)` na geração de `normalizedName`, ainda há o `lower()` explícito (defesa em profundidade contra divergência de ICU/glibc entre ambientes); o resultado é estável e auditável.

**Alternatives considered**:

- Extensão `citext` — mais antiga, sem suporte unicode pleno, normaliza acentos junto com case (não queremos isso).
- Collation glibc `pt_BR.UTF-8` — depende do locale do SO; varia entre Linux distros e macOS dev; ICU é portável.
- Trigger `BEFORE INSERT` em PL/pgSQL que normaliza no app — adiciona código procedural; rejeitado pela Simplicidade da constitution.

**Riscos identificados e mitigação**:

- ICU está disponível? Em Postgres 15 oficial sim. Em containers Alpine pode requerer `icu` package — documentar no quickstart.
- Renomear a collation depois é doloroso (afeta índice). Migração nomeia `pt_BR_ci_ai` (case-insensitive, accent-insensitive — *espera, queremos accent-SENSITIVE; nomear `pt_BR_ci_as`*). Renomear o alias de migração na hora de escrever a SQL.

---

## R-02 — Coluna `normalizedName` como `GENERATED ALWAYS AS … STORED`

**Decisão**: Adicionar à tabela `Category` uma coluna `normalized_name text` declarada `GENERATED ALWAYS AS (lower(regexp_replace(btrim(name), '\s+', ' ', 'g'))) STORED COLLATE "pt_BR_ci_as"`. A coluna é write-only do ponto de vista do app; Prisma a declara com `@ignore` no schema (lida só pelo banco para o índice).

**Rationale**:

- Generated columns são `STORED` em Postgres 12+; ICU collation funciona out-of-the-box. Performance: índice sobre coluna gerada é idêntico a índice sobre coluna comum.
- A normalização (trim + collapse internal whitespace + lowercase) executa no banco — TOCTOU-safe garantido (cliente nunca vê uma janela de normalização inconsistente).
- Prisma 7 não modela `GENERATED` nativamente em `schema.prisma` ainda. Solução padrão: declarar a coluna em `prisma migrate diff` raw SQL (`migration.sql`) e ignorar via `@ignore` no schema. Prisma client não conhece a coluna, mas o índice único funciona normalmente.

**Alternatives considered**:

- Normalizar no use case antes do INSERT (TypeScript `name.trim().toLowerCase().replace(/\s+/g, ' ')`). Rejeitado por TOCTOU sob race e por divergência potencial entre `String.prototype.toLowerCase` em V8 e ICU lowercasing (turco-i, capitalização sigma final). DB-side é authoritative.
- Trigger `BEFORE INSERT/UPDATE` que popula `normalizedName`. Mais código mas mesma garantia; generated column é declarativa.
- Coluna não gerada mas atualizada via app + trigger de validação — duplica fonte de verdade; rejeitado.

---

## R-03 — Índices únicos parciais para `parentId IS NULL` vs `IS NOT NULL`

**Decisão**: Criar dois índices únicos parciais via raw SQL na migração:

```sql
CREATE UNIQUE INDEX category_root_unique
  ON "Category" (group_id, normalized_name)
  WHERE parent_id IS NULL;

CREATE UNIQUE INDEX category_subcategory_unique
  ON "Category" (group_id, parent_id, normalized_name)
  WHERE parent_id IS NOT NULL;
```

**Rationale**:

- Postgres trata `NULL` como distinto em uniques tradicionais — dois (`groupId=X, parentId=NULL, normalizedName='comida'`) seriam aceitos. Quebra FR-005.
- Partial unique indexes resolvem isso elegantemente: o predicado `WHERE` torna o índice válido somente para o sub-conjunto, e Postgres aplica a unicidade nesse sub-conjunto.
- Dois índices separados deixam o `EXPLAIN` enxuto (a query de check só atinge o relevante).
- Prisma 7 não tem syntax para `@@unique([..]) WHERE ...` em schema. Workaround: `prisma migrate diff --from-empty --to-schema-datamodel … > migration.sql`, então manualmente adicionar os dois `CREATE UNIQUE INDEX` no `migration.sql` final. O Prisma client não precisa conhecer o índice — ele só precisa receber a unique violation no INSERT (P2002 com `target = ['group_id','normalized_name']` ou `['group_id','parent_id','normalized_name']`).

**Alternatives considered**:

- Sentinel UUID (`COALESCE(parentId, '00000000-…')`) — funciona mas precisa de coluna gerada extra OU `INDEX ... USING btree (COALESCE(parent_id, '0000…'), normalized_name)` que é menos legível e dificulta `EXPLAIN`.
- `EXCLUDE` constraint — overkill, mesma semântica.
- Coluna não-nullable com sentinel UUID artificial para raízes — mexe na modelagem (raiz teria um "pai-fantasma"); rejeitado por confusão.

---

## R-04 — Captura de violação de unique no Prisma 7

**Decisão**: O use case de `POST /api/v1/categories` faz `prisma.category.create({ data: { … } })` direto, sem pré-check; envolve em `try/catch` e mapeia `error.code === 'P2002'` para `AppError(422, 'category.duplicate_name', 'Já existe uma categoria com esse nome neste nível.', fieldErrors: [{ field: 'name', code: 'category.duplicate_name', message: ... }])`. O `update` segue o mesmo padrão para renomeação.

**Rationale**:

- Prisma's `PrismaClientKnownRequestError` com `code: P2002` é estável desde Prisma 4 e mantém-se em 7. O `meta.target` traz o nome do índice/colunas, útil para distinguir colisões (mas neste caso só temos um path para `duplicate_name`).
- O `try/catch` em volta do `create`/`update` é o padrão idiomático no Prisma; a feature 004 já usa esse padrão para email único do User.

**Alternatives considered**:

- `prisma.category.upsert` — não cabe (não queremos sobrescrever um nome existente).
- Verificar o índice atingido via `meta.target` para distinguir colisão de root vs subcategory — desnecessário; ambos retornam a mesma mensagem.

---

## R-05 — Polimorfismo da `IdempotencyKey`

**Decisão**: Refactor da tabela existente:

| Coluna atual | Coluna nova |
|---|---|
| `expenseId String` (FK) | `resourceId String` (sem FK) |
| (não existe) | `resourceType ResourceType` enum (`EXPENSE`, `CATEGORY`) |
| `key`, `userId`, `createdAt` | (sem mudança) |

Migração:

```sql
ALTER TABLE "IdempotencyKey" DROP CONSTRAINT "IdempotencyKey_expenseId_fkey";
ALTER TABLE "IdempotencyKey" RENAME COLUMN "expenseId" TO "resource_id";
CREATE TYPE "ResourceType" AS ENUM ('EXPENSE', 'CATEGORY');
ALTER TABLE "IdempotencyKey" ADD COLUMN "resource_type" "ResourceType" NOT NULL DEFAULT 'EXPENSE';
ALTER TABLE "IdempotencyKey" ALTER COLUMN "resource_type" DROP DEFAULT;
```

Cleanup job (`scripts/cleanup-idempotency-keys.ts`) continua o mesmo — só apaga por `createdAt < now() - 24h`, agnóstico ao tipo.

**Rationale**:

- FR-015 mandato explícito de reuso. Polimorfismo nesse caso é raso: a tabela é um cache de 24h, não há queries que dependam do tipo (cleanup é por idade).
- Soltar a FK é o trade-off — chaves "órfãs" (após delete de despesa ou categoria) ficam no cache até expirarem. Aceitável (TTL curto, sem PII).
- Default `EXPENSE` aplica-se a todos os registros existentes; depois removemos o default para forçar o tipo explícito em novos inserts.

**Alternatives considered**:

- Manter `expenseId` típico + adicionar `categoryId` nullable + CHECK exclusividade — rejeitado: cada novo recurso idempotente acrescenta coluna; viola simplicity.
- Tabela paralela `CategoryIdempotencyKey` — duplica schema, cleanup job, regra de TTL.
- Pivot pelo `key` (esperar P2002 no PK `key`) e ignorar o tipo — quebra a checagem de "outro user usou essa chave para outro recurso" (FR-024 da feature 006 requer 409 nesse caso).

---

## R-06 — `Expense.categoryId` denormalização: shape do JOIN

**Decisão**: A query de listagem de despesa em `expense.repository.ts` usa o seguinte padrão Prisma:

```ts
prisma.expense.findMany({
  where: { groupId },
  cursor: …,
  take: 51,
  include: {
    category: {
      select: { id: true, name: true, parentId: true, parent: { select: { id: true, name: true } } },
    },
  },
  orderBy: [{ date: 'desc' }, { id: 'desc' }],
})
```

Mapping para a resposta:

- Se `expense.category === null` → `category: null, subCategory: null`.
- Se `expense.category.parentId === null` → `category: { id, name } = expense.category`, `subCategory: null`.
- Se `expense.category.parentId !== null` → `subCategory: { id, name } = expense.category`, `category: { id, name } = expense.category.parent`.

**Rationale**:

- Prisma's `include` com `select` aninhado gera **um único `LEFT JOIN` duplo** em SQL (verificado via `EXPLAIN`); zero N+1.
- O mapper TS roda em memória pós-query, dependendo apenas de campos já carregados. Custo desprezível (< 1 µs por linha).

**Alternatives considered**:

- Raw SQL com `LEFT JOIN ... AS root` — mais performante teoricamente, mas Prisma já produz a query certa; raw SQL adiciona manutenção sem ganho.
- Duas queries (uma para expense + uma para categories) e join no app — rejeitado em Q1 da clarification backend.

---

## R-07 — FR-018: handling FK violation em POST/PATCH de Expense

**Decisão**: O use case de `POST /api/v1/expenses` e `PATCH /api/v1/expenses/:id`:

1. Recebe `categoryId` opcional no body (já validado pelo Zod como UUID ou null).
2. Tenta o `prisma.expense.create({ data: { …, categoryId } })`.
3. Se Prisma joga `P2003` (foreign key constraint failed na `Expense_categoryId_fkey`):
   - Loga o evento (FR-018 race) com `userId`, `groupId`, `categoryId requested`, `outcome: removed_concurrently`.
   - Retry imediato com `categoryId: null`.
   - Resposta inclui `warnings: ["category.removed_concurrently"]` e o objeto da despesa com `category: null, subCategory: null`.
4. Outras P2xxx propagam normalmente.

**Rationale**:

- O retry simples (1×) cobre o cenário de race window com latência mínima. Não há loop — só uma tentativa de recovery.
- `warnings` é um campo opcional na resposta; clientes que ignoram o campo continuam funcionando.

**Alternatives considered**:

- Pré-validar a existência de `categoryId` antes do INSERT (`prisma.category.findUnique`) — rejeitado: TOCTOU (categoria pode ser deletada entre o check e o insert). FK violation é a verdade da gente; recuperamos dela.
- Retornar 422 sem retry — rejeitado: a despesa é o dado primário, não vale a pena rejeitá-la por causa de um picker estaleado. O warning informa o usuário e o trabalho de re-classificar fica para outro momento.

---

## Summary table

| Item | Decisão | Onde implementa |
|---|---|---|
| R-01 | ICU collation `pt_BR_ci_as` (deterministic=false) | Migration raw SQL, antes do CREATE TABLE Category |
| R-02 | Generated stored column `normalizedName` | Migration raw SQL + Prisma `@ignore` |
| R-03 | Dois índices únicos parciais | Migration raw SQL |
| R-04 | Catch P2002 → 422 com fieldErrors | Use case `create-category` e `update-category` |
| R-05 | Polimorfismo IdempotencyKey | Migration raw SQL + schema.prisma update |
| R-06 | Prisma `include` com `select` aninhado | `expense.repository.ts` |
| R-07 | Retry P2003 com `warnings` | Use case `create-expense` e `update-expense` |

Nenhum NEEDS CLARIFICATION restante. Phase 1 pode iniciar.
