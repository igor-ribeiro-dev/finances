import type { Category } from '@prisma/client';
import { AppError, CategoryErrorCode } from '../../api/errors';
import { categoryRepository } from '../../domain/category/category.repository';

export interface GetCategoryInput {
  groupId: string;
  id: string;
}

export async function getCategoryUseCase(input: GetCategoryInput): Promise<Category> {
  const found = await categoryRepository.findByIdInGroup(input.id, input.groupId);
  if (!found) {
    throw new AppError(CategoryErrorCode.notFound, 'Categoria não encontrada.', 404);
  }
  return found;
}
