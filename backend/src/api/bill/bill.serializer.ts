import type { BillWithRelations } from '../../domain/bill/bill.repository';

function toIsoDate(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function isOverdue(dueDate: Date, status: string): boolean {
  if (status !== 'PENDING') return false;
  return dueDate < new Date();
}

export function mapBillToResponse(bill: BillWithRelations) {
  return {
    id: bill.id,
    groupId: bill.groupId,
    description: bill.description,
    expectedAmountCents: bill.expectedAmountCents,
    dueDate: toIsoDate(bill.dueDate),
    month: toIsoDate(bill.month),
    status: bill.status,
    isOverdue: isOverdue(bill.dueDate, bill.status),
    categoryId: bill.categoryId,
    category: bill.category ? { id: bill.category.id, name: bill.category.name } : null,
    ownerMemberId: bill.ownerMemberId,
    ownerMember: bill.ownerMember ? { id: bill.ownerMember.id, name: bill.ownerMember.name } : null,
    recurringBillId: bill.recurringBillId,
    payment:
      bill.status === 'PAID' && bill.paidDate
        ? {
            paidDate: toIsoDate(bill.paidDate),
            actualAmountCents: bill.actualAmountCents,
            paidByMemberId: bill.paidByMemberId,
            paymentMethod: bill.paymentMethod,
          }
        : null,
    createdAt: bill.createdAt.toISOString(),
    updatedAt: bill.updatedAt.toISOString(),
  };
}
