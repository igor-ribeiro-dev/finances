import { useState } from 'react';
import { Link } from 'react-router-dom';
import { authService } from '../services/auth.service';

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
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-sm border border-gray-100 p-8 space-y-6">
        <h1 className="text-2xl font-semibold text-gray-900 text-center">Recuperar senha</h1>
        {sent ? (
          <div className="space-y-4 text-center">
            <p className="text-sm text-gray-600">
              Se este e-mail estiver cadastrado, você receberá as instruções em breve.
            </p>
            <Link to="/login" className="text-blue-600 hover:underline text-sm">
              Voltar para o login
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="forgot-email" className="block text-sm font-medium text-gray-700">
                E-mail
              </label>
              <input
                id="forgot-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Enviando...' : 'Enviar instruções'}
            </button>
            <p className="text-center text-sm">
              <Link to="/login" className="text-blue-600 hover:underline">
                Voltar para o login
              </Link>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
