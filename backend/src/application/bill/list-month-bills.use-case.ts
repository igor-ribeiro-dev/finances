import { prisma } from '../../infra/prisma';
import { billRepository } from '../../domain/bill/bill.repository';
import { computeBillSummary } from './bill-summary';
import type { RecurringBillWithRelations } from '../../domain/recurring-bill/recurring-bill.repository';
import { projectBills } from '../recurring-bill/project-bills';

export interface ListMonthBillsInput {
  groupId: string;
  month: string; // YYYY-MM
}

function monthDateRange(month: string): { gte: Date; lt: Date } {
  const [y, m] = month.split('-').map(Number);
  return {
    gte: new Date(Date.UTC(y as number, (m as number) - 1, 1)),
    lt: new Date(Date.UTC(y as number, m as number, 1)),
  };
}

function isOverdue(dueDate: Date, status: string): boolean {
  if (status !== 'PENDING') return false;
  return dueDate < new Date();
}

function toIsoDate(d: Date): string {
  const y = d.getUTCFullYear();
  const mo = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${mo}-${day}`;
}

export async function listMonthBillsUseCase(input: ListMonthBillsInput) {
  const { gte } = monthDateRange(input.month);
  const monthDate = gte; // first of month

  const bills = await billRepository.listByMonth(input.groupId, monthDate);

  // Compute projections: active recurring templates without a persisted instance this month
  const templates = await prisma.recurringBill.findMany({
    where: { groupId: input.groupId, status: 'ACTIVE', deletedAt: null },
    include: {
      ownerMember: { select: { id: true, name: true, familyGroupId: true } },
      category: {
        select: {
          id: true,
          name: true,
          parentId: true,
          parent: { select: { id: true, name: true } },
        },
      },
    },
  });

  const persistedRecurringIds = new Set(
    bills.map((b) => b.recurringBillId).filter(Boolean) as string[],
  );

  const projectedBills = projectBills(
    templates as RecurringBillWithRelations[],
    persistedRecurringIds,
    monthDate,
  );

  const projectedCents = projectedBills.reduce((s, p) => s + p.expectedAmountCents, 0);
  const summary = computeBillSummary(bills, projectedCents);

  const serialized = bills.map((b) => ({
    id: b.id,
    groupId: b.groupId,
    description: b.description,
    expectedAmountCents: b.expectedAmountCents,
    dueDate: toIsoDate(b.dueDate),
    month: toIsoDate(b.month),
    status: b.status,
    isOverdue: isOverdue(b.dueDate, b.status),
    categoryId: b.categoryId,
    category: b.category ? { id: b.category.id, name: b.category.name } : null,
    ownerMemberId: b.ownerMemberId,
    ownerMember: b.ownerMember ? { id: b.ownerMember.id, name: b.ownerMember.name } : null,
    recurringBillId: b.recurringBillId,
    payment:
      b.status === 'PAID' && b.paidDate
        ? {
            paidDate: toIsoDate(b.paidDate),
            actualAmountCents: b.actualAmountCents,
            paidByMemberId: b.paidByMemberId,
            paymentMethod: b.paymentMethod,
          }
        : null,
    createdAt: b.createdAt.toISOString(),
    updatedAt: b.updatedAt.toISOString(),
  }));

  return {
    month: input.month,
    summary,
    bills: serialized,
    projectedBills,
  };
}
