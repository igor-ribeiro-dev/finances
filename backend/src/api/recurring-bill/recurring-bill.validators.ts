import { z } from 'zod';
export { zodErrorToFieldErrors } from '../zod-helpers';

const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;
const uuid = z.string().uuid('Identificador inválido.');

export const createRecurringBillBody = z.object({
  description: z
    .string({ message: 'A descrição é obrigatória.' })
    .trim()
    .min(1, 'A descrição é obrigatória.')
    .max(200, 'A descrição deve ter no máximo 200 caracteres.'),
  expectedAmountCents: z
    .number({ message: 'O valor esperado é obrigatório.' })
    .int('O valor deve ser inteiro (em centavos).')
    .positive('O valor deve ser maior que zero.')
    .max(2_000_000_000, 'O valor é alto demais.'),
  dueDay: z
    .number({ message: 'O dia de vencimento é obrigatório.' })
    .int('O dia de vencimento deve ser inteiro.')
    .min(1, 'O dia de vencimento deve ser entre 1 e 31.')
    .max(31, 'O dia de vencimento deve ser entre 1 e 31.'),
  interval: z.enum(['MONTHLY', 'ANNUAL'], { message: 'Intervalo inválido.' }),
  startMonth: z
    .string({ message: 'O mês de início é obrigatório.' })
    .regex(MONTH_RE, 'Mês deve estar no formato YYYY-MM (ex: 2026-06).'),
  includeStartMonth: z.boolean().default(false),
  categoryId: uuid.nullable().optional(),
  ownerMemberId: uuid.nullable().optional(),
});

export const updateRecurringBillBody = createRecurringBillBody
  .omit({ startMonth: true, includeStartMonth: true })
  .partial();
