import { useEffect, useRef } from 'react';
import type { Expense } from '../../types/expense';

interface DeleteExpenseModalProps {
  open: boolean;
  expense: Expense | null;
  isDeleting: boolean;
  onCancel: () => void;
  onConfirm: (id: string) => void;
}

export function DeleteExpenseModal({
  open,
  expense,
  isDeleting,
  onCancel,
  onConfirm,
}: DeleteExpenseModalProps) {
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (open) cancelRef.current?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && !isDeleting) onCancel();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, isDeleting, onCancel]);

  if (!open || !expense) return null;

  function handleBackdrop(e: React.MouseEvent) {
    if (e.target === e.currentTarget && !isDeleting) onCancel();
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-modal-title"
      aria-describedby="delete-modal-desc"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={handleBackdrop}
    >
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
        <h2 id="delete-modal-title" className="mb-2 text-lg font-semibold text-gray-900">
          Excluir esta despesa?
        </h2>
        <p id="delete-modal-desc" className="mb-5 text-sm text-gray-700">
          Esta ação não pode ser desfeita.
        </p>
        <div className="flex justify-end gap-2">
          <button
            ref={cancelRef}
            type="button"
            onClick={onCancel}
            disabled={isDeleting}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-teal-500"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => onConfirm(expense.id)}
            disabled={isDeleting}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-red-500"
          >
            {isDeleting ? 'Excluindo…' : 'Excluir'}
          </button>
        </div>
      </div>
    </div>
  );
}
