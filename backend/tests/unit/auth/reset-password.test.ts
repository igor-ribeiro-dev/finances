import { resetPasswordUseCase } from '../../../src/application/auth/reset-password.use-case';

const mockTokenFind = jest.fn();
const mockTokenUpdate = jest.fn();
const mockUserUpdate = jest.fn();
const mockSessionDelete = jest.fn();

jest.mock('../../../src/infra/prisma', () => ({
  prisma: {
    passwordResetToken: {
      findUnique: (...a: unknown[]) => mockTokenFind(...a),
      update: (...a: unknown[]) => mockTokenUpdate(...a),
    },
    user: { update: (...a: unknown[]) => mockUserUpdate(...a) },
    session: { deleteMany: (...a: unknown[]) => mockSessionDelete(...a) },
  },
}));

describe('resetPasswordUseCase', () => {
  beforeEach(() => jest.clearAllMocks());

  it('throws INVALID_RESET_TOKEN when token not found', async () => {
    mockTokenFind.mockResolvedValue(null);
    await expect(resetPasswordUseCase('bad', 'Senha123')).rejects.toMatchObject({
      code: 'INVALID_RESET_TOKEN',
    });
  });

  it('throws INVALID_RESET_TOKEN when token is expired', async () => {
    mockTokenFind.mockResolvedValue({
      id: 't1',
      userId: 'u1',
      expiresAt: new Date(Date.now() - 1000),
      usedAt: null,
    });
    await expect(resetPasswordUseCase('expired', 'Senha123')).rejects.toMatchObject({
      code: 'INVALID_RESET_TOKEN',
    });
  });

  it('throws INVALID_RESET_TOKEN when token already used', async () => {
    mockTokenFind.mockResolvedValue({
      id: 't1',
      userId: 'u1',
      expiresAt: new Date(Date.now() + 3600000),
      usedAt: new Date(),
    });
    await expect(resetPasswordUseCase('used', 'Senha123')).rejects.toMatchObject({
      code: 'INVALID_RESET_TOKEN',
    });
  });

  it('updates password, marks token used, and deletes other sessions on success', async () => {
    mockTokenFind.mockResolvedValue({
      id: 't1',
      userId: 'u1',
      expiresAt: new Date(Date.now() + 3600000),
      usedAt: null,
    });
    mockUserUpdate.mockResolvedValue({});
    mockTokenUpdate.mockResolvedValue({});
    mockSessionDelete.mockResolvedValue({ count: 2 });

    await resetPasswordUseCase('validtoken', 'Senha123');
    expect(mockUserUpdate).toHaveBeenCalled();
    expect(mockTokenUpdate).toHaveBeenCalledWith({
      where: { id: 't1' },
      data: { usedAt: expect.any(Date) },
    });
    expect(mockSessionDelete).toHaveBeenCalledWith({ where: { userId: 'u1' } });
  });
});
