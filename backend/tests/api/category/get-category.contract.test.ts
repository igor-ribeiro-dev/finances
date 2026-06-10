import request from 'supertest';
import { createApp } from '../../../src/app';

jest.mock('../../../src/infra/prisma', () => ({
  prisma: {
    session: { findUnique: jest.fn(), update: jest.fn() },
    user: { findUnique: jest.fn() },
    category: { findFirst: jest.fn() },
  },
}));

import { prisma } from '../../../src/infra/prisma';

const app = createApp();
const session = prisma.session as unknown as { findUnique: jest.Mock; update: jest.Mock };
const user = prisma.user as unknown as { findUnique: jest.Mock };
const category = prisma.category as unknown as { findFirst: jest.Mock };

const ID = 'aaaaaaaa-1111-4abc-8def-111111111111';

function authedGet(id: string) {
  return request(app as Parameters<typeof request>[0])
    .get(`/api/v1/categories/${id}`)
    .set('Cookie', 'session_id=sess-1');
}

function setupAuthedMember(): void {
  session.findUnique.mockResolvedValue({
    id: 'sess-1',
    userId: 'user-ana',
    expiresAt: new Date(Date.now() + 60_000),
  });
  session.update.mockResolvedValue({});
  user.findUnique.mockResolvedValue({ familyGroupId: 'group-1' });
}

describe('GET /api/v1/categories/:id', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 200 with the category shape', async () => {
    setupAuthedMember();
    category.findFirst.mockResolvedValue({
      id: ID,
      groupId: 'group-1',
      name: 'Alimentação',
      parentId: null,
      createdAt: new Date('2026-06-08T00:00:00Z'),
      updatedAt: new Date('2026-06-08T00:00:00Z'),
    });
    const res = await authedGet(ID);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ id: ID, name: 'Alimentação', parentId: null });
  });

  it('returns 404 category.not_found for an id not in the group (indistinguishable from absent)', async () => {
    setupAuthedMember();
    category.findFirst.mockResolvedValue(null);
    const res = await authedGet(ID);
    expect(res.status).toBe(404);
    expect(res.body.code).toBe('category.not_found');
  });

  it('returns 401 without a session cookie', async () => {
    const res = await request(app as Parameters<typeof request>[0]).get(`/api/v1/categories/${ID}`);
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
    const res = await authedGet(ID);
    expect(res.status).toBe(403);
  });
});
