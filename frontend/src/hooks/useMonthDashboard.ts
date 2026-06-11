import { useCallback, useEffect, useState } from 'react';
import { dashboardService } from '../services/dashboard.service';
import type { MonthDashboard, DashboardServiceError } from '../types/dashboard';

export interface UseMonthDashboardReturn {
  data: MonthDashboard | null;
  isLoading: boolean;
  error: DashboardServiceError | null;
  refresh: () => Promise<void>;
}

/** Loads the month dashboard, reloading whenever `month` changes (FR-014/FR-017). */
export function useMonthDashboard(month: string): UseMonthDashboardReturn {
  const [data, setData] = useState<MonthDashboard | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<DashboardServiceError | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      setData(await dashboardService.getMonth(month));
    } catch (err) {
      setError(err as DashboardServiceError);
    } finally {
      setIsLoading(false);
    }
  }, [month]);

  useEffect(() => {
    void load();
  }, [load]);

  return { data, isLoading, error, refresh: load };
}
