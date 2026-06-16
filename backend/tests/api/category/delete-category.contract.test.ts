// T028 (US3) — category delete blocked by PAID Bills, not Expenses.
import request from 'supertest';
import { createApp } from '../../../src/app';

jest.mock('../../../src/infra/prisma', () => ({
  prisma: {
    session: { findUnique: jest.fn(), update: jest.fn() },
    user: { findUnique: jest.fn() },
    category: { findFirst: jest.fn(), delete: jest.fn(), findMany: jest.fn() },
    bill: { count: jest.fn() },
  },
}));

import { prisma } from '../../../src/infra/prisma';

const app = createApp();
const session = prisma.session as unknown as { findUnique: jest.Mock; update: jest.Mock };
const user = prisma.user as unknown as { findUnique: jest.Mock };
const category = prisma.category as unknown as {
  findFirst: jest.Mock;
  delete: jest.Mock;
  findMany: jest.Mock;
};
const bill = prisma.bill as unknown as { count: jest.Mock };

const CAT_ID = 'dddddddd-1111-4abc-8def-111111111111';

function authedDelete(id = CAT_ID) {
  return request(app as Parameters<typeof request>[0])
    .delete(`/api/v1/categories/${id}`)
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

describe('DELETE /api/v1/categories/:id', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 204 deleting a category with no dependencies', async () => {
    setupAuthedMember();
    category.findFirst.mockResolvedValue(cat());
    category.delete.mockResolvedValue(undefined);
    const res = await authedDelete();
    expect(res.status).toBe(204);
  });

  it('returns 409 has_dependencies with blockers when sub-categories/bills exist', async () => {
    setupAuthedMember();
    category.findFirst.mockResolvedValue(cat());
    category.delete.mockRejectedValue({ code: 'P2003' });
    category.findMany.mockResolvedValue([{ id: 's1' }, { id: 's2' }]); // 2 subs
    bill.count.mockResolvedValue(7);

    const res = await authedDelete();
    expect(res.status).toBe(409);
    expect(res.body.code).toBe('category.has_dependencies');
    expect(res.body.blockers).toEqual({ subCategoriesCount: 2, affectedBillsCount: 7 });
  });

  it('returns 404 when the category is not in the group', async () => {
    setupAuthedMember();
    category.findFirst.mockResolvedValue(null);
    const res = await authedDelete();
    expect(res.status).toBe(404);
    expect(res.body.code).toBe('category.not_found');
  });

  it('returns 401 without a session cookie', async () => {
    const res = await request(app as Parameters<typeof request>[0]).delete(
      `/api/v1/categories/${CAT_ID}`,
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
    const res = await authedDelete();
    expect(res.status).toBe(403);
  });
});
