# Implementation Plan: Frontend Redesign — Modern UI with Liquid Glass Aesthetic

**Branch**: `013-frontend-redesign` | **Date**: 2026-06-17 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/013-frontend-redesign/spec.md`

**Revisão 2026-06-17**: reforço de **reutilização de componentes** e
**padronização de identidade** (pedido do usuário) — ver seção
*Reusability & Identity Standardization*.

## Summary

Reformular a identidade visual do frontend existente (11 telas) numa única
entrega **big-bang**, sem tocar backend, contratos de API ou banco. A abordagem
é **design system primeiro**: estabelecer uma camada de **tokens** (cores roxo/
violeta, espaçamento, raios, sombras, glass) que cobre **dois temas** (claro e
escuro) via CSS custom properties + `darkMode: 'class'` no Tailwind, e uma
**biblioteca de primitivos reutilizáveis** (`src/components/ui/`) que **todas** as
telas consomem — sem estilos avulsos por tela. Em cima dessa fundação, migrar as
11 telas + o shell de navegação para os primitivos/tokens, substituir os
seletores de baixa cardinalidade (método de pagamento, status, mês) por **pills**
(categoria e cartão seguem dropdown, mas via um `Select` padronizado) e aplicar
**liquid glass** em cards de resumo, modais e overlays com fallback sólido.

O eixo desta revisão é garantir que a nova identidade seja **padronizada por
construção**: cada padrão visual recorrente (botão, pill, card, modal, campo de
formulário, dropdown, badge) existe como **um único componente** com variantes
controladas por props — de modo que repintar a marca no futuro é mudar tokens, e
um novo recurso herda a identidade automaticamente ao compor primitivos.

Entregas concretas:

1. **Camada de tokens (tema claro/escuro)** — variáveis CSS semânticas
   (`--bg`, `--surface`, `--surface-glass`, `--border`, `--fg`, `--fg-muted`,
   `--primary`, `--primary-hover`, `--primary-fg`, `--accent`, `--danger`,
   `--success`) para `:root` (claro) e `.dark` (escuro), mapeadas em
   `tailwind.config.js`. Substitui o token `primary` (teal) morto e centraliza o
   que hoje está hard-coded em ~41 arquivos (FR-001, FR-004, FR-011, SC-001,
   SC-008).
2. **ThemeProvider + persistência** — contexto React que resolve o tema inicial
   por `prefers-color-scheme` (fallback **dark**), persiste a escolha manual em
   `localStorage`, aplica `.dark` no `<html>` e expõe `useTheme()`/`ThemeToggle`.
   Bootstrap inline no `index.html` evita flash (FR-009, FR-010, FR-013, SC-007).
3. **Biblioteca de primitivos reutilizáveis** — além de `Pill`, `GlassCard`,
   `Button`, `ThemeToggle`, a revisão **padroniza** os padrões recorrentes em
   primitivos únicos: `Modal` (base de todos os `*FormModal`/diálogos), `Card`
   (superfície sólida não-glass), `Input`/`FormField` (rótulo+erro+campo),
   `Select` (dropdown padronizado de categoria/cartão), `Badge`/`Tag`,
   `IconButton` e `Spinner`/skeleton tokenizado. Todos exportados por um
   **barrel** `src/components/ui/index.ts` e consumindo apenas tokens (FR-002,
   FR-003, FR-006, FR-007, SC-008).
4. **Migração das 11 telas + shell** — Dashboard, Pagamentos, Orçamentos,
   Categorias, Cartões, Contas Recorrentes (app) + Login, Registro, Esqueci a
   Senha, Redefinir Senha, Onboarding (auth), mais `AppLayout`/`Sidebar`/
   `NavigationItem`. Trocam cor hard-coded e marcação avulsa pelos primitivos,
   aplicam glass nos cards de resumo/modais, convertem os seletores de baixa
   cardinalidade em pills e garantem responsividade completa (320px→desktop) com
   a sidebar colapsando em drawer no mobile (FR-005, FR-008, FR-012, FR-014,
   SC-001..SC-009).

Saldo de complexidade: **controlado e redutor** — a feature *remove* dívida
(cores e marcação repetida → tokens + primitivos), não adiciona entidade nem
dependência nova. O conjunto de primitivos é maior que o esboço anterior, mas
cada item substitui um padrão **já duplicado** em várias telas (justificado por
reuso presente, não especulação).

## Technical Context

**Language/Version**: TypeScript 5 (strict) + React 18. Frontend-only — backend
Node.js 20/Express **inalterado** nesta feature.

**Primary Dependencies** (todas já presentes — **zero libs novas**):

- React 18 + React Router DOM v7 (SPA existente).
- **Tailwind CSS 3.4** — `darkMode: 'class'` + cores semânticas referenciando CSS
  custom properties (`rgb(var(--token) / <alpha-value>)`).
- **PostCSS 8 + autoprefixer** — prefixos de `backdrop-filter` para o glass.
- `@fontsource/inter` (mantida — sem troca de fonte), `lucide-react` (ícones,
  inclui sol/lua e chevrons para o `Select`).
- Jest 29 + React Testing Library + jest-dom (testes), Vite 5 (build/dev).
- (Opcional, **sem nova dep**) utilitário próprio `cn()` de ~5 linhas para
  compor classes condicionais nas variantes dos primitivos.

**Storage**: `localStorage` — **apenas** a preferência de tema
(`finances.theme` ∈ `light|dark`). Nenhum banco, endpoint ou migração (FR-013).
Sem dado sensível.

**Testing**: Jest + RTL — unit dos primitivos (cada variante/estado, incl. o
contrato de props), do `ThemeProvider` (default por `prefers-color-scheme`,
fallback dark, persistência, escolha manual prevalece) e do `ThemeToggle`;
testes de migração focados em **comportamento preservado** (seletor método→pill
e o `Select` de categoria/cartão disparam o mesmo handler; modal abre/fecha; nav
mobile) e em **ausência de cor hard-coded** nos primitivos.

**Target Platform**: Navegadores modernos (Chrome 115+, Firefox 120+,
Safari 17+); fallback `@supports` p/ `backdrop-filter`. Responsivo 320px→desktop.

**Project Type**: Web monorepo (npm workspaces) — alterações **somente** em
`frontend/`.

**Performance Goals**:

- Animações de interação ≤ **300ms**, sem jank (≥ 60fps) — SC-006/FR-007. Glass
  via `backdrop-filter` (GPU), restrito a superfícies-chave.
- Troca de tema instantânea (classe no `<html>` + variáveis CSS), sem re-fetch.
- Sem flash de tema no carregamento (bootstrap inline antes do React).

**Constraints**:

- **Frontend-only**: sem mudança de contrato/schema/backend (FR-008/FR-013).
- **WCAG 2.1 AA** nos **dois** temas (≥ 4.5:1 corpo, ≥ 3:1 títulos grandes) —
  FR-005/SC-003.
- **PT-BR** exclusivamente na UI.
- `prefers-reduced-motion` **fora de escopo** (Q3): animações sempre ativas.
- Categoria e cartão **permanecem dropdown** — mas via o primitivo `Select`
  padronizado; só método/status/mês viram pill (FR-002/SC-002).
- Valores monetários via `utils/money.ts` inalterado (centavos).

**Scale/Scope**: 11 telas, ~40 componentes, 1 shell. Adiciona ~11 primitivos
(`Button`, `IconButton`, `Pill`, `Card`, `GlassCard`, `Modal`, `Input`,
`FormField`, `Select`, `Badge`/`Tag`, `Spinner`) + `ThemeProvider`/`ThemeToggle`
+ camada de tokens; modifica `tailwind.config.js`, `index.css`, `index.html`,
`main.tsx` e ~41 arquivos com cor/marcação hard-coded. Nenhuma entidade,
endpoint ou migração.

## Reusability & Identity Standardization

*Foco desta revisão. Objetivo: a identidade é padronizada por construção e
qualquer recurso futuro herda a marca ao compor primitivos.*

### Princípios

1. **Fonte única de verdade por padrão visual** — para cada padrão recorrente
   (botão, pill, card, modal, campo, dropdown, badge) existe **exatamente um**
   componente em `src/components/ui/`. Proibido recriar o padrão inline numa
   tela (SC-008 estendido: nem cor nem *marcação* de padrão duplicada).
2. **Variantes por prop, não por cópia** — diferenças visuais são `variant`/
   `size`/`tone` (ex.: `Button variant="primary|ghost|danger"`), nunca um
   componente novo por aparência.
3. **Tokens-only** — primitivos referenciam apenas tokens semânticos; zero hex/
   cor literal. Repintar a marca = trocar tokens, sem tocar componentes (SC-008).
4. **Composição sobre configuração** — primitivos pequenos compõem os maiores
   (ex.: `Modal` usa `GlassCard` + `IconButton` de fechar; `FormField` usa
   `Input`/`Select`). Telas compõem primitivos; não estilizam do zero.
5. **API previsível** — props consistentes entre primitivos (`className` para
   composição, `variant`/`size`, repasse de props nativas via `...rest`,
   `forwardRef` onde fizer sentido), exportados por **barrel**
   `src/components/ui/index.ts` para import único: `import { Button, Pill } from '@/components/ui'`.
6. **Acessibilidade embutida** — foco visível, `aria-*`, contraste AA vivem
   **dentro** do primitivo, então toda tela herda acessibilidade de graça.
7. **Documentação viva** — `contracts/design-system.md` é o contrato das props;
   um `quickstart` mostra como compor. (Sem Storybook nesta feature — dep nova
   evitada; exemplos ficam nos testes RTL e no quickstart.)

### Inventário de primitivos (cada um substitui duplicação real)

| Primitivo | Padroniza (hoje duplicado em) | Variantes/props-chave |
|-----------|-------------------------------|------------------------|
| `Button` | botões teal/blue/indigo espalhados | `variant` primary/ghost/danger, `size` sm/md, `loading` |
| `IconButton` | botões só-ícone (fechar modal, menu) | `label` (a11y), `variant` |
| `Pill` | filtros + método/status/mês | `selected`, `disabled`, `icon`, single/multi via container |
| `Card` | superfícies sólidas (`bg-white shadow-card`) | `as`, `interactive` |
| `GlassCard` | cards de resumo + base de modal | `interactive`, fallback sólido |
| `Modal` | `*FormModal`, `PayBillModal`, `Delete*Modal`, `RegisterFaturaModal`, dialogs | `open`, `onClose`, `title`, `footer`; foco-trap + ESC + overlay |
| `Input` | inputs de texto/numéricos repetidos | estados erro/disabled via tokens |
| `FormField` | rótulo+campo+mensagem de erro repetidos | `label`, `error`, `htmlFor` |
| `Select` | dropdowns (categoria/cartão e outros) | tokenizado; mantém `<select>` nativo acessível |
| `Badge`/`Tag` | rótulos de status/contagem | `tone` neutral/primary/danger/success |
| `Spinner`/skeleton | `SkeletonPlaceholder` + spinners avulsos | tamanho; usa tokens |

> `MoneyInput` existente é **refatorado** para compor `Input`/`FormField` (mantém
> a formatação de centavos; só herda a identidade).

### Critérios de aceite de reutilização (gate antes da Phase 2)

- [ ] Todo padrão da tabela tem **um** componente em `src/components/ui/` + export no barrel.
- [ ] Nenhuma tela recria botão/pill/card/modal/campo/dropdown inline.
- [ ] Diferenças visuais expressas por `variant`/`size`/`tone` (sem clones).
- [ ] Zero cor/raio/sombra literal em primitivos e telas (SC-008).
- [ ] `MoneyInput` e modais existentes recompostos sobre os primitivos.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Princípio | Status | Notas |
|-----------|--------|-------|
| **I. API-First** | N/A (PASS) | Feature **puramente visual/frontend** — não cruza fronteira de serviço nem altera contrato de API. O contrato relevante é a **UI contract** (tokens + props dos primitivos) em `contracts/design-system.md`, revisado antes da migração das telas (contract review gate aplicado ao contrato de UI). Nenhum contrato de backend tocado. |
| **II. Test-First (NON-NEGOTIABLE)** | APPLIES | TDD com RTL. Ordem: (1) testes **falhando** de cada primitivo (variantes/estados + contrato de props), do `ThemeProvider` e do `ThemeToggle` → implementação; (2) testes de migração **falhando** garantindo comportamento preservado (pill/`Select` disparam o mesmo callback; `Modal` abre/fecha/ESC; drawer mobile; rota inalterada) → migração das telas. Cobre SC-002, SC-005, SC-007, SC-008. |
| **III. Security & Data Integrity** | PASS | Sem fronteira de dados nova. `localStorage` guarda só `theme` (não sensível). Sem endpoint/auth/escopo afetado. Monetário segue inteiro via `utils/money.ts`. Sem segredos. |
| **IV. Simplicity** | PASS | A feature **reduz** complexidade: centraliza cor (de ~41 arquivos) e **marcação duplicada** (botões/modais/campos) em primitivos únicos; remove token teal morto. Cada primitivo substitui duplicação **presente** (não especulativa) — alinhado a "duplicação preferível a abstração prematura": aqui a abstração elimina duplicação **já existente**. Tokens via CSS vars + `darkMode:'class'` é a forma mais simples de 2 temas. **Zero deps novas** (sem Storybook, sem CVA — `cn()` próprio). Sem entradas em Complexity Tracking. |
| **V. Observability** | N/A (PASS) | Logging é backend, inalterado. Falha de `localStorage` degrada para `prefers-color-scheme`/fallback. `/health` inalterado. |

**Gate result: PASS** — Phase 0 pode iniciar. Re-avaliado após o Phase 1
(abaixo): **PASS mantido**, sem entradas em Complexity Tracking.

## Project Structure

### Documentation (this feature)

```text
specs/013-frontend-redesign/
├── plan.md              # Este arquivo (revisado — reuso/identidade)
├── spec.md              # Especificação (2 sessões de clarification)
├── research.md          # Phase 0 output (R1–R9: paleta, glass, tema, pills, responsivo, reuso)
├── data-model.md        # Phase 1 output (modelo de tokens + estado de tema + inventário de primitivos)
├── quickstart.md        # Phase 1 output (como rodar/compor primitivos/validar)
├── contracts/
│   └── design-system.md # Phase 1 output — UI contract: tokens + props dos primitivos
├── checklists/
│   └── requirements.md  # Feito no /speckit-specify
└── tasks.md             # Phase 2 output (gerado por /speckit-tasks)
```

### Source Code (repository root)

```text
frontend/
├── index.html                                  # MODIFICADO — script inline de bootstrap de tema (anti-flash)
├── tailwind.config.js                          # MODIFICADO — darkMode:'class'; cores semânticas via rgb(var(--token)); remove escala teal morta; mantém Inter/radius/shadow + tokens de glass
└── src/
    ├── index.css                               # MODIFICADO — :root (claro) e .dark (escuro) com as custom properties; utilitário .glass + fallback @supports
    ├── lib/
    │   └── cn.ts                               # NOVO — helper de composição de classes (sem dep nova)
    ├── theme/
    │   ├── ThemeProvider.tsx                   # NOVO — resolve/persiste tema; aplica .dark no <html> (FR-009/010/013)
    │   └── useTheme.ts                         # NOVO — hook (theme, setTheme, toggle)
    ├── components/
    │   ├── ui/                                 # NOVO — biblioteca de primitivos reutilizáveis
    │   │   ├── index.ts                        # NOVO — barrel (import único)
    │   │   ├── Button.tsx                      # NOVO — variantes primary/ghost/danger (FR-001)
    │   │   ├── IconButton.tsx                  # NOVO — botão só-ícone com a11y
    │   │   ├── Pill.tsx                        # NOVO — estados/seleção (FR-002)
    │   │   ├── Card.tsx                        # NOVO — superfície sólida
    │   │   ├── GlassCard.tsx                   # NOVO — translúcido+blur+fallback (FR-003/006)
    │   │   ├── Modal.tsx                       # NOVO — base de todos os diálogos (foco-trap/ESC/overlay)
    │   │   ├── Input.tsx                       # NOVO — campo de texto/número tokenizado
    │   │   ├── FormField.tsx                   # NOVO — rótulo + campo + erro
    │   │   ├── Select.tsx                      # NOVO — dropdown padronizado (categoria/cartão)
    │   │   ├── Badge.tsx                       # NOVO — status/contagem (tones)
    │   │   ├── Spinner.tsx                     # NOVO — loading tokenizado
    │   │   └── ThemeToggle.tsx                 # NOVO — alterna claro/escuro (FR-009)
    │   ├── layout/
    │   │   ├── AppLayout.tsx                   # MODIFICADO — tokens + glass; aprimora drawer mobile (FR-014); monta ThemeToggle
    │   │   ├── Sidebar.tsx                     # MODIFICADO — tokens (remove teal-800 hard-coded); glass
    │   │   ├── NavigationItem.tsx              # MODIFICADO — estado ativo via tokens
    │   │   └── SkeletonPlaceholder.tsx         # MODIFICADO — usa Spinner/tokens
    │   ├── auth/ bills/ budget/ category/      # MODIFICADOS — compõem primitivos; cor→tokens; glass em cards/modais; método/status/mês→Pill; categoria/cartão→Select; *FormModal→Modal
    │   ├── credit-cards/ dashboard/            # idem
    │   ├── shared/MoneyInput.tsx               # MODIFICADO — recompõe Input/FormField (mantém centavos)
    │   └── Toast.tsx                           # MODIFICADO — tokens
    ├── pages/                                  # MODIFICADAS — as 11 telas compõem primitivos/tokens (sem mudança de lógica)
    └── main.tsx                                # MODIFICADO — envolve a app com <ThemeProvider>

frontend/src/**/*.test.tsx
├── components/ui/*.test.tsx                    # NOVO — um por primitivo (variantes/estados/contrato de props)
├── theme/ThemeProvider.test.tsx               # NOVO — default/persistência/escolha manual
└── (testes de migração)                        # NOVO — pill/Select mantêm handler; Modal abre/fecha; drawer mobile
```

**Structure Decision**: Web monorepo existente — alterações confinadas a
`frontend/`. A feature introduz `src/theme/`, `src/lib/cn.ts` e a biblioteca
`src/components/ui/` (com **barrel**) como fundação reutilizável, e modifica a
configuração + o shell + os componentes/páginas para **compor** esses primitivos
em vez de estilizar avulso. **Nenhuma** alteração em `backend/`, contratos ou
banco — coerente com o gate API-First N/A.

## Complexity Tracking

> Sem violações de constituição a justificar — tabela intencionalmente vazia.
> O conjunto ampliado de primitivos **não** é violação de Simplicity: cada um
> remove duplicação já presente nas telas (abstração justificada por necessidade
> atual), e nenhuma dependência nova é introduzida.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| — | — | — |
