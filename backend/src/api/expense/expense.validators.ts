import { z } from 'zod';
import type { FieldError } from '../errors';

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function isValidCalendarDate(s: string): boolean {
  const [y, m, d] = s.split('-').map(Number);
  if (!y || !m || !d) return false;
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

function todayIso(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export const createExpenseBody = z.object({
  amountCents: z
    .number({ message: 'O valor é obrigatório.' })
    .int('O valor deve ser inteiro (em centavos).')
    .positive('O valor deve ser maior que zero.')
    .max(2_000_000_000, 'O valor é alto demais.'),
  date: z
    .string({ message: 'A data é obrigatória.' })
    .regex(ISO_DATE, 'Data deve estar no formato YYYY-MM-DD.')
    .refine(isValidCalendarDate, 'Data inválida.')
    .refine((d) => d <= todayIso(), 'A data não pode estar no futuro.'),
  description: z
    .string({ message: 'A descrição é obrigatória.' })
    .trim()
    .min(1, 'A descrição é obrigatória.')
    .max(200, 'A descrição deve ter no máximo 200 caracteres.'),
  paymentMethod: z.enum(['CASH_OR_DEBIT', 'CREDIT_CARD'], {
    message: 'Método de pagamento inválido.',
  }),
  ownerMemberId: z
    .string({ message: 'O responsável é obrigatório.' })
    .uuid('Identificador de membro inválido.'),
});

export const updateExpenseBody = createExpenseBody;

export const listExpensesQuery = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(50),
  cursor: z.string().min(1).optional(),
});

export const idempotencyKeyHeader = z.string().uuid().optional();

export function zodErrorToFieldErrors(error: z.ZodError): FieldError[] {
  return error.issues.map((issue) => ({
    field: issue.path.join('.') || '(root)',
    code: issue.code,
    message: issue.message,
  }));
}
