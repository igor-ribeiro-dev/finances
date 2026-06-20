import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { PasswordInput } from './PasswordInput';
import { Button, Input, FormField } from '@/components/ui';

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
      <FormField label="Nome" htmlFor="name">
        <Input id="name" type="text" value={name} onChange={(e) => setName(e.target.value)} />
      </FormField>
      <FormField label="E-mail" htmlFor="reg-email">
        <Input
          id="reg-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </FormField>
      <PasswordInput value={password} onChange={setPassword} />
      {error && <p className="text-sm text-danger">{error}</p>}
      <Button type="submit" loading={loading} fullWidth>
        {loading ? 'Criando conta...' : 'Criar conta'}
      </Button>
    </form>
  );
}
