---

description: "Task list for Frontend Redesign — Modern UI with Liquid Glass Aesthetic"
---

# Tasks: Frontend Redesign — Modern UI with Liquid Glass Aesthetic

**Input**: Design documents from `/specs/013-frontend-redesign/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/design-system.md, quickstart.md

**Tests**: INCLUÍDOS — TDD é obrigatório (Constituição, Princípio II NON-NEGOTIABLE; plan.md marca Test-First como APPLIES). Testes vermelhos **antes** da implementação.

**Organization**: Tasks agrupadas por user story. Estratégia **design system primeiro**: a fundação (tokens + tema + biblioteca de primitivos reutilizáveis) bloqueia as stories; cada story é a **aplicação** do sistema às telas, testável de forma independente.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Pode rodar em paralelo (arquivos diferentes, sem dependência pendente)
- **[Story]**: US1–US4 (mapeia para as user stories do spec.md)
- Caminhos de arquivo são relativos à raiz do monorepo

## Path Conventions

- Web monorepo — todas as mudanças em `frontend/` (feature frontend-only; **sem** backend, contrato de API ou banco)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Fundação de configuração da identidade — tokens, Tailwind, glass e helpers

- [ ] T001 Configurar `darkMode: 'class'` e cores semânticas mapeadas a CSS vars (`rgb(var(--token) / <alpha-value>)`); remover a escala `primary` (teal) morta em `frontend/tailwind.config.js`
- [ ] T002 Definir tokens de tema — `:root` (claro) e `.dark` (escuro) com todas as custom properties (R2/data-model §2) + utilitário `.glass` com fallback `@supports not (backdrop-filter)` em `frontend/src/index.css`
- [ ] T003 [P] Adicionar script inline anti-flash de tema (aplica `.dark` no `<html>` antes do React) em `frontend/index.html`
- [ ] T004 [P] Adicionar helper `cn()` de composição de classes em `frontend/src/lib/cn.ts` **e** configurar o path alias `@/` → `frontend/src/` em `frontend/tsconfig.json` (`compilerOptions.paths`) e `frontend/vite.config.ts` (`resolve.alias`) para habilitar o import via barrel `@/components/ui` (também alinhar `moduleNameMapper` em `frontend/jest.config` para os testes)

---

## Phase 2: Foundational (Blocking Prerequisites) — Design System

**Purpose**: Sistema de tema + **biblioteca de primitivos reutilizáveis** que TODAS as stories consomem

**⚠️ CRITICAL**: Nenhuma migração de tela pode começar antes desta fase. É aqui que a **reutilização e a padronização de identidade** são garantidas (gate do plan.md §Reusability).

### Tema (TDD)

- [ ] T005 [P] Escrever testes (falhando) de `ThemeProvider`/`useTheme` — default por `prefers-color-scheme` (mock `matchMedia`), fallback dark, persistência em `localStorage`, escolha manual prevalece — em `frontend/src/theme/ThemeProvider.test.tsx`
- [ ] T006 Implementar `ThemeProvider` + `useTheme` em `frontend/src/theme/ThemeProvider.tsx` e `frontend/src/theme/useTheme.ts`
- [ ] T007 [P] Escrever teste (falhando) de `ThemeToggle` em `frontend/src/components/ui/ThemeToggle.test.tsx`
- [ ] T008 Implementar `ThemeToggle` (ícone sol/lua, `aria-label` PT-BR) em `frontend/src/components/ui/ThemeToggle.tsx`
- [ ] T009 Envolver a app com `<ThemeProvider>` em `frontend/src/main.tsx`

### Testes dos primitivos (escrever PRIMEIRO, devem FALHAR)

- [ ] T010 [P] Testes (falhando) de `Button` (variant/size/loading) em `frontend/src/components/ui/Button.test.tsx`
- [ ] T011 [P] Testes (falhando) de `IconButton` (aria-label obrigatório) em `frontend/src/components/ui/IconButton.test.tsx`
- [ ] T012 [P] Testes (falhando) de `Card` em `frontend/src/components/ui/Card.test.tsx`
- [ ] T013 [P] Testes (falhando) de `GlassCard` incl. fallback sólido em `frontend/src/components/ui/GlassCard.test.tsx`
- [ ] T014 [P] Testes (falhando) de `Pill` (estados inativo/ativo/desabilitado, ícone, onClick) em `frontend/src/components/ui/Pill.test.tsx`
- [ ] T015 [P] Testes (falhando) de `Input` (estado invalid) em `frontend/src/components/ui/Input.test.tsx`
- [ ] T016 [P] Testes (falhando) de `FormField` (label/erro/aria-describedby) em `frontend/src/components/ui/FormField.test.tsx`
- [ ] T017 [P] Testes (falhando) de `Select` em `frontend/src/components/ui/Select.test.tsx`
- [ ] T018 [P] Testes (falhando) de `Badge` (tones) em `frontend/src/components/ui/Badge.test.tsx`
- [ ] T019 [P] Testes (falhando) de `Spinner` em `frontend/src/components/ui/Spinner.test.tsx`
- [ ] T020 [P] Testes (falhando) de `Modal` (open/close, ESC, clique no overlay, foco-trap, role=dialog) em `frontend/src/components/ui/Modal.test.tsx`

### Implementação dos primitivos (consomem só tokens; variação por variant/size/tone)

- [ ] T021 [P] Implementar `Button` em `frontend/src/components/ui/Button.tsx`
- [ ] T022 [P] Implementar `IconButton` em `frontend/src/components/ui/IconButton.tsx`
- [ ] T023 [P] Implementar `Card` (superfície sólida) em `frontend/src/components/ui/Card.tsx`
- [ ] T024 [P] Implementar `GlassCard` (translúcido+blur + fallback `@supports`) em `frontend/src/components/ui/GlassCard.tsx`
- [ ] T025 [P] Implementar `Pill` em `frontend/src/components/ui/Pill.tsx`
- [ ] T026 [P] Implementar `Input` em `frontend/src/components/ui/Input.tsx`
- [ ] T027 [P] Implementar `FormField` em `frontend/src/components/ui/FormField.tsx`
- [ ] T028 [P] Implementar `Select` (chevron lucide, `<select>` nativo) em `frontend/src/components/ui/Select.tsx`
- [ ] T029 [P] Implementar `Badge` em `frontend/src/components/ui/Badge.tsx`
- [ ] T030 [P] Implementar `Spinner` em `frontend/src/components/ui/Spinner.tsx`
- [ ] T031 Implementar `Modal` (compõe `GlassCard` + `IconButton`; trava scroll do body) em `frontend/src/components/ui/Modal.tsx` (depende de T024, T022)
- [ ] T032 Criar barrel de exportação em `frontend/src/components/ui/index.ts` (`Button`, `IconButton`, `Pill`, `Card`, `GlassCard`, `Modal`, `Input`, `FormField`, `Select`, `Badge`, `Spinner`, `ThemeToggle`)
- [ ] T033 **Gate de reutilização/identidade**: revisar primitivos vs `contracts/design-system.md` §2/§4 (props batem, tokens-only, variação por prop, sem clones)

**Checkpoint**: Design system pronto — tema funciona e a biblioteca de primitivos está disponível via barrel. Migração de telas pode começar.

---

## Phase 3: User Story 1 - Navegação com Visual Moderno (Priority: P1) 🎯 MVP

**Goal**: Aplicar a paleta roxo/violeta + tema + sistema consistente ao shell e às 11 telas, compondo os primitivos. Nenhuma cor teal/azul/índigo remanescente.

**Independent Test**: Abrir qualquer tela → paleta roxa via tokens, design consistente entre telas, `ThemeToggle` alterna claro/escuro e persiste; nenhuma cor do sistema antigo.

- [ ] T034 [US1] Recompor `MoneyInput` sobre `Input`/`FormField` (mantém formatação de centavos) em `frontend/src/components/shared/MoneyInput.tsx`
- [ ] T035 [P] [US1] Migrar `AppLayout` para tokens + montar `ThemeToggle` + glass no chrome; aprimorar drawer mobile em `frontend/src/components/layout/AppLayout.tsx`
- [ ] T036 [P] [US1] Migrar `Sidebar` para tokens (remover `teal-800` hard-coded) + glass em `frontend/src/components/layout/Sidebar.tsx`
- [ ] T037 [P] [US1] Migrar `NavigationItem` (estado ativo via tokens) em `frontend/src/components/layout/NavigationItem.tsx`
- [ ] T038 [P] [US1] Migrar `SkeletonPlaceholder` para `Spinner`/tokens em `frontend/src/components/layout/SkeletonPlaceholder.tsx`
- [ ] T039 [P] [US1] Migrar `Toast` para tokens em `frontend/src/components/Toast.tsx`
- [ ] T040 [P] [US1] Migrar componentes de auth (`LoginForm`, `RegisterForm`, `PasswordInput`) para primitivos/tokens em `frontend/src/components/auth/*`
- [ ] T041 [P] [US1] Migrar páginas de auth/onboarding (`LoginPage`, `RegisterPage`, `ForgotPasswordPage`, `ResetPasswordPage`, `OnboardingPage`) para primitivos/tokens em `frontend/src/pages/*`
- [ ] T042 [P] [US1] Migrar componentes do dashboard (`FamilySummaryCard`, `CategorySpendingList`, `MemberSpendingList`, `BudgetProgressBar`, `DashboardMonthSelector`) para `Card`/tokens em `frontend/src/components/dashboard/*`
- [ ] T043 [P] [US1] Migrar `DashboardPage` para tokens em `frontend/src/pages/DashboardPage.tsx`
- [X] T044 [P] [US1] Migrar componentes de bills (`BillItem`, `BillChecklist`, `MonthBillsSummary`, `CopyPreviousMonthButton`, `RecurringBillsSection`; `*FormModal`/`PayBillModal`/`QuickLogModal`/`RecurringBillFormModal` → `Modal`) para primitivos/tokens em `frontend/src/components/bills/*`
- [X] T045 [P] [US1] Migrar `PaymentsPage` e `RecurringBillsPage` para tokens em `frontend/src/pages/*`
- [X] T046 [P] [US1] Migrar componentes de budget (`AllocationSummaryBar`, `CategoryBudgetTree`, `FamilyBudgetSection`, `LimitEditor`, `MemberBudgetList`, `MonthSelector`, `CopyPreviousMonthDialog`→`Modal`) + `BudgetsPage` para tokens em `frontend/src/components/budget/*` e `frontend/src/pages/BudgetsPage.tsx`
- [X] T047 [P] [US1] Migrar componentes de category (`CategoryRow`, `CategoryTree`, `CategoryFormModal`→`Modal`, `DeleteCategoryModal`→`Modal`) + `CategoriesPage` para tokens em `frontend/src/components/category/*` e `frontend/src/pages/CategoriesPage.tsx`
- [X] T048 [P] [US1] Migrar componentes de credit-cards (`CreditCardList`, `CreditCardDetail`, `CreditCardSummarySection`, `CreditCardFormModal`→`Modal`, `RegisterFaturaModal`→`Modal`) + `CreditCardsPage` para tokens em `frontend/src/components/credit-cards/*` e `frontend/src/pages/CreditCardsPage.tsx`
- [X] T049 [US1] Testes de regressão de migração: telas representativas renderizam via tokens; `*FormModal` usam `Modal` (abre/fecha); fluxos disparam os mesmos handlers em `frontend/src/components/**/*.test.tsx`
- [X] T050 [US1] Gate "sem cor hard-coded": grep em `frontend/src` não encontra `teal-/blue-/indigo-/bg-white/text-gray-9` fora dos tokens (SC-001/SC-008)

**Checkpoint**: App inteiramente repaginada na identidade roxa, com tema claro/escuro — MVP entregável.

---

## Phase 4: User Story 2 - Pills e Chips para Filtros e Seletores (Priority: P2)

**Goal**: Converter os seletores de **baixa cardinalidade** (método de pagamento, status, mês) em grupos de `Pill`; categoria e cartão permanecem `Select`.

**Independent Test**: Em uma lista filtrável e nos formulários, método/status/mês aparecem como pills com estado ativo claro e disparam o mesmo handler; categoria/cartão seguem dropdown.

- [X] T051 [US2] Testes (falhando): método/status/mês renderizam como `Pill` e acionam o mesmo callback dos selects anteriores em `frontend/src/components/bills/*.test.tsx` e `frontend/src/components/budget/*.test.tsx`
- [X] T052 [P] [US2] Converter seletor de método de pagamento em grupo de `Pill` em `frontend/src/components/bills/QuickLogModal.tsx` e `frontend/src/components/bills/BillFormModal.tsx`
- [X] T053 [P] [US2] Converter filtros de status em grupo de `Pill` em `frontend/src/components/bills/MonthBillsSummary.tsx` / `frontend/src/pages/PaymentsPage.tsx`
- [X] T054 [P] [US2] Converter seletor de mês em `Pill` (quando baixa cardinalidade) em `frontend/src/components/budget/MonthSelector.tsx` e `frontend/src/components/dashboard/DashboardMonthSelector.tsx`
- [X] T055 [US2] Verificar (teste) que seletores de **categoria** e **cartão** permanecem `Select`, não pills (FR-002/SC-002)

**Checkpoint**: Pills aplicados nos contextos certos; dropdowns de categoria/cartão preservados.

---

## Phase 5: User Story 3 - Efeito Liquid Glass em Painéis e Cards (Priority: P3)

**Goal**: Aplicar `GlassCard` aos cards de resumo e overlays, com hover sutil e fallback sólido.

**Independent Test**: No dashboard e nas telas de cartões/pagamentos, os cards de resumo exibem vidro (blur + borda) nos dois temas; navegador sem `backdrop-filter` mostra fundo sólido legível.

- [X] T056 [US3] Testes (falhando) de aplicação do glass + hover interativo nos cards de resumo em `frontend/src/components/dashboard/FamilySummaryCard.test.tsx`
- [X] T057 [P] [US3] Aplicar `GlassCard` aos cards de resumo do dashboard (`FamilySummaryCard` e listas de resumo) em `frontend/src/components/dashboard/*`
- [X] T058 [P] [US3] Aplicar `GlassCard` ao resumo de cartões e ao resumo de pagamentos em `frontend/src/components/credit-cards/CreditCardSummarySection.tsx` e `frontend/src/components/bills/MonthBillsSummary.tsx`
- [X] T059 [US3] Garantir que `Modal`/overlays usam glass e validar fallback sólido via `@supports` (verificação manual/axe) — SC-004/FR-006

**Checkpoint**: Liquid glass presente nos cards de resumo e modais, com fallback.

---

## Phase 6: User Story 4 - Tipografia e Hierarquia Visual (Priority: P4)

**Goal**: Hierarquia tipográfica clara — valores monetários em destaque grandes/bold na paleta; rótulos secundários em `--fg-muted`.

**Independent Test**: Em telas com valores monetários, o destaque usa tamanho grande + bold + cor da paleta/branco; rótulos secundários usam peso normal e cor apagada.

- [X] T060 [US4] Definir escala/pesos tipográficos (headings, destaque monetário, muted) como utilitários/tokens em `frontend/src/index.css` e `frontend/tailwind.config.js`
- [X] T061 [P] [US4] Aplicar hierarquia de destaque (valor monetário grande/bold/violeta) no dashboard, pagamentos e cartões em `frontend/src/components/dashboard/*`, `frontend/src/components/bills/*`, `frontend/src/components/credit-cards/*`
- [X] T062 [P] [US4] Aplicar `--fg-muted` em rótulos/descrições secundárias nas telas em `frontend/src/components/**`

**Checkpoint**: Hierarquia visual consistente em todas as telas.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Qualidade transversal e validação final

- [X] T063 [P] QA de contraste WCAG AA nos **dois** temas (axe/manual): corpo ≥ 4.5:1, títulos grandes ≥ 3:1 — SC-003
- [X] T064 [P] QA responsivo de 320px a desktop, incluindo drawer mobile acessível a todas as seções — SC-009
- [X] T065 Verificar animações ≤ 300ms sem jank e custo do glass aceitável em listas — SC-006
- [X] T066 Rodar o checklist de validação manual do `specs/013-frontend-redesign/quickstart.md`
- [X] T067 [P] Documentar uso do design system (primitivos + tokens) no `frontend/README.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: sem dependências — pode iniciar imediatamente
- **Foundational (Phase 2)**: depende do Setup — **BLOQUEIA** todas as stories (tema + primitivos)
- **User Stories (Phase 3–6)**: dependem do Foundational
  - US1 (P1) é a base de identidade; US2/US3/US4 aplicam refinamentos sobre as telas já migradas
  - US2, US3 e US4 são independentes entre si e podem ser paralelizadas após US1
- **Polish (Phase 7)**: depende das stories desejadas concluídas

### User Story Dependencies

- **US1 (P1)**: após Foundational — sem dependência de outra story (MVP)
- **US2 (P2)**: após Foundational; recomendado após US1 (telas já em tokens). `Pill` já existe (foundational)
- **US3 (P3)**: após Foundational; recomendado após US1. `GlassCard` já existe (foundational)
- **US4 (P4)**: após Foundational; recomendado após US1

### Within Each Phase

- Testes (foundational e por story) escritos e **falhando** antes da implementação
- Primitivos antes da migração das telas
- `GlassCard`/`IconButton` antes do `Modal` (T024/T022 → T031)
- Barrel (T032) antes de telas importarem primitivos

### Parallel Opportunities

- Setup: T003 e T004 em paralelo
- Foundational: todos os testes de primitivos (T010–T020) em paralelo; todas as implementações independentes (T021–T030) em paralelo; T005/T007 em paralelo
- US1: T035–T048 em sua maioria [P] (arquivos/áreas distintas) após T034
- US2/US3/US4: tasks [P] dentro de cada uma; e as três stories podem rodar em paralelo após US1

---

## Parallel Example: Foundational (primitivos)

```bash
# Testes dos primitivos juntos (todos falhando primeiro):
Task: "Testes de Button em frontend/src/components/ui/Button.test.tsx"
Task: "Testes de Pill em frontend/src/components/ui/Pill.test.tsx"
Task: "Testes de GlassCard em frontend/src/components/ui/GlassCard.test.tsx"
Task: "Testes de Modal em frontend/src/components/ui/Modal.test.tsx"

# Implementações independentes juntas (após testes vermelhos):
Task: "Implementar Button em frontend/src/components/ui/Button.tsx"
Task: "Implementar Card em frontend/src/components/ui/Card.tsx"
Task: "Implementar Pill em frontend/src/components/ui/Pill.tsx"
Task: "Implementar Select em frontend/src/components/ui/Select.tsx"
```

---

## Implementation Strategy

### MVP First (Foundational + User Story 1)

1. Phase 1: Setup (tokens/Tailwind/glass/helpers)
2. Phase 2: Foundational (tema + biblioteca de primitivos) — **bloqueia tudo**
3. Phase 3: US1 — repaginar shell + 11 telas na identidade roxa com tema
4. **PARAR e VALIDAR**: testar US1 isoladamente (paleta, tema, sem teal)
5. Deploy/demo do MVP visual

### Incremental Delivery

1. Setup + Foundational → design system pronto
2. US1 → testar → demo (MVP — app rebrandada)
3. US2 (pills) → testar → demo
4. US3 (liquid glass) → testar → demo
5. US4 (tipografia) → testar → demo
6. Polish (contraste/responsivo/perf) → validar quickstart

### Parallel Team Strategy

1. Time conclui Setup + Foundational junto (primitivos divididos por dev — todos [P])
2. Após o design system:
   - Dev A: US1 (shell + telas)
   - Após US1: Dev B: US2 (pills) · Dev C: US3 (glass) · Dev D: US4 (tipografia)

---

## Notes

- Feature **frontend-only**: nenhuma task toca `backend/`, contrato de API ou banco
- [P] = arquivos diferentes, sem dependência pendente
- Identidade padronizada por construção: telas **compõem** primitivos do barrel `@/components/ui`; proibido recriar padrão inline (gate T033/T050). O alias `@/` é configurado em T004 (tsconfig/vite/jest)
- `prefers-reduced-motion` fora de escopo; fonte **Inter** mantida; preferência de tema só no dispositivo (localStorage)
- Verificar testes falhando antes de implementar; commit após cada task ou grupo lógico
