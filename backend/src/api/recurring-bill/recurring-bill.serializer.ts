import type { RecurringBillWithRelations } from '../../domain/recurring-bill/recurring-bill.repository';

function toIsoMonth(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

export function mapRecurringBillToResponse(t: RecurringBillWithRelations) {
  return {
    id: t.id,
    groupId: t.groupId,
    description: t.description,
    expectedAmountCents: t.expectedAmountCents,
    dueDay: t.dueDay,
    interval: t.interval,
    startMonth: toIsoMonth(t.startMonth),
    activeFromMonth: toIsoMonth(t.activeFromMonth),
    status: t.status,
    categoryId: t.categoryId,
    category: t.category ? { id: t.category.id, name: t.category.name } : null,
    ownerMemberId: t.ownerMemberId,
    ownerMember: t.ownerMember ? { id: t.ownerMember.id, name: t.ownerMember.name } : null,
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
  };
}
