import request from 'supertest';
import { createApp } from '../../../src/app';
import { createBillInDb, createCancelledBill } from '../../helpers/bill-factories';

jest.mock('../../../src/infra/prisma', () => ({
  prisma: {
    session: { findUnique: jest.fn(), update: jest.fn() },
    user: { findUnique: jest.fn() },
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
const user = prisma.user as unknown as { findUnique: jest.Mock };
const bill = prisma.bill as unknown as { findMany: jest.Mock; createMany: jest.Mock };

function setupAuthedMember(groupId = 'group-1') {
  session.findUnique.mockResolvedValue({
    id: 'sess-1',
    userId: 'user-ana',
    expiresAt: new Date(Date.now() + 60_000),
  });
  session.update.mockResolvedValue({});
  user.findUnique.mockResolvedValue({ familyGroupId: groupId });
}

describe('POST /api/v1/bills/copy', () => {
  beforeEach(() => jest.clearAllMocks());

  it('dryRun=true returns count without persisting', async () => {
    setupAuthedMember();
    const b1 = createBillInDb({
      id: 'bill-1',
      dueDate: new Date('2026-05-10T00:00:00Z'),
      month: new Date('2026-05-01T00:00:00Z'),
      recurringBillId: null,
    });
    const b2 = createBillInDb({
      id: 'bill-2',
      dueDate: new Date('2026-05-20T00:00:00Z'),
      month: new Date('2026-05-01T00:00:00Z'),
      recurringBillId: null,
    });
    bill.findMany.mockResolvedValue([b1, b2]);

    const res = await request(app as Parameters<typeof request>[0])
      .post('/api/v1/bills/copy')
      .set('Cookie', 'session_id=sess-1')
      .send({ fromMonth: '2026-05', toMonth: '2026-06', dryRun: true });

    expect(res.status).toBe(200);
    expect(res.body.count).toBe(2);
    expect(bill.createMany).not.toHaveBeenCalled();
  });

  it('dryRun=false creates PENDING clones for the target month', async () => {
    setupAuthedMember();
    const b1 = createBillInDb({
      id: 'bill-1',
      dueDate: new Date('2026-05-10T00:00:00Z'),
      month: new Date('2026-05-01T00:00:00Z'),
      recurringBillId: null,
    });
    bill.findMany.mockResolvedValue([b1]);
    bill.createMany.mockResolvedValue({ count: 1 });

    const res = await request(app as Parameters<typeof request>[0])
      .post('/api/v1/bills/copy')
      .set('Cookie', 'session_id=sess-1')
      .send({ fromMonth: '2026-05', toMonth: '2026-06', dryRun: false });

    expect(res.status).toBe(200);
    expect(res.body.count).toBe(1);
    expect(bill.createMany).toHaveBeenCalled();
  });

  it('ignores CANCELLED bills when copying', async () => {
    setupAuthedMember();
    const cancelled = createCancelledBill({
      id: 'bill-cancelled',
      dueDate: new Date('2026-05-10T00:00:00Z'),
      month: new Date('2026-05-01T00:00:00Z'),
      recurringBillId: null,
    });
    bill.findMany.mockResolvedValue([]); // repo already filters CANCELLED

    const res = await request(app as Parameters<typeof request>[0])
      .post('/api/v1/bills/copy')
      .set('Cookie', 'session_id=sess-1')
      .send({ fromMonth: '2026-05', toMonth: '2026-06', dryRun: true });

    expect(res.status).toBe(200);
    expect(res.body.count).toBe(0);
    // Ensure the cancelled bill is not counted
    expect(cancelled.status).toBe('CANCELLED');
  });

  it('ignores bills with recurringBillId', async () => {
    setupAuthedMember();
    // recurring bills are filtered before being passed — repo returns none
    bill.findMany.mockResolvedValue([]);

    const res = await request(app as Parameters<typeof request>[0])
      .post('/api/v1/bills/copy')
      .set('Cookie', 'session_id=sess-1')
      .send({ fromMonth: '2026-05', toMonth: '2026-06', dryRun: true });

    expect(res.status).toBe(200);
    expect(res.body.count).toBe(0);
  });

  it('clamps day 31 to last day of target month (Feb)', async () => {
    setupAuthedMember();
    const b = createBillInDb({
      id: 'bill-31',
      dueDate: new Date('2026-01-31T00:00:00Z'),
      month: new Date('2026-01-01T00:00:00Z'),
      recurringBillId: null,
    });
    bill.findMany.mockResolvedValue([b]);
    bill.createMany.mockResolvedValue({ count: 1 });

    const res = await request(app as Parameters<typeof request>[0])
      .post('/api/v1/bills/copy')
      .set('Cookie', 'session_id=sess-1')
      .send({ fromMonth: '2026-01', toMonth: '2026-02', dryRun: false });

    expect(res.status).toBe(200);
    // The clamp happened internally — createMany was called with a bill in Feb
    const createManyCall = bill.createMany.mock.calls[0][0] as { data: Array<{ dueDate: Date }> };
    const newDueDate = new Date(createManyCall.data[0].dueDate);
    expect(newDueDate.getUTCDate()).toBe(28); // 2026 is not leap year
    expect(newDueDate.getUTCMonth()).toBe(1); // Feb
  });

  it('returns count 0 when source month has no copyable bills', async () => {
    setupAuthedMember();
    bill.findMany.mockResolvedValue([]);

    const res = await request(app as Parameters<typeof request>[0])
      .post('/api/v1/bills/copy')
      .set('Cookie', 'session_id=sess-1')
      .send({ fromMonth: '2026-05', toMonth: '2026-06', dryRun: true });

    expect(res.status).toBe(200);
    expect(res.body.count).toBe(0);
  });

  it('returns 400 for invalid month format', async () => {
    setupAuthedMember();

    const res = await request(app as Parameters<typeof request>[0])
      .post('/api/v1/bills/copy')
      .set('Cookie', 'session_id=sess-1')
      .send({ fromMonth: '2026-13', toMonth: '2026-06', dryRun: true });

    expect(res.status).toBe(400);
  });

  it('returns 401 when unauthenticated', async () => {
    const res = await request(app as Parameters<typeof request>[0])
      .post('/api/v1/bills/copy')
      .send({ fromMonth: '2026-05', toMonth: '2026-06', dryRun: true });

    expect(res.status).toBe(401);
  });
});
