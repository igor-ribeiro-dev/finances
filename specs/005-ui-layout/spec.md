# Feature Specification: Layout Visual e Sistema de Design do Frontend

**Feature Branch**: `005-ui-layout`

**Created**: 2026-05-17

**Status**: Draft

**Input**: "Como não há nada ainda de frontend, vamos definir como será o layout. UI Moderna com cores light, uso de tailwind, menu lateral"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Navegação via Menu Lateral (Priority: P1)

Um membro do grupo familiar acessa o app no navegador e usa o menu lateral para navegar entre as seções do app (Dashboard, Despesas, Categorias, Orçamentos, Pagamentos, Cartões de Crédito). A seção ativa está sempre destacada no menu.

**Why this priority**: O menu lateral é a estrutura de navegação central do app — sem ele nenhuma tela é acessível após o login. É o esqueleto de toda a interface.

**Independent Test**: Pode ser testado carregando o app logado e verificando que o menu lateral exibe todos os itens de navegação, que clicar em cada item muda a seção ativa, e que o item da seção atual aparece visualmente destacado.

**Acceptance Scenarios**:

1. **Given** o usuário está autenticado e pertence a um grupo, **When** ele acessa qualquer tela protegida do app, **Then** o menu lateral é exibido à esquerda com todos os itens de navegação visíveis.
2. **Given** o menu lateral está visível, **When** o usuário clica em um item de navegação, **Then** o conteúdo principal é trocado pela seção correspondente e o item clicado aparece destacado como "ativo".
3. **Given** o usuário está em uma seção, **When** ele olha para o menu lateral, **Then** apenas o item da seção atual aparece destacado — todos os outros itens estão no estado padrão.
4. **Given** o usuário está em tela menor (tablet/mobile), **When** ele acessa o app, **Then** o menu lateral colapsa automaticamente e um botão de menu (hamburguer) é exibido para abri-lo.

---

### User Story 2 - Identidade Visual e Tema Claro (Priority: P2)

O app apresenta uma identidade visual coesa em todas as telas: tema claro com fundo branco/cinza-claro, tipografia legível, hierarquia visual clara e uma cor primária consistente para elementos interativos e de destaque.

**Why this priority**: A consistência visual reduz a carga cognitiva do usuário e comunica profissionalismo. Uma paleta de cores indefinida resultaria em inconsistências à medida que mais telas são adicionadas.

**Independent Test**: Pode ser testado carregando qualquer tela do app e verificando que o fundo é claro, os textos têm contraste adequado (legível), os botões e links usam a mesma cor primária, e não há mistura de estilos conflitantes.

**Acceptance Scenarios**:

1. **Given** o app está carregado, **When** o usuário visualiza qualquer tela, **Then** o fundo geral é claro (branco ou cinza muito claro) e o texto principal tem alto contraste com o fundo.
2. **Given** o usuário interage com elementos clicáveis (botões, links, itens de menu), **When** ele os visualiza, **Then** todos usam a mesma cor primária definida no sistema de design.
3. **Given** o usuário vê um formulário ou card de conteúdo, **When** ele analisa o layout, **Then** os elementos têm hierarquia visual clara: título > subtítulo > corpo > metadado.
4. **Given** o usuário passa o cursor sobre um elemento interativo, **When** o estado de hover é ativado, **Then** há um feedback visual sutil e consistente (ex.: variação de tom da cor primária ou do fundo).

---

### User Story 3 - Layout Responsivo (Priority: P3)

O layout do app se adapta ao tamanho da janela do navegador sem quebrar a usabilidade: em telas largas o menu lateral permanece visível; em telas menores ele colapsa.

**Why this priority**: O público-alvo usa o app no desktop, mas acesso ocasional via tablet/mobile é esperado. Um layout que quebra em telas menores afeta a credibilidade do produto.

**Independent Test**: Pode ser testado redimensionando a janela do navegador: acima de 768px o menu lateral fica visível; abaixo de 768px o menu colapsa e o botão de hamburguer aparece; o conteúdo principal ocupa toda a largura disponível em ambos os casos.

**Acceptance Scenarios**:

1. **Given** o usuário acessa o app em janela com largura ≥ 768px, **When** a página carrega, **Then** o menu lateral permanece visível sem sobreposição com o conteúdo principal.
2. **Given** o usuário acessa em janela com largura < 768px, **When** a página carrega, **Then** o menu lateral está oculto e um botão de menu está visível no topo.
3. **Given** o menu está colapsado em tela pequena, **When** o usuário toca o botão de menu, **Then** o menu desliza para a tela (drawer) e pode ser fechado tocando fora da área do menu.

---

### Edge Cases

- O que acontece nas telas de login, cadastro e onboarding, que não devem ter o menu lateral? O layout sem menu (centrado, sem sidebar) deve ser aplicado automaticamente para rotas não autenticadas.
- O que ocorre com itens de navegação de seções ainda não implementadas (ex.: Cartões de Crédito antes da feature 016)? Eles são exibidos no menu mas marcados como "Em breve" e não clicáveis.
- O que acontece se o nome do grupo familiar for muito longo para o espaço disponível no menu lateral? O texto deve ser truncado com reticências.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O app DEVE exibir um menu lateral fixo à esquerda em todas as telas autenticadas (pós-login e pós-onboarding), contendo os itens de navegação do app.
- **FR-002**: O menu lateral DEVE conter os seguintes itens na ordem: Dashboard, Despesas, Categorias, Orçamentos, Pagamentos Mensais, Cartões de Crédito.
- **FR-003**: Os itens de navegação do menu lateral DEVEM ser definidos em um único arquivo de configuração centralizado, contendo para cada item: rótulo, ícone, rota e status (ativo ou em breve). Itens com status "em breve" são exibidos sem ação de navegação; a ativação de um item NÃO deve exigir alterações fora desse arquivo.
- **FR-004**: O item de navegação da seção ativa DEVE ser visualmente distinguível dos demais (cor de fundo diferente, texto em destaque ou indicador lateral).
- **FR-005**: O menu lateral DEVE exibir o nome do grupo familiar do usuário logado; nomes muito longos DEVEM ser truncados com reticências.
- **FR-006**: O menu lateral DEVE exibir o nome do usuário logado e um link de acesso a configurações de conta ou logout.
- **FR-007**: Em telas com largura inferior a 768px, o menu lateral DEVE colapsar automaticamente; um botão de abertura DEVE ser exibido no topo da área de conteúdo.
- **FR-008**: Em modo colapsado, clicar fora da área do menu lateral DEVE fechá-lo.
- **FR-009**: O sistema de design DEVE definir: (1) paleta de cores com cor primária teal, cor de fundo claro, escala de cinzas e cores semânticas (sucesso, alerta, erro); (2) tokens de border radius moderado (8–12px) para cards, botões e inputs; (3) sistema de elevação com dois níveis de sombra — nível 1 para cards e superfícies comuns, nível 2 para overlays e modais.
- **FR-010**: Todos os elementos interativos (botões, links, itens de menu) DEVEM usar a cor primária de forma consistente em todo o app.
- **FR-011**: O contraste entre texto e fundo DEVE atender ao padrão WCAG 2.1 AA: mínimo de 4,5:1 para texto normal e 3:1 para texto grande, em todos os elementos do app.
- **FR-012**: As telas não autenticadas (login, cadastro, recuperação de senha, onboarding) NÃO DEVEM exibir o menu lateral — o layout dessas telas é centrado e sem sidebar.
- **FR-013**: O sistema de design DEVE definir espaçamentos, tamanhos de fonte e hierarquia tipográfica (título > subtítulo > corpo > metadado) usando a família tipográfica **Inter** como fonte primária do app, aplicada consistentemente em todas as telas.
- **FR-014**: Quando um usuário não autenticado tentar acessar uma URL protegida diretamente, o app DEVE redirecioná-lo para a tela de login e, após autenticação bem-sucedida, retornar automaticamente à URL original solicitada.
- **FR-015**: Durante o carregamento de uma seção após navegação, a área de conteúdo principal DEVE exibir um skeleton placeholder (estrutura em cinza que imita o layout do conteúdo), mantendo o menu lateral e o header estáveis e visíveis.
- **FR-016**: A linguagem visual do app DEVE seguir o estilo "clean card-based com toques de glassmorphism": cards de conteúdo com sombra suave e cantos arredondados como base; elementos de destaque (ex.: header do menu lateral, modal de perfil) PODEM usar efeito de vidro translúcido com blur sutil. O efeito de glass NÃO deve ser aplicado a elementos de conteúdo primário — apenas a superfícies de sobreposição e destaque.

### Key Entities

- **Layout Principal**: Estrutura de duas colunas — sidebar à esquerda + área de conteúdo à direita — aplicada a todas as telas autenticadas.
- **Sidebar (Menu Lateral)**: Componente de navegação vertical com itens clicáveis, estado ativo, nome do grupo e acesso ao perfil do usuário.
- **Item de Navegação**: Entrada no menu lateral com ícone, rótulo, rota e estado (ativo, padrão, em breve); definido em arquivo de configuração centralizado.
- **Configuração de Navegação**: Arquivo único que lista todos os itens do menu lateral com seus atributos e status; modificar este arquivo é a única ação necessária para ativar ou desativar uma seção.
- **Tema**: Conjunto de tokens visuais — paleta de cores, tipografia, espaçamentos — que governa a aparência de todos os componentes do app.
- **Layout Não Autenticado**: Estrutura centralizada (sem sidebar) usada nas telas de login, cadastro, recuperação de senha e onboarding.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Um usuário consegue navegar para qualquer seção do app em no máximo 2 cliques a partir de qualquer tela autenticada.
- **SC-002**: A identidade visual é consistente: nenhuma tela autenticada usa cores, tamanhos de fonte ou espaçamentos fora do sistema de design definido.
- **SC-003**: O layout não quebra nem sobrepõe elementos em janelas de 320px até 1920px de largura.
- **SC-004**: Um desenvolvedor consegue adicionar uma nova seção ao menu lateral sem modificar mais de 1 arquivo de configuração/componente.
- **SC-005**: Todas as telas não autenticadas são exibidas sem menu lateral, independente do estado de autenticação.

## Clarifications

### Session 2026-05-17

- Q: Qual a direção estética / estilo visual do app? → A: Clean card-based com toques de glassmorphism sutil — cards com sombra suave como base; efeito de glass apenas em superfícies de sobreposição/destaque.
- Q: Qual família tipográfica usar no app? → A: Inter (sans-serif geométrica, padrão SaaS moderno).
- Q: Qual família de cores primária do app? → A: Teal (ciano-escuro) — diferenciado, tonalidade exata definida no plano técnico respeitando WCAG 2.1 AA.
- Q: Qual o grau de arredondamento de cantos (border radius)? → A: Moderado (8–12px) em cards, botões e inputs — balanço entre moderno e profissional.
- Q: Qual o sistema de elevação/sombras? → A: Dois níveis — nível 1 para cards comuns, nível 2 para overlays e modais.
- Q: Qual nível de acessibilidade deve ser o alvo para contraste de cores? → A: WCAG 2.1 AA (4,5:1 para texto normal, 3:1 para texto grande).
- Q: O que ocorre quando usuário não autenticado acessa uma URL protegida? → A: Redirecionar para `/login` e retornar à URL original após autenticação.
- Q: Como o status "em breve" vs. "ativo" de itens do menu é controlado? → A: Arquivo de configuração centralizado com campo de status por item (único arquivo a modificar para ativar uma seção).
- Q: O que o usuário vê durante o carregamento de uma seção após navegar pelo menu? → A: Skeleton placeholder na área de conteúdo; menu lateral e header permanecem estáveis.

## Assumptions

- A interface é exclusivamente em Português do Brasil (PT-BR), conforme restrição global do produto definida no spec 003.
- O sistema de design usa Tailwind CSS como utilitário de estilo — todos os tokens de cores e espaçamentos são definidos via `tailwind.config` e não hard-coded em arquivos de componente.
- A cor primária do app pertence à família **teal (ciano-escuro)** — fresca, diferenciada e pouco comum em apps de finanças tradicionais. A tonalidade exata dentro da família teal será escolhida no plano técnico respeitando o contraste WCAG 2.1 AA.
- O app é primariamente voltado para uso desktop; o suporte responsivo (tablet/mobile) é uma melhoria desejável, não o foco principal.
- Esta feature é puramente frontend e não introduz novos endpoints de API.
- Esta feature depende da infraestrutura de autenticação da feature 004 (o menu lateral só é exibido para usuários autenticados com grupo).
- Ícones serão fornecidos por uma biblioteca de ícones open-source (ex.: Heroicons ou Lucide) — a escolha da biblioteca será definida no plano técnico.
- Esta feature não implementa a lógica de dados das seções — apenas o shell de navegação e o sistema de design base.
