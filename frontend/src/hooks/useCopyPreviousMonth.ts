import { useCallback, useState } from 'react';
import { budgetService } from '../services/budget.service';
import type { CopyResult, BudgetServiceError } from '../types/budget';

interface UseCopyPreviousMonthReturn {
  copy: (fromMonth: string, toMonth: string) => Promise<CopyResult | null>;
  isCopying: boolean;
  error: BudgetServiceError | null;
}

export function useCopyPreviousMonth(): UseCopyPreviousMonthReturn {
  const [isCopying, setIsCopying] = useState(false);
  const [error, setError] = useState<BudgetServiceError | null>(null);

  const copy = useCallback(async (fromMonth: string, toMonth: string) => {
    setIsCopying(true);
    setError(null);
    try {
      return await budgetService.copyPrevious(fromMonth, toMonth);
    } catch (err) {
      setError(err as BudgetServiceError);
      return null;
    } finally {
      setIsCopying(false);
    }
  }, []);

  return { copy, isCopying, error };
}
