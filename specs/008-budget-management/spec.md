# Feature Specification: Gestão de Orçamentos

**Feature Branch**: `008-budget-management`

**Created**: 2026-06-09

**Status**: Draft

**Input**: Roadmap feature #007 — "Set a global family budget and individual budgets per family member for each calendar month. The family budget is independent — it is set directly by any member and has no required relationship to the sum of individual member budgets. Category budgets can be defined at the root level (e.g., Food: R$1.500/month) and optionally broken down further into sub-category limits. Sub-category budgets are optional; a root-level cap alone is valid. When sub-category totals exceed the root cap, an advisory warning is shown but saving is not blocked."

## Clarifications

### Session 2026-06-09

- Q: Sobre qual valor base incide um percentual definido para uma categoria? → A: Sobre o **orçamento total da família** do mês (o valor global definido na US1).
- Q: Valor absoluto e percentual podem coexistir no mesmo mês? → A: Sim — o tipo de limite (valor absoluto **ou** percentual) é escolhido **por categoria/alvo** e os dois podem ser misturados livremente no mesmo mês.
- Q: O que ocorre quando a soma das alocações excede o orçamento da família, ou os percentuais ultrapassam 100%? → A: **Aviso consultivo** acompanhado da exibição do saldo (valor/percentual) ainda não alocado; salvar **nunca** é bloqueado.
- Q: Sobre qual base incide o percentual de uma sub-categoria? → A: Sobre o **valor alocado da categoria raiz pai**; a sub-categoria também pode ser definida em valor absoluto.
- Q: O percentual também se aplica aos orçamentos por membro? → A: Sim — **membro e categoria** suportam valor absoluto **ou** percentual livremente; quando um orçamento de membro é percentual, sua base é o **orçamento da família**.
- Q: Qual a granularidade aceita para um percentual? → A: Apenas **números inteiros** não negativos (sem casas decimais).
- Q: Como o valor resolvido de um percentual é arredondado quando gera fração de centavo? → A: Arredondado para o **centavo mais próximo** (meio para cima / half-up).
- Q: O que ocorre ao copiar o mês anterior para um mês destino que já tem orçamentos, e há gatilho automático? → A: Cópia **não-destrutiva** — preenche apenas os alvos ainda indefinidos no destino, preservando os já definidos. Além disso, ao registrar uma despesa em um mês **sem nenhum orçamento**, o sistema **pergunta ao usuário antes** se deseja copiar os orçamentos do mês anterior.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Definir o Orçamento da Família para o Mês (Priority: P1)

Um membro do grupo familiar abre a tela de orçamentos e define quanto a família pretende gastar no mês corrente — um valor único, global, que representa o teto de gastos do grupo. Esse valor fica disponível para todos os membros e serve de referência para todo o acompanhamento de gastos a jusante (dashboard, alertas). O orçamento da família é sempre um **montante absoluto em R$** (nunca percentual) e funciona como a **base** sobre a qual incidem todos os orçamentos definidos em percentual — sejam de membros ou de categorias.

**Why this priority**: O orçamento da família é o número mais básico e mais frequentemente consultado de todo o produto — sem ele, não há "limite" contra o qual comparar os gastos. É a menor fatia de valor que já entrega um produto útil: definir um teto mensal e poder revisá-lo. Todas as features de acompanhamento (dashboard 008, alertas 010) dependem deste valor existir.

**Independent Test**: Um usuário autenticado e com grupo abre a tela `/orcamentos`, define o orçamento da família do mês corrente como R$ 5.000,00 e salva. Ao reabrir a tela (mesma sessão ou outro membro), o valor R$ 5.000,00 aparece persistido para aquele mês.

**Acceptance Scenarios**:

1. **Given** o usuário autenticado está em um grupo familiar sem nenhum orçamento definido para o mês corrente, **When** ele abre a tela `/orcamentos`, **Then** o sistema exibe o mês corrente selecionado e o campo de orçamento da família vazio (sem orçamento definido).
2. **Given** o usuário está na tela de orçamentos com o mês corrente selecionado, **When** ele informa um valor monetário válido (ex.: R$ 5.000,00) para o orçamento da família e salva, **Then** o valor é persistido para o grupo naquele mês e aparece imediatamente ao reabrir a tela.
3. **Given** o orçamento da família do mês já está definido como R$ 5.000,00, **When** qualquer membro do grupo altera o valor para R$ 5.500,00 e salva, **Then** o novo valor substitui o anterior e é visível para todos os membros.
4. **Given** o orçamento da família do mês está definido, **When** o usuário limpa o campo (ou informa zero) e salva, **Then** o orçamento da família passa a ser considerado **não definido** para aquele mês (inativo) — nenhum erro é exibido.
5. **Given** o usuário informa um valor negativo ou não numérico no campo de orçamento, **When** ele tenta salvar, **Then** o sistema rejeita o envio e exibe mensagem de erro inline, mantendo o valor anterior intacto.

---

### User Story 2 - Definir Orçamentos por Membro (Priority: P1)

Um membro do grupo define, para o mês corrente, um teto de gastos individual para cada membro da família (inclusive para si mesmo). Cada teto individual pode ser informado como um **valor absoluto em R$** ou como um **percentual do orçamento da família** (ex.: "membro A = 30% do orçamento da família"). Esses orçamentos individuais são independentes do orçamento global da família — a soma deles não precisa bater com o orçamento da família, mesmo quando expressos em percentual.

**Why this priority**: Acompanhar o gasto por pessoa é uma das motivações centrais do app (cada membro vê seu próprio teto). Junto com o orçamento da família, forma o conjunto mínimo de orçamentos que o dashboard (008) e os alertas (010) consomem. É P1 porque o produto-alvo é explicitamente um rastreador com dois níveis de orçamento: família e membro.

**Independent Test**: Em um grupo com 2+ membros, o usuário abre a tela de orçamentos, define R$ 2.000,00 para o membro A e R$ 1.500,00 para o membro B no mês corrente e salva. Ao reabrir, ambos os valores aparecem associados aos respectivos membros, e o sistema não exige que a soma (R$ 3.500,00) tenha qualquer relação com o orçamento da família.

**Acceptance Scenarios**:

1. **Given** o grupo familiar possui múltiplos membros, **When** o usuário abre a tela de orçamentos do mês, **Then** o sistema lista todos os membros do grupo, cada um com seu próprio campo de orçamento mensal.
2. **Given** o usuário define orçamentos individuais para dois membros e salva, **When** qualquer membro reabre a tela, **Then** cada membro aparece com seu orçamento individual persistido para aquele mês.
3. **Given** o orçamento da família está definido como R$ 5.000,00, **When** o usuário define orçamentos por membro cuja soma é R$ 8.000,00 (maior que o da família), **Then** o sistema salva normalmente — não há bloqueio nem validação cruzada entre o orçamento da família e a soma dos orçamentos dos membros.
4. **Given** um membro não tem orçamento individual definido, **When** a tela é exibida, **Then** o campo daquele membro aparece vazio (orçamento não definido / inativo), sem impedir o salvamento dos demais.
5. **Given** o usuário limpa (ou zera) o orçamento de um membro e salva, **Then** aquele orçamento individual passa a ser considerado não definido para o mês, sem afetar os orçamentos dos outros membros.
6. **Given** o orçamento da família do mês está definido como R$ 5.000,00, **When** o usuário define o orçamento de um membro como "30%" e salva, **Then** o sistema persiste o limite como percentual e o resolve para R$ 1.500,00 com base no orçamento da família; se o orçamento da família ainda não estiver definido, o limite percentual é salvo mas exibido como **não resolvível** até que a base exista.

---

### User Story 3 - Distribuir o Orçamento por Categoria em Valor ou Percentual (Priority: P2)

Um membro distribui o orçamento da família entre as categorias do mês — definindo, para cada categoria **raiz** (primariamente) e opcionalmente para cada **sub-categoria**, um limite que pode ser um **valor absoluto em R$** (ex.: "Aluguel: R$ 1.800") **ou** um **percentual** (ex.: "40% Pagar Contas, 10% Doação, 20% Investimento, 20% Pagar a Mim Mesmo, 10% Sonhos"). Percentuais de raiz incidem sobre o orçamento total da família; percentuais de sub-categoria incidem sobre o valor já alocado à sua raiz pai. Valor e percentual podem ser misturados livremente no mesmo mês. Conforme o usuário preenche, o sistema mostra o quanto do orçamento da família já foi alocado e o saldo restante; se as alocações ultrapassarem o orçamento da família (ou os percentuais passarem de 100%), um aviso consultivo é exibido, mas salvar nunca é bloqueado.

**Why this priority**: Esta é a forma como muitas famílias realmente orçam — distribuindo a renda/teto por método de alocação proporcional (ex.: 40/10/20/20/10) entre grandes categorias, em vez de cravar cada valor em reais. Apoia-se na árvore de categorias da feature 006/007. É P2 porque o produto já é utilizável apenas com os orçamentos de família e de membro (P1), mas a distribuição por categoria (em valor ou percentual) é o que entrega o controle proporcional que motiva o uso recorrente.

**Independent Test**: Com o orçamento da família do mês definido (ex.: R$ 5.000) e categorias raiz cadastradas (feature 007), o usuário define tetos misturando modos: uma raiz em valor (R$ 1.000), três raízes em percentual (40%, 10%, 20%) e uma sub-categoria em percentual da sua raiz. O sistema resolve cada percentual ao valor correspondente, exibe o total alocado e o saldo restante, mostra o aviso consultivo se exceder, e ao reabrir todos os limites — com seus respectivos tipos (valor/percentual) — persistem corretamente.

**Acceptance Scenarios**:

1. **Given** o grupo possui categorias raiz cadastradas, **When** o usuário abre a seção de orçamentos por categoria do mês, **Then** o sistema lista as categorias raiz em ordem alfabética PT-BR, cada uma com um campo de teto mensal que aceita **valor absoluto ou percentual**.
2. **Given** o orçamento da família do mês é R$ 5.000, **When** o usuário define a raiz "Pagar Contas" como "40%" e salva, **Then** o sistema persiste o limite como percentual e o resolve para R$ 2.000 (40% de R$ 5.000) na exibição.
3. **Given** uma categoria raiz possui sub-categorias, **When** o usuário expande a raiz, **Then** as sub-categorias são exibidas, cada uma com um campo de teto opcional que aceita valor absoluto ou percentual; um teto apenas na raiz é uma configuração válida e completa.
4. **Given** a raiz "Alimentação" está alocada em R$ 2.000, **When** o usuário define a sub-categoria "Mercado" como "60%", **Then** o sistema resolve o limite da sub-categoria para R$ 1.200 (60% do valor da raiz pai), não 60% do orçamento da família.
5. **Given** o usuário mistura raízes em valor e em percentual cujo total alocado excede o orçamento da família (ou cujos percentuais somam mais de 100%), **When** ele salva, **Then** o sistema exibe um **aviso consultivo** e mostra o saldo (valor/percentual) excedido, **mas permite salvar** — nenhum valor é bloqueado.
6. **Given** a soma dos tetos de sub-categoria de uma raiz excede o valor alocado à raiz, **When** o usuário salva, **Then** o sistema exibe um aviso consultivo de excedente, mas permite salvar.
7. **Given** o usuário definiu apenas o teto da raiz (sem detalhar sub-categorias), **When** ele salva, **Then** o orçamento da categoria é considerado válido e completo apenas com o teto de raiz.
8. **Given** um teto de categoria ou sub-categoria está definido (em valor ou percentual), **When** o usuário o limpa (ou informa zero) e salva, **Then** aquele teto passa a ser considerado não definido (inativo) para o mês, sem afetar os demais tetos.
9. **Given** uma categoria possui teto definido, **When** o usuário informa um valor negativo, um percentual negativo ou um conteúdo não numérico, **Then** o sistema rejeita o envio e sinaliza o campo inválido, preservando os demais valores.
10. **Given** uma raiz está definida em percentual mas o orçamento da família do mês ainda não foi definido, **When** o usuário abre a tela, **Then** o limite percentual é exibido como **não resolvível** (sem valor em R$) até que o orçamento da família seja informado, sem erro de validação.

---

### User Story 4 - Gerir Orçamentos ao Longo dos Meses (Priority: P2)

Um membro navega entre meses do calendário para definir orçamentos de meses futuros, revisar meses passados, ou reaproveitar a configuração de um mês anterior — evitando redigitar todos os valores a cada novo mês. A cópia do mês anterior é **não-destrutiva**: preenche apenas os alvos ainda indefinidos no mês destino, sem sobrescrever o que já foi definido. Além disso, quando o usuário registra a primeira despesa de um mês que ainda não tem nenhum orçamento, o sistema **pergunta antes** se ele deseja trazer os orçamentos do mês anterior, reduzindo o atrito de começar um novo mês.

**Why this priority**: Orçamentos são definidos por mês fixo de calendário; sem navegação entre meses, o usuário só conseguiria orçar o mês corrente. A conveniência de copiar o mês anterior reduz o atrito recorrente de re-cadastrar valores. Importante para o uso prolongado, mas não bloqueia o primeiro uso (que ocorre no mês corrente, US1–US3).

**Independent Test**: O usuário define um conjunto completo de orçamentos no mês corrente, navega para o mês seguinte (vazio), aciona "copiar orçamentos do mês anterior" e confirma que todos os valores (família, membros, categorias) foram replicados no novo mês, podendo então ajustá-los independentemente.

**Acceptance Scenarios**:

1. **Given** o usuário está na tela de orçamentos, **When** ele navega para outro mês de calendário (anterior ou futuro), **Then** a tela exibe os orçamentos daquele mês específico — independentes dos demais meses.
2. **Given** o mês selecionado não possui orçamentos definidos e o mês anterior possui, **When** o usuário aciona "copiar orçamentos do mês anterior", **Then** os valores de família, membros e categorias do mês anterior são replicados no mês selecionado como ponto de partida editável.
3. **Given** o mês destino já possui alguns orçamentos definidos e outros em branco, **When** o usuário aciona "copiar orçamentos do mês anterior", **Then** apenas os alvos em branco são preenchidos com os valores do mês anterior; os orçamentos já definidos no destino são preservados (cópia não-destrutiva).
4. **Given** o usuário copiou orçamentos de um mês anterior, **When** ele edita um valor no mês corrente e salva, **Then** a alteração afeta apenas o mês corrente — o mês de origem permanece inalterado.
5. **Given** o usuário revisa um mês passado, **When** ele altera um orçamento daquele mês, **Then** a alteração é persistida para aquele mês histórico sem afetar o mês corrente.
6. **Given** um mês ainda não possui nenhum orçamento definido e o mês anterior possui, **When** o usuário registra uma despesa para esse mês, **Then** o sistema pergunta se ele deseja copiar os orçamentos do mês anterior; **se confirmar**, a cópia não-destrutiva é aplicada; **se recusar**, a despesa é registrada normalmente e o mês permanece sem orçamento.
7. **Given** um mês sem orçamento cujo mês anterior também não possui orçamentos, **When** o usuário registra uma despesa para esse mês, **Then** o sistema não oferece a cópia (não há o que copiar) e registra a despesa normalmente.

---

### Edge Cases

- **Categoria excluída com orçamento definido**: quando uma categoria (ou sub-categoria) que possui teto de orçamento é excluída (feature 007), os tetos de orçamento associados a ela deixam de existir — orçamento é configuração derivada da árvore de categorias, não um registro histórico a preservar.
- **Membro removido do grupo**: quando um membro deixa o grupo familiar, seus orçamentos individuais deixam de ser exibidos e de contar para qualquer cálculo; orçamentos de meses passados não precisam ser preservados para um membro que saiu.
- **Sub-categoria sem teto sob raiz com teto**: configuração válida — a sub-categoria simplesmente não tem limite próprio e é coberta apenas pelo teto da raiz.
- **Soma de sub-categorias exatamente igual ao teto da raiz**: não dispara aviso (apenas exceder dispara).
- **Percentual sem base resolvível**: um limite percentual (de membro, raiz ou sub-categoria) cuja base ainda não existe — orçamento da família indefinido/zero, ou raiz pai sem valor — é persistido normalmente mas exibido como "não resolvível" (sem valor em R$), sem erro; assim que a base for definida, o valor é resolvido automaticamente.
- **Alocação de categorias exatamente igual a 100% / ao orçamento da família**: não dispara aviso (apenas exceder dispara).
- **Alteração do orçamento da família**: ao mudar o orçamento da família do mês, todos os percentuais que o usam como base são re-resolvidos automaticamente para os novos valores em R$.
- **Troca de modo de um limite**: o usuário pode alternar uma categoria/membro entre valor absoluto e percentual; o novo tipo substitui o anterior para aquele mês, sem manter o valor antigo.
- **Edição concorrente**: dois membros editam o orçamento do mesmo mês simultaneamente — a última gravação válida prevalece; ao reabrir, ambos veem o valor mais recente.
- **Mês muito distante**: o usuário pode navegar para meses futuros e passados; não há limite rígido de quão distante, mas a cópia "do mês anterior" só replica quando o mês imediatamente anterior possui orçamentos.
- **Valor com mais de duas casas decimais**: o sistema normaliza para a menor unidade monetária (centavos); valores são sempre não negativos.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O sistema MUST permitir que qualquer membro do grupo defina um único orçamento da família (global) para um determinado mês de calendário, sempre como **valor absoluto em R$**; este valor é a base sobre a qual incidem os limites percentuais de membros e de categorias raiz.
- **FR-002**: O sistema MUST permitir que qualquer membro defina um orçamento individual por membro do grupo para um determinado mês de calendário, podendo ser informado como **valor absoluto** ou como **percentual do orçamento da família**.
- **FR-003**: O sistema MUST permitir que qualquer membro defina um teto de orçamento por categoria raiz para um determinado mês de calendário, podendo ser informado como **valor absoluto** ou como **percentual do orçamento da família**.
- **FR-004**: O sistema MUST permitir que qualquer membro defina, opcionalmente, tetos de orçamento por sub-categoria sob cada categoria raiz, podendo ser informados como **valor absoluto** ou como **percentual do valor alocado à categoria raiz pai**; um teto apenas na raiz é uma configuração válida e completa.
- **FR-005**: Todos os membros do grupo MUST ter direitos iguais para visualizar e editar todos os orçamentos do grupo (família, membros e categorias) — não há distinção de papéis.
- **FR-006**: Os orçamentos MUST ser definidos por mês fixo de calendário; cada mês é independente dos demais.
- **FR-007**: O orçamento da família MUST ser independente da soma dos orçamentos individuais dos membros — o sistema NÃO MUST validar, exigir ou derivar qualquer relação entre eles.
- **FR-008**: O sistema MUST tratar um orçamento com valor zero ou em branco como **não definido / inativo** — não há limite efetivo, e nenhum mecanismo a jusante (ex.: alertas) deve considerá-lo um teto de zero.
- **FR-009**: O sistema MUST exibir um aviso consultivo (não bloqueante), permitindo salvar mesmo assim, quando: (a) a soma dos tetos de sub-categoria de uma raiz exceder o valor alocado à própria raiz; ou (b) a soma das alocações de categorias raiz (valores absolutos + valores resolvidos de percentuais) exceder o orçamento da família, ou os percentuais de raiz somarem mais de 100%.
- **FR-010**: O sistema MUST rejeitar valores de orçamento inválidos — montantes negativos, percentuais negativos, percentuais não inteiros (com casas decimais) ou conteúdo não numérico — exibindo erro inline e preservando os valores previamente salvos. Percentuais MUST ser números inteiros não negativos. Um percentual individual acima de 100% é aceito (gera apenas aviso consultivo, FR-009), respeitando um teto de sanidade de 1000% na validação.
- **FR-011**: Os orçamentos MUST ser compartilhados em todo o grupo familiar — qualquer membro vê exatamente os mesmos valores para um dado mês.
- **FR-012**: As alterações de orçamento feitas por um membro MUST ficar imediatamente visíveis para os demais membros ao carregarem a tela.
- **FR-013**: O sistema MUST permitir navegar entre meses de calendário (passados e futuros) para definir, revisar e ajustar orçamentos de qualquer mês.
- **FR-014**: O sistema MUST oferecer uma ação para copiar os orçamentos do mês imediatamente anterior para o mês selecionado, replicando família, membros e categorias — incluindo o **tipo** de cada limite (valor absoluto ou percentual). A cópia MUST ser **não-destrutiva**: preenche apenas os alvos ainda indefinidos no mês destino e preserva quaisquer orçamentos já definidos nele.
- **FR-015**: Ao excluir uma categoria ou sub-categoria, o sistema MUST remover os tetos de orçamento associados a ela em todos os meses, sem bloquear a exclusão por conta de orçamentos.
- **FR-016**: O sistema MUST listar as categorias raiz na tela de orçamentos em ordem alfabética PT-BR e exibir as sub-categorias aninhadas sob suas respectivas raízes.
- **FR-017**: O sistema MUST registrar todos os valores monetários em uma única moeda (Real brasileiro), com precisão de centavos.
- **FR-018**: Toda a interface da feature MUST ser apresentada exclusivamente em português do Brasil (PT-BR).
- **FR-019**: Todos os endpoints/ações de orçamento MUST exigir autenticação e pertencimento ao grupo; um usuário só pode ver e editar orçamentos do seu próprio grupo familiar.
- **FR-020**: Cada limite de orçamento de membro, categoria raiz e sub-categoria MUST registrar seu **tipo** — valor absoluto **ou** percentual — escolhido independentemente por alvo; o orçamento da família é sempre valor absoluto. Tipos podem ser misturados livremente no mesmo mês.
- **FR-021**: O sistema MUST resolver cada limite percentual a um valor efetivo em R$ para exibição e consumo a jusante: percentuais de membro e de categoria raiz incidem sobre o orçamento da família do mês; percentuais de sub-categoria incidem sobre o valor alocado à categoria raiz pai. O valor resolvido MUST ser arredondado ao **centavo mais próximo** (meio para cima / half-up).
- **FR-022**: Quando a base de um limite percentual não estiver definida (orçamento da família ausente ou zero, ou categoria raiz pai sem valor alocado), o sistema MUST persistir o limite e exibi-lo como **não resolvível** (sem valor em R$), sem erro de validação, resolvendo-o automaticamente assim que a base passar a existir.
- **FR-023**: Ao editar os orçamentos de categoria de um mês, o sistema MUST exibir o total já alocado e o **saldo não alocado** (em valor e em percentual) em relação ao orçamento da família.
- **FR-024**: Alterar o orçamento da família de um mês MUST re-resolver automaticamente todos os limites percentuais daquele mês que o utilizam como base.
- **FR-025**: Ao registrar uma despesa para um mês que ainda não possui nenhum orçamento definido, o sistema MUST perguntar ao usuário, **antes** de qualquer cópia, se deseja trazer os orçamentos do mês imediatamente anterior. Se o usuário confirmar, a cópia não-destrutiva (FR-014) é aplicada; se recusar (ou se o mês anterior não tiver orçamentos), a despesa é registrada normalmente e o mês permanece sem orçamento. A pergunta NÃO MUST bloquear nem condicionar o registro da despesa.

### Key Entities *(include if feature involves data)*

- **Orçamento (Budget)**: Um limite definido para um alvo específico em um mês de calendário específico. Atributos conceituais: grupo a que pertence, mês de referência (mês/ano de calendário), tipo de alvo (família, membro ou categoria), referência ao alvo (qual membro ou qual categoria; ausente quando o alvo é a família), o **tipo de limite** (valor absoluto ou percentual) e o **valor do limite** — interpretado como centavos quando o tipo é valor absoluto, ou como percentual quando o tipo é percentual. O orçamento da família é sempre do tipo valor absoluto. Um valor zero ou ausente significa "não definido / inativo". Existe no máximo um orçamento por combinação de (grupo, mês, alvo).
- **Limite Resolvido (Resolved Limit)**: O valor efetivo em R$ de um orçamento após aplicar seu tipo. Para limites de valor absoluto, é o próprio valor; para limites percentuais, é o percentual aplicado sobre a base (orçamento da família, para membro e raiz; valor alocado da raiz pai, para sub-categoria). É "não resolvível" quando a base ainda não existe. Este é o valor consumido pelas features a jusante (dashboard 008, alertas 010).
- **Alvo do Orçamento (Budget Target)**: O escopo ao qual um orçamento se aplica — a família como um todo, um membro específico do grupo, uma categoria raiz ou uma sub-categoria. Membro e categoria referenciam entidades já existentes (features 004 e 006/007).
- **Mês de Orçamento (Budget Month)**: A unidade temporal de todos os orçamentos — um mês fixo de calendário. Orçamentos de meses diferentes são independentes entre si.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Um membro consegue definir o orçamento da família e os orçamentos individuais de até 10 membros para um mês em menos de 3 minutos.
- **SC-002**: Qualquer membro do grupo, ao abrir a tela de orçamentos de um mês, vê exatamente os mesmos valores definidos por qualquer outro membro (consistência total no grupo).
- **SC-003**: Os orçamentos de um mês com até 50 categorias e 10 membros carregam na tela em até 1 segundo.
- **SC-004**: Uma alteração de orçamento feita por um membro fica visível para outro membro em menos de 2 segundos após o recarregamento da tela.
- **SC-005**: Ao copiar os orçamentos do mês anterior para um mês vazio, 100% dos valores de família, membros e categorias (com seus tipos) são replicados corretamente; quando o mês destino já possui orçamentos, 100% dos já definidos são preservados e somente os alvos vazios são preenchidos.
- **SC-006**: Quando a soma dos tetos de sub-categoria excede o teto da raiz, 100% das tentativas de salvar exibem o aviso informativo e ainda assim concluem a gravação com sucesso.
- **SC-007**: Nenhuma combinação de orçamento da família e orçamentos de membros é rejeitada por validação cruzada — 100% das configurações independentes são aceitas.
- **SC-008**: 100% dos limites percentuais são resolvidos para o valor em R$ correto em relação à sua base (orçamento da família para membro/raiz; valor da raiz pai para sub-categoria), inclusive após alterações na base.
- **SC-009**: Um usuário consegue distribuir o orçamento da família entre 5 categorias raiz usando percentuais (ex.: 40/10/20/20/10) em menos de 2 minutos, com o total alocado e o saldo restante exibidos em tempo real durante a edição.

## Assumptions

- Os orçamentos são definidos por **mês fixo de calendário**; não há suporte a períodos personalizados (alinhado às clarifications do roadmap).
- Cada mês é independente; meses futuros e passados começam **vazios**. O reaproveitamento de valores é sempre **opt-in**, por uma de duas vias: a ação explícita "copiar orçamentos do mês anterior" (não-destrutiva), ou a pergunta exibida ao registrar a primeira despesa de um mês sem orçamento. Nunca há cópia automática silenciosa nem propagação contínua entre meses — toda cópia depende de confirmação explícita do usuário.
- O **acompanhamento de gasto realizado vs. orçamento** (totais consumidos, percentuais, gráficos) é responsabilidade do Dashboard (feature 008) e do Analytics (feature 009); esta feature trata apenas da **definição e gestão** dos valores de orçamento.
- Os **alertas** de aproximação/estouro de orçamento são responsabilidade da feature 010 (Budget Alerts); esta feature apenas fornece os valores-limite que aqueles alertas consomem.
- A hierarquia de categorias (raiz + uma camada de sub-categoria, profundidade máxima 2) é a entregue pela feature 007; orçamentos por categoria seguem essa mesma estrutura.
- Limites podem ser expressos em **valor absoluto (R$) ou em percentual**, escolhidos por alvo e misturáveis no mesmo mês. O percentual é apenas uma forma de declarar o limite — sempre resolvido a um valor em R$ para consumo das features a jusante. A base de cada percentual é o orçamento da família (para membro e categoria raiz) ou o valor alocado da raiz pai (para sub-categoria). O orçamento da família é sempre valor absoluto, pois é a base de tudo.
- O método de alocação proporcional (ex.: 40% Contas, 10% Doação, 20% Investimento, 20% Pagar a mim mesmo, 10% Sonhos) é suportado **primariamente no nível das categorias raiz**; sub-categorias refinam a alocação dentro de cada raiz. Os percentuais não precisam fechar exatamente 100%: excedentes geram apenas aviso consultivo, e sobras são exibidas como saldo não alocado.
- Todos os valores são registrados em Real brasileiro (R$), em uma única moeda; suporte multi-moeda está fora de escopo.
- Todos os membros do grupo têm direitos iguais (sem papel de administrador), conforme estabelecido na feature 004.
- A UI é exclusivamente em PT-BR, sem mecanismo de internacionalização (restrição transversal do produto).
- A arquitetura, autenticação e o middleware de pertencimento ao grupo das features 004/006/007 são reutilizados; nenhuma nova infraestrutura de autorização é necessária.
