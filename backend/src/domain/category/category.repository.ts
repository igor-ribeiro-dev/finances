import type { Prisma, Category } from '@prisma/client';
import { prisma } from '../../infra/prisma';
import type { CategoryBlockers } from '../../api/errors';

export interface CreateCategoryData {
  groupId: string;
  name: string;
  parentId: string | null;
}

export interface UpdateCategoryData {
  name: string;
  parentId: string | null;
}

export const categoryRepository = {
  async create(data: CreateCategoryData, tx?: Prisma.TransactionClient): Promise<Category> {
    const client = tx ?? prisma;
    return client.category.create({ data });
  },

  async findByIdInGroup(id: string, groupId: string): Promise<Category | null> {
    return prisma.category.findFirst({ where: { id, groupId } });
  },

  /** Flat list for the group, ordered by name (frontend applies pt-BR collation for display). */
  async listByGroup(groupId: string): Promise<Category[]> {
    return prisma.category.findMany({
      where: { groupId },
      orderBy: { name: 'asc' },
    });
  },

  /**
   * Group scoping is the caller's responsibility (verified via findByIdInGroup
   * before calling). Wrapped in a transaction by the use case so a P2002 unique
   * violation rolls back cleanly.
   */
  async updateByIdInGroup(
    id: string,
    _groupId: string,
    data: UpdateCategoryData,
    tx?: Prisma.TransactionClient,
  ): Promise<Category> {
    const client = tx ?? prisma;
    return client.category.update({ where: { id }, data });
  },

  async deleteByIdInGroup(
    id: string,
    _groupId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<void> {
    const client = tx ?? prisma;
    await client.category.delete({ where: { id } });
  },

  /** Counts that block a delete (FR-013): sub-categories + expenses across the whole subtree. */
  async previewDelete(id: string, groupId: string): Promise<CategoryBlockers> {
    const subs = await prisma.category.findMany({
      where: { parentId: id, groupId },
      select: { id: true },
    });
    const categoryIds = [id, ...subs.map((s) => s.id)];
    const affectedExpensesCount = await prisma.expense.count({
      where: { groupId, categoryId: { in: categoryIds } },
    });
    return { subCategoriesCount: subs.length, affectedExpensesCount };
  },

  /** FR-011: a parentId must point to a ROOT category in the same group. */
  async isRootInGroup(id: string, groupId: string): Promise<boolean> {
    const found = await prisma.category.findFirst({
      where: { id, groupId, parentId: null },
      select: { id: true },
    });
    return found !== null;
  },
};
