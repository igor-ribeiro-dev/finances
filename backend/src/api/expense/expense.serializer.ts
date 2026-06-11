import type { ExpenseWithOwner } from '../../domain/expense/expense.repository';

export interface CategoryRefResponse {
  id: string;
  name: string;
}

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
  category: CategoryRefResponse | null;
  subCategory: CategoryRefResponse | null;
  billId: string | null;
  createdAt: string;
  updatedAt: string;
  warnings?: string[];
}

function toIsoDate(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Resolves the denormalized category path (FR-026):
 *   - A) categoryId references a root → category = that root; subCategory = null
 *   - B) categoryId references a sub  → subCategory = it; category = its parent root
 *   - C) categoryId is null           → both null
 */
function resolveCategoryPath(expense: ExpenseWithOwner): {
  category: CategoryRefResponse | null;
  subCategory: CategoryRefResponse | null;
} {
  const c = expense.category;
  if (!c) return { category: null, subCategory: null };
  if (c.parentId === null) {
    return { category: { id: c.id, name: c.name }, subCategory: null };
  }
  return {
    category: c.parent ? { id: c.parent.id, name: c.parent.name } : null,
    subCategory: { id: c.id, name: c.name },
  };
}

export function mapExpenseToResponse(
  expense: ExpenseWithOwner,
  groupId: string,
  warnings?: string[],
  billId?: string | null,
): ExpenseResponse {
  const { category, subCategory } = resolveCategoryPath(expense);
  const response: ExpenseResponse = {
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
    category,
    subCategory,
    billId: billId ?? null,
    createdAt: expense.createdAt.toISOString(),
    updatedAt: expense.updatedAt.toISOString(),
  };
  if (warnings && warnings.length > 0) response.warnings = warnings;
  return response;
}
