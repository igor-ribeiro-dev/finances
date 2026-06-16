import type { Prisma } from '@prisma/client';
import { prisma } from '../../infra/prisma';

export type BillStatus = 'PENDING' | 'PAID' | 'CANCELLED';
export type PaymentMethod = 'CASH_OR_DEBIT' | 'CREDIT_CARD';

export interface BillCategoryRef {
  id: string;
  name: string;
  parentId: string | null;
  parent: { id: string; name: string } | null;
}

export type BillWithRelations = {
  id: string;
  groupId: string;
  description: string;
  expectedAmountCents: number;
  dueDate: Date;
  month: Date;
  status: BillStatus;
  categoryId: string | null;
  category: BillCategoryRef | null;
  ownerMemberId: string | null;
  ownerMember: { id: string; name: string; familyGroupId: string } | null;
  recurringBillId: string | null;
  paidDate: Date | null;
  actualAmountCents: number | null;
  paidByMemberId: string | null;
  paidByMember: { id: string; name: string } | null;
  paymentMethod: PaymentMethod | null;
  createdById: string | null;
  updatedById: string | null;
  createdAt: Date;
  updatedAt: Date;
};

const billInclude = {
  ownerMember: { select: { id: true, name: true, familyGroupId: true } },
  paidByMember: { select: { id: true, name: true } },
  category: {
    select: {
      id: true,
      name: true,
      parentId: true,
      parent: { select: { id: true, name: true } },
    },
  },
} as const;

export interface CreateBillData {
  groupId: string;
  description: string;
  expectedAmountCents: number;
  dueDate: Date;
  month: Date;
  categoryId?: string | null;
  ownerMemberId?: string | null;
  recurringBillId?: string | null;
  createdById?: string | null;
  updatedById?: string | null;
  /** When set, creates the bill directly as PAID (used by log-spending). */
  status?: BillStatus;
  paidDate?: Date | null;
  actualAmountCents?: number | null;
  paidByMemberId?: string | null;
  paymentMethod?: PaymentMethod | null;
}

export interface UpdateBillData {
  description?: string;
  expectedAmountCents?: number;
  dueDate?: Date;
  month?: Date;
  categoryId?: string | null;
  ownerMemberId?: string | null;
  status?: BillStatus;
  paidDate?: Date | null;
  actualAmountCents?: number | null;
  paidByMemberId?: string | null;
  paymentMethod?: PaymentMethod | null;
  updatedById?: string | null;
}

export interface CreateManyBillRow {
  groupId: string;
  description: string;
  expectedAmountCents: number;
  dueDate: Date;
  month: Date;
  status: BillStatus;
  categoryId: string | null;
  ownerMemberId: string | null;
  recurringBillId: string | null;
}

/** Month spending sums in integer cents for the dashboard (feature 009/011). */
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

export const billRepository = {
  async create(data: CreateBillData, tx?: Prisma.TransactionClient): Promise<BillWithRelations> {
    const client = tx ?? prisma;
    return client.bill.create({
      data: {
        groupId: data.groupId,
        description: data.description,
        expectedAmountCents: data.expectedAmountCents,
        dueDate: data.dueDate,
        month: data.month,
        status: data.status ?? 'PENDING',
        categoryId: data.categoryId ?? null,
        ownerMemberId: data.ownerMemberId ?? null,
        recurringBillId: data.recurringBillId ?? null,
        createdById: data.createdById ?? null,
        updatedById: data.updatedById ?? null,
        paidDate: data.paidDate ?? null,
        actualAmountCents: data.actualAmountCents ?? null,
        paidByMemberId: data.paidByMemberId ?? null,
        paymentMethod: data.paymentMethod ?? null,
      },
      include: billInclude,
    }) as Promise<BillWithRelations>;
  },

  async findById(id: string, groupId: string): Promise<BillWithRelations | null> {
    return prisma.bill.findFirst({
      where: { id, groupId },
      include: billInclude,
    }) as Promise<BillWithRelations | null>;
  },

  async listByMonth(groupId: string, month: Date): Promise<BillWithRelations[]> {
    return prisma.bill.findMany({
      where: { groupId, month },
      orderBy: [{ dueDate: 'asc' }, { createdAt: 'asc' }],
      include: billInclude,
    }) as Promise<BillWithRelations[]>;
  },

  async update(
    id: string,
    data: UpdateBillData,
    tx?: Prisma.TransactionClient,
  ): Promise<BillWithRelations> {
    const client = tx ?? prisma;
    return client.bill.update({
      where: { id },
      data,
      include: billInclude,
    }) as Promise<BillWithRelations>;
  },

  async updateStatus(
    id: string,
    status: BillStatus,
    tx?: Prisma.TransactionClient,
  ): Promise<BillWithRelations> {
    const client = tx ?? prisma;
    return client.bill.update({
      where: { id },
      data: { status },
      include: billInclude,
    }) as Promise<BillWithRelations>;
  },

  async delete(id: string): Promise<void> {
    await prisma.bill.delete({ where: { id } });
  },

  async createMany(rows: CreateManyBillRow[], skipDuplicates: boolean): Promise<{ count: number }> {
    return prisma.bill.createMany({ data: rows, skipDuplicates });
  },

  /**
   * Month spending sums by payer member and by category (feature 011, dashboard).
   * Two groupBy queries over PAID bills filtered by paidDate in the month.
   * Uses the new (groupId, paidDate) index for performance parity with the old
   * expense_group_date_id_idx.
   */
  async aggregateMonthSpending(groupId: string, month: string): Promise<MonthSpendingAggregate> {
    const range = monthDateRange(month);
    const where = { groupId, status: 'PAID' as const, paidDate: range };
    const [byMember, byCategory] = await Promise.all([
      prisma.bill.groupBy({
        by: ['paidByMemberId'],
        where,
        _sum: { actualAmountCents: true },
      }),
      prisma.bill.groupBy({
        by: ['categoryId'],
        where,
        _sum: { actualAmountCents: true },
      }),
    ]);
    return {
      byMember: byMember
        .filter((r) => r.paidByMemberId !== null)
        .map((r) => ({
          ownerMemberId: r.paidByMemberId as string,
          spentCents: r._sum.actualAmountCents ?? 0,
        })),
      byCategory: byCategory.map((r) => ({
        categoryId: r.categoryId,
        spentCents: r._sum.actualAmountCents ?? 0,
      })),
    };
  },
};
