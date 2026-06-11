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
    $transaction: jest.fn(),
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
  return {
    ...base,
    category: null,
    ownerMember: null,
    paidByMember: null,
  };
}

describe('PATCH /api/v1/bills/:id', () => {
  beforeEach(() => jest.clearAllMocks());

  it('updates a PENDING bill and returns 200', async () => {
    setupAuthedMember();
    const existing = createBillInDb({ id: 'bill-1', status: 'PENDING' });
    bill.findFirst.mockResolvedValue(mockBillWithRelations(existing));
    const updated = {
      ...mockBillWithRelations(existing),
      description: 'Atualizado',
      dueDate: new Date('2026-06-15T00:00:00Z'),
      month: new Date('2026-06-01T00:00:00Z'),
    };
    bill.update.mockResolvedValue(updated);

    const res = await request(app as Parameters<typeof request>[0])
      .patch('/api/v1/bills/bill-1')
      .set('Cookie', 'session_id=sess-1')
      .send({ description: 'Atualizado', expectedAmountCents: 200000, dueDate: '2026-06-15' });

    expect(res.status).toBe(200);
    expect(res.body.bill.description).toBe('Atualizado');
  });

  it('returns 409 bill.invalid_transition when bill is PAID', async () => {
    setupAuthedMember();
    const paid = createPaidBill({ id: 'bill-paid' });
    bill.findFirst.mockResolvedValue(mockBillWithRelations(paid));

    const res = await request(app as Parameters<typeof request>[0])
      .patch('/api/v1/bills/bill-paid')
      .set('Cookie', 'session_id=sess-1')
      .send({ description: 'Mudança', expectedAmountCents: 200000, dueDate: '2026-06-10' });

    expect(res.status).toBe(409);
    expect(res.body.code).toBe('bill.invalid_transition');
  });

  it('returns 409 bill.invalid_transition when bill is CANCELLED', async () => {
    setupAuthedMember();
    const cancelled = createCancelledBill({ id: 'bill-cancelled' });
    bill.findFirst.mockResolvedValue(mockBillWithRelations(cancelled));

    const res = await request(app as Parameters<typeof request>[0])
      .patch('/api/v1/bills/bill-cancelled')
      .set('Cookie', 'session_id=sess-1')
      .send({ description: 'Mudança', expectedAmountCents: 200000, dueDate: '2026-06-10' });

    expect(res.status).toBe(409);
    expect(res.body.code).toBe('bill.invalid_transition');
  });

  it('returns 404 when bill belongs to another group', async () => {
    setupAuthedMember('group-1');
    bill.findFirst.mockResolvedValue(null);

    const res = await request(app as Parameters<typeof request>[0])
      .patch('/api/v1/bills/bill-other')
      .set('Cookie', 'session_id=sess-1')
      .send({ description: 'X', expectedAmountCents: 100, dueDate: '2026-06-10' });

    expect(res.status).toBe(404);
    expect(res.body.code).toBe('bill.not_found');
  });

  it('moves month when dueDate is updated to different month', async () => {
    setupAuthedMember();
    const existing = createBillInDb({
      id: 'bill-1',
      status: 'PENDING',
      dueDate: new Date('2026-06-10T00:00:00Z'),
      month: new Date('2026-06-01T00:00:00Z'),
    });
    bill.findFirst.mockResolvedValue(mockBillWithRelations(existing));
    const updated = {
      ...mockBillWithRelations(existing),
      dueDate: new Date('2026-07-10T00:00:00Z'),
      month: new Date('2026-07-01T00:00:00Z'),
    };
    bill.update.mockResolvedValue(updated);

    const res = await request(app as Parameters<typeof request>[0])
      .patch('/api/v1/bills/bill-1')
      .set('Cookie', 'session_id=sess-1')
      .send({ description: 'Aluguel', expectedAmountCents: 200000, dueDate: '2026-07-10' });

    expect(res.status).toBe(200);
    expect(res.body.bill.month).toBe('2026-07-01');
  });
});

describe('DELETE /api/v1/bills/:id', () => {
  beforeEach(() => jest.clearAllMocks());

  it('deletes a PENDING bill and returns 204', async () => {
    setupAuthedMember();
    const existing = createBillInDb({ id: 'bill-1', status: 'PENDING' });
    bill.findFirst.mockResolvedValue(mockBillWithRelations(existing));
    bill.delete.mockResolvedValue({});

    const res = await request(app as Parameters<typeof request>[0])
      .delete('/api/v1/bills/bill-1')
      .set('Cookie', 'session_id=sess-1');

    expect(res.status).toBe(204);
  });

  it('deletes a CANCELLED bill and returns 204', async () => {
    setupAuthedMember();
    const cancelled = createCancelledBill({ id: 'bill-c' });
    bill.findFirst.mockResolvedValue(mockBillWithRelations(cancelled));
    bill.delete.mockResolvedValue({});

    const res = await request(app as Parameters<typeof request>[0])
      .delete('/api/v1/bills/bill-c')
      .set('Cookie', 'session_id=sess-1');

    expect(res.status).toBe(204);
  });

  it('returns 409 when trying to delete a PAID bill', async () => {
    setupAuthedMember();
    const paid = createPaidBill({ id: 'bill-paid' });
    bill.findFirst.mockResolvedValue(mockBillWithRelations(paid));

    const res = await request(app as Parameters<typeof request>[0])
      .delete('/api/v1/bills/bill-paid')
      .set('Cookie', 'session_id=sess-1');

    expect(res.status).toBe(409);
    expect(res.body.code).toBe('bill.invalid_transition');
  });

  it('returns 404 when bill not found', async () => {
    setupAuthedMember();
    bill.findFirst.mockResolvedValue(null);

    const res = await request(app as Parameters<typeof request>[0])
      .delete('/api/v1/bills/nonexistent')
      .set('Cookie', 'session_id=sess-1');

    expect(res.status).toBe(404);
    expect(res.body.code).toBe('bill.not_found');
  });
});
