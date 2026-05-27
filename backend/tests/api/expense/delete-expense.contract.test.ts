import request from 'supertest';
import { createApp } from '../../../src/app';

jest.mock('../../../src/infra/prisma', () => ({
  prisma: {
    session: { findUnique: jest.fn(), update: jest.fn() },
    user: { findUnique: jest.fn() },
    expense: { findFirst: jest.fn(), delete: jest.fn() },
  },
}));

import { prisma } from '../../../src/infra/prisma';

const app = createApp();
const session = prisma.session as unknown as { findUnique: jest.Mock; update: jest.Mock };
const user = prisma.user as unknown as { findUnique: jest.Mock };
const expense = prisma.expense as unknown as { findFirst: jest.Mock; delete: jest.Mock };

const EXP_ID = '12345678-1111-4abc-8def-123456789012';

function authedDelete(id = EXP_ID) {
  return request(app as Parameters<typeof request>[0])
    .delete(`/api/v1/expenses/${id}`)
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

function mockExisting() {
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

describe('DELETE /api/v1/expenses/:id', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 204 on success', async () => {
    setupAuthedMember();
    expense.findFirst.mockResolvedValue(mockExisting());
    expense.delete.mockResolvedValue(undefined);

    const res = await authedDelete();

    expect(res.status).toBe(204);
    expect(res.body).toEqual({});
    expect(expense.delete).toHaveBeenCalledWith({ where: { id: EXP_ID } });
  });

  it('returns 404 when expense does not exist', async () => {
    setupAuthedMember();
    expense.findFirst.mockResolvedValue(null);

    const res = await authedDelete();

    expect(res.status).toBe(404);
    expect(res.body.code).toBe('not_found');
    expect(expense.delete).not.toHaveBeenCalled();
  });

  it('returns 404 when expense belongs to another group', async () => {
    setupAuthedMember();
    expense.findFirst.mockResolvedValue(null); // findFirst scoped to caller group

    const res = await authedDelete();
    expect(res.status).toBe(404);
  });

  it('returns 401 without session', async () => {
    const res = await request(app as Parameters<typeof request>[0]).delete(
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

    const res = await authedDelete();
    expect(res.status).toBe(403);
  });
});
