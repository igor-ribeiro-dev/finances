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
  paidByMember: { id: string; name: string; familyGroupId: string } | null;
  paymentMethod: PaymentMethod | null;
  expenseId: string | null;
  createdAt: Date;
  updatedAt: Date;
};

const billInclude = {
  ownerMember: { select: { id: true, name: true, familyGroupId: true } },
  paidByMember: { select: { id: true, name: true, familyGroupId: true } },
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
  expenseId?: string | null;
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
        status: 'PENDING',
        categoryId: data.categoryId ?? null,
        ownerMemberId: data.ownerMemberId ?? null,
        recurringBillId: data.recurringBillId ?? null,
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

  async findByExpenseId(expenseId: string): Promise<{ id: string } | null> {
    return prisma.bill.findFirst({
      where: { expenseId },
      select: { id: true },
    });
  },

  async createMany(rows: CreateManyBillRow[], skipDuplicates: boolean): Promise<{ count: number }> {
    return prisma.bill.createMany({ data: rows, skipDuplicates });
  },
};
