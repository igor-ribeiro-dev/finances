import { forgotPasswordUseCase } from '../../../src/application/auth/forgot-password.use-case';

const mockUserFind = jest.fn();
const mockTokenCreate = jest.fn();

jest.mock('../../../src/infra/prisma', () => ({
  prisma: {
    user: { findUnique: (...a: unknown[]) => mockUserFind(...a) },
    passwordResetToken: { create: (...a: unknown[]) => mockTokenCreate(...a) },
  },
}));

jest.mock('../../../src/infra/email', () => ({
  sendPasswordResetEmail: jest.fn().mockResolvedValue(undefined),
}));

describe('forgotPasswordUseCase', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns without action when email does not exist', async () => {
    mockUserFind.mockResolvedValue(null);
    await expect(forgotPasswordUseCase('notfound@test.com')).resolves.toBeUndefined();
    expect(mockTokenCreate).not.toHaveBeenCalled();
  });

  it('creates token with 1-hour expiry when email is valid', async () => {
    mockUserFind.mockResolvedValue({ id: 'u1', email: 'ana@test.com' });
    mockTokenCreate.mockImplementation(({ data }: { data: { expiresAt: Date } }) => ({
      id: 't1',
      token: 'abc',
      expiresAt: data.expiresAt,
    }));

    await forgotPasswordUseCase('ana@test.com');
    expect(mockTokenCreate).toHaveBeenCalled();
    const [call] = mockTokenCreate.mock.calls;
    const expiresAt: Date = call[0].data.expiresAt;
    const oneHour = 60 * 60 * 1000;
    expect(expiresAt.getTime() - Date.now()).toBeGreaterThan(oneHour - 5000);
  });
});
