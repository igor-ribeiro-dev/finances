# Research — Dashboard de Orçamentos e Despesas (009)

**Date**: 2026-06-10 | **Plan**: [plan.md](plan.md)

Nenhum NEEDS CLARIFICATION restou no Technical Context — o stack é herdado das
features 004–008. As decisões abaixo registram as escolhas de design do
read-model e seus trade-offs.

## R1 — Um endpoint agregado vs. composição no cliente

**Decision**: Criar um único endpoint novo `GET /api/v1/dashboard?month=YYYY-MM`
que devolve o mês inteiro (família + membros + categorias + "Sem categoria"),
em vez de o frontend compor `GET /budgets?month` + `GET /expenses` paginado.

**Rationale**:

- A listagem de despesas (feature 006) é paginada por cursor (50/página);
  somar 500 despesas no cliente exigiria até 10 round-trips — incompatível com
  SC-002 (≤ 2 s) e desperdiça banda.
- Agregação financeira é lógica de domínio correctness-critical (Princípio II/III):
  no backend ela é feita com `groupBy _sum` sobre `Int` no Postgres e coberta
  por testes de contrato; no cliente seria float-prone e não testável por Supertest.
- A soma "linhas de membros = total da família" (Clarification Q2) só é garantida
  se ambos saem do mesmo cálculo atômico no servidor.

**Alternatives considered**:

- *Compor `GET /budgets` + novo `GET /expenses/summary`*: dois round-trips e o
  merge (raiz = direta + subs, ex-membros) duplicado no cliente — rejeitado.
- *Estender o `GET /budgets?month` da 008 com gastos*: mistura responsabilidades
  (tela de edição de orçamento não precisa de gastos) e quebra o contrato
  existente — viola API-First sem necessidade.

## R2 — Reuso da resolução de limites da feature 008

**Decision**: O use case `get-month-dashboard` consome o resultado do
`get-month-budget.use-case.ts` existente (envelope `MonthBudget` com
`ResolvedLimit.resolvedCents`) em vez de reimplementar a resolução de
percentuais.

**Rationale**: FR-007 exige exatamente a mesma semântica da 008 (percentual →
centavos half-up; base ausente = "não resolvível"). Reusar o use case garante
que dashboard e tela de orçamentos nunca divirjam (SC-003) e zera o custo de
testes duplicados. `resolvedCents === null` (não resolvível) e ausência de
budget são ambos mapeados para "orçamento não definido" no dashboard.

**Alternatives considered**: chamar só o `budget-resolver.ts` puro com queries
próprias — economizaria a montagem de `summary`/`warnings` que o dashboard não
usa, mas duplicaria a orquestração de fetch (budgets + membros + categorias);
custo de performance é desprezível na escala do produto. Rejeitado.

## R3 — Estratégia de agregação de gastos no Postgres

**Decision**: Adicionar `aggregateMonthSpending(groupId, month)` ao
`expense.repository.ts` com **duas** queries `prisma.expense.groupBy`:
`by: ['ownerMemberId']` e `by: ['categoryId']`, ambas com
`_sum: { amountCents: true }` e `where: { groupId, date: { gte: <YYYY-MM-01>, lt: <mês+1>-01 } }`.

**Rationale**:

- A faixa de data civil usa o índice `(groupId, date DESC, id DESC)` da feature
  006 — duas index-range-scans triviais para ≤ 500 linhas/mês.
- `_sum` roda como `SUM` no Postgres sobre coluna `INTEGER` — aritmética exata,
  sem float (Princípio III).
- `categoryId = null` no resultado do groupBy entrega "Sem categoria" de graça
  (FR-010); categoria excluída já vira `null` via comportamento da feature 007.
- O total da família = soma do groupBy por membro (mesma fonte ⇒ consistência
  Q2 por construção); raiz = direta + subs é resolvido no aggregator puro em
  memória (árvore tem ≤ 2 níveis, ≤ ~50 nós).

**Alternatives considered**:

- *`$queryRaw` com um único SQL e GROUPING SETS*: menos round-trips (2→1), mas
  abre mão da tipagem do Prisma e do padrão estabelecido no repo — complexidade
  sem ganho mensurável nesta escala. Rejeitado (Princípio IV).
- *View materializada / snapshot persistido*: contradiz a Assumption do spec
  (cálculo sob demanda) e adiciona invalidação. Rejeitado.

## R4 — Ex-membros (Clarification Q2)

**Decision**: O groupBy por `ownerMemberId` pode retornar IDs de usuários cujo
`familyGroupId` não aponta mais para o grupo. O aggregator marca essas linhas
com `isExMember: true` (nome vem da relação `ownerMember` preservada pela
feature 006/FR-018) e `budget: null`. Membros ativos sem gasto entram com
`spentCents: 0`. Ex-membros sem gasto no mês não aparecem.

**Rationale**: implementa a Clarification Q2 sem nenhuma mudança de schema — a
relação `Expense.ownerMember → User` nunca é quebrada quando alguém sai do
grupo. Lista de membros ativos vem do mesmo fetch que a 008 já faz.

**Alternatives considered**: linha agregada "Outros" (perde o nome, contraria a
006 que preserva nomes no histórico) e omissão (soma das linhas ≠ total) —
ambas rejeitadas na clarificação.

## R5 — Percentuais calculados no frontend

**Decision**: O contrato trafega **apenas centavos** (`spentCents`,
`resolvedCents`). Percentuais de participação (categoria/total, sub/raiz) e de
consumo (gasto/limite) são derivados na exibição por `utils/percent.ts`:
`Math.round((num * 100) / den)` sobre inteiros, com guarda `den <= 0 → null`.

**Rationale**: uma única fonte de verdade numérica no contrato; percentual é
apresentação (FR-018 manda arredondar para inteiro na exibição). A razão de
dois `number` inteiros seguros é exata o suficiente — o `Math.round` final é o
único ponto de arredondamento, satisfazendo o Princípio III (nenhum valor
monetário é derivado de float). Edge case "±1 ponto na soma dos percentuais"
(spec) fica documentado e testado no util.

**Alternatives considered**: backend calcular e enviar percentuais prontos —
incha o contrato, duplica informação derivável e cria risco de divergência se
a UI precisar de outra base (ex.: % da raiz vs. % do mês, Q3). Rejeitado.

## R6 — Limite de navegação (sem meses futuros, FR-013)

**Decision**: A restrição "sem meses futuros" é imposta **na UI**
(`DashboardMonthSelector` com teto = mês corrente local do usuário). O endpoint
read-only valida apenas o formato `YYYY-MM` (Zod) e devolve zeros para meses
sem dados, inclusive futuros.

**Rationale**: "mês corrente" é um conceito do fuso do usuário; o servidor não
conhece o fuso do cliente e as datas de despesa são civis (sem timezone, FR-013
da 006). Bloquear no servidor por UTC criaria falso-negativo na virada de mês
(usuário em UTC-3 no dia 1º veria erro ao abrir o próprio mês). O endpoint é
somente leitura — aceitar um mês futuro é inofensivo (resposta vazia).

**Alternatives considered**: validação server-side com tolerância de ±1 mês —
complexidade especulativa sem ameaça real. Rejeitado (Princípio IV).

## R7 — Seletor de mês: reuso do MonthSelector da 008

**Decision**: Reutilizar o componente `MonthSelector` (feature 008) por meio de
um wrapper `DashboardMonthSelector` que adiciona: teto no mês corrente
(desabilita "próximo" quando o mês exibido é o corrente) e ação "voltar ao mês
atual" (FR-013/cenário 3 da US4). Se o `MonthSelector` atual não aceitar
`maxMonth`/`onToday` por props, adicionar props **opcionais** (default =
comportamento atual) para não afetar a tela de orçamentos, que permite futuro.

**Rationale**: mesma UX de navegação nas duas telas (consistência), menor diff,
e a tela de orçamentos continua navegando para meses futuros (FR-013 da 008).

**Alternatives considered**: componente novo do zero — duplicação visual e de
acessibilidade já resolvidas na 008. Rejeitado.

## R8 — Categorias exibidas e ordenação

**Decision**: O envelope devolve **todas** as categorias do grupo com seus
gastos (zero incluído) e limites; o frontend exibe na seção de distribuição as
raízes com `spentCents > 0` **ou** teto definido (consumo 0% visível), ordenadas
por participação decrescente (FR-009), com "Sem categoria" posicionado pela
mesma regra. Sub-categorias aparecem na expansão da raiz com % relativo à raiz
(Q3).

**Rationale**: devolver a árvore completa mantém o serializer simples e
determinístico (mesma forma do GET da 008) e deixa a regra de exibição — que é
de apresentação — no componente, onde é testável por RTL. Raiz com teto e gasto
zero precisa aparecer para o usuário ver "0% consumido" (FR-012).

**Alternatives considered**: filtrar/ordenar no backend — acopla apresentação ao
contrato; reordenar exigiria nova versão de API para uma mudança puramente
visual. Rejeitado.
