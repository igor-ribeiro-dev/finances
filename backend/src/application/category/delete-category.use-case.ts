import { AppError, CategoryErrorCode } from '../../api/errors';
import { categoryRepository } from '../../domain/category/category.repository';
import { isPrismaErrorCode } from './category-helpers';

export interface DeleteCategoryInput {
  groupId: string;
  id: string;
}

/**
 * Symmetric blocking (FR-013): FK ON DELETE RESTRICT is the source of truth.
 * On a P2003 violation we re-query the same counts the delete-preview endpoint
 * exposes and surface them as category.has_dependencies (409).
 */
export async function deleteCategoryUseCase(input: DeleteCategoryInput): Promise<void> {
  const { groupId, id } = input;

  const current = await categoryRepository.findByIdInGroup(id, groupId);
  if (!current) {
    throw new AppError(CategoryErrorCode.notFound, 'Categoria não encontrada.', 404);
  }

  try {
    await categoryRepository.deleteByIdInGroup(id, groupId);
  } catch (err) {
    if (isPrismaErrorCode(err, 'P2003')) {
      const blockers = await categoryRepository.previewDelete(id, groupId);
      throw new AppError(
        CategoryErrorCode.hasDependencies,
        'A categoria possui dependências e não pode ser excluída.',
        409,
        undefined,
        blockers,
      );
    }
    throw err;
  }
}
