import request from 'supertest';
import { createApp } from '../../../src/app';

jest.mock('../../../src/infra/prisma', () => ({
  prisma: {
    session: { findUnique: jest.fn(), update: jest.fn() },
    user: { findUnique: jest.fn() },
    expense: { findFirst: jest.fn() },
  },
}));

import { prisma } from '../../../src/infra/prisma';

const app = createApp();
const session = prisma.session as unknown as { findUnique: jest.Mock; update: jest.Mock };
const user = prisma.user as unknown as { findUnique: jest.Mock };
const expense = prisma.expense as unknown as { findFirst: jest.Mock };

const EXP_ID = '12345678-1111-4abc-8def-123456789012';

function authedGet(id = EXP_ID) {
  return request(app as Parameters<typeof request>[0])
    .get(`/api/v1/expenses/${id}`)
    .set('Cookie', 'session_id=sess-1');
}

function setupAuthedMember(): void {
  session.findUnique.mockResolvedValue({
    id: 'sess-1',
    userId: 'user-ana',
    expiresAt: new Date(Date.now() + 60_000),
  });
  session.update.mockResolvedValue({});
  user.findUnique.mockResolvedValue({ familyGroupId: 'group-1' });
}

function mockExpense() {
  return {
    id: EXP_ID,
    groupId: 'group-1',
    amountCents: 12345,
    date: new Date('2026-05-20T00:00:00Z'),
    description: 'Mercado',
    paymentMethod: 'CASH_OR_DEBIT',
    ownerMemberId: 'm-1',
    ownerMember: { id: 'm-1', name: 'Ana', familyGroupId: 'group-1' },
    createdById: 'user-ana',
    updatedById: 'user-ana',
    createdAt: new Date('2026-05-20T10:00:00Z'),
    updatedAt: new Date('2026-05-20T10:00:00Z'),
  };
}

describe('GET /api/v1/expenses/:id', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 200 with the expense when it belongs to caller group', async () => {
    setupAuthedMember();
    expense.findFirst.mockResolvedValue(mockExpense());

    const res = await authedGet();

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(EXP_ID);
    expect(res.body.updatedById).toBe('user-ana');
    expect(res.body.ownerMember.familyGroupId).toBeUndefined();
  });

  it('returns 404 when expense does not exist', async () => {
    setupAuthedMember();
    expense.findFirst.mockResolvedValue(null);

    const res = await authedGet();

    expect(res.status).toBe(404);
    expect(res.body.code).toBe('not_found');
  });

  it('returns 404 when expense belongs to another group (no distinction)', async () => {
    setupAuthedMember();
    // findFirst with WHERE groupId=group-1 returns null because the row's groupId is group-2
    expense.findFirst.mockResolvedValue(null);

    const res = await authedGet();
    expect(res.status).toBe(404);
  });

  it('returns 401 when session cookie missing', async () => {
    const res = await request(app as Parameters<typeof request>[0]).get(
      `/api/v1/expenses/${EXP_ID}`,
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

    const res = await authedGet();
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('no_group');
  });
});
