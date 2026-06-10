import { useCallback, useEffect, useState } from 'react';
import { budgetService } from '../services/budget.service';
import type { MonthBudget, BudgetServiceError } from '../types/budget';

export interface UseMonthBudgetReturn {
  data: MonthBudget | null;
  isLoading: boolean;
  error: BudgetServiceError | null;
  /** Replace the in-memory picture (after a save/copy returns the fresh state). */
  setData: (next: MonthBudget) => void;
  refresh: () => Promise<void>;
}

/** Loads the aggregated budget picture for `month`, reloading when it changes. */
export function useMonthBudget(month: string): UseMonthBudgetReturn {
  const [data, setData] = useState<MonthBudget | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<BudgetServiceError | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      setData(await budgetService.getMonth(month));
    } catch (err) {
      setError(err as BudgetServiceError);
    } finally {
      setIsLoading(false);
    }
  }, [month]);

  useEffect(() => {
    void load();
  }, [load]);

  return { data, isLoading, error, setData, refresh: load };
}
