import type { Category } from '@prisma/client';
import { AppError, CategoryErrorCode } from '../../api/errors';
import { prisma } from '../../infra/prisma';
import { categoryRepository } from '../../domain/category/category.repository';
import { assertParentIsRoot, duplicateNameError, isPrismaErrorCode } from './category-helpers';

export interface UpdateCategoryInput {
  groupId: string;
  id: string;
  body: { name: string; parentId: string | null };
}

/**
 * Full-body PATCH (FR-012). No optimistic concurrency / version checks — FR-024
 * last-write-wins: two sequential PATCHes both succeed, the last one persists.
 */
export async function updateCategoryUseCase(input: UpdateCategoryInput): Promise<Category> {
  const { groupId, id, body } = input;

  const current = await categoryRepository.findByIdInGroup(id, groupId);
  if (!current) {
    throw new AppError(CategoryErrorCode.notFound, 'Categoria não encontrada.', 404);
  }

  // Role immutability: a root cannot become a sub and vice-versa.
  const wasRoot = current.parentId === null;
  const willBeRoot = body.parentId === null;
  if (wasRoot !== willBeRoot) {
    const message = 'Não é possível alterar o papel hierárquico da categoria.';
    throw new AppError(CategoryErrorCode.roleImmutable, message, 422, [
      { field: 'parentId', code: CategoryErrorCode.roleImmutable, message },
    ]);
  }

  // Moving a sub-category: the new parent must be a root in the same group.
  if (body.parentId !== null) {
    await assertParentIsRoot(body.parentId, groupId);
  }

  return prisma.$transaction(async (tx) => {
    try {
      return await categoryRepository.updateByIdInGroup(
        id,
        groupId,
        { name: body.name, parentId: body.parentId },
        tx,
      );
    } catch (err) {
      if (isPrismaErrorCode(err, 'P2002')) throw duplicateNameError();
      throw err;
    }
  });
}
