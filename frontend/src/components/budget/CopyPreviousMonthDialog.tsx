import { Modal } from '@/components/ui';
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
 */
export function CopyPreviousMonthDialog({
  open,
  fromMonth,
  toMonth,
  isCopying = false,
  onClose,
  onConfirm,
}: CopyPreviousMonthDialogProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Copiar orçamentos do mês anterior?"
      size="sm"
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            disabled={isCopying}
            autoFocus
            className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-fg hover:bg-bg disabled:opacity-50"
          >
            Agora não
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isCopying}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover disabled:opacity-50"
          >
            {isCopying ? 'Copiando…' : 'Copiar'}
          </button>
        </>
      }
    >
      <p className="text-sm text-fg">
        {formatMonthLabel(toMonth)} ainda não tem orçamentos. Deseja trazer os de{' '}
        <strong>{formatMonthLabel(fromMonth)}</strong>? Apenas os itens ainda em branco serão
        preenchidos — nada existente é sobrescrito.
      </p>
    </Modal>
  );
}
