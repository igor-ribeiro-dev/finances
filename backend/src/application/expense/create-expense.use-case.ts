import { AppError } from '../../api/errors';
import { prisma } from '../../infra/prisma';
import {
  expenseRepository,
  type ExpenseWithOwner,
  type CreateExpenseData,
} from '../../domain/expense/expense.repository';
import { idempotencyRepository } from '../../domain/expense/idempotency.repository';

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
  };
}

export type CreateExpenseResult =
  | { status: 'created'; expense: ExpenseWithOwner }
  | { status: 'replay'; expense: ExpenseWithOwner };

export async function createExpenseUseCase(
  input: CreateExpenseInput,
): Promise<CreateExpenseResult> {
  const { userId, groupId, idempotencyKey, body } = input;

  // Idempotency replay check (before any work)
  if (idempotencyKey) {
    const existing = await idempotencyRepository.findByKey(idempotencyKey);
    if (existing) {
      if (existing.userId !== userId) {
        throw new AppError(
          'idempotency_key_conflict',
          'Esta chave de idempotência já foi usada por outro usuário.',
        );
      }
      const expense = await expenseRepository.findById(existing.expenseId);
      if (expense) {
        return { status: 'replay', expense };
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
    createdById: userId,
    updatedById: userId,
  };

  // Atomic: create Expense + IdempotencyKey together (when key was provided)
  const expense = await prisma.$transaction(async (tx) => {
    const created = await expenseRepository.create(data, tx);
    if (idempotencyKey) {
      await idempotencyRepository.save({ key: idempotencyKey, userId, expenseId: created.id }, tx);
    }
    return created;
  });

  return { status: 'created', expense };
}
