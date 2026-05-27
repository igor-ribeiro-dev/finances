import type {
  Expense,
  CreateExpenseBody,
  UpdateExpenseBody,
  ExpensePage,
  ServiceError,
  FieldError,
} from '../types/expense';

const BASE = '/api/v1/expenses';

function sessionExpiredEvent(): void {
  window.dispatchEvent(new Event('session:expired'));
}

interface ErrorBody {
  code?: string;
  message?: string;
  fieldErrors?: FieldError[];
}

async function parseError(res: Response): Promise<ServiceError> {
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
      headers: {
        'Content-Type': 'application/json',
        ...(init?.headers ?? {}),
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Falha de rede.';
    throw { kind: 'network', message } as ServiceError;
  }

  if (res.status === 401) sessionExpiredEvent();

  if (!res.ok) {
    throw await parseError(res);
  }
  if (res.status === 204) return undefined as unknown as T;
  return (await res.json()) as T;
}

export const expenseService = {
  async createExpense(body: CreateExpenseBody, idempotencyKey: string): Promise<Expense> {
    return request<Expense>('', {
      method: 'POST',
      headers: { 'Idempotency-Key': idempotencyKey },
      body: JSON.stringify(body),
    });
  },

  async listExpenses(
    params: { limit?: number; cursor?: string | null } = {},
  ): Promise<ExpensePage> {
    const search = new URLSearchParams();
    if (params.limit) search.set('limit', String(params.limit));
    if (params.cursor) search.set('cursor', params.cursor);
    const qs = search.toString();
    return request<ExpensePage>(qs ? `?${qs}` : '');
  },

  async getExpense(id: string): Promise<Expense> {
    return request<Expense>(`/${id}`);
  },

  async updateExpense(id: string, body: UpdateExpenseBody): Promise<Expense> {
    return request<Expense>(`/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    });
  },

  async deleteExpense(id: string): Promise<void> {
    await request<void>(`/${id}`, { method: 'DELETE' });
  },
};
