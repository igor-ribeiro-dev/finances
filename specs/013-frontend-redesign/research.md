# Phase 0 — Research: Frontend Redesign

**Feature**: 013-frontend-redesign | **Date**: 2026-06-17

Resolve as decisões técnicas do redesign. Nenhuma marca "NEEDS CLARIFICATION"
restou da spec (2 sessões de clarification resolveram escopo, temas, fundação,
pills, persistência, responsivo, reduced-motion e fonte). Este documento fixa as
escolhas de implementação que orientam o Phase 1.

---

## R1 — Estratégia de theming (claro + escuro com 1 fonte de verdade)

**Decision**: CSS custom properties **semânticas** definidas em `:root` (tema
claro) e `.dark` (tema escuro), expostas ao Tailwind via cores nomeadas no
formato `rgb(var(--token) / <alpha-value>)`. `darkMode: 'class'` no
`tailwind.config.js`; a classe `.dark` é aplicada no `<html>` pelo ThemeProvider.

**Rationale**:
- Uma única troca de classe no `<html>` reverte todos os tokens — sem duplicar
  utilitários `dark:` em ~41 arquivos (que hoje têm **zero** `dark:`).
- Tokens semânticos (`--surface`, `--text`, `--primary`) desacoplam intenção de
  valor: as telas usam `bg-surface`/`text-fg`, e o tema decide o RGB.
- Formato `rgb(var(--x) / <alpha>)` preserva o suporte a opacidade do Tailwind
  (ex.: `bg-surface/80` para glass).

**Alternatives considered**:
- *Dois conjuntos de classes `dark:` por componente*: rejeitado — espalharia a
  decisão de cor e dobraria o esforço de QA de contraste (viola Simplicity).
- *Biblioteca de tema (ex.: next-themes, MUI theming)*: rejeitado — dependência
  nova desnecessária; um ThemeProvider de ~40 linhas resolve.

---

## R2 — Paleta roxo/violeta (valores concretos + contraste)

**Decision**: Marca baseada em **violeta** (escala tipo Tailwind `violet`) como
primária, com tokens semânticos derivados por tema. Valores-âncora:

Escala de marca (referência):

| Passo | Hex |
|------|------|
| 50 | `#f5f3ff` |
| 100 | `#ede9fe` |
| 200 | `#ddd6fe` |
| 300 | `#c4b5fd` |
| 400 | `#a78bfa` |
| 500 | `#8b5cf6` |
| 600 | `#7c3aed` |
| 700 | `#6d28d9` |
| 800 | `#5b21b6` |
| 900 | `#4c1d95` |
| 950 | `#2e1065` |

Tokens semânticos por tema (texto sobre o token verificado p/ WCAG AA):

| Token | Claro | Escuro |
|------|-------|--------|
| `--bg` (fundo app) | `#f5f3ff` (lavanda 50) | `#1a1430` (violeta-quase-preto) |
| `--surface` (cards) | `#ffffff` | `#241b3d` |
| `--surface-glass` | `#ffffff` @ ~65% | `#2a2150` @ ~55% |
| `--border` | `#e5e0f5` | `#3a2f5c` |
| `--fg` (texto) | `#1e1b2e` | `#f2effb` |
| `--fg-muted` | `#574f6b` | `#b3a9cf` |
| `--primary` (ação) | `#7c3aed` (600) | `#8b5cf6` (500) |
| `--primary-hover` | `#6d28d9` (700) | `#a78bfa` (400) |
| `--primary-fg` (texto sobre primary) | `#ffffff` | `#1a1430` |

**Rationale / contraste (FR-005, SC-003)**:
- Texto branco sobre `--primary` claro `#7c3aed` ≈ **4.6:1** → passa AA corpo.
- No escuro, ações usam `--primary` mais claro (`#8b5cf6`/500) com `--primary-fg`
  escuro (`#1a1430`) → alto contraste; texto de corpo `#f2effb` sobre `--bg`
  `#1a1430` ≈ **15:1**.
- `--fg-muted` calibrado para ≥ 4.5:1 sobre o respectivo `--bg`/`--surface`.
- Os ratios exatos serão confirmados na task de QA de contraste (axe/manual)
  antes do merge; os valores acima são o ponto de partida que satisfaz AA.

**Alternatives considered**:
- *Roxo mais quente (fuchsia/purple-700)*: mantido apenas como **accent**
  opcional para destaques; primária fica no violeta por melhor neutralidade e
  contraste consistente nos dois temas.

---

## R3 — Efeito liquid glass + fallback

**Decision**: Utilitário `.glass` (e `GlassCard`) combinando
`background: rgb(var(--surface-glass) / <alpha>)`,
`backdrop-filter: blur(16px) saturate(120%)`, `border: 1px solid rgb(var(--border)/.6)`
e sombra `overlay`. Fallback via `@supports not (backdrop-filter: blur(1px))` →
fundo sólido `rgb(var(--surface))` (sem transparência), preservando legibilidade.

**Rationale**:
- `backdrop-filter` é composto na GPU; aplicado só a superfícies-chave (cards de
  resumo, modais/overlays, header da sidebar) para não custar em listas longas
  (SC-006). Os browsers-alvo (Chrome 115+, FF 120+, Safari 17+) suportam; o
  `@supports` cobre o resto (FR-006).
- Borda sutil + sombra difusa dão a leitura "vidro" exigida pelos cenários da
  User Story 3.

**Alternatives considered**:
- *Imagem/gradiente de fundo atrás do glass*: adotado de forma leve — `--bg`
  recebe um gradiente sutil para o glass ter o que "borrar"; sem imagens
  pesadas (custo/performance).
- *Glass em todas as superfícies*: rejeitado — poluição visual e custo de blur;
  restrito a cards de resumo, modais e chrome (FR-003/SC-004).

---

## R4 — Persistência e bootstrap de tema (anti-flash)

**Decision**: `ThemeProvider` resolve a ordem: (1) `localStorage['finances.theme']`
se existir; senão (2) `window.matchMedia('(prefers-color-scheme: dark|light)')`;
senão (3) **dark** (fallback). A escolha manual grava em `localStorage` e passa a
prevalecer. Um **script inline** no `index.html` aplica a classe `.dark` no
`<html>` **antes** do React montar, evitando flash de tema incorreto (FOUC).

**Rationale**:
- localStorage = frontend-only, sem backend (FR-013). Falha (modo privado) cai
  graciosamente no passo (2)/(3).
- Script inline é o padrão consolidado anti-flash em apps com tema; ~5 linhas.

**Alternatives considered**:
- *Persistir na conta (sincroniza dispositivos)*: rejeitado na clarification
  (Q1 sessão 2) — exigiria backend/migração, fora do escopo frontend-only.
- *Cookie SSR*: N/A — app é SPA (Vite), sem SSR.

---

## R5 — Componente Pill (escopo e estados)

**Decision**: `Pill` controlado, com props `selected`, `disabled`, `icon?`,
`onClick`. Grupos de pills para seleção **single** (método de pagamento, status)
e **multi** (filtros). Estado ativo = `bg-primary text-primary-fg`; inativo =
`bg-surface text-fg-muted border`. Aplica-se a: filtros/tags, **método de
pagamento**, **status** e **seletor de mês**. **Categoria e cartão permanecem
dropdown** (FR-002/SC-002).

**Rationale**:
- Baixa cardinalidade (poucas opções fixas) cabe em pills sem transbordo; listas
  longas/variáveis (categoria, cartão) ficariam poluídas e quebrariam em 320px.
- Reaproveita o mesmo callback/handler dos selects atuais → comportamento de
  negócio inalterado (FR-008); a troca é só de apresentação, testável por RTL.

**Alternatives considered**:
- *Tudo vira pill*: rejeitado na clarification (Q4 sessão 1).
- *Segmented control nativo*: o Pill cobre o caso com mais flexibilidade visual
  (ícones, multi-seleção) e consistência com filtros.

---

## R6 — Responsividade e navegação mobile

**Decision**: Manter/aprimorar o padrão já existente em `AppLayout` (hamburger +
drawer com overlay em `md:hidden`; sidebar fixa em `md+`). Garantir as 11 telas
fluídas de **320px** a desktop; pills quebram linha (`flex-wrap`) ou rolam
horizontalmente; o drawer recebe o tratamento glass e fecha ao navegar/clicar no
overlay (FR-014/SC-009).

**Rationale**: A base responsiva já existe (AppLayout tem `isMobileMenuOpen`); o
trabalho é estilizar com tokens/glass e validar cada tela nos breakpoints — não
reescrever a navegação.

**Alternatives considered**:
- *Bottom navigation no mobile*: rejeitado — drawer existente já cobre todas as
  seções; mudar o paradigma de nav ampliaria escopo sem ganho claro.

---

## R7 — Configuração do Tailwind e remoção de dívida de cor

**Decision**: `darkMode:'class'`; `theme.extend.colors` passa a expor tokens
semânticos (`bg`, `surface`, `glass`, `border`, `fg`, `fg-muted`, `primary`,
`primary-hover`, `primary-fg`, `accent`, `danger`, `success`) via
`rgb(var(--token) / <alpha-value>)`. A escala `primary` (teal) **morta** é
removida. As ~41 ocorrências hard-coded (`teal/blue/indigo`, `bg-white`,
`text-gray-900`, etc.) migram para os tokens.

**Rationale**: Centraliza a decisão de cor (SC-008), elimina o teal inconsistente
e o token morto, e habilita os dois temas sem `dark:` espalhado.

**Alternatives considered**:
- *Manter classes utilitárias e só repintar*: rejeitado — não suportaria dois
  temas nem garantiria SC-008 (zero hard-coded).

---

## R8 — Estratégia de testes (TDD, frontend-only)

**Decision**: RTL + Jest. Tests **vermelhos primeiro** para: primitivos (`Pill`
estados/seleção; `GlassCard` render + fallback; `Button` variantes;
`ThemeToggle`), `ThemeProvider` (default por `prefers-color-scheme` mockando
`matchMedia`; fallback dark; persistência em `localStorage`; escolha manual
prevalece) e migrações sensíveis (seletor método-como-pill dispara o mesmo
handler; drawer mobile abre/fecha). QA de contraste (axe/manual) como gate antes
do merge.

**Rationale**: Princípio II (NON-NEGOTIABLE). Foco em comportamento preservado
(o redesign não pode quebrar fluxo — FR-008/SC-005) e na nova lógica de tema.

**Alternatives considered**:
- *Snapshot tests de estilo*: usados com parcimônia (frágeis); preferir asserts
  de comportamento e presença de classes-token.

---

## R9 — Reutilização e padronização de identidade

**Decision**: Construir uma biblioteca de primitivos em `src/components/ui/` com
**um componente por padrão visual recorrente** (Button, IconButton, Pill, Card,
GlassCard, Modal, Input, FormField, Select, Badge, Spinner), exportada por um
**barrel** `index.ts`, com variação só por `variant`/`size`/`tone` e consumo
exclusivo de tokens. As telas **compõem** primitivos; padrões existentes
duplicados (`*FormModal`, botões, campos, `MoneyInput`) são **recompostos** sobre
eles. Sem Storybook/CVA (sem dep nova); um helper `cn()` de ~5 linhas compõe as
classes condicionais.

**Rationale**:
- Padroniza a identidade **por construção**: um recurso futuro herda a marca ao
  importar primitivos; repintar = trocar tokens (atende o pedido de "padronizar
  a identidade").
- Remove duplicação **já presente** (botões teal/blue/indigo, modais e campos
  repetidos) — abstração justificada por necessidade atual, não especulativa
  (Princípio IV preservado).
- Barrel + props consistentes reduzem atrito de uso e divergência de estilo.

**Alternatives considered**:
- *Storybook*: ótimo para catálogo, mas adiciona dependência e tooling — adiado;
  exemplos vivem em testes RTL + quickstart.
- *class-variance-authority (CVA)/tailwind-variants*: conveniente para variantes,
  mas é dep nova; `cn()` próprio cobre o caso sem custo.
- *Manter componentes por tela e só repintar*: rejeitado — não padronizaria a
  identidade nem removeria a duplicação (contraria o objetivo da revisão).
