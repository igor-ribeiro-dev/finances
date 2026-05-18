import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { groupService } from '../services/auth.service';

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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="w-full max-w-sm bg-white rounded-2xl shadow-sm border border-gray-100 p-8 space-y-4 text-center">
          <h2 className="text-xl font-semibold text-gray-900">Grupo criado!</h2>
          <p className="text-sm text-gray-600">
            Compartilhe este código com os membros da família:
          </p>
          <div className="bg-blue-50 rounded-lg px-4 py-3">
            <span className="text-2xl font-mono font-bold text-blue-700 tracking-widest">
              {createdInvite.code}
            </span>
          </div>
          <button
            onClick={() => {
              navigator.clipboard?.writeText(createdInvite.link);
            }}
            className="text-sm text-blue-600 hover:underline"
          >
            Copiar link de convite
          </button>
          <button
            onClick={() => navigate('/', { replace: true })}
            className="w-full py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Ir para o app
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-sm border border-gray-100 p-8 space-y-6">
        <h1 className="text-2xl font-semibold text-gray-900 text-center">
          Configurar grupo familiar
        </h1>
        <div className="flex rounded-lg border border-gray-200 overflow-hidden">
          {(['create', 'join'] as const).map((t) => (
            <button
              key={t}
              onClick={() => {
                setTab(t);
                setError('');
              }}
              className={`flex-1 py-2 text-sm font-medium transition-colors ${tab === t ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-50'}`}
            >
              {t === 'create' ? 'Criar grupo' : 'Entrar com código'}
            </button>
          ))}
        </div>

        {tab === 'create' ? (
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label htmlFor="group-name" className="block text-sm font-medium text-gray-700">
                Nome do grupo
              </label>
              <input
                id="group-name"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                placeholder="Ex: Família Silva"
                className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Criando...' : 'Criar grupo'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleJoin} className="space-y-4">
            <div>
              <label htmlFor="invite-code" className="block text-sm font-medium text-gray-700">
                Código de convite
              </label>
              <input
                id="invite-code"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                maxLength={8}
                placeholder="XKCD4723"
                className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono tracking-widest text-center uppercase"
              />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Entrando...' : 'Entrar no grupo'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
