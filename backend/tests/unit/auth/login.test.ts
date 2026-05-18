import { loginUseCase } from '../../../src/application/auth/login.use-case';

const mockFindByEmail = jest.fn();
const mockSessionCreate = jest.fn();

jest.mock('../../../src/infra/prisma', () => ({
  prisma: {
    user: { findUnique: (...args: unknown[]) => mockFindByEmail(...args) },
    session: { create: (...args: unknown[]) => mockSessionCreate(...args) },
  },
}));

jest.mock('bcrypt', () => ({
  compare: jest.fn(),
}));

import bcrypt from 'bcrypt';

describe('loginUseCase', () => {
  beforeEach(() => jest.clearAllMocks());

  it('throws INVALID_CREDENTIALS when user not found', async () => {
    mockFindByEmail.mockResolvedValue(null);
    await expect(loginUseCase('x@test.com', 'any')).rejects.toMatchObject({
      code: 'INVALID_CREDENTIALS',
    });
  });

  it('throws INVALID_CREDENTIALS when password does not match', async () => {
    mockFindByEmail.mockResolvedValue({ id: 'u1', passwordHash: 'hash' });
    (bcrypt.compare as jest.Mock).mockResolvedValue(false);
    await expect(loginUseCase('x@test.com', 'wrong')).rejects.toMatchObject({
      code: 'INVALID_CREDENTIALS',
    });
  });

  it('creates session with 30-day expiry on success', async () => {
    const user = {
      id: 'u1',
      name: 'Ana',
      email: 'ana@test.com',
      familyGroupId: null,
      passwordHash: 'hash',
    };
    mockFindByEmail.mockResolvedValue(user);
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);
    mockSessionCreate.mockImplementation(
      ({ data }: { data: { expiresAt: Date; userId: string } }) => ({
        id: 'session-1',
        expiresAt: data.expiresAt,
      }),
    );

    const result = await loginUseCase('ana@test.com', 'Senha123');
    expect(result.sessionId).toBe('session-1');
    const [call] = mockSessionCreate.mock.calls;
    const expiresAt: Date = call[0].data.expiresAt;
    const thirtyDays = 30 * 24 * 60 * 60 * 1000;
    expect(expiresAt.getTime() - Date.now()).toBeGreaterThan(thirtyDays - 5000);
  });
});
