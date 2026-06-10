jest.mock('../../../src/infra/prisma', () => ({
  prisma: { category: { findMany: jest.fn() } },
}));

import { prisma } from '../../../src/infra/prisma';
import { listCategoriesUseCase } from '../../../src/application/category/list-categories.use-case';

const category = prisma.category as unknown as { findMany: jest.Mock };

describe('listCategoriesUseCase', () => {
  beforeEach(() => jest.clearAllMocks());

  it('queries findMany filtered by groupId, ordered by name asc', async () => {
    category.findMany.mockResolvedValue([]);
    await listCategoriesUseCase({ groupId: 'group-1' });
    expect(category.findMany).toHaveBeenCalledWith({
      where: { groupId: 'group-1' },
      orderBy: { name: 'asc' },
    });
  });

  it('returns the rows the repository yields', async () => {
    const rows = [
      { id: 'c1', groupId: 'group-1', name: 'Águas', parentId: null },
      { id: 'c2', groupId: 'group-1', name: 'Alimentação', parentId: null },
    ];
    category.findMany.mockResolvedValue(rows);
    const result = await listCategoriesUseCase({ groupId: 'group-1' });
    expect(result).toEqual(rows);
  });
});
