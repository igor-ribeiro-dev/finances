// T021 (US2) — revert-payment: no longer deletes an Expense (simplified use case).
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
const bill = prisma.bill as unknown as { findFirst: jest.Mock; update: jest.Mock };

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

describe('DELETE /api/v1/bills/:id/payment', () => {
  beforeEach(() => jest.clearAllMocks());

  it('200: PAID bill transitions to PENDING; no Expense deletion (US2 simplification)', async () => {
    setupAuthedMember();
    const paid = createPaidBill({ id: 'bill-paid' });
    bill.findFirst.mockResolvedValue(mockBillWithRelations(paid));

    const revertedBill = mockBillWithRelations(
      createBillInDb({ id: 'bill-paid', status: 'PENDING' }),
    );
    bill.update.mockResolvedValue(revertedBill);

    const res = await request(app as Parameters<typeof request>[0])
      .delete('/api/v1/bills/bill-paid/payment')
      .set('Cookie', 'session_id=sess-1');

    expect(res.status).toBe(200);
    expect(res.body.bill.status).toBe('PENDING');
    expect(res.body.bill.payment).toBeNull();

    // Only bill.update called — no expense interaction.
    expect(bill.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'PENDING',
          paidDate: null,
          actualAmountCents: null,
          paidByMemberId: null,
          paymentMethod: null,
        }),
      }),
    );
    expect('expense' in prisma).toBe(false);
  });

  it('409: PENDING bill returns bill.invalid_transition', async () => {
    setupAuthedMember();
    const pending = createBillInDb({ id: 'bill-pending', status: 'PENDING' });
    bill.findFirst.mockResolvedValue(mockBillWithRelations(pending));

    const res = await request(app as Parameters<typeof request>[0])
      .delete('/api/v1/bills/bill-pending/payment')
      .set('Cookie', 'session_id=sess-1');

    expect(res.status).toBe(409);
    expect(res.body.code).toBe('bill.invalid_transition');
  });

  it('409: CANCELLED bill returns bill.invalid_transition', async () => {
    setupAuthedMember();
    const cancelled = createCancelledBill({ id: 'bill-cancelled' });
    bill.findFirst.mockResolvedValue(mockBillWithRelations(cancelled));

    const res = await request(app as Parameters<typeof request>[0])
      .delete('/api/v1/bills/bill-cancelled/payment')
      .set('Cookie', 'session_id=sess-1');

    expect(res.status).toBe(409);
    expect(res.body.code).toBe('bill.invalid_transition');
  });

  it('404: bill from other group returns 404', async () => {
    setupAuthedMember('group-1');
    bill.findFirst.mockResolvedValue(null);

    const res = await request(app as Parameters<typeof request>[0])
      .delete('/api/v1/bills/bill-other/payment')
      .set('Cookie', 'session_id=sess-1');

    expect(res.status).toBe(404);
    expect(res.body.code).toBe('bill.not_found');
  });

  it('401: no session', async () => {
    const res = await request(app as Parameters<typeof request>[0]).delete(
      '/api/v1/bills/bill-paid/payment',
    );

    expect(res.status).toBe(401);
  });
});
