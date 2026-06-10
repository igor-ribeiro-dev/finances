import { useEffect } from 'react';
import type { BlockerInfo } from '../../types/category';

export type DeleteCategoryModalMode = 'destructive' | 'blocking';

export interface DeleteCategoryModalProps {
  open: boolean;
  mode: DeleteCategoryModalMode;
  categoryName: string;
  /** Required in 'blocking' mode (the counts that prevent deletion). */
  blockers?: BlockerInfo;
  isDeleting?: boolean;
  onClose: () => void;
  /** Only used in 'destructive' mode. */
  onConfirm?: () => void;
}

export function DeleteCategoryModal({
  open,
  mode,
  categoryName,
  blockers,
  isDeleting = false,
  onClose,
  onConfirm,
}: DeleteCategoryModalProps) {
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && !isDeleting) onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, isDeleting, onClose]);

  if (!open) return null;

  function handleBackdrop(e: React.MouseEvent) {
    if (e.target === e.currentTarget && !isDeleting) onClose();
  }

  const titleId = 'delete-category-title';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4"
      onClick={handleBackdrop}
    >
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        {mode === 'destructive' ? (
          <>
            <h2 id={titleId} className="mb-2 text-lg font-semibold text-gray-900">
              Excluir esta categoria?
            </h2>
            <p className="mb-5 text-sm text-gray-700">
              Você está prestes a excluir <strong>{categoryName}</strong>. Esta ação não pode ser
              desfeita.
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={isDeleting}
                autoFocus
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={onConfirm}
                disabled={isDeleting}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                {isDeleting ? 'Excluindo…' : 'Excluir'}
              </button>
            </div>
          </>
        ) : (
          <>
            <h2 id={titleId} className="mb-2 text-lg font-semibold text-gray-900">
              Não é possível excluir esta categoria
            </h2>
            <p className="mb-5 text-sm text-gray-700">
              Esta categoria ainda possui{' '}
              <strong>{blockers?.subCategoriesCount ?? 0} sub-categorias</strong> e{' '}
              <strong>{blockers?.affectedExpensesCount ?? 0} despesas vinculadas</strong>.
              Reorganize esses registros antes de excluí-la.
            </p>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={onClose}
                autoFocus
                className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                OK
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
