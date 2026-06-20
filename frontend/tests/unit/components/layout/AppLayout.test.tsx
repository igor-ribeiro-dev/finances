import '@testing-library/jest-dom';
import { TextEncoder, TextDecoder } from 'util';
Object.assign(global, { TextEncoder, TextDecoder });

import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AppLayout } from '../../../../src/components/layout/AppLayout';
import { SkeletonPlaceholder } from '../../../../src/components/layout/SkeletonPlaceholder';
import { ThemeProvider } from '../../../../src/theme/ThemeProvider';

jest.mock('../../../../src/components/layout/Sidebar', () => ({
  Sidebar: ({ onClose }: { onClose?: () => void }) => (
    <aside data-testid="sidebar" onClick={onClose}>
      Mock Sidebar
    </aside>
  ),
}));

function renderLayout(children: React.ReactNode = <div>Content</div>) {
  return render(
    <ThemeProvider>
      <MemoryRouter>
        <AppLayout>{children}</AppLayout>
      </MemoryRouter>
    </ThemeProvider>,
  );
}

describe('AppLayout', () => {
  it('renders the Sidebar', () => {
    renderLayout();
    expect(screen.getByRole('complementary')).toBeInTheDocument();
  });

  it('renders children in the content area', () => {
    renderLayout(<div>Meu conteúdo</div>);
    expect(screen.getByText('Meu conteúdo')).toBeInTheDocument();
  });

  it('renders SkeletonPlaceholder as children', () => {
    renderLayout(<SkeletonPlaceholder rows={3} />);
    expect(document.querySelector('.animate-pulse')).toBeInTheDocument();
  });

  describe('mobile menu', () => {
    it('sidebar wrapper has hidden md:flex classes when menu is closed', () => {
      renderLayout();
      const sidebar = screen.getByTestId('sidebar');
      expect(sidebar.parentElement).toHaveClass('hidden');
      expect(sidebar.parentElement).toHaveClass('md:flex');
    });

    it('renders the hamburger button', () => {
      renderLayout();
      expect(screen.getByRole('button', { name: /abrir menu/i })).toBeInTheDocument();
    });

    it('sets isMobileMenuOpen to true when hamburger is clicked', () => {
      renderLayout();
      const sidebar = screen.getByTestId('sidebar');
      expect(sidebar.parentElement).toHaveClass('hidden');

      fireEvent.click(screen.getByRole('button', { name: /abrir menu/i }));

      expect(sidebar.parentElement).toHaveClass('flex');
      expect(sidebar.parentElement).toHaveClass('fixed');
    });

    it('sets isMobileMenuOpen to false when overlay backdrop is clicked', () => {
      renderLayout();
      fireEvent.click(screen.getByRole('button', { name: /abrir menu/i }));

      const backdrop = document.querySelector('[aria-hidden="true"]') as HTMLElement;
      expect(backdrop).toBeInTheDocument();

      fireEvent.click(backdrop);

      const sidebar = screen.getByTestId('sidebar');
      expect(sidebar.parentElement).toHaveClass('hidden');
    });
  });
});
