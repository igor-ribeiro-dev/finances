// T058 — US4 guard: copy-previous-month never produces a fatura, nor copies one
// (FR-005 — faturas are created only via the dedicated action). The recurring
// (conta fixa) path uses CreateManyBillRow, whose shape has no isFatura/
// creditCardId field, so it cannot produce faturas by construction.
jest.mock('../../../src/infra/prisma', () => ({
  prisma: { bill: { findMany: jest.fn(), createMany: jest.fn() } },
}));

import { prisma } from '../../../src/infra/prisma';
import { copyPreviousMonthUseCase } from '../../../src/application/bill/copy-previous-month.use-case';

const billMock = prisma.bill as unknown as { findMany: jest.Mock; createMany: jest.Mock };

const GROUP = 'group-1';

function srcBill(overrides = {}) {
  return {
    id: 'b1',
    groupId: GROUP,
    description: 'Aluguel',
    expectedAmountCents: 100000,
    dueDate: new Date('2026-05-10T00:00:00Z'),
    month: new Date('2026-05-01T00:00:00Z'),
    status: 'PAID',
    categoryId: null,
    ownerMemberId: null,
    recurringBillId: null,
    isFatura: false,
    creditCardId: null,
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  billMock.createMany.mockResolvedValue({ count: 1 });
});

it('does not copy a fatura, and copied rows are never faturas', async () => {
  billMock.findMany.mockResolvedValue([
    srcBill(),
    srcBill({
      id: 'fatura-prev',
      description: 'Fatura Nubank',
      isFatura: true,
      creditCardId: 'card-1',
    }),
  ]);

  await copyPreviousMonthUseCase({
    groupId: GROUP,
    fromMonth: '2026-05',
    toMonth: '2026-06',
    dryRun: false,
  });

  const rows = billMock.createMany.mock.calls[0][0].data;
  // The fatura was excluded → only the 1 regular bill is copied.
  expect(rows).toHaveLength(1);
  expect(rows[0].description).toBe('Aluguel');
  // No copied row carries a fatura marker or a card link.
  for (const r of rows) {
    expect(r.isFatura).toBeUndefined();
    expect(r.creditCardId).toBeUndefined();
  }
});

it('dry-run count also excludes faturas', async () => {
  billMock.findMany.mockResolvedValue([srcBill(), srcBill({ id: 'fatura-prev', isFatura: true })]);
  const res = await copyPreviousMonthUseCase({
    groupId: GROUP,
    fromMonth: '2026-05',
    toMonth: '2026-06',
    dryRun: true,
  });
  expect(res.count).toBe(1);
});
