// T041 — US4 unit tests: register-fatura (FR-005/008/012a + archived card + amount differs).
jest.mock('../../../src/infra/prisma', () => ({
  prisma: {
    creditCard: { findFirst: jest.fn() },
    bill: { count: jest.fn(), create: jest.fn() },
  },
}));

import { prisma } from '../../../src/infra/prisma';
import { registerFaturaUseCase } from '../../../src/application/credit-card/register-fatura.use-case';

const cardMock = prisma.creditCard as unknown as { findFirst: jest.Mock };
const billMock = prisma.bill as unknown as { count: jest.Mock; create: jest.Mock };

const GROUP = 'group-1';
const CARD = 'card-1';

function card(overrides = {}) {
  return {
    id: CARD,
    groupId: GROUP,
    name: 'Nubank',
    closingDay: 10,
    status: 'ACTIVE',
    ...overrides,
  };
}
const body = { expectedAmountCents: 12000, dueDate: '2026-06-20', description: undefined };

beforeEach(() => {
  jest.clearAllMocks();
  billMock.create.mockResolvedValue({ id: 'fatura-1', isFatura: true, status: 'PENDING' });
});

it('creates a PENDING fatura bill (isFatura=true) for the card', async () => {
  cardMock.findFirst.mockResolvedValue(card());
  billMock.count.mockResolvedValue(0);
  await registerFaturaUseCase({ groupId: GROUP, userId: 'u1', cardId: CARD, body });
  const data = billMock.create.mock.calls[0][0].data;
  expect(data).toMatchObject({
    groupId: GROUP,
    creditCardId: CARD,
    isFatura: true,
    status: 'PENDING',
    expectedAmountCents: 12000,
  });
});

it('blocks a second pending fatura (fatura.pending_exists)', async () => {
  cardMock.findFirst.mockResolvedValue(card());
  billMock.count.mockResolvedValue(1);
  await expect(
    registerFaturaUseCase({ groupId: GROUP, userId: 'u1', cardId: CARD, body }),
  ).rejects.toMatchObject({ code: 'fatura.pending_exists', status: 409 });
  expect(billMock.create).not.toHaveBeenCalled();
});

it('accepts an ARCHIVED card (edge case)', async () => {
  cardMock.findFirst.mockResolvedValue(card({ status: 'ARCHIVED' }));
  billMock.count.mockResolvedValue(0);
  await expect(
    registerFaturaUseCase({ groupId: GROUP, userId: 'u1', cardId: CARD, body }),
  ).resolves.toBeDefined();
});

it('saves a fatura amount that differs from the open charges (FR-012)', async () => {
  cardMock.findFirst.mockResolvedValue(card());
  billMock.count.mockResolvedValue(0);
  await registerFaturaUseCase({
    groupId: GROUP,
    userId: 'u1',
    cardId: CARD,
    body: { ...body, expectedAmountCents: 99999 },
  });
  expect(billMock.create.mock.calls[0][0].data.expectedAmountCents).toBe(99999);
});

it('404 when the card is not in the group', async () => {
  cardMock.findFirst.mockResolvedValue(null);
  await expect(
    registerFaturaUseCase({ groupId: GROUP, userId: 'u1', cardId: 'nope', body }),
  ).rejects.toMatchObject({ code: 'credit_card.not_found', status: 404 });
});
