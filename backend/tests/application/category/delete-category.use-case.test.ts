// T028 (US3) — deleting a category is blocked by PAID Bills (not Expenses).
jest.mock('../../../src/infra/prisma', () => ({
  prisma: {
    category: { findFirst: jest.fn(), delete: jest.fn(), findMany: jest.fn() },
    bill: { count: jest.fn() },
  },
}));

import { prisma } from '../../../src/infra/prisma';
import { deleteCategoryUseCase } from '../../../src/application/category/delete-category.use-case';

const category = prisma.category as unknown as {
  findFirst: jest.Mock;
  delete: jest.Mock;
  findMany: jest.Mock;
};
const bill = prisma.bill as unknown as { count: jest.Mock };

const ID = 'dddddddd-1111-4abc-8def-111111111111';

function cat() {
  return {
    id: ID,
    groupId: 'g-1',
    name: 'Alimentação',
    parentId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

describe('deleteCategoryUseCase', () => {
  beforeEach(() => jest.clearAllMocks());

  it('deletes successfully (204) when there are no dependencies', async () => {
    category.findFirst.mockResolvedValue(cat());
    category.delete.mockResolvedValue(undefined);
    await expect(deleteCategoryUseCase({ groupId: 'g-1', id: ID })).resolves.toBeUndefined();
    expect(category.delete).toHaveBeenCalled();
  });

  it('throws not_found when the category is absent', async () => {
    category.findFirst.mockResolvedValue(null);
    await expect(deleteCategoryUseCase({ groupId: 'g-1', id: ID })).rejects.toMatchObject({
      code: 'category.not_found',
    });
    expect(category.delete).not.toHaveBeenCalled();
  });

  it('on P2003 re-queries bill counts and throws has_dependencies with blockers (409)', async () => {
    category.findFirst.mockResolvedValue(cat());
    category.delete.mockRejectedValue({ code: 'P2003' });
    category.findMany.mockResolvedValue([{ id: 's1' }, { id: 's2' }, { id: 's3' }]); // 3 subs
    bill.count.mockResolvedValue(12); // 12 PAID bills across the subtree

    await expect(deleteCategoryUseCase({ groupId: 'g-1', id: ID })).rejects.toMatchObject({
      code: 'category.has_dependencies',
      status: 409,
      blockers: { subCategoriesCount: 3, affectedBillsCount: 12 },
    });
  });
});
