# Tasks: Layout Visual e Sistema de Design do Frontend

**Input**: Design documents from `specs/005-ui-layout/`

**Prerequisites**: plan.md ✅ | spec.md ✅ | research.md ✅ | data-model.md ✅ | contracts/ ✅

**Tests**: Incluídos — Constitution Principle II (Test-First) é NON-NEGOTIABLE neste projeto.

**Organization**: Tarefas agrupadas por User Story para entrega incremental e testagem independente.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Pode rodar em paralelo (arquivos diferentes, sem dependências incompletas)
- **[Story]**: User story correspondente (US1, US2, US3)
- Caminhos de arquivo exatos incluídos em todas as descrições

---

## Phase 1: Setup (Infraestrutura Compartilhada)

**Purpose**: Instalar e configurar dependências de build para Tailwind CSS, fonte Inter e biblioteca de ícones.

- [X] T001 Install Tailwind CSS v3, PostCSS e Autoprefixer em `frontend/` (`npm install -D tailwindcss@^3 postcss autoprefixer --workspace=frontend`)
- [X] T002 [P] Install `@fontsource/inter` em `frontend/` (`npm install @fontsource/inter --workspace=frontend`)
- [X] T003 [P] Install `lucide-react` em `frontend/` (`npm install lucide-react --workspace=frontend`)
- [X] T004 Gerar arquivos base via `npx tailwindcss init -p` dentro de `frontend/` (cria `frontend/tailwind.config.js` e `frontend/postcss.config.js`)
- [X] T005 Criar `frontend/src/index.css` com as três diretivas Tailwind (`@tailwind base; @tailwind components; @tailwind utilities;`)

**Checkpoint**: Dependências instaladas — próximo passo é configurar os tokens do design system.

---

## Phase 2: Foundational (Pré-requisitos Bloqueantes)

**Purpose**: Tokens do design system e schema de configuração de navegação — DEVEM estar completos antes de qualquer User Story.

**⚠️ CRÍTICO**: Nenhuma User Story pode começar até esta fase estar completa.

- [X] T006 Configurar `frontend/tailwind.config.js` com tokens completos do design system: `fontFamily.sans: ['Inter', ...]`, escala de cores teal (50–900 com teal-600 como base primária), `borderRadius` (DEFAULT=8px, md=10px, lg=12px), `boxShadow` (card e overlay, ver data-model.md §1.4), `width.sidebar: '256px'`
- [X] T007 Atualizar `frontend/src/main.tsx` para importar pesos da fonte Inter (`@fontsource/inter/400.css`, `500.css`, `600.css`, `700.css`) e `./index.css` antes de qualquer outro import
- [X] T008 Criar `frontend/src/config/navigation.ts` com: tipo `NavItemStatus`, interface `NavItem` (id, label, path, icon: LucideIcon, status), e array `NAV_ITEMS` com os 6 itens definidos em `contracts/nav-config.schema.md` (dashboard=active; demais=coming-soon)

**Checkpoint**: Design system e configuração de navegação prontos — User Stories podem ser implementadas.

---

## Phase 3: User Story 1 — Navegação via Menu Lateral (P1) 🎯 MVP

**Goal**: Menu lateral funcional com 6 itens de navegação, 3 estados visuais distintos (ativo, padrão, em breve), e navegação entre seções autenticadas.

**Independent Test**: Carregar o app autenticado e verificar que: (1) menu lateral exibe 6 itens; (2) clicar em "Dashboard" destaca o item com fundo teal; (3) itens "Em breve" exibem badge e não respondem a cliques.

### Testes (escrever e verificar falha antes de implementar)

- [X] T009 Escrever testes para `NavigationItem` em `frontend/tests/unit/components/layout/NavigationItem.test.tsx`: estado `active` (fundo teal-50, borda esquerda, texto teal-700), estado `default` (sem destaque), estado `coming-soon` (badge "Em breve" visível, sem link clicável, cursor not-allowed via aria-disabled)
- [X] T010 [P] Escrever testes para `Sidebar` em `frontend/tests/unit/components/layout/Sidebar.test.tsx`: renderiza todos os 6 itens de `NAV_ITEMS`; exibe nome do grupo familiar truncado a 20 chars; exibe nome do usuário; item da rota atual recebe `isActive=true`
- [X] T011 [P] Escrever testes para `AppLayout` em `frontend/tests/unit/components/layout/AppLayout.test.tsx`: renderiza `Sidebar` + área de conteúdo; `children` são renderizados na área de conteúdo; `SkeletonPlaceholder` substituível por children
- [X] T012 [P] Escrever testes para redirect com preservação de URL em `frontend/tests/unit/router/ProtectedRoute.test.tsx`: usuário não autenticado em `/despesas` é redirecionado para `/login` com `state.from.pathname === '/despesas'`; usuário autenticado sem grupo vai para `/onboarding`

### Implementação

- [X] T013 Implementar `NavigationItem` em `frontend/src/components/layout/NavigationItem.tsx`: 3 estados visuais conforme `contracts/nav-config.schema.md` — active (bg-teal-50, border-l-4 border-teal-600, text-teal-700 font-medium), default (text-gray-700, hover:bg-gray-100), coming-soon (text-gray-400, cursor-not-allowed, badge "Em breve" xs rounded-full)
- [X] T014 [P] Implementar `SkeletonPlaceholder` em `frontend/src/components/layout/SkeletonPlaceholder.tsx`: prop `rows?: number` (default 6), divs animados com `animate-pulse bg-gray-200 rounded` em alturas variadas simulando linhas de conteúdo
- [X] T015 [P] Criar `frontend/src/pages/DashboardPage.tsx`: página placeholder para o Dashboard (substitui o `DashboardPlaceholder` inline no AppRouter — conteúdo simples, será expandido na feature de dashboard)
- [X] T016 [US1] Implementar `Sidebar` em `frontend/src/components/layout/Sidebar.tsx`: coluna fixa de `w-sidebar` (256px), header com glassmorphism (`backdrop-blur-md bg-teal-800/80 border-b border-white/10`) exibindo nome do grupo familiar (truncar com `truncate` se > 20 chars), lista de `NavigationItem` para cada item em `NAV_ITEMS` com `isActive` calculado via `useLocation`, rodapé com nome do usuário e link de logout — consumir `useAuth()` do `AuthContext` (feature 004)
- [X] T017 [US1] Implementar `AppLayout` em `frontend/src/components/layout/AppLayout.tsx`: layout de duas colunas (`flex h-screen`), `Sidebar` fixo à esquerda, área de conteúdo à direita (`flex-1 overflow-auto bg-gray-50`), estado `isMobileMenuOpen: boolean` gerenciado localmente — em desktop (>= md) sidebar sempre visível
- [X] T018 [US1] Atualizar `frontend/src/router/ProtectedRoute.tsx` para capturar `location` via `useLocation` e passar `state={{ from: location }}` no `<Navigate to="/login">` (FR-014: preservação de URL original)
- [X] T019 [US1] Atualizar `frontend/src/router/AppRouter.tsx`: importar `AppLayout` e `DashboardPage`; envolver a rota `/` protegida com `<AppLayout>`; remover `DashboardPlaceholder` inline; adicionar rotas stub para `/despesas`, `/categorias`, `/orcamentos`, `/pagamentos`, `/cartoes` (cada uma com `<ProtectedRoute><AppLayout><div>Em breve</div></AppLayout></ProtectedRoute>`)

**Story 1 complete when**: Todos os testes T009–T012 passam; app carregado mostra sidebar com 6 itens; clique no item ativo funciona; itens "em breve" sem navegação.

---

## Phase 4: User Story 2 — Identidade Visual e Tema Claro (P2)

**Goal**: Paleta teal com contraste WCAG 2.1 AA verificado, tipografia Inter aplicada globalmente, hierarquia visual clara, glassmorphism no header da sidebar, sistema de sombras de 2 níveis.

**Independent Test**: Carregar qualquer tela autenticada e verificar: fundo cinza-claro, textos legíveis (contraste > 4.5:1), botões/links em teal, cards com shadow-card, header da sidebar com efeito de glass.

- [X] T020 [US2] Verificar e documentar ratios de contraste WCAG 2.1 AA para todos os tokens teal em `frontend/tailwind.config.js`: teal-600 contra branco deve ser ≥ 4.5:1 (referência: #0d9488 ≈ 4.6:1 ✅); ajustar tonalidade se necessário; adicionar comentário no `tailwind.config.js` com os ratios validados
- [X] T021 [P] [US2] Aplicar tokens de sombra e border-radius à área de conteúdo do `AppLayout` em `frontend/src/components/layout/AppLayout.tsx`: content wrapper recebe `rounded-lg shadow-card` (quando cards individuais forem adicionados pelas features de domínio, este é o padrão a seguir)
- [X] T022 [P] [US2] Confirmar glassmorphism no header da `Sidebar` em `frontend/src/components/layout/Sidebar.tsx`: header deve ter `backdrop-blur-md bg-teal-800/80 border-b border-white/10` — verificar que o efeito de blur está ativo e que o texto do grupo permanece legível (contraste do texto branco contra teal-800/80 ≥ 4.5:1)
- [X] T023 [US2] Atualizar `frontend/src/pages/LoginPage.tsx` para consumir `state.from` do React Router após login bem-sucedido: chamar `navigate(location.state?.from?.pathname ?? '/', { replace: true })` no callback de sucesso do `auth.service.ts` (completa o ciclo FR-014)

**Story 2 complete when**: Lighthouse Accessibility score ≥ 90; Inter carregada em todas as telas; header da sidebar com glass visível; nenhum valor de cor hard-coded em componentes.

---

## Phase 5: User Story 3 — Layout Responsivo (P3)

**Goal**: Menu lateral colapsa automaticamente em telas < 768px; botão hamburguer visível no topo; drawer deslizante abre/fecha corretamente; fechar ao clicar fora da sidebar.

**Independent Test**: Redimensionar navegador para 375px: (1) sidebar oculta; (2) botão hamburguer visível; (3) clicar hamburguer → sidebar desliza da esquerda; (4) clicar fora da sidebar → fecha.

### Testes (escrever e verificar falha antes de implementar)

- [X] T024 [US3] Adicionar testes de comportamento mobile ao `frontend/tests/unit/components/layout/AppLayout.test.tsx`: (a) mock de viewport < 768px → botão de menu visível, sidebar com `hidden md:flex`; (b) clicar no botão hamburguer → `isMobileMenuOpen` = true; (c) clicar no overlay backdrop → `isMobileMenuOpen` = false

### Implementação

- [X] T025 [US3] Adicionar comportamento mobile ao `AppLayout` em `frontend/src/components/layout/AppLayout.tsx`: header mobile com botão hamburguer (`<MenuIcon>` Lucide, visível apenas em `md:hidden`); sidebar com classes `hidden md:flex` em estado fechado e `flex fixed inset-y-0 left-0 z-50` em estado aberto; overlay backdrop `fixed inset-0 bg-black/30 z-40` quando aberto
- [X] T026 [P] [US3] Adicionar prop `onClose?: () => void` ao `Sidebar` em `frontend/src/components/layout/Sidebar.tsx`: chamar `onClose?.()` após clique em item de navegação com `status === 'active'` (fecha o drawer em mobile)
- [X] T027 [P] [US3] Confirmar que o overlay backdrop em `AppLayout` chama `setIsMobileMenuOpen(false)` no seu `onClick` (fecha sidebar ao clicar fora — FR-008)

**Story 3 complete when**: Testes T024 passam; app em 375px mostra hamburguer; sidebar desliza ao clicar; fecha ao clicar fora.

---

## Final Phase: Polish & Validação Cruzada

**Purpose**: Garantir qualidade, cobertura e conformidade com os Success Criteria da spec.

- [X] T028 Rodar suite completa de testes do frontend e verificar que todos passam: `npm test --workspace=frontend` (todos os testes T009–T012, T024 devem estar verdes)
- [X] T029 [P] Validar SC-001: navegar para cada seção do app em ≤ 2 cliques a partir de qualquer tela autenticada — confirmar manualmente no browser
- [X] T030 [P] Validar SC-003: testar layout em janelas de 320px, 768px, 1024px, 1440px e 1920px — nenhum elemento sobreposto ou conteúdo cortado
- [X] T031 Validar SC-004: adicionar item temporário ao `frontend/src/config/navigation.ts`, confirmar que aparece no menu sem modificar nenhum outro arquivo, depois desfazer
- [X] T032 [P] Validar SC-005: acessar `/despesas` sem autenticação → confirmar redirect para `/login` com URL preservada; fazer login → confirmar redirect de volta para `/despesas`

---

## Dependencies (Story Completion Order)

```text
Phase 1 (Setup)
    ↓
Phase 2 (Foundational — tokens + nav config)
    ↓
Phase 3 US1 (Menu Lateral) ← MVP mínimo entregável
    ↓
Phase 4 US2 (Identidade Visual) ← depende de US1 (Sidebar, AppLayout existem)
    ↓
Phase 5 US3 (Responsividade) ← depende de US1 (AppLayout tem o estado mobile)
    ↓
Polish
```

**US2 e US3 são independentes entre si** — podem ser implementadas em paralelo após US1.

---

## Parallel Execution Examples

### Durante Phase 3 (US1):

```text
Stream A: T009 → T013 → T016 → T019
Stream B: T010 → (aguarda T013) → T016
Stream C: T011 → (aguarda T016) → T017
Stream D: T012 → T018
Stream E: T014, T015 (sem dependências — qualquer momento após Phase 2)
```

### Durante Phase 4 + 5 (após US1 completa):

```text
Stream A: T020 → T021 → T022 → T023
Stream B: T024 → T025 → T026, T027
```

---

## Implementation Strategy

**MVP (entrega mínima)**: Completar Phase 1 + Phase 2 + Phase 3 (US1).
- Resultado: App autenticado com sidebar funcional, 6 itens de navegação, estados visuais corretos, redirect seguro.
- Suficiente para validar o shell de navegação com usuários reais.

**Increment 2**: Phase 4 (US2) — identidade visual completa, glassmorphism, WCAG validado.

**Increment 3**: Phase 5 (US3) — responsividade mobile.

**Total de tarefas**: 32 | **Paralelas**: 14 | **Sequenciais**: 18
