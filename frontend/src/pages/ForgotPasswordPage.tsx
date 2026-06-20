import { useState } from 'react';
import { Link } from 'react-router-dom';
import { authService } from '../services/auth.service';
import { Button, Input, FormField } from '@/components/ui';

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    await authService.forgotPassword(email).catch(() => null);
    setSent(true);
    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center px-4">
      <div className="w-full max-w-sm glass rounded-2xl shadow-overlay p-8 space-y-6">
        <h1 className="text-2xl font-bold text-fg text-center">Recuperar senha</h1>
        {sent ? (
          <div className="space-y-4 text-center">
            <p className="text-sm text-fg-muted">
              Se este e-mail estiver cadastrado, você receberá as instruções em breve.
            </p>
            <Link
              to="/login"
              className="text-primary hover:text-primary-hover text-sm underline-offset-2 hover:underline"
            >
              Voltar para o login
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <FormField label="E-mail" htmlFor="forgot-email">
              <Input
                id="forgot-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </FormField>
            <Button type="submit" loading={loading} fullWidth>
              {loading ? 'Enviando...' : 'Enviar instruções'}
            </Button>
            <p className="text-center text-sm">
              <Link
                to="/login"
                className="text-primary hover:text-primary-hover underline-offset-2 hover:underline"
              >
                Voltar para o login
              </Link>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
