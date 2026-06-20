import { Modal } from '@/components/ui';
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
  const title =
    mode === 'destructive' ? 'Excluir esta categoria?' : 'Não é possível excluir esta categoria';

  const footer =
    mode === 'destructive' ? (
      <>
        <button
          type="button"
          onClick={onClose}
          disabled={isDeleting}
          autoFocus
          className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-fg hover:bg-bg disabled:opacity-50"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={isDeleting}
          className="rounded-lg bg-danger px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
        >
          {isDeleting ? 'Excluindo…' : 'Excluir'}
        </button>
      </>
    ) : (
      <button
        type="button"
        onClick={onClose}
        autoFocus
        className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-primary"
      >
        OK
      </button>
    );

  return (
    <Modal open={open} onClose={onClose} title={title} footer={footer}>
      {mode === 'destructive' ? (
        <p className="text-sm text-fg">
          Você está prestes a excluir <strong>{categoryName}</strong>. Esta ação não pode ser
          desfeita.
        </p>
      ) : (
        <p className="text-sm text-fg">
          Esta categoria ainda possui{' '}
          <strong>{blockers?.subCategoriesCount ?? 0} sub-categorias</strong> e{' '}
          <strong>{blockers?.affectedExpensesCount ?? 0} despesas vinculadas</strong>. Reorganize
          esses registros antes de excluí-la.
        </p>
      )}
    </Modal>
  );
}
