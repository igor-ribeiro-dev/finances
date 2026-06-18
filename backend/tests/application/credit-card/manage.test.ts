// T008 — US1 unit tests for credit-card management use cases
// (written first — MUST FAIL before implementation).

jest.mock('../../../src/infra/prisma', () => {
  const prismaMock: Record<string, unknown> = {
    creditCard: { create: jest.fn(), findFirst: jest.fn(), update: jest.fn(), delete: jest.fn() },
    bill: { count: jest.fn(), groupBy: jest.fn() },
    $transaction: jest.fn(),
  };
  (prismaMock['$transaction'] as jest.Mock).mockImplementation((fn: (tx: unknown) => unknown) =>
    fn(prismaMock),
  );
  return { prisma: prismaMock };
});

import { prisma } from '../../../src/infra/prisma';
import { createCreditCardUseCase } from '../../../src/application/credit-card/create-credit-card.use-case';
import { updateCreditCardUseCase } from '../../../src/application/credit-card/update-credit-card.use-case';
import { archiveCreditCardUseCase } from '../../../src/application/credit-card/archive-credit-card.use-case';
import { deleteCreditCardUseCase } from '../../../src/application/credit-card/delete-credit-card.use-case';

const cardMock = prisma.creditCard as unknown as {
  create: jest.Mock;
  findFirst: jest.Mock;
  update: jest.Mock;
  delete: jest.Mock;
};
const billMock = prisma.bill as unknown as { count: jest.Mock };

const GROUP = 'group-1';
const CARD = 'card-1';

function card(overrides = {}) {
  return {
    id: CARD,
    groupId: GROUP,
    name: 'Nubank',
    closingDay: 10,
    status: 'ACTIVE',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

beforeEach(() => jest.clearAllMocks());

describe('createCreditCardUseCase', () => {
  it('creates a card with name + closingDay', async () => {
    cardMock.create.mockResolvedValue(card());
    const result = await createCreditCardUseCase({
      groupId: GROUP,
      body: { name: 'Nubank', closingDay: 10 },
    });
    expect(cardMock.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: { groupId: GROUP, name: 'Nubank', closingDay: 10 } }),
    );
    expect(result.id).toBe(CARD);
  });

  it('maps a P2002 unique violation to credit_card.duplicate_name', async () => {
    cardMock.create.mockRejectedValue({ code: 'P2002' });
    await expect(
      createCreditCardUseCase({ groupId: GROUP, body: { name: 'Nubank', closingDay: 10 } }),
    ).rejects.toMatchObject({ code: 'credit_card.duplicate_name', status: 422 });
  });
});

describe('updateCreditCardUseCase', () => {
  it('renames an existing card', async () => {
    cardMock.findFirst.mockResolvedValue(card());
    cardMock.update.mockResolvedValue(card({ name: 'Itaú' }));
    const result = await updateCreditCardUseCase({
      groupId: GROUP,
      id: CARD,
      body: { name: 'Itaú' },
    });
    expect(cardMock.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: CARD }, data: { name: 'Itaú' } }),
    );
    expect(result.name).toBe('Itaú');
  });

  it('throws credit_card.not_found for an unknown card', async () => {
    cardMock.findFirst.mockResolvedValue(null);
    await expect(
      updateCreditCardUseCase({ groupId: GROUP, id: 'nope', body: { name: 'X' } }),
    ).rejects.toMatchObject({ code: 'credit_card.not_found', status: 404 });
  });
});

describe('archiveCreditCardUseCase', () => {
  it('sets status to ARCHIVED', async () => {
    cardMock.findFirst.mockResolvedValue(card());
    cardMock.update.mockResolvedValue(card({ status: 'ARCHIVED' }));
    const result = await archiveCreditCardUseCase({ groupId: GROUP, id: CARD });
    expect(cardMock.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: CARD }, data: { status: 'ARCHIVED' } }),
    );
    expect(result.status).toBe('ARCHIVED');
  });
});

describe('deleteCreditCardUseCase', () => {
  it('deletes a card with no bills', async () => {
    cardMock.findFirst.mockResolvedValue(card());
    billMock.count.mockResolvedValue(0);
    await deleteCreditCardUseCase({ groupId: GROUP, id: CARD });
    expect(cardMock.delete).toHaveBeenCalledWith({ where: { id: CARD } });
  });

  it('blocks deletion with credit_card.has_bills when bills are attached', async () => {
    cardMock.findFirst.mockResolvedValue(card());
    billMock.count.mockResolvedValue(3);
    await expect(deleteCreditCardUseCase({ groupId: GROUP, id: CARD })).rejects.toMatchObject({
      code: 'credit_card.has_bills',
      status: 409,
    });
    expect(cardMock.delete).not.toHaveBeenCalled();
  });
});
