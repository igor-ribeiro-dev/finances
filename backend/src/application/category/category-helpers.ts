import { AppError, CategoryErrorCode, type FieldError } from '../../api/errors';
import { categoryRepository } from '../../domain/category/category.repository';

/** Narrowing helper for Prisma known-request errors (e.g. 'P2002', 'P2003'). */
export function isPrismaErrorCode(err: unknown, code: string): boolean {
  return typeof err === 'object' && err !== null && (err as { code?: unknown }).code === code;
}

function fieldError(field: string, code: string, message: string): FieldError[] {
  return [{ field, code, message }];
}

/** 422 thrown when a P2002 unique violation is caught on create/update. */
export function duplicateNameError(): AppError {
  const message = 'Já existe uma categoria com esse nome neste nível.';
  return new AppError(
    CategoryErrorCode.duplicateName,
    message,
    422,
    fieldError('name', CategoryErrorCode.duplicateName, message),
  );
}

/**
 * FR-011: a parentId must reference an EXISTING ROOT category in the same group.
 * One lookup disambiguates the two 422 codes:
 *   - missing in group → category.parent_invalid
 *   - exists but is a sub-category → category.parent_not_root
 */
export async function assertParentIsRoot(parentId: string, groupId: string): Promise<void> {
  const parent = await categoryRepository.findByIdInGroup(parentId, groupId);
  if (!parent) {
    const message = 'Categoria pai não encontrada.';
    throw new AppError(
      CategoryErrorCode.parentInvalid,
      message,
      422,
      fieldError('parentId', CategoryErrorCode.parentInvalid, message),
    );
  }
  if (parent.parentId !== null) {
    const message = 'A categoria pai deve ser uma categoria raiz.';
    throw new AppError(
      CategoryErrorCode.parentNotRoot,
      message,
      422,
      fieldError('parentId', CategoryErrorCode.parentNotRoot, message),
    );
  }
}
