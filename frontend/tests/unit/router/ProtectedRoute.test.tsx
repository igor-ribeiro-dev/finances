import '@testing-library/jest-dom';
import { TextEncoder, TextDecoder } from 'util';
Object.assign(global, { TextEncoder, TextDecoder });

import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { ProtectedRoute } from '../../../src/router/ProtectedRoute';

// Capture the location that Navigate renders to so we can assert on state.
let capturedLocation: ReturnType<typeof useLocation> | null = null;

function LocationCapture() {
  capturedLocation = useLocation();
  return null;
}

jest.mock('../../../src/contexts/AuthContext');
import { useAuth } from '../../../src/contexts/AuthContext';
const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

// Minimal auth state factory
function makeAuthState(
  overrides: Partial<{
    user: { id: string; name: string; email: string; familyGroupId: string | null } | null;
    loading: boolean;
  }> = {},
) {
  return {
    user: null,
    loading: false,
    register: jest.fn(),
    login: jest.fn(),
    logout: jest.fn(),
    setUser: jest.fn(),
    ...overrides,
  };
}

function renderProtectedRoute(
  authState: ReturnType<typeof makeAuthState>,
  initialPath = '/despesas',
) {
  capturedLocation = null;
  mockUseAuth.mockReturnValue(authState);

  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route
          path={initialPath}
          element={
            <ProtectedRoute>
              <div>Protected Content</div>
            </ProtectedRoute>
          }
        />
        {/* Capture destinations so we can inspect location state */}
        <Route path="/login" element={<LocationCapture />} />
        <Route path="/onboarding" element={<LocationCapture />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('ProtectedRoute', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    capturedLocation = null;
  });

  it('shows a loading spinner when auth is loading', () => {
    renderProtectedRoute(makeAuthState({ loading: true }));

    // The spinner is a div with the animate-spin class — assert it is in the document
    const spinner = document.querySelector('.animate-spin');
    expect(spinner).toBeInTheDocument();
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });

  it('redirects unauthenticated user to /login and passes original location in state', () => {
    renderProtectedRoute(makeAuthState({ user: null, loading: false }), '/despesas');

    // Should have navigated to /login
    expect(capturedLocation).not.toBeNull();
    expect(capturedLocation!.pathname).toBe('/login');

    // state.from must carry the original location
    const state = capturedLocation!.state as { from: { pathname: string } } | null;
    expect(state).not.toBeNull();
    expect(state!.from.pathname).toBe('/despesas');
  });

  it('redirects authenticated user without familyGroupId to /onboarding', () => {
    const user = { id: '1', name: 'Ana', email: 'ana@test.com', familyGroupId: null };
    renderProtectedRoute(makeAuthState({ user, loading: false }));

    expect(capturedLocation).not.toBeNull();
    expect(capturedLocation!.pathname).toBe('/onboarding');
  });

  it('renders children when user is authenticated and has a familyGroupId', () => {
    const user = { id: '1', name: 'Ana', email: 'ana@test.com', familyGroupId: 'fam-42' };
    renderProtectedRoute(makeAuthState({ user, loading: false }));

    expect(screen.getByText('Protected Content')).toBeInTheDocument();
    // Must NOT have navigated away
    expect(capturedLocation).toBeNull();
  });
});
