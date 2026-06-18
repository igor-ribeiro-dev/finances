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
  // Feature 012: credit card link + fatura marker + settlement self-link
  creditCardId: string | null;
  creditCard: { id: string; name: string } | null;
  isFatura: boolean;
  settledByFaturaId: string | null;
  createdAt: Date;
  updatedAt: Date;
};

const billInclude = {
  ownerMember: { select: { id: true, name: true, familyGroupId: true } },
  paidByMember: { select: { id: true, name: true } },
  creditCard: { select: { id: true, name: true } },
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
  // Feature 012
  creditCardId?: string | null;
  isFatura?: boolean;
  settledByFaturaId?: string | null;
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
  // Feature 012
  creditCardId?: string | null;
  isFatura?: boolean;
  settledByFaturaId?: string | null;
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
  // Feature 012: a recurring subscription on a card seeds its instances with the
  // card (PENDING), so paying is one click. Omitted by copy-previous-month.
  creditCardId?: string | null;
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
        creditCardId: data.creditCardId ?? null,
        isFatura: data.isFatura ?? false,
        settledByFaturaId: data.settledByFaturaId ?? null,
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
    const lt = new Date(Date.UTC(month.getUTCFullYear(), month.getUTCMonth() + 1, 1));
    return prisma.bill.findMany({
      where: { groupId, month: { gte: month, lt } },
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

  /**
   * Snapshot settlement (FR-009): mark every currently-open credit-card purchase
   * of the card as settled by this fatura. Returns the number of charges settled.
   */
  async settleOpenCharges(
    creditCardId: string,
    faturaId: string,
    groupId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<number> {
    const client = tx ?? prisma;
    const res = await client.bill.updateMany({
      where: {
        groupId,
        creditCardId,
        isFatura: false,
        paymentMethod: 'CREDIT_CARD',
        status: 'PAID',
        settledByFaturaId: null,
      },
      data: { settledByFaturaId: faturaId },
    });
    return res.count;
  },

  /** Reverses a fatura's settlement (FR-009): clears exactly the charges it settled. */
  async unsettleByFatura(faturaId: string, tx?: Prisma.TransactionClient): Promise<number> {
    const client = tx ?? prisma;
    const res = await client.bill.updateMany({
      where: { settledByFaturaId: faturaId },
      data: { settledByFaturaId: null },
    });
    return res.count;
  },

  /** Count of PENDING faturas for a card — guards FR-012a (one pending fatura). */
  async countPendingFaturas(creditCardId: string, groupId: string): Promise<number> {
    return prisma.bill.count({
      where: { groupId, creditCardId, isFatura: true, status: 'PENDING' },
    });
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
    // isFatura excluded (FR-010): a paid fatura is a cash event whose child
    // credit-card purchases already counted at their purchase date — counting
    // the fatura too would double-count.
    const where = { groupId, status: 'PAID' as const, paidDate: range, isFatura: false };
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
