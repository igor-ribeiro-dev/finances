# Feature Specification: Dashboard de Orçamentos e Despesas

**Feature Branch**: `009-budget-dashboard`

**Created**: 2026-06-10

**Status**: Draft

**Input**: User description: "Próxima fase do roadmap" — Feature 008 do roadmap do produto (specs/003-product-roadmap): Budget & Expense Dashboard — visão resumida do mês de calendário corrente mostrando total gasto vs. orçamento da família, gasto de cada membro vs. seu orçamento individual mensal e a distribuição de gastos por categoria com percentuais, com navegação para meses passados.

## Clarifications

### Session 2026-06-10

- Q: Despesas lançadas em sub-categorias contam para o consumo do teto da categoria raiz no dashboard? → A: Sim — o consumo da raiz agrega as despesas lançadas diretamente nela **mais** todas as despesas das suas sub-categorias; o teto da raiz funciona como guarda-chuva (consistente com a feature 008).
- Q: Como a seção de membros trata ex-membros com despesas no mês exibido? → A: Aparecem como linha inativa ("ex-membro") com seu gasto, sem comparação de orçamento — assim a soma das linhas de membros bate com o total da família.
- Q: Ao expandir uma categoria raiz, o percentual de cada sub-categoria é relativo a quê? → A: Ao **total gasto da própria raiz** — as fatias de uma raiz expandida somam 100% dela (espelha a feature 008, onde percentual de sub-categoria incide sobre a raiz pai).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Ver o Resumo do Mês: Gasto Total vs. Orçamento da Família (Priority: P1)

Um membro do grupo familiar abre o dashboard e vê, para o mês de calendário corrente, o total gasto pela família até o momento comparado ao orçamento da família definido para o mês (feature 008 — Gestão de Orçamentos). A comparação mostra o valor gasto, o limite do mês, o percentual consumido e o saldo restante (ou o valor excedido, quando o gasto ultrapassa o orçamento). Todas as despesas registradas no mês — incluindo as pagas com cartão de crédito — contam para o total pela data da despesa (a data informada no registro, conforme feature 006).

**Why this priority**: É a pergunta central que motiva o uso do produto: "quanto já gastamos este mês e quanto ainda podemos gastar?". Sem essa visão, as features de registro de despesas e de orçamentos não se conectam — o usuário registra dados mas não enxerga o resultado. É o coração do dashboard e a fatia mínima que já entrega valor sozinha.

**Independent Test**: Com um orçamento da família definido para o mês corrente (ex.: R$ 5.000) e algumas despesas registradas (ex.: somando R$ 3.250), o usuário abre o dashboard e vê o total gasto (R$ 3.250), o orçamento (R$ 5.000), o percentual consumido (65%) e o saldo restante (R$ 1.750) — sem precisar de nenhuma outra seção do dashboard.

**Acceptance Scenarios**:

1. **Given** o mês corrente possui orçamento da família de R$ 5.000 e despesas registradas somando R$ 3.250, **When** o usuário abre o dashboard, **Then** o sistema exibe o total gasto (R$ 3.250,00), o orçamento da família (R$ 5.000,00), o percentual consumido (65%) e o saldo restante (R$ 1.750,00).
2. **Given** o total gasto do mês excede o orçamento da família (ex.: R$ 5.800 gastos contra R$ 5.000 de orçamento), **When** o usuário abre o dashboard, **Then** o sistema exibe o percentual consumido acima de 100% (116%) e destaca visualmente o valor excedido (R$ 800,00) como estouro de orçamento.
3. **Given** o mês corrente não possui orçamento da família definido (ausente ou zero), **When** o usuário abre o dashboard, **Then** o sistema exibe o total gasto do mês sem barra/percentual de comparação, com indicação de "orçamento não definido" e um caminho para a tela de orçamentos.
4. **Given** o mês corrente não possui nenhuma despesa registrada, **When** o usuário abre o dashboard, **Then** o sistema exibe total gasto R$ 0,00 e, se houver orçamento, 0% consumido e saldo igual ao orçamento — sem erro nem tela vazia sem explicação.
5. **Given** despesas pagas em dinheiro/débito e no cartão de crédito foram registradas no mês, **When** o usuário consulta o total gasto, **Then** ambas as formas de pagamento contam integralmente para o total, pela data da despesa — não há figura separada de "caixa pago" no dashboard.

---

### User Story 2 - Acompanhar o Gasto de Cada Membro vs. Seu Orçamento Individual (Priority: P1)

No mesmo dashboard, o membro vê uma seção com cada membro do grupo familiar e, para cada um, o total que aquele membro gastou no mês (despesas atribuídas a ele) comparado ao seu orçamento individual do mês, quando definido — com percentual consumido e saldo restante por membro. Orçamentos individuais definidos como percentual do orçamento da família são exibidos já resolvidos em R$.

**Why this priority**: O produto é um controle de orçamento familiar com tetos individuais por membro — acompanhar quem está dentro ou fora do seu teto é o segundo propósito central do dashboard, no mesmo nível de importância da visão da família. Sem isso, os orçamentos por membro (feature 008) não têm consumo visível.

**Independent Test**: Com dois membros no grupo, orçamentos individuais definidos (ex.: R$ 2.000 e R$ 1.500) e despesas atribuídas a cada um (ex.: R$ 1.200 e R$ 1.800), o usuário abre o dashboard e vê uma linha por membro com gasto, limite, percentual e saldo — incluindo o segundo membro destacado por ter excedido o limite.

**Acceptance Scenarios**:

1. **Given** o grupo tem membros com orçamentos individuais definidos para o mês e despesas atribuídas a eles, **When** o usuário abre o dashboard, **Then** o sistema lista cada membro com seu total gasto no mês, seu limite individual, o percentual consumido e o saldo restante.
2. **Given** um membro gastou mais do que seu orçamento individual, **When** o usuário visualiza a seção de membros, **Then** o excesso daquele membro é destacado visualmente (percentual acima de 100% e valor excedido).
3. **Given** um membro possui despesas no mês mas não possui orçamento individual definido (ausente, zero ou percentual não resolvível), **When** o usuário visualiza a seção de membros, **Then** o gasto do membro é exibido sem comparação de limite, com indicação de "sem orçamento definido".
4. **Given** um membro não registrou nenhuma despesa no mês, **When** o usuário visualiza a seção de membros, **Then** o membro aparece com gasto R$ 0,00 (e comparação normal contra seu limite, se houver).
5. **Given** o orçamento individual de um membro foi definido como percentual do orçamento da família (ex.: 30% de R$ 5.000), **When** o usuário visualiza a seção de membros, **Then** o limite é exibido pelo valor resolvido em R$ (R$ 1.500,00) e o consumo é calculado sobre esse valor.
6. **Given** todos os membros do grupo são visíveis entre si (membros iguais, feature 004), **When** qualquer membro abre o dashboard, **Then** ele vê os gastos e orçamentos de todos os membros do grupo — não apenas os seus.

---

### User Story 3 - Ver a Distribuição de Gastos por Categoria com Percentuais (Priority: P2)

O membro vê no dashboard a distribuição do gasto do mês entre as categorias do grupo: cada categoria raiz com o valor gasto e o percentual que representa do total gasto no mês. Categorias raiz podem ser expandidas para mostrar a distribuição entre suas sub-categorias. Despesas sem categoria são agrupadas em "Sem categoria". Quando uma categoria possui teto de orçamento definido para o mês (feature 008), a linha também mostra o consumo em relação a esse teto.

**Why this priority**: Entender "para onde o dinheiro foi" é o complemento natural do "quanto gastamos". É P2 porque o dashboard já é utilizável com as visões de família e de membros (P1); a quebra por categoria enriquece a análise e prepara o terreno para a feature 009 do roadmap (analytics), que aprofundará essa visão com gráficos.

**Independent Test**: Com despesas categorizadas em pelo menos duas categorias raiz (e uma despesa sem categoria), o usuário abre o dashboard e vê cada categoria com valor gasto e percentual do total do mês, o grupo "Sem categoria" com o valor restante, e os percentuais somando 100%.

**Acceptance Scenarios**:

1. **Given** o mês possui despesas distribuídas em categorias (ex.: Alimentação R$ 1.500, Moradia R$ 1.000, sem categoria R$ 500, total R$ 3.000), **When** o usuário abre o dashboard, **Then** o sistema exibe cada categoria raiz com valor gasto e percentual do total (50%, 33%, 17%), ordenadas da maior para a menor participação.
2. **Given** uma categoria raiz possui sub-categorias com despesas, **When** o usuário expande a raiz, **Then** o sistema exibe a quebra entre as sub-categorias (incluindo um agrupamento para despesas lançadas direto na raiz, quando houver), com valores e percentuais relativos ao total da própria raiz (somando 100% dela).
3. **Given** existem despesas sem categoria no mês, **When** o usuário visualiza a quebra por categoria, **Then** elas aparecem agrupadas como "Sem categoria", com valor e percentual como qualquer outro grupo.
4. **Given** uma categoria raiz possui teto de orçamento definido para o mês (em valor ou percentual resolvido), **When** o usuário visualiza a linha da categoria, **Then** além do percentual do total gasto, o sistema mostra o consumo daquela categoria em relação ao seu teto (gasto vs. limite), destacando quando excedido.
5. **Given** o mês não possui nenhuma despesa, **When** o usuário visualiza a seção de categorias, **Then** o sistema exibe um estado vazio explicativo (sem divisão por zero nem percentuais inválidos).

---

### User Story 4 - Navegar para Meses Anteriores (Priority: P2)

O dashboard abre sempre no mês de calendário corrente, mas o membro pode navegar para qualquer mês passado para rever a fotografia daquele mês: total gasto vs. orçamento da família daquele mês, gastos por membro vs. orçamentos daquele mês e a distribuição por categoria daquele mês. Os valores exibidos para um mês passado usam os orçamentos e despesas daquele mês.

**Why this priority**: Rever meses anteriores é essencial para a função de acompanhamento ao longo do tempo, mas só tem valor depois que as visões do mês corrente (P1/P2 acima) existem. A navegação reutiliza integralmente as seções já especificadas, apenas mudando o mês de referência.

**Independent Test**: Com despesas e orçamentos registrados em um mês anterior, o usuário navega do mês corrente para esse mês e confirma que todas as seções (família, membros, categorias) refletem os dados daquele mês; ao voltar, o mês corrente é exibido novamente.

**Acceptance Scenarios**:

1. **Given** o usuário abre o dashboard, **When** nenhuma navegação foi feita, **Then** o mês exibido é o mês de calendário corrente, claramente identificado (ex.: "junho de 2026").
2. **Given** o usuário está no mês corrente, **When** ele navega para um mês anterior com despesas e orçamentos registrados, **Then** todas as seções do dashboard passam a refletir as despesas e os orçamentos daquele mês.
3. **Given** o usuário navegou para um mês passado, **When** ele usa a ação de voltar ao mês atual, **Then** o dashboard retorna ao mês de calendário corrente em uma única ação.
4. **Given** um mês passado não possui despesas nem orçamentos, **When** o usuário navega até ele, **Then** o dashboard exibe os estados vazios correspondentes, sem erro.
5. **Given** o usuário está no mês corrente, **When** ele tenta avançar para um mês futuro, **Then** a navegação não avança além do mês corrente — o dashboard cobre apenas o mês corrente e meses passados.

---

### Edge Cases

- **Orçamento alterado no meio do mês**: o dashboard sempre reflete os valores de orçamento vigentes no momento da consulta — alterar o orçamento da família ou de um membro atualiza imediatamente os percentuais e saldos exibidos (não há congelamento de valores históricos dentro do mês).
- **Orçamento percentual não resolvível**: um orçamento de membro ou categoria definido como percentual cuja base não existe (orçamento da família ausente/zero) é tratado pelo dashboard como "orçamento não definido" — o gasto é exibido sem comparação.
- **Membro que saiu do grupo com despesas no mês**: as despesas atribuídas a um ex-membro continuam contando integralmente para o total da família e para a quebra por categoria; na seção de membros, o ex-membro aparece como linha inativa ("ex-membro") com seu gasto e sem comparação de orçamento (seus orçamentos deixam de existir, conforme feature 008).
- **Categoria excluída com despesas no mês**: despesas cuja categoria foi excluída passam a contar no grupo "Sem categoria" (consequência do comportamento da feature 007 ao excluir categorias).
- **Despesa registrada/editada por outro membro**: ao recarregar o dashboard, qualquer membro vê os totais atualizados — todos os membros veem exatamente os mesmos números para o mesmo mês.
- **Arredondamento de percentuais**: percentuais exibidos são arredondados para exibição; a soma dos percentuais por categoria pode divergir de 100% em ±1 ponto por arredondamento, sem que isso seja um erro.
- **Gasto com orçamento zero/ausente**: nunca exibir "divisão por zero" ou percentuais infinitos — sem limite definido, não há percentual de consumo.
- **Mês com muitas categorias e membros**: a visão resumida deve permanecer legível — categorias ordenadas por participação e seções de membros/categorias roláveis ou compactas; ver SC-002.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O sistema MUST exibir um dashboard com o resumo financeiro de um mês de calendário, abrindo por padrão no mês corrente.
- **FR-002**: O dashboard MUST exibir o total gasto pela família no mês — a soma de todas as despesas do grupo cuja **data da despesa** (data civil informada no registro, conforme FR-013 da feature 006) cai naquele mês de calendário.
- **FR-003**: Todas as despesas MUST contar para os totais do dashboard independentemente da forma de pagamento (dinheiro/débito ou cartão de crédito); o dashboard apresenta apenas a visão de orçamento, sem figura separada de "caixa pago".
- **FR-004**: Quando o mês possuir orçamento da família definido, o dashboard MUST exibir o limite do mês, o percentual consumido (gasto ÷ limite) e o saldo restante; quando o gasto exceder o limite, MUST exibir o percentual acima de 100% e o valor excedido com destaque visual.
- **FR-005**: Quando o mês não possuir orçamento da família definido (ausente ou zero — FR-008 da feature 008), o dashboard MUST exibir o total gasto sem comparação de limite, com indicação clara de "orçamento não definido" e acesso direto à tela de orçamentos.
- **FR-006**: O dashboard MUST listar cada membro atual do grupo com seu total gasto no mês (despesas atribuídas àquele membro), e — quando o membro possuir orçamento individual definido — o limite, o percentual consumido e o saldo restante, destacando visualmente membros que excederam o limite.
- **FR-007**: Limites definidos como percentual (membro ou categoria) MUST ser exibidos pelo seu valor resolvido em R$ (conforme FR-021 da feature 008); limites percentuais não resolvíveis MUST ser tratados como "orçamento não definido" para fins de exibição e comparação.
- **FR-008**: Membros sem orçamento individual definido mas com despesas no mês MUST aparecer na lista com seu gasto e a indicação "sem orçamento definido"; membros atuais sem despesas MUST aparecer com gasto zero. Ex-membros do grupo com despesas no mês exibido MUST aparecer como linha inativa (identificada como "ex-membro"), com seu gasto e sem comparação de orçamento, de forma que a soma das linhas de membros seja igual ao total gasto da família; ex-membros sem despesas no mês não aparecem.
- **FR-009**: O dashboard MUST exibir a distribuição do gasto do mês por categoria raiz: valor gasto por categoria e percentual sobre o total gasto do mês, em ordem decrescente de participação.
- **FR-010**: Despesas sem categoria (ou cuja categoria foi excluída) MUST ser agrupadas em "Sem categoria" na distribuição, com valor e percentual como os demais grupos.
- **FR-011**: O usuário MUST poder expandir uma categoria raiz para ver a distribuição entre suas sub-categorias, incluindo um agrupamento para despesas lançadas diretamente na raiz quando houver despesas em ambos os níveis. O percentual de cada sub-categoria MUST ser relativo ao **total gasto da própria raiz** (as fatias de uma raiz expandida somam 100% dela), e não ao total do mês.
- **FR-012**: Quando uma categoria (raiz ou sub-categoria) possuir teto de orçamento definido para o mês, a linha da categoria MUST exibir também o consumo em relação a esse teto (gasto vs. limite resolvido), destacando quando excedido. O consumo de uma categoria **raiz** MUST agregar as despesas lançadas diretamente na raiz **mais** todas as despesas das suas sub-categorias; o consumo de uma sub-categoria considera apenas as despesas lançadas nela.
- **FR-013**: O usuário MUST poder navegar do mês corrente para qualquer mês de calendário passado e retornar ao mês corrente em uma única ação; a navegação NÃO MUST permitir avançar para meses futuros.
- **FR-014**: Ao exibir um mês passado, todas as seções do dashboard MUST usar as despesas e os orçamentos daquele mês específico (cada mês é independente, conforme feature 008).
- **FR-015**: O mês exibido MUST estar sempre claramente identificado no dashboard (mês e ano por extenso em PT-BR).
- **FR-016**: O dashboard MUST exibir estados vazios explicativos — mês sem despesas, mês sem orçamentos, grupo sem categorias — sem erros, percentuais inválidos ou divisão por zero.
- **FR-017**: Todos os membros do grupo MUST ver exatamente os mesmos números para um dado mês; o dashboard MUST refletir despesas e orçamentos atualizados a cada carregamento da tela.
- **FR-018**: Todos os valores monetários MUST ser exibidos em Real brasileiro (R$) com precisão de centavos; percentuais de consumo e participação MUST ser arredondados para exibição como números inteiros.
- **FR-019**: O acesso ao dashboard MUST exigir autenticação e pertencimento ao grupo familiar; um usuário só vê os dados do seu próprio grupo.
- **FR-020**: Toda a interface da feature MUST ser apresentada exclusivamente em português do Brasil (PT-BR).

### Key Entities *(include if feature involves data)*

- **Resumo do Mês (Monthly Summary)**: Visão consolidada e derivada — não é um dado armazenado — composta por: mês de referência, total gasto da família, orçamento da família (quando definido), percentual consumido e saldo/excesso. Calculada a partir das despesas (feature 006) e dos orçamentos (feature 008) do grupo no mês.
- **Gasto por Membro (Member Spending)**: Para cada membro atual do grupo no mês: total das despesas atribuídas ao membro, limite individual resolvido (quando definido), percentual consumido e saldo/excesso. Inclui ex-membros com despesas no mês como entradas inativas (gasto sem limite).
- **Gasto por Categoria (Category Spending)**: Para cada categoria raiz no mês: total gasto (despesas diretas + sub-categorias), percentual de participação sobre o total do mês e, quando houver teto de orçamento, o consumo em relação ao limite resolvido. Sub-categorias (sob demanda) trazem total gasto, percentual relativo à raiz e consumo vs. teto próprio quando definido. Inclui o grupo "Sem categoria".
- **Mês de Referência (Reference Month)**: O mês de calendário exibido no dashboard — por padrão o corrente, navegável para qualquer mês passado. Determina o conjunto de despesas e orçamentos considerados em todas as seções.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Um membro consegue responder "quanto a família já gastou este mês e quanto resta do orçamento" em até 10 segundos após abrir o aplicativo, sem nenhuma interação além de abrir o dashboard.
- **SC-002**: O dashboard de um mês com até 500 despesas, 10 membros e 50 categorias carrega completamente em até 2 segundos.
- **SC-003**: 100% dos valores exibidos no dashboard (totais, percentuais, saldos) conferem com a soma das despesas registradas e os orçamentos definidos para o mês — verificável comparando com a listagem de despesas e a tela de orçamentos.
- **SC-004**: Qualquer membro do grupo, ao abrir o dashboard do mesmo mês, vê exatamente os mesmos números que qualquer outro membro (consistência total no grupo).
- **SC-005**: Um membro consegue localizar e abrir a fotografia de um mês passado específico (ex.: 3 meses atrás) em até 15 segundos a partir do dashboard do mês corrente.
- **SC-006**: Uma despesa recém-registrada por qualquer membro aparece refletida nos totais do dashboard de outro membro em até 2 segundos após o recarregamento da tela.

## Assumptions

- A navegação do dashboard cobre o mês corrente e meses passados; meses futuros ficam fora do escopo desta feature (conforme decisão registrada no roadmap — "defaults to current month; user can navigate to any past calendar month"). A tela de orçamentos (feature 008) continua sendo o lugar para planejar meses futuros.
- O consumo por categoria em relação ao teto de orçamento da categoria (FR-012) está incluído porque os tetos por categoria já existem (feature 008) e o dashboard é a visão de consumo de orçamentos; gráficos e análises visuais mais ricas por categoria ficam para a feature 009 do roadmap (Category Spending Analytics), que espelhará o mês selecionado neste dashboard.
- "Gasto de um membro" significa a soma das despesas **atribuídas** àquele membro (campo de membro da despesa, feature 006), independentemente de quem registrou a despesa.
- Despesas de ex-membros do grupo permanecem nos totais da família e na quebra por categoria; na seção de membros, ex-membros com despesas no mês aparecem como linha inativa sem orçamento (ver FR-008).
- O dashboard é uma visão de leitura calculada sob demanda a partir de despesas e orçamentos existentes — não armazena fotografias (snapshots) próprias; a "fotografia" de um mês passado é simplesmente o cálculo sobre os dados daquele mês.
- Alertas de aproximação/estouro de orçamento (notificações) são escopo da feature 010 do roadmap e não desta; o dashboard apenas destaca visualmente consumos acima do limite.
- O dashboard é a tela inicial natural do aplicativo após o login para usuários com grupo configurado, ocupando a posição de página inicial definida no layout (feature 005-ui-layout).
