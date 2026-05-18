import { prisma } from '../../infra/prisma';

export const inviteRepository = {
  create: (data: { familyGroupId: string; code: string; expiresAt: Date }) =>
    prisma.invite.create({ data }),

  findByCode: (code: string) => prisma.invite.findUnique({ where: { code: code.toUpperCase() } }),

  findByGroupId: (familyGroupId: string) => prisma.invite.findUnique({ where: { familyGroupId } }),

  deleteByGroupId: (familyGroupId: string) =>
    prisma.invite.deleteMany({ where: { familyGroupId } }),
};
