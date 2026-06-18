// T021 — US2 unit tests: credit-card link rules (FR-003).
jest.mock('../../../src/infra/prisma', () => ({
  prisma: {
    user: { findFirst: jest.fn() },
    bill: { create: jest.fn() },
    creditCard: { findFirst: jest.fn() },
  },
}));

import { prisma } from '../../../src/infra/prisma';
import { resolveCreditCardForSpending } from '../../../src/application/bill/credit-card-link';
import { logSpendingUseCase } from '../../../src/application/bill/log-spending.use-case';

const cardMock = prisma.creditCard as unknown as { findFirst: jest.Mock };
const userMock = prisma.user as unknown as { findFirst: jest.Mock };
const billMock = prisma.bill as unknown as { create: jest.Mock };

const GROUP = 'group-1';
const CARD = 'cc0eebc9-9c0b-4ef8-bb6d-6bb9bd380a33';
const MEMBER = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
const TODAY = new Date().toISOString().slice(0, 10);

beforeEach(() => jest.clearAllMocks());

describe('resolveCreditCardForSpending', () => {
  it('returns null for cash/debit without a card', async () => {
    await expect(resolveCreditCardForSpending(GROUP, 'CASH_OR_DEBIT', null)).resolves.toBeNull();
  });

  it('rejects cash/debit carrying a card (credit_card.not_allowed)', async () => {
    await expect(resolveCreditCardForSpending(GROUP, 'CASH_OR_DEBIT', CARD)).rejects.toMatchObject({
      code: 'credit_card.not_allowed',
    });
  });

  it('rejects credit without a card (credit_card.required)', async () => {
    await expect(resolveCreditCardForSpending(GROUP, 'CREDIT_CARD', null)).rejects.toMatchObject({
      code: 'credit_card.required',
    });
  });

  it('rejects a card not in the group (credit_card.not_found)', async () => {
    cardMock.findFirst.mockResolvedValue(null);
    await expect(resolveCreditCardForSpending(GROUP, 'CREDIT_CARD', CARD)).rejects.toMatchObject({
      code: 'credit_card.not_found',
    });
  });

  it('rejects an archived card (credit_card.not_active)', async () => {
    cardMock.findFirst.mockResolvedValue({ id: CARD, groupId: GROUP, status: 'ARCHIVED' });
    await expect(resolveCreditCardForSpending(GROUP, 'CREDIT_CARD', CARD)).rejects.toMatchObject({
      code: 'credit_card.not_active',
    });
  });

  it('returns the card id for an active card in the group', async () => {
    cardMock.findFirst.mockResolvedValue({ id: CARD, groupId: GROUP, status: 'ACTIVE' });
    await expect(resolveCreditCardForSpending(GROUP, 'CREDIT_CARD', CARD)).resolves.toBe(CARD);
  });
});

describe('logSpendingUseCase — credit card link', () => {
  it('persists creditCardId for a credit-card spending', async () => {
    userMock.findFirst.mockResolvedValue({ id: MEMBER, familyGroupId: GROUP });
    cardMock.findFirst.mockResolvedValue({ id: CARD, groupId: GROUP, status: 'ACTIVE' });
    billMock.create.mockResolvedValue({ id: 'bill-new', status: 'PAID' });

    await logSpendingUseCase({
      userId: 'user-ana',
      groupId: GROUP,
      body: {
        description: 'Mercado',
        amountCents: 5000,
        date: TODAY,
        paymentMethod: 'CREDIT_CARD',
        paidByMemberId: MEMBER,
        categoryId: null,
        creditCardId: CARD,
      },
    });

    const data = billMock.create.mock.calls[0][0].data;
    expect(data.creditCardId).toBe(CARD);
  });

  it('rejects a credit-card spending without a card', async () => {
    userMock.findFirst.mockResolvedValue({ id: MEMBER, familyGroupId: GROUP });
    await expect(
      logSpendingUseCase({
        userId: 'user-ana',
        groupId: GROUP,
        body: {
          description: 'Mercado',
          amountCents: 5000,
          date: TODAY,
          paymentMethod: 'CREDIT_CARD',
          paidByMemberId: MEMBER,
          categoryId: null,
          creditCardId: null,
        },
      }),
    ).rejects.toMatchObject({ code: 'credit_card.required' });
  });
});
