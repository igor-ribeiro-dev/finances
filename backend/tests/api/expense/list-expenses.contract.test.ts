import request from 'supertest';
import { createApp } from '../../../src/app';

jest.mock('../../../src/infra/prisma', () => ({
  prisma: {
    session: { findUnique: jest.fn(), update: jest.fn() },
    user: { findUnique: jest.fn() },
    expense: { findMany: jest.fn() },
  },
}));

import { prisma } from '../../../src/infra/prisma';

const app = createApp();

const session = prisma.session as unknown as { findUnique: jest.Mock; update: jest.Mock };
const user = prisma.user as unknown as { findUnique: jest.Mock };
const expense = prisma.expense as unknown as { findMany: jest.Mock };

function authed(query = '') {
  return request(app as Parameters<typeof request>[0])
    .get(`/api/v1/expenses${query}`)
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

function mockExpense(overrides: Record<string, unknown> = {}) {
  return {
    id: 'exp-1',
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
    ...overrides,
  };
}

describe('GET /api/v1/expenses', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 200 with empty list and nextCursor null', async () => {
    setupAuthedMember();
    expense.findMany.mockResolvedValue([]);

    const res = await authed();

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ items: [], nextCursor: null });
  });

  it('returns 200 with full page and nextCursor populated when more items exist', async () => {
    setupAuthedMember();
    // Return limit + 1 = 51 to indicate "more pages available"
    const items = Array.from({ length: 51 }, (_, i) =>
      mockExpense({
        id: `exp-${String(i).padStart(8, '0')}-1111-4abc-8def-123456789012`,
        date: new Date('2026-05-20T00:00:00Z'),
      }),
    );
    expense.findMany.mockResolvedValue(items);

    const res = await authed();

    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(50);
    expect(res.body.nextCursor).toBeTruthy();
    // nextCursor should encode the 50th item (index 49)
    const decoded = JSON.parse(
      Buffer.from(res.body.nextCursor as string, 'base64url').toString('utf8'),
    );
    expect(decoded).toEqual({
      date: '2026-05-20',
      id: items[49]!.id,
    });
  });

  it('returns 200 with nextCursor null when fewer items than limit + 1', async () => {
    setupAuthedMember();
    const items = Array.from({ length: 30 }, (_, i) =>
      mockExpense({ id: `exp-${i}-1111-4abc-8def-123456789012` }),
    );
    expense.findMany.mockResolvedValue(items);

    const res = await authed();

    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(30);
    expect(res.body.nextCursor).toBeNull();
  });

  it('uses cursor query param to fetch next page', async () => {
    setupAuthedMember();
    expense.findMany.mockResolvedValue([]);
    const cursor = Buffer.from(
      JSON.stringify({ date: '2026-05-20', id: '12345678-1111-4abc-8def-123456789012' }),
      'utf8',
    ).toString('base64url');

    const res = await authed(`?cursor=${cursor}&limit=10`);

    expect(res.status).toBe(200);
    const call = expense.findMany.mock.calls[0]![0];
    expect(call.take).toBe(11);
    expect(call.where.groupId).toBe('group-1');
    expect(call.where.OR).toBeDefined();
  });

  it('returns 400 when cursor is malformed', async () => {
    setupAuthedMember();

    const res = await authed('?cursor=not-a-valid-cursor');

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('invalid_cursor');
  });

  it('returns 400 when limit is greater than 50', async () => {
    setupAuthedMember();
    const res = await authed('?limit=51');
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('validation_error');
  });

  it('returns 400 when limit is zero or negative', async () => {
    setupAuthedMember();
    const res = await authed('?limit=0');
    expect(res.status).toBe(400);
  });

  it('returns 400 when limit is not a number', async () => {
    setupAuthedMember();
    const res = await authed('?limit=abc');
    expect(res.status).toBe(400);
  });

  it('returns 401 when session cookie is missing', async () => {
    const res = await request(app as Parameters<typeof request>[0]).get('/api/v1/expenses');
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

    const res = await authed();
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('no_group');
  });

  it('scopes findMany query to caller group (isolation)', async () => {
    setupAuthedMember();
    expense.findMany.mockResolvedValue([]);

    await authed();

    const call = expense.findMany.mock.calls[0]![0];
    expect(call.where.groupId).toBe('group-1');
  });

  it('omits ownerMember.familyGroupId from the response JSON', async () => {
    setupAuthedMember();
    expense.findMany.mockResolvedValue([mockExpense()]);

    const res = await authed();

    expect(res.status).toBe(200);
    expect(res.body.items[0].ownerMember.familyGroupId).toBeUndefined();
    expect(res.body.items[0].ownerMember.isExMember).toBe(false);
  });

  it('flags isExMember=true when owner left the group', async () => {
    setupAuthedMember();
    expense.findMany.mockResolvedValue([
      mockExpense({
        ownerMember: { id: 'm-ex', name: 'Carlos', familyGroupId: null },
      }),
    ]);

    const res = await authed();
    expect(res.body.items[0].ownerMember.isExMember).toBe(true);
  });

  it('denormalizes category/subCategory across a mixed page (FR-026 cases A/B/C)', async () => {
    setupAuthedMember();
    expense.findMany.mockResolvedValue([
      mockExpense({
        id: 'e-root',
        category: { id: 'r1', name: 'Alimentação', parentId: null, parent: null },
      }),
      mockExpense({
        id: 'e-sub',
        category: {
          id: 's1',
          name: 'Mercado',
          parentId: 'r1',
          parent: { id: 'r1', name: 'Alimentação' },
        },
      }),
      mockExpense({ id: 'e-none', category: null }),
    ]);

    const res = await authed();
    expect(res.status).toBe(200);
    const [a, b, c] = res.body.items;
    // A) root → category set, subCategory null
    expect(a.category).toEqual({ id: 'r1', name: 'Alimentação' });
    expect(a.subCategory).toBeNull();
    // B) sub → category is the resolved root, subCategory is the sub
    expect(b.category).toEqual({ id: 'r1', name: 'Alimentação' });
    expect(b.subCategory).toEqual({ id: 's1', name: 'Mercado' });
    // C) none → both null
    expect(c.category).toBeNull();
    expect(c.subCategory).toBeNull();
  });
});
