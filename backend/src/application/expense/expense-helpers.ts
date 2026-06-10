/** FR-018: emitted when the categoryId referenced a category deleted mid-write. */
export const CATEGORY_REMOVED_CONCURRENTLY = 'category.removed_concurrently';

/**
 * True when the error is a Prisma FK violation (P2003) on the expense→category
 * relation. The only nullable FK we recover from is categoryId; owner/author FKs
 * are always valid by the time we insert.
 */
export function isCategoryFkViolation(err: unknown): boolean {
  if (typeof err !== 'object' || err === null) return false;
  const e = err as { code?: unknown; meta?: { field_name?: unknown } };
  if (e.code !== 'P2003') return false;
  const field = e.meta?.field_name;
  // Accept when the field is unknown (defensive) or clearly the category FK.
  return typeof field !== 'string' || field.toLowerCase().includes('category');
}
