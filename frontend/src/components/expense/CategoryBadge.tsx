import type { CategoryRef } from '../../types/expense';

export interface CategoryBadgeProps {
  category?: CategoryRef | null;
  subCategory?: CategoryRef | null;
}

/**
 * Renders the denormalized category path as a discreet label:
 *   - root only      → "Alimentação"
 *   - root + sub     → "Alimentação · Mercado" (U+00B7 separator)
 *   - none           → nothing
 */
export function CategoryBadge({ category, subCategory }: CategoryBadgeProps) {
  if (!category) return null;
  const label = subCategory ? `${category.name} · ${subCategory.name}` : category.name;
  return (
    <span className="mt-1 inline-block text-xs text-gray-500" data-testid="category-badge">
      {label}
    </span>
  );
}
