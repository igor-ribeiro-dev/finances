import type { Prisma, Budget, BudgetTargetType, BudgetLimitType } from '@prisma/client';
import { prisma } from '../../infra/prisma';

/** A target identity within a (group, month). */
export interface BudgetTargetKey {
  targetType: BudgetTargetType;
  targetMemberId: string | null;
  targetCategoryId: string | null;
}

export interface BudgetWriteData extends BudgetTargetKey {
  limitType: BudgetLimitType;
  amountCents: number | null;
  percent: number | null;
}

/** `YYYY-MM` → DATE at the first day of the month (UTC). */
export function monthStringToDate(month: string): Date {
  const [y, m] = month.split('-').map(Number);
  return new Date(Date.UTC(y as number, (m as number) - 1, 1));
}

/** DATE → `YYYY-MM` (UTC). */
export function dateToMonthString(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

/** The calendar month immediately before `month` (`YYYY-MM`), handling year wrap. */
export function previousMonthString(month: string): string {
  const [y, m] = month.split('-').map(Number);
  const date = new Date(Date.UTC(y as number, (m as number) - 1, 1));
  date.setUTCMonth(date.getUTCMonth() - 1);
  return dateToMonthString(date);
}

/** Stable string key for a target (used to diff / dedupe). */
export function targetKeyOf(t: BudgetTargetKey): string {
  return `${t.targetType}:${t.targetMemberId ?? ''}:${t.targetCategoryId ?? ''}`;
}

export const budgetRepository = {
  /** All budget rows for a group in a given month. */
  async findByGroupMonth(groupId: string, monthDate: Date): Promise<Budget[]> {
    return prisma.budget.findMany({ where: { groupId, month: monthDate } });
  },

  /** Remove the row(s) for an exact target within (group, month). */
  async deleteTarget(
    tx: Prisma.TransactionClient,
    groupId: string,
    monthDate: Date,
    target: BudgetTargetKey,
  ): Promise<void> {
    await tx.budget.deleteMany({
      where: {
        groupId,
        month: monthDate,
        targetType: target.targetType,
        targetMemberId: target.targetMemberId,
        targetCategoryId: target.targetCategoryId,
      },
    });
  },

  /** Insert a budget row. Caller deletes any prior row for the target first. */
  async createBudget(
    tx: Prisma.TransactionClient,
    groupId: string,
    monthDate: Date,
    data: BudgetWriteData,
  ): Promise<void> {
    await tx.budget.create({
      data: {
        groupId,
        month: monthDate,
        targetType: data.targetType,
        targetMemberId: data.targetMemberId,
        targetCategoryId: data.targetCategoryId,
        limitType: data.limitType,
        amountCents: data.amountCents,
        percent: data.percent,
      },
    });
  },

  /** Bulk insert (used by the non-destructive copy). */
  async createMany(
    tx: Prisma.TransactionClient,
    rows: Prisma.BudgetCreateManyInput[],
  ): Promise<number> {
    if (rows.length === 0) return 0;
    const result = await tx.budget.createMany({ data: rows });
    return result.count;
  },
};
