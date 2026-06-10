import request from 'supertest';
import { createApp } from '../../../src/app';

jest.mock('../../../src/infra/prisma', () => {
  const txHandler = jest.fn();
  return {
    prisma: {
      session: { findUnique: jest.fn(), update: jest.fn() },
      user: { findUnique: jest.fn() },
      category: { create: jest.fn(), findFirst: jest.fn(), findMany: jest.fn() },
      idempotencyKey: { findUnique: jest.fn(), create: jest.fn() },
      $transaction: txHandler,
    },
  };
});

import { prisma } from '../../../src/infra/prisma';

const app = createApp();

const session = prisma.session as unknown as { findUnique: jest.Mock; update: jest.Mock };
const user = prisma.user as unknown as { findUnique: jest.Mock };
const category = prisma.category as unknown as {
  create: jest.Mock;
  findFirst: jest.Mock;
  findMany: jest.Mock;
};
const idempotency = prisma.idempotencyKey as unknown as {
  findUnique: jest.Mock;
  create: jest.Mock;
};
const tx = prisma.$transaction as unknown as jest.Mock;

const KEY = 'a2c1d4b6-1111-4abc-8def-1234567890ab';
const ROOT_ID = 'aaaaaaaa-1111-4abc-8def-111111111111';

function authedPost() {
  return request(app as Parameters<typeof request>[0])
    .post('/api/v1/categories')
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

function mockCategory(overrides: Record<string, unknown> = {}) {
  return {
    id: 'cat-1',
    groupId: 'group-1',
    name: 'Alimentação',
    parentId: null,
    createdAt: new Date('2026-06-08T13:42:11.001Z'),
    updatedAt: new Date('2026-06-08T13:42:11.001Z'),
    ...overrides,
  };
}

function passthroughTx(): void {
  tx.mockImplementation((cb: (c: unknown) => Promise<unknown>) => cb(prisma as unknown as object));
}

describe('POST /api/v1/categories', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 201 creating a root category (parentId null)', async () => {
    setupAuthedMember();
    passthroughTx();
    category.create.mockResolvedValue(mockCategory());

    const res = await authedPost().send({ name: 'Alimentação', parentId: null });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ id: 'cat-1', name: 'Alimentação', parentId: null });
    expect(res.body.normalizedName).toBeUndefined();
  });

  it('returns 201 creating a sub-category under a valid root', async () => {
    setupAuthedMember();
    passthroughTx();
    category.findFirst.mockResolvedValue(mockCategory({ id: ROOT_ID, parentId: null })); // parent lookup
    category.create.mockResolvedValue(
      mockCategory({ id: 'cat-2', name: 'Mercado', parentId: ROOT_ID }),
    );

    const res = await authedPost().send({ name: 'Mercado', parentId: ROOT_ID });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ id: 'cat-2', name: 'Mercado', parentId: ROOT_ID });
  });

  it('returns 200 on idempotency replay (same key, user, resourceType CATEGORY)', async () => {
    setupAuthedMember();
    idempotency.findUnique.mockResolvedValue({
      key: KEY,
      userId: 'user-ana',
      resourceType: 'CATEGORY',
      resourceId: 'cat-orig',
      createdAt: new Date(),
    });
    category.findFirst.mockResolvedValue(mockCategory({ id: 'cat-orig' }));

    const res = await authedPost()
      .set('Idempotency-Key', KEY)
      .send({ name: 'Alimentação', parentId: null });

    expect(res.status).toBe(200);
    expect(res.body.id).toBe('cat-orig');
    expect(category.create).not.toHaveBeenCalled();
  });

  it('returns 409 idempotency.conflict when key belongs to another user', async () => {
    setupAuthedMember();
    idempotency.findUnique.mockResolvedValue({
      key: KEY,
      userId: 'other',
      resourceType: 'CATEGORY',
      resourceId: 'cat-x',
      createdAt: new Date(),
    });

    const res = await authedPost().set('Idempotency-Key', KEY).send({ name: 'X', parentId: null });

    expect(res.status).toBe(409);
    expect(res.body.code).toBe('idempotency.conflict');
  });

  it('returns 409 idempotency.cross_resource_conflict when key was used for an EXPENSE', async () => {
    setupAuthedMember();
    idempotency.findUnique.mockResolvedValue({
      key: KEY,
      userId: 'user-ana',
      resourceType: 'EXPENSE',
      resourceId: 'exp-x',
      createdAt: new Date(),
    });

    const res = await authedPost().set('Idempotency-Key', KEY).send({ name: 'X', parentId: null });

    expect(res.status).toBe(409);
    expect(res.body.code).toBe('idempotency.cross_resource_conflict');
  });

  it('returns 422 category.duplicate_name on a unique violation (P2002)', async () => {
    setupAuthedMember();
    passthroughTx();
    category.create.mockRejectedValue({ code: 'P2002' });

    const res = await authedPost().send({ name: 'Alimentação', parentId: null });

    expect(res.status).toBe(422);
    expect(res.body.code).toBe('category.duplicate_name');
    expect(res.body.fieldErrors[0].field).toBe('name');
  });

  it('returns 422 category.parent_not_root when parentId references a sub-category', async () => {
    setupAuthedMember();
    category.findFirst.mockResolvedValue(mockCategory({ id: ROOT_ID, parentId: 'some-root' })); // is a sub

    const res = await authedPost().send({ name: 'Mercado', parentId: ROOT_ID });

    expect(res.status).toBe(422);
    expect(res.body.code).toBe('category.parent_not_root');
    expect(res.body.fieldErrors[0].field).toBe('parentId');
  });

  it('returns 422 category.parent_invalid when parentId does not exist in the group', async () => {
    setupAuthedMember();
    category.findFirst.mockResolvedValue(null);

    const res = await authedPost().send({ name: 'Mercado', parentId: ROOT_ID });

    expect(res.status).toBe(422);
    expect(res.body.code).toBe('category.parent_invalid');
  });

  it('returns 400 validation_error when name is empty/whitespace', async () => {
    setupAuthedMember();
    const res = await authedPost().send({ name: '   ', parentId: null });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('validation_error');
    expect(res.body.fieldErrors[0].field).toBe('name');
  });

  it('returns 400 validation_error when name exceeds 60 chars', async () => {
    setupAuthedMember();
    const res = await authedPost().send({ name: 'a'.repeat(61), parentId: null });
    expect(res.status).toBe(400);
    expect(res.body.fieldErrors[0].field).toBe('name');
  });

  it('returns 401 without a session cookie', async () => {
    const res = await request(app as Parameters<typeof request>[0])
      .post('/api/v1/categories')
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

    const res = await authedPost().send({ name: 'X', parentId: null });
    expect(res.status).toBe(403);
  });
});
