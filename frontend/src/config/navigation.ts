import { LayoutDashboard, Receipt, Tag, PiggyBank, CalendarClock, CreditCard } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export type NavItemStatus = 'active' | 'coming-soon';

export interface NavItem {
  id: string;
  label: string;
  path: string;
  icon: LucideIcon;
  status: NavItemStatus;
}

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
