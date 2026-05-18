import { createGroupUseCase } from '../../../src/application/family-group/create-group.use-case';

const mockUserFind = jest.fn();
const mockGroupCreate = jest.fn();
const mockUserUpdate = jest.fn();
const mockInviteCreate = jest.fn();

jest.mock('../../../src/infra/prisma', () => ({
  prisma: {
    user: {
      findUnique: (...a: unknown[]) => mockUserFind(...a),
      update: (...a: unknown[]) => mockUserUpdate(...a),
    },
    familyGroup: { create: (...a: unknown[]) => mockGroupCreate(...a) },
    invite: { create: (...a: unknown[]) => mockInviteCreate(...a) },
  },
}));

describe('createGroupUseCase', () => {
  beforeEach(() => jest.clearAllMocks());

  it('throws ALREADY_IN_GROUP when user already has a group', async () => {
    mockUserFind.mockResolvedValue({ id: 'u1', familyGroupId: 'g1' });
    await expect(createGroupUseCase('u1', 'Silva')).rejects.toMatchObject({
      code: 'ALREADY_IN_GROUP',
    });
  });

  it('creates group, invite of 8 chars, and updates user familyGroupId', async () => {
    mockUserFind.mockResolvedValue({ id: 'u1', familyGroupId: null });
    mockGroupCreate.mockResolvedValue({ id: 'g1', name: 'Silva' });
    mockUserUpdate.mockResolvedValue({});
    mockInviteCreate.mockImplementation(
      ({ data }: { data: { code: string; expiresAt: Date } }) => ({
        id: 'i1',
        code: data.code,
        expiresAt: data.expiresAt,
      }),
    );

    const result = await createGroupUseCase('u1', 'Silva');
    expect(result.name).toBe('Silva');
    expect(result.invite.code).toHaveLength(8);
    expect(mockUserUpdate).toHaveBeenCalledWith({
      where: { id: 'u1' },
      data: { familyGroupId: 'g1' },
    });
  });
});
