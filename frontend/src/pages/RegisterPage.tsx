import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { RegisterForm } from '../components/auth/RegisterForm';
import { useAuth } from '../contexts/AuthContext';

export function RegisterPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) {
      navigate(user.familyGroupId ? '/' : '/onboarding', { replace: true });
    }
  }, [user, loading, navigate]);

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center px-4">
      <div className="w-full max-w-sm glass rounded-2xl shadow-overlay p-8 space-y-6">
        <h1 className="text-2xl font-bold text-fg text-center">Criar conta</h1>
        <RegisterForm onSuccess={() => navigate('/onboarding', { replace: true })} />
        <p className="text-center text-sm text-fg-muted">
          Já tem conta?{' '}
          <Link
            to="/login"
            className="text-primary hover:text-primary-hover underline-offset-2 hover:underline"
          >
            Entrar
          </Link>
        </p>
      </div>
    </div>
  );
}
