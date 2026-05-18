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
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-sm border border-gray-100 p-8 space-y-6">
        <h1 className="text-2xl font-semibold text-gray-900 text-center">Criar conta</h1>
        <RegisterForm onSuccess={() => navigate('/onboarding', { replace: true })} />
        <p className="text-center text-sm text-gray-500">
          Já tem conta?{' '}
          <Link to="/login" className="text-blue-600 hover:underline">
            Entrar
          </Link>
        </p>
      </div>
    </div>
  );
}
