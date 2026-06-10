import request from 'supertest';
import { createApp } from '../../../src/app';

jest.mock('../../../src/infra/prisma', () => {
  const txHandler = jest.fn();
  return {
    prisma: {
      session: { findUnique: jest.fn(), update: jest.fn() },
      user: { findUnique: jest.fn() },
      category: { findFirst: jest.fn(), update: jest.fn() },
      $transaction: txHandler,
    },
  };
});

import { prisma } from '../../../src/infra/prisma';

const app = createApp();
const session = prisma.session as unknown as { findUnique: jest.Mock; update: jest.Mock };
const user = prisma.user as unknown as { findUnique: jest.Mock };
const category = prisma.category as unknown as { findFirst: jest.Mock; update: jest.Mock };
const tx = prisma.$transaction as unknown as jest.Mock;

const CAT_ID = 'dddddddd-1111-4abc-8def-111111111111';
const R2 = 'eeeeeeee-1111-4abc-8def-111111111111';

function authedPatch(body: Record<string, unknown>, id = CAT_ID) {
  return request(app as Parameters<typeof request>[0])
    .patch(`/api/v1/categories/${id}`)
    .set('Cookie', 'session_id=sess-1')
    .send(body);
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

function cat(overrides: Record<string, unknown> = {}) {
  return {
    id: CAT_ID,
    groupId: 'group-1',
    name: 'Alimentação',
    parentId: null,
    createdAt: new Date('2026-06-08T00:00:00Z'),
    updatedAt: new Date('2026-06-08T00:00:00Z'),
    ...overrides,
  };
}

function passthroughTx(): void {
  tx.mockImplementation((cb: (c: unknown) => Promise<unknown>) => cb(prisma as unknown as object));
}

describe('PATCH /api/v1/categories/:id', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 200 renaming a root category', async () => {
    setupAuthedMember();
    passthroughTx();
    category.findFirst.mockResolvedValueOnce(cat({ parentId: null })); // current
    category.update.mockResolvedValue(cat({ name: 'Comida' }));

    const res = await authedPatch({ name: 'Comida', parentId: null });

    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Comida');
  });

  it('returns 200 moving a sub-category to another root', async () => {
    setupAuthedMember();
    passthroughTx();
    category.findFirst
      .mockResolvedValueOnce(cat({ parentId: 'r1' })) // current (a sub)
      .mockResolvedValueOnce(cat({ id: R2, parentId: null })); // new parent (a root)
    category.update.mockResolvedValue(cat({ parentId: R2 }));

    const res = await authedPatch({ name: 'Mercado', parentId: R2 });

    expect(res.status).toBe(200);
    expect(res.body.parentId).toBe(R2);
  });

  it('ignores id/groupId/createdAt sent in the body', async () => {
    setupAuthedMember();
    passthroughTx();
    category.findFirst.mockResolvedValueOnce(cat({ parentId: null }));
    category.update.mockResolvedValue(cat({ name: 'Comida' }));

    await authedPatch({
      name: 'Comida',
      parentId: null,
      id: 'hack',
      groupId: 'g-x',
      createdAt: 'x',
    });

    const data = category.update.mock.calls[0]![0].data;
    expect(data).not.toHaveProperty('id');
    expect(data).not.toHaveProperty('groupId');
    expect(data).not.toHaveProperty('createdAt');
  });

  it('returns 422 role_immutable when a root tries to become a sub', async () => {
    setupAuthedMember();
    category.findFirst.mockResolvedValueOnce(cat({ parentId: null }));
    const res = await authedPatch({ name: 'Alimentação', parentId: R2 });
    expect(res.status).toBe(422);
    expect(res.body.code).toBe('category.role_immutable');
  });

  it('returns 422 role_immutable when a sub tries to become a root', async () => {
    setupAuthedMember();
    category.findFirst.mockResolvedValueOnce(cat({ parentId: 'r1' }));
    const res = await authedPatch({ name: 'Mercado', parentId: null });
    expect(res.status).toBe(422);
    expect(res.body.code).toBe('category.role_immutable');
  });

  it('returns 422 parent_not_root when moving a sub under another sub', async () => {
    setupAuthedMember();
    category.findFirst
      .mockResolvedValueOnce(cat({ parentId: 'r1' })) // current sub
      .mockResolvedValueOnce(cat({ id: R2, parentId: 'r9' })); // new parent is itself a sub
    const res = await authedPatch({ name: 'Mercado', parentId: R2 });
    expect(res.status).toBe(422);
    expect(res.body.code).toBe('category.parent_not_root');
  });

  it('returns 422 parent_invalid when the new parent does not exist in the group', async () => {
    setupAuthedMember();
    category.findFirst.mockResolvedValueOnce(cat({ parentId: 'r1' })).mockResolvedValueOnce(null);
    const res = await authedPatch({ name: 'Mercado', parentId: R2 });
    expect(res.status).toBe(422);
    expect(res.body.code).toBe('category.parent_invalid');
  });

  it('returns 422 duplicate_name when the rename collides (P2002)', async () => {
    setupAuthedMember();
    passthroughTx();
    category.findFirst.mockResolvedValueOnce(cat({ parentId: null }));
    category.update.mockRejectedValue({ code: 'P2002' });
    const res = await authedPatch({ name: 'Transporte', parentId: null });
    expect(res.status).toBe(422);
    expect(res.body.code).toBe('category.duplicate_name');
  });

  it('returns 404 when the category is not in the group', async () => {
    setupAuthedMember();
    category.findFirst.mockResolvedValueOnce(null);
    const res = await authedPatch({ name: 'X', parentId: null });
    expect(res.status).toBe(404);
    expect(res.body.code).toBe('category.not_found');
  });

  it('returns 401 without a session cookie', async () => {
    const res = await request(app as Parameters<typeof request>[0])
      .patch(`/api/v1/categories/${CAT_ID}`)
      .send({ name: 'X', parentId: null });
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
    const res = await authedPatch({ name: 'X', parentId: null });
    expect(res.status).toBe(403);
  });
});
