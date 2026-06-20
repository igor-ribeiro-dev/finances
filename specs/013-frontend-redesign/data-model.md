# Phase 1 — Data Model: Frontend Redesign

**Feature**: 013-frontend-redesign | **Date**: 2026-06-17

> Esta é uma feature **frontend-only**: não há entidade de banco, tabela,
> migração ou contrato de API novos. O "modelo de dados" aqui é o **modelo de
> design** (tokens) e o **estado de tema client-side**. Nenhuma estrutura
> persiste no servidor.

---

## 1. Estado de Tema (client-side)

**ThemePreference** — valor único persistido no dispositivo.

| Campo | Tipo | Valores | Notas |
|------|------|---------|------|
| `theme` | enum string | `'light' \| 'dark'` | Tema efetivo aplicado |
| _persistência_ | `localStorage` | chave `finances.theme` | Só gravada após **escolha manual** |

**Resolução do tema inicial** (ordem):

1. `localStorage['finances.theme']` (se presente e válido) →
2. `prefers-color-scheme` do SO (`dark`/`light`) →
3. **`dark`** (fallback)

**Transições de estado**:

```text
[carregamento] --resolve--> theme (light|dark)
theme --usuário aciona ThemeToggle--> theme' (oposto)  [grava localStorage]
localStorage presente --prevalece sobre--> prefers-color-scheme
```

**Regras**:
- Escolha manual **sempre** prevalece sobre `prefers-color-scheme` (FR-010).
- Valor inválido/corrompido em localStorage → ignora e recai na ordem acima.
- Falha de acesso a localStorage (modo privado) → app funciona, sem persistir
  (degrada para resolução por `prefers-color-scheme`/fallback).
- A classe `.dark` no `<html>` é o efeito colateral único de aplicar o tema.

---

## 2. Modelo de Design Tokens

Tokens **semânticos** (intenção, não valor) definidos como CSS custom properties
em dois escopos: `:root` (claro) e `.dark` (escuro). Cada token resolve para um
RGB diferente por tema; os componentes referenciam só o nome semântico.

### 2.1 Tokens de cor (semânticos)

| Token | Papel | Consumido como (Tailwind) |
|------|------|---------------------------|
| `--bg` | Fundo da aplicação | `bg-bg` |
| `--surface` | Superfície de card/painel sólido | `bg-surface` |
| `--surface-glass` | Base translúcida do glass | `bg-glass/<alpha>` |
| `--border` | Bordas/divisores | `border-border` |
| `--fg` | Texto primário | `text-fg` |
| `--fg-muted` | Texto secundário/rótulos | `text-fg-muted` |
| `--primary` | Cor de ação (botões/pill ativo/links) | `bg-primary` / `text-primary` |
| `--primary-hover` | Hover/pressed da ação | `hover:bg-primary-hover` |
| `--primary-fg` | Texto/ícone sobre `--primary` | `text-primary-fg` |
| `--accent` | Destaque secundário (opcional) | `text-accent` |
| `--danger` | Estados de erro/exclusão | `bg-danger` / `text-danger` |
| `--success` | Estados positivos/confirmação | `text-success` |

Valores-âncora por tema: ver [research.md](research.md) R2 (verificados p/ WCAG
AA, FR-005/SC-003).

### 2.2 Tokens não-cromáticos (compartilhados entre temas)

| Token/Escala | Origem | Notas |
|------|--------|------|
| `borderRadius` (`DEFAULT/md/lg/xl/2xl`) | já no `tailwind.config.js` | mantidos |
| `boxShadow` (`card`, `overlay`) | já no config | mantidos; `overlay` usado no glass |
| Tipografia | `Inter` (`@fontsource/inter`) | **mantida** (sem troca de fonte) |
| Escala tipográfica/pesos | Tailwind padrão | hierarquia: valores em destaque grandes/bold; rótulos `text-fg-muted` (User Story 4) |
| Duração de animação | utilitário | ≤ **300ms** (FR-007/SC-006) |
| `--glass-blur` | nova custom property | `blur(16px) saturate(120%)`; fallback sólido via `@supports` |

---

## 3. Inventário de superfícies do redesign

Mapa do que cada token/primitivo afeta (escopo da migração big-bang, FR-012):

| Superfície | Token/Primitivo principal | Telas/Componentes |
|-----------|---------------------------|-------------------|
| Cards de resumo | `GlassCard` + `--surface-glass` | Dashboard (`FamilySummaryCard`, listas de resumo), Cartões, Pagamentos |
| Modais/overlays | `GlassCard` + `overlay` shadow | `*FormModal`, `PayBillModal`, `RegisterFaturaModal`, `Delete*Modal`, drawer mobile |
| Pills | `Pill` + `--primary` | filtros, **método de pagamento**, **status**, **seletor de mês** |
| Dropdowns (mantidos) | tokens (sem virar pill) | seletor de **categoria**, seletor de **cartão** |
| Botões | `Button` + `--primary` | todas as telas |
| Shell/nav | tokens + glass | `AppLayout`, `Sidebar`, `NavigationItem` (+ drawer responsivo) |
| Toggle de tema | `ThemeToggle` | montado no `AppLayout` (e/ou telas de auth) |

---

## 3.1 Biblioteca de primitivos (fonte única por padrão)

Cada padrão visual recorrente vira **um** primitivo reutilizável em
`src/components/ui/` (exportado por barrel). Variação por `variant`/`size`/`tone`,
nunca por clone. Props completas em [contracts/design-system.md](contracts/design-system.md).

| Primitivo | Substitui duplicação em | Variação |
|-----------|-------------------------|----------|
| `Button` / `IconButton` | botões teal/blue/indigo; botões só-ícone | variant/size/loading |
| `Pill` | filtros + método/status/mês | selected/disabled/icon |
| `Card` / `GlassCard` | superfícies sólidas / cards de resumo+modais | interactive; glass tem fallback |
| `Modal` | `*FormModal`, `PayBillModal`, `Delete*Modal`, `RegisterFaturaModal` | open/title/footer/size |
| `Input` / `FormField` / `Select` | inputs, rótulos+erro, dropdowns (categoria/cartão) | invalid/error |
| `Badge`/`Tag` | rótulos de status/contagem | tone |
| `Spinner` | `SkeletonPlaceholder` + spinners avulsos | size |

`MoneyInput` é recomposto sobre `Input`/`FormField` (mantém centavos). Regra de
identidade: **nenhuma tela recria um padrão inline** — todas compõem primitivos
(SC-008 estendido a marcação, não só cor).

## 4. Não-objetivos (data/back-end)

- **Nenhuma** entidade, tabela, coluna, índice ou migração.
- **Nenhum** endpoint novo ou alterado; nenhum contrato OpenAPI tocado.
- **Nenhum** dado sensível persistido (token de tema é não-sensível).
- Formatação monetária via `utils/money.ts` permanece inalterada (centavos).
