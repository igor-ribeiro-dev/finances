import type {
  Bill,
  MonthBillsResponse,
  CreateBillBody,
  UpdateBillBody,
  CopyBillsBody,
  CopyBillsDryRunResponse,
  CopyBillsResponse,
  PayBillBody,
  UpdatePaymentBody,
  LogSpendingRequest,
  ServiceError,
} from '../types/bill';

const BASE = '/api/v1/bills';

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

export const billService = {
  /** GET /api/v1/bills?month=YYYY-MM */
  async listByMonth(month: string): Promise<MonthBillsResponse> {
    return request<MonthBillsResponse>(`?month=${encodeURIComponent(month)}`);
  },

  /** POST /api/v1/bills */
  async create(body: CreateBillBody): Promise<{ bill: Bill }> {
    return request<{ bill: Bill }>('', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },

  /** PATCH /api/v1/bills/:id */
  async update(id: string, body: UpdateBillBody): Promise<{ bill: Bill }> {
    return request<{ bill: Bill }>(`/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    });
  },

  /** DELETE /api/v1/bills/:id */
  async remove(id: string): Promise<void> {
    await request<void>(`/${id}`, { method: 'DELETE' });
  },

  /** POST /api/v1/bills/copy — dryRun=true */
  async copyDryRun(fromMonth: string, toMonth: string): Promise<CopyBillsDryRunResponse> {
    const body: CopyBillsBody = { fromMonth, toMonth, dryRun: true };
    return request<CopyBillsDryRunResponse>('/copy', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },

  /** POST /api/v1/bills/copy — dryRun=false */
  async copy(fromMonth: string, toMonth: string): Promise<CopyBillsResponse> {
    const body: CopyBillsBody = { fromMonth, toMonth, dryRun: false };
    return request<CopyBillsResponse>('/copy', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },

  /** POST /api/v1/bills/:id/pay */
  async pay(id: string, body: PayBillBody): Promise<{ bill: Bill }> {
    return request<{ bill: Bill }>(`/${id}/pay`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },

  /** PATCH /api/v1/bills/:id/payment */
  async updatePayment(id: string, body: UpdatePaymentBody): Promise<{ bill: Bill }> {
    return request<{ bill: Bill }>(`/${id}/payment`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    });
  },

  /** DELETE /api/v1/bills/:id/payment */
  async revertPayment(id: string): Promise<{ bill: Bill }> {
    return request<{ bill: Bill }>(`/${id}/payment`, { method: 'DELETE' });
  },

  /** POST /api/v1/bills/:id/cancel */
  async cancel(id: string): Promise<{ bill: Bill }> {
    return request<{ bill: Bill }>(`/${id}/cancel`, { method: 'POST' });
  },

  /** POST /api/v1/bills/:id/reactivate */
  async reactivate(id: string): Promise<{ bill: Bill }> {
    return request<{ bill: Bill }>(`/${id}/reactivate`, { method: 'POST' });
  },

  /** POST /api/v1/bills/log — cria uma conta já Paga em um passo (FR-001) */
  async logSpending(body: LogSpendingRequest): Promise<{ bill: Bill }> {
    return request<{ bill: Bill }>('/log', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },
};
