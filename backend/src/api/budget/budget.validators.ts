import { z } from 'zod';

export { zodErrorToFieldErrors } from '../zod-helpers';

/** Calendar month `YYYY-MM` (01–12). */
export const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

export const monthSchema = z
  .string({ message: 'Mês é obrigatório.' })
  .regex(MONTH_RE, 'Mês deve estar no formato YYYY-MM.');

/** `?month=` query param. */
export const monthQuery = z.object({ month: monthSchema });

const amountCentsSchema = z
  .number({ message: 'O valor deve ser numérico.' })
  .int('O valor deve ser inteiro (em centavos).')
  .min(0, 'O valor não pode ser negativo.')
  .max(2_000_000_000, 'O valor é alto demais.');

const percentSchema = z
  .number({ message: 'O percentual deve ser numérico.' })
  .int('O percentual deve ser um número inteiro.')
  .min(0, 'O percentual não pode ser negativo.')
  .max(1000, 'O percentual é alto demais.');

/** A member/category limit: ABSOLUTE (amountCents) OR PERCENT (percent). Zero = remove. */
export const limitInput = z.discriminatedUnion('limitType', [
  z.object({ limitType: z.literal('ABSOLUTE'), amountCents: amountCentsSchema }),
  z.object({ limitType: z.literal('PERCENT'), percent: percentSchema }),
]);

/** The family limit is ABSOLUTE only (it is the base for percentages, FR-001). */
export const familyLimitInput = z.object({
  limitType: z.literal('ABSOLUTE'),
  amountCents: amountCentsSchema,
});

const uuid = z.string().uuid();

/**
 * PUT body. Only targets PRESENT are affected; `null` (or zero amount/percent)
 * removes a target (FR-008). Omitting a key leaves it unchanged.
 */
export const upsertMonthBudgetBody = z.object({
  family: familyLimitInput.nullable().optional(),
  members: z.array(z.object({ memberId: uuid, budget: limitInput.nullable() })).optional(),
  categories: z.array(z.object({ categoryId: uuid, budget: limitInput.nullable() })).optional(),
});

/** POST /copy body. */
export const copyMonthBudgetBody = z.object({
  fromMonth: monthSchema,
  toMonth: monthSchema,
});

export type LimitInput = z.infer<typeof limitInput>;
export type UpsertMonthBudgetBody = z.infer<typeof upsertMonthBudgetBody>;
export type CopyMonthBudgetBody = z.infer<typeof copyMonthBudgetBody>;
