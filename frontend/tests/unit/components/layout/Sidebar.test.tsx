import '@testing-library/jest-dom';
import { TextEncoder, TextDecoder } from 'util';
Object.assign(global, { TextEncoder, TextDecoder });

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Sidebar } from '../../../../src/components/layout/Sidebar';
import { useAuth } from '../../../../src/contexts/AuthContext';
import { ThemeProvider } from '../../../../src/theme/ThemeProvider';

// Mock useAuth
jest.mock('../../../../src/contexts/AuthContext', () => ({
  useAuth: jest.fn(),
}));
const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

// Mock useNavigate from react-router-dom (keep real useLocation)
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
  useLocation: jest.fn(),
}));
import { useLocation } from 'react-router-dom';
const mockUseLocation = useLocation as jest.MockedFunction<typeof useLocation>;

function buildAuth(
  overrides: Partial<ReturnType<typeof useAuth>> = {},
): ReturnType<typeof useAuth> {
  return {
    user: { id: '1', name: 'Maria Silva', email: 'maria@example.com', familyGroupId: null },
    loading: false,
    login: jest.fn(),
    logout: jest.fn().mockResolvedValue(undefined),
    register: jest.fn(),
    setUser: jest.fn(),
    ...overrides,
  };
}

function renderSidebar(path = '/', onClose?: jest.Mock) {
  mockUseLocation.mockReturnValue({
    pathname: path,
    search: '',
    hash: '',
    state: null,
    key: 'default',
  });

  return render(
    <ThemeProvider>
      <MemoryRouter initialEntries={[path]}>
        <Sidebar onClose={onClose} />
      </MemoryRouter>
    </ThemeProvider>,
  );
}

beforeEach(() => {
  mockUseAuth.mockReturnValue(buildAuth());
  mockNavigate.mockReset();
});

describe('Sidebar', () => {
  describe('Navigation items', () => {
    it('renders all 5 navigation item labels (Despesas removed in US3)', () => {
      renderSidebar('/');

      expect(screen.getByText('Dashboard')).toBeInTheDocument();
      expect(screen.queryByText('Despesas')).not.toBeInTheDocument();
      expect(screen.getByText('Categorias')).toBeInTheDocument();
      expect(screen.getByText('Orçamentos')).toBeInTheDocument();
      expect(screen.getByText('Pagamentos')).toBeInTheDocument();
      expect(screen.getByText('Cartões de Crédito')).toBeInTheDocument();
    });

    it('marks the Dashboard link as active (aria-current="page") when path is "/"', () => {
      renderSidebar('/');

      const dashboardLink = screen.getByRole('link', { name: /dashboard/i });
      expect(dashboardLink).toHaveAttribute('aria-current', 'page');
    });

    it('does not mark Dashboard as active when on a different path', () => {
      renderSidebar('/pagamentos');

      const dashboardLink = screen.getByRole('link', { name: /dashboard/i });
      expect(dashboardLink).not.toHaveAttribute('aria-current');
    });
  });

  describe('Header', () => {
    it('shows "Grupo Familiar" label in the header', () => {
      renderSidebar('/');
      expect(screen.getByText('Grupo Familiar')).toBeInTheDocument();
    });

    it('shows "Finanças" placeholder text in the header', () => {
      renderSidebar('/');
      expect(screen.getByText('Finanças')).toBeInTheDocument();
    });
  });

  describe('Footer', () => {
    it('displays the authenticated user name', () => {
      renderSidebar('/');
      expect(screen.getByText('Maria Silva')).toBeInTheDocument();
    });

    it('renders a logout button', () => {
      renderSidebar('/');
      expect(screen.getByRole('button', { name: /sair/i })).toBeInTheDocument();
    });
  });

  describe('Logout', () => {
    it('calls logout and navigates to /login when the logout button is clicked', async () => {
      const mockLogout = jest.fn().mockResolvedValue(undefined);
      mockUseAuth.mockReturnValue(buildAuth({ logout: mockLogout }));

      renderSidebar('/');

      fireEvent.click(screen.getByRole('button', { name: /sair/i }));

      await waitFor(() => {
        expect(mockLogout).toHaveBeenCalledTimes(1);
        expect(mockNavigate).toHaveBeenCalledWith('/login', { replace: true });
      });
    });
  });

  describe('onClose prop', () => {
    it('calls onClose after clicking the logout button', async () => {
      const onClose = jest.fn();
      mockUseAuth.mockReturnValue(buildAuth({ logout: jest.fn().mockResolvedValue(undefined) }));

      renderSidebar('/', onClose);

      fireEvent.click(screen.getByRole('button', { name: /sair/i }));

      await waitFor(() => {
        expect(onClose).toHaveBeenCalled();
      });
    });
  });

  describe('Sidebar element', () => {
    it('renders an <aside> element', () => {
      renderSidebar('/');
      expect(screen.getByRole('complementary')).toBeInTheDocument();
    });
  });
});
