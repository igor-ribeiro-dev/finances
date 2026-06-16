import { useCallback, useEffect, useRef, type KeyboardEvent } from 'react';

interface MoneyInputProps {
  value: number; // cents
  onChange: (cents: number) => void;
  id?: string;
  ariaLabel?: string;
  ariaDescribedBy?: string;
  ariaInvalid?: boolean;
  autoFocus?: boolean;
  disabled?: boolean;
}

const FORMATTER = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

export function MoneyInput({
  value,
  onChange,
  id,
  ariaLabel,
  ariaDescribedBy,
  ariaInvalid,
  autoFocus,
  disabled,
}: MoneyInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const displayValue = FORMATTER.format(value / 100);

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus();
  }, [autoFocus]);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLInputElement>) => {
      if (disabled) return;
      const key = event.key;

      if (/^[0-9]$/.test(key)) {
        event.preventDefault();
        const digit = Number(key);
        const next = value * 10 + digit;
        if (next > 2_000_000_000) return;
        onChange(next);
        return;
      }
      if (key === 'Backspace') {
        event.preventDefault();
        onChange(Math.floor(value / 10));
        return;
      }
      if (key === 'Delete' || key === 'Escape') {
        event.preventDefault();
        onChange(0);
        return;
      }
      // Allow navigation keys; block everything else (typing chars, commas, dots).
      const allowed = ['Tab', 'ArrowLeft', 'ArrowRight', 'Home', 'End', 'Enter'];
      if (!allowed.includes(key)) {
        event.preventDefault();
      }
    },
    [value, onChange, disabled],
  );

  return (
    <input
      ref={inputRef}
      id={id}
      type="text"
      inputMode="numeric"
      value={displayValue}
      onKeyDown={handleKeyDown}
      onChange={() => {
        /* controlled by keydown handler */
      }}
      aria-label={ariaLabel}
      aria-describedby={ariaDescribedBy}
      aria-invalid={ariaInvalid}
      disabled={disabled}
      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-right text-lg font-medium text-gray-900 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:bg-gray-50 disabled:text-gray-500"
    />
  );
}
