// T042 — US4 unit tests: snapshot settlement on pay + exact reversal on revert (FR-009/SC-005).
jest.mock('../../../src/infra/prisma', () => {
  const prismaMock: Record<string, unknown> = {
    bill: { findFirst: jest.fn(), update: jest.fn(), updateMany: jest.fn() },
    $transaction: jest.fn(),
  };
  (prismaMock['$transaction'] as jest.Mock).mockImplementation((fn: (tx: unknown) => unknown) =>
    fn(prismaMock),
  );
  return { prisma: prismaMock };
});

import { prisma } from '../../../src/infra/prisma';
import { payBillUseCase } from '../../../src/application/bill/pay-bill.use-case';
import { revertPaymentUseCase } from '../../../src/application/bill/revert-payment.use-case';

const billMock = prisma.bill as unknown as {
  findFirst: jest.Mock;
  update: jest.Mock;
  updateMany: jest.Mock;
};

const GROUP = 'group-1';
const CARD = 'card-1';
const FATURA = 'fatura-1';

function fatura(overrides = {}) {
  return {
    id: FATURA,
    groupId: GROUP,
    status: 'PENDING',
    isFatura: true,
    creditCardId: CARD,
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  billMock.update.mockResolvedValue(fatura({ status: 'PAID' }));
  billMock.updateMany.mockResolvedValue({ count: 2 });
});

describe('pay-bill — fatura settlement (snapshot)', () => {
  it('settles all open charges of the card when paying a fatura', async () => {
    billMock.findFirst.mockResolvedValue(fatura());
    await payBillUseCase({
      userId: 'u1',
      groupId: GROUP,
      id: FATURA,
      body: {
        paidDate: '2026-06-20',
        actualAmountCents: 12000,
        paidByMemberId: 'm1',
        paymentMethod: 'CASH_OR_DEBIT',
      },
    });
    // settleOpenCharges → updateMany over open credit purchases of the card
    expect(billMock.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          creditCardId: CARD,
          isFatura: false,
          status: 'PAID',
          settledByFaturaId: null,
        }),
        data: { settledByFaturaId: FATURA },
      }),
    );
  });

  it('does NOT settle anything for a regular (non-fatura) bill', async () => {
    billMock.findFirst.mockResolvedValue(fatura({ isFatura: false, creditCardId: null }));
    billMock.update.mockResolvedValue(
      fatura({ isFatura: false, status: 'PAID', creditCardId: null }),
    );
    await payBillUseCase({
      userId: 'u1',
      groupId: GROUP,
      id: 'bill-x',
      body: {
        paidDate: '2026-06-20',
        actualAmountCents: 5000,
        paidByMemberId: 'm1',
        paymentMethod: 'CASH_OR_DEBIT',
      },
    });
    expect(billMock.updateMany).not.toHaveBeenCalled();
  });
});

describe('revert-payment — fatura un-settlement (exact reversal)', () => {
  it('clears exactly the charges settled by this fatura', async () => {
    billMock.findFirst.mockResolvedValue(fatura({ status: 'PAID' }));
    billMock.update.mockResolvedValue(fatura({ status: 'PENDING' }));
    await revertPaymentUseCase(GROUP, FATURA, 'u1');
    expect(billMock.updateMany).toHaveBeenCalledWith({
      where: { settledByFaturaId: FATURA },
      data: { settledByFaturaId: null },
    });
  });
});
