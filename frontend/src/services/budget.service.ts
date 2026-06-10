import type {
  MonthBudget,
  CopyResult,
  UpsertMonthBudgetBody,
  BudgetServiceError,
  FieldError,
} from '../types/budget';

const BASE = '/api/v1/budgets';

function sessionExpiredEvent(): void {
  window.dispatchEvent(new Event('session:expired'));
}

interface ErrorBody {
  code?: string;
  message?: string;
  fieldErrors?: FieldError[];
}

async function parseError(res: Response): Promise<BudgetServiceError> {
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
  if (res.status === 404) return { kind: 'not_found', code, message };
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
    throw { kind: 'network', message } as BudgetServiceError;
  }

  if (res.status === 401) sessionExpiredEvent();
  if (!res.ok) throw await parseError(res);
  if (res.status === 204) return undefined as unknown as T;
  return (await res.json()) as T;
}

export const budgetService = {
  async getMonth(month: string): Promise<MonthBudget> {
    return request<MonthBudget>(`?month=${encodeURIComponent(month)}`);
  },

  async saveMonth(month: string, body: UpsertMonthBudgetBody): Promise<MonthBudget> {
    return request<MonthBudget>(`?month=${encodeURIComponent(month)}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    });
  },

  async copyPrevious(fromMonth: string, toMonth: string): Promise<CopyResult> {
    return request<CopyResult>('/copy', {
      method: 'POST',
      body: JSON.stringify({ fromMonth, toMonth }),
    });
  },
};
