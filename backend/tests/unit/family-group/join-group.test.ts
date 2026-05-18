import { joinGroupUseCase } from '../../../src/application/family-group/join-group.use-case';

const mockUserFind = jest.fn();
const mockUserUpdate = jest.fn();
const mockInviteFind = jest.fn();
const mockGroupFind = jest.fn();

jest.mock('../../../src/infra/prisma', () => ({
  prisma: {
    user: {
      findUnique: (...a: unknown[]) => mockUserFind(...a),
      update: (...a: unknown[]) => mockUserUpdate(...a),
    },
    invite: { findUnique: (...a: unknown[]) => mockInviteFind(...a) },
    familyGroup: { findUnique: (...a: unknown[]) => mockGroupFind(...a) },
  },
}));

describe('joinGroupUseCase', () => {
  beforeEach(() => jest.clearAllMocks());

  it('throws ALREADY_IN_GROUP when user has group', async () => {
    mockUserFind.mockResolvedValue({ id: 'u1', familyGroupId: 'g1' });
    await expect(joinGroupUseCase('u1', 'CODE1234')).rejects.toMatchObject({
      code: 'ALREADY_IN_GROUP',
    });
  });

  it('throws INVALID_INVITE_CODE when code not found', async () => {
    mockUserFind.mockResolvedValue({ id: 'u1', familyGroupId: null });
    mockInviteFind.mockResolvedValue(null);
    await expect(joinGroupUseCase('u1', 'BADCODE1')).rejects.toMatchObject({
      code: 'INVALID_INVITE_CODE',
    });
  });

  it('throws INVALID_INVITE_CODE when invite is expired', async () => {
    mockUserFind.mockResolvedValue({ id: 'u1', familyGroupId: null });
    mockInviteFind.mockResolvedValue({
      familyGroupId: 'g1',
      expiresAt: new Date(Date.now() - 1000),
    });
    await expect(joinGroupUseCase('u1', 'EXPIRED1')).rejects.toMatchObject({
      code: 'INVALID_INVITE_CODE',
    });
  });

  it('updates user familyGroupId on success', async () => {
    mockUserFind.mockResolvedValue({ id: 'u1', familyGroupId: null });
    mockInviteFind.mockResolvedValue({
      familyGroupId: 'g1',
      expiresAt: new Date(Date.now() + 86400000),
    });
    mockUserUpdate.mockResolvedValue({});
    mockGroupFind.mockResolvedValue({ id: 'g1', name: 'Silva' });

    const result = await joinGroupUseCase('u1', 'VALID123');
    expect(result.id).toBe('g1');
    expect(mockUserUpdate).toHaveBeenCalledWith({
      where: { id: 'u1' },
      data: { familyGroupId: 'g1' },
    });
  });
});
