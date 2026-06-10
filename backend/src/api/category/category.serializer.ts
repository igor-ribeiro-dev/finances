import type { Category } from '@prisma/client';

export interface CategoryResponse {
  id: string;
  groupId: string;
  name: string;
  parentId: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Maps a Category row to the API response shape. normalizedName is @ignore'd
 *  by the Prisma client, so it can never leak here. */
export function mapCategoryToResponse(category: Category): CategoryResponse {
  return {
    id: category.id,
    groupId: category.groupId,
    name: category.name,
    parentId: category.parentId,
    createdAt: category.createdAt.toISOString(),
    updatedAt: category.updatedAt.toISOString(),
  };
}
