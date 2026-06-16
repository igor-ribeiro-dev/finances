import { z } from 'zod';

export { zodErrorToFieldErrors } from '../zod-helpers';

const nameSchema = z
  .string({ message: 'O nome é obrigatório.' })
  .trim()
  .min(1, 'O nome é obrigatório.')
  .max(60, 'O nome deve ter no máximo 60 caracteres.');

const closingDaySchema = z
  .number({ message: 'O dia de fechamento é obrigatório.' })
  .int('O dia de fechamento deve ser um número inteiro.')
  .min(1, 'O dia de fechamento deve estar entre 1 e 31.')
  .max(31, 'O dia de fechamento deve estar entre 1 e 31.');

/** POST /api/v1/credit-cards body. */
export const createCardBody = z.object({
  name: nameSchema,
  closingDay: closingDaySchema,
});

/** PATCH /api/v1/credit-cards/:id body — partial (rename and/or closing day). */
export const updateCardBody = z
  .object({
    name: nameSchema.optional(),
    closingDay: closingDaySchema.optional(),
  })
  .refine((v) => v.name !== undefined || v.closingDay !== undefined, {
    message: 'Informe ao menos um campo para atualizar.',
  });

/** POST /api/v1/credit-cards/:id/faturas body (US4). */
export const registerFaturaBody = z.object({
  expectedAmountCents: z
    .number({ message: 'O valor é obrigatório.' })
    .int('O valor deve ser um número inteiro de centavos.')
    .positive('O valor deve ser maior que zero.'),
  dueDate: z
    .string({ message: 'A data de vencimento é obrigatória.' })
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Data de vencimento inválida.'),
  description: z
    .string()
    .trim()
    .max(200, 'A descrição deve ter no máximo 200 caracteres.')
    .optional(),
});

/** :id path param (UUID). */
export const creditCardIdParam = z.string().uuid();

export type CreateCardBody = z.infer<typeof createCardBody>;
export type UpdateCardBody = z.infer<typeof updateCardBody>;
export type RegisterFaturaBody = z.infer<typeof registerFaturaBody>;
