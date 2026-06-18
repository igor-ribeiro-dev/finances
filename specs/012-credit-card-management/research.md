# Phase 0 — Research: Credit Card Management

Resolve as decisões de design abertas após a clarificação (Q1–Q5 da spec). Sem
NEEDS CLARIFICATION pendentes: a stack é a das features 004–011 e o modelo foi
fixado. Formato: Decisão / Justificativa / Alternativas consideradas.

## R1 — Como modelar a quitação snapshot da fatura (FR-009)

**Decisão**: Adicionar `Bill.settledByFaturaId` (self-FK anulável, `onDelete:
SetNull`). Uma **compra** em aberto é uma `Bill` com `paymentMethod=CREDIT_CARD`,
`isFatura=false`, `status=PAID`, `creditCardId=X` e `settledByFaturaId=NULL`.
**Pagar** a fatura F do cartão X (em transação) faz `UPDATE` setando
`settledByFaturaId=F` em todas as compras abertas de X naquele instante (o
snapshot). **Reverter** F faz `UPDATE` limpando `settledByFaturaId` onde
`settledByFaturaId=F`. O total em aberto = soma de compras de X com
`settledByFaturaId NULL`.

**Justificativa**: É a representação mais simples que satisfaz simultaneamente o
snapshot (Q1) e a reversão exata (FR-009) — o vínculo explícito registra qual
fatura quitou cada compra, permitindo desfazer precisamente. Um único campo,
sem tabela de junção.

**Alternativas consideradas**: (a) Intervalo por data de corte na fatura
(Q1 opção B) — rejeitada na clarificação; exigiria modelar fechamento como
regra de quitação. (b) Tabela de junção fatura↔compras — overkill para
relação 1‑fatura→N‑compras já expressável por FK. (c) Recalcular "aberto" por
diferença de somatórios sem vínculo — não permite reverter o conjunto exato.

## R2 — Como distinguir uma fatura de uma compra (Q2/FR-005)

**Decisão**: Marcador booleano explícito `Bill.isFatura` (`default false`),
nunca inferido. Fatura: `isFatura=true` + `creditCardId`. Compra de cartão:
`isFatura=false` + `creditCardId` + `paymentMethod=CREDIT_CARD`.

**Justificativa**: Q2 resolveu por marcador explícito; uma fatura também é
"paga" e tem `creditCardId`, então inferência por método/estado seria ambígua.
Booleano é suficiente (só dois papéis) e barato de indexar.

**Alternativas consideradas**: enum `BillKind {PURCHASE, FATURA}` — equivalente,
porém mais cerimônia para 2 valores; convenção por categoria — frágil
(rejeitada em Q2).

## R3 — Exclusão da fatura do orçamento/dashboard (FR-010/SC-004)

**Decisão**: Acrescentar `isFatura: false` ao `where` de
`billRepository.aggregateMonthSpending` (hoje
`{ groupId, status:'PAID', paidDate: range }`). As compras-filhas continuam
contando (são `isFatura=false`); a fatura paga deixa de contar.

**Justificativa**: Única mudança necessária para evitar dupla contagem — as
compras já contaram na data da compra (FR-004). Sem novo índice: o filtro extra
é uma coluna booleana na mesma varredura.

**Alternativas consideradas**: marcar a fatura como categoria especial e
excluir por categoria — acopla a regra a dados do usuário; manter a fatura como
`CASH_OR_DEBIT` e filtrar por método — quebraria relatórios futuros que querem
a fatura como evento de caixa distinto (roadmap 013).

## R4 — Bills de crédito históricas (sem cartão) na migração

**Decisão**: **Não** converter dados. Bills `CREDIT_CARD` anteriores a esta
feature permanecem com `creditCardId=NULL` (grandfathered) e ficam **fora** das
visões por cartão e do cálculo de aberto. A obrigatoriedade de `creditCardId`
(FR-003) vale para **criar/editar** gastos de crédito daqui para frente.

**Justificativa**: Não há como inventar cartões para o passado sem dados; e o
passado não tinha rastreio de fatura. Mantém a migração puramente estrutural
(Princípio IV) e não altera nenhum total histórico do dashboard.

**Alternativas consideradas**: criar um cartão "Legado" e vincular tudo —
introduz dado fictício e um cartão que o usuário não reconhece; bloquear a
migração até o usuário classificar — fricção inaceitável no rollout.

## R5 — Unicidade de nome de cartão entre ativos (FR-001)

**Decisão**: Reusar o padrão de `Category`: coluna gerada `normalizedName`
(`GENERATED ALWAYS`, collation `pt_BR_ci_as`, `@ignore` no Prisma) + índice
**único parcial** `(groupId, normalizedName) WHERE status = 'ACTIVE'`, declarado
em SQL bruto na migração.

**Justificativa**: Unicidade case/acento-insensível consistente com o resto do
produto (PT-BR), e o `WHERE status=ACTIVE` permite reaproveitar um nome cujo
cartão foi arquivado. Prisma não expressa `@@unique` com `WHERE`, daí o SQL
bruto — padrão já estabelecido nas features 007/008.

**Alternativas consideradas**: unicidade simples `@@unique([groupId, name])` —
sensível a maiúsculas/acentos e bloquearia renome após arquivar; validar só na
aplicação — corrida entre requisições concorrentes.

## R6 — Uma fatura pendente por cartão (FR-012a)

**Decisão**: Índice **único parcial** `(creditCardId) WHERE isFatura = true AND
status = 'PENDING'` (SQL bruto). Guarda também na aplicação em
`register-fatura.use-case` retornando `fatura.pending_exists` (409/400) antes do
INSERT, para mensagem amigável; o índice é a rede de segurança contra corrida.

**Justificativa**: Garante invariante no banco (defesa em profundidade) e
mantém o snapshot inequívoco — o aberto sempre mapeia a um único pagamento
futuro.

**Alternativas consideradas**: só guarda de aplicação — sujeito a corrida; só
índice — mensagem de erro genérica de violação de constraint.

## R7 — Papel do dia de fechamento (Q3/FR-001a)

**Decisão**: `CreditCard.closingDay` (Int 1–31) é **informativo/agrupamento**:
um helper de aplicação (`creditCardCycle`) deriva o ciclo corrente a partir do
fechamento e de "hoje" para **rotular/agrupar** as compras em aberto na visão
por cartão e no resumo do tracker (a fatura "que está fechando"). **Não** entra
em nenhuma query de quitação. O total em aberto continua sendo todo o saldo não
quitado, independentemente do ciclo.

**Justificativa**: Q3 fixou o fechamento como previsão/visualização, preservando
o snapshot (Q1). Cálculo puro em memória, sem coluna extra além de `closingDay`.

**Alternativas consideradas**: usar o fechamento para particionar o aberto por
ciclo no banco — reintroduziria o modelo de período rejeitado; ignorar o
fechamento — perderia a previsão "quando fecha" pedida em Q3.

## R8 — Pagar a fatura: endpoint dedicado vs. reuso de `POST /bills/:id/pay`

**Decisão**: **Reusar** `POST /bills/:id/pay`. O `pay-bill.use-case` detecta
`bill.isFatura` e, na mesma transação do pagamento, executa a quitação snapshot
(R1). `revert-payment.use-case` faz o estorno. A **criação** da fatura é que usa
ação dedicada (`POST /credit-cards/:id/faturas`, FR-005), não a cópia/recorrência
(Q5). Editar a fatura paga não mexe no conjunto quitado (imutável, FR-009).

**Justificativa**: A fatura é uma `Bill`; reusar o ciclo de pagamento evita um
endpoint paralelo e mantém estados/validações consistentes (Princípio IV). O
efeito colateral de quitação é localizado por um `if (bill.isFatura)`.

**Alternativas consideradas**: endpoint `POST /faturas/:id/pay` separado —
duplicaria estado/validação de pagamento; trigger no banco — esconde a regra
de negócio fora da camada de aplicação (contra Observabilidade/Simplicidade).
