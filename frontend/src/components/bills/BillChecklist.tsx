import { formatCents } from '../../utils/money';
import type { Bill, ProjectedBill } from '../../types/bill';
import { BillItem } from './BillItem';

interface BillChecklistProps {
  bills: Bill[];
  projectedBills: ProjectedBill[];
  isLoading: boolean;
  selectedMonth: string;
  onBillUpdated: () => void;
  onBillDeleted: () => void;
  onConcurrentError: () => void;
  onReload: () => Promise<void>;
  onPayProjected?: (projected: ProjectedBill) => void;
  payingProjectedId?: string | null;
}

function formatDate(iso: string): string {
  const parts = iso.split('-');
  if (parts.length < 3) return iso;
  return `${parts[2]}/${parts[1]}`;
}

export function BillChecklist({
  bills,
  projectedBills,
  isLoading,
  selectedMonth,
  onBillUpdated,
  onBillDeleted,
  onConcurrentError,
  onPayProjected,
  payingProjectedId,
}: BillChecklistProps) {
  if (isLoading) {
    return (
      <section aria-label="Lista de contas" aria-busy="true">
        <p className="text-sm text-gray-500">Carregando...</p>
      </section>
    );
  }

  const pendingBills = bills.filter((b) => b.status === 'PENDING');
  const paidBills = bills.filter((b) => b.status === 'PAID');
  const cancelledBills = bills.filter((b) => b.status === 'CANCELLED');
  const orderedBills = [...pendingBills, ...paidBills, ...cancelledBills];

  const isEmpty = orderedBills.length === 0 && projectedBills.length === 0;

  if (isEmpty) {
    return (
      <section aria-label="Lista de contas">
        <p className="rounded-lg border border-dashed border-gray-300 px-4 py-8 text-center text-sm text-gray-500">
          Nenhuma conta registrada para este mês. Clique em &lsquo;Nova conta&rsquo; para começar.
        </p>
      </section>
    );
  }

  return (
    <section aria-label="Lista de contas">
      <ul className="space-y-2">
        {orderedBills.map((bill) => (
          <BillItem
            key={bill.id}
            bill={bill}
            selectedMonth={selectedMonth}
            onUpdated={onBillUpdated}
            onDeleted={onBillDeleted}
            onConcurrentError={onConcurrentError}
          />
        ))}

        {projectedBills.map((projected) => (
          <li
            key={projected.recurringBillId}
            className="flex flex-wrap items-start justify-between gap-3 rounded-lg border border-dashed border-blue-200 bg-blue-50 px-4 py-3"
            aria-label={`Conta prevista: ${projected.description}`}
          >
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-medium text-gray-600">{projected.description}</span>
                <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                  Prevista
                </span>
              </div>
              <div className="mt-1 flex flex-wrap gap-3 text-xs text-gray-500">
                <span>Vence {formatDate(projected.dueDate)}</span>
                <span>{formatCents(projected.expectedAmountCents)}</span>
              </div>
            </div>
            {onPayProjected && (
              <button
                type="button"
                onClick={() => onPayProjected(projected)}
                disabled={payingProjectedId === projected.recurringBillId}
                className="self-center rounded-lg border border-blue-500 px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-100 disabled:opacity-50"
              >
                {payingProjectedId === projected.recurringBillId ? 'Criando…' : 'Pagar'}
              </button>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
