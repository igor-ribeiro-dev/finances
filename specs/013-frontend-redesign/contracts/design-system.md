# UI Contract — Design System (Frontend Redesign)

**Feature**: 013-frontend-redesign | **Date**: 2026-06-17
**Revisão**: reforço de reutilização/identidade (ver plan.md §Reusability).

> Por ser uma feature **frontend-only**, não há contrato de API (OpenAPI). O
> contrato relevante (Princípio I, adaptado a UI) é a **interface dos tokens e
> dos primitivos** que as 11 telas consomem. Este documento é o **gate de
> revisão de contrato** a ser aprovado antes da migração das telas (Phase 2).

---

## 1. Contrato de Tokens (CSS custom properties)

Definidos em `:root` (claro) e `.dark` (escuro) em `index.css`. Consumidos via
Tailwind como `rgb(var(--token) / <alpha-value>)`. **Telas e primitivos não usam
hex/cores literais** — apenas estes nomes (SC-008).

| Token | Obrigatório nos 2 temas | Garantia |
|------|:---:|---------|
| `--bg`, `--surface`, `--surface-glass`, `--border` | sim | superfícies |
| `--fg`, `--fg-muted` | sim | texto — contraste AA sobre seu fundo |
| `--primary`, `--primary-hover`, `--primary-fg` | sim | ação — `--primary-fg` sobre `--primary` ≥ 4.5:1 |
| `--accent`, `--danger`, `--success` | sim | estados semânticos |
| `--glass-blur` | sim | valor do blur do glass |

**Invariantes**:
- Trocar a classe `.dark` no `<html>` reverte **todos** os tokens (sem
  utilitário `dark:` por componente).
- Todo par texto/fundo expresso por tokens satisfaz WCAG AA nos dois temas
  (FR-005/SC-003) — verificado na task de QA de contraste.
- **Repintar a marca = trocar tokens**; nenhum componente é editado.

---

## 2. Contrato dos Primitivos (props públicas)

Todos em `src/components/ui/`, exportados pelo **barrel** `index.ts`
(`import { Button, Pill, Modal } from '@/components/ui'`). Convenções comuns:
aceitam `className` (composição), repassam props nativas via `...rest`, usam
`forwardRef` quando envolvem um elemento focável, e expressam variação por
`variant`/`size`/`tone` — **nunca** por componente clonado.

### `<Button>`
```ts
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'ghost' | 'danger'; // default 'primary'
  size?: 'sm' | 'md';                         // default 'md'
  loading?: boolean;                          // mostra Spinner e desabilita
}
```
**Garantias**: cores via tokens; `primary` usa `--primary`/`--primary-fg` + hover
`--primary-hover`; foco visível.

### `<IconButton>`
```ts
interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;                  // aria-label obrigatório (a11y)
  variant?: 'ghost' | 'primary' | 'danger';
}
```
**Garantias**: alvo de toque ≥ 40px; `aria-label` exigido por tipo.

### `<Pill>`
```ts
interface PillProps {
  children: React.ReactNode;
  selected?: boolean;        // ativo: bg-primary / text-primary-fg
  disabled?: boolean;
  icon?: React.ReactNode;
  onClick?: () => void;      // reusa o handler do select atual
}
```
**Garantias**: arredondado (full radius); 3 estados distintos; trunca texto longo
(ellipsis); em grupo, `flex-wrap`/scroll p/ não transbordar em 320px. Single/
multi-seleção controladas pelo container (estado externo). `aria-pressed`
refletido de `selected`.

### `<Card>`
```ts
interface CardProps extends React.HTMLAttributes<HTMLElement> {
  as?: keyof JSX.IntrinsicElements; // default 'div'
  interactive?: boolean;            // hover/elevação ≤300ms
}
```
**Garantias**: superfície **sólida** `--surface` + borda `--border` + shadow
`card`. Usado quando não há necessidade de glass (listas, painéis densos).

### `<GlassCard>`
```ts
interface GlassCardProps extends React.HTMLAttributes<HTMLElement> {
  as?: keyof JSX.IntrinsicElements; // default 'div'
  interactive?: boolean;
}
```
**Garantias**: fundo `--surface-glass` translúcido + `--glass-blur` + borda
`--border` + shadow `overlay`; **fallback sólido** (`--surface`) via
`@supports not (backdrop-filter)` (FR-006); legível nos dois temas.

### `<Modal>`
```ts
interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  footer?: React.ReactNode;      // ações (ex.: Button primary/ghost)
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
}
```
**Garantias**: base **única** de todos os diálogos (`*FormModal`, `PayBillModal`,
`Delete*Modal`, `RegisterFaturaModal`); compõe `GlassCard` + `IconButton` de
fechar; **foco-trap**, fecha em ESC e clique no overlay; `role="dialog"` +
`aria-modal`; trava scroll do body. PT-BR no botão/label de fechar.

### `<Input>` / `<FormField>`
```ts
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean;             // estado de erro via tokens
}
interface FormFieldProps {
  label: string;
  htmlFor: string;
  error?: string;                // mensagem de erro (define aria-describedby)
  children: React.ReactNode;     // Input/Select/MoneyInput
}
```
**Garantias**: `FormField` padroniza rótulo+campo+erro; associa `label` e
`aria-describedby`; estados de erro/disabled via tokens. `MoneyInput` é
**recomposto** sobre `Input`/`FormField` (mantém formatação de centavos).

### `<Select>`
```ts
interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  invalid?: boolean;
}
```
**Garantias**: `<select>` nativo (acessível) estilizado por tokens, com chevron
(lucide). É o **dropdown padrão** para listas longas/variáveis — **categoria e
cartão** usam este primitivo (FR-002/SC-002), não pills.

### `<Badge>` / `<Tag>`
```ts
interface BadgeProps {
  children: React.ReactNode;
  tone?: 'neutral' | 'primary' | 'danger' | 'success'; // default 'neutral'
}
```
**Garantias**: rótulos de status/contagem; cores por `tone` via tokens.

### `<Spinner>`
```ts
interface SpinnerProps { size?: 'sm' | 'md'; label?: string; }
```
**Garantias**: indicador de carregamento tokenizado; `SkeletonPlaceholder` e
`Button loading` reutilizam.

### `useTheme()` / `<ThemeProvider>` / `<ThemeToggle>`
```ts
type Theme = 'light' | 'dark';
interface ThemeContextValue { theme: Theme; setTheme: (t: Theme) => void; toggle: () => void; }
function useTheme(): ThemeContextValue;
interface ThemeToggleProps { className?: string; }
```
**Garantias**: resolução inicial = localStorage → `prefers-color-scheme` →
`dark` (FR-010); aplica `.dark` no `<html>`; persiste só em escolha manual
(FR-013); `ThemeToggle` com `aria-label` PT-BR e ícone sol/lua; degrada se
localStorage indisponível.

---

## 3. Regras de consumo (telas) — padronização de identidade

1. **Proibido** cor/raio/sombra literal fora dos tokens (SC-008).
2. **Proibido** recriar inline um padrão que já existe como primitivo (botão,
   pill, card, modal, campo, dropdown, badge). Telas **compõem** primitivos.
3. Diferença visual = `variant`/`size`/`tone`; **nunca** clonar um componente.
4. **Pills** apenas para: filtros/tags, método de pagamento, status, seletor de
   mês. **Categoria e cartão** usam `<Select>` (FR-002/SC-002).
5. **GlassCard** em cards de resumo, modais (via `Modal`) e chrome de nav — não
   em listas longas (performance, SC-006); listas densas usam `Card`.
6. Comportamento de negócio **inalterado**: trocar `<select>` por `<Pill>` ou
   pelo `<Select>` padronizado dispara o mesmo callback/estado (FR-008/SC-005).
7. Import via barrel `@/components/ui`; PT-BR em toda string de UI nova.

---

## 4. Critérios de aceite do contrato (revisão antes da Phase 2)

- [ ] Todos os tokens da seção 1 existem nos dois temas em `index.css`.
- [ ] `tailwind.config.js` com `darkMode:'class'` e cores mapeadas aos tokens;
      escala `primary` (teal) morta removida.
- [ ] Cada primitivo da seção 2 existe em `src/components/ui/` e é exportado pelo
      barrel; props batem com este contrato.
- [ ] Nenhuma tela recria padrão inline; tudo composto dos primitivos.
- [ ] Variação só por `variant`/`size`/`tone` (sem clones).
- [ ] Plano de migração não introduz cor literal nova (SC-008).
- [ ] Categoria/cartão confirmados via `Select`; método/status/mês via `Pill`.
- [ ] `MoneyInput` e `*FormModal` recompostos sobre `Input`/`FormField`/`Modal`.
