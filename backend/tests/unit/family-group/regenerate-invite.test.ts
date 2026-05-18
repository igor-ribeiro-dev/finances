import { regenerateInviteUseCase } from '../../../src/application/family-group/regenerate-invite.use-case';

const mockUserFind = jest.fn();
const mockInviteDelete = jest.fn();
const mockInviteCreate = jest.fn();

jest.mock('../../../src/infra/prisma', () => ({
  prisma: {
    user: { findUnique: (...a: unknown[]) => mockUserFind(...a) },
    invite: {
      deleteMany: (...a: unknown[]) => mockInviteDelete(...a),
      create: (...a: unknown[]) => mockInviteCreate(...a),
    },
  },
}));

describe('regenerateInviteUseCase', () => {
  beforeEach(() => jest.clearAllMocks());

  it('throws FORBIDDEN when user has no group', async () => {
    mockUserFind.mockResolvedValue({ id: 'u1', familyGroupId: null });
    await expect(regenerateInviteUseCase('u1')).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });

  it('deletes old invite and creates new 8-char invite', async () => {
    mockUserFind.mockResolvedValue({ id: 'u1', familyGroupId: 'g1' });
    mockInviteDelete.mockResolvedValue({ count: 1 });
    mockInviteCreate.mockImplementation(
      ({ data }: { data: { code: string; expiresAt: Date } }) => ({
        id: 'i2',
        code: data.code,
        expiresAt: data.expiresAt,
      }),
    );

    const result = await regenerateInviteUseCase('u1');
    expect(mockInviteDelete).toHaveBeenCalledWith({ where: { familyGroupId: 'g1' } });
    expect(result.invite.code).toHaveLength(8);
  });
});
