import type { Category } from '@prisma/client';
import { categoryRepository } from '../../domain/category/category.repository';

export interface ListCategoriesInput {
  groupId: string;
}

export async function listCategoriesUseCase(input: ListCategoriesInput): Promise<Category[]> {
  return categoryRepository.listByGroup(input.groupId);
}
