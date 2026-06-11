import { useCallback, useEffect, useRef, useState } from 'react';
import { recurringBillService } from '../services/recurring-bill.service';
import type { RecurringBill, ServiceError } from '../types/bill';

interface UseRecurringBillsState {
  items: RecurringBill[];
  isLoading: boolean;
  error: ServiceError | null;
}

export interface UseRecurringBillsReturn extends UseRecurringBillsState {
  reload: () => Promise<void>;
}

export function useRecurringBills(): UseRecurringBillsReturn {
  const [state, setState] = useState<UseRecurringBillsState>({
    items: [],
    isLoading: true,
    error: null,
  });
  const inflight = useRef(false);

  const fetch = useCallback(async (): Promise<void> => {
    if (inflight.current) return;
    inflight.current = true;
    setState((s) => ({ ...s, isLoading: true, error: null }));
    try {
      const { recurringBills } = await recurringBillService.list();
      setState({ items: recurringBills, isLoading: false, error: null });
    } catch (err) {
      setState((s) => ({ ...s, isLoading: false, error: err as ServiceError }));
    } finally {
      inflight.current = false;
    }
  }, []);

  useEffect(() => {
    void fetch();
  }, [fetch]);

  return {
    ...state,
    reload: fetch,
  };
}
