import { z } from 'zod';
export { zodErrorToFieldErrors } from '../expense/expense.validators';

const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const uuid = z.string().uuid('Identificador inválido.');

function isValidDate(s: string): boolean {
  const [y, m, d] = s.split('-').map(Number);
  if (!y || !m || !d) return false;
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

export const monthQuerySchema = z.object({
  month: z.string().regex(MONTH_RE, 'Mês deve estar no formato YYYY-MM (ex: 2026-06).'),
});

const dueDateField = z
  .string({ message: 'A data de vencimento é obrigatória.' })
  .regex(ISO_DATE, 'Data deve estar no formato YYYY-MM-DD.')
  .refine(isValidDate, 'Data inválida.');

const expectedAmountCentsField = z
  .number({ message: 'O valor esperado é obrigatório.' })
  .int('O valor deve ser inteiro (em centavos).')
  .positive('O valor deve ser maior que zero.')
  .max(2_000_000_000, 'O valor é alto demais.');

const descriptionField = z
  .string({ message: 'A descrição é obrigatória.' })
  .trim()
  .min(1, 'A descrição é obrigatória.')
  .max(200, 'A descrição deve ter no máximo 200 caracteres.');

export const createBillBody = z.object({
  description: descriptionField,
  expectedAmountCents: expectedAmountCentsField,
  dueDate: dueDateField,
  categoryId: uuid.nullable().optional(),
  ownerMemberId: uuid.nullable().optional(),
});

export const updateBillBody = z.object({
  description: descriptionField.optional(),
  expectedAmountCents: expectedAmountCentsField.optional(),
  dueDate: dueDateField.optional(),
  categoryId: uuid.nullable().optional(),
  ownerMemberId: uuid.nullable().optional(),
});

export const payBillBody = z.object({
  paidDate: dueDateField,
  actualAmountCents: expectedAmountCentsField,
  paidByMemberId: uuid,
  paymentMethod: z.enum(['CASH_OR_DEBIT', 'CREDIT_CARD'], {
    message: 'Método de pagamento inválido.',
  }),
});

export const updatePaymentBody = payBillBody;

export const copyBillsBody = z.object({
  fromMonth: z.string().regex(MONTH_RE, 'Mês de origem inválido.'),
  toMonth: z.string().regex(MONTH_RE, 'Mês de destino inválido.'),
  dryRun: z.boolean().default(false),
});
