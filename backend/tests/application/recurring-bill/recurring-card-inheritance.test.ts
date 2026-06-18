// Feature 012 — recurring bill (conta fixa) credit-card profile:
//  (1) materialized instances inherit the template's card (subscription pre-fill)
//  (2) paying an instance teaches the template the method, card, and amount it was paid with
jest.mock('../../../src/infra/prisma', () => ({
  prisma: {
    recurringBill: { findMany: jest.fn(), updateMany: jest.fn() },
    bill: { createMany: jest.fn(), findFirst: jest.fn(), update: jest.fn() },
    creditCard: { findFirst: jest.fn() },
  },
}));

import { prisma } from '../../../src/infra/prisma';
import { materializeWindowUseCase } from '../../../src/application/recurring-bill/materialize-window.use-case';
import { payBillUseCase } from '../../../src/application/bill/pay-bill.use-case';

const recurringMock = prisma.recurringBill as unknown as {
  findMany: jest.Mock;
  updateMany: jest.Mock;
};
const billMock = prisma.bill as unknown as {
  createMany: jest.Mock;
  findFirst: jest.Mock;
  update: jest.Mock;
};
const cardMock = prisma.creditCard as unknown as { findFirst: jest.Mock };

const GROUP = 'group-1';
const CARD = 'card-1';

beforeEach(() => {
  jest.clearAllMocks();
  billMock.createMany.mockResolvedValue({ count: 2 });
  recurringMock.updateMany.mockResolvedValue({ count: 1 });
});

describe('materialization inherits the subscription card', () => {
  it('seeds each PENDING instance with the template creditCardId', async () => {
    const past = new Date(Date.UTC(2020, 0, 1));
    recurringMock.findMany.mockResolvedValue([
      {
        id: 'sub-1',
        groupId: GROUP,
        description: 'Netflix',
        expectedAmountCents: 3990,
        dueDay: 10,
        interval: 'MONTHLY',
        startMonth: past,
        activeFromMonth: past,
        status: 'ACTIVE',
        categoryId: null,
        ownerMemberId: null,
        creditCardId: CARD,
        deletedAt: null,
      },
    ]);

    await materializeWindowUseCase(GROUP);

    const rows = billMock.createMany.mock.calls[0][0].data;
    expect(rows.length).toBeGreaterThan(0);
    for (const r of rows) {
      expect(r.creditCardId).toBe(CARD);
      expect(r.status).toBe('PENDING');
    }
  });
});

describe('paying a recurring instance teaches the template its payment profile', () => {
  it('stores CREDIT_CARD + card + amount on the parent recurring bill', async () => {
    billMock.findFirst.mockResolvedValue({
      id: 'bill-1',
      groupId: GROUP,
      status: 'PENDING',
      isFatura: false,
      creditCardId: null,
      recurringBillId: 'sub-1',
    });
    cardMock.findFirst.mockResolvedValue({ id: CARD, groupId: GROUP, status: 'ACTIVE' });
    billMock.update.mockResolvedValue({ id: 'bill-1', status: 'PAID' });

    await payBillUseCase({
      userId: 'u1',
      groupId: GROUP,
      id: 'bill-1',
      body: {
        paidDate: '2026-06-10',
        actualAmountCents: 3990,
        paidByMemberId: 'm1',
        paymentMethod: 'CREDIT_CARD',
        creditCardId: CARD,
      },
    });

    expect(recurringMock.updateMany).toHaveBeenCalledWith({
      where: { id: 'sub-1' },
      data: { paymentMethod: 'CREDIT_CARD', creditCardId: CARD, expectedAmountCents: 3990 },
    });
  });

  it('updates amount even when payment method changes (e.g. price increase via debit)', async () => {
    billMock.findFirst.mockResolvedValue({
      id: 'bill-3',
      groupId: GROUP,
      status: 'PENDING',
      isFatura: false,
      creditCardId: null,
      recurringBillId: 'sub-2',
    });
    billMock.update.mockResolvedValue({ id: 'bill-3', status: 'PAID' });

    await payBillUseCase({
      userId: 'u1',
      groupId: GROUP,
      id: 'bill-3',
      body: {
        paidDate: '2026-06-10',
        actualAmountCents: 4500,
        paidByMemberId: 'm1',
        paymentMethod: 'CASH_OR_DEBIT',
      },
    });

    expect(recurringMock.updateMany).toHaveBeenCalledWith({
      where: { id: 'sub-2' },
      data: { paymentMethod: 'CASH_OR_DEBIT', creditCardId: null, expectedAmountCents: 4500 },
    });
  });

  it('does not teach anything for a non-recurring bill', async () => {
    billMock.findFirst.mockResolvedValue({
      id: 'bill-2',
      groupId: GROUP,
      status: 'PENDING',
      isFatura: false,
      creditCardId: null,
      recurringBillId: null,
    });
    billMock.update.mockResolvedValue({ id: 'bill-2', status: 'PAID' });

    await payBillUseCase({
      userId: 'u1',
      groupId: GROUP,
      id: 'bill-2',
      body: {
        paidDate: '2026-06-10',
        actualAmountCents: 5000,
        paidByMemberId: 'm1',
        paymentMethod: 'CASH_OR_DEBIT',
      },
    });

    expect(recurringMock.updateMany).not.toHaveBeenCalled();
  });
});
