import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { groupService } from '../services/auth.service';
import { Button, Input, FormField } from '@/components/ui';
import { cn } from '@/lib/cn';

export function OnboardingPage() {
  const { setUser } = useAuth();
  const navigate = useNavigate();
  const { code: urlCode } = useParams<{ code?: string }>();

  const [tab, setTab] = useState<'create' | 'join'>(urlCode ? 'join' : 'create');
  const [groupName, setGroupName] = useState('');
  const [joinCode, setJoinCode] = useState(urlCode ?? '');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [createdInvite, setCreatedInvite] = useState<{ code: string; link: string } | null>(null);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!groupName.trim()) {
      setError('Nome do grupo é obrigatório.');
      return;
    }
    setLoading(true);
    try {
      const group = await groupService.create(groupName.trim());
      setCreatedInvite({ code: group.invite.code, link: group.invite.link });
      setUser((prev) => (prev ? { ...prev, familyGroupId: group.id } : prev));
    } catch {
      setError('Erro ao criar grupo. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!joinCode.trim()) {
      setError('Código de convite é obrigatório.');
      return;
    }
    setLoading(true);
    try {
      const group = await groupService.join(joinCode.trim().toUpperCase());
      setUser((prev) => (prev ? { ...prev, familyGroupId: group.id } : prev));
      navigate('/', { replace: true });
    } catch (err: unknown) {
      const e = err as { code?: string };
      if (e.code === 'INVALID_INVITE_CODE') setError('Código de convite inválido ou expirado.');
      else if (e.code === 'ALREADY_IN_GROUP') setError('Você já pertence a um grupo.');
      else setError('Erro ao entrar no grupo. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }

  if (createdInvite) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center px-4">
        <div className="w-full max-w-sm glass rounded-2xl shadow-overlay p-8 space-y-4 text-center">
          <h2 className="text-xl font-bold text-fg">Grupo criado!</h2>
          <p className="text-sm text-fg-muted">
            Compartilhe este código com os membros da família:
          </p>
          <div className="bg-primary/10 rounded-xl px-4 py-3">
            <span className="text-2xl font-mono font-bold text-primary tracking-widest">
              {createdInvite.code}
            </span>
          </div>
          <button
            onClick={() => navigator.clipboard?.writeText(createdInvite.link)}
            className="text-sm text-primary hover:text-primary-hover underline-offset-2 hover:underline transition-colors"
          >
            Copiar link de convite
          </button>
          <Button onClick={() => navigate('/', { replace: true })} fullWidth>
            Ir para o app
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center px-4">
      <div className="w-full max-w-sm glass rounded-2xl shadow-overlay p-8 space-y-6">
        <h1 className="text-2xl font-bold text-fg text-center">Configurar grupo familiar</h1>
        <div className="flex rounded-lg border border-border overflow-hidden">
          {(['create', 'join'] as const).map((t) => (
            <button
              key={t}
              onClick={() => {
                setTab(t);
                setError('');
              }}
              className={cn(
                'flex-1 py-2 text-sm font-medium transition-colors',
                tab === t
                  ? 'bg-primary text-primary-fg'
                  : 'text-fg-muted hover:bg-surface hover:text-fg',
              )}
            >
              {t === 'create' ? 'Criar grupo' : 'Entrar com código'}
            </button>
          ))}
        </div>

        {tab === 'create' ? (
          <form onSubmit={handleCreate} className="space-y-4">
            <FormField label="Nome do grupo" htmlFor="group-name" error={error || undefined}>
              <Input
                id="group-name"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                placeholder="Ex: Família Silva"
                invalid={!!error}
              />
            </FormField>
            <Button type="submit" loading={loading} fullWidth>
              {loading ? 'Criando...' : 'Criar grupo'}
            </Button>
          </form>
        ) : (
          <form onSubmit={handleJoin} className="space-y-4">
            <FormField label="Código de convite" htmlFor="invite-code" error={error || undefined}>
              <Input
                id="invite-code"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                maxLength={8}
                placeholder="XKCD4723"
                invalid={!!error}
                className="font-mono tracking-widest text-center uppercase"
              />
            </FormField>
            <Button type="submit" loading={loading} fullWidth>
              {loading ? 'Entrando...' : 'Entrar no grupo'}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
