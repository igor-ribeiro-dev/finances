import type { Prisma } from '@prisma/client';
import { AppError, BudgetErrorCode } from '../../api/errors';
import { prisma } from '../../infra/prisma';
import {
  budgetRepository,
  monthStringToDate,
  type BudgetTargetKey,
} from '../../domain/budget/budget.repository';
import type { LimitInput, UpsertMonthBudgetBody } from '../../api/budget/budget.validators';
import { readMonthBudget } from './get-month-budget.use-case';
import type { MonthBudget } from '../../api/budget/budget.serializer';

export interface UpsertMonthBudgetInput {
  groupId: string;
  month: string;
  body: UpsertMonthBudgetBody;
}

interface WriteData {
  limitType: 'ABSOLUTE' | 'PERCENT';
  amountCents: number | null;
  percent: number | null;
}

/** Translate a limit input into a concrete write, or `null` to remove (FR-008: zero = remove). */
function limitToWrite(limit: LimitInput | null): WriteData | null {
  if (limit === null) return null;
  if (limit.limitType === 'ABSOLUTE') {
    return limit.amountCents > 0
      ? { limitType: 'ABSOLUTE', amountCents: limit.amountCents, percent: null }
      : null;
  }
  return limit.percent > 0
    ? { limitType: 'PERCENT', amountCents: null, percent: limit.percent }
    : null;
}

/** Throws budget.target_not_found (404) if any referenced id is outside the group. */
async function assertTargetsInGroup(
  groupId: string,
  memberIds: string[],
  categoryIds: string[],
): Promise<void> {
  if (memberIds.length > 0) {
    const found = await prisma.user.findMany({
      where: { familyGroupId: groupId, id: { in: memberIds } },
      select: { id: true },
    });
    if (found.length !== new Set(memberIds).size) {
      throw new AppError(BudgetErrorCode.targetNotFound, 'Membro não encontrado no grupo.', 404);
    }
  }
  if (categoryIds.length > 0) {
    const found = await prisma.category.findMany({
      where: { groupId, id: { in: categoryIds } },
      select: { id: true },
    });
    if (found.length !== new Set(categoryIds).size) {
      throw new AppError(BudgetErrorCode.targetNotFound, 'Categoria não encontrada no grupo.', 404);
    }
  }
}

/**
 * Bulk upsert for a month. Only targets PRESENT in the body are touched; each is
 * deleted-then-(re)created (upsert via delete+insert under the partial unique
 * index). Zero/null removes the target (FR-008). Returns the resulting picture.
 */
export async function upsertMonthBudgetUseCase(
  input: UpsertMonthBudgetInput,
): Promise<MonthBudget> {
  const { groupId, month, body } = input;
  const monthDate = monthStringToDate(month);

  const memberIds = (body.members ?? []).map((m) => m.memberId);
  const categoryIds = (body.categories ?? []).map((c) => c.categoryId);
  await assertTargetsInGroup(groupId, memberIds, categoryIds);

  await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const apply = async (target: BudgetTargetKey, write: WriteData | null): Promise<void> => {
      await budgetRepository.deleteTarget(tx, groupId, monthDate, target);
      if (write) {
        await budgetRepository.createBudget(tx, groupId, monthDate, { ...target, ...write });
      }
    };

    if (body.family !== undefined) {
      await apply(
        { targetType: 'FAMILY', targetMemberId: null, targetCategoryId: null },
        limitToWrite(body.family),
      );
    }
    for (const m of body.members ?? []) {
      await apply(
        { targetType: 'MEMBER', targetMemberId: m.memberId, targetCategoryId: null },
        limitToWrite(m.budget),
      );
    }
    for (const c of body.categories ?? []) {
      await apply(
        { targetType: 'CATEGORY', targetMemberId: null, targetCategoryId: c.categoryId },
        limitToWrite(c.budget),
      );
    }
  });

  return readMonthBudget(groupId, month);
}
