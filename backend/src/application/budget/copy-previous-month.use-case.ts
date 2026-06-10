import type { Prisma } from '@prisma/client';
import { prisma } from '../../infra/prisma';
import {
  budgetRepository,
  monthStringToDate,
  targetKeyOf,
} from '../../domain/budget/budget.repository';
import { readMonthBudget } from './get-month-budget.use-case';
import type { MonthBudget } from '../../api/budget/budget.serializer';

export interface CopyPreviousMonthInput {
  groupId: string;
  fromMonth: string;
  toMonth: string;
}

export interface CopyResult extends MonthBudget {
  copiedCount: number;
}

/**
 * Non-destructive copy (FR-014): inserts into `toMonth` only the targets that have
 * NO budget there yet, copying their type/value from `fromMonth`. Existing toMonth
 * budgets are preserved. Naturally idempotent (a retry copies nothing → 0).
 */
export async function copyPreviousMonthUseCase(input: CopyPreviousMonthInput): Promise<CopyResult> {
  const { groupId, fromMonth, toMonth } = input;
  const fromDate = monthStringToDate(fromMonth);
  const toDate = monthStringToDate(toMonth);

  const [fromRows, toRows] = await Promise.all([
    budgetRepository.findByGroupMonth(groupId, fromDate),
    budgetRepository.findByGroupMonth(groupId, toDate),
  ]);

  const existing = new Set(toRows.map(targetKeyOf));
  const toInsert: Prisma.BudgetCreateManyInput[] = fromRows
    .filter((r) => !existing.has(targetKeyOf(r)))
    .map((r) => ({
      groupId,
      month: toDate,
      targetType: r.targetType,
      targetMemberId: r.targetMemberId,
      targetCategoryId: r.targetCategoryId,
      limitType: r.limitType,
      amountCents: r.amountCents,
      percent: r.percent,
    }));

  let copiedCount = 0;
  if (toInsert.length > 0) {
    copiedCount = await prisma.$transaction((tx: Prisma.TransactionClient) =>
      budgetRepository.createMany(tx, toInsert),
    );
  }

  const picture = await readMonthBudget(groupId, toMonth);
  return { ...picture, copiedCount };
}
