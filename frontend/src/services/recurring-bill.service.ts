import type {
  RecurringBill,
  CreateRecurringBillBody,
  UpdateRecurringBillBody,
  ServiceError,
} from '../types/bill';

const BASE = '/api/v1/recurring-bills';

function sessionExpiredEvent(): void {
  window.dispatchEvent(new Event('session:expired'));
}

interface ErrorBody {
  code?: string;
  message?: string;
  fieldErrors?: Array<{ field: string; code: string; message: string }>;
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

export const recurringBillService = {
  /** GET /api/v1/recurring-bills */
  async list(): Promise<{ recurringBills: RecurringBill[] }> {
    return request<{ recurringBills: RecurringBill[] }>('');
  },

  /** POST /api/v1/recurring-bills */
  async create(body: CreateRecurringBillBody): Promise<{ recurringBill: RecurringBill }> {
    return request<{ recurringBill: RecurringBill }>('', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },

  /** PATCH /api/v1/recurring-bills/:id */
  async update(
    id: string,
    body: UpdateRecurringBillBody,
  ): Promise<{ recurringBill: RecurringBill }> {
    return request<{ recurringBill: RecurringBill }>(`/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    });
  },

  /** DELETE /api/v1/recurring-bills/:id */
  async remove(id: string): Promise<void> {
    await request<void>(`/${id}`, { method: 'DELETE' });
  },

  /** POST /api/v1/recurring-bills/:id/pause */
  async pause(id: string): Promise<{ recurringBill: RecurringBill }> {
    return request<{ recurringBill: RecurringBill }>(`/${id}/pause`, { method: 'POST' });
  },

  /** POST /api/v1/recurring-bills/:id/resume */
  async resume(id: string): Promise<{ recurringBill: RecurringBill }> {
    return request<{ recurringBill: RecurringBill }>(`/${id}/resume`, { method: 'POST' });
  },

  /** POST /api/v1/recurring-bills/:id/stop */
  async stop(id: string): Promise<{ recurringBill: RecurringBill }> {
    return request<{ recurringBill: RecurringBill }>(`/${id}/stop`, { method: 'POST' });
  },
};
