import type { Category } from '@prisma/client';
import { AppError, IdempotencyErrorCode } from '../../api/errors';
import { prisma } from '../../infra/prisma';
import { categoryRepository } from '../../domain/category/category.repository';
import { idempotencyRepository } from '../../domain/idempotency/idempotency.repository';
import { assertParentIsRoot, duplicateNameError, isPrismaErrorCode } from './category-helpers';

export interface CreateCategoryInput {
  userId: string;
  groupId: string;
  idempotencyKey?: string;
  body: { name: string; parentId: string | null };
}

export type CreateCategoryResult =
  | { status: 'created'; category: Category }
  | { status: 'replay'; category: Category };

export async function createCategoryUseCase(
  input: CreateCategoryInput,
): Promise<CreateCategoryResult> {
  const { userId, groupId, idempotencyKey, body } = input;

  // Idempotency replay check — polymorphic matrix (FR-016)
  if (idempotencyKey) {
    const existing = await idempotencyRepository.findByKey(idempotencyKey);
    if (existing) {
      if (existing.userId !== userId) {
        throw new AppError(
          IdempotencyErrorCode.conflict,
          'Esta chave de idempotência já foi usada por outro usuário.',
          409,
        );
      }
      if (existing.resourceType !== 'CATEGORY') {
        throw new AppError(
          IdempotencyErrorCode.crossResourceConflict,
          'Esta chave de idempotência já foi usada para outro tipo de recurso.',
          409,
        );
      }
      const category = await categoryRepository.findByIdInGroup(existing.resourceId, groupId);
      if (category) {
        return { status: 'replay', category };
      }
      // Original category was deleted — fall through and create a new one.
    }
  }

  // FR-011: validate parent points to a root in the same group (sub-categories only)
  if (body.parentId !== null) {
    await assertParentIsRoot(body.parentId, groupId);
  }

  // Atomic: create Category + IdempotencyKey together. DB-enforced uniqueness
  // (P2002) is mapped to category.duplicate_name (race-safe, FR-005/FR-028).
  const category = await prisma.$transaction(async (tx) => {
    let created: Category;
    try {
      created = await categoryRepository.create(
        { groupId, name: body.name, parentId: body.parentId },
        tx,
      );
    } catch (err) {
      if (isPrismaErrorCode(err, 'P2002')) throw duplicateNameError();
      throw err;
    }
    if (idempotencyKey) {
      await idempotencyRepository.save(
        { key: idempotencyKey, userId, resourceType: 'CATEGORY', resourceId: created.id },
        tx,
      );
    }
    return created;
  });

  return { status: 'created', category };
}
