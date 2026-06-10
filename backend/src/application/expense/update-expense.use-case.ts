import { AppError } from '../../api/errors';
import { prisma } from '../../infra/prisma';
import {
  expenseRepository,
  type ExpenseWithOwner,
  type UpdateExpenseData,
} from '../../domain/expense/expense.repository';
import { CATEGORY_REMOVED_CONCURRENTLY, isCategoryFkViolation } from './expense-helpers';

export interface UpdateExpenseInput {
  userId: string;
  groupId: string;
  id: string;
  body: {
    amountCents: number;
    date: string;
    description: string;
    paymentMethod: 'CASH_OR_DEBIT' | 'CREDIT_CARD';
    ownerMemberId: string;
    categoryId?: string | null;
  };
}

export interface UpdateExpenseResult {
  expense: ExpenseWithOwner;
  warnings: string[];
}

export async function updateExpenseUseCase(
  input: UpdateExpenseInput,
): Promise<UpdateExpenseResult> {
  const existing = await expenseRepository.findByIdInGroup(input.id, input.groupId);
  if (!existing) throw new AppError('not_found', 'Despesa não encontrada.');

  const owner = await prisma.user.findFirst({
    where: { id: input.body.ownerMemberId, familyGroupId: input.groupId },
    select: { id: true },
  });
  if (!owner) {
    throw new AppError(
      'owner_not_in_group',
      'Membro responsável não pertence ao seu grupo familiar.',
    );
  }

  const data: UpdateExpenseData = {
    amountCents: input.body.amountCents,
    date: new Date(`${input.body.date}T00:00:00Z`),
    description: input.body.description.trim(),
    paymentMethod: input.body.paymentMethod,
    ownerMemberId: input.body.ownerMemberId,
    categoryId: input.body.categoryId ?? null,
    updatedById: input.userId,
  };

  // FR-018: same concurrent-removal recovery as create — retry once with null.
  const warnings: string[] = [];
  try {
    const expense = await expenseRepository.update(input.id, data);
    return { expense, warnings };
  } catch (err) {
    if (data.categoryId !== null && isCategoryFkViolation(err)) {
      const expense = await expenseRepository.update(input.id, { ...data, categoryId: null });
      warnings.push(CATEGORY_REMOVED_CONCURRENTLY);
      return { expense, warnings };
    }
    throw err;
  }
}
