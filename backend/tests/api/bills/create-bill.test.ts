import request from 'supertest';
import { createApp } from '../../../src/app';

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
    $transaction: jest.fn(),
  },
}));

import { prisma } from '../../../src/infra/prisma';

const app = createApp();

const session = prisma.session as unknown as { findUnique: jest.Mock; update: jest.Mock };
const user = prisma.user as unknown as { findUnique: jest.Mock; findFirst: jest.Mock };
const bill = prisma.bill as unknown as { create: jest.Mock };

function setupAuthedMember(groupId = 'group-1') {
  session.findUnique.mockResolvedValue({
    id: 'sess-1',
    userId: 'user-ana',
    expiresAt: new Date(Date.now() + 60_000),
  });
  session.update.mockResolvedValue({});
  user.findUnique.mockResolvedValue({ familyGroupId: groupId });
}

function authedPost(body: Record<string, unknown>) {
  return request(app as Parameters<typeof request>[0])
    .post('/api/v1/bills')
    .set('Cookie', 'session_id=sess-1')
    .send(body);
}

const validBody = {
  description: 'Aluguel',
  expectedAmountCents: 200000,
  dueDate: '2026-06-10',
};

function mockCreatedBill(overrides: Record<string, unknown> = {}) {
  return {
    id: 'bill-new',
    groupId: 'group-1',
    description: 'Aluguel',
    expectedAmountCents: 200000,
    dueDate: new Date('2026-06-10T00:00:00Z'),
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
    expenseId: null,
    createdAt: new Date('2026-06-01T10:00:00Z'),
    updatedAt: new Date('2026-06-01T10:00:00Z'),
    ...overrides,
  };
}

describe('POST /api/v1/bills', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 201 with PENDING bill and derived month', async () => {
    setupAuthedMember();
    bill.create.mockResolvedValue(mockCreatedBill());

    const res = await authedPost(validBody);

    expect(res.status).toBe(201);
    expect(res.body.bill.id).toBe('bill-new');
    expect(res.body.bill.status).toBe('PENDING');
    expect(res.body.bill.month).toBe('2026-06-01');
    expect(res.body.bill.dueDate).toBe('2026-06-10');
  });

  it('returns 400 when expectedAmountCents is zero', async () => {
    setupAuthedMember();
    const res = await authedPost({ ...validBody, expectedAmountCents: 0 });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('validation_error');
    expect(res.body.fieldErrors).toEqual(
      expect.arrayContaining([expect.objectContaining({ field: 'expectedAmountCents' })]),
    );
  });

  it('returns 400 when expectedAmountCents is negative', async () => {
    setupAuthedMember();
    const res = await authedPost({ ...validBody, expectedAmountCents: -100 });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('validation_error');
  });

  it('returns 400 when description is empty', async () => {
    setupAuthedMember();
    const res = await authedPost({ ...validBody, description: '' });
    expect(res.status).toBe(400);
    expect(res.body.fieldErrors).toEqual(
      expect.arrayContaining([expect.objectContaining({ field: 'description' })]),
    );
  });

  it('returns 400 when description exceeds 200 chars', async () => {
    setupAuthedMember();
    const res = await authedPost({ ...validBody, description: 'a'.repeat(201) });
    expect(res.status).toBe(400);
    expect(res.body.fieldErrors).toEqual(
      expect.arrayContaining([expect.objectContaining({ field: 'description' })]),
    );
  });

  it('returns 400 when dueDate is invalid', async () => {
    setupAuthedMember();
    const res = await authedPost({ ...validBody, dueDate: '2026-13-01' });
    expect(res.status).toBe(400);
    expect(res.body.fieldErrors).toEqual(
      expect.arrayContaining([expect.objectContaining({ field: 'dueDate' })]),
    );
  });

  it('returns 400 when dueDate format is wrong', async () => {
    setupAuthedMember();
    const res = await authedPost({ ...validBody, dueDate: '10/06/2026' });
    expect(res.status).toBe(400);
  });

  it('accepts optional categoryId as null', async () => {
    setupAuthedMember();
    bill.create.mockResolvedValue(mockCreatedBill({ categoryId: null }));

    const res = await authedPost({ ...validBody, categoryId: null });
    expect(res.status).toBe(201);
  });

  it('returns 400 for invalid categoryId UUID', async () => {
    setupAuthedMember();
    const res = await authedPost({ ...validBody, categoryId: 'not-a-uuid' });
    expect(res.status).toBe(400);
    expect(res.body.fieldErrors).toEqual(
      expect.arrayContaining([expect.objectContaining({ field: 'categoryId' })]),
    );
  });

  it('accepts optional ownerMemberId', async () => {
    setupAuthedMember();
    const ownerMemberId = '5f8c7a2e-9b4d-4e1f-a3c5-12d4e5f67890';
    user.findFirst.mockResolvedValue({ id: ownerMemberId });
    bill.create.mockResolvedValue(
      mockCreatedBill({
        ownerMemberId,
        ownerMember: { id: ownerMemberId, name: 'Ana', familyGroupId: 'group-1' },
      }),
    );

    const res = await authedPost({ ...validBody, ownerMemberId });
    expect(res.status).toBe(201);
    expect(res.body.bill.ownerMemberId).toBe(ownerMemberId);
  });

  it('returns 400 when ownerMemberId is not in group', async () => {
    setupAuthedMember();
    user.findFirst.mockResolvedValue(null);

    const res = await authedPost({
      ...validBody,
      ownerMemberId: '5f8c7a2e-9b4d-4e1f-a3c5-12d4e5f67890',
    });
    expect(res.status).toBe(400);
  });

  it('returns 401 when no session', async () => {
    const res = await request(app as Parameters<typeof request>[0])
      .post('/api/v1/bills')
      .send(validBody);
    expect(res.status).toBe(401);
  });

  it('returns 403 when user has no group', async () => {
    session.findUnique.mockResolvedValue({
      id: 'sess-1',
      userId: 'user-ana',
      expiresAt: new Date(Date.now() + 60_000),
    });
    session.update.mockResolvedValue({});
    user.findUnique.mockResolvedValue({ familyGroupId: null });

    const res = await authedPost(validBody);
    expect(res.status).toBe(403);
  });
});
