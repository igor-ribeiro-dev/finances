# Phase 0 — Research: Expense Consolidation

Todas as ambiguidades de produto foram resolvidas no `/speckit-clarify`
(sessão 2026-06-14, Q1/Q2/Q3). Este documento registra as decisões **técnicas**
que sustentam o plano. Sem itens `NEEDS CLARIFICATION` em aberto.

Convenção: **Decision / Rationale / Alternatives considered**.

---

## R1 — Forma do endpoint de "registrar gasto"

**Decision**: Novo endpoint dedicado `POST /api/v1/bills/log` que cria uma `Bill`
já no estado `PAID` em um único INSERT. Body:
`{ description, amountCents, date, paymentMethod, paidByMemberId, categoryId? }`.
Mapeamento: `expectedAmountCents = actualAmountCents = amountCents`;
`dueDate = paidDate = date`; `month = primeiro dia do mês de date`;
`status = PAID`; `ownerMemberId = null` (Q3); `createdById = updatedById = userId`.

**Rationale**: Contrato distinto e explícito (Princípio I). `POST /bills`
existente cria contas **Pendentes** e aceita `dueDate` futuro; o registro de
gasto exige regime de validação oposto (data **não futura**) e estado final
diferente. Endpoint separado mantém cada contrato coeso e testável.

**Alternatives considered**:
- Estender `POST /bills` com flag `payNow` — rejeitado: mistura dois regimes de
  validação (vencimento futuro vs. data passada) e dois estados num só schema.
- Criar Pendente e depois `POST /bills/:id/pay` — rejeitado: duas escritas, não
  é "um passo" (SC-001), pior latência e UX.

---

## R2 — Paridade de validação (FR-010)

**Decision**: `logSpendingBody` (Zod) espelha exatamente as regras da antiga
despesa: `amountCents` inteiro `> 0` (≤ 2e9); `date` calendário válido e **não
futura**; `description` `trim` 1–200; `paymentMethod ∈ {CASH_OR_DEBIT,
CREDIT_CARD}`; `paidByMemberId` UUID **obrigatório** e **membro ativo do grupo**
(verificado no use case, como `create-bill` faz com `ownerMemberId`).

**Rationale**: FR-010 manda herdar as regras de despesa. As regras já existem em
`expense.validators.ts` (que será removido) — replicadas no `bill.validators.ts`
reutilizando os campos `descriptionField`/`expectedAmountCentsField` já lá e
adicionando um `notFutureDateField` (o `dueDateField` atual permite futuro).

**Alternatives considered**:
- Reusar `payBillBody` — rejeitado: usa `dueDateField` (permite data futura) e
  não tem `description`/`categoryId`.

---

## R3 — Mapeamento de membro responsável (Clarification Q3)

**Decision**: Registro rápido e migração setam **apenas** `paidByMemberId`
(pagador = responsável); `ownerMemberId` permanece **nulo**. O checklist exibe
o pagador nas contas Pagas. Implica:
(a) `bill.repository` inclui a relação `paidByMember` no `findByMonth`/serialização;
(b) `bill.serializer` expõe `payment.paidByMember { id, name }` (hoje só há
`paidByMemberId`);
(c) `BillItem.tsx` exibe `payment.paidByMember.name` quando `status=PAID`
(hoje exibe só `ownerMember`).

**Rationale**: Decisão Q3. O orçamento por membro já usa o pagador (ver R4);
expor o nome do pagador mantém o responsável visível e preserva a indicação de
ex-membro do Cenário 4 da US2 sem reintroduzir `ownerMemberId`.

**Alternatives considered**:
- Setar `ownerMemberId = paidByMemberId` (opção A da Q3) — **rejeitada pelo
  usuário**.
- Exibir só `ownerMember` (status quo) — rejeitado: contas Pagas registradas/
  migradas ficariam sem nome no checklist.

---

## R4 — Fonte de gasto do dashboard (FR-003/FR-006/SC-002)

**Decision**: Mover a agregação mensal de gasto de `expenseRepository`
para `billRepository.aggregateMonthSpending(groupId, month)`:
```
where = { groupId, status: 'PAID', paidDate: { gte: mêsInício, lt: próximoMês } }
byMember   = groupBy(['paidByMemberId'], _sum: actualAmountCents)
byCategory = groupBy(['categoryId'],     _sum: actualAmountCents)
```
A chave temporal é **`paidDate`** (mês do pagamento), **não** `Bill.month`
(mês do vencimento). Adicionar índice `@@index([groupId, paidDate])`.
`get-month-dashboard.use-case` passa a chamar essa função; a resolução de nomes
de ex-membros por id é inalterada (apenas os comentários "expense owners" viram
"bill payers").

**Rationale**: SC-002 exige totais idênticos. Na feature 010, a despesa criada
ao pagar tinha `date = paidDate`, `ownerMemberId = paidByMemberId`,
`amountCents = actualAmountCents`, `categoryId = bill.categoryId`. Logo, agregar
contas Pagas por esses campos reproduz exatamente as mesmas somas. Usar
`paidDate` (e não `month`) honra a regra "conta no mês do pagamento" (FR-003 e o
caso de borda da conta planejada paga em mês diferente do vencimento). O índice
novo dá paridade com o antigo `expense_group_date_id_idx`.

**Alternatives considered**:
- Agregar por `Bill.month` — rejeitado: erra contas pagas fora do mês do
  vencimento, alterando totais (viola SC-002).
- Manter um read-model materializado — rejeitado: dashboard 009 já recomputa a
  cada chamada (sem snapshots); recomputar sobre contas é igualmente barato.

---

## R5 — Simplificação de pagar/reverter/editar pagamento

**Decision**: Remover a criação/sincronização/remoção de `Expense` de
`pay-bill`, `update-payment` e `revert-payment`. Passam a mutar apenas os campos
de pagamento da `Bill` (`status`, `paidDate`, `actualAmountCents`,
`paidByMemberId`, `paymentMethod`, `updatedById`). Reverter só limpa esses
campos (PAID→PENDING). Some o `expenseId` e o caminho 409
`expense.managed_by_bill`.

**Rationale**: FR-002 — a conta Paga É o registro. Sem despesa vinculada não há
transação dupla; os use cases ficam mais simples (Princípio IV) e mantêm
atomicidade trivial (1 update).

**Alternatives considered**:
- Manter a `Expense` vinculada como espelho — rejeitado: é exatamente a entidade
  paralela que a feature elimina (FR-002).

---

## R6 — Realocação de helpers do módulo de despesa removido

**Decision**:
- `zodErrorToFieldErrors` sai de `api/expense/expense.validators.ts` para um
  módulo neutro `api/zod-helpers.ts`. Importadores atualizados:
  `bill.validators`, `budget.validators`, `category.validators`,
  `recurring-bill.validators`.
- `idempotency.repository.ts` sai de `domain/expense/` para `domain/idempotency/`.
  Importador atualizado: `create-category.use-case`.
- A tabela `IdempotencyKey` e o enum `ResourceType` **permanecem** —
  `ResourceType.CATEGORY` é usado por categorias. Linhas com
  `resourceType=EXPENSE` são apagadas na migração; a **remoção do valor de enum
  `EXPENSE`** fica como limpeza **opcional/adiada** (remover valor de enum exige
  ausência de referências e é frágil — sem ganho funcional).

**Rationale**: A remoção do módulo `expense/` (FR-007) não pode quebrar
categorias/orçamentos/contas, que reusam esses helpers hoje via re-export do
módulo de despesa. Mover para módulos neutros é refactor mecânico, não nova
abstração.

**Alternatives considered**:
- Manter um "stub" do módulo de despesa só com os helpers — rejeitado: deixa
  namespace morto que contradiz "o módulo deixa de existir".

---

## R7 — Estratégia da migração de dados (FR-004/005/006; SC-002/003; Q2)

**Decision**: Uma migração Prisma `2026XXXX_011_expense_consolidation`, em
transação, com passos ordenados (SQL bruto onde necessário):

1. `ALTER TABLE "Bill"` add `createdById`/`updatedById` (nullable, FK `User`);
   add `@@index([groupId, paidDate])`; alterar FK de `categoryId` para
   `ON DELETE RESTRICT` (ver R8).
2. **Backfill de autoria** nas contas já vinculadas a despesa:
   `UPDATE Bill SET createdById = e.createdById, updatedById = e.updatedById
   FROM Expense e WHERE Bill.expenseId = e.id`.
3. **Converter avulsas**: `INSERT INTO Bill (...) SELECT (...) FROM Expense e
   WHERE e.id NOT IN (SELECT expenseId FROM Bill WHERE expenseId IS NOT NULL)` —
   mapeando os campos (R1), com `status=PAID`, `ownerMemberId=NULL`,
   `recurringBillId=NULL`, e **preservando** `createdAt`/`updatedAt` da despesa
   (fidelidade de auditoria, FR-004).
4. `ALTER TABLE "Bill" DROP COLUMN "expenseId"` (e a constraint FK).
5. `DROP TABLE "Expense"` (e índices), removendo as relações em
   User/FamilyGroup/Category do schema.
6. `DELETE FROM "IdempotencyKey" WHERE "resourceType" = 'EXPENSE'`.

Operacionalmente precedida de **backup** do banco (Q2 — irreversível;
recuperação depende do backup). Validada por teste de conversão (R9 abaixo /
SC-002/003).

**Rationale**: `INSERT…SELECT` roda uma vez no deploy, é atômico e lossless; a
ordem evita violação de FK. Volume por família é pequeno; não há necessidade de
job em lote em app.

**Authorship nullability**: contas **Pendentes/Canceladas** pré-existentes nunca
tiveram autor registrado → `createdById/updatedById = NULL`. Novas contas
(`create-bill`, `copy-previous-month`, materialização de recorrência,
`log-spending`) passam a setar autoria. FR-004 só exige preservar autoria das
**despesas convertidas**, o que é cumprido.

**Alternatives considered**:
- Job de migração em camada de aplicação — rejeitado: mais lento, não atômico,
  reinventa o que `INSERT…SELECT` faz de graça.
- `createdById` NOT NULL com sentinela para contas legadas — rejeitado: inventa
  autoria falsa; anulável é honesto.

---

## R8 — Integridade de categoria na exclusão (item Outstanding da clarificação)

**Decision**: Re-apontar a guarda de exclusão de categoria de `Expense` para
`Bill`: `category.repository` conta contas afetadas na subárvore (substitui
`affectedExpensesCount` por `affectedBillsCount`); `preview-delete-category` e o
backstop P2003 de `delete-category` seguem juntos. Além disso, mudar
`Bill.categoryId` de `onDelete: SetNull` para `onDelete: Restrict` (paridade com
a antiga `Expense.categoryId` Restrict).

**Rationale**: Com a consolidação, contas são os registros de gasto (como
despesas eram); a regra "bloquear exclusão de categoria em uso" (FR-013 da
feature de categorias) deve seguir os dados. `Restrict` no banco dá defesa em
profundidade e evita recategorização silenciosa de contas Pagas históricas
(preserva SC-002 ao longo do tempo). Fecha o item deixado em aberto na
clarificação.

**Alternatives considered**:
- Manter `SetNull` e confiar só na guarda de aplicação — rejeitado: deriva
  silenciosa de dados se a guarda for contornada; integridade mais fraca para
  app financeiro.

---

## R9 — Remoção de rota/endpoint e verificação lossless (FR-007; SC-002/003)

**Decision**:
- **Frontend**: remover o item `despesas` de `NAV_ITEMS`; a rota `/despesas`
  passa a `<Navigate to="/pagamentos" replace />` (redireciona humanos, não
  404). Remover `ExpensesPage` + componentes/hooks/service/types de despesa.
- **Backend**: desmontar `expenseRouter` em `app.ts` e deletar os arquivos do
  módulo; `/api/v1/expenses/*` cai no 404 do app ("resource does not exist").
- **Verificação lossless**: teste de migração que semeia despesas avulsas +
  uma despesa vinculada a conta, roda a conversão, e assere: (i) cada avulsa
  vira exatamente 1 conta Paga com mesmos valores; (ii) a vinculada não gera
  conta nova; (iii) `aggregateMonthSpending` sobre contas == agregação que a
  antiga lógica produziria sobre as despesas (família, por membro, por
  categoria) — SC-002/SC-003.

**Rationale**: FR-007 distingue humano (redirect) de cliente de API (404). O
teste de conversão é o gate de confiança da migração irreversível.

**Alternatives considered**:
- `/despesas` → 404 também no frontend — rejeitado: FR-007 pede redirecionar o
  usuário ao tracker.

---

## R10 — Idempotência no registro rápido

**Decision**: `POST /bills/log` **não** usa `Idempotency-Key` (consistente com a
criação de conta da feature 010, que não usa). Duplo-clique mitigado no cliente
(botão desabilitado enquanto pendente).

**Rationale**: Princípio IV — a spec não exige idempotência aqui; a idempotência
da era-despesa era acoplada ao seu próprio fluxo de criação (removido). Não há
requisito que justifique reintroduzi-la.

**Alternatives considered**:
- Adicionar `ResourceType.BILL` + idempotência ao registro rápido — rejeitado:
  complexidade sem requisito.
