import { registerUseCase } from '../../../src/application/auth/register.use-case';

const mockCreate = jest.fn();
const mockFindByEmail = jest.fn();
const mockSessionCreate = jest.fn();

jest.mock('../../../src/infra/prisma', () => ({
  prisma: {
    user: {
      findUnique: (...args: unknown[]) => mockFindByEmail(...args),
      create: (...args: unknown[]) => mockCreate(...args),
    },
    session: { create: (...args: unknown[]) => mockSessionCreate(...args) },
  },
}));

describe('registerUseCase', () => {
  beforeEach(() => jest.clearAllMocks());

  it('throws EMAIL_ALREADY_IN_USE when email is taken', async () => {
    mockFindByEmail.mockResolvedValue({ id: 'existing' });
    await expect(registerUseCase('Ana', 'ana@test.com', 'Senha123')).rejects.toMatchObject({
      code: 'EMAIL_ALREADY_IN_USE',
    });
  });

  it('throws INVALID_PASSWORD when password is too weak', async () => {
    mockFindByEmail.mockResolvedValue(null);
    await expect(registerUseCase('Ana', 'ana@test.com', 'weak')).rejects.toMatchObject({
      code: 'INVALID_PASSWORD',
    });
  });

  it('throws INVALID_PASSWORD when password has no digit', async () => {
    mockFindByEmail.mockResolvedValue(null);
    await expect(registerUseCase('Ana', 'ana@test.com', 'SenhaForte')).rejects.toMatchObject({
      code: 'INVALID_PASSWORD',
    });
  });

  it('throws INVALID_PASSWORD when password has no uppercase', async () => {
    mockFindByEmail.mockResolvedValue(null);
    await expect(registerUseCase('Ana', 'ana@test.com', 'senha123')).rejects.toMatchObject({
      code: 'INVALID_PASSWORD',
    });
  });

  it('creates user with bcrypt hash and returns session on success', async () => {
    mockFindByEmail.mockResolvedValue(null);
    mockCreate.mockResolvedValue({
      id: 'user-1',
      name: 'Ana',
      email: 'ana@test.com',
      familyGroupId: null,
    });
    mockSessionCreate.mockResolvedValue({ id: 'session-1' });

    const result = await registerUseCase('Ana', 'ana@test.com', 'Senha123');
    expect(result.user.email).toBe('ana@test.com');
    expect(result.sessionId).toBe('session-1');
    const [createCall] = mockCreate.mock.calls;
    expect(createCall[0].data.passwordHash).not.toBe('Senha123');
    expect(createCall[0].data.passwordHash).toMatch(/^\$2/);
  });
});
