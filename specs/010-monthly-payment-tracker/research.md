# Research: Monthly Payment Tracker (010)

Decisões técnicas que resolvem os pontos em aberto do Technical Context.
Nenhum item permaneceu como NEEDS CLARIFICATION.

## R1 — Geração de instâncias recorrentes: job agendado com janela curta + projeções virtuais

**Decision** (escolha do product owner na sessão de planejamento):
Instâncias persistidas existem apenas na **janela de geração = mês corrente
+ mês seguinte**. Quem materializa é um processo agendado in-process
(timer diário + execução no boot do backend, sem dependência nova) mais
catch-up síncrono na criação/retomada/edição do template. Idempotência por
unique `(recurringBillId, month)` + `createMany skipDuplicates`. Para meses
aplicáveis **além da janela**, `GET /bills?month` devolve **projeções
virtuais** (`projectedBills`): entradas read-only calculadas do template
(descrição, valor estimado, vencimento), não persistidas, com badge
"Prevista" na UI e total próprio no resumo (`projectedCents`, separado dos
três totais de contas reais). O GET é 100% leitura. Regra uniforme: mês com
instância persistida → mostra a instância; mês aplicável sem instância
(além da janela, ou lacuna excepcional) → mostra projeção.

**Rationale**:
- Decisão de produto: o GET não deve escrever; o mês já nasce materializado
  na virada; meses distantes mostram a previsão sem criar linhas no banco.
- Janela de 2 meses limita o trabalho do job a um conjunto pequeno e
  determinístico; "Pendentes futuras" canceladas por stop/delete (FR-022/024)
  são no máximo as do mês seguinte — projeções somem sozinhas.
- Propagação de edição do template (FR-023) fica trivial além da janela:
  projeções sempre refletem o template por construção.
- Scheduler in-process (setInterval diário + boot): zero dependência nova,
  suficiente para 1 instância de backend; o catch-up no boot cobre downtime
  na virada do mês.

**Alternatives considered**:
- *Materialização lazy no GET do mês* (proposta original): cobre qualquer
  mês futuro com instâncias reais e dispensa scheduler, mas faz o GET
  escrever na primeira visita — rejeitada pelo product owner.
- *Job com horizonte longo (N meses) sem projeções*: meses além do
  horizonte ficariam vazios (viola SC-007) e cada template geraria N linhas
  especulativas. Rejeitada.
- *node-cron/BullMQ*: dependência/infra nova sem necessidade — o timer
  diário in-process tem a mesma garantia para um único processo. Rejeitada
  (Princípio IV). Se o backend um dia escalar horizontalmente, o unique no
  banco já torna a execução concorrente do job inofensiva.

**Consequência de UX documentada na spec (FR-025)**: ajustar o valor de um
mês específico distante só é possível quando ele entra na janela; antes
disso a previsão é somente leitura.

## R2 — Semântica de pausa/retomada sem histórico de status: `activeFromMonth`

**Decision**: O template guarda `activeFromMonth` (DATE, dia 1). Regra única
de materialização (usada pelo job, pelo catch-up e pelas projeções): o mês
`M` é elegível se `status == ACTIVE && M >= activeFromMonth && M` casa com
o intervalo (mensal: todo mês; anual: mesmo mês do `startMonth`). O job
materializa os meses elegíveis dentro da janela {corrente, seguinte}. Na
criação, `activeFromMonth = startMonth` (ou mês seguinte, se o usuário
recusar "incluir mês atual" — FR-019). No **resume**, `activeFromMonth =
max(activeFromMonth, mês atual)`.

**Rationale**: FR-021 diz que meses decorridos durante a pausa são pulados.
Sem `activeFromMonth`, o catch-up do boot poderia regenerar meses pausados
(ex.: pausado em maio, retomado em julho, boot materializa junho). Avançar
o marco no resume encerra a janela pausada com **uma coluna**, sem tabela
de histórico de status (Princípio IV). Instâncias já existentes nunca são
afetadas pela pausa (FR-021), o que a regra respeita por só tratar de
criação. Projeções usam a mesma regra de elegibilidade — template pausado
não projeta (FR-025).

**Alternatives considered**:
- *Tabela de períodos de pausa (histórico)*: responde "estava ativo no mês
  M?" com precisão arqueológica, mas nenhum requisito exige reconstruir o
  passado — só não gerar o que foi pulado. Rejeitada (YAGNI).
- *Cancelar instâncias futuras no pause*: contraria FR-021 ("existing
  instances are not modified"). Rejeitada.

## R3 — Criação da despesa vinculada: repositório na transação, não o use case de despesa

**Decision**: `pay-bill.use-case.ts` cria a `Expense` chamando
`expense.repository` diretamente dentro da transação Prisma que também
atualiza a `Bill` (status, campos de pagamento, `expenseId`). Não reutiliza
`create-expense.use-case.ts`.

**Rationale**:
- O use case de despesa existente carrega preocupações de borda HTTP
  (idempotency-key própria, validações de payload) e não participa de
  transação externa. O pagamento precisa de atomicidade conta+despesa
  (SC-003/SC-006): ou ambos persistem ou nenhum.
- As validações de domínio necessárias (membro pertence ao grupo, categoria
  pertence ao grupo, valor > 0) são repetidas no `pay-bill.use-case` — a
  duplicação pontual é preferível ao acoplamento (Princípio IV).
- `update-payment.use-case` e `revert-payment.use-case` seguem o mesmo
  padrão (update/delete da despesa via repositório na mesma transação).

**Alternatives considered**:
- *Reutilizar create-expense.use-case*: exigiria refatorá-lo para aceitar
  transação externa e pular idempotência — mudança invasiva em código
  estável da feature 006. Rejeitada.
- *Evento assíncrono (outbox)*: atomicidade eventual onde a spec pede
  consistência imediata; infraestrutura inexistente. Rejeitada.

## R4 — Exclusão de template: soft-delete (`deletedAt`) em vez de FK SetNull

**Decision**: `DELETE /recurring-bills/:id` faz soft-delete: seta
`deletedAt`, aplica o mesmo efeito do stop (cancela instâncias Pendentes de
meses > atual) e o template some das listagens. A FK
`Bill.recurringBillId` permanece íntegra.

**Rationale**:
- FR-017: a ação "copiar mês anterior" pula instâncias geradas por
  recorrência. Com hard-delete + `SetNull`, instâncias órfãs virariam
  "avulsas" e seriam copiadas — comportamento surpresa. O soft-delete
  preserva a origem da instância para sempre.
- FR-024 exige preservar instâncias passadas "as regular bills" — elas
  permanecem intactas nos seus meses; apenas o template some da lista.
- Badge "Conta fixa" no item do checklist continua correto para meses
  passados mesmo após exclusão do template.

**Alternatives considered**:
- *Hard-delete + SetNull + flag booleana `generatedByRecurrence` na Bill*:
  duas mudanças (coluna + onDelete) para evitar uma (`deletedAt`); perde o
  nome do template na exibição histórica. Rejeitada.
- *Bloquear exclusão se houver instâncias*: contraria a clarificação
  (exclusão permitida preservando histórico). Rejeitada.

## R5 — Modelagem da instância: tabela única `Bill` com campos de pagamento nullable

**Decision**: Uma tabela `Bill` cobre avulsas e instâncias de recorrência
(diferenciadas por `recurringBillId` nullable). Os dados de pagamento
(`paidDate`, `actualAmountCents`, `paidByMemberId`, `paymentMethod`,
`expenseId`) são colunas nullable na própria `Bill`, preenchidas juntas
quando `status = PAID` (invariante de aplicação: todas nulas fora de PAID).

**Rationale**: A spec define exatamente um pagamento por conta (FR-005,
clarification) — uma tabela `BillPayment` 1:1 separada só adicionaria um
join. Colunas nullable + invariante checada nos use cases e nos testes é o
desenho mais simples que preserva o par esperado/real (FR-005). A feature
016 adicionará `creditCardId` como coluna aditiva nesta mesma tabela,
conforme previsto no roadmap (glossário: fatura = Bill com creditCardId).

**Alternatives considered**:
- *Tabela BillPayment separada*: prepararia múltiplos pagamentos parciais —
  explicitamente descartados na clarificação. Rejeitada (YAGNI).

## R6 — Cópia do mês anterior: `dryRun` no mesmo endpoint

**Decision**: `POST /api/v1/bills/copy` com body
`{ targetMonth, dryRun?: boolean }`. Com `dryRun: true` devolve apenas
`{ count }` (contagem de avulsas não-canceladas do mês anterior); sem
`dryRun`, cria as cópias e devolve `{ count, bills }`. O frontend chama
primeiro com `dryRun` para montar a confirmação exigida pelo edge case
("quantas contas serão criadas").

**Rationale**: Um endpoint, duas fases, sem estado intermediário no
servidor; a contagem e a criação usam o mesmo filtro (single source of
truth), eliminando divergência entre preview e execução.

**Alternatives considered**:
- *GET /bills/copy-preview + POST /bills/copy*: dois endpoints com o mesmo
  filtro duplicado. Rejeitada.
- *Sem preview (confirmação genérica)*: viola o edge case da spec. Rejeitada.

## R7 — Navegação de mês: reuso do MonthSelector sem teto

**Decision**: Reutilizar o `MonthSelector` (feature 008) na `PaymentsPage`
**permitindo meses futuros** (FR-002 admite contas em meses futuros),
diferente do dashboard (009) que limita ao mês corrente. O componente já
suporta o caso sem teto; nenhum fork necessário.

**Rationale**: Mesmo padrão visual e de acessibilidade das páginas
existentes; o requisito de futuro é da spec (planejar o mês que vem é o
caso de uso central de contas fixas).
