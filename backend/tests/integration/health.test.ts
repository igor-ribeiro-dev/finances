// Isolation: This test file has no dependency on the frontend/ directory.
// It runs the Express app in-process using supertest — no network port required.
import request from 'supertest';
import { createApp } from '../../src/app';

const app = createApp();

describe('GET /health', () => {
  it('returns 200 with correct shape matching contracts/health.yaml', async () => {
    const res = await request(app as Parameters<typeof request>[0]).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      status: 'ok',
      service: 'backend',
    });
    expect(typeof res.body.timestamp).toBe('string');
    expect(new Date(res.body.timestamp).toISOString()).toBe(res.body.timestamp);
  });

  it('returns JSON content-type', async () => {
    const res = await request(app as Parameters<typeof request>[0]).get('/health');
    expect(res.headers['content-type']).toMatch(/application\/json/);
  });
});
