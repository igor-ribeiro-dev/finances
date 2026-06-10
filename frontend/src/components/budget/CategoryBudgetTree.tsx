import { LimitEditor } from './LimitEditor';
import type { EditableLimit } from './limit-draft';
import type { CategoryBudget } from '../../types/budget';

interface CategoryBudgetTreeProps {
  categories: CategoryBudget[];
  drafts: Record<string, EditableLimit>;
  onChange: (categoryId: string, next: EditableLimit) => void;
  disabled?: boolean;
}

const DEFAULT: EditableLimit = { type: 'ABSOLUTE', cents: 0, percent: 0 };

/**
 * Category budgets (US3). Roots are listed alphabetically (server pt-BR order)
 * with their sub-categories nested. Root percentages apply over the family budget;
 * sub-category percentages over the parent root's resolved value (FR-021).
 */
export function CategoryBudgetTree({
  categories,
  drafts,
  onChange,
  disabled,
}: CategoryBudgetTreeProps) {
  const roots = categories.filter((c) => c.parentId === null);
  const subsByRoot = new Map<string, CategoryBudget[]>();
  for (const c of categories) {
    if (c.parentId) {
      const arr = subsByRoot.get(c.parentId) ?? [];
      arr.push(c);
      subsByRoot.set(c.parentId, arr);
    }
  }

  return (
    <section
      className="rounded-xl border border-gray-200 bg-white p-5"
      aria-labelledby="category-budgets-heading"
    >
      <h2 id="category-budgets-heading" className="mb-1 text-lg font-semibold text-gray-900">
        Orçamentos por categoria
      </h2>
      <p className="mb-3 text-sm text-gray-500">
        Distribua o orçamento entre as categorias — em R$ ou em %. Percentual de raiz incide sobre a
        família; de sub-categoria, sobre a raiz.
      </p>
      {roots.length === 0 ? (
        <p className="text-sm text-gray-400">Nenhuma categoria cadastrada.</p>
      ) : (
        <ul className="space-y-2">
          {roots.map((root) => (
            <li key={root.categoryId}>
              <div className="flex items-center justify-between gap-4 py-2">
                <span className="text-sm font-semibold text-gray-800">{root.name}</span>
                <LimitEditor
                  label={root.name}
                  value={drafts[root.categoryId] ?? DEFAULT}
                  onChange={(next) => onChange(root.categoryId, next)}
                  resolvedCents={root.budget?.resolvedCents ?? null}
                  disabled={disabled}
                />
              </div>
              {(subsByRoot.get(root.categoryId) ?? []).length > 0 && (
                <ul className="ml-4 border-l border-gray-100 pl-4">
                  {(subsByRoot.get(root.categoryId) ?? []).map((sub) => (
                    <li
                      key={sub.categoryId}
                      className="flex items-center justify-between gap-4 py-2"
                    >
                      <span className="text-sm text-gray-600">{sub.name}</span>
                      <LimitEditor
                        label={`${root.name} · ${sub.name}`}
                        value={drafts[sub.categoryId] ?? DEFAULT}
                        onChange={(next) => onChange(sub.categoryId, next)}
                        resolvedCents={sub.budget?.resolvedCents ?? null}
                        disabled={disabled}
                      />
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
