jest.mock('../../../src/infra/prisma', () => ({
  prisma: {
    expense: { findFirst: jest.fn() },
  },
}));

import { prisma } from '../../../src/infra/prisma';
import { getExpenseUseCase } from '../../../src/application/expense/get-expense.use-case';

const findFirst = (prisma.expense as unknown as { findFirst: jest.Mock }).findFirst;

describe('getExpenseUseCase', () => {
  beforeEach(() => jest.clearAllMocks());

  it('throws not_found when the row does not exist in the caller group', async () => {
    findFirst.mockResolvedValue(null);
    await expect(getExpenseUseCase({ groupId: 'g-1', id: 'exp-x' })).rejects.toMatchObject({
      code: 'not_found',
    });
  });

  it('returns the row when scoped to caller group', async () => {
    const row = {
      id: 'exp-1',
      groupId: 'g-1',
      amountCents: 100,
      date: new Date('2026-05-20T00:00:00Z'),
      description: 'Mercado',
      paymentMethod: 'CASH_OR_DEBIT',
      ownerMemberId: 'm-1',
      ownerMember: { id: 'm-1', name: 'Ana', familyGroupId: 'g-1' },
      createdById: 'u-1',
      updatedById: 'u-1',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    findFirst.mockResolvedValue(row);

    const result = await getExpenseUseCase({ groupId: 'g-1', id: 'exp-1' });
    expect(result.id).toBe('exp-1');
    // Query is scoped by both id AND groupId — no enumeration leak
    expect(findFirst.mock.calls[0]![0].where).toEqual({ id: 'exp-1', groupId: 'g-1' });
  });
});
