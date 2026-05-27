jest.mock('../../../src/infra/prisma', () => ({
  prisma: {
    user: { findFirst: jest.fn() },
    expense: { findFirst: jest.fn(), update: jest.fn() },
  },
}));

import { prisma } from '../../../src/infra/prisma';
import { updateExpenseUseCase } from '../../../src/application/expense/update-expense.use-case';

const user = prisma.user as unknown as { findFirst: jest.Mock };
const expense = prisma.expense as unknown as { findFirst: jest.Mock; update: jest.Mock };

const body = {
  amountCents: 9999,
  date: '2026-05-21',
  description: 'Atualizado',
  paymentMethod: 'CREDIT_CARD' as const,
  ownerMemberId: 'm-2',
};

function existing() {
  return {
    id: 'exp-1',
    groupId: 'g-1',
    amountCents: 100,
    date: new Date('2026-05-20T00:00:00Z'),
    description: 'Antiga',
    paymentMethod: 'CASH_OR_DEBIT',
    ownerMemberId: 'm-1',
    ownerMember: { id: 'm-1', name: 'Ana', familyGroupId: 'g-1' },
    createdById: 'user-ana',
    updatedById: 'user-ana',
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

describe('updateExpenseUseCase', () => {
  beforeEach(() => jest.clearAllMocks());

  it('throws not_found when the expense is not in the caller group', async () => {
    expense.findFirst.mockResolvedValue(null);
    await expect(
      updateExpenseUseCase({ userId: 'user-bruno', groupId: 'g-1', id: 'exp-x', body }),
    ).rejects.toMatchObject({ code: 'not_found' });
  });

  it('throws owner_not_in_group when ownerMemberId is an ex-member', async () => {
    expense.findFirst.mockResolvedValue(existing());
    user.findFirst.mockResolvedValue(null);
    await expect(
      updateExpenseUseCase({ userId: 'user-bruno', groupId: 'g-1', id: 'exp-1', body }),
    ).rejects.toMatchObject({ code: 'owner_not_in_group' });
  });

  it('overwrites updatedById with the session userId without touching createdById', async () => {
    expense.findFirst.mockResolvedValue(existing());
    user.findFirst.mockResolvedValue({ id: 'm-2' });
    expense.update.mockResolvedValue({ ...existing(), updatedById: 'user-bruno' });

    await updateExpenseUseCase({
      userId: 'user-bruno',
      groupId: 'g-1',
      id: 'exp-1',
      body,
    });

    const data = expense.update.mock.calls[0]![0].data;
    expect(data.updatedById).toBe('user-bruno');
    expect(data).not.toHaveProperty('createdById');
    expect(data).not.toHaveProperty('id');
    expect(data).not.toHaveProperty('groupId');
  });

  it('trims description and stores the parsed date', async () => {
    expense.findFirst.mockResolvedValue(existing());
    user.findFirst.mockResolvedValue({ id: 'm-2' });
    expense.update.mockResolvedValue(existing());

    await updateExpenseUseCase({
      userId: 'user-bruno',
      groupId: 'g-1',
      id: 'exp-1',
      body: { ...body, description: '  Atualizado  ' },
    });

    const data = expense.update.mock.calls[0]![0].data;
    expect(data.description).toBe('Atualizado');
    expect((data.date as Date).toISOString()).toBe('2026-05-21T00:00:00.000Z');
  });
});
