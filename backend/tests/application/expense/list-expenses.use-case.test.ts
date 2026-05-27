jest.mock('../../../src/infra/prisma', () => ({
  prisma: {
    expense: { findMany: jest.fn() },
  },
}));

import { prisma } from '../../../src/infra/prisma';
import { listExpensesUseCase } from '../../../src/application/expense/list-expenses.use-case';
import { encodeCursor, decodeCursor } from '../../../src/application/expense/cursor';

const findMany = (prisma.expense as unknown as { findMany: jest.Mock }).findMany;

function row(id: string, date = '2026-05-20') {
  return {
    id,
    groupId: 'g-1',
    amountCents: 100,
    date: new Date(`${date}T00:00:00Z`),
    description: id,
    paymentMethod: 'CASH_OR_DEBIT',
    ownerMemberId: 'm-1',
    ownerMember: { id: 'm-1', name: 'Ana', familyGroupId: 'g-1' },
    createdById: 'u-1',
    updatedById: 'u-1',
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

describe('cursor encode/decode', () => {
  it('round-trips through base64url', () => {
    const payload = { date: '2026-05-20', id: '12345678-1111-4abc-8def-123456789012' };
    const token = encodeCursor(payload);
    expect(decodeCursor(token)).toEqual(payload);
  });

  it('returns null for malformed tokens', () => {
    expect(decodeCursor('definitely-not-a-cursor')).toBeNull();
  });

  it('returns null when date is invalid', () => {
    const bad = Buffer.from(
      JSON.stringify({ date: 'not-a-date', id: '12345678-1111-4abc-8def-123456789012' }),
    ).toString('base64url');
    expect(decodeCursor(bad)).toBeNull();
  });

  it('returns null when id is not a UUID', () => {
    const bad = Buffer.from(JSON.stringify({ date: '2026-05-20', id: 'not-a-uuid' })).toString(
      'base64url',
    );
    expect(decodeCursor(bad)).toBeNull();
  });
});

describe('listExpensesUseCase', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns nextCursor=null when fewer than limit rows are fetched', async () => {
    findMany.mockResolvedValue([row('a'), row('b'), row('c')]);
    const result = await listExpensesUseCase({ groupId: 'g-1', limit: 50 });

    expect(result.items).toHaveLength(3);
    expect(result.nextCursor).toBeNull();
    // LIMIT n+1 sent to Prisma
    expect(findMany.mock.calls[0]![0].take).toBe(51);
  });

  it('detects next page via LIMIT n+1 and emits a nextCursor encoding the last kept item', async () => {
    const ids = [
      '11111111-1111-4abc-8def-111111111111',
      '22222222-1111-4abc-8def-222222222222',
      '33333333-1111-4abc-8def-333333333333',
      '44444444-1111-4abc-8def-444444444444',
    ];
    const items = ids.map((id) => row(id, '2026-05-20'));
    findMany.mockResolvedValue(items); // 4 rows fetched with limit=3
    const result = await listExpensesUseCase({ groupId: 'g-1', limit: 3 });

    expect(result.items).toHaveLength(3);
    expect(result.nextCursor).toBeTruthy();
    const decoded = decodeCursor(result.nextCursor!);
    expect(decoded).toEqual({
      date: '2026-05-20',
      id: ids[2],
    });
  });

  it('throws invalid_cursor when the cursor cannot be decoded', async () => {
    await expect(
      listExpensesUseCase({ groupId: 'g-1', limit: 50, cursor: 'garbage' }),
    ).rejects.toMatchObject({ code: 'invalid_cursor' });
  });

  it('passes decoded cursor to the repository as WHERE OR clauses', async () => {
    findMany.mockResolvedValue([]);
    const cursor = encodeCursor({
      date: '2026-05-15',
      id: '12345678-1111-4abc-8def-123456789012',
    });
    await listExpensesUseCase({ groupId: 'g-1', limit: 10, cursor });

    const where = findMany.mock.calls[0]![0].where;
    expect(where.groupId).toBe('g-1');
    expect(where.OR).toHaveLength(2);
  });
});
