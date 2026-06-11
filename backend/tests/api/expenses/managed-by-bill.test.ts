import request from 'supertest';
import { createApp } from '../../../src/app';

jest.mock('../../../src/infra/prisma', () => ({
  prisma: {
    session: { findUnique: jest.fn(), update: jest.fn() },
    user: { findUnique: jest.fn(), findFirst: jest.fn() },
    expense: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    bill: { findFirst: jest.fn() },
    category: { findFirst: jest.fn() },
    familyGroup: { findFirst: jest.fn() },
    $transaction: jest.fn(),
  },
}));

import { prisma } from '../../../src/infra/prisma';

const app = createApp();

const session = prisma.session as unknown as { findUnique: jest.Mock; update: jest.Mock };
const user = prisma.user as unknown as { findUnique: jest.Mock; findFirst: jest.Mock };
const expense = prisma.expense as unknown as {
  findFirst: jest.Mock;
  update: jest.Mock;
  delete: jest.Mock;
};
const bill = prisma.bill as unknown as { findFirst: jest.Mock };

function setupAuthedMember(groupId = 'group-1') {
  session.findUnique.mockResolvedValue({
    id: 'sess-1',
    userId: 'user-ana',
    expiresAt: new Date(Date.now() + 60_000),
  });
  session.update.mockResolvedValue({});
  user.findUnique.mockResolvedValue({ familyGroupId: groupId });
}

const MEMBER_UUID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';

const mockExpense = {
  id: 'exp-1',
  groupId: 'group-1',
  amountCents: 5000,
  date: new Date('2026-06-10T00:00:00Z'),
  description: 'Teste',
  paymentMethod: 'CASH_OR_DEBIT',
  ownerMemberId: MEMBER_UUID,
  createdById: MEMBER_UUID,
  updatedById: MEMBER_UUID,
  categoryId: null,
  category: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  ownerMember: { id: MEMBER_UUID, name: 'Ana', familyGroupId: 'group-1' },
};

const validPatchBody = {
  amountCents: 5000,
  date: '2026-06-10',
  description: 'Teste',
  paymentMethod: 'CASH_OR_DEBIT',
  ownerMemberId: MEMBER_UUID,
};

describe('Expense guard: managed_by_bill (T028)', () => {
  beforeEach(() => jest.clearAllMocks());

  it('PATCH /expenses/:id returns 409 expense.managed_by_bill when linked to a bill', async () => {
    setupAuthedMember();
    expense.findFirst.mockResolvedValue(mockExpense);
    bill.findFirst.mockResolvedValue({ id: 'bill-1' });

    const res = await request(app as Parameters<typeof request>[0])
      .patch('/api/v1/expenses/exp-1')
      .set('Cookie', 'session_id=sess-1')
      .send(validPatchBody);

    expect(res.status).toBe(409);
    expect(res.body.code).toBe('expense.managed_by_bill');
  });

  it('DELETE /expenses/:id returns 409 expense.managed_by_bill when linked to a bill', async () => {
    setupAuthedMember();
    expense.findFirst.mockResolvedValue(mockExpense);
    bill.findFirst.mockResolvedValue({ id: 'bill-1' });

    const res = await request(app as Parameters<typeof request>[0])
      .delete('/api/v1/expenses/exp-1')
      .set('Cookie', 'session_id=sess-1');

    expect(res.status).toBe(409);
    expect(res.body.code).toBe('expense.managed_by_bill');
  });

  it('PATCH /expenses/:id with no linked bill proceeds normally (200)', async () => {
    setupAuthedMember();
    expense.findFirst.mockResolvedValue(mockExpense);
    bill.findFirst.mockResolvedValue(null);
    user.findFirst.mockResolvedValue({ id: MEMBER_UUID });
    expense.update.mockResolvedValue(mockExpense);

    const res = await request(app as Parameters<typeof request>[0])
      .patch('/api/v1/expenses/exp-1')
      .set('Cookie', 'session_id=sess-1')
      .send(validPatchBody);

    expect(res.status).toBe(200);
  });

  it('PATCH /expenses/:id response includes billId: null', async () => {
    setupAuthedMember();
    expense.findFirst.mockResolvedValue(mockExpense);
    bill.findFirst.mockResolvedValue(null);
    user.findFirst.mockResolvedValue({ id: MEMBER_UUID });
    expense.update.mockResolvedValue(mockExpense);

    const res = await request(app as Parameters<typeof request>[0])
      .patch('/api/v1/expenses/exp-1')
      .set('Cookie', 'session_id=sess-1')
      .send(validPatchBody);

    expect(res.status).toBe(200);
    expect(res.body.billId).toBeNull();
  });
});
