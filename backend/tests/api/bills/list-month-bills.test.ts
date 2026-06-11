import request from 'supertest';
import { createApp } from '../../../src/app';
import { createBillInDb, createPaidBill, createCancelledBill } from '../../helpers/bill-factories';

jest.mock('../../../src/infra/prisma', () => ({
  prisma: {
    session: { findUnique: jest.fn(), update: jest.fn() },
    user: { findUnique: jest.fn() },
    bill: {
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findFirst: jest.fn(),
      createMany: jest.fn(),
    },
    recurringBill: {
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      findFirst: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}));

import { prisma } from '../../../src/infra/prisma';

const app = createApp();

const session = prisma.session as unknown as { findUnique: jest.Mock; update: jest.Mock };
const user = prisma.user as unknown as { findUnique: jest.Mock };
const bill = prisma.bill as unknown as { findMany: jest.Mock };
const recurringBill = prisma.recurringBill as unknown as { findMany: jest.Mock };

function setupAuthedMember(groupId = 'group-1') {
  session.findUnique.mockResolvedValue({
    id: 'sess-1',
    userId: 'user-ana',
    expiresAt: new Date(Date.now() + 60_000),
  });
  session.update.mockResolvedValue({});
  user.findUnique.mockResolvedValue({ familyGroupId: groupId });
}

function authedGet(month: string) {
  return request(app as Parameters<typeof request>[0])
    .get(`/api/v1/bills?month=${month}`)
    .set('Cookie', 'session_id=sess-1');
}

describe('GET /api/v1/bills?month', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 200 with correct envelope for a month with bills', async () => {
    setupAuthedMember();
    const pending = createBillInDb({
      id: 'bill-1',
      expectedAmountCents: 50000,
      dueDate: new Date('2026-06-10T00:00:00Z'),
    });
    const paid = createPaidBill({
      id: 'bill-2',
      expectedAmountCents: 100000,
      actualAmountCents: 99000,
      dueDate: new Date('2026-06-05T00:00:00Z'),
    });
    const cancelled = createCancelledBill({
      id: 'bill-3',
      expectedAmountCents: 30000,
      dueDate: new Date('2026-06-20T00:00:00Z'),
    });
    bill.findMany.mockResolvedValue([paid, pending, cancelled]);
    recurringBill.findMany.mockResolvedValue([]);

    const res = await authedGet('2026-06');

    expect(res.status).toBe(200);
    expect(res.body.month).toBe('2026-06');
    expect(res.body.summary.totalExpectedCents).toBe(150000); // pending + paid expected
    expect(res.body.summary.totalPaidCents).toBe(99000);
    expect(res.body.summary.totalPendingCents).toBe(50000);
    expect(res.body.summary.projectedCents).toBe(0);
    expect(res.body.bills).toHaveLength(3);
    expect(res.body.projectedBills).toEqual([]);
  });

  it('orders bills by dueDate ascending', async () => {
    setupAuthedMember();
    const bill1 = createBillInDb({ id: 'bill-1', dueDate: new Date('2026-06-15T00:00:00Z') });
    const bill2 = createBillInDb({ id: 'bill-2', dueDate: new Date('2026-06-05T00:00:00Z') });
    bill.findMany.mockResolvedValue([bill2, bill1]); // repo returns ordered
    recurringBill.findMany.mockResolvedValue([]);

    const res = await authedGet('2026-06');

    expect(res.status).toBe(200);
    expect(res.body.bills[0].id).toBe('bill-2');
    expect(res.body.bills[1].id).toBe('bill-1');
  });

  it('sets isOverdue=true for PENDING bills past due', async () => {
    setupAuthedMember();
    // dueDate in the past
    const overdue = createBillInDb({
      id: 'bill-overdue',
      dueDate: new Date('2025-01-05T00:00:00Z'),
      status: 'PENDING',
    });
    bill.findMany.mockResolvedValue([overdue]);
    recurringBill.findMany.mockResolvedValue([]);

    const res = await authedGet('2025-01');

    expect(res.status).toBe(200);
    expect(res.body.bills[0].isOverdue).toBe(true);
  });

  it('sets isOverdue=false for PAID bills even if past due', async () => {
    setupAuthedMember();
    const paidOld = createPaidBill({ id: 'bill-paid', dueDate: new Date('2025-01-05T00:00:00Z') });
    bill.findMany.mockResolvedValue([paidOld]);
    recurringBill.findMany.mockResolvedValue([]);

    const res = await authedGet('2025-01');

    expect(res.status).toBe(200);
    expect(res.body.bills[0].isOverdue).toBe(false);
  });

  it('accepts past months', async () => {
    setupAuthedMember();
    bill.findMany.mockResolvedValue([]);
    recurringBill.findMany.mockResolvedValue([]);

    const res = await authedGet('2020-01');

    expect(res.status).toBe(200);
    expect(res.body.month).toBe('2020-01');
  });

  it('accepts future months', async () => {
    setupAuthedMember();
    bill.findMany.mockResolvedValue([]);
    recurringBill.findMany.mockResolvedValue([]);

    const res = await authedGet('2030-12');

    expect(res.status).toBe(200);
    expect(res.body.month).toBe('2030-12');
  });

  it('returns 400 for invalid month format', async () => {
    setupAuthedMember();

    const res = await authedGet('2026-13');

    expect(res.status).toBe(400);
    expect(res.body.code).toBeTruthy();
  });

  it('returns 400 when month is missing', async () => {
    setupAuthedMember();

    const res = await request(app as Parameters<typeof request>[0])
      .get('/api/v1/bills')
      .set('Cookie', 'session_id=sess-1');

    expect(res.status).toBe(400);
  });

  it('returns 401 when no session cookie', async () => {
    const res = await request(app as Parameters<typeof request>[0]).get(
      '/api/v1/bills?month=2026-06',
    );
    expect(res.status).toBe(401);
  });

  it('returns 403 when user has no group', async () => {
    session.findUnique.mockResolvedValue({
      id: 'sess-1',
      userId: 'user-ana',
      expiresAt: new Date(Date.now() + 60_000),
    });
    session.update.mockResolvedValue({});
    user.findUnique.mockResolvedValue({ familyGroupId: null });

    const res = await request(app as Parameters<typeof request>[0])
      .get('/api/v1/bills?month=2026-06')
      .set('Cookie', 'session_id=sess-1');

    expect(res.status).toBe(403);
  });

  it('returns empty bills for a month with no bills', async () => {
    setupAuthedMember();
    bill.findMany.mockResolvedValue([]);
    recurringBill.findMany.mockResolvedValue([]);

    const res = await authedGet('2026-06');

    expect(res.status).toBe(200);
    expect(res.body.bills).toEqual([]);
    expect(res.body.summary.totalExpectedCents).toBe(0);
    expect(res.body.summary.totalPaidCents).toBe(0);
    expect(res.body.summary.totalPendingCents).toBe(0);
  });
});
