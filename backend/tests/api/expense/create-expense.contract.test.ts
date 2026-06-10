import request from 'supertest';
import { createApp } from '../../../src/app';

jest.mock('../../../src/infra/prisma', () => {
  const txHandler = jest.fn();
  return {
    prisma: {
      session: { findUnique: jest.fn(), update: jest.fn() },
      user: { findUnique: jest.fn(), findFirst: jest.fn() },
      expense: { create: jest.fn(), findUnique: jest.fn() },
      idempotencyKey: { findUnique: jest.fn(), create: jest.fn() },
      $transaction: txHandler,
    },
  };
});

import { prisma } from '../../../src/infra/prisma';

const app = createApp();

const session = prisma.session as unknown as { findUnique: jest.Mock; update: jest.Mock };
const user = prisma.user as unknown as { findUnique: jest.Mock; findFirst: jest.Mock };
const expense = prisma.expense as unknown as { create: jest.Mock; findUnique: jest.Mock };
const idempotency = prisma.idempotencyKey as unknown as {
  findUnique: jest.Mock;
  create: jest.Mock;
};
const tx = prisma.$transaction as unknown as jest.Mock;

function authedRequest() {
  return request(app as Parameters<typeof request>[0])
    .post('/api/v1/expenses')
    .set('Cookie', 'session_id=sess-1');
}

const validBody = {
  amountCents: 12345,
  date: '2026-05-20',
  description: 'Mercado',
  paymentMethod: 'CASH_OR_DEBIT' as const,
  ownerMemberId: '5f8c7a2e-9b4d-4e1f-a3c5-12d4e5f67890',
};

function setupAuthedMember(): void {
  session.findUnique.mockResolvedValue({
    id: 'sess-1',
    userId: 'user-ana',
    expiresAt: new Date(Date.now() + 60_000),
  });
  session.update.mockResolvedValue({});
  user.findUnique.mockResolvedValue({ familyGroupId: 'group-1' });
}

function setupOwnerInGroup(): void {
  user.findFirst.mockResolvedValue({ id: validBody.ownerMemberId });
}

function mockCreatedExpense(overrides: Record<string, unknown> = {}) {
  return {
    id: 'exp-1',
    groupId: 'group-1',
    amountCents: validBody.amountCents,
    date: new Date(`${validBody.date}T00:00:00Z`),
    description: validBody.description,
    paymentMethod: validBody.paymentMethod,
    ownerMemberId: validBody.ownerMemberId,
    ownerMember: {
      id: validBody.ownerMemberId,
      name: 'Bruno',
      familyGroupId: 'group-1',
    },
    createdById: 'user-ana',
    updatedById: 'user-ana',
    createdAt: new Date('2026-05-25T10:00:00Z'),
    updatedAt: new Date('2026-05-25T10:00:00Z'),
    ...overrides,
  };
}

describe('POST /api/v1/expenses', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 201 with serialized expense when no Idempotency-Key is sent', async () => {
    setupAuthedMember();
    setupOwnerInGroup();
    expense.create.mockResolvedValue(mockCreatedExpense());
    tx.mockImplementation((cb: (c: unknown) => Promise<unknown>) =>
      cb(prisma as unknown as object),
    );

    const res = await authedRequest().send(validBody);

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      id: 'exp-1',
      groupId: 'group-1',
      amountCents: 12345,
      date: '2026-05-20',
      paymentMethod: 'CASH_OR_DEBIT',
      createdById: 'user-ana',
      updatedById: 'user-ana',
      ownerMember: { id: validBody.ownerMemberId, name: 'Bruno', isExMember: false },
    });
    expect(res.body.ownerMember.familyGroupId).toBeUndefined();
    expect(idempotency.create).not.toHaveBeenCalled();
  });

  it('returns 201 and stores Idempotency-Key when sent (new key)', async () => {
    setupAuthedMember();
    setupOwnerInGroup();
    idempotency.findUnique.mockResolvedValue(null);
    expense.create.mockResolvedValue(mockCreatedExpense());
    tx.mockImplementation((cb: (c: unknown) => Promise<unknown>) =>
      cb(prisma as unknown as object),
    );

    const res = await authedRequest()
      .set('Idempotency-Key', 'a2c1d4b6-1111-4abc-8def-1234567890ab')
      .send(validBody);

    expect(res.status).toBe(201);
    expect(idempotency.create).toHaveBeenCalledWith({
      data: {
        key: 'a2c1d4b6-1111-4abc-8def-1234567890ab',
        userId: 'user-ana',
        resourceType: 'EXPENSE',
        resourceId: 'exp-1',
      },
    });
  });

  it('returns 200 with the original expense on idempotency replay (same user)', async () => {
    setupAuthedMember();
    idempotency.findUnique.mockResolvedValue({
      key: 'a2c1d4b6-1111-4abc-8def-1234567890ab',
      userId: 'user-ana',
      resourceType: 'EXPENSE',
      resourceId: 'exp-original',
      createdAt: new Date(),
    });
    expense.findUnique.mockResolvedValue(mockCreatedExpense({ id: 'exp-original' }));

    const res = await authedRequest()
      .set('Idempotency-Key', 'a2c1d4b6-1111-4abc-8def-1234567890ab')
      .send(validBody);

    expect(res.status).toBe(200);
    expect(res.body.id).toBe('exp-original');
    expect(expense.create).not.toHaveBeenCalled();
  });

  it('returns 409 when Idempotency-Key belongs to another user', async () => {
    setupAuthedMember();
    idempotency.findUnique.mockResolvedValue({
      key: 'a2c1d4b6-1111-4abc-8def-1234567890ab',
      userId: 'other-user',
      resourceType: 'EXPENSE',
      resourceId: 'exp-x',
      createdAt: new Date(),
    });

    const res = await authedRequest()
      .set('Idempotency-Key', 'a2c1d4b6-1111-4abc-8def-1234567890ab')
      .send(validBody);

    expect(res.status).toBe(409);
    expect(res.body.code).toBe('idempotency.conflict');
  });

  it('returns 409 cross_resource_conflict when same user reused the key for a CATEGORY', async () => {
    setupAuthedMember();
    idempotency.findUnique.mockResolvedValue({
      key: 'a2c1d4b6-1111-4abc-8def-1234567890ab',
      userId: 'user-ana',
      resourceType: 'CATEGORY',
      resourceId: 'cat-x',
      createdAt: new Date(),
    });

    const res = await authedRequest()
      .set('Idempotency-Key', 'a2c1d4b6-1111-4abc-8def-1234567890ab')
      .send(validBody);

    expect(res.status).toBe(409);
    expect(res.body.code).toBe('idempotency.cross_resource_conflict');
  });

  it('returns 400 with fieldErrors when amountCents is zero', async () => {
    setupAuthedMember();
    const res = await authedRequest().send({ ...validBody, amountCents: 0 });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('validation_error');
    expect(res.body.fieldErrors).toEqual(
      expect.arrayContaining([expect.objectContaining({ field: 'amountCents' })]),
    );
  });

  it('returns 400 with fieldErrors when date is in the future', async () => {
    setupAuthedMember();
    const future = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const res = await authedRequest().send({ ...validBody, date: future });
    expect(res.status).toBe(400);
    expect(res.body.fieldErrors[0].field).toBe('date');
  });

  it('returns 400 with field owner_not_in_group when owner is from another group', async () => {
    setupAuthedMember();
    user.findFirst.mockResolvedValue(null); // owner not in caller's group

    const res = await authedRequest().send(validBody);

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('validation_error');
    expect(res.body.fieldErrors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          field: 'ownerMemberId',
          code: 'owner_not_in_group',
        }),
      ]),
    );
  });

  it('returns 401 when session cookie missing', async () => {
    const res = await request(app as Parameters<typeof request>[0])
      .post('/api/v1/expenses')
      .send(validBody);
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

    const res = await authedRequest().send(validBody);
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('no_group');
  });

  const CAT_ID = 'cccccccc-1111-4abc-8def-111111111111';

  it('returns 201 with denormalized category when categoryId references a root', async () => {
    setupAuthedMember();
    setupOwnerInGroup();
    expense.create.mockResolvedValue(
      mockCreatedExpense({
        category: { id: 'r1', name: 'Alimentação', parentId: null, parent: null },
      }),
    );
    tx.mockImplementation((cb: (c: unknown) => Promise<unknown>) =>
      cb(prisma as unknown as object),
    );

    const res = await authedRequest().send({ ...validBody, categoryId: CAT_ID });

    expect(res.status).toBe(201);
    expect(res.body.category).toEqual({ id: 'r1', name: 'Alimentação' });
    expect(res.body.subCategory).toBeNull();
    expect(expense.create.mock.calls[0]![0].data.categoryId).toBe(CAT_ID);
  });

  it('returns 201 with category=root and subCategory=sub when categoryId references a sub', async () => {
    setupAuthedMember();
    setupOwnerInGroup();
    expense.create.mockResolvedValue(
      mockCreatedExpense({
        category: {
          id: 's1',
          name: 'Mercado',
          parentId: 'r1',
          parent: { id: 'r1', name: 'Alimentação' },
        },
      }),
    );
    tx.mockImplementation((cb: (c: unknown) => Promise<unknown>) =>
      cb(prisma as unknown as object),
    );

    const res = await authedRequest().send({ ...validBody, categoryId: CAT_ID });

    expect(res.status).toBe(201);
    expect(res.body.category).toEqual({ id: 'r1', name: 'Alimentação' });
    expect(res.body.subCategory).toEqual({ id: 's1', name: 'Mercado' });
  });

  it('returns 201 with both null when categoryId is null', async () => {
    setupAuthedMember();
    setupOwnerInGroup();
    expense.create.mockResolvedValue(mockCreatedExpense({ category: null }));
    tx.mockImplementation((cb: (c: unknown) => Promise<unknown>) =>
      cb(prisma as unknown as object),
    );

    const res = await authedRequest().send({ ...validBody, categoryId: null });

    expect(res.status).toBe(201);
    expect(res.body.category).toBeNull();
    expect(res.body.subCategory).toBeNull();
  });

  it('returns 400 when categoryId is a malformed UUID', async () => {
    setupAuthedMember();
    const res = await authedRequest().send({ ...validBody, categoryId: 'not-a-uuid' });
    expect(res.status).toBe(400);
    expect(res.body.fieldErrors[0].field).toBe('categoryId');
  });

  it('retries with categoryId=null and warns when the category was removed concurrently (FR-018)', async () => {
    setupAuthedMember();
    setupOwnerInGroup();
    expense.create
      .mockRejectedValueOnce({ code: 'P2003', meta: { field_name: 'Expense_categoryId_fkey' } })
      .mockResolvedValueOnce(mockCreatedExpense({ category: null }));
    tx.mockImplementation((cb: (c: unknown) => Promise<unknown>) =>
      cb(prisma as unknown as object),
    );

    const res = await authedRequest().send({ ...validBody, categoryId: CAT_ID });

    expect(res.status).toBe(201);
    expect(res.body.category).toBeNull();
    expect(res.body.warnings).toEqual(['category.removed_concurrently']);
    expect(expense.create).toHaveBeenCalledTimes(2);
    expect(expense.create.mock.calls[1]![0].data.categoryId).toBeNull();
  });

  it('serializes ownerMember.isExMember=true when owner left the group', async () => {
    setupAuthedMember();
    setupOwnerInGroup();
    expense.create.mockResolvedValue(
      mockCreatedExpense({
        ownerMember: {
          id: validBody.ownerMemberId,
          name: 'Carlos',
          familyGroupId: null, // ex-member
        },
      }),
    );
    tx.mockImplementation((cb: (c: unknown) => Promise<unknown>) =>
      cb(prisma as unknown as object),
    );

    const res = await authedRequest().send(validBody);
    expect(res.status).toBe(201);
    expect(res.body.ownerMember.isExMember).toBe(true);
  });
});
