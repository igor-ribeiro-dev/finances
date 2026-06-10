import { useEffect } from 'react';
import { formatMonthLabel } from '../../utils/month';

export interface CopyPreviousMonthDialogProps {
  open: boolean;
  fromMonth: string;
  toMonth: string;
  isCopying?: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

/**
 * Confirms a non-destructive copy of the previous month's budgets (FR-014/FR-025).
 * Mirrors the project's modal pattern (ESC + backdrop close, focus on the safe
 * default action).
 */
export function CopyPreviousMonthDialog({
  open,
  fromMonth,
  toMonth,
  isCopying = false,
  onClose,
  onConfirm,
}: CopyPreviousMonthDialogProps) {
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && !isCopying) onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, isCopying, onClose]);

  if (!open) return null;

  function handleBackdrop(e: React.MouseEvent) {
    if (e.target === e.currentTarget && !isCopying) onClose();
  }

  const titleId = 'copy-month-title';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4"
      onClick={handleBackdrop}
    >
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <h2 id={titleId} className="mb-2 text-lg font-semibold text-gray-900">
          Copiar orçamentos do mês anterior?
        </h2>
        <p className="mb-5 text-sm text-gray-700">
          {formatMonthLabel(toMonth)} ainda não tem orçamentos. Deseja trazer os de{' '}
          <strong>{formatMonthLabel(fromMonth)}</strong>? Apenas os itens ainda em branco serão
          preenchidos — nada existente é sobrescrito.
        </p>
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isCopying}
            autoFocus
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            Agora não
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isCopying}
            className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50"
          >
            {isCopying ? 'Copiando…' : 'Copiar'}
          </button>
        </div>
      </div>
    </div>
  );
}
