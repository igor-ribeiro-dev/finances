jest.mock('../../../src/infra/prisma', () => ({
  prisma: {
    expense: { findFirst: jest.fn(), delete: jest.fn() },
  },
}));

import { prisma } from '../../../src/infra/prisma';
import { deleteExpenseUseCase } from '../../../src/application/expense/delete-expense.use-case';

const expense = prisma.expense as unknown as { findFirst: jest.Mock; delete: jest.Mock };

describe('deleteExpenseUseCase', () => {
  beforeEach(() => jest.clearAllMocks());

  it('throws not_found when the row is not in the caller group', async () => {
    expense.findFirst.mockResolvedValue(null);
    await expect(deleteExpenseUseCase({ groupId: 'g-1', id: 'exp-x' })).rejects.toMatchObject({
      code: 'not_found',
    });
    expect(expense.delete).not.toHaveBeenCalled();
  });

  it('deletes the row when scoped to caller group', async () => {
    expense.findFirst.mockResolvedValue({
      id: 'exp-1',
      groupId: 'g-1',
      amountCents: 100,
      date: new Date(),
      description: 'X',
      paymentMethod: 'CASH_OR_DEBIT',
      ownerMemberId: 'm-1',
      ownerMember: { id: 'm-1', name: 'Ana', familyGroupId: 'g-1' },
      createdById: 'u-1',
      updatedById: 'u-1',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    expense.delete.mockResolvedValue(undefined);

    await deleteExpenseUseCase({ groupId: 'g-1', id: 'exp-1' });
    expect(expense.delete).toHaveBeenCalledWith({ where: { id: 'exp-1' } });
  });
});
