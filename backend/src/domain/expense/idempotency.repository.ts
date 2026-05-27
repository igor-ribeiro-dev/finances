import type { Prisma, IdempotencyKey } from '@prisma/client';
import { prisma } from '../../infra/prisma';

export const idempotencyRepository = {
  async findByKey(key: string): Promise<IdempotencyKey | null> {
    return prisma.idempotencyKey.findUnique({ where: { key } });
  },

  async save(
    data: { key: string; userId: string; expenseId: string },
    tx?: Prisma.TransactionClient,
  ): Promise<IdempotencyKey> {
    const client = tx ?? prisma;
    return client.idempotencyKey.create({ data });
  },
};
