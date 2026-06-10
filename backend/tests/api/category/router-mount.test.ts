import request from 'supertest';
import { createApp } from '../../../src/app';

jest.mock('../../../src/infra/prisma', () => ({
  prisma: {
    session: { findUnique: jest.fn(), update: jest.fn() },
    user: { findUnique: jest.fn() },
  },
}));

const app = createApp();

describe('categoryRouter mount', () => {
  it('returns 401 when hitting GET /api/v1/categories without a session cookie', async () => {
    const res = await request(app as Parameters<typeof request>[0]).get('/api/v1/categories');
    expect(res.status).toBe(401);
  });
});
