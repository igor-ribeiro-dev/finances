import { AppError, CategoryErrorCode, type CategoryBlockers } from '../../api/errors';
import { categoryRepository } from '../../domain/category/category.repository';

export interface PreviewDeleteCategoryInput {
  groupId: string;
  id: string;
}

export async function previewDeleteCategoryUseCase(
  input: PreviewDeleteCategoryInput,
): Promise<CategoryBlockers> {
  const current = await categoryRepository.findByIdInGroup(input.id, input.groupId);
  if (!current) {
    throw new AppError(CategoryErrorCode.notFound, 'Categoria não encontrada.', 404);
  }
  return categoryRepository.previewDelete(input.id, input.groupId);
}
