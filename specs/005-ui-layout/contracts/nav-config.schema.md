# UI Contract: Navigation Configuration Schema

**Feature**: `005-ui-layout` | **Date**: 2026-05-17

> Este contrato define o schema do arquivo de configuração de navegação.
> É o único arquivo que deve ser modificado para adicionar, remover ou alterar
> itens do menu lateral (satisfaz SC-004).

---

## Arquivo

**Caminho**: `frontend/src/config/navigation.ts`

---

## Schema TypeScript

```typescript
import type { LucideIcon } from 'lucide-react';

/**
 * Status de um item de navegação no menu lateral.
 * - 'active':      Item clicável; navega para `path` ao clicar.
 * - 'coming-soon': Item não clicável; exibe badge "Em breve".
 */
export type NavItemStatus = 'active' | 'coming-soon';

/**
 * Definição de um item de navegação do menu lateral.
 * Todos os campos são obrigatórios.
 */
export interface NavItem {
  /** Identificador único em kebab-case. Nunca alterar após criação (usado como key React). */
  id: string;

  /** Rótulo exibido no menu. Sempre em Português do Brasil. */
  label: string;

  /** Rota React Router. Deve começar com '/'. Ignorado quando status === 'coming-soon'. */
  path: string;

  /** Componente de ícone do Lucide React importado individualmente. */
  icon: LucideIcon;

  /** Define se o item é navegável ('active') ou apenas exibido ('coming-soon'). */
  status: NavItemStatus;
}
```

---

## Exemplo de Configuração

```typescript
import {
  LayoutDashboard,
  Receipt,
  Tag,
  PiggyBank,
  CalendarClock,
  CreditCard,
} from 'lucide-react';

export const NAV_ITEMS: NavItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    path: '/',
    icon: LayoutDashboard,
    status: 'active',
  },
  {
    id: 'despesas',
    label: 'Despesas',
    path: '/despesas',
    icon: Receipt,
    status: 'coming-soon',
  },
  {
    id: 'categorias',
    label: 'Categorias',
    path: '/categorias',
    icon: Tag,
    status: 'coming-soon',
  },
  {
    id: 'orcamentos',
    label: 'Orçamentos',
    path: '/orcamentos',
    icon: PiggyBank,
    status: 'coming-soon',
  },
  {
    id: 'pagamentos',
    label: 'Pagamentos Mensais',
    path: '/pagamentos',
    icon: CalendarClock,
    status: 'coming-soon',
  },
  {
    id: 'cartoes',
    label: 'Cartões de Crédito',
    path: '/cartoes',
    icon: CreditCard,
    status: 'coming-soon',
  },
];
```

---

## Regras de Validação

| Campo | Regra |
|-------|-------|
| `id` | Único; kebab-case; não alterar após criação |
| `label` | Não vazio; Português do Brasil |
| `path` | Começa com `/`; deve ser uma rota válida no `AppRouter` quando `status === 'active'` |
| `icon` | Componente Lucide importado diretamente (não uma string) |
| `status` | Deve ser `'active'` ou `'coming-soon'` |

---

## Como Ativar uma Nova Seção

Para ativar a seção "Despesas" (por exemplo, quando a feature 006 for implementada):

```diff
 {
   id: 'despesas',
   label: 'Despesas',
   path: '/despesas',
   icon: Receipt,
-  status: 'coming-soon',
+  status: 'active',
 },
```

Nenhum outro arquivo precisa ser modificado.

---

## Contrato de Comportamento do Componente

O componente `<NavigationItem>` deve:

1. Se `status === 'active'` e `isActive === true`:
   - Fundo: `bg-teal-50`
   - Texto: `text-teal-700 font-medium`
   - Indicador lateral esquerdo: borda 4px sólida `border-teal-600`
   - Cursor: `cursor-pointer`

2. Se `status === 'active'` e `isActive === false`:
   - Fundo: transparente (hover: `bg-gray-100`)
   - Texto: `text-gray-700`
   - Cursor: `cursor-pointer`

3. Se `status === 'coming-soon'`:
   - Fundo: transparente (sem hover)
   - Texto: `text-gray-400`
   - Badge: `<span>Em breve</span>` alinhado à direita, `text-xs bg-gray-100 text-gray-400 rounded-full px-2 py-0.5`
   - Cursor: `cursor-not-allowed`
   - Sem handler de clique (nem `onClick` nem `<Link>`)
