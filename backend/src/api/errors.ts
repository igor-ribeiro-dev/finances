import type { Response } from 'express';

export interface FieldError {
  field: string;
  code: string;
  message: string;
}

export interface CategoryBlockers {
  subCategoriesCount: number;
  affectedExpensesCount: number;
}

/**
 * Domain error carrying a machine-readable `code` (Constitution V).
 *
 * The original feature-006 shape was `new AppError(code, message)` with the
 * router mapping code → HTTP status. That still works; this feature adds three
 * optional fields so category use-cases can throw self-describing errors
 * (status + fieldErrors for 422s, blockers for the 409 has_dependencies case)
 * without the router re-deriving them.
 */
export class AppError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status?: number,
    public readonly fieldErrors?: FieldError[],
    public readonly blockers?: CategoryBlockers,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

/** Machine-readable error codes introduced by feature 007 (categories). */
export const CategoryErrorCode = {
  duplicateName: 'category.duplicate_name',
  roleImmutable: 'category.role_immutable',
  parentInvalid: 'category.parent_invalid',
  parentNotRoot: 'category.parent_not_root',
  notFound: 'category.not_found',
  hasDependencies: 'category.has_dependencies',
} as const;

/** Polymorphic IdempotencyKey conflict codes (FR-016). */
export const IdempotencyErrorCode = {
  conflict: 'idempotency.conflict',
  crossResourceConflict: 'idempotency.cross_resource_conflict',
} as const;

/** Machine-readable error codes introduced by feature 008 (budgets). */
export const BudgetErrorCode = {
  invalidMonth: 'budget.invalid_month',
  targetNotFound: 'budget.target_not_found',
  invalidPercent: 'budget.invalid_percent',
} as const;

export function sendError(
  res: Response,
  status: number,
  code: string,
  message: string,
  fieldErrors?: FieldError[],
): void {
  const body: { code: string; message: string; fieldErrors?: FieldError[] } = { code, message };
  if (fieldErrors && fieldErrors.length > 0) body.fieldErrors = fieldErrors;
  res.status(status).json(body);
}

export function sendValidationError(res: Response, fieldErrors: FieldError[]): void {
  sendError(res, 400, 'validation_error', 'Dados inválidos.', fieldErrors);
}

/**
 * 409 envelope for `category.has_dependencies` (FR-013/FR-014). Carries the same
 * counts the delete-preview endpoint exposes so the frontend can render the
 * blocking modal with concrete numbers.
 */
export function sendCategoryBlockerError(res: Response, blockers: CategoryBlockers): void {
  res.status(409).json({
    code: CategoryErrorCode.hasDependencies,
    message: `Esta categoria ainda possui ${blockers.subCategoriesCount} sub-categoria(s) e ${blockers.affectedExpensesCount} despesa(s) vinculada(s). Reorganize esses registros antes de excluí-la.`,
    blockers,
  });
}
