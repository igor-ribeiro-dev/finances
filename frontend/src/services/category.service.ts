import type {
  Category,
  CategoryFormPayload,
  CategoryServiceError,
  DeletePreview,
  FieldError,
  BlockerInfo,
} from '../types/category';

const BASE = '/api/v1/categories';

function sessionExpiredEvent(): void {
  window.dispatchEvent(new Event('session:expired'));
}

interface ErrorBody {
  code?: string;
  message?: string;
  fieldErrors?: FieldError[];
  blockers?: BlockerInfo;
}

async function parseError(res: Response): Promise<CategoryServiceError> {
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
  if (res.status === 409) {
    return body.blockers
      ? { kind: 'conflict', code, message, blockers: body.blockers }
      : { kind: 'conflict', code, message };
  }
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
    throw { kind: 'network', message } as CategoryServiceError;
  }

  if (res.status === 401) sessionExpiredEvent();

  if (!res.ok) {
    throw await parseError(res);
  }
  if (res.status === 204) return undefined as unknown as T;
  return (await res.json()) as T;
}

export const categoryService = {
  async createCategory(body: CategoryFormPayload, idempotencyKey: string): Promise<Category> {
    return request<Category>('', {
      method: 'POST',
      headers: { 'Idempotency-Key': idempotencyKey },
      body: JSON.stringify(body),
    });
  },

  async listCategories(): Promise<Category[]> {
    return request<Category[]>('');
  },

  async getCategory(id: string): Promise<Category> {
    return request<Category>(`/${id}`);
  },

  async updateCategory(id: string, body: CategoryFormPayload): Promise<Category> {
    return request<Category>(`/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    });
  },

  async deleteCategory(id: string): Promise<void> {
    await request<void>(`/${id}`, { method: 'DELETE' });
  },

  async previewDeleteCategory(id: string): Promise<DeletePreview> {
    return request<DeletePreview>(`/${id}/delete-preview`);
  },
};
