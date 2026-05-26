import '@testing-library/jest-dom';
import { TextEncoder, TextDecoder } from 'util';
Object.assign(global, { TextEncoder, TextDecoder });

import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { LayoutDashboard } from 'lucide-react';
import { NavigationItem } from '../../../../src/components/layout/NavigationItem';
import type { NavItem } from '../../../../src/config/navigation';

const activeItem: NavItem = {
  id: 'dashboard',
  label: 'Dashboard',
  path: '/dashboard',
  icon: LayoutDashboard,
  status: 'active',
};

const comingSoonItem: NavItem = {
  id: 'despesas',
  label: 'Despesas',
  path: '/despesas',
  icon: LayoutDashboard,
  status: 'coming-soon',
};

function renderItem(item: NavItem, isActive: boolean) {
  return render(
    <MemoryRouter>
      <NavigationItem item={item} isActive={isActive} />
    </MemoryRouter>,
  );
}

describe('NavigationItem', () => {
  describe('renders the item label', () => {
    it('displays the label for an active item', () => {
      renderItem(activeItem, false);
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
    });

    it('displays the label for a coming-soon item', () => {
      renderItem(comingSoonItem, false);
      expect(screen.getByText('Despesas')).toBeInTheDocument();
    });
  });

  describe('active state (status=active, isActive=true)', () => {
    it('renders as a link pointing to the item path', () => {
      renderItem(activeItem, true);
      const link = screen.getByRole('link');
      expect(link).toBeInTheDocument();
      expect(link).toHaveAttribute('href', '/dashboard');
    });

    it('marks the link with aria-current="page"', () => {
      renderItem(activeItem, true);
      const link = screen.getByRole('link');
      expect(link).toHaveAttribute('aria-current', 'page');
    });

    it('applies active background and text classes', () => {
      renderItem(activeItem, true);
      const link = screen.getByRole('link');
      expect(link).toHaveClass('bg-teal-50');
      expect(link).toHaveClass('text-teal-700');
      expect(link).toHaveClass('font-medium');
    });

    it('applies active left-border indicator class', () => {
      renderItem(activeItem, true);
      const link = screen.getByRole('link');
      expect(link).toHaveClass('border-l-4');
      expect(link).toHaveClass('border-teal-600');
    });

    it('does not show the "Em breve" badge', () => {
      renderItem(activeItem, true);
      expect(screen.queryByText('Em breve')).not.toBeInTheDocument();
    });
  });

  describe('default state (status=active, isActive=false)', () => {
    it('renders as a link pointing to the item path', () => {
      renderItem(activeItem, false);
      const link = screen.getByRole('link');
      expect(link).toBeInTheDocument();
      expect(link).toHaveAttribute('href', '/dashboard');
    });

    it('does not have aria-current="page"', () => {
      renderItem(activeItem, false);
      const link = screen.getByRole('link');
      expect(link).not.toHaveAttribute('aria-current');
    });

    it('does not apply active background class', () => {
      renderItem(activeItem, false);
      const link = screen.getByRole('link');
      expect(link).not.toHaveClass('bg-teal-50');
      expect(link).not.toHaveClass('text-teal-700');
      expect(link).not.toHaveClass('font-medium');
    });

    it('does not apply the left-border indicator', () => {
      renderItem(activeItem, false);
      const link = screen.getByRole('link');
      expect(link).not.toHaveClass('border-l-4');
      expect(link).not.toHaveClass('border-teal-600');
    });

    it('does not show the "Em breve" badge', () => {
      renderItem(activeItem, false);
      expect(screen.queryByText('Em breve')).not.toBeInTheDocument();
    });
  });

  describe('coming-soon state (status=coming-soon)', () => {
    it('does NOT render as a link (no href)', () => {
      renderItem(comingSoonItem, false);
      expect(screen.queryByRole('link')).not.toBeInTheDocument();
    });

    it('has aria-disabled="true"', () => {
      renderItem(comingSoonItem, false);
      const container = screen.getByRole('listitem');
      expect(container.querySelector('[aria-disabled="true"]')).toBeInTheDocument();
    });

    it('shows the "Em breve" badge', () => {
      renderItem(comingSoonItem, false);
      const badge = screen.getByText('Em breve');
      expect(badge).toBeInTheDocument();
    });

    it('applies the correct badge classes', () => {
      renderItem(comingSoonItem, false);
      const badge = screen.getByText('Em breve');
      expect(badge).toHaveClass('text-xs');
      expect(badge).toHaveClass('bg-gray-100');
      expect(badge).toHaveClass('text-gray-400');
      expect(badge).toHaveClass('rounded-full');
      expect(badge).toHaveClass('px-2');
      expect(badge).toHaveClass('py-0.5');
    });

    it('applies muted text color to the item', () => {
      renderItem(comingSoonItem, false);
      const container = screen.getByRole('listitem');
      const inner = container.querySelector('[aria-disabled="true"]') as HTMLElement;
      expect(inner).toHaveClass('text-gray-400');
    });

    it('applies cursor-not-allowed', () => {
      renderItem(comingSoonItem, false);
      const container = screen.getByRole('listitem');
      const inner = container.querySelector('[aria-disabled="true"]') as HTMLElement;
      expect(inner).toHaveClass('cursor-not-allowed');
    });
  });
});
