import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { authService } from '../services/auth.service';
import { PasswordInput } from '../components/auth/PasswordInput';
import { Button } from '@/components/ui';

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
    <div className="min-h-screen bg-bg flex items-center justify-center px-4">
      <div className="w-full max-w-sm glass rounded-2xl shadow-overlay p-8 space-y-6">
        <h1 className="text-2xl font-bold text-fg text-center">Nova senha</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <PasswordInput
            value={password}
            onChange={setPassword}
            label="Nova senha"
            id="new-password"
          />
          {error && <p className="text-sm text-danger">{error}</p>}
          <Button type="submit" loading={loading} fullWidth>
            {loading ? 'Salvando...' : 'Redefinir senha'}
          </Button>
        </form>
      </div>
    </div>
  );
}
