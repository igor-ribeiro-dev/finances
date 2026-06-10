import { MoneyInput } from '../expense/MoneyInput';
import { formatCents } from '../../utils/money';
import type { EditableLimit } from './limit-draft';

interface LimitEditorProps {
  value: EditableLimit;
  onChange: (next: EditableLimit) => void;
  /** Server-resolved cents for the current saved value (badge); null = não resolvível. */
  resolvedCents: number | null;
  label: string;
  disabled?: boolean;
}

/**
 * A value/percentage limit editor: a VALOR/% toggle plus the matching input.
 * Used by member rows (base = family) and category rows (base = family / parent root).
 */
export function LimitEditor({ value, onChange, resolvedCents, label, disabled }: LimitEditorProps) {
  const isPercent = value.type === 'PERCENT';

  return (
    <div className="flex items-center gap-2">
      <div
        className="inline-flex overflow-hidden rounded-md border border-gray-300 text-xs"
        role="group"
        aria-label={`Tipo de limite — ${label}`}
      >
        <button
          type="button"
          disabled={disabled}
          aria-pressed={!isPercent}
          onClick={() => onChange({ ...value, type: 'ABSOLUTE' })}
          className={`px-2 py-1 font-medium ${!isPercent ? 'bg-teal-600 text-white' : 'bg-white text-gray-600'}`}
        >
          R$
        </button>
        <button
          type="button"
          disabled={disabled}
          aria-pressed={isPercent}
          onClick={() => onChange({ ...value, type: 'PERCENT' })}
          className={`px-2 py-1 font-medium ${isPercent ? 'bg-teal-600 text-white' : 'bg-white text-gray-600'}`}
        >
          %
        </button>
      </div>

      {isPercent ? (
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={0}
            step={1}
            disabled={disabled}
            aria-label={`Percentual — ${label}`}
            value={value.percent === 0 ? '' : value.percent}
            onChange={(e) => {
              const n = Math.floor(Number(e.target.value));
              onChange({ ...value, percent: Number.isFinite(n) && n >= 0 ? n : 0 });
            }}
            className="w-20 rounded-lg border border-gray-300 px-3 py-2 text-right text-lg font-medium text-gray-900 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500"
            placeholder="0"
          />
          <span className="text-sm text-gray-500">%</span>
          <span className="text-sm text-gray-500" aria-label={`Valor resolvido — ${label}`}>
            = {formatCents(resolvedCents)}
          </span>
        </div>
      ) : (
        <div className="w-44">
          <MoneyInput
            value={value.cents}
            onChange={(cents) => onChange({ ...value, cents })}
            ariaLabel={`Valor — ${label}`}
            disabled={disabled}
          />
        </div>
      )}
    </div>
  );
}
