import { useCallback, useEffect, useRef, useState } from 'react';
import { billService } from '../services/bill.service';
import type { MonthBillsResponse, ServiceError } from '../types/bill';

interface UseMonthBillsState {
  data: MonthBillsResponse | null;
  isLoading: boolean;
  error: ServiceError | null;
}

export interface UseMonthBillsReturn extends UseMonthBillsState {
  reload: () => Promise<void>;
}

export function useMonthBills(month: string): UseMonthBillsReturn {
  const [state, setState] = useState<UseMonthBillsState>({
    data: null,
    isLoading: true,
    error: null,
  });
  const inflight = useRef(false);

  const fetch = useCallback(async (): Promise<void> => {
    if (inflight.current) return;
    inflight.current = true;
    setState((s) => ({ ...s, isLoading: true, error: null }));
    try {
      const data = await billService.listByMonth(month);
      setState({ data, isLoading: false, error: null });
    } catch (err) {
      setState((s) => ({ ...s, isLoading: false, error: err as ServiceError }));
    } finally {
      inflight.current = false;
    }
  }, [month]);

  useEffect(() => {
    void fetch();
  }, [fetch]);

  return {
    ...state,
    reload: fetch,
  };
}
