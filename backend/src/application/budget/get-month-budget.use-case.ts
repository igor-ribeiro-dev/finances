import { prisma } from '../../infra/prisma';
import { budgetRepository, monthStringToDate } from '../../domain/budget/budget.repository';
import { buildMonthBudget, type MonthBudget } from '../../api/budget/budget.serializer';

export interface GetMonthBudgetInput {
  groupId: string;
  month: string; // YYYY-MM
}

/**
 * Reads the full budget picture for a (group, month): family + CURRENT members +
 * category tree, with every percentage resolved and advisory warnings computed.
 * Shared by the GET endpoint, the PUT response and the copy response.
 */
export async function readMonthBudget(groupId: string, month: string): Promise<MonthBudget> {
  const monthDate = monthStringToDate(month);
  const [rows, members, categories] = await Promise.all([
    budgetRepository.findByGroupMonth(groupId, monthDate),
    // Only CURRENT members of the group (ex-members are excluded — their stale
    // budget rows simply do not appear, per the spec edge case).
    prisma.user.findMany({
      where: { familyGroupId: groupId },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    }),
    prisma.category.findMany({
      where: { groupId },
      select: { id: true, name: true, parentId: true },
      orderBy: { name: 'asc' },
    }),
  ]);

  return buildMonthBudget({ month, rows, members, categories });
}

export async function getMonthBudgetUseCase(input: GetMonthBudgetInput): Promise<MonthBudget> {
  return readMonthBudget(input.groupId, input.month);
}
