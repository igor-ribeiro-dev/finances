// T028 (US3) — category delete preview counts PAID Bills, not Expenses.
import request from 'supertest';
import { createApp } from '../../../src/app';

jest.mock('../../../src/infra/prisma', () => ({
  prisma: {
    session: { findUnique: jest.fn(), update: jest.fn() },
    user: { findUnique: jest.fn() },
    category: { findFirst: jest.fn(), findMany: jest.fn() },
    bill: { count: jest.fn() },
  },
}));

import { prisma } from '../../../src/infra/prisma';

const app = createApp();
const session = prisma.session as unknown as { findUnique: jest.Mock; update: jest.Mock };
const user = prisma.user as unknown as { findUnique: jest.Mock };
const category = prisma.category as unknown as { findFirst: jest.Mock; findMany: jest.Mock };
const bill = prisma.bill as unknown as { count: jest.Mock };

const CAT_ID = 'dddddddd-1111-4abc-8def-111111111111';

function authedGet(id = CAT_ID) {
  return request(app as Parameters<typeof request>[0])
    .get(`/api/v1/categories/${id}/delete-preview`)
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

function cat() {
  return {
    id: CAT_ID,
    groupId: 'group-1',
    name: 'Alimentação',
    parentId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

describe('GET /api/v1/categories/:id/delete-preview', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 200 counts for a sub-category with bills (0 subs)', async () => {
    setupAuthedMember();
    category.findFirst.mockResolvedValue(cat());
    category.findMany.mockResolvedValue([]); // no subs
    bill.count.mockResolvedValue(5);
    const res = await authedGet();
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ subCategoriesCount: 0, affectedBillsCount: 5 });
  });

  it('returns 200 counts for a root with subs and bills across the subtree', async () => {
    setupAuthedMember();
    category.findFirst.mockResolvedValue(cat());
    category.findMany.mockResolvedValue([{ id: 's1' }, { id: 's2' }, { id: 's3' }]);
    bill.count.mockResolvedValue(12);
    const res = await authedGet();
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ subCategoriesCount: 3, affectedBillsCount: 12 });
  });

  it('returns 200 zero counts for an empty new category', async () => {
    setupAuthedMember();
    category.findFirst.mockResolvedValue(cat());
    category.findMany.mockResolvedValue([]);
    bill.count.mockResolvedValue(0);
    const res = await authedGet();
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ subCategoriesCount: 0, affectedBillsCount: 0 });
  });

  it('returns 404 when the category is not in the group', async () => {
    setupAuthedMember();
    category.findFirst.mockResolvedValue(null);
    const res = await authedGet();
    expect(res.status).toBe(404);
    expect(res.body.code).toBe('category.not_found');
  });

  it('returns 401 without a session cookie', async () => {
    const res = await request(app as Parameters<typeof request>[0]).get(
      `/api/v1/categories/${CAT_ID}/delete-preview`,
    );
    expect(res.status).toBe(401);
  });

  it('returns 403 when the user has no group', async () => {
    session.findUnique.mockResolvedValue({
      id: 'sess-1',
      userId: 'user-ana',
      expiresAt: new Date(Date.now() + 60_000),
    });
    session.update.mockResolvedValue({});
    user.findUnique.mockResolvedValue({ familyGroupId: null });
    const res = await authedGet();
    expect(res.status).toBe(403);
  });
});
