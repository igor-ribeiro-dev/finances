export interface GroupMember {
  id: string;
  name: string;
}

const BASE = '/api/v1/groups';

export async function listGroupMembers(): Promise<GroupMember[]> {
  const res = await fetch(`${BASE}/members`, { credentials: 'include' });
  if (res.status === 401) window.dispatchEvent(new Event('session:expired'));
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { message?: string };
    throw new Error(body.message ?? 'Erro ao carregar membros do grupo.');
  }
  return (await res.json()) as GroupMember[];
}
