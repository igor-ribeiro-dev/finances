jest.mock('../../../src/infra/prisma', () => {
  const txFn = jest.fn();
  return {
    prisma: {
      user: { findFirst: jest.fn() },
      expense: { create: jest.fn(), findUnique: jest.fn() },
      idempotencyKey: { findUnique: jest.fn(), create: jest.fn() },
      $transaction: txFn,
    },
  };
});

import { prisma } from '../../../src/infra/prisma';
import { createExpenseUseCase } from '../../../src/application/expense/create-expense.use-case';

const user = prisma.user as unknown as { findFirst: jest.Mock };
const expense = prisma.expense as unknown as { create: jest.Mock; findUnique: jest.Mock };
const idempotency = prisma.idempotencyKey as unknown as {
  findUnique: jest.Mock;
  create: jest.Mock;
};
const tx = prisma.$transaction as unknown as jest.Mock;

const validBody = {
  amountCents: 12345,
  date: '2026-05-20',
  description: 'Mercado',
  paymentMethod: 'CASH_OR_DEBIT' as const,
  ownerMemberId: 'owner-1',
};

function mockExpenseRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'exp-1',
    groupId: 'group-1',
    amountCents: 12345,
    date: new Date('2026-05-20T00:00:00Z'),
    description: 'Mercado',
    paymentMethod: 'CASH_OR_DEBIT',
    ownerMemberId: 'owner-1',
    ownerMember: { id: 'owner-1', name: 'Ana', familyGroupId: 'group-1' },
    createdById: 'user-ana',
    updatedById: 'user-ana',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe('createExpenseUseCase', () => {
  beforeEach(() => jest.clearAllMocks());

  it('throws owner_not_in_group when ownerMemberId does not belong to the caller group', async () => {
    user.findFirst.mockResolvedValue(null);
    await expect(
      createExpenseUseCase({
        userId: 'user-ana',
        groupId: 'group-1',
        body: validBody,
      }),
    ).rejects.toMatchObject({ code: 'owner_not_in_group' });
  });

  it('sets createdById === updatedById === userId on creation', async () => {
    user.findFirst.mockResolvedValue({ id: 'owner-1' });
    expense.create.mockResolvedValue(mockExpenseRow());
    tx.mockImplementation((cb: (c: unknown) => Promise<unknown>) =>
      cb(prisma as unknown as object),
    );

    const result = await createExpenseUseCase({
      userId: 'user-ana',
      groupId: 'group-1',
      body: validBody,
    });

    expect(result.status).toBe('created');
    const call = expense.create.mock.calls[0]![0];
    expect(call.data.createdById).toBe('user-ana');
    expect(call.data.updatedById).toBe('user-ana');
    expect(call.data.groupId).toBe('group-1');
  });

  it('persists the IdempotencyKey inside the transaction when provided', async () => {
    user.findFirst.mockResolvedValue({ id: 'owner-1' });
    idempotency.findUnique.mockResolvedValue(null);
    expense.create.mockResolvedValue(mockExpenseRow({ id: 'exp-99' }));
    tx.mockImplementation((cb: (c: unknown) => Promise<unknown>) =>
      cb(prisma as unknown as object),
    );

    await createExpenseUseCase({
      userId: 'user-ana',
      groupId: 'group-1',
      idempotencyKey: 'a2c1d4b6-1111-4abc-8def-1234567890ab',
      body: validBody,
    });

    expect(idempotency.create).toHaveBeenCalledWith({
      data: {
        key: 'a2c1d4b6-1111-4abc-8def-1234567890ab',
        userId: 'user-ana',
        resourceType: 'EXPENSE',
        resourceId: 'exp-99',
      },
    });
  });

  it('returns replay (200 semantics) when the same user resends the key', async () => {
    idempotency.findUnique.mockResolvedValue({
      key: 'k',
      userId: 'user-ana',
      resourceType: 'EXPENSE',
      resourceId: 'exp-original',
      createdAt: new Date(),
    });
    expense.findUnique.mockResolvedValue(mockExpenseRow({ id: 'exp-original' }));

    const result = await createExpenseUseCase({
      userId: 'user-ana',
      groupId: 'group-1',
      idempotencyKey: 'k',
      body: validBody,
    });

    expect(result.status).toBe('replay');
    expect(result.expense.id).toBe('exp-original');
    expect(expense.create).not.toHaveBeenCalled();
  });

  it('throws idempotency.conflict when key belongs to another user', async () => {
    idempotency.findUnique.mockResolvedValue({
      key: 'k',
      userId: 'other',
      resourceType: 'EXPENSE',
      resourceId: 'exp-x',
      createdAt: new Date(),
    });

    await expect(
      createExpenseUseCase({
        userId: 'user-ana',
        groupId: 'group-1',
        idempotencyKey: 'k',
        body: validBody,
      }),
    ).rejects.toMatchObject({ code: 'idempotency.conflict' });
  });

  it('throws idempotency.cross_resource_conflict when key was used for a CATEGORY', async () => {
    idempotency.findUnique.mockResolvedValue({
      key: 'k',
      userId: 'user-ana',
      resourceType: 'CATEGORY',
      resourceId: 'cat-x',
      createdAt: new Date(),
    });

    await expect(
      createExpenseUseCase({
        userId: 'user-ana',
        groupId: 'group-1',
        idempotencyKey: 'k',
        body: validBody,
      }),
    ).rejects.toMatchObject({ code: 'idempotency.cross_resource_conflict' });
  });

  it('does not write IdempotencyKey when no key is provided', async () => {
    user.findFirst.mockResolvedValue({ id: 'owner-1' });
    expense.create.mockResolvedValue(mockExpenseRow());
    tx.mockImplementation((cb: (c: unknown) => Promise<unknown>) =>
      cb(prisma as unknown as object),
    );

    await createExpenseUseCase({
      userId: 'user-ana',
      groupId: 'group-1',
      body: validBody,
    });

    expect(idempotency.create).not.toHaveBeenCalled();
  });

  it('passes categoryId through to prisma.create', async () => {
    user.findFirst.mockResolvedValue({ id: 'owner-1' });
    expense.create.mockResolvedValue(mockExpenseRow());
    tx.mockImplementation((cb: (c: unknown) => Promise<unknown>) =>
      cb(prisma as unknown as object),
    );

    await createExpenseUseCase({
      userId: 'user-ana',
      groupId: 'group-1',
      body: { ...validBody, categoryId: 'cat-1' },
    });

    expect(expense.create.mock.calls[0]![0].data.categoryId).toBe('cat-1');
  });

  it('retries with categoryId=null and adds a warning on P2003 (FR-018)', async () => {
    user.findFirst.mockResolvedValue({ id: 'owner-1' });
    expense.create
      .mockRejectedValueOnce({ code: 'P2003', meta: { field_name: 'Expense_categoryId_fkey' } })
      .mockResolvedValueOnce(mockExpenseRow());
    tx.mockImplementation((cb: (c: unknown) => Promise<unknown>) =>
      cb(prisma as unknown as object),
    );

    const result = await createExpenseUseCase({
      userId: 'user-ana',
      groupId: 'group-1',
      body: { ...validBody, categoryId: 'cat-1' },
    });

    expect(result.warnings).toEqual(['category.removed_concurrently']);
    expect(expense.create).toHaveBeenCalledTimes(2);
    expect(expense.create.mock.calls[1]![0].data.categoryId).toBeNull();
  });
});
