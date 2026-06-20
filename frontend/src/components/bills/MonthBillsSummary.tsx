import { formatCents } from '../../utils/money';
import type { MonthSummary } from '../../types/bill';
import { GlassCard } from '@/components/ui';

interface MonthBillsSummaryProps {
  summary: MonthSummary;
  projectedCents: number;
}

export function MonthBillsSummary({ summary, projectedCents }: MonthBillsSummaryProps) {
  return (
    <GlassCard aria-label="Resumo do mês" className="p-4">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-fg-muted">Resumo</h2>
      <dl className="space-y-2">
        <div className="flex items-center justify-between">
          <dt className="text-sm text-fg-muted">Previsto</dt>
          <dd
            className="text-sm font-medium text-fg"
            aria-label={`Previsto: ${formatCents(summary.totalExpectedCents)}`}
          >
            {formatCents(summary.totalExpectedCents)}
          </dd>
        </div>
        <div className="flex items-center justify-between">
          <dt className="text-sm text-fg-muted">Pago</dt>
          <dd
            className="text-sm font-medium text-primary"
            aria-label={`Pago: ${formatCents(summary.totalPaidCents)}`}
          >
            {formatCents(summary.totalPaidCents)}
          </dd>
        </div>
        <div className="flex items-center justify-between">
          <dt className="text-sm text-fg-muted">Pendente</dt>
          <dd
            className="text-sm font-medium text-fg-muted"
            aria-label={`Pendente: ${formatCents(summary.totalPendingCents)}`}
          >
            {formatCents(summary.totalPendingCents)}
          </dd>
        </div>
        {projectedCents > 0 && (
          <div className="flex items-center justify-between border-t border-border pt-2">
            <dt className="text-sm text-fg-muted">Previstas (fixas)</dt>
            <dd
              className="text-sm font-medium text-fg-muted"
              aria-label={`Previstas (fixas): ${formatCents(projectedCents)}`}
            >
              {formatCents(projectedCents)}
            </dd>
          </div>
        )}
      </dl>
    </GlassCard>
  );
}
