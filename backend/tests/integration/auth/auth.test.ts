import request from 'supertest';
import { createApp } from '../../../src/app';

const app = createApp();

jest.mock('../../../src/infra/prisma', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    session: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  },
}));

import { prisma } from '../../../src/infra/prisma';

const mockUser = {
  findUnique: prisma.user.findUnique as jest.Mock,
  create: prisma.user.create as jest.Mock,
};
const mockSession = {
  create: prisma.session.create as jest.Mock,
  findUnique: prisma.session.findUnique as jest.Mock,
  update: prisma.session.update as jest.Mock,
  delete: prisma.session.delete as jest.Mock,
};

describe('POST /api/v1/auth/register', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 201 and sets httpOnly cookie on success', async () => {
    mockUser.findUnique.mockResolvedValue(null);
    mockUser.create.mockResolvedValue({
      id: 'u1',
      name: 'Ana',
      email: 'ana@test.com',
      familyGroupId: null,
    });
    mockSession.create.mockResolvedValue({ id: 'sess-1' });

    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ name: 'Ana', email: 'ana@test.com', password: 'Senha123' });

    expect(res.status).toBe(201);
    expect(res.body.email).toBe('ana@test.com');
    const cookie = res.headers['set-cookie'] as unknown as string[] | undefined;
    expect(cookie?.some((c: string) => c.includes('session_id') && c.includes('HttpOnly'))).toBe(
      true,
    );
  });

  it('returns 409 when email already in use', async () => {
    mockUser.findUnique.mockResolvedValue({ id: 'existing' });
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ name: 'Ana', email: 'ana@test.com', password: 'Senha123' });
    expect(res.status).toBe(409);
    expect(res.body.code).toBe('EMAIL_ALREADY_IN_USE');
  });
});

describe('POST /api/v1/auth/login', () => {
  it('returns 401 for invalid credentials', async () => {
    mockUser.findUnique.mockResolvedValue(null);
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'x@x.com', password: 'wrong' });
    expect(res.status).toBe(401);
    expect(res.body.code).toBe('INVALID_CREDENTIALS');
  });
});
