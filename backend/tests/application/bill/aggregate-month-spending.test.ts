// T019 — US2 unit tests for billRepository.aggregateMonthSpending

jest.mock('../../../src/infra/prisma', () => ({
  prisma: {
    bill: { groupBy: jest.fn() },
  },
}));

import { prisma } from '../../../src/infra/prisma';
import { billRepository } from '../../../src/domain/bill/bill.repository';

const billMock = prisma.bill as unknown as { groupBy: jest.Mock };

const GROUP = 'group-1';
const MONTH = '2026-06';

type GroupByRow = {
  paidByMemberId?: string | null;
  categoryId?: string | null;
  _sum: { actualAmountCents: number | null };
};

function setupGroupBy(byMember: GroupByRow[], byCategory: GroupByRow[]) {
  billMock.groupBy.mockImplementation(({ by }: { by: string[] }) =>
    Promise.resolve(by[0] === 'paidByMemberId' ? byMember : byCategory),
  );
}

describe('billRepository.aggregateMonthSpending', () => {
  beforeEach(() => jest.clearAllMocks());

  it('filters only PAID bills by paidDate in the month range', async () => {
    setupGroupBy([], []);

    await billRepository.aggregateMonthSpending(GROUP, MONTH);

    const calls = billMock.groupBy.mock.calls;
    expect(calls.length).toBe(2);
    for (const [arg] of calls) {
      expect(arg.where.groupId).toBe(GROUP);
      expect(arg.where.status).toBe('PAID');
      expect(arg.where.paidDate).toMatchObject({
        gte: new Date('2026-06-01T00:00:00.000Z'),
        lt: new Date('2026-07-01T00:00:00.000Z'),
      });
    }
  });

  it('returns member spending sums mapped to ownerMemberId', async () => {
    setupGroupBy(
      [
        { paidByMemberId: 'user-ana', _sum: { actualAmountCents: 15000 } },
        { paidByMemberId: 'user-bia', _sum: { actualAmountCents: 8000 } },
      ],
      [],
    );

    const result = await billRepository.aggregateMonthSpending(GROUP, MONTH);

    expect(result.byMember).toEqual([
      { ownerMemberId: 'user-ana', spentCents: 15000 },
      { ownerMemberId: 'user-bia', spentCents: 8000 },
    ]);
  });

  it('excludes rows where paidByMemberId is null', async () => {
    setupGroupBy(
      [
        { paidByMemberId: 'user-ana', _sum: { actualAmountCents: 5000 } },
        { paidByMemberId: null, _sum: { actualAmountCents: 1000 } },
      ],
      [],
    );

    const result = await billRepository.aggregateMonthSpending(GROUP, MONTH);
    expect(result.byMember).toHaveLength(1);
    expect(result.byMember[0]?.ownerMemberId).toBe('user-ana');
  });

  it('returns category spending sums', async () => {
    setupGroupBy(
      [],
      [
        { categoryId: 'cat-food', _sum: { actualAmountCents: 20000 } },
        { categoryId: null, _sum: { actualAmountCents: 5000 } },
      ],
    );

    const result = await billRepository.aggregateMonthSpending(GROUP, MONTH);

    expect(result.byCategory).toEqual([
      { categoryId: 'cat-food', spentCents: 20000 },
      { categoryId: null, spentCents: 5000 },
    ]);
  });

  it('handles null _sum.actualAmountCents as 0', async () => {
    setupGroupBy([{ paidByMemberId: 'user-ana', _sum: { actualAmountCents: null } }], []);

    const result = await billRepository.aggregateMonthSpending(GROUP, MONTH);
    expect(result.byMember[0]?.spentCents).toBe(0);
  });

  it('paidDate governs the month — pending/cancelled bills are excluded by status filter', async () => {
    setupGroupBy([], []);
    await billRepository.aggregateMonthSpending(GROUP, MONTH);
    const call = billMock.groupBy.mock.calls[0][0];
    expect(call.where.status).toBe('PAID');
  });
});
