import { useEffect } from 'react';
import { Link, useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { LoginForm } from '../components/auth/LoginForm';
import { useAuth } from '../contexts/AuthContext';

export function LoginPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [params] = useSearchParams();
  const expired = params.get('expired') === '1';

  useEffect(() => {
    if (!loading && user) {
      if (!user.familyGroupId) {
        navigate('/onboarding', { replace: true });
      } else {
        const from = (location.state as { from?: { pathname: string } })?.from?.pathname ?? '/';
        navigate(from, { replace: true });
      }
    }
  }, [user, loading, navigate, location]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-sm border border-gray-100 p-8 space-y-6">
        <h1 className="text-2xl font-semibold text-gray-900 text-center">Entrar</h1>
        {expired && (
          <p className="text-sm text-amber-600 bg-amber-50 px-3 py-2 rounded-lg">
            Sua sessão expirou. Faça login novamente.
          </p>
        )}
        <LoginForm />
        <p className="text-center text-sm text-gray-500">
          Não tem conta?{' '}
          <Link to="/register" className="text-blue-600 hover:underline">
            Cadastre-se
          </Link>
        </p>
      </div>
    </div>
  );
}
