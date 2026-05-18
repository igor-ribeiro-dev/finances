# Data Model: Layout Visual e Sistema de Design do Frontend

**Branch**: `005-ui-layout` | **Date**: 2026-05-17

> Esta feature é puramente frontend. Não há novas tabelas de banco de dados.
> O "modelo de dados" aqui é o sistema de tokens de design e o schema de configuração de navegação.

---

## 1. Design Tokens (tailwind.config.js)

Todos os tokens são definidos em `tailwind.config.js` como extensões do tema Tailwind. Nenhum valor é hard-coded em componentes.

### 1.1 Paleta de Cores

| Token | Família | Descrição |
|-------|---------|-----------|
| `primary` | Teal | Cor primária — ações, destaques, links |
| `primary-*` | Teal 50–950 | Escala completa para hover, focus, disabled |
| `background` | Branco / Gray-50 | Fundo geral das telas autenticadas |
| `surface` | White | Fundo de cards e painéis |
| `border` | Gray-200 | Bordas de cards e separadores |
| `text-primary` | Gray-900 | Texto principal |
| `text-secondary` | Gray-500 | Texto secundário / metadados |
| `text-disabled` | Gray-300 | Texto desabilitado / "em breve" |
| `success` | Green-600 | Estado de sucesso (badges, toasts) |
| `warning` | Amber-500 | Estado de alerta |
| `error` | Red-600 | Estado de erro |

**Cor primária teal — referência de tonalidade**:
- Base: `teal-600` (#0d9488) — satisfaz WCAG 2.1 AA contra branco (contraste ≈ 4.6:1)
- Hover: `teal-700` (#0f766e)
- Active/Selected: `teal-800` (#115e59)
- Light bg: `teal-50` (#f0fdfa) — fundo de item ativo no menu

### 1.2 Tipografia

| Token | Valor | Uso |
|-------|-------|-----|
| `fontFamily.sans` | `['Inter', 'ui-sans-serif', 'system-ui']` | Fonte padrão de todo o app |
| `fontSize.xs` | 12px / 1.5 | Metadados, badges "Em breve" |
| `fontSize.sm` | 14px / 1.25 | Texto secundário, labels de nav |
| `fontSize.base` | 16px / 1.5 | Corpo de texto padrão |
| `fontSize.lg` | 18px / 1.75 | Subtítulos |
| `fontSize.xl` | 20px / 1.5 | Títulos de seção |
| `fontSize.2xl` | 24px / 1.33 | Títulos de página |

### 1.3 Border Radius

| Token | Valor | Uso |
|-------|-------|-----|
| `borderRadius.DEFAULT` | 8px | Cards, inputs |
| `borderRadius.md` | 10px | Botões primários |
| `borderRadius.lg` | 12px | Cards maiores, modais |
| `borderRadius.full` | 9999px | Badges, avatares |

### 1.4 Sistema de Elevação (Sombras)

| Token | Valor CSS | Uso |
|-------|-----------|-----|
| `boxShadow.card` | `0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.06)` | Nível 1 — cards comuns |
| `boxShadow.overlay` | `0 10px 25px rgba(0,0,0,0.12), 0 4px 10px rgba(0,0,0,0.08)` | Nível 2 — modais, dropdowns |

### 1.5 Layout / Espaçamento

| Token | Valor | Uso |
|-------|-------|-----|
| `width.sidebar` | 256px | Largura da sidebar em desktop |
| `spacing.sidebar-item` | 12px 16px | Padding interno de item de nav |

---

## 2. Navigation Config Schema

**Arquivo**: `frontend/src/config/navigation.ts`

### 2.1 Tipos TypeScript

```typescript
import type { LucideIcon } from 'lucide-react';

export type NavItemStatus = 'active' | 'coming-soon';

export interface NavItem {
  id: string;           // Identificador único (kebab-case)
  label: string;        // Rótulo exibido no menu (PT-BR)
  path: string;         // Rota React Router (ex: '/despesas')
  icon: LucideIcon;     // Componente de ícone do Lucide React
  status: NavItemStatus; // 'active' = clicável; 'coming-soon' = desabilitado
}
```

### 2.2 Valores Iniciais

| id | label | path | status |
|----|-------|------|--------|
| `dashboard` | Dashboard | `/` | `active` |
| `despesas` | Despesas | `/despesas` | `coming-soon` |
| `categorias` | Categorias | `/categorias` | `coming-soon` |
| `orcamentos` | Orçamentos | `/orcamentos` | `coming-soon` |
| `pagamentos` | Pagamentos Mensais | `/pagamentos` | `coming-soon` |
| `cartoes` | Cartões de Crédito | `/cartoes` | `coming-soon` |

> Para ativar uma seção: alterar `status: 'coming-soon'` para `status: 'active'` no item correspondente.
> Este é o único arquivo que precisa ser modificado (satisfaz SC-004).

---

## 3. Entidades de UI (Componentes com Estado)

### 3.1 AppLayout

**Responsabilidade**: Container raiz de todas as telas autenticadas.

| Prop | Tipo | Descrição |
|------|------|-----------|
| `children` | `ReactNode` | Conteúdo da seção ativa |

**Estado interno**:
- `isMobileMenuOpen: boolean` — controla visibilidade do sidebar em mobile

**Comportamento**:
- Em `>= 768px`: sidebar fixa, conteúdo ao lado
- Em `< 768px`: sidebar oculta, drawer deslizante com overlay

### 3.2 Sidebar

**Responsabilidade**: Menu lateral com navegação, grupo familiar e acesso ao perfil.

| Prop | Tipo | Descrição |
|------|------|-----------|
| `onClose` | `() => void` | Callback para fechar em mobile |

**Dados consumidos** (via `AuthContext` — feature 004):
- `user.name: string` — nome do usuário logado
- `user.familyGroupName: string` — nome do grupo familiar (truncado se > 20 chars)

### 3.3 NavigationItem

**Responsabilidade**: Item individual do menu lateral.

| Prop | Tipo | Descrição |
|------|------|-----------|
| `item` | `NavItem` | Configuração do item |
| `isActive` | `boolean` | Se é a seção atual |

**Estados visuais**:
- `default`: texto `text-primary`, fundo transparente
- `active`: fundo `teal-50`, texto `teal-700`, borda esquerda `teal-600` (4px)
- `coming-soon`: texto `text-disabled`, cursor `not-allowed`, badge "Em breve"

### 3.4 SkeletonPlaceholder

**Responsabilidade**: Placeholder de loading para a área de conteúdo.

| Prop | Tipo | Descrição |
|------|------|-----------|
| `rows?` | `number` | Linhas de skeleton (padrão: 6) |

**Comportamento**: Exibido quando `isLoading: boolean` (passado pelo AppLayout durante `<Suspense>` ou lazy loading).
