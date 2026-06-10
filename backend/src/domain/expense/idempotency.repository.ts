import type { Prisma, IdempotencyKey, ResourceType } from '@prisma/client';
import { prisma } from '../../infra/prisma';

export interface SaveIdempotencyKeyData {
  key: string;
  userId: string;
  resourceType: ResourceType;
  resourceId: string;
}

/**
 * Polymorphic idempotency cache (FR-015): one table dedupes both EXPENSE and
 * CATEGORY creations. `findByKey` returns the full row — including `resourceType`
 * and `resourceId` — so the caller can run the conflict matrix (FR-016):
 *   - different user            → idempotency.conflict
 *   - same user, other resource → idempotency.cross_resource_conflict
 *   - same user, same resource  → replay
 */
export const idempotencyRepository = {
  async findByKey(key: string): Promise<IdempotencyKey | null> {
    return prisma.idempotencyKey.findUnique({ where: { key } });
  },

  async save(data: SaveIdempotencyKeyData, tx?: Prisma.TransactionClient): Promise<IdempotencyKey> {
    const client = tx ?? prisma;
    return client.idempotencyKey.create({ data });
  },
};
