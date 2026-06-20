import { AlertTriangle } from 'lucide-react';
import { formatCents } from '../../utils/money';

interface AllocationSummaryBarProps {
  familyCents: number;
  allocatedCents: number;
}

/**
 * Live allocation feedback (FR-023): shows how much of the family budget is
 * allocated to root categories and the remaining balance. Over-allocation shows
 * an advisory note — it never blocks saving (FR-009).
 */
export function AllocationSummaryBar({ familyCents, allocatedCents }: AllocationSummaryBarProps) {
  const unallocated = familyCents - allocatedCents;
  const over = familyCents > 0 && allocatedCents > familyCents;
  const pct = familyCents > 0 ? Math.min(100, Math.round((allocatedCents / familyCents) * 100)) : 0;

  return (
    <div className="rounded-xl border border-border bg-bg p-4" aria-label="Resumo de alocação">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-sm">
        <span className="text-fg-muted">
          Alocado: <strong className="text-fg">{formatCents(allocatedCents)}</strong>
          {familyCents > 0 && <span className="text-fg-muted"> de {formatCents(familyCents)}</span>}
        </span>
        <span className={over ? 'font-medium text-amber-700' : 'text-fg-muted'}>
          {over ? 'Excedido em ' : 'Saldo: '}
          <strong>{formatCents(Math.abs(unallocated))}</strong>
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-border">
        <div
          className={`h-full ${over ? 'bg-accent/100' : 'bg-primary/100'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      {over && (
        <p className="mt-2 flex items-center gap-1.5 text-xs text-amber-700">
          <AlertTriangle size={14} aria-hidden />
          As alocações somam mais que o orçamento da família. Você ainda pode salvar (aviso).
        </p>
      )}
    </div>
  );
}
