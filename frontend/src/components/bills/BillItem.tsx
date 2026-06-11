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
    if (!window.confirm('Reverter pagamento? A despesa vinculada será excluída.')) return;
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
            ? 'border-red-100 bg-red-50 opacity-70'
            : isPaid
              ? 'border-green-100 bg-green-50'
              : 'border-gray-200 bg-white'
        }`}
        aria-label={`Conta: ${bill.description}`}
      >
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`text-sm font-medium ${isCancelled ? 'text-gray-400 line-through' : 'text-gray-900'}`}
            >
              {bill.description}
            </span>

            {/* Status badges */}
            {isPending && bill.isOverdue && (
              <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                Vencida
              </span>
            )}
            {isPaid && (
              <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                Paga
              </span>
            )}
            {isCancelled && (
              <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-600">
                Cancelada
              </span>
            )}
            {bill.recurringBillId && (
              <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                Conta fixa
              </span>
            )}
          </div>

          <div className="mt-1 flex flex-wrap gap-3 text-xs text-gray-500">
            <span>Vence {formatDate(bill.dueDate)}</span>
            <span aria-label={`Valor esperado: ${formatCents(bill.expectedAmountCents)}`}>
              {formatCents(bill.expectedAmountCents)}
            </span>
            {isPaid && bill.payment && (
              <>
                <span>Pago {formatDate(bill.payment.paidDate)}</span>
                {bill.payment.actualAmountCents !== bill.expectedAmountCents && (
                  <span
                    className="text-teal-700"
                    aria-label={`Valor pago: ${formatCents(bill.payment.actualAmountCents)}`}
                  >
                    Real: {formatCents(bill.payment.actualAmountCents)}
                  </span>
                )}
              </>
            )}
            {bill.category && <span className="text-gray-400">{bill.category.name}</span>}
            {bill.ownerMember && <span className="text-gray-400">{bill.ownerMember.name}</span>}
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
                className="rounded-md bg-teal-600 px-3 py-1 text-xs font-medium text-white hover:bg-teal-700 disabled:opacity-50"
              >
                Pagar
              </button>
              <button
                type="button"
                onClick={() => setEditOpen(true)}
                disabled={isActing}
                aria-label={`Editar conta ${bill.description}`}
                className="rounded-md px-2 py-1 text-xs font-medium text-teal-700 hover:bg-teal-50 disabled:opacity-50"
              >
                Editar
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={isActing}
                aria-label={`Excluir conta ${bill.description}`}
                className="rounded-md px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
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
                className="rounded-md px-2 py-1 text-xs font-medium text-teal-700 hover:bg-teal-50 disabled:opacity-50"
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
              className="rounded-md px-2 py-1 text-xs font-medium text-teal-700 hover:bg-teal-50 disabled:opacity-50"
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
