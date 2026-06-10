import request from 'supertest';
import { createApp } from '../../../src/app';

jest.mock('../../../src/infra/prisma', () => {
  const txHandler = jest.fn();
  return {
    prisma: {
      session: { findUnique: jest.fn(), update: jest.fn() },
      user: { findUnique: jest.fn(), findFirst: jest.fn() },
      expense: { create: jest.fn() },
      idempotencyKey: { findUnique: jest.fn(), create: jest.fn() },
      $transaction: txHandler,
    },
  };
});

import { prisma } from '../../../src/infra/prisma';

const app = createApp();
const session = prisma.session as unknown as { findUnique: jest.Mock; update: jest.Mock };
const user = prisma.user as unknown as { findUnique: jest.Mock; findFirst: jest.Mock };
const expense = prisma.expense as unknown as { create: jest.Mock };
const tx = prisma.$transaction as unknown as jest.Mock;

const OWNER_ID = '5f8c7a2e-9b4d-4e1f-a3c5-12d4e5f67890';
const CAT_ID = 'cccccccc-1111-4abc-8def-111111111111';

const body = {
  amountCents: 5000,
  date: '2026-05-20',
  description: 'Mercado',
  paymentMethod: 'CASH_OR_DEBIT' as const,
  ownerMemberId: OWNER_ID,
  categoryId: CAT_ID,
};

function expenseRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'exp-1',
    groupId: 'group-1',
    amountCents: 5000,
    date: new Date('2026-05-20T00:00:00Z'),
    description: 'Mercado',
    paymentMethod: 'CASH_OR_DEBIT',
    ownerMemberId: OWNER_ID,
    ownerMember: { id: OWNER_ID, name: 'Bruno', familyGroupId: 'group-1' },
    createdById: 'user-ana',
    updatedById: 'user-ana',
    category: null,
    createdAt: new Date('2026-05-20T10:00:00Z'),
    updatedAt: new Date('2026-05-20T10:00:00Z'),
    ...overrides,
  };
}

describe('POST /api/v1/expenses — concurrent category removal (FR-018)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    session.findUnique.mockResolvedValue({
      id: 'sess-1',
      userId: 'user-ana',
      expiresAt: new Date(Date.now() + 60_000),
    });
    session.update.mockResolvedValue({});
    user.findUnique.mockResolvedValue({ familyGroupId: 'group-1' });
    user.findFirst.mockResolvedValue({ id: OWNER_ID });
    tx.mockImplementation((cb: (c: unknown) => Promise<unknown>) =>
      cb(prisma as unknown as object),
    );
  });

  it('creates the expense with categoryId=null and a warning when the FK violates mid-write', async () => {
    expense.create
      .mockRejectedValueOnce({ code: 'P2003', meta: { field_name: 'Expense_categoryId_fkey' } })
      .mockResolvedValueOnce(expenseRow({ category: null }));

    const res = await request(app as Parameters<typeof request>[0])
      .post('/api/v1/expenses')
      .set('Cookie', 'session_id=sess-1')
      .send(body);

    expect(res.status).toBe(201);
    expect(res.body.warnings).toEqual(['category.removed_concurrently']);
    expect(res.body.category).toBeNull();
    expect(res.body.subCategory).toBeNull();
    // The backend retried with categoryId cleared.
    expect(expense.create).toHaveBeenCalledTimes(2);
    expect(expense.create.mock.calls[1]![0].data.categoryId).toBeNull();
  });
});
