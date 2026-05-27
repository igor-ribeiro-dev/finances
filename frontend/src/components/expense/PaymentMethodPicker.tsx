import type { PaymentMethod } from '../../types/expense';

interface PaymentMethodPickerProps {
  value: PaymentMethod;
  onChange: (method: PaymentMethod) => void;
  disabled?: boolean;
}

const OPTIONS: Array<{ value: PaymentMethod; label: string }> = [
  { value: 'CASH_OR_DEBIT', label: 'Dinheiro/Débito' },
  { value: 'CREDIT_CARD', label: 'Cartão de Crédito' },
];

export function PaymentMethodPicker({ value, onChange, disabled }: PaymentMethodPickerProps) {
  return (
    <div role="radiogroup" aria-label="Método de pagamento" className="flex gap-2">
      {OPTIONS.map((opt) => {
        const selected = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={selected}
            disabled={disabled}
            onClick={() => onChange(opt.value)}
            className={`flex-1 rounded-lg border px-4 py-2 text-sm font-medium transition ${
              selected
                ? 'border-teal-600 bg-teal-50 text-teal-800'
                : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
            } disabled:opacity-50`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
