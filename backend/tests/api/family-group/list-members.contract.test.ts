import request from 'supertest';
import { createApp } from '../../../src/app';

jest.mock('../../../src/infra/prisma', () => ({
  prisma: {
    session: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
  },
}));

import { prisma } from '../../../src/infra/prisma';

const app = createApp();

const session = prisma.session as unknown as {
  findUnique: jest.Mock;
  update: jest.Mock;
};
const user = prisma.user as unknown as {
  findUnique: jest.Mock;
  findMany: jest.Mock;
};

function authenticatedRequest() {
  return request(app as Parameters<typeof request>[0])
    .get('/api/v1/groups/members')
    .set('Cookie', 'session_id=sess-1');
}

describe('GET /api/v1/groups/members', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 200 with active members of the caller group (including self)', async () => {
    session.findUnique.mockResolvedValue({
      id: 'sess-1',
      userId: 'user-ana',
      expiresAt: new Date(Date.now() + 60_000),
    });
    session.update.mockResolvedValue({});
    user.findUnique.mockResolvedValue({ familyGroupId: 'group-1' });
    user.findMany.mockResolvedValue([
      { id: 'user-ana', name: 'Ana' },
      { id: 'user-bruno', name: 'Bruno' },
    ]);

    const res = await authenticatedRequest();

    expect(res.status).toBe(200);
    expect(res.body).toEqual([
      { id: 'user-ana', name: 'Ana' },
      { id: 'user-bruno', name: 'Bruno' },
    ]);
    expect(user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { familyGroupId: 'group-1' },
      }),
    );
  });

  it('returns 401 when no session cookie is sent', async () => {
    const res = await request(app as Parameters<typeof request>[0]).get('/api/v1/groups/members');
    expect(res.status).toBe(401);
    expect(res.body.code).toBe('UNAUTHORIZED');
  });

  it('returns 403 when authenticated user has no family group', async () => {
    session.findUnique.mockResolvedValue({
      id: 'sess-1',
      userId: 'user-ana',
      expiresAt: new Date(Date.now() + 60_000),
    });
    session.update.mockResolvedValue({});
    user.findUnique.mockResolvedValue({ familyGroupId: null });

    const res = await authenticatedRequest();
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('no_group');
  });
});
