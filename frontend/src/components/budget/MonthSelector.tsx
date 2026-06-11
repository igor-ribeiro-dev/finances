import { ChevronLeft, ChevronRight } from 'lucide-react';
import { addMonths, formatMonthLabel } from '../../utils/month';

interface MonthSelectorProps {
  month: string;
  onChange: (month: string) => void;
  disabled?: boolean;
  /**
   * Optional upper bound (`YYYY-MM`, inclusive). When set, "next" is disabled
   * once `month` reaches it (feature 009 dashboard: no future months). Omitted
   * → unchanged feature-008 behavior (budgets navigate freely into the future).
   */
  maxMonth?: string;
}

/** Navigate between calendar months (FR-013). */
export function MonthSelector({ month, onChange, disabled, maxMonth }: MonthSelectorProps) {
  const nextDisabled = disabled || (maxMonth !== undefined && month >= maxMonth);
  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        disabled={disabled}
        aria-label="Mês anterior"
        onClick={() => onChange(addMonths(month, -1))}
        className="rounded-lg border border-gray-300 p-2 text-gray-600 hover:bg-gray-50 disabled:opacity-50"
      >
        <ChevronLeft size={18} aria-hidden />
      </button>
      <span
        className="min-w-[10rem] text-center text-base font-semibold text-gray-900"
        aria-live="polite"
      >
        {formatMonthLabel(month)}
      </span>
      <button
        type="button"
        disabled={nextDisabled}
        aria-label="Próximo mês"
        onClick={() => onChange(addMonths(month, 1))}
        className="rounded-lg border border-gray-300 p-2 text-gray-600 hover:bg-gray-50 disabled:opacity-50"
      >
        <ChevronRight size={18} aria-hidden />
      </button>
    </div>
  );
}
