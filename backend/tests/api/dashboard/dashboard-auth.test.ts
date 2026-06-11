import request from 'supertest';
import { createApp } from '../../../src/app';

// T002 — plumbing contract: auth, membership and month validation (FR-019).
jest.mock('../../../src/infra/prisma', () => ({
  prisma: {
    session: { findUnique: jest.fn(), update: jest.fn() },
    user: { findUnique: jest.fn(), findMany: jest.fn() },
    category: { findMany: jest.fn() },
    budget: { findMany: jest.fn() },
    expense: { groupBy: jest.fn() },
  },
}));

import { prisma } from '../../../src/infra/prisma';

const app = createApp();

const session = prisma.session as unknown as { findUnique: jest.Mock; update: jest.Mock };
const user = prisma.user as unknown as { findUnique: jest.Mock; findMany: jest.Mock };

function setupAuth(familyGroupId: string | null = 'group-1'): void {
  session.findUnique.mockResolvedValue({
    id: 'sess-1',
    userId: 'user-ana',
    expiresAt: new Date(Date.now() + 60_000),
  });
  session.update.mockResolvedValue({});
  user.findUnique.mockResolvedValue({ familyGroupId });
}

function authed(path: string) {
  return request(app as Parameters<typeof request>[0])
    .get(path)
    .set('Cookie', 'session_id=sess-1');
}

beforeEach(() => jest.clearAllMocks());

describe('GET /api/v1/dashboard — auth & validation plumbing', () => {
  it('returns 401 without a session cookie', async () => {
    const res = await request(app as Parameters<typeof request>[0]).get(
      '/api/v1/dashboard?month=2026-06',
    );
    expect(res.status).toBe(401);
  });

  it('returns 403 when the user has no family group', async () => {
    setupAuth(null);
    const res = await authed('/api/v1/dashboard?month=2026-06');
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('no_group');
  });

  it.each(['', '?month=2026-13', '?month=2026-1', '?month=abc'])(
    'returns 400 dashboard.invalid_month with fieldErrors for "%s"',
    async (qs) => {
      setupAuth();
      const res = await authed(`/api/v1/dashboard${qs}`);
      expect(res.status).toBe(400);
      expect(res.body.code).toBe('dashboard.invalid_month');
      expect(res.body.fieldErrors?.[0]?.field).toBe('month');
    },
  );
});
