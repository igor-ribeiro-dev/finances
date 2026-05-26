const BASE = '/api/v1';

export interface UserMe {
  id: string;
  name: string;
  email: string;
  familyGroupId: string | null;
}

const MOCK_USER: UserMe = {
  id: 'mock-1',
  name: 'Igor Ribeiro',
  email: 'igor@example.com',
  familyGroupId: 'mock-group-1',
};

declare const __MOCK_AUTH__: boolean;
function isMock() {
  return typeof __MOCK_AUTH__ !== 'undefined' && __MOCK_AUTH__;
}

function sessionExpiredEvent() {
  window.dispatchEvent(new Event('session:expired'));
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (res.status === 401 && path !== '/auth/login') {
    sessionExpiredEvent();
    throw new Error('UNAUTHORIZED');
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw Object.assign(new Error(body.message ?? 'Erro desconhecido'), { code: body.code });
  }
  if (res.status === 204) return undefined as unknown as T;
  return res.json() as Promise<T>;
}

export const authService = {
  register: (name: string, email: string, password: string) =>
    isMock()
      ? Promise.resolve({ ...MOCK_USER, name })
      : request<UserMe>('/auth/register', {
          method: 'POST',
          body: JSON.stringify({ name, email, password }),
        }),

  login: (_email: string, _password: string) =>
    isMock()
      ? Promise.resolve(MOCK_USER)
      : request<UserMe>('/auth/login', {
          method: 'POST',
          body: JSON.stringify({ email: _email, password: _password }),
        }),

  logout: () => (isMock() ? Promise.resolve() : request<void>('/auth/logout', { method: 'POST' })),

  getMe: () => (isMock() ? Promise.resolve(MOCK_USER) : request<UserMe>('/auth/me')),

  forgotPassword: (email: string) =>
    request<{ message: string }>('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),

  resetPassword: (token: string, newPassword: string) =>
    request<{ message: string }>('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token, newPassword }),
    }),
};

export const groupService = {
  create: (name: string) =>
    request<{
      id: string;
      name: string;
      invite: { code: string; link: string; expiresAt: string };
    }>('/groups', { method: 'POST', body: JSON.stringify({ name }) }),

  join: (code: string) =>
    request<{ id: string; name: string }>('/groups/join', {
      method: 'POST',
      body: JSON.stringify({ code }),
    }),

  regenerateInvite: () =>
    request<{ invite: { code: string; link: string; expiresAt: string } }>(
      '/groups/invite/regenerate',
      { method: 'POST' },
    ),

  leave: () => request<void>('/groups/members/me', { method: 'DELETE' }),
};
