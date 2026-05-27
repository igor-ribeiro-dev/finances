import { useCallback, useEffect, useRef, useState } from 'react';
import { expenseService } from '../services/expense.service';
import type { Expense, ServiceError } from '../types/expense';

interface UseExpensesListState {
  items: Expense[];
  nextCursor: string | null;
  isInitialLoading: boolean;
  isLoadingMore: boolean;
  error?: ServiceError;
}

export interface UseExpensesListReturn extends UseExpensesListState {
  loadMore: () => Promise<void>;
  reload: () => Promise<void>;
  appendItem: (expense: Expense) => void;
  prependItem: (expense: Expense) => void;
  replaceItem: (id: string, expense: Expense) => void;
  removeItem: (id: string) => void;
}

export function useExpensesList(limit = 50): UseExpensesListReturn {
  const [state, setState] = useState<UseExpensesListState>({
    items: [],
    nextCursor: null,
    isInitialLoading: true,
    isLoadingMore: false,
  });
  const inflight = useRef(false);

  const fetchPage = useCallback(
    async (cursor: string | null, initial: boolean): Promise<void> => {
      if (inflight.current) return;
      inflight.current = true;
      setState((s) => ({
        ...s,
        isInitialLoading: initial,
        isLoadingMore: !initial,
        error: undefined,
      }));
      try {
        const page = await expenseService.listExpenses({ limit, cursor: cursor ?? undefined });
        setState((s) => ({
          items: initial ? page.items : [...s.items, ...page.items],
          nextCursor: page.nextCursor,
          isInitialLoading: false,
          isLoadingMore: false,
        }));
      } catch (err) {
        setState((s) => ({
          ...s,
          isInitialLoading: false,
          isLoadingMore: false,
          error: err as ServiceError,
        }));
      } finally {
        inflight.current = false;
      }
    },
    [limit],
  );

  useEffect(() => {
    void fetchPage(null, true);
  }, [fetchPage]);

  const loadMore = useCallback(async () => {
    if (!state.nextCursor || state.isLoadingMore) return;
    await fetchPage(state.nextCursor, false);
  }, [fetchPage, state.nextCursor, state.isLoadingMore]);

  const reload = useCallback(async () => {
    await fetchPage(null, true);
  }, [fetchPage]);

  const appendItem = useCallback((expense: Expense) => {
    setState((s) => ({ ...s, items: [...s.items, expense] }));
  }, []);

  const prependItem = useCallback((expense: Expense) => {
    setState((s) => ({ ...s, items: [expense, ...s.items] }));
  }, []);

  const replaceItem = useCallback((id: string, expense: Expense) => {
    setState((s) => ({
      ...s,
      items: s.items.map((it) => (it.id === id ? expense : it)),
    }));
  }, []);

  const removeItem = useCallback((id: string) => {
    setState((s) => ({ ...s, items: s.items.filter((it) => it.id !== id) }));
  }, []);

  return {
    ...state,
    loadMore,
    reload,
    appendItem,
    prependItem,
    replaceItem,
    removeItem,
  };
}
