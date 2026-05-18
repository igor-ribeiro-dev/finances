import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { authService } from '../services/auth.service';
import { PasswordInput } from '../components/auth/PasswordInput';

export function ResetPasswordPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get('token') ?? '';
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await authService.resetPassword(token, password);
      navigate('/login', { replace: true });
    } catch (err: unknown) {
      const e = err as { code?: string };
      if (e.code === 'INVALID_RESET_TOKEN')
        setError('Este link de redefinição é inválido ou já expirou.');
      else if (e.code === 'INVALID_PASSWORD')
        setError('A senha deve ter no mínimo 8 caracteres, 1 número e 1 letra maiúscula.');
      else setError('Erro ao redefinir senha. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-sm border border-gray-100 p-8 space-y-6">
        <h1 className="text-2xl font-semibold text-gray-900 text-center">Nova senha</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <PasswordInput
            value={password}
            onChange={setPassword}
            label="Nova senha"
            id="new-password"
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Salvando...' : 'Redefinir senha'}
          </button>
        </form>
      </div>
    </div>
  );
}
