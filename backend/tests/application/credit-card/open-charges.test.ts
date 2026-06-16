// T032 — US3 unit tests: open-charges aggregation/list + closing-day cycle.
jest.mock('../../../src/infra/prisma', () => ({
  prisma: {
    creditCard: { findFirst: jest.fn() },
    bill: { groupBy: jest.fn(), findMany: jest.fn() },
  },
}));

import { prisma } from '../../../src/infra/prisma';
import { creditCardRepository } from '../../../src/domain/credit-card/credit-card.repository';
import { getCreditCardUseCase } from '../../../src/application/credit-card/get-credit-card.use-case';
import { currentCycleCloseIso } from '../../../src/application/credit-card/credit-card-cycle';

const cardMock = prisma.creditCard as unknown as { findFirst: jest.Mock };
const billMock = prisma.bill as unknown as { groupBy: jest.Mock; findMany: jest.Mock };

const GROUP = 'group-1';
const CARD = 'card-1';

beforeEach(() => jest.clearAllMocks());

describe('openChargesByCard — only unsettled PAID credit purchases', () => {
  it('filters by isFatura=false, PAID, credit, settledByFaturaId=null', async () => {
    billMock.groupBy.mockResolvedValue([
      { creditCardId: CARD, _sum: { actualAmountCents: 12000 } },
    ]);
    const result = await creditCardRepository.openChargesByCard(GROUP);
    const where = billMock.groupBy.mock.calls[0][0].where;
    expect(where).toMatchObject({
      groupId: GROUP,
      isFatura: false,
      paymentMethod: 'CREDIT_CARD',
      status: 'PAID',
      settledByFaturaId: null,
    });
    expect(result).toEqual([{ creditCardId: CARD, openChargesCents: 12000 }]);
  });
});

describe('getCreditCardUseCase — per-card detail', () => {
  it('returns open charges, running total, and the cycle close date', async () => {
    cardMock.findFirst.mockResolvedValue({
      id: CARD,
      groupId: GROUP,
      name: 'Nubank',
      closingDay: 10,
      status: 'ACTIVE',
    });
    billMock.findMany.mockResolvedValue([
      {
        id: 'b1',
        description: 'Mercado',
        actualAmountCents: 5000,
        paidDate: new Date('2026-06-03T00:00:00Z'),
        dueDate: new Date('2026-06-03T00:00:00Z'),
        paidByMember: { id: 'm1', name: 'Ana' },
        category: null,
      },
      {
        id: 'b2',
        description: 'Farmácia',
        actualAmountCents: 7000,
        paidDate: new Date('2026-06-05T00:00:00Z'),
        dueDate: new Date('2026-06-05T00:00:00Z'),
        paidByMember: null,
        category: { id: 'c1', name: 'Saúde' },
      },
    ]);

    const result = await getCreditCardUseCase({ groupId: GROUP, id: CARD });
    expect(result.openChargesCents).toBe(12000);
    expect(result.openCharges).toHaveLength(2);
    expect(result.openCharges[0]).toMatchObject({ id: 'b1', actualAmountCents: 5000 });
    expect(result.cycleCloseDate).toBe(currentCycleCloseIso(10));
  });
});

describe('currentCycleCloseIso — closing-day forecast', () => {
  it('closes this month when today is on/before the closing day', () => {
    expect(currentCycleCloseIso(20, new Date('2026-06-10T00:00:00Z'))).toBe('2026-06-20');
  });

  it('closes next month when today is past the closing day', () => {
    expect(currentCycleCloseIso(5, new Date('2026-06-10T00:00:00Z'))).toBe('2026-07-05');
  });

  it('clamps to the last day of a short month', () => {
    expect(currentCycleCloseIso(31, new Date('2026-02-15T00:00:00Z'))).toBe('2026-02-28');
  });
});
