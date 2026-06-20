import { useState } from 'react';
import { billService } from '../../services/bill.service';
import { formatCents } from '../../utils/money';
import type { Bill, ServiceError } from '../../types/bill';
import { BillFormModal } from './BillFormModal';
import { PayBillModal } from './PayBillModal';

export interface BillItemProps {
  bill: Bill;
  selectedMonth: string;
  onUpdated: () => void;
  onDeleted: () => void;
  onConcurrentError: () => void;
}

function formatDate(iso: string): string {
  // YYYY-MM-DD → DD/MM
  const parts = iso.split('-');
  if (parts.length < 3) return iso;
  return `${parts[2]}/${parts[1]}`;
}

function isConcurrentError(err: ServiceError): boolean {
  return (
    err.kind === 'conflict' && (err.code === 'bill.invalid_transition' || err.kind === 'conflict')
  );
}

export function BillItem({
  bill,
  selectedMonth,
  onUpdated,
  onDeleted,
  onConcurrentError,
}: BillItemProps) {
  const [editOpen, setEditOpen] = useState(false);
  const [payOpen, setPayOpen] = useState(false);
  const [isActing, setIsActing] = useState(false);

  async function handleDelete() {
    if (!window.confirm('Tem certeza que deseja excluir esta conta?')) return;
    setIsActing(true);
    try {
      await billService.remove(bill.id);
      onDeleted();
    } catch (err) {
      const svcErr = err as ServiceError;
      if (isConcurrentError(svcErr)) {
        onConcurrentError();
      }
    } finally {
      setIsActing(false);
    }
  }

  async function handleRevertPayment() {
    if (!window.confirm('Reverter pagamento? O status voltará para Pendente.')) return;
    setIsActing(true);
    try {
      await billService.revertPayment(bill.id);
      onUpdated();
    } catch (err) {
      const svcErr = err as ServiceError;
      if (isConcurrentError(svcErr)) {
        onConcurrentError();
      }
    } finally {
      setIsActing(false);
    }
  }

  async function handleReactivate() {
    setIsActing(true);
    try {
      await billService.reactivate(bill.id);
      onUpdated();
    } catch (err) {
      const svcErr = err as ServiceError;
      if (isConcurrentError(svcErr)) {
        onConcurrentError();
      }
    } finally {
      setIsActing(false);
    }
  }

  function handleEditSuccess() {
    setEditOpen(false);
    onUpdated();
  }

  const isCancelled = bill.status === 'CANCELLED';
  const isPaid = bill.status === 'PAID';
  const isPending = bill.status === 'PENDING';

  return (
    <>
      <li
        className={`flex flex-wrap items-start justify-between gap-3 rounded-lg border px-4 py-3 ${
          isCancelled
            ? 'border-red-100 bg-danger/10 opacity-70'
            : isPaid
              ? 'border-success/20 bg-success/10'
              : 'border-border bg-surface'
        }`}
        aria-label={`Conta: ${bill.description}`}
      >
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`text-sm font-medium ${isCancelled ? 'text-fg-muted line-through' : 'text-fg'}`}
            >
              {bill.description}
            </span>

            {/* Status badges */}
            {isPending && bill.isOverdue && (
              <span className="rounded-full bg-danger/10 px-2 py-0.5 text-xs font-medium text-danger">
                Vencida
              </span>
            )}
            {isPaid && (
              <span className="rounded-full bg-success/10 px-2 py-0.5 text-xs font-medium text-success">
                Paga
              </span>
            )}
            {isCancelled && (
              <span className="rounded-full bg-danger/10 px-2 py-0.5 text-xs font-medium text-danger">
                Cancelada
              </span>
            )}
            {bill.recurringBillId && (
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                Conta fixa
              </span>
            )}
          </div>

          <div className="mt-1 flex flex-wrap gap-3 text-xs text-fg-muted">
            <span>Vence {formatDate(bill.dueDate)}</span>
            <span aria-label={`Valor esperado: ${formatCents(bill.expectedAmountCents)}`}>
              {formatCents(bill.expectedAmountCents)}
            </span>
            {isPaid && bill.payment && (
              <>
                <span>Pago {formatDate(bill.payment.paidDate)}</span>
                {bill.payment.actualAmountCents !== bill.expectedAmountCents && (
                  <span
                    className="text-primary"
                    aria-label={`Valor pago: ${formatCents(bill.payment.actualAmountCents)}`}
                  >
                    Real: {formatCents(bill.payment.actualAmountCents)}
                  </span>
                )}
              </>
            )}
            {bill.category && <span className="text-fg-muted">{bill.category.name}</span>}
            {isPaid && bill.payment?.paidByMember && (
              <span className="text-fg-muted">{bill.payment.paidByMember.name}</span>
            )}
            {!isPaid && bill.ownerMember && (
              <span className="text-fg-muted">{bill.ownerMember.name}</span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex shrink-0 items-center gap-2">
          {isPending && (
            <>
              <button
                type="button"
                onClick={() => setPayOpen(true)}
                disabled={isActing}
                aria-label={`Pagar conta ${bill.description}`}
                className="rounded-md bg-primary px-3 py-1 text-xs font-medium text-white hover:bg-primary-hover disabled:opacity-50"
              >
                Pagar
              </button>
              <button
                type="button"
                onClick={() => setEditOpen(true)}
                disabled={isActing}
                aria-label={`Editar conta ${bill.description}`}
                className="rounded-md px-2 py-1 text-xs font-medium text-primary hover:bg-primary/10 disabled:opacity-50"
              >
                Editar
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={isActing}
                aria-label={`Excluir conta ${bill.description}`}
                className="rounded-md px-2 py-1 text-xs font-medium text-danger hover:bg-danger/10 disabled:opacity-50"
              >
                {isActing ? '…' : 'Excluir'}
              </button>
            </>
          )}
          {isPaid && (
            <>
              <button
                type="button"
                onClick={() => setPayOpen(true)}
                disabled={isActing}
                aria-label={`Editar pagamento de ${bill.description}`}
                className="rounded-md px-2 py-1 text-xs font-medium text-primary hover:bg-primary/10 disabled:opacity-50"
              >
                Editar pagamento
              </button>
              <button
                type="button"
                onClick={handleRevertPayment}
                disabled={isActing}
                aria-label={`Reverter pagamento de ${bill.description}`}
                className="rounded-md px-2 py-1 text-xs font-medium text-orange-600 hover:bg-orange-50 disabled:opacity-50"
              >
                {isActing ? '…' : 'Reverter'}
              </button>
            </>
          )}
          {isCancelled && (
            <button
              type="button"
              onClick={handleReactivate}
              disabled={isActing}
              aria-label={`Reativar conta ${bill.description}`}
              className="rounded-md px-2 py-1 text-xs font-medium text-primary hover:bg-primary/10 disabled:opacity-50"
            >
              {isActing ? '…' : 'Reativar'}
            </button>
          )}
        </div>
      </li>

      <BillFormModal
        open={editOpen}
        mode="edit"
        selectedMonth={selectedMonth}
        bill={bill}
        onClose={() => setEditOpen(false)}
        onSuccess={handleEditSuccess}
      />

      <PayBillModal
        open={payOpen}
        bill={bill}
        mode={isPending ? 'pay' : 'edit-payment'}
        onClose={() => setPayOpen(false)}
        onSuccess={() => {
          setPayOpen(false);
          onUpdated();
        }}
      />
    </>
  );
}
