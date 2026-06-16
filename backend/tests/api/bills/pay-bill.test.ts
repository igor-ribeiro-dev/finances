// T021 (US2) — pay-bill: no longer creates an Expense (simplified use case).
import request from 'supertest';
import { createApp } from '../../../src/app';
import { createBillInDb, createPaidBill, createCancelledBill } from '../../helpers/bill-factories';

jest.mock('../../../src/infra/prisma', () => ({
  prisma: {
    session: { findUnique: jest.fn(), update: jest.fn() },
    user: { findUnique: jest.fn(), findFirst: jest.fn() },
    bill: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      createMany: jest.fn(),
    },
    recurringBill: { findMany: jest.fn() },
  },
}));

import { prisma } from '../../../src/infra/prisma';

const app = createApp();

const session = prisma.session as unknown as { findUnique: jest.Mock; update: jest.Mock };
const user = prisma.user as unknown as { findUnique: jest.Mock; findFirst: jest.Mock };
const bill = prisma.bill as unknown as {
  findFirst: jest.Mock;
  update: jest.Mock;
  delete: jest.Mock;
};

function setupAuthedMember(groupId = 'group-1') {
  session.findUnique.mockResolvedValue({
    id: 'sess-1',
    userId: 'user-ana',
    expiresAt: new Date(Date.now() + 60_000),
  });
  session.update.mockResolvedValue({});
  user.findUnique.mockResolvedValue({ familyGroupId: groupId });
}

function mockBillWithRelations(base: ReturnType<typeof createBillInDb>) {
  return { ...base, category: null, ownerMember: null, paidByMember: null };
}

const MEMBER_UUID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';

const validPayBody = {
  paidDate: '2026-06-10',
  actualAmountCents: 198750,
  paidByMemberId: MEMBER_UUID,
  paymentMethod: 'CASH_OR_DEBIT',
};

describe('POST /api/v1/bills/:id/pay', () => {
  beforeEach(() => jest.clearAllMocks());

  it('200: PENDING bill transitions to PAID; no Expense is created (US2 simplification)', async () => {
    setupAuthedMember();
    const pending = createBillInDb({ id: 'bill-1', status: 'PENDING' });
    bill.findFirst.mockResolvedValue(mockBillWithRelations(pending));

    const paidBill = mockBillWithRelations(
      createPaidBill({ id: 'bill-1', actualAmountCents: 198750 }),
    );
    bill.update.mockResolvedValue(paidBill);

    const res = await request(app as Parameters<typeof request>[0])
      .post('/api/v1/bills/bill-1/pay')
      .set('Cookie', 'session_id=sess-1')
      .send(validPayBody);

    expect(res.status).toBe(200);
    expect(res.body.bill.status).toBe('PAID');
    expect(res.body.bill.payment).not.toBeNull();
    expect(res.body.bill.payment.paidDate).toBe('2026-06-10');
    expect(res.body.bill.payment.actualAmountCents).toBe(198750);

    // No Expense is created — only bill.update is called.
    expect(bill.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'PAID',
          paidByMemberId: MEMBER_UUID,
          actualAmountCents: 198750,
        }),
      }),
    );
    // Verify no prisma.expense calls exist (expense model is removed).
    expect('expense' in prisma).toBe(false);
  });

  it('409: PAID bill returns bill.invalid_transition', async () => {
    setupAuthedMember();
    const paid = createPaidBill({ id: 'bill-paid' });
    bill.findFirst.mockResolvedValue(mockBillWithRelations(paid));

    const res = await request(app as Parameters<typeof request>[0])
      .post('/api/v1/bills/bill-paid/pay')
      .set('Cookie', 'session_id=sess-1')
      .send(validPayBody);

    expect(res.status).toBe(409);
    expect(res.body.code).toBe('bill.invalid_transition');
  });

  it('409: CANCELLED bill returns bill.invalid_transition', async () => {
    setupAuthedMember();
    const cancelled = createCancelledBill({ id: 'bill-cancelled' });
    bill.findFirst.mockResolvedValue(mockBillWithRelations(cancelled));

    const res = await request(app as Parameters<typeof request>[0])
      .post('/api/v1/bills/bill-cancelled/pay')
      .set('Cookie', 'session_id=sess-1')
      .send(validPayBody);

    expect(res.status).toBe(409);
    expect(res.body.code).toBe('bill.invalid_transition');
  });

  it('404: non-existent bill', async () => {
    setupAuthedMember();
    bill.findFirst.mockResolvedValue(null);

    const res = await request(app as Parameters<typeof request>[0])
      .post('/api/v1/bills/non-existent/pay')
      .set('Cookie', 'session_id=sess-1')
      .send(validPayBody);

    expect(res.status).toBe(404);
  });
});
