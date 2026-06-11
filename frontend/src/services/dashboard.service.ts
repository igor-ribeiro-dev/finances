import type { MonthDashboard, DashboardServiceError } from '../types/dashboard';
import type { FieldError } from '../types/budget';

const BASE = '/api/v1/dashboard';

function sessionExpiredEvent(): void {
  window.dispatchEvent(new Event('session:expired'));
}

interface ErrorBody {
  code?: string;
  message?: string;
  fieldErrors?: FieldError[];
}

async function parseError(res: Response): Promise<DashboardServiceError> {
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

export const dashboardService = {
  async getMonth(month: string): Promise<MonthDashboard> {
    let res: Response;
    try {
      res = await fetch(`${BASE}?month=${encodeURIComponent(month)}`, {
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Falha de rede.';
      throw { kind: 'network', message } as DashboardServiceError;
    }

    if (res.status === 401) sessionExpiredEvent();
    if (!res.ok) throw await parseError(res);
    return (await res.json()) as MonthDashboard;
  },
};
