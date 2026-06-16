// T007 — US1 contract tests for credit-card CRUD endpoints
// (written first — MUST FAIL before implementation).
import request from 'supertest';
import { createApp } from '../../../src/app';

jest.mock('../../../src/infra/prisma', () => {
  const prismaMock: Record<string, unknown> = {
    session: { findUnique: jest.fn(), update: jest.fn() },
    user: { findUnique: jest.fn(), findFirst: jest.fn() },
    creditCard: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    bill: { count: jest.fn(), groupBy: jest.fn(), findMany: jest.fn() },
    $transaction: jest.fn(),
  };
  (prismaMock['$transaction'] as jest.Mock).mockImplementation((fn: (tx: unknown) => unknown) =>
    fn(prismaMock),
  );
  return { prisma: prismaMock };
});

import { prisma } from '../../../src/infra/prisma';

const app = createApp();
const session = prisma.session as unknown as { findUnique: jest.Mock; update: jest.Mock };
const user = prisma.user as unknown as { findUnique: jest.Mock };
const cardRepo = prisma.creditCard as unknown as {
  create: jest.Mock;
  findFirst: jest.Mock;
  findMany: jest.Mock;
  update: jest.Mock;
  delete: jest.Mock;
};
const billRepo = prisma.bill as unknown as {
  count: jest.Mock;
  groupBy: jest.Mock;
  findMany: jest.Mock;
};

function authedMember(groupId = 'group-1') {
  session.findUnique.mockResolvedValue({
    id: 'sess-1',
    userId: 'user-ana',
    expiresAt: new Date(Date.now() + 60_000),
  });
  session.update.mockResolvedValue({});
  user.findUnique.mockResolvedValue({ familyGroupId: groupId });
}

const CARD = 'aa0eebc9-9c0b-4ef8-bb6d-6bb9bd380a11';
function card(overrides = {}) {
  return {
    id: CARD,
    groupId: 'group-1',
    name: 'Nubank',
    closingDay: 10,
    status: 'ACTIVE',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}
function authed(method: 'get' | 'post' | 'patch' | 'delete', path: string) {
  return request(app as Parameters<typeof request>[0])
    [method](path)
    .set('Cookie', 'session_id=sess-1');
}

beforeEach(() => {
  jest.clearAllMocks();
  billRepo.groupBy.mockResolvedValue([]);
  billRepo.findMany.mockResolvedValue([]);
  billRepo.count.mockResolvedValue(0);
});

describe('POST /api/v1/credit-cards', () => {
  it('returns 201 with the created card', async () => {
    authedMember();
    cardRepo.create.mockResolvedValue(card());
    const res = await authed('post', '/api/v1/credit-cards').send({
      name: 'Nubank',
      closingDay: 10,
    });
    expect(res.status).toBe(201);
    expect(res.body.card).toMatchObject({
      id: CARD,
      name: 'Nubank',
      closingDay: 10,
      status: 'ACTIVE',
      openChargesCents: 0,
    });
  });

  it('returns 400 for closingDay out of 1..31', async () => {
    authedMember();
    const res = await authed('post', '/api/v1/credit-cards').send({
      name: 'Nubank',
      closingDay: 40,
    });
    expect(res.status).toBe(400);
    expect(res.body.fieldErrors).toEqual(
      expect.arrayContaining([expect.objectContaining({ field: 'closingDay' })]),
    );
  });

  it('returns 422 for a duplicate active name (P2002)', async () => {
    authedMember();
    cardRepo.create.mockRejectedValue({ code: 'P2002' });
    const res = await authed('post', '/api/v1/credit-cards').send({
      name: 'Nubank',
      closingDay: 10,
    });
    expect(res.status).toBe(422);
    expect(res.body.code).toBe('credit_card.duplicate_name');
  });

  it('returns 401 without a session', async () => {
    const res = await request(app as Parameters<typeof request>[0])
      .post('/api/v1/credit-cards')
      .send({ name: 'Nubank', closingDay: 10 });
    expect(res.status).toBe(401);
  });

  it('returns 403 when the user has no group', async () => {
    session.findUnique.mockResolvedValue({
      id: 'sess-1',
      userId: 'user-ana',
      expiresAt: new Date(Date.now() + 60_000),
    });
    session.update.mockResolvedValue({});
    user.findUnique.mockResolvedValue({ familyGroupId: null });
    const res = await authed('post', '/api/v1/credit-cards').send({
      name: 'Nubank',
      closingDay: 10,
    });
    expect(res.status).toBe(403);
  });
});

describe('GET /api/v1/credit-cards', () => {
  it('lists cards with openChargesCents', async () => {
    authedMember();
    cardRepo.findMany.mockResolvedValue([card()]);
    const res = await authed('get', '/api/v1/credit-cards');
    expect(res.status).toBe(200);
    expect(res.body.cards).toHaveLength(1);
    expect(res.body.cards[0].openChargesCents).toBe(0);
  });
});

describe('GET /api/v1/credit-cards/:id', () => {
  it('returns the per-card detail with open charges', async () => {
    authedMember();
    cardRepo.findFirst.mockResolvedValue(card());
    const res = await authed('get', `/api/v1/credit-cards/${CARD}`);
    expect(res.status).toBe(200);
    expect(res.body.card).toMatchObject({ id: CARD, openChargesCents: 0 });
    expect(res.body.card.openCharges).toEqual([]);
  });

  it('returns 404 for an unknown card', async () => {
    authedMember();
    cardRepo.findFirst.mockResolvedValue(null);
    const res = await authed('get', `/api/v1/credit-cards/${CARD}`);
    expect(res.status).toBe(404);
    expect(res.body.code).toBe('credit_card.not_found');
  });
});

describe('PATCH /api/v1/credit-cards/:id', () => {
  it('renames the card', async () => {
    authedMember();
    cardRepo.findFirst.mockResolvedValue(card());
    cardRepo.update.mockResolvedValue(card({ name: 'Itaú' }));
    const res = await authed('patch', `/api/v1/credit-cards/${CARD}`).send({ name: 'Itaú' });
    expect(res.status).toBe(200);
    expect(res.body.card.name).toBe('Itaú');
  });

  it('returns 404 for an unknown card', async () => {
    authedMember();
    cardRepo.findFirst.mockResolvedValue(null);
    const res = await authed('patch', `/api/v1/credit-cards/${CARD}`).send({ name: 'Itaú' });
    expect(res.status).toBe(404);
  });
});

describe('POST /api/v1/credit-cards/:id/archive', () => {
  it('archives the card', async () => {
    authedMember();
    cardRepo.findFirst.mockResolvedValue(card());
    cardRepo.update.mockResolvedValue(card({ status: 'ARCHIVED' }));
    const res = await authed('post', `/api/v1/credit-cards/${CARD}/archive`);
    expect(res.status).toBe(200);
    expect(res.body.card.status).toBe('ARCHIVED');
  });
});

describe('DELETE /api/v1/credit-cards/:id', () => {
  it('returns 204 when the card has no bills', async () => {
    authedMember();
    cardRepo.findFirst.mockResolvedValue(card());
    billRepo.count.mockResolvedValue(0);
    const res = await authed('delete', `/api/v1/credit-cards/${CARD}`);
    expect(res.status).toBe(204);
    expect(cardRepo.delete).toHaveBeenCalled();
  });

  it('returns 409 credit_card.has_bills when bills are attached', async () => {
    authedMember();
    cardRepo.findFirst.mockResolvedValue(card());
    billRepo.count.mockResolvedValue(2);
    const res = await authed('delete', `/api/v1/credit-cards/${CARD}`);
    expect(res.status).toBe(409);
    expect(res.body.code).toBe('credit_card.has_bills');
  });
});
