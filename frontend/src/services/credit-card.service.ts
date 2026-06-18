import type {
  CreditCard,
  CreditCardDetail,
  CreateCardPayload,
  UpdateCardPayload,
  RegisterFaturaPayload,
  CreditCardServiceError,
  FieldError,
} from '../types/credit-card';

const BASE = '/api/v1/credit-cards';

function sessionExpiredEvent(): void {
  window.dispatchEvent(new Event('session:expired'));
}

interface ErrorBody {
  code?: string;
  message?: string;
  fieldErrors?: FieldError[];
}

async function parseError(res: Response): Promise<CreditCardServiceError> {
  let body: ErrorBody = {};
  try {
    body = (await res.json()) as ErrorBody;
  } catch {
    /* empty body */
  }
  const message = body.message ?? 'Erro desconhecido.';
  const code = body.code ?? 'unknown_error';
  if (body.fieldErrors && body.fieldErrors.length > 0) {
    return { kind: 'validation', status: res.status, message, fieldErrors: body.fieldErrors };
  }
  if (res.status === 401) return { kind: 'not_authenticated', message };
  if (res.status === 403) return { kind: 'forbidden', code, message };
  if (res.status === 404) return { kind: 'not_found', message };
  if (res.status === 409) return { kind: 'conflict', code, message };
  return { kind: 'server', status: res.status, code, message };
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, {
      credentials: 'include',
      ...init,
      headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Falha de rede.';
    throw { kind: 'network', message } as CreditCardServiceError;
  }
  if (res.status === 401) sessionExpiredEvent();
  if (!res.ok) throw await parseError(res);
  if (res.status === 204) return undefined as unknown as T;
  return (await res.json()) as T;
}

export const creditCardService = {
  async listCards(): Promise<CreditCard[]> {
    const { cards } = await request<{ cards: CreditCard[] }>('');
    return cards;
  },
  async getCard(id: string): Promise<CreditCardDetail> {
    const { card } = await request<{ card: CreditCardDetail }>(`/${id}`);
    return card;
  },
  async createCard(body: CreateCardPayload): Promise<CreditCard> {
    const { card } = await request<{ card: CreditCard }>('', {
      method: 'POST',
      body: JSON.stringify(body),
    });
    return card;
  },
  async updateCard(id: string, body: UpdateCardPayload): Promise<CreditCard> {
    const { card } = await request<{ card: CreditCard }>(`/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    });
    return card;
  },
  async archiveCard(id: string): Promise<CreditCard> {
    const { card } = await request<{ card: CreditCard }>(`/${id}/archive`, { method: 'POST' });
    return card;
  },
  async deleteCard(id: string): Promise<void> {
    await request<void>(`/${id}`, { method: 'DELETE' });
  },
  async registerFatura(id: string, body: RegisterFaturaPayload): Promise<{ id: string }> {
    const { bill } = await request<{ bill: { id: string } }>(`/${id}/faturas`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
    return bill;
  },
};
