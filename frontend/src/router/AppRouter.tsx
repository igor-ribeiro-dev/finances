import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { AuthProvider } from '../contexts/AuthContext';
import { ProtectedRoute } from './ProtectedRoute';
import { LoginPage } from '../pages/LoginPage';
import { RegisterPage } from '../pages/RegisterPage';
import { ForgotPasswordPage } from '../pages/ForgotPasswordPage';
import { ResetPasswordPage } from '../pages/ResetPasswordPage';
import { OnboardingPage } from '../pages/OnboardingPage';

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

function DashboardPlaceholder() {
  return <div className="p-8 text-gray-700">Dashboard — em breve (feature 008)</div>;
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
                <DashboardPlaceholder />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
