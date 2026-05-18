import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { PasswordInput } from './PasswordInput';

interface Props {
  onSuccess?: () => void;
}

export function RegisterForm({ onSuccess }: Props) {
  const { register } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await register(name, email, password);
      onSuccess?.();
    } catch (err: unknown) {
      const e = err as { code?: string; message?: string };
      if (e.code === 'EMAIL_ALREADY_IN_USE') setError('Este e-mail já está cadastrado.');
      else if (e.code === 'INVALID_PASSWORD')
        setError('A senha deve ter no mínimo 8 caracteres, 1 número e 1 letra maiúscula.');
      else setError('Erro ao criar conta. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700">
          Nome
        </label>
        <input
          id="name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <div>
        <label htmlFor="reg-email" className="block text-sm font-medium text-gray-700">
          E-mail
        </label>
        <input
          id="reg-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <PasswordInput value={password} onChange={setPassword} />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={loading}
        className="w-full py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? 'Criando conta...' : 'Criar conta'}
      </button>
    </form>
  );
}
