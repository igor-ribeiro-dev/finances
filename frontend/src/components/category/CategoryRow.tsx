import { Pencil, Trash2 } from 'lucide-react';
import type { Category } from '../../types/category';

export interface CategoryRowProps {
  category: Category;
  /** Sub-categories render indented under their root. */
  isSub?: boolean;
  onEdit: (category: Category) => void;
  onDelete: (category: Category) => void;
}

export function CategoryRow({ category, isSub = false, onEdit, onDelete }: CategoryRowProps) {
  return (
    <div
      className={`flex items-center justify-between rounded-lg px-3 py-2 hover:bg-bg ${
        isSub ? 'ml-6' : ''
      }`}
    >
      <span className="text-sm text-fg">{category.name}</span>
      <div className="flex items-center gap-1">
        <button
          type="button"
          aria-label={`Editar ${category.name}`}
          onClick={() => onEdit(category)}
          className="rounded p-1 text-fg-muted hover:bg-surface hover:text-fg focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <Pencil className="h-4 w-4" aria-hidden="true" />
        </button>
        <button
          type="button"
          aria-label={`Excluir ${category.name}`}
          onClick={() => onDelete(category)}
          className="rounded p-1 text-fg-muted hover:bg-surface hover:text-danger focus:outline-none focus:ring-2 focus:ring-red-500"
        >
          <Trash2 className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
