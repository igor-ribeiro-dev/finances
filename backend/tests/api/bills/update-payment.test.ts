// T021 (US2) — update-payment: no longer syncs an Expense (simplified use case).
import request from 'supertest';
import { createApp } from '../../../src/app';
import { createBillInDb, createPaidBill } from '../../helpers/bill-factories';

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
    creditCard: { findFirst: jest.fn() },
    recurringBill: { findMany: jest.fn() },
  },
}));

import { prisma } from '../../../src/infra/prisma';

const app = createApp();

const session = prisma.session as unknown as { findUnique: jest.Mock; update: jest.Mock };
const user = prisma.user as unknown as { findUnique: jest.Mock; findFirst: jest.Mock };
const bill = prisma.bill as unknown as { findFirst: jest.Mock; update: jest.Mock };
const creditCard = prisma.creditCard as unknown as { findFirst: jest.Mock };

const CARD_UUID = 'bb0eebc9-9c0b-4ef8-bb6d-6bb9bd380a22';

function setupAuthedMember(groupId = 'group-1') {
  session.findUnique.mockResolvedValue({
    id: 'sess-1',
    userId: 'user-ana',
    expiresAt: new Date(Date.now() + 60_000),
  });
  session.update.mockResolvedValue({});
  user.findUnique.mockResolvedValue({ familyGroupId: groupId });
  // FR-003: a CREDIT_CARD payment resolves an active card in the group.
  creditCard.findFirst.mockResolvedValue({ id: CARD_UUID, groupId, status: 'ACTIVE' });
}

function mockBillWithRelations(base: ReturnType<typeof createBillInDb>) {
  return { ...base, category: null, ownerMember: null, paidByMember: null };
}

const MEMBER_UUID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';

const validUpdatePaymentBody = {
  paidDate: '2026-06-15',
  actualAmountCents: 200000,
  paidByMemberId: MEMBER_UUID,
  paymentMethod: 'CREDIT_CARD',
  creditCardId: CARD_UUID,
};

describe('PATCH /api/v1/bills/:id/payment', () => {
  beforeEach(() => jest.clearAllMocks());

  it('200: PAID bill updates payment; no Expense sync (US2 simplification)', async () => {
    setupAuthedMember();
    const paid = createPaidBill({ id: 'bill-paid' });
    bill.findFirst.mockResolvedValue(mockBillWithRelations(paid));

    const updatedBill = mockBillWithRelations(
      createPaidBill({
        id: 'bill-paid',
        paidDate: new Date('2026-06-15T00:00:00Z'),
        actualAmountCents: 200000,
        paymentMethod: 'CREDIT_CARD',
      }),
    );
    bill.update.mockResolvedValue(updatedBill);

    const res = await request(app as Parameters<typeof request>[0])
      .patch('/api/v1/bills/bill-paid/payment')
      .set('Cookie', 'session_id=sess-1')
      .send(validUpdatePaymentBody);

    expect(res.status).toBe(200);
    expect(res.body.bill.status).toBe('PAID');
    expect(res.body.bill.payment).not.toBeNull();
    expect(res.body.bill.payment.paidDate).toBe('2026-06-15');
    expect(res.body.bill.payment.actualAmountCents).toBe(200000);
    expect(res.body.bill.payment.paymentMethod).toBe('CREDIT_CARD');

    // Only bill.update called — no expense interaction.
    expect(bill.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          actualAmountCents: 200000,
          paymentMethod: 'CREDIT_CARD',
          paidByMemberId: MEMBER_UUID,
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
      .patch('/api/v1/bills/bill-pending/payment')
      .set('Cookie', 'session_id=sess-1')
      .send(validUpdatePaymentBody);

    expect(res.status).toBe(409);
    expect(res.body.code).toBe('bill.invalid_transition');
  });

  it('400: missing paidDate', async () => {
    setupAuthedMember();

    const res = await request(app as Parameters<typeof request>[0])
      .patch('/api/v1/bills/bill-paid/payment')
      .set('Cookie', 'session_id=sess-1')
      .send({ ...validUpdatePaymentBody, paidDate: undefined });

    expect(res.status).toBe(400);
  });

  it('401: no session', async () => {
    const res = await request(app as Parameters<typeof request>[0])
      .patch('/api/v1/bills/bill-paid/payment')
      .send(validUpdatePaymentBody);

    expect(res.status).toBe(401);
  });
});
