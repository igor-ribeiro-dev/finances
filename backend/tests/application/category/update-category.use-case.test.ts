jest.mock('../../../src/infra/prisma', () => {
  const txFn = jest.fn();
  return {
    prisma: {
      category: { findFirst: jest.fn(), update: jest.fn() },
      $transaction: txFn,
    },
  };
});

import { prisma } from '../../../src/infra/prisma';
import { updateCategoryUseCase } from '../../../src/application/category/update-category.use-case';

const category = prisma.category as unknown as { findFirst: jest.Mock; update: jest.Mock };
const tx = prisma.$transaction as unknown as jest.Mock;

const ID = 'dddddddd-1111-4abc-8def-111111111111';
const R2 = 'eeeeeeee-1111-4abc-8def-111111111111';

function cat(overrides: Record<string, unknown> = {}) {
  return {
    id: ID,
    groupId: 'g-1',
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

describe('updateCategoryUseCase', () => {
  beforeEach(() => jest.clearAllMocks());

  it('throws not_found when the category is absent', async () => {
    category.findFirst.mockResolvedValueOnce(null);
    await expect(
      updateCategoryUseCase({ groupId: 'g-1', id: ID, body: { name: 'X', parentId: null } }),
    ).rejects.toMatchObject({ code: 'category.not_found' });
  });

  it('rejects role flip root → sub', async () => {
    category.findFirst.mockResolvedValueOnce(cat({ parentId: null }));
    await expect(
      updateCategoryUseCase({ groupId: 'g-1', id: ID, body: { name: 'X', parentId: R2 } }),
    ).rejects.toMatchObject({ code: 'category.role_immutable' });
  });

  it('rejects role flip sub → root', async () => {
    category.findFirst.mockResolvedValueOnce(cat({ parentId: 'r1' }));
    await expect(
      updateCategoryUseCase({ groupId: 'g-1', id: ID, body: { name: 'X', parentId: null } }),
    ).rejects.toMatchObject({ code: 'category.role_immutable' });
  });

  it('rejects parent_not_root when moving a sub under another sub', async () => {
    category.findFirst
      .mockResolvedValueOnce(cat({ parentId: 'r1' }))
      .mockResolvedValueOnce(cat({ id: R2, parentId: 'r9' }));
    await expect(
      updateCategoryUseCase({ groupId: 'g-1', id: ID, body: { name: 'X', parentId: R2 } }),
    ).rejects.toMatchObject({ code: 'category.parent_not_root' });
  });

  it('maps P2002 to duplicate_name and runs the update inside a transaction', async () => {
    passthroughTx();
    category.findFirst.mockResolvedValueOnce(cat({ parentId: null }));
    category.update.mockRejectedValue({ code: 'P2002' });
    await expect(
      updateCategoryUseCase({ groupId: 'g-1', id: ID, body: { name: 'Dup', parentId: null } }),
    ).rejects.toMatchObject({ code: 'category.duplicate_name', status: 422 });
    expect(tx).toHaveBeenCalled();
  });

  it('FR-024 last-write-wins: two sequential updates both resolve, no 409/version check', async () => {
    passthroughTx();
    category.findFirst.mockResolvedValue(cat({ parentId: null }));
    category.update
      .mockResolvedValueOnce(cat({ name: 'primeiroNome' }))
      .mockResolvedValueOnce(cat({ name: 'segundoNome' }));

    await expect(
      updateCategoryUseCase({
        groupId: 'g-1',
        id: ID,
        body: { name: 'primeiroNome', parentId: null },
      }),
    ).resolves.toMatchObject({ name: 'primeiroNome' });

    // Second write succeeds and wins — no AppError/409, no version comparison.
    await expect(
      updateCategoryUseCase({
        groupId: 'g-1',
        id: ID,
        body: { name: 'segundoNome', parentId: null },
      }),
    ).resolves.toMatchObject({ name: 'segundoNome' });
  });
});
