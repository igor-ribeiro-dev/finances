// T026 (US3) — /api/v1/expenses* removed; all methods return 404.
import request from 'supertest';
import { createApp } from '../../src/app';

jest.mock('../../src/infra/prisma', () => ({
  prisma: {
    session: { findUnique: jest.fn(), update: jest.fn() },
    user: { findUnique: jest.fn() },
  },
}));

const app = createApp();

describe('/api/v1/expenses* — routes removed (US3)', () => {
  it('GET /api/v1/expenses returns 404', async () => {
    const res = await request(app as Parameters<typeof request>[0]).get('/api/v1/expenses');
    expect(res.status).toBe(404);
  });

  it('POST /api/v1/expenses returns 404', async () => {
    const res = await request(app as Parameters<typeof request>[0])
      .post('/api/v1/expenses')
      .send({});
    expect(res.status).toBe(404);
  });

  it('PATCH /api/v1/expenses/some-id returns 404', async () => {
    const res = await request(app as Parameters<typeof request>[0])
      .patch('/api/v1/expenses/some-id')
      .send({});
    expect(res.status).toBe(404);
  });

  it('DELETE /api/v1/expenses/some-id returns 404', async () => {
    const res = await request(app as Parameters<typeof request>[0]).delete(
      '/api/v1/expenses/some-id',
    );
    expect(res.status).toBe(404);
  });
});
