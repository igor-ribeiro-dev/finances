import { percentOf } from '../../utils/percent';

interface BudgetProgressBarProps {
  spentCents: number;
  /** Resolved limit in cents (caller guarantees > 0). */
  limitCents: number;
}

/**
 * Accessible consumption bar (WCAG AA): the percentage is always present as
 * text — color is reinforcement only, never the sole signal of overspending.
 */
export function BudgetProgressBar({ spentCents, limitCents }: BudgetProgressBarProps) {
  const pct = percentOf(spentCents, limitCents) ?? 0;
  const over = spentCents > limitCents;
  return (
    <div className="flex items-center gap-3">
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-border" aria-hidden>
        <div
          className={`h-full rounded-full transition-all duration-300 ${over ? 'bg-danger' : 'bg-success'}`}
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>
      <span className={`text-sm font-medium ${over ? 'text-danger' : 'text-fg-muted'}`}>
        {pct}% consumido
      </span>
    </div>
  );
}
