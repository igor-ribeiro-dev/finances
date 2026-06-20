# Feature Specification: Frontend Redesign — Modern UI with Liquid Glass Aesthetic

**Feature Branch**: `013-frontend-redesign`

**Created**: 2026-06-17

**Status**: Draft

**Input**: User description: "Vamos reformular o frontend. Deixar algo mais com layout moderno com pills, cores na paleta meio roxo com violeta. Talvez uma mescla com liquid glass"

## Clarifications

### Session 2026-06-17

- Q: Quais telas entram no "1 shot" da migração? → A: Todas as 11 telas (6 do app autenticado + 5 de auth/onboarding) em uma única entrega big-bang
- Q: O redesign entrega qual(is) tema(s)? → A: Claro + escuro com alternância (toggle), ambos na paleta roxa/violeta
- Q: Qual abordagem de implementação para a fundação visual? → A: Design system primeiro (tokens + primitivos reutilizáveis), depois migrar cada tela consumindo-os
- Q: Onde os pills substituem dropdowns? → A: Filtros/tags + selects de baixa cardinalidade (método de pagamento, status, mês); listas longas (categoria, cartão) seguem dropdown
- Q: Qual o tema inicial padrão no primeiro acesso? → A: Seguir a preferência do sistema (`prefers-color-scheme`), com fallback para dark
- Q: Onde a preferência de tema é persistida? → A: No dispositivo (localStorage) — frontend-only, sem mudança de backend
- Q: Qual o alvo responsivo do redesign? → A: Responsivo completo — todas as 11 telas + navegação adaptada para mobile (sidebar colapsa em menu/drawer)
- Q: As animações respeitam `prefers-reduced-motion`? → A: Não — fora de escopo neste redesign (animações sempre ativas)
- Q: O redesign troca o tipo de letra? → A: Não — manter Inter; a identidade vem de cor/pills/glass

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Navegação com Visual Moderno (Priority: P1)

O usuário acessa qualquer tela do app e percebe imediatamente a nova identidade visual: fundo com profundidade (escuro no tema dark, claro no tema light — ambos com os mesmos tokens), elementos com efeito de vidro translúcido (liquid glass), e pills/chips para tags e filtros. A paleta usa tons de roxo e violeta como cor primária.

**Why this priority**: A aparência geral é o núcleo do redesign — sem ela, as demais histórias não fazem sentido. Define o "tom" de toda a experiência.

**Independent Test**: Abrir a tela inicial e verificar que cores, tipografia e efeitos visuais seguem o novo sistema de design sem precisar testar nenhuma funcionalidade específica.

**Acceptance Scenarios**:

1. **Given** o usuário abre o app, **When** a tela inicial carrega, **Then** ele vê fundo com profundidade visual (escuro ou claro conforme o tema), elementos com aparência translúcida/vidro e a cor primária em roxo/violeta
2. **Given** o usuário navega entre seções, **When** transita de uma tela para outra, **Then** o sistema de design é consistente: mesmas cores, bordas, sombras e tipografia em todas as páginas
3. **Given** o usuário está em qualquer tela com lista de itens, **When** observa tags e filtros, **Then** eles aparecem como pills arredondados com a paleta roxa/violeta (seletores de categoria e cartão permanecem como dropdown)

---

### User Story 2 - Pills e Chips para Filtros e Seletores de Baixa Cardinalidade (Priority: P2)

O usuário usa filtros de data, **método de pagamento**, **status** e **seletor de mês**. Esses controles de baixa cardinalidade aparecem como pills clicáveis/selecionáveis, com estado ativo visualmente destacado na paleta roxa. Seletores de listas longas/variáveis (categoria, cartão) permanecem como dropdown.

**Why this priority**: Pills são o componente UI central do redesign — substituem dropdowns e checkboxes comuns por um padrão mais moderno e tátil onde a cardinalidade é baixa.

**Independent Test**: Pode ser testado na tela de listagem de despesas usando apenas os filtros de status/método, sem precisar de outras telas.

**Acceptance Scenarios**:

1. **Given** o usuário está em uma lista filtrável, **When** visualiza os filtros disponíveis, **Then** cada opção aparece como um pill arredondado com ícone opcional
2. **Given** o usuário clica em um pill de filtro, **When** o filtro é ativado, **Then** o pill muda para estado "ativo" com fundo roxo/violeta sólido e texto contrastante
3. **Given** múltiplos filtros podem ser selecionados, **When** o usuário seleciona mais de um, **Then** cada pill ativo é visualmente distinto dos inativo, e a lista atualiza em tempo real

---

### User Story 3 - Efeito Liquid Glass em Painéis e Cards (Priority: P3)

O usuário visualiza cards de resumo financeiro (saldo, total de despesas, limite de cartão). Esses cards têm aparência de vidro: fundo levemente translúcido com blur, borda sutil brilhante e sombra suave — o efeito "liquid glass" ou glassmorphism.

**Why this priority**: Eleva a qualidade visual percebida sem alterar funcionalidade. Pode ser incrementado após as stories P1 e P2 já estarem funcionando.

**Independent Test**: Pode ser validado no dashboard principal observando os cards de resumo, independentemente dos filtros ou listas.

**Acceptance Scenarios**:

1. **Given** o usuário está no dashboard, **When** visualiza um card de resumo, **Then** o card exibe fundo translúcido com blur do conteúdo atrás, borda clara e sombra difusa
2. **Given** o usuário está em modo claro ou escuro, **When** o card é renderizado, **Then** o efeito glass é adaptado para o tema sem perder legibilidade do conteúdo
3. **Given** o usuário passa o cursor/toque sobre um card interativo, **When** há hover ou foco, **Then** o card responde com leve animação (brilho, elevação suave) mantendo o efeito translúcido

---

### User Story 4 - Tipografia e Hierarquia Visual Renovadas (Priority: P4)

Títulos, subtítulos e valores monetários seguem uma hierarquia visual clara com pesos e tamanhos que funcionam bem sobre fundos escuros/glass. Valores em destaque (total mensal, saldo) usam tipografia grande e bold com cor roxa/violeta.

**Why this priority**: Complementa o redesign visual garantindo legibilidade e elegância sem exigir mudança estrutural nas telas.

**Independent Test**: Verificável em qualquer tela com valores monetários exibidos — basta inspecionar peso, tamanho e cor dos textos principais.

**Acceptance Scenarios**:

1. **Given** o usuário vê um valor monetário de destaque, **When** ele é renderizado, **Then** aparece em tamanho grande (heading), peso bold, e cor dentro da paleta roxa/violeta ou branco puro
2. **Given** o usuário lê rótulos e descrições secundárias, **When** eles são exibidos, **Then** usam peso normal, tamanho menor e cor mais apagada (cinza claro / lavanda), criando hierarquia visual clara

---

### Edge Cases

- O que acontece com o contraste quando o liquid glass é colocado sobre fundo claro? O design deve garantir legibilidade (WCAG AA mínimo).
- Como os pills se comportam quando o texto é muito longo (ex: nome de categoria extenso)? Deve haver truncagem com ellipsis ou quebra de linha controlada.
- Em telas muito pequenas (320px), os pills não devem transbordar o container — devem quebrar linha ou fazer scroll horizontal suave.
- O efeito glass com blur pode ser custoso em dispositivos de baixo desempenho — um fallback de fundo semi-transparente sólido deve existir.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O sistema DEVE aplicar a paleta de cores roxo/violeta como cor primária em todos os elementos interativos (botões, pills ativos, ícones de destaque, links)
- **FR-002**: O sistema DEVE exibir como componentes pill/chip arredondados (com estados visuais distintos: inativo, ativo, desabilitado): (a) filtros e tags em contextos de listagem; e (b) seletores de formulário de **baixa cardinalidade** — método de pagamento, status e seletor de mês. Listas longas ou variáveis (categoria, cartão) PERMANECEM como dropdown
- **FR-003**: O sistema DEVE aplicar o efeito liquid glass (fundo translúcido + blur + borda sutil) em cards de resumo, modais e painéis flutuantes
- **FR-004**: O sistema DEVE manter um sistema de design coerente com tokens de cor, espaçamento, tipografia e bordas aplicados globalmente
- **FR-005**: O sistema DEVE garantir que todos os textos sobre fundos glass ou escuros tenham contraste mínimo WCAG AA (4.5:1 para texto normal, 3:1 para texto grande)
- **FR-006**: O sistema DEVE fornecer um fallback visual para o efeito glass em contextos onde blur não é suportado (fundo semi-transparente sólido)
- **FR-007**: O sistema DEVE aplicar animações sutis e consistentes em interações (hover, seleção de pill, abertura de modal) com duração máxima de 300ms. Suporte a `prefers-reduced-motion` está **fora de escopo** neste redesign (animações permanecem sempre ativas)
- **FR-008**: O sistema DEVE preservar todas as funcionalidades existentes — o redesign é puramente visual, sem remover ou alterar fluxos de negócio
- **FR-009**: O sistema DEVE oferecer **dois temas** (claro e escuro), ambos na paleta roxa/violeta, com um controle de alternância (toggle) acessível ao usuário. Os tokens de design DEVEM cobrir os dois temas, e o contraste WCAG AA (FR-005) DEVE ser garantido em ambos
- **FR-010**: O sistema DEVE, no primeiro acesso (sem preferência salva), seguir a preferência de tema do sistema operacional do usuário (`prefers-color-scheme`), com **fallback para escuro** quando não houver preferência detectável. A escolha manual do usuário DEVE prevalecer sobre a preferência do sistema
- **FR-011**: O redesign DEVE ser construído como um **design system primeiro** — tokens (cores/tema/espaçamento/tipografia/bordas/sombras) e primitivos reutilizáveis (ex.: Pill, Glass Card, botões) — que as telas então consomem, evitando estilos divergentes por tela
- **FR-012**: O redesign DEVE ser aplicado a **todas as 11 telas** existentes em uma única entrega (big-bang): as 6 do app autenticado (Dashboard, Pagamentos, Orçamentos, Categorias, Cartões, Contas Recorrentes) e as 5 de auth/onboarding (Login, Registro, Esqueci a Senha, Redefinir Senha, Onboarding). Não há período intermediário com telas em estilos misturados
- **FR-013**: O sistema DEVE persistir a escolha de tema do usuário **no dispositivo** (armazenamento local do navegador), sem alteração de backend ou de banco de dados — o redesign permanece frontend-only
- **FR-014**: O redesign DEVE ser **totalmente responsivo** em todas as 11 telas, incluindo navegação adaptada para mobile: a sidebar fixa de desktop DEVE colapsar em um menu/drawer acessível em telas pequenas, sem perda de acesso a nenhuma seção

### Key Entities

- **Design Token**: Variável de design (cor, espaçamento, tipografia, borda, sombra) que representa o sistema visual de forma agnóstica à implementação
- **Pill/Chip**: Componente de interface para seleção ou exibição de tags — forma compacta, arredondada, com estados ativo/inativo
- **Glass Card**: Painel ou card com efeito de translucidez e blur que simula vidro sobre um fundo com gradiente ou imagem
- **Paleta Roxa**: Conjunto de tons do espectro roxo-violeta usados como cor primária do sistema (ex: variantes de lavanda a púrpura profundo)

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: As 11 telas existentes são exibidas com a nova paleta roxa/violeta numa única entrega — nenhum elemento primário retém a cor teal do sistema anterior em nenhuma tela
- **SC-002**: Todos os filtros/tags e os seletores de baixa cardinalidade (método de pagamento, status, mês) usam o componente pill; nenhum desses contextos retém dropdown/checkbox simples. Seletores de categoria e cartão permanecem dropdown por decisão de escopo
- **SC-003**: Todos os textos passam em verificação de contraste WCAG AA (razão ≥ 4.5:1 para corpo, ≥ 3:1 para títulos grandes) **tanto no tema claro quanto no escuro**
- **SC-004**: O efeito glass está presente em pelo menos todos os cards de resumo do dashboard e em modais/overlays
- **SC-005**: Nenhuma funcionalidade existente é quebrada pelo redesign — 100% dos fluxos de negócio continuam operacionais após a mudança visual
- **SC-006**: Animações de transição e interação têm duração ≤ 300ms e não causam jank perceptível (abaixo de 60fps)
- **SC-007**: O usuário consegue alternar entre tema claro e escuro a qualquer momento, e a escolha persiste entre sessões; no primeiro acesso o tema reflete a preferência do sistema (fallback escuro)
- **SC-008**: Todas as telas e primitivos consomem os tokens centrais do design system — não existe valor de cor/raio/sombra "hard-coded" fora dos tokens em nenhuma das 11 telas
- **SC-009**: As 11 telas são utilizáveis em larguras de 320px a desktop sem quebra de layout ou transbordo; em mobile, todas as seções de navegação permanecem acessíveis via menu/drawer

## Assumptions

- O redesign é aplicado ao frontend web/app existente — não há nova tela a ser criada, apenas re-estilização das 11 telas existentes
- O redesign entrega **dois temas** (claro e escuro) com toggle; o liquid glass é adaptado a cada tema (mais pronunciado no escuro), mantendo legibilidade nos dois (ver FR-009/FR-010)
- Funcionalidades de negócio (registro de despesas, gestão de cartões, orçamentos) não mudam de comportamento — apenas a aparência visual é alterada
- A migração é **big-bang**: todas as 11 telas e os primitivos são entregues juntos a partir de uma fundação de design system (tokens + componentes), sem período intermediário de estilos misturados (ver FR-011/FR-012)
- O redesign é **frontend-only**: a preferência de tema é persistida no dispositivo (localStorage), sem novo endpoint, migração ou alteração de banco (ver FR-013)
- O redesign é **totalmente responsivo** (320px → desktop), com a sidebar de desktop colapsando em menu/drawer no mobile (ver FR-014)
- A paleta roxa/violeta inclui variantes suficientes (primária, secundária, hover, disabled, background) para cobrir todos os estados visuais
- Acessibilidade WCAG AA é o mínimo aceitável — não é necessário atingir AAA neste redesign; suporte a `prefers-reduced-motion` fica fora de escopo (ver FR-007)
- A tipografia **Inter** atual é mantida (suporta pesos variados e é legível em tamanhos pequenos); a nova identidade vem de cor, pills e glass — sem troca de fonte
