# Frontend — Design System

## Design Tokens

Semantic color tokens are defined as CSS custom properties in `src/index.css` and exposed to Tailwind via `tailwind.config.js`.

### Light / Dark

The `:root` block defines light-theme values; `.dark` (applied to `<html>`) overrides them for dark mode. Toggle is managed by `ThemeProvider` with persistence via `localStorage['finances.theme']`.

### Token Reference

| Token | Tailwind class | Usage |
|---|---|---|
| `--bg` | `bg-bg` | Page background |
| `--surface` | `bg-surface` | Card / panel background |
| `--surface-glass` | `bg-glass` | Glass card backdrop (via `.glass` utility) |
| `--border` | `border-border` | Dividers, input borders |
| `--fg` | `text-fg` | Primary text |
| `--fg-muted` | `text-fg-muted` | Secondary labels, hints |
| `--primary` | `bg-primary`, `text-primary` | Violet action color |
| `--primary-hover` | `bg-primary-hover` | Primary button hover |
| `--primary-fg` | `text-primary-fg` | Text on primary background |
| `--accent` | `bg-accent`, `text-accent` | Amber accent |
| `--danger` | `bg-danger`, `text-danger` | Errors, destructive actions |
| `--success` | `bg-success`, `text-success` | Success states, paid status |

### Typography

| Class | Description |
|---|---|
| `.text-money` | Large bold monetary value with primary color (light) / fg color (dark) |

## Primitives (UI Components)

All primitives are exported from `@/components/ui`. Import from the barrel:

```ts
import { Button, Card, GlassCard, Modal, Pill, Input, FormField, Select, Badge, Spinner, ThemeToggle, IconButton } from '@/components/ui';
```

### Component Summary

| Component | Props | Notes |
|---|---|---|
| `Button` | `variant`, `size`, `loading`, `fullWidth` | Variants: primary / secondary / ghost / danger |
| `IconButton` | `aria-label` (required), `variant` | Requires accessible label |
| `Card` | `interactive` | Plain surface card |
| `GlassCard` | `interactive`, `className` | Liquid glass with blur/saturate; solid fallback |
| `Pill` | `selected`, `disabled`, `onClick` | Toggle chip; emits `aria-pressed` |
| `Input` | extends `<input>` | `invalid` state → danger border |
| `FormField` | `label`, `htmlFor`, `error` | Wraps Input with label + aria error |
| `Select` | extends `<select>` | Custom SVG chevron |
| `Badge` | `tone` | Tones: default / success / danger / warning / primary |
| `Spinner` | `size` | SVG spinner; `aria-hidden="true"` |
| `ThemeToggle` | — | Sun/Moon toggle; reads from `useTheme` |
| `Modal` | `open`, `onClose`, `title`, `footer?`, `size?` | GlassCard overlay; ESC + backdrop close |

## Theme System

```
src/theme/
  ThemeProvider.tsx   — Context + resolution (localStorage → prefers-color-scheme → dark)
  useTheme.ts         — Hook: { theme, toggleTheme }
```

Wrap the app in `<ThemeProvider>` (already done in `main.tsx`). Access theme via `useTheme()`.

### Anti-flash

An inline script in `index.html` applies `.dark` before React hydrates, preventing a flash of the wrong theme.

## Path Alias

`@/` maps to `src/`. Configured in `tsconfig.json`, `vite.config.ts`, and `jest.config.ts`.

## Tests

Unit tests live in `tests/unit/`. Run with:

```sh
npm test
```
