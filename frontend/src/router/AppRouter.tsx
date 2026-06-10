import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { AuthProvider } from '../contexts/AuthContext';
import { ProtectedRoute } from './ProtectedRoute';
import { AppLayout } from '../components/layout/AppLayout';
import { LoginPage } from '../pages/LoginPage';
import { RegisterPage } from '../pages/RegisterPage';
import { ForgotPasswordPage } from '../pages/ForgotPasswordPage';
import { ResetPasswordPage } from '../pages/ResetPasswordPage';
import { OnboardingPage } from '../pages/OnboardingPage';
import { DashboardPage } from '../pages/DashboardPage';
import { ExpensesPage } from '../pages/ExpensesPage';
import { CategoriesPage } from '../pages/CategoriesPage';

function SessionExpiredHandler() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    function handleExpired() {
      if (location.pathname !== '/login') {
        navigate('/login?expired=1', { replace: true });
      }
    }
    window.addEventListener('session:expired', handleExpired);
    return () => window.removeEventListener('session:expired', handleExpired);
  }, [navigate, location.pathname]);

  return null;
}

export function AppRouter() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <SessionExpiredHandler />
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/onboarding" element={<OnboardingPage />} />
          <Route path="/join/:code" element={<OnboardingPage />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <AppLayout>
                  <DashboardPage />
                </AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/despesas"
            element={
              <ProtectedRoute>
                <AppLayout>
                  <ExpensesPage />
                </AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/categorias"
            element={
              <ProtectedRoute>
                <AppLayout>
                  <CategoriesPage />
                </AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/orcamentos"
            element={
              <ProtectedRoute>
                <AppLayout>
                  <div className="p-8 text-gray-500">Em breve</div>
                </AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/pagamentos"
            element={
              <ProtectedRoute>
                <AppLayout>
                  <div className="p-8 text-gray-500">Em breve</div>
                </AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/cartoes"
            element={
              <ProtectedRoute>
                <AppLayout>
                  <div className="p-8 text-gray-500">Em breve</div>
                </AppLayout>
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
