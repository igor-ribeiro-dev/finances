// T009 — US1 unit tests for log-spending use case (written first — MUST FAIL before implementation)

jest.mock('../../../src/infra/prisma', () => ({
  prisma: {
    user: { findFirst: jest.fn() },
    bill: { create: jest.fn() },
    category: { findFirst: jest.fn() },
  },
}));

import { prisma } from '../../../src/infra/prisma';
import { logSpendingUseCase } from '../../../src/application/bill/log-spending.use-case';

const userMock = prisma.user as unknown as { findFirst: jest.Mock };
const billMock = prisma.bill as unknown as { create: jest.Mock };

const GROUP = 'group-1';
const USER = 'user-ana';
const MEMBER = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
const TODAY = new Date().toISOString().slice(0, 10);
const YESTERDAY = new Date(Date.now() - 86400_000).toISOString().slice(0, 10);

function activeMember() {
  userMock.findFirst.mockResolvedValue({ id: MEMBER, familyGroupId: GROUP });
}

function makeBillResult(overrides = {}) {
  return {
    id: 'bill-new',
    groupId: GROUP,
    description: 'Mercado',
    expectedAmountCents: 5000,
    actualAmountCents: 5000,
    dueDate: new Date(`${TODAY}T00:00:00Z`),
    month: new Date(`${TODAY.slice(0, 7)}-01T00:00:00Z`),
    status: 'PAID',
    paidDate: new Date(`${TODAY}T00:00:00Z`),
    paidByMemberId: MEMBER,
    paymentMethod: 'CASH_OR_DEBIT',
    categoryId: null,
    ownerMemberId: null,
    recurringBillId: null,
    createdById: USER,
    updatedById: USER,
    paidByMember: { id: MEMBER, name: 'Ana' },
    ownerMember: null,
    category: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

const validInput = {
  userId: USER,
  groupId: GROUP,
  body: {
    description: 'Mercado',
    amountCents: 5000,
    date: TODAY,
    paymentMethod: 'CASH_OR_DEBIT' as const,
    paidByMemberId: MEMBER,
    categoryId: null,
  },
};

describe('logSpendingUseCase — validation', () => {
  beforeEach(() => jest.clearAllMocks());

  it('throws owner_not_in_group when paidByMemberId is not active in group', async () => {
    userMock.findFirst.mockResolvedValue(null);
    await expect(logSpendingUseCase(validInput)).rejects.toMatchObject({
      code: 'owner_not_in_group',
    });
  });

  it('creates a PAID bill with correct mapping when input is valid', async () => {
    activeMember();
    billMock.create.mockResolvedValue(makeBillResult());

    const result = await logSpendingUseCase(validInput);

    expect(billMock.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'PAID',
          expectedAmountCents: 5000,
          actualAmountCents: 5000,
          paidByMemberId: MEMBER,
          ownerMemberId: null,
          createdById: USER,
          updatedById: USER,
        }),
      }),
    );
    expect(result.status).toBe('PAID');
  });

  it('sets dueDate = paidDate = date', async () => {
    activeMember();
    billMock.create.mockResolvedValue(makeBillResult());

    await logSpendingUseCase(validInput);

    const createCall = billMock.create.mock.calls[0][0];
    const data = createCall.data;
    expect(data.dueDate).toEqual(new Date(`${TODAY}T00:00:00Z`));
    expect(data.paidDate).toEqual(new Date(`${TODAY}T00:00:00Z`));
  });

  it('derives month from date (retroactive date → correct month)', async () => {
    activeMember();
    const pastDate = '2026-03-15';
    const billResult = makeBillResult({
      dueDate: new Date('2026-03-15T00:00:00Z'),
      paidDate: new Date('2026-03-15T00:00:00Z'),
      month: new Date('2026-03-01T00:00:00Z'),
    });
    billMock.create.mockResolvedValue(billResult);

    await logSpendingUseCase({
      ...validInput,
      body: { ...validInput.body, date: pastDate },
    });

    const data = billMock.create.mock.calls[0][0].data;
    expect(data.month).toEqual(new Date('2026-03-01T00:00:00Z'));
  });

  it('sets ownerMemberId = null (Q3)', async () => {
    activeMember();
    billMock.create.mockResolvedValue(makeBillResult());

    await logSpendingUseCase(validInput);

    const data = billMock.create.mock.calls[0][0].data;
    expect(data.ownerMemberId).toBeNull();
  });

  it('accepts a retroactive date (yesterday)', async () => {
    activeMember();
    billMock.create.mockResolvedValue(makeBillResult());
    await expect(
      logSpendingUseCase({ ...validInput, body: { ...validInput.body, date: YESTERDAY } }),
    ).resolves.toBeDefined();
  });
});
