import { LayoutDashboard, Tag, PiggyBank, CalendarClock, Repeat, CreditCard } from 'lucide-react';
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
    id: 'categorias',
    label: 'Categorias',
    path: '/categorias',
    icon: Tag,
    status: 'active',
  },
  {
    id: 'orcamentos',
    label: 'Orçamentos',
    path: '/orcamentos',
    icon: PiggyBank,
    status: 'active',
  },
  {
    id: 'pagamentos',
    label: 'Pagamentos',
    path: '/pagamentos',
    icon: CalendarClock,
    status: 'active',
  },
  {
    id: 'contas-fixas',
    label: 'Contas Fixas',
    path: '/contas-fixas',
    icon: Repeat,
    status: 'active',
  },
  {
    id: 'cartoes',
    label: 'Cartões de Crédito',
    path: '/cartoes',
    icon: CreditCard,
    status: 'active',
  },
];
