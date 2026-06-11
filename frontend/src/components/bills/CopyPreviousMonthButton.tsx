import { useState } from 'react';
import { Copy } from 'lucide-react';
import { billService } from '../../services/bill.service';
import { previousMonth } from '../../utils/month';
import type { ServiceError } from '../../types/bill';

interface CopyPreviousMonthButtonProps {
  selectedMonth: string;
  onCopied: (count: number) => void;
  disabled?: boolean;
}

export function CopyPreviousMonthButton({
  selectedMonth,
  onCopied,
  disabled = false,
}: CopyPreviousMonthButtonProps) {
  const [isLoading, setIsLoading] = useState(false);

  async function handleClick() {
    if (isLoading || disabled) return;
    setIsLoading(true);
    try {
      const from = previousMonth(selectedMonth);
      const { count: dryRunCount } = await billService.copyDryRun(from, selectedMonth);

      if (dryRunCount === 0) {
        window.alert('Nenhuma conta para copiar do mês anterior.');
        return;
      }

      const confirmed = window.confirm(`Copiar ${dryRunCount} conta(s) do mês anterior?`);
      if (!confirmed) return;

      const result = (await billService.copy(from, selectedMonth)) as unknown as { count: number };
      onCopied(result.count);
    } catch (err) {
      const svcErr = err as ServiceError;
      window.alert(svcErr.message ?? 'Erro ao copiar contas do mês anterior.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled || isLoading}
      className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 disabled:opacity-50"
    >
      <Copy className="h-4 w-4" aria-hidden="true" />
      {isLoading ? 'Copiando…' : 'Copiar do mês anterior'}
    </button>
  );
}
