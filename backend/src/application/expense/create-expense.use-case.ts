import { AppError, IdempotencyErrorCode } from '../../api/errors';
import { prisma } from '../../infra/prisma';
import {
  expenseRepository,
  type ExpenseWithOwner,
  type CreateExpenseData,
} from '../../domain/expense/expense.repository';
import { idempotencyRepository } from '../../domain/expense/idempotency.repository';
import { CATEGORY_REMOVED_CONCURRENTLY, isCategoryFkViolation } from './expense-helpers';

export interface CreateExpenseInput {
  userId: string;
  groupId: string;
  idempotencyKey?: string;
  body: {
    amountCents: number;
    date: string; // YYYY-MM-DD
    description: string;
    paymentMethod: 'CASH_OR_DEBIT' | 'CREDIT_CARD';
    ownerMemberId: string;
    categoryId?: string | null;
  };
}

export type CreateExpenseResult =
  | { status: 'created'; expense: ExpenseWithOwner; warnings: string[] }
  | { status: 'replay'; expense: ExpenseWithOwner; warnings: string[] };

export async function createExpenseUseCase(
  input: CreateExpenseInput,
): Promise<CreateExpenseResult> {
  const { userId, groupId, idempotencyKey, body } = input;

  // Idempotency replay check (before any work) — polymorphic matrix (FR-016)
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
      if (existing.resourceType !== 'EXPENSE') {
        throw new AppError(
          IdempotencyErrorCode.crossResourceConflict,
          'Esta chave de idempotência já foi usada para outro tipo de recurso.',
          409,
        );
      }
      const expense = await expenseRepository.findById(existing.resourceId);
      if (expense) {
        return { status: 'replay', expense, warnings: [] };
      }
      // If the original expense was deleted, fall through and create a new one.
    }
  }

  // Validate owner belongs to caller's group
  const owner = await prisma.user.findFirst({
    where: { id: body.ownerMemberId, familyGroupId: groupId },
    select: { id: true },
  });
  if (!owner) {
    const err = new AppError(
      'owner_not_in_group',
      'Membro responsável não pertence ao seu grupo familiar.',
    );
    (err as AppError & { field?: string }).field = 'ownerMemberId';
    throw err;
  }

  const data: CreateExpenseData = {
    groupId,
    amountCents: body.amountCents,
    date: new Date(`${body.date}T00:00:00Z`),
    description: body.description.trim(),
    paymentMethod: body.paymentMethod,
    ownerMemberId: body.ownerMemberId,
    categoryId: body.categoryId ?? null,
    createdById: userId,
    updatedById: userId,
  };

  // Atomic: create Expense + IdempotencyKey together (when key was provided).
  // FR-018: if the categoryId was deleted between picker render and submit, the
  // FK (P2003) fires — retry once with categoryId=null and surface a warning.
  const { expense, warnings } = await prisma.$transaction(async (tx) => {
    const warns: string[] = [];
    let created: ExpenseWithOwner;
    try {
      created = await expenseRepository.create(data, tx);
    } catch (err) {
      if (data.categoryId !== null && isCategoryFkViolation(err)) {
        created = await expenseRepository.create({ ...data, categoryId: null }, tx);
        warns.push(CATEGORY_REMOVED_CONCURRENTLY);
      } else {
        throw err;
      }
    }
    if (idempotencyKey) {
      await idempotencyRepository.save(
        { key: idempotencyKey, userId, resourceType: 'EXPENSE', resourceId: created.id },
        tx,
      );
    }
    return { expense: created, warnings: warns };
  });

  return { status: 'created', expense, warnings };
}
