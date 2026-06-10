import { ChevronLeft, ChevronRight } from 'lucide-react';
import { addMonths, formatMonthLabel } from '../../utils/month';

interface MonthSelectorProps {
  month: string;
  onChange: (month: string) => void;
  disabled?: boolean;
}

/** Navigate between calendar months (FR-013). */
export function MonthSelector({ month, onChange, disabled }: MonthSelectorProps) {
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
        disabled={disabled}
        aria-label="Próximo mês"
        onClick={() => onChange(addMonths(month, 1))}
        className="rounded-lg border border-gray-300 p-2 text-gray-600 hover:bg-gray-50 disabled:opacity-50"
      >
        <ChevronRight size={18} aria-hidden />
      </button>
    </div>
  );
}
