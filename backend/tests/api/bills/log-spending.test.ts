// T010 — US1 contract tests for POST /api/v1/bills/log
import request from 'supertest';
import { createApp } from '../../../src/app';
import { createBillInDb } from '../../helpers/bill-factories';

jest.mock('../../../src/infra/prisma', () => ({
  prisma: {
    session: { findUnique: jest.fn(), update: jest.fn() },
    user: { findUnique: jest.fn(), findFirst: jest.fn() },
    bill: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      createMany: jest.fn(),
    },
    recurringBill: { findMany: jest.fn() },
  },
}));

import { prisma } from '../../../src/infra/prisma';

const app = createApp();

const session = prisma.session as unknown as { findUnique: jest.Mock; update: jest.Mock };
const user = prisma.user as unknown as { findUnique: jest.Mock; findFirst: jest.Mock };
const bill = prisma.bill as unknown as { create: jest.Mock; findFirst: jest.Mock };

const GROUP = 'group-1';
const MEMBER_UUID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
const TODAY = new Date().toISOString().slice(0, 10);
const TOMORROW = new Date(Date.now() + 86400_000).toISOString().slice(0, 10);

function setupAuth(groupId = GROUP) {
  session.findUnique.mockResolvedValue({
    id: 'sess-1',
    userId: 'user-ana',
    expiresAt: new Date(Date.now() + 60_000),
  });
  session.update.mockResolvedValue({});
  user.findUnique.mockResolvedValue({ familyGroupId: groupId });
}

function activeMember(memberId = MEMBER_UUID) {
  user.findFirst.mockResolvedValue({ id: memberId, familyGroupId: GROUP });
}

function mockPaidBill(overrides = {}) {
  const today = new Date(`${TODAY}T00:00:00Z`);
  return {
    id: 'bill-new',
    groupId: GROUP,
    description: 'Mercado',
    expectedAmountCents: 5000,
    actualAmountCents: 5000,
    dueDate: today,
    month: new Date(`${TODAY.slice(0, 7)}-01T00:00:00Z`),
    status: 'PAID',
    paidDate: today,
    paidByMemberId: MEMBER_UUID,
    paymentMethod: 'CASH_OR_DEBIT',
    categoryId: null,
    ownerMemberId: null,
    recurringBillId: null,
    createdById: 'user-ana',
    updatedById: 'user-ana',
    paidByMember: { id: MEMBER_UUID, name: 'Ana' },
    ownerMember: null,
    category: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

const validBody = {
  description: 'Mercado',
  amountCents: 5000,
  date: TODAY,
  paymentMethod: 'CASH_OR_DEBIT',
  paidByMemberId: MEMBER_UUID,
};

function authed() {
  return request(app as Parameters<typeof request>[0])
    .post('/api/v1/bills/log')
    .set('Cookie', 'session_id=sess-1');
}

describe('POST /api/v1/bills/log', () => {
  beforeEach(() => jest.clearAllMocks());

  it('201: creates a PAID bill with paidByMember in the response', async () => {
    setupAuth();
    activeMember();
    bill.create.mockResolvedValue(mockPaidBill());

    const res = await authed().send(validBody);

    expect(res.status).toBe(201);
    expect(res.body.bill.status).toBe('PAID');
    expect(res.body.bill.payment.paidByMember).toMatchObject({ id: MEMBER_UUID, name: 'Ana' });
  });

  it('201: retroactive date falls in the correct month (Q1)', async () => {
    setupAuth();
    activeMember();
    const pastDate = '2026-03-15';
    bill.create.mockResolvedValue(
      mockPaidBill({
        dueDate: new Date('2026-03-15T00:00:00Z'),
        paidDate: new Date('2026-03-15T00:00:00Z'),
        month: new Date('2026-03-01T00:00:00Z'),
      }),
    );

    const res = await authed().send({ ...validBody, date: pastDate });

    expect(res.status).toBe(201);
    expect(res.body.bill.month).toMatch(/^2026-03/);
  });

  it('400: amountCents ≤ 0', async () => {
    setupAuth();
    const res = await authed().send({ ...validBody, amountCents: 0 });
    expect(res.status).toBe(400);
  });

  it('400: future date', async () => {
    setupAuth();
    const res = await authed().send({ ...validBody, date: TOMORROW });
    expect(res.status).toBe(400);
  });

  it('400: empty description', async () => {
    setupAuth();
    const res = await authed().send({ ...validBody, description: '' });
    expect(res.status).toBe(400);
  });

  it('400: invalid paymentMethod', async () => {
    setupAuth();
    const res = await authed().send({ ...validBody, paymentMethod: 'WIRE_TRANSFER' });
    expect(res.status).toBe(400);
  });

  it('400: owner_not_in_group when paidByMemberId is not in group', async () => {
    setupAuth();
    user.findFirst.mockResolvedValue(null); // member not in group

    const res = await authed().send(validBody);

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('owner_not_in_group');
  });

  it('401: unauthenticated', async () => {
    const res = await request(app as Parameters<typeof request>[0])
      .post('/api/v1/bills/log')
      .send(validBody);

    expect(res.status).toBe(401);
  });

  it('403: authenticated but no family group', async () => {
    session.findUnique.mockResolvedValue({
      id: 'sess-1',
      userId: 'user-ana',
      expiresAt: new Date(Date.now() + 60_000),
    });
    session.update.mockResolvedValue({});
    user.findUnique.mockResolvedValue({ familyGroupId: null });

    const res = await authed().send(validBody);

    expect(res.status).toBe(403);
  });

  it('group isolation: does not create bill in a different group', async () => {
    setupAuth('group-different');
    user.findFirst.mockResolvedValue(null); // member not in group-different

    const res = await authed().send(validBody);

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('owner_not_in_group');
  });
});

// Unused import kept for type-checking of factory function signature.
void createBillInDb;
