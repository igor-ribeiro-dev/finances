import { formatCents } from '../../utils/money';
import type { MonthSummary } from '../../types/bill';

interface MonthBillsSummaryProps {
  summary: MonthSummary;
  projectedCents: number;
}

export function MonthBillsSummary({ summary, projectedCents }: MonthBillsSummaryProps) {
  return (
    <section
      aria-label="Resumo do mês"
      className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
    >
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">Resumo</h2>
      <dl className="space-y-2">
        <div className="flex items-center justify-between">
          <dt className="text-sm text-gray-600">Previsto</dt>
          <dd
            className="text-sm font-medium text-gray-900"
            aria-label={`Previsto: ${formatCents(summary.totalExpectedCents)}`}
          >
            {formatCents(summary.totalExpectedCents)}
          </dd>
        </div>
        <div className="flex items-center justify-between">
          <dt className="text-sm text-gray-600">Pago</dt>
          <dd
            className="text-sm font-medium text-teal-700"
            aria-label={`Pago: ${formatCents(summary.totalPaidCents)}`}
          >
            {formatCents(summary.totalPaidCents)}
          </dd>
        </div>
        <div className="flex items-center justify-between">
          <dt className="text-sm text-gray-600">Pendente</dt>
          <dd
            className="text-sm font-medium text-gray-500"
            aria-label={`Pendente: ${formatCents(summary.totalPendingCents)}`}
          >
            {formatCents(summary.totalPendingCents)}
          </dd>
        </div>
        {projectedCents > 0 && (
          <div className="flex items-center justify-between border-t border-gray-100 pt-2">
            <dt className="text-sm text-gray-500">Previstas (fixas)</dt>
            <dd
              className="text-sm font-medium text-gray-400"
              aria-label={`Previstas (fixas): ${formatCents(projectedCents)}`}
            >
              {formatCents(projectedCents)}
            </dd>
          </div>
        )}
      </dl>
    </section>
  );
}
