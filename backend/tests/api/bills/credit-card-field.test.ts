// T022 — US2 contract tests: creditCardId on POST /bills/log (FR-003).
import request from 'supertest';
import { createApp } from '../../../src/app';

jest.mock('../../../src/infra/prisma', () => ({
  prisma: {
    session: { findUnique: jest.fn(), update: jest.fn() },
    user: { findUnique: jest.fn(), findFirst: jest.fn() },
    bill: { create: jest.fn() },
    creditCard: { findFirst: jest.fn() },
  },
}));

import { prisma } from '../../../src/infra/prisma';

const app = createApp();
const session = prisma.session as unknown as { findUnique: jest.Mock; update: jest.Mock };
const user = prisma.user as unknown as { findUnique: jest.Mock; findFirst: jest.Mock };
const bill = prisma.bill as unknown as { create: jest.Mock };
const creditCard = prisma.creditCard as unknown as { findFirst: jest.Mock };

const MEMBER = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
const CARD = 'cc0eebc9-9c0b-4ef8-bb6d-6bb9bd380a33';
const TODAY = new Date().toISOString().slice(0, 10);

function authed(groupId = 'group-1') {
  session.findUnique.mockResolvedValue({
    id: 'sess-1',
    userId: 'user-ana',
    expiresAt: new Date(Date.now() + 60_000),
  });
  session.update.mockResolvedValue({});
  user.findUnique.mockResolvedValue({ familyGroupId: groupId });
  user.findFirst.mockResolvedValue({ id: MEMBER, familyGroupId: groupId });
}

function logBill(overrides = {}) {
  return {
    id: 'bill-new',
    groupId: 'group-1',
    description: 'Mercado',
    expectedAmountCents: 5000,
    dueDate: new Date(`${TODAY}T00:00:00Z`),
    month: new Date(`${TODAY.slice(0, 7)}-01T00:00:00Z`),
    status: 'PAID',
    categoryId: null,
    category: null,
    ownerMemberId: null,
    ownerMember: null,
    recurringBillId: null,
    paidDate: new Date(`${TODAY}T00:00:00Z`),
    actualAmountCents: 5000,
    paidByMemberId: MEMBER,
    paidByMember: { id: MEMBER, name: 'Ana' },
    paymentMethod: 'CREDIT_CARD',
    creditCardId: CARD,
    creditCard: { id: CARD, name: 'Nubank' },
    isFatura: false,
    settledByFaturaId: null,
    createdById: 'user-ana',
    updatedById: 'user-ana',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function post(body: Record<string, unknown>) {
  return request(app as Parameters<typeof request>[0])
    .post('/api/v1/bills/log')
    .set('Cookie', 'session_id=sess-1')
    .send(body);
}

const base = { description: 'Mercado', amountCents: 5000, date: TODAY, paidByMemberId: MEMBER };

beforeEach(() => jest.clearAllMocks());

describe('POST /api/v1/bills/log — creditCardId', () => {
  it('201: credit-card spending with a valid active card', async () => {
    authed();
    creditCard.findFirst.mockResolvedValue({ id: CARD, groupId: 'group-1', status: 'ACTIVE' });
    bill.create.mockResolvedValue(logBill());
    const res = await post({ ...base, paymentMethod: 'CREDIT_CARD', creditCardId: CARD });
    expect(res.status).toBe(201);
    expect(res.body.bill.creditCard).toMatchObject({ id: CARD, name: 'Nubank' });
    expect(res.body.bill.isFatura).toBe(false);
  });

  it('400 credit_card.required: credit method without a card', async () => {
    authed();
    const res = await post({ ...base, paymentMethod: 'CREDIT_CARD' });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('credit_card.required');
  });

  it('400 credit_card.not_allowed: cash/debit carrying a card', async () => {
    authed();
    const res = await post({ ...base, paymentMethod: 'CASH_OR_DEBIT', creditCardId: CARD });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('credit_card.not_allowed');
  });

  it('400 credit_card.not_active: archived card', async () => {
    authed();
    creditCard.findFirst.mockResolvedValue({ id: CARD, groupId: 'group-1', status: 'ARCHIVED' });
    const res = await post({ ...base, paymentMethod: 'CREDIT_CARD', creditCardId: CARD });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('credit_card.not_active');
  });

  it('201: cash/debit spending carries no card', async () => {
    authed();
    bill.create.mockResolvedValue(
      logBill({ paymentMethod: 'CASH_OR_DEBIT', creditCardId: null, creditCard: null }),
    );
    const res = await post({ ...base, paymentMethod: 'CASH_OR_DEBIT' });
    expect(res.status).toBe(201);
    expect(res.body.bill.creditCard).toBeNull();
  });
});
