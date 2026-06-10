import request from 'supertest';
import { createApp } from '../../../src/app';

jest.mock('../../../src/infra/prisma', () => ({
  prisma: {
    session: { findUnique: jest.fn(), update: jest.fn() },
    user: { findUnique: jest.fn() },
    category: { findMany: jest.fn() },
  },
}));

import { prisma } from '../../../src/infra/prisma';

const app = createApp();
const session = prisma.session as unknown as { findUnique: jest.Mock; update: jest.Mock };
const user = prisma.user as unknown as { findUnique: jest.Mock };
const category = prisma.category as unknown as { findMany: jest.Mock };

function authedGet() {
  return request(app as Parameters<typeof request>[0])
    .get('/api/v1/categories')
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

function cat(id: string, name: string, parentId: string | null) {
  return {
    id,
    groupId: 'group-1',
    name,
    parentId,
    createdAt: new Date('2026-06-08T00:00:00Z'),
    updatedAt: new Date('2026-06-08T00:00:00Z'),
  };
}

describe('GET /api/v1/categories', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 200 with an empty array when the group has no categories', async () => {
    setupAuthedMember();
    category.findMany.mockResolvedValue([]);
    const res = await authedGet();
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('returns 200 with categories in the order the repository yields (pt-BR collation)', async () => {
    setupAuthedMember();
    category.findMany.mockResolvedValue([
      cat('c1', 'Águas', null),
      cat('c2', 'Alimentação', null),
      cat('c3', 'Alvenaria', null),
    ]);
    const res = await authedGet();
    expect(res.status).toBe(200);
    expect(res.body.map((c: { name: string }) => c.name)).toEqual([
      'Águas',
      'Alimentação',
      'Alvenaria',
    ]);
    expect(res.body[0].normalizedName).toBeUndefined();
  });

  it('returns 401 without a session cookie', async () => {
    const res = await request(app as Parameters<typeof request>[0]).get('/api/v1/categories');
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
    const res = await authedGet();
    expect(res.status).toBe(403);
  });
});
