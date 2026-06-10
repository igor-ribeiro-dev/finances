import { Tag } from 'lucide-react';
import type { Category } from '../../types/category';
import { CategoryRow } from './CategoryRow';

const collator = new Intl.Collator('pt-BR', { sensitivity: 'accent' });

export interface CategoryTreeProps {
  categories: Category[];
  onEdit: (category: Category) => void;
  onDelete: (category: Category) => void;
  /** CTA in the empty state. */
  onCreateFirst?: () => void;
}

export function CategoryTree({ categories, onEdit, onDelete, onCreateFirst }: CategoryTreeProps) {
  if (categories.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-300 px-6 py-16 text-center">
        <Tag className="mb-3 h-8 w-8 text-gray-400" aria-hidden="true" />
        <p className="mb-4 text-sm text-gray-500">Você ainda não tem categorias.</p>
        {onCreateFirst && (
          <button
            type="button"
            onClick={onCreateFirst}
            className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2"
          >
            Cadastre sua primeira categoria
          </button>
        )}
      </div>
    );
  }

  const byId = new Map(categories.map((c) => [c.id, c]));
  const roots = categories
    .filter((c) => c.parentId === null)
    .sort((a, b) => collator.compare(a.name, b.name));

  const subsByParent = new Map<string, Category[]>();
  for (const c of categories) {
    // Ignore orphan sub-categories defensively (should never happen).
    if (c.parentId && byId.has(c.parentId)) {
      const arr = subsByParent.get(c.parentId) ?? [];
      arr.push(c);
      subsByParent.set(c.parentId, arr);
    }
  }

  return (
    <div className="space-y-1">
      {roots.map((root) => {
        const subs = (subsByParent.get(root.id) ?? []).sort((a, b) =>
          collator.compare(a.name, b.name),
        );
        return (
          <div key={root.id}>
            <CategoryRow category={root} onEdit={onEdit} onDelete={onDelete} />
            {subs.map((sub) => (
              <CategoryRow key={sub.id} category={sub} isSub onEdit={onEdit} onDelete={onDelete} />
            ))}
          </div>
        );
      })}
    </div>
  );
}
