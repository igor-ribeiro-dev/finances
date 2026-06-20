import { MonthSelector } from '../budget/MonthSelector';
import { currentMonth } from '../../utils/month';

interface DashboardMonthSelectorProps {
  month: string;
  onChange: (month: string) => void;
}

/**
 * US4 — month navigation capped at the current month (FR-013): the dashboard
 * covers the current month and the past only; one-click return to today.
 */
export function DashboardMonthSelector({ month, onChange }: DashboardMonthSelectorProps) {
  const today = currentMonth();
  return (
    <div className="flex flex-wrap items-center gap-3">
      <MonthSelector month={month} onChange={onChange} maxMonth={today} />
      {month !== today && (
        <button
          type="button"
          onClick={() => onChange(today)}
          className="rounded-lg border border-border px-3 py-2 text-sm font-medium text-fg-muted hover:bg-surface hover:text-fg transition-colors"
        >
          Voltar ao mês atual
        </button>
      )}
    </div>
  );
}
