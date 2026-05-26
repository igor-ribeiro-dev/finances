# Research: Registro de Despesas

**Feature**: 006-expense-registration | **Phase**: 0 — Outline & Research | **Date**: 2026-05-25

## Purpose

Resolver as decisões técnicas remanescentes do `plan.md` antes de modelar dados e escrever contratos. Cada decisão é registrada com sua justificativa e as alternativas consideradas, para servir de referência durante a implementação e para futuras revisões.

---

## 1. Membership / "ativo no grupo"

**Decision**: Usar o campo `familyGroupId` existente na tabela `User` (feature 004) como fonte de verdade de "membro ativo". Um usuário é membro ativo do grupo `G` se e somente se `user.familyGroupId === G`. Não criar tabela `Membership`.

**Rationale**: O schema da feature 004 já modela a relação como FK direto em `User` (1:1 com `FamilyGroup`). Não há suporte a múltiplos grupos por usuário. Adicionar uma tabela de membership só faria sentido se a feature exigisse múltiplos grupos, papéis distintos ou histórico de entradas/saídas — nada disso é requerido pelo spec 006 nem pelo roadmap. Criar tabela agora seria abstração prematura (viola Constitution IV).

**Alternatives considered**:
- Tabela `Membership(userId, groupId, role, joinedAt, leftAt)` com soft-delete de saída. Rejeitada: ninguém pede `role` ainda; histórico não foi requerido.
- Coluna `isActiveInGroup` redundante no `User`. Rejeitada: derivada do próprio `familyGroupId`, redundância sem ganho.

**Implication para 006**:
- Validar `ownerMemberId` em POST/PATCH = `SELECT user WHERE id=? AND familyGroupId=res.locals.groupId`. Se não retornar linha → erro 400 com `field: "ownerMemberId"`.
- "Ex-membro na listagem" (FR-018) = `expense.ownerMember.familyGroupId !== expense.groupId` (no Prisma: join + compara). Sinalizado visualmente no frontend.

---

## 2. Resolução do `groupId` no middleware

**Decision**: Criar middleware `requireMembership` que roda **após** `auth.middleware.ts` (que injeta `res.locals.userId`). Consulta `SELECT familyGroupId FROM User WHERE id=res.locals.userId`, e:
- Se `familyGroupId` é `null` → responde **403** com `code: "no_group"` (usuário autenticado mas sem grupo — fluxo de onboarding deveria ter prevenido isso).
- Se `familyGroupId` existe → injeta em `res.locals.groupId` e segue.

**Rationale**: Mantém o padrão estabelecido por 004 (`res.locals.userId`). Centraliza a verificação num único middleware, evitando que cada use case repita a query. O 403 explícito ajuda debug se uma sessão antiga sobreviver a uma remoção de grupo.

**Alternatives considered**:
- Cada use case fazer a query. Rejeitado: duplicação propensa a esquecimento (uma rota nova esquece de checar e expõe dados de outros grupos).
- Pré-carregar `familyGroupId` no `res.locals` direto pelo `auth.middleware`. Rejeitado: aumenta acoplamento; o middleware de auth não deve saber sobre o conceito de "grupo" da feature 006.

---

## 3. Cursor de paginação

**Decision**: Cursor opaco contendo `{ date: "YYYY-MM-DD", id: "uuid" }` codificado em base64url. O backend decodifica, valida formato, e usa em `WHERE (date, id) < (cursor.date, cursor.id) ORDER BY (date DESC, id DESC) LIMIT 51`. Pega-se 51 para detectar se há próxima página (se vieram 51, há mais; retorna os 50 e o cursor do 50º).

**Rationale**:
- Composto `(date, id)` resolve ties no mesmo dia de forma determinística.
- Base64url no JSON deixa o cursor opaco para o cliente (não tenta interpretar nem fabricar).
- `LIMIT n+1` evita uma segunda query "tem mais?" e é o padrão da indústria (GitHub, Stripe).
- `DATE` em Postgres é ordenável trivialmente; `(date, id)` é índice composto natural.

**Alternatives considered**:
- Offset pagination. Rejeitada por FR-007 (instabilidade sob inserts/edits concorrentes).
- Cursor como hash criptográfico. Rejeitada: nenhuma necessidade de não-reversibilidade; complexidade extra.
- Cursor numérico simples (último `id`). Rejeitada: se `id` for UUID v4 não é ordenável; ordenar por `id` quebra a ordenação por `date`.

**Índice Postgres a criar**: `CREATE INDEX expense_group_date_id_idx ON "Expense" ("groupId", "date" DESC, "id" DESC);` — cobre o caminho de listagem do grupo.

---

## 4. Idempotência do POST

**Decision**: Tabela `IdempotencyKey(key TEXT PK, userId UUID, expenseId UUID, createdAt TIMESTAMPTZ)`. TTL de 24h aplicado por **job de limpeza** rodando diariamente (cron via `pg_cron` ou script Node disparado por scheduler). Lookup no POST é `SELECT expenseId, userId FROM IdempotencyKey WHERE key=?`:
- Não encontrado → executa POST, insere `(key, userId, novoExpenseId, now)` numa transação com a criação da Expense, responde 201.
- Encontrado e `userId` bate → retorna a Expense persistida com 200.
- Encontrado e `userId` diverge → responde 409 `idempotency_key_conflict`.

**Rationale**:
- Tabela dedicada (vs colocar `idempotencyKey` na própria `Expense`) permite TTL independente e suporte futuro a outros endpoints sem mudar a tabela `Expense`.
- Inserção transacional com a criação garante atomicidade (se a Expense persistir, a chave também; sem corridas onde a chave fica "órfã").
- Cleanup por cron é simples e robusto. Trigger automatic TTL no Postgres não é nativo; soluções (extensions) adicionam complexidade desnecessária.

**Alternatives considered**:
- Coluna `idempotencyKey` única na própria `Expense`. Rejeitada: limpar a coluna após 24h é estranho; não escala se outros endpoints precisarem de idempotency.
- Cache externo (Redis). Rejeitada: app pequeno, sem Redis na stack atual, complica deploy.
- Sem idempotency. Rejeitada: spec explícito (FR-024).

---

## 5. Validação Zod no boundary

**Decision**: Schemas Zod em `backend/src/api/expense/expense.validators.ts` para 3 entradas: `createExpenseBody`, `updateExpenseBody`, `listExpensesQuery`. Conversão automática de tipo no `query` (ex.: `limit` vem como string, vira número). Erros do Zod mapeados para o envelope `{ error: { code: "validation_error", message: "Dados inválidos.", fieldErrors: [...] } }` via helper `zodErrorToAppError(err)`.

**Rationale**:
- Zod já está no projeto (estabelecido em 004 para auth).
- Manter validação no boundary respeita Constitution III ("Input validation MUST happen at the API boundary").
- Single source of truth: o schema Zod é referenciado no OpenAPI contract via `z.toJSONSchema` se quisermos no futuro; por ora documenta-se manualmente no `openapi.yaml`.

**Regras concretas dos schemas**:
- `amountCents`: `z.number().int().positive().max(2_000_000_000)` — até R$ 20 milhões; acima é claramente erro de digitação.
- `date`: `z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(d => isValidDate(d)).refine(d => d <= today())` — validações de calendário e "não no futuro".
- `description`: `z.string().trim().min(1).max(200)` — trim implícito (resolve "espaços em branco apenas" do edge case).
- `paymentMethod`: `z.enum(["CASH_OR_DEBIT", "CREDIT_CARD"])`.
- `ownerMemberId`: `z.string().uuid()` (a validação de "pertence ao grupo" é regra de negócio, vai no use case).
- `cursor`: `z.string().base64().optional()` no query.
- `limit`: `z.coerce.number().int().min(1).max(50).default(50)`.

---

## 6. Optimistic UI no frontend (sem React Query / sem Zustand)

**Decision**: Cada hook de mutação (`useCreateExpense`, `useUpdateExpense`, `useDeleteExpense`) recebe callbacks `onOptimistic` e `onRollback` que manipulam o estado local da página (`useState<Expense[]>`). O snapshot anterior é guardado em closure no momento da chamada otimista.

```ts
function useUpdateExpense() {
  return async (id, body, { onOptimistic, onRollback, onSuccess, onError }) => {
    onOptimistic(); // aplica mudança ao estado local
    try {
      const fresh = await expenseService.update(id, body);
      onSuccess(fresh); // confirma com dados do servidor
    } catch (err) {
      onRollback(err); // reverte ao snapshot e mostra toast
      onError(err);
    }
  };
}
```

**Rationale**: Adicionar `@tanstack/react-query` ou `swr` para esta feature isolada seria over-engineering — uma página, um estado de lista. O Context API + custom hook cobre os requisitos sem nova dependência (Constitution IV). Migrar para react-query depois é trivial se outras features pedirem.

**Alternatives considered**:
- `@tanstack/react-query`: feature-rich (cache, mutations, retries automáticos), mas adiciona ~13 kB gzipped e curva de aprendizado para um benefício marginal nesta feature.
- Zustand + actions: gerencia bem estado global, mas a página tem escopo local; não há compartilhamento de estado.
- Redux Toolkit: rejeitado de cara — peso desproporcional.

**Implicação para testes**: hooks testados em isolamento com `renderHook` + mocks do `expenseService`; cenários: optimistic-success, optimistic-rollback-on-network-error, optimistic-rollback-on-validation-error, 404-during-edit.

---

## 7. Máscara monetária BR

**Decision**: Componente próprio `MoneyInput` (sem lib). Estado interno é `valueInCents: number`. Renderiza `Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valueInCents / 100)`. Eventos:
- `onKeyDown` para dígitos `0-9` → `setValue(prev => prev * 10 + Number(key))`
- `onKeyDown` para `Backspace` → `setValue(prev => Math.floor(prev / 10))`
- `onKeyDown` para `Delete`/`Esc` → limpa para `0`
- Ignora tudo o mais (vírgula, ponto, letras)

**Rationale**: A lib `react-number-format` ou `imask` adicionaria ~20 kB para um componente de ~80 linhas. Comportamento "estilo Nubank" é simples de implementar e perfeitamente testável.

**Alternatives considered**: `react-number-format` — bem testada mas overkill. `imask` — flexível mas configuração não trivial para o modo "centavos da direita". Não compensa.

---

## 8. Geração de `Idempotency-Key` no frontend

**Decision**: Usar `crypto.randomUUID()` (Web Crypto API). Nova chave por **tentativa de submit** do formulário (não por abertura do modal). Após `201`/`200` confirmado, a chave armazenada em estado do hook é descartada — próxima submissão gera nova UUID.

**Rationale**: `crypto.randomUUID()` está disponível em todos os browsers alvo (Chrome 92+, Firefox 95+, Safari 15.4+) — bem dentro dos requisitos. Zero dependência externa.

**Alternatives considered**: `uuid` npm package — extra 5 kB sem necessidade.

---

## 9. Confirmação de valor alto (FR-011) — onde validar?

**Decision**: **Client-side only**. O backend aceita qualquer valor positivo até `2 000 000 000` centavos (R$ 20 M, conforme schema Zod) — sem confirmação. O frontend, ao detectar `amountCents > 100 000 000` (R$ 1 M) no submit, intercepta o save: abre um sub-modal de confirmação ("Valor acima de R$ 1.000.000,00 — confirmar?") com Cancelar/Confirmar antes de chamar a API.

**Rationale**: A confirmação é uma medida ergonômica contra erro de digitação humano. O backend não deveria rejeitar valores legítimos altos — pode haver despesa real de mais de R$ 1 M (carro, financiamento, etc.). Validação dupla seria ruído sem ganho.

**Alternatives considered**: Backend rejeitar e cliente reenviar com flag `confirmHighValue: true`. Rejeitada: API mais complexa para um problema de UX puramente local.

---

## 10. PaymentMethod no wire

**Decision**: String literal em maiúsculas: `"CASH_OR_DEBIT"` e `"CREDIT_CARD"`. Tanto no banco (Prisma `enum`) quanto no JSON da API. Frontend mantém constantes equivalentes em TypeScript (`as const`) e mapeia para labels PT-BR ("Dinheiro/Débito", "Cartão de Crédito") no momento de renderizar.

**Rationale**: Strings em maiúsculas são a convenção Prisma enum, evitam confusão com camelCase de outros campos e são auto-documentadas (não exigem consulta a tabela de códigos). Mapeamento para PT-BR fica no frontend (única camada que mostra ao usuário).

**Alternatives considered**: Inteiros `0/1`. Rejeitada: precisa de tabela de tradução para ser legível; mudança futura é mais arriscada. Kebab-case `"cash-or-debit"`. Rejeitada: diverge da convenção de enums Prisma.

---

## 11. Tipo do ID da Expense

**Decision**: UUID v4 string, gerado pelo Postgres via `gen_random_uuid()` (extensão `pgcrypto`, já habilitada por padrão no Postgres 13+). Schema Prisma: `id String @id @default(uuid()) @db.Uuid`. Consistente com `User`, `FamilyGroup` e demais entidades da feature 004.

**Rationale**: UUID resolve geração distribuída sem coordenação (cliente nunca precisa pedir um ID antes). 36 chars é aceitável no payload. Não há requisito de ID curto/shareable.

**Alternatives considered**: CUID/NanoID — válidos, mas o restante do schema usa UUID; consistência > preferência. Auto-increment Int — mais leve mas vaza taxa de registros (não-issue para app familiar; ainda assim, padronizar com 004 vale mais).

---

## 12. Tratamento do 404 concorrente no frontend

**Decision**: Erro HTTP do `expenseService` é tipado como discriminated union:
```ts
type ServiceError =
  | { kind: "validation"; fieldErrors: FieldError[] }
  | { kind: "not_found" }
  | { kind: "conflict"; code: string }
  | { kind: "network" }
  | { kind: "server"; message: string };
```
Cada hook trata `kind: "not_found"` conforme FR-027:
- `useUpdateExpense`: chama callback `on404Concurrent(id)` em vez de rollback; a UI exibe o modal de erro "excluída por outro membro" e remove a linha da lista local.
- `useDeleteExpense`: trata 404 como sucesso (`onSuccess()` direto); nenhum toast, linha já removida.

**Rationale**: Discriminated union força exhaustive handling em TS strict — impossível esquecer um caso. Centraliza a tradução HTTP → semântica de UI em um único módulo.

**Alternatives considered**: Lançar `Error` genérico e checar `err.status === 404`. Rejeitada: perde tipagem; fácil escrever bug que trata 404 como erro de rede.

---

## 13. Listagem: skeleton de loading

**Decision**: Reusar o componente `SkeletonPlaceholder` da feature 005 enquanto a primeira página carrega (após mount do `ExpensesPage`). Durante o "load more" do infinite scroll, exibir um spinner discreto no rodapé da lista (não substituir o conteúdo já visível).

**Rationale**: Mantém consistência visual com o resto do app (FR-015 da feature 005 estabeleceu o padrão). Spinner durante load-more evita "salto" visual.

**Alternatives considered**: Skeleton em cada novo lote. Rejeitada: distrai e é desproporcional.

---

## 14. Estratégia de migração Prisma

**Decision**: Uma migração nova `<timestamp>_006_expense_registration` que cria:
1. `enum PaymentMethod` (CASH_OR_DEBIT, CREDIT_CARD)
2. Tabela `Expense` com todos os campos do data-model
3. Tabela `IdempotencyKey`
4. Índice `expense_group_date_id_idx` em `(groupId, date DESC, id DESC)`
5. Índice `idempotency_user_idx` em `(userId)` para queries de inspeção (não crítico mas útil)

Migration é gerada via `npx prisma migrate dev --name 006_expense_registration` rodando contra Postgres local. SQL revisado antes de commit.

**Rationale**: Prisma Migrate é a única ferramenta de migração na stack; padrão estabelecido em 004. Uma migration por feature mantém o histórico legível.

---

## 15. Limpeza dos `IdempotencyKey` (TTL 24h)

**Decision**: Job manual rodado por script `backend/scripts/cleanup-idempotency-keys.ts`, agendado em ambiente real via cron externo (sistema do host, Kubernetes CronJob, etc.). Em desenvolvimento local, rodar manualmente ou via `npm run cleanup:idempotency`. Não introduzir scheduler no processo Node nesta feature.

**Rationale**: Schedulers in-process (node-cron, agenda) acrescentam dependência e complicam testes. Para um app familiar, cron externo é robusto e simples. Script é idempotente (`DELETE WHERE createdAt < NOW() - INTERVAL '24 hours'`).

**Alternatives considered**: `pg_cron` no Postgres — funciona mas adiciona infra. `node-cron` — acoplamento de scheduler à aplicação web. Rejeitadas em prol de simplicidade.

---

## Resolved status

✅ **0 NEEDS CLARIFICATION restantes**. Todas as decisões técnicas necessárias para data-model e contracts estão tomadas. Phase 1 pode prosseguir.
