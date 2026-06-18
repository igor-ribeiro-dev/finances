// T044 — US4 contract test: POST /api/v1/credit-cards/:id/faturas (FR-005/008/012a).
import request from 'supertest';
import { createApp } from '../../../src/app';

jest.mock('../../../src/infra/prisma', () => ({
  prisma: {
    session: { findUnique: jest.fn(), update: jest.fn() },
    user: { findUnique: jest.fn() },
    creditCard: { findFirst: jest.fn() },
    bill: { count: jest.fn(), create: jest.fn() },
  },
}));

import { prisma } from '../../../src/infra/prisma';

const app = createApp();
const session = prisma.session as unknown as { findUnique: jest.Mock; update: jest.Mock };
const user = prisma.user as unknown as { findUnique: jest.Mock };
const creditCard = prisma.creditCard as unknown as { findFirst: jest.Mock };
const bill = prisma.bill as unknown as { count: jest.Mock; create: jest.Mock };

const CARD = 'aa0eebc9-9c0b-4ef8-bb6d-6bb9bd380a11';

function authed(groupId = 'group-1') {
  session.findUnique.mockResolvedValue({
    id: 'sess-1',
    userId: 'user-ana',
    expiresAt: new Date(Date.now() + 60_000),
  });
  session.update.mockResolvedValue({});
  user.findUnique.mockResolvedValue({ familyGroupId: groupId });
  creditCard.findFirst.mockResolvedValue({
    id: CARD,
    groupId,
    name: 'Nubank',
    closingDay: 10,
    status: 'ACTIVE',
  });
}

function faturaBill() {
  return {
    id: 'fatura-1',
    groupId: 'group-1',
    description: 'Fatura Nubank',
    expectedAmountCents: 12000,
    dueDate: new Date('2026-06-20T00:00:00Z'),
    month: new Date('2026-06-01T00:00:00Z'),
    status: 'PENDING',
    categoryId: null,
    category: null,
    ownerMemberId: null,
    ownerMember: null,
    recurringBillId: null,
    paidDate: null,
    actualAmountCents: null,
    paidByMemberId: null,
    paidByMember: null,
    paymentMethod: null,
    creditCardId: CARD,
    creditCard: { id: CARD, name: 'Nubank' },
    isFatura: true,
    settledByFaturaId: null,
    createdById: 'user-ana',
    updatedById: 'user-ana',
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

function post(body: Record<string, unknown>) {
  return request(app as Parameters<typeof request>[0])
    .post(`/api/v1/credit-cards/${CARD}/faturas`)
    .set('Cookie', 'session_id=sess-1')
    .send(body);
}

const validBody = { expectedAmountCents: 12000, dueDate: '2026-06-20' };

beforeEach(() => jest.clearAllMocks());

it('201: creates a fatura bill (isFatura=true)', async () => {
  authed();
  bill.count.mockResolvedValue(0);
  bill.create.mockResolvedValue(faturaBill());
  const res = await post(validBody);
  expect(res.status).toBe(201);
  expect(res.body.bill.isFatura).toBe(true);
  expect(res.body.bill.creditCard).toMatchObject({ id: CARD, name: 'Nubank' });
});

it('409 fatura.pending_exists: a pending fatura already exists', async () => {
  authed();
  bill.count.mockResolvedValue(1);
  const res = await post(validBody);
  expect(res.status).toBe(409);
  expect(res.body.code).toBe('fatura.pending_exists');
});

it('400: amount must be positive', async () => {
  authed();
  const res = await post({ ...validBody, expectedAmountCents: 0 });
  expect(res.status).toBe(400);
});

it('401: no session', async () => {
  const res = await request(app as Parameters<typeof request>[0])
    .post(`/api/v1/credit-cards/${CARD}/faturas`)
    .send(validBody);
  expect(res.status).toBe(401);
});
