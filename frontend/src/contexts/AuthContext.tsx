import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { authService, type UserMe } from '../services/auth.service';

interface AuthState {
  user: UserMe | null;
  loading: boolean;
}

interface AuthActions {
  register: (name: string, email: string, password: string) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  setUser: (user: UserMe | null) => void;
}

const AuthContext = createContext<(AuthState & AuthActions) | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserMe | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    authService
      .getMe()
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const register = async (name: string, email: string, password: string) => {
    const me = await authService.register(name, email, password);
    setUser(me);
  };

  const login = async (email: string, password: string) => {
    const me = await authService.login(email, password);
    setUser(me);
  };

  const logout = async () => {
    await authService.logout();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, register, login, logout, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
