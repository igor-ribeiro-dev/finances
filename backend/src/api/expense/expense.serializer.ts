import type { ExpenseWithOwner } from '../../domain/expense/expense.repository';

export interface ExpenseResponse {
  id: string;
  groupId: string;
  amountCents: number;
  date: string;
  description: string;
  paymentMethod: 'CASH_OR_DEBIT' | 'CREDIT_CARD';
  ownerMemberId: string;
  ownerMember: { id: string; name: string; isExMember: boolean };
  createdById: string;
  updatedById: string;
  createdAt: string;
  updatedAt: string;
}

function toIsoDate(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function mapExpenseToResponse(expense: ExpenseWithOwner, groupId: string): ExpenseResponse {
  return {
    id: expense.id,
    groupId: expense.groupId,
    amountCents: expense.amountCents,
    date: toIsoDate(expense.date),
    description: expense.description,
    paymentMethod: expense.paymentMethod,
    ownerMemberId: expense.ownerMemberId,
    ownerMember: {
      id: expense.ownerMember.id,
      name: expense.ownerMember.name,
      isExMember: expense.ownerMember.familyGroupId !== groupId,
    },
    createdById: expense.createdById,
    updatedById: expense.updatedById,
    createdAt: expense.createdAt.toISOString(),
    updatedAt: expense.updatedAt.toISOString(),
  };
}
