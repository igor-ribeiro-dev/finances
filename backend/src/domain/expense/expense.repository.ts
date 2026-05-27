import type { Prisma, Expense, User } from '@prisma/client';
import { prisma } from '../../infra/prisma';

export type ExpenseWithOwner = Expense & {
  ownerMember: Pick<User, 'id' | 'name' | 'familyGroupId'>;
};

export interface CreateExpenseData {
  groupId: string;
  amountCents: number;
  date: Date;
  description: string;
  paymentMethod: 'CASH_OR_DEBIT' | 'CREDIT_CARD';
  ownerMemberId: string;
  createdById: string;
  updatedById: string;
}

export interface UpdateExpenseData {
  amountCents: number;
  date: Date;
  description: string;
  paymentMethod: 'CASH_OR_DEBIT' | 'CREDIT_CARD';
  ownerMemberId: string;
  updatedById: string;
}

const ownerMemberInclude = {
  ownerMember: { select: { id: true, name: true, familyGroupId: true } },
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
};
