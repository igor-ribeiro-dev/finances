import { prisma } from '../../infra/prisma';
import { billRepository } from '../../domain/bill/bill.repository';
import { readMonthBudget } from '../budget/get-month-budget.use-case';
import { buildMonthDashboard, type MonthDashboard } from './dashboard-aggregator';

export interface GetMonthDashboardInput {
  groupId: string;
  month: string; // YYYY-MM
}

/**
 * Composes the month dashboard read-model (feature 009, research R1/R2):
 * spending sums (two groupBy queries) × resolved budget limits (feature 008),
 * merged by the pure aggregator. Recomputed on every call — no snapshots.
 */
export async function getMonthDashboardUseCase(
  input: GetMonthDashboardInput,
): Promise<MonthDashboard> {
  const { groupId, month } = input;

  const [monthBudget, spending] = await Promise.all([
    readMonthBudget(groupId, month),
    billRepository.aggregateMonthSpending(groupId, month),
  ]);

  // Bill payers that are no longer group members (Clarification Q2) — their
  // names survive on historical PAID bills, fetched here by id.
  const activeIds = new Set(monthBudget.members.map((m) => m.memberId));
  const exMemberIds = spending.byMember
    .map((r) => r.ownerMemberId)
    .filter((id) => !activeIds.has(id));
  const exMemberNames: Record<string, string> = {};
  if (exMemberIds.length > 0) {
    const owners = await prisma.user.findMany({
      where: { id: { in: exMemberIds } },
      select: { id: true, name: true },
    });
    for (const o of owners) exMemberNames[o.id] = o.name;
  }

  return buildMonthDashboard({
    month,
    familyBudget: monthBudget.family,
    activeMembers: monthBudget.members.map((m) => ({
      memberId: m.memberId,
      name: m.name,
      budget: m.budget,
    })),
    categories: monthBudget.categories.map((c) => ({
      categoryId: c.categoryId,
      name: c.name,
      parentId: c.parentId,
      budget: c.budget,
    })),
    byMember: spending.byMember,
    byCategory: spending.byCategory,
    exMemberNames,
  });
}
