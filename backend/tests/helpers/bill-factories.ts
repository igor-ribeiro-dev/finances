/**
 * Test factory helpers for Bill and RecurringBill models (feature 010).
 * Returns properly-typed mock objects for use in jest mocks.
 */

export type BillStatus = 'PENDING' | 'PAID' | 'CANCELLED';
export type RecurrenceInterval = 'MONTHLY' | 'ANNUAL';
export type RecurringBillStatus = 'ACTIVE' | 'PAUSED' | 'STOPPED';
export type PaymentMethod = 'CASH_OR_DEBIT' | 'CREDIT_CARD';

export interface MockBill {
  id: string;
  groupId: string;
  description: string;
  expectedAmountCents: number;
  dueDate: Date;
  month: Date;
  status: BillStatus;
  categoryId: string | null;
  ownerMemberId: string | null;
  recurringBillId: string | null;
  paidDate: Date | null;
  actualAmountCents: number | null;
  paidByMemberId: string | null;
  paymentMethod: PaymentMethod | null;
  expenseId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface MockRecurringBill {
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
  ownerMemberId: string | null;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export function createBillInDb(overrides: Partial<MockBill> = {}): MockBill {
  const base: MockBill = {
    id: 'bill-1',
    groupId: 'group-1',
    description: 'Aluguel',
    expectedAmountCents: 200000,
    dueDate: new Date('2026-06-10T00:00:00Z'),
    month: new Date('2026-06-01T00:00:00Z'),
    status: 'PENDING',
    categoryId: null,
    ownerMemberId: null,
    recurringBillId: null,
    paidDate: null,
    actualAmountCents: null,
    paidByMemberId: null,
    paymentMethod: null,
    expenseId: null,
    createdAt: new Date('2026-06-01T10:00:00Z'),
    updatedAt: new Date('2026-06-01T10:00:00Z'),
    ...overrides,
  };

  // Enforce payment invariant: PAID status requires all payment fields
  if (base.status === 'PAID' && base.paidDate === null) {
    base.paidDate = new Date('2026-06-10T00:00:00Z');
    base.actualAmountCents = base.expectedAmountCents;
    base.paidByMemberId = 'user-ana';
    base.paymentMethod = 'CASH_OR_DEBIT';
    base.expenseId = 'exp-1';
  }

  // Clear payment fields if not PAID
  if (base.status !== 'PAID') {
    base.paidDate = null;
    base.actualAmountCents = null;
    base.paidByMemberId = null;
    base.paymentMethod = null;
    base.expenseId = null;
  }

  // Apply overrides again after invariant enforcement (allows explicit override)
  return { ...base, ...overrides };
}

export function createPaidBill(overrides: Partial<MockBill> = {}): MockBill {
  return createBillInDb({
    status: 'PAID',
    paidDate: new Date('2026-06-10T00:00:00Z'),
    actualAmountCents: 198750,
    paidByMemberId: 'user-ana',
    paymentMethod: 'CASH_OR_DEBIT',
    expenseId: 'exp-1',
    ...overrides,
  });
}

export function createCancelledBill(overrides: Partial<MockBill> = {}): MockBill {
  return createBillInDb({ status: 'CANCELLED', ...overrides });
}

export function createRecurringBillInDb(
  overrides: Partial<MockRecurringBill> = {},
): MockRecurringBill {
  return {
    id: 'recurring-1',
    groupId: 'group-1',
    description: 'Conta de energia',
    expectedAmountCents: 30000,
    dueDay: 10,
    interval: 'MONTHLY',
    startMonth: new Date('2026-06-01T00:00:00Z'),
    activeFromMonth: new Date('2026-06-01T00:00:00Z'),
    status: 'ACTIVE',
    categoryId: null,
    ownerMemberId: null,
    deletedAt: null,
    createdAt: new Date('2026-06-01T10:00:00Z'),
    updatedAt: new Date('2026-06-01T10:00:00Z'),
    ...overrides,
  };
}
