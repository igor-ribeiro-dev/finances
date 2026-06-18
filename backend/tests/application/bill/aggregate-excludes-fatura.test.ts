// T043 — US4 unit test: aggregateMonthSpending excludes faturas (FR-010/SC-004).
jest.mock('../../../src/infra/prisma', () => ({
  prisma: { bill: { groupBy: jest.fn() } },
}));

import { prisma } from '../../../src/infra/prisma';
import { billRepository } from '../../../src/domain/bill/bill.repository';

const billMock = prisma.bill as unknown as { groupBy: jest.Mock };

beforeEach(() => {
  jest.clearAllMocks();
  billMock.groupBy.mockResolvedValue([]);
});

it('filters out faturas (isFatura=false) so they never count toward budgets', async () => {
  await billRepository.aggregateMonthSpending('group-1', '2026-06');
  for (const call of billMock.groupBy.mock.calls) {
    expect(call[0].where).toMatchObject({
      groupId: 'group-1',
      status: 'PAID',
      isFatura: false,
    });
  }
  // both groupBy queries (by member, by category) carry the exclusion
  expect(billMock.groupBy).toHaveBeenCalledTimes(2);
});
