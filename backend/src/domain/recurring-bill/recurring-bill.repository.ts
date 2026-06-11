import { prisma } from '../../infra/prisma';

export type RecurrenceInterval = 'MONTHLY' | 'ANNUAL';
export type RecurringBillStatus = 'ACTIVE' | 'PAUSED' | 'STOPPED';

export interface RecurringBillCategoryRef {
  id: string;
  name: string;
  parentId: string | null;
  parent: { id: string; name: string } | null;
}

export type RecurringBillWithRelations = {
  id: string;
  groupId: string;
  description: string;
  expectedAmountCents: number;
  dueDay: number;
  interval: RecurrenceInterval;
  startMonth: Date;
  activeFromMonth: Date;
  status: RecurringBillStatus;
  categoryId: string | null;
  category: RecurringBillCategoryRef | null;
  ownerMemberId: string | null;
  ownerMember: { id: string; name: string; familyGroupId: string } | null;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

const recurringBillInclude = {
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

export interface CreateRecurringBillData {
  groupId: string;
  description: string;
  expectedAmountCents: number;
  dueDay: number;
  interval: RecurrenceInterval;
  startMonth: Date;
  activeFromMonth: Date;
  categoryId?: string | null;
  ownerMemberId?: string | null;
}

export interface UpdateRecurringBillData {
  description?: string;
  expectedAmountCents?: number;
  dueDay?: number;
  interval?: RecurrenceInterval;
  categoryId?: string | null;
  ownerMemberId?: string | null;
  status?: RecurringBillStatus;
  activeFromMonth?: Date;
  deletedAt?: Date | null;
}

export const recurringBillRepository = {
  async create(data: CreateRecurringBillData): Promise<RecurringBillWithRelations> {
    return prisma.recurringBill.create({
      data: {
        groupId: data.groupId,
        description: data.description,
        expectedAmountCents: data.expectedAmountCents,
        dueDay: data.dueDay,
        interval: data.interval,
        startMonth: data.startMonth,
        activeFromMonth: data.activeFromMonth,
        categoryId: data.categoryId ?? null,
        ownerMemberId: data.ownerMemberId ?? null,
      },
      include: recurringBillInclude,
    }) as Promise<RecurringBillWithRelations>;
  },

  async findById(id: string, groupId: string): Promise<RecurringBillWithRelations | null> {
    return prisma.recurringBill.findFirst({
      where: { id, groupId, deletedAt: null },
      include: recurringBillInclude,
    }) as Promise<RecurringBillWithRelations | null>;
  },

  async listByGroup(groupId: string): Promise<RecurringBillWithRelations[]> {
    return prisma.recurringBill.findMany({
      where: { groupId, deletedAt: null },
      orderBy: [{ createdAt: 'asc' }],
      include: recurringBillInclude,
    }) as Promise<RecurringBillWithRelations[]>;
  },

  async listAllActive(): Promise<RecurringBillWithRelations[]> {
    return prisma.recurringBill.findMany({
      where: { status: 'ACTIVE', deletedAt: null },
      include: recurringBillInclude,
    }) as Promise<RecurringBillWithRelations[]>;
  },

  async update(id: string, data: UpdateRecurringBillData): Promise<RecurringBillWithRelations> {
    return prisma.recurringBill.update({
      where: { id },
      data,
      include: recurringBillInclude,
    }) as Promise<RecurringBillWithRelations>;
  },

  async softDelete(id: string): Promise<void> {
    await prisma.recurringBill.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  },

  async cancelFuturePendingInstances(recurringBillId: string, afterMonth: Date): Promise<number> {
    const result = await prisma.bill.updateMany({
      where: {
        recurringBillId,
        status: 'PENDING',
        month: { gt: afterMonth },
      },
      data: { status: 'CANCELLED' },
    });
    return result.count;
  },
};
