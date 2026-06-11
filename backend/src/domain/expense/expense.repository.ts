import type { Prisma, Expense, User } from '@prisma/client';
import { prisma } from '../../infra/prisma';

/** Minimal category reference embedded on an expense (denormalization source). */
export interface ExpenseCategoryRef {
  id: string;
  name: string;
  parentId: string | null;
  parent: { id: string; name: string } | null;
}

export type ExpenseWithOwner = Expense & {
  ownerMember: Pick<User, 'id' | 'name' | 'familyGroupId'>;
  category: ExpenseCategoryRef | null;
};

export interface CreateExpenseData {
  groupId: string;
  amountCents: number;
  date: Date;
  description: string;
  paymentMethod: 'CASH_OR_DEBIT' | 'CREDIT_CARD';
  ownerMemberId: string;
  categoryId: string | null;
  createdById: string;
  updatedById: string;
}

export interface UpdateExpenseData {
  amountCents: number;
  date: Date;
  description: string;
  paymentMethod: 'CASH_OR_DEBIT' | 'CREDIT_CARD';
  ownerMemberId: string;
  categoryId: string | null;
  updatedById: string;
}

/** Aggregated month spending in integer cents (feature 009 dashboard read-model). */
export interface MonthSpendingAggregate {
  byMember: { ownerMemberId: string; spentCents: number }[];
  byCategory: { categoryId: string | null; spentCents: number }[];
}

/** `YYYY-MM` → civil-date range `[month-01, next-month-01)` (UTC, no tz math). */
export function monthDateRange(month: string): { gte: Date; lt: Date } {
  const [y, m] = month.split('-').map(Number);
  return {
    gte: new Date(Date.UTC(y as number, (m as number) - 1, 1)),
    lt: new Date(Date.UTC(y as number, m as number, 1)),
  };
}

// Single SQL query with a double LEFT JOIN (category + its parent root) — FR-026,
// zero N+1. parent is only present for sub-categories.
const ownerMemberInclude = {
  ownerMember: { select: { id: true, name: true, familyGroupId: true } },
  category: {
    select: {
      id: true,
      name: true,
      parentId: true,
      parent: { select: { id: true, name: true } },
    },
  },
} as const;

export const expenseRepository = {
  async create(data: CreateExpenseData, tx?: Prisma.TransactionClient): Promise<ExpenseWithOwner> {
    const client = tx ?? prisma;
    return client.expense.create({ data, include: ownerMemberInclude });
  },

  async findById(id: string): Promise<ExpenseWithOwner | null> {
    return prisma.expense.findUnique({ where: { id }, include: ownerMemberInclude });
  },

  async findByIdInGroup(id: string, groupId: string): Promise<ExpenseWithOwner | null> {
    return prisma.expense.findFirst({
      where: { id, groupId },
      include: ownerMemberInclude,
    });
  },

  async listByGroupWithCursor(
    groupId: string,
    limit: number,
    cursor?: { date: string; id: string },
  ): Promise<ExpenseWithOwner[]> {
    return prisma.expense.findMany({
      where: {
        groupId,
        ...(cursor
          ? {
              OR: [
                { date: { lt: new Date(cursor.date) } },
                { date: new Date(cursor.date), id: { lt: cursor.id } },
              ],
            }
          : {}),
      },
      orderBy: [{ date: 'desc' }, { id: 'desc' }],
      take: limit,
      include: ownerMemberInclude,
    });
  },

  async update(id: string, data: UpdateExpenseData): Promise<ExpenseWithOwner> {
    return prisma.expense.update({ where: { id }, data, include: ownerMemberInclude });
  },

  async delete(id: string): Promise<void> {
    await prisma.expense.delete({ where: { id } });
  },

  /**
   * Month spending sums by owner member and by category (feature 009, research R3).
   * Two index-range groupBy queries over (groupId, date); SUM runs in Postgres on
   * the INTEGER cents column — exact integer arithmetic (Constitution III).
   */
  async aggregateMonthSpending(groupId: string, month: string): Promise<MonthSpendingAggregate> {
    const where = { groupId, date: monthDateRange(month) };
    const [byMember, byCategory] = await Promise.all([
      prisma.expense.groupBy({ by: ['ownerMemberId'], where, _sum: { amountCents: true } }),
      prisma.expense.groupBy({ by: ['categoryId'], where, _sum: { amountCents: true } }),
    ]);
    return {
      byMember: byMember.map((r) => ({
        ownerMemberId: r.ownerMemberId,
        spentCents: r._sum.amountCents ?? 0,
      })),
      byCategory: byCategory.map((r) => ({
        categoryId: r.categoryId,
        spentCents: r._sum.amountCents ?? 0,
      })),
    };
  },
};
