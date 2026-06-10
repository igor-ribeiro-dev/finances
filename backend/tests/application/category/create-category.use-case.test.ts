jest.mock('../../../src/infra/prisma', () => {
  const txFn = jest.fn();
  return {
    prisma: {
      category: { create: jest.fn(), findFirst: jest.fn() },
      idempotencyKey: { findUnique: jest.fn(), create: jest.fn() },
      $transaction: txFn,
    },
  };
});

import { prisma } from '../../../src/infra/prisma';
import { createCategoryUseCase } from '../../../src/application/category/create-category.use-case';

const category = prisma.category as unknown as { create: jest.Mock; findFirst: jest.Mock };
const idempotency = prisma.idempotencyKey as unknown as {
  findUnique: jest.Mock;
  create: jest.Mock;
};
const tx = prisma.$transaction as unknown as jest.Mock;

const ROOT_ID = 'aaaaaaaa-1111-4abc-8def-111111111111';

function mockRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'cat-1',
    groupId: 'group-1',
    name: 'Alimentação',
    parentId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function passthroughTx(): void {
  tx.mockImplementation((cb: (c: unknown) => Promise<unknown>) => cb(prisma as unknown as object));
}

describe('createCategoryUseCase', () => {
  beforeEach(() => jest.clearAllMocks());

  it('creates a root category (happy path)', async () => {
    passthroughTx();
    category.create.mockResolvedValue(mockRow());
    const result = await createCategoryUseCase({
      userId: 'u1',
      groupId: 'group-1',
      body: { name: 'Alimentação', parentId: null },
    });
    expect(result.status).toBe('created');
    expect(category.findFirst).not.toHaveBeenCalled(); // no parent validation for roots
    expect(category.create.mock.calls[0]![0].data).toMatchObject({
      groupId: 'group-1',
      name: 'Alimentação',
      parentId: null,
    });
  });

  it('validates the parent (findByIdInGroup) before creating a sub-category', async () => {
    passthroughTx();
    category.findFirst.mockResolvedValue(mockRow({ id: ROOT_ID, parentId: null }));
    category.create.mockResolvedValue(mockRow({ id: 'cat-2', name: 'Mercado', parentId: ROOT_ID }));
    const result = await createCategoryUseCase({
      userId: 'u1',
      groupId: 'group-1',
      body: { name: 'Mercado', parentId: ROOT_ID },
    });
    expect(result.status).toBe('created');
    expect(category.findFirst).toHaveBeenCalledWith({ where: { id: ROOT_ID, groupId: 'group-1' } });
  });

  it('rejects with parent_not_root when the parent is itself a sub-category', async () => {
    category.findFirst.mockResolvedValue(mockRow({ id: ROOT_ID, parentId: 'another-root' }));
    await expect(
      createCategoryUseCase({
        userId: 'u1',
        groupId: 'group-1',
        body: { name: 'Mercado', parentId: ROOT_ID },
      }),
    ).rejects.toMatchObject({ code: 'category.parent_not_root' });
    expect(category.create).not.toHaveBeenCalled();
  });

  it('rejects with parent_invalid when the parent does not exist in the group', async () => {
    category.findFirst.mockResolvedValue(null);
    await expect(
      createCategoryUseCase({
        userId: 'u1',
        groupId: 'group-1',
        body: { name: 'Mercado', parentId: ROOT_ID },
      }),
    ).rejects.toMatchObject({ code: 'category.parent_invalid' });
  });

  it('returns replay without creating when the same user resends the key', async () => {
    idempotency.findUnique.mockResolvedValue({
      key: 'k',
      userId: 'u1',
      resourceType: 'CATEGORY',
      resourceId: 'cat-orig',
      createdAt: new Date(),
    });
    category.findFirst.mockResolvedValue(mockRow({ id: 'cat-orig' }));
    const result = await createCategoryUseCase({
      userId: 'u1',
      groupId: 'group-1',
      idempotencyKey: 'k',
      body: { name: 'Alimentação', parentId: null },
    });
    expect(result.status).toBe('replay');
    expect(category.create).not.toHaveBeenCalled();
  });

  it('maps a P2002 unique violation to category.duplicate_name with fieldErrors[name]', async () => {
    passthroughTx();
    category.create.mockRejectedValue({ code: 'P2002' });
    await expect(
      createCategoryUseCase({
        userId: 'u1',
        groupId: 'group-1',
        body: { name: 'Alimentação', parentId: null },
      }),
    ).rejects.toMatchObject({
      code: 'category.duplicate_name',
      status: 422,
      fieldErrors: [expect.objectContaining({ field: 'name' })],
    });
  });

  it('persists the IdempotencyKey with resourceType CATEGORY inside the transaction', async () => {
    passthroughTx();
    idempotency.findUnique.mockResolvedValue(null);
    category.create.mockResolvedValue(mockRow({ id: 'cat-9' }));
    await createCategoryUseCase({
      userId: 'u1',
      groupId: 'group-1',
      idempotencyKey: 'a2c1d4b6-1111-4abc-8def-1234567890ab',
      body: { name: 'Alimentação', parentId: null },
    });
    expect(idempotency.create).toHaveBeenCalledWith({
      data: {
        key: 'a2c1d4b6-1111-4abc-8def-1234567890ab',
        userId: 'u1',
        resourceType: 'CATEGORY',
        resourceId: 'cat-9',
      },
    });
  });
});
