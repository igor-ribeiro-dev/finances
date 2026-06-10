import { z } from 'zod';

export { idempotencyKeyHeader, zodErrorToFieldErrors } from '../expense/expense.validators';

const nameSchema = z
  .string({ message: 'O nome é obrigatório.' })
  .trim()
  .min(1, 'O nome é obrigatório.')
  .max(60, 'O nome deve ter no máximo 60 caracteres.');

const parentIdSchema = z
  .string({ message: 'Categoria pai inválida.' })
  .uuid('Categoria pai inválida.')
  .nullable();

/** POST /api/v1/categories body. parentId null = create a root category. */
export const createCategoryBody = z.object({
  name: nameSchema,
  parentId: parentIdSchema,
});

/** PATCH /api/v1/categories/:id body — full-body semantics (FR-012). */
export const updateCategoryBody = z.object({
  name: nameSchema,
  parentId: parentIdSchema,
});

/** :id path param (UUID). */
export const categoryIdParam = z.string().uuid();

export type CreateCategoryBody = z.infer<typeof createCategoryBody>;
export type UpdateCategoryBody = z.infer<typeof updateCategoryBody>;
