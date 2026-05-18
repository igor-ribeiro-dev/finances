import { prisma } from '../../infra/prisma';

export const userRepository = {
  findByEmail: (email: string) => prisma.user.findUnique({ where: { email: email.toLowerCase() } }),

  findById: (id: string) => prisma.user.findUnique({ where: { id } }),

  create: (data: { name: string; email: string; passwordHash: string }) =>
    prisma.user.create({
      data: { ...data, email: data.email.toLowerCase() },
      select: { id: true, name: true, email: true, familyGroupId: true },
    }),

  updatePassword: (userId: string, passwordHash: string) =>
    prisma.user.update({ where: { id: userId }, data: { passwordHash } }),

  setFamilyGroup: (userId: string, familyGroupId: string | null) =>
    prisma.user.update({ where: { id: userId }, data: { familyGroupId } }),
};
