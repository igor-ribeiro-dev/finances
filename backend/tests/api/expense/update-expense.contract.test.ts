import request from 'supertest';
import { createApp } from '../../../src/app';

jest.mock('../../../src/infra/prisma', () => ({
  prisma: {
    session: { findUnique: jest.fn(), update: jest.fn() },
    user: { findUnique: jest.fn(), findFirst: jest.fn() },
    expense: { findFirst: jest.fn(), update: jest.fn() },
    bill: { findFirst: jest.fn() },
  },
}));

import { prisma } from '../../../src/infra/prisma';

const app = createApp();
const session = prisma.session as unknown as { findUnique: jest.Mock; update: jest.Mock };
const user = prisma.user as unknown as { findUnique: jest.Mock; findFirst: jest.Mock };
const expense = prisma.expense as unknown as { findFirst: jest.Mock; update: jest.Mock };
const bill = prisma.bill as unknown as { findFirst: jest.Mock };

const EXP_ID = '12345678-1111-4abc-8def-123456789012';
const OWNER_ID = '5f8c7a2e-9b4d-4e1f-a3c5-12d4e5f67890';

const validBody = {
  amountCents: 99999,
  date: '2026-05-21',
  description: 'Atualizado',
  paymentMethod: 'CREDIT_CARD' as const,
  ownerMemberId: OWNER_ID,
};

function authedPatch(body: Record<string, unknown> = validBody, id = EXP_ID) {
  return request(app as Parameters<typeof request>[0])
    .patch(`/api/v1/expenses/${id}`)
    .set('Cookie', 'session_id=sess-1')
    .send(body);
}

function setupAuthedMember(userId = 'user-bruno'): void {
  session.findUnique.mockResolvedValue({
    id: 'sess-1',
    userId,
    expiresAt: new Date(Date.now() + 60_000),
  });
  session.update.mockResolvedValue({});
  user.findUnique.mockResolvedValue({ familyGroupId: 'group-1' });
  bill.findFirst.mockResolvedValue(null);
}

function mockExisting() {
  return {
    id: EXP_ID,
    groupId: 'group-1',
    amountCents: 12345,
    date: new Date('2026-05-20T00:00:00Z'),
    description: 'Antiga',
    paymentMethod: 'CASH_OR_DEBIT',
    ownerMemberId: 'm-1',
    ownerMember: { id: 'm-1', name: 'Ana', familyGroupId: 'group-1' },
    createdById: 'user-ana',
    updatedById: 'user-ana',
    createdAt: new Date('2026-05-20T10:00:00Z'),
    updatedAt: new Date('2026-05-20T10:00:00Z'),
  };
}

function mockUpdated(updatedById: string) {
  return {
    ...mockExisting(),
    amountCents: validBody.amountCents,
    date: new Date(`${validBody.date}T00:00:00Z`),
    description: validBody.description,
    paymentMethod: validBody.paymentMethod,
    ownerMemberId: OWNER_ID,
    ownerMember: { id: OWNER_ID, name: 'Bruno', familyGroupId: 'group-1' },
    updatedById,
    updatedAt: new Date('2026-05-21T15:00:00Z'),
  };
}

describe('PATCH /api/v1/expenses/:id', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 200 and overwrites all editable fields', async () => {
    setupAuthedMember('user-bruno');
    expense.findFirst.mockResolvedValue(mockExisting());
    user.findFirst.mockResolvedValue({ id: OWNER_ID });
    expense.update.mockResolvedValue(mockUpdated('user-bruno'));

    const res = await authedPatch();

    expect(res.status).toBe(200);
    expect(res.body.amountCents).toBe(99999);
    expect(res.body.paymentMethod).toBe('CREDIT_CARD');
    expect(res.body.description).toBe('Atualizado');
  });

  it('returns a denormalized category/subCategory after changing categoryId', async () => {
    setupAuthedMember('user-bruno');
    expense.findFirst.mockResolvedValue(mockExisting());
    user.findFirst.mockResolvedValue({ id: OWNER_ID });
    expense.update.mockResolvedValue({
      ...mockUpdated('user-bruno'),
      category: {
        id: 's1',
        name: 'Mercado',
        parentId: 'r1',
        parent: { id: 'r1', name: 'Alimentação' },
      },
    });

    const res = await authedPatch({
      ...validBody,
      categoryId: 'cccccccc-1111-4abc-8def-111111111111',
    });

    expect(res.status).toBe(200);
    expect(res.body.category).toEqual({ id: 'r1', name: 'Alimentação' });
    expect(res.body.subCategory).toEqual({ id: 's1', name: 'Mercado' });
    expect(expense.update.mock.calls[0]![0].data.categoryId).toBe(
      'cccccccc-1111-4abc-8def-111111111111',
    );
  });

  it('warns when the categoryId was deleted during edit (FR-018)', async () => {
    setupAuthedMember('user-bruno');
    expense.findFirst.mockResolvedValue(mockExisting());
    user.findFirst.mockResolvedValue({ id: OWNER_ID });
    expense.update
      .mockRejectedValueOnce({ code: 'P2003', meta: { field_name: 'Expense_categoryId_fkey' } })
      .mockResolvedValueOnce({ ...mockUpdated('user-bruno'), category: null });

    const res = await authedPatch({
      ...validBody,
      categoryId: 'cccccccc-1111-4abc-8def-111111111111',
    });

    expect(res.status).toBe(200);
    expect(res.body.warnings).toEqual(['category.removed_concurrently']);
    expect(res.body.category).toBeNull();
  });

  it('sets updatedById to the session userId (different from createdById)', async () => {
    setupAuthedMember('user-bruno');
    expense.findFirst.mockResolvedValue(mockExisting()); // createdById: user-ana
    user.findFirst.mockResolvedValue({ id: OWNER_ID });
    expense.update.mockResolvedValue(mockUpdated('user-bruno'));

    const res = await authedPatch();

    expect(res.body.createdById).toBe('user-ana');
    expect(res.body.updatedById).toBe('user-bruno');
  });

  it('ignores id/groupId/createdById/updatedById fields sent in body', async () => {
    setupAuthedMember('user-bruno');
    expense.findFirst.mockResolvedValue(mockExisting());
    user.findFirst.mockResolvedValue({ id: OWNER_ID });
    expense.update.mockResolvedValue(mockUpdated('user-bruno'));

    await authedPatch({
      ...validBody,
      id: 'attacker-id',
      groupId: 'group-hostile',
      createdById: 'attacker',
      updatedById: 'attacker',
      createdAt: '2000-01-01T00:00:00Z',
      updatedAt: '2000-01-01T00:00:00Z',
    });

    const call = expense.update.mock.calls[0]![0];
    expect(call.data.updatedById).toBe('user-bruno');
    expect(call.data).not.toHaveProperty('createdById');
    expect(call.data).not.toHaveProperty('id');
    expect(call.data).not.toHaveProperty('groupId');
  });

  it('returns 400 when amountCents is zero', async () => {
    setupAuthedMember();
    expense.findFirst.mockResolvedValue(mockExisting());
    const res = await authedPatch({ ...validBody, amountCents: 0 });
    expect(res.status).toBe(400);
    expect(res.body.fieldErrors[0].field).toBe('amountCents');
  });

  it('returns 400 when date is in the future', async () => {
    setupAuthedMember();
    const future = new Date(Date.now() + 7 * 86_400_000).toISOString().slice(0, 10);
    const res = await authedPatch({ ...validBody, date: future });
    expect(res.status).toBe(400);
    expect(res.body.fieldErrors[0].field).toBe('date');
  });

  it('returns 400 with field owner_not_in_group when owner is ex-member', async () => {
    setupAuthedMember();
    expense.findFirst.mockResolvedValue(mockExisting());
    user.findFirst.mockResolvedValue(null);

    const res = await authedPatch();

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('validation_error');
    expect(res.body.fieldErrors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: 'ownerMemberId', code: 'owner_not_in_group' }),
      ]),
    );
  });

  it('returns 404 when expense does not exist or belongs to another group', async () => {
    setupAuthedMember();
    expense.findFirst.mockResolvedValue(null);

    const res = await authedPatch();

    expect(res.status).toBe(404);
    expect(res.body.code).toBe('not_found');
  });

  it('returns 401 without session', async () => {
    const res = await request(app as Parameters<typeof request>[0])
      .patch(`/api/v1/expenses/${EXP_ID}`)
      .send(validBody);
    expect(res.status).toBe(401);
  });

  it('returns 403 when user has no group', async () => {
    session.findUnique.mockResolvedValue({
      id: 'sess-1',
      userId: 'user-bruno',
      expiresAt: new Date(Date.now() + 60_000),
    });
    session.update.mockResolvedValue({});
    user.findUnique.mockResolvedValue({ familyGroupId: null });

    const res = await authedPatch();
    expect(res.status).toBe(403);
  });
});
