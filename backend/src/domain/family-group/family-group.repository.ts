import { prisma } from '../../infra/prisma';

export const familyGroupRepository = {
  create: (name: string) =>
    prisma.familyGroup.create({ data: { name }, select: { id: true, name: true } }),

  findById: (id: string) =>
    prisma.familyGroup.findUnique({ where: { id }, include: { invite: true } }),
};
