import { useCallback, useState } from 'react';
import { expenseService } from '../services/expense.service';
import type { ServiceError } from '../types/expense';

interface UseDeleteExpenseOptions {
  onSuccess?: (id: string) => void;
  onError?: (err: ServiceError) => void;
}

interface UseDeleteExpenseReturn {
  remove: (id: string) => Promise<void>;
  isDeleting: boolean;
}

export function useDeleteExpense(options: UseDeleteExpenseOptions = {}): UseDeleteExpenseReturn {
  const [isDeleting, setIsDeleting] = useState(false);

  const remove = useCallback(
    async (id: string) => {
      if (isDeleting) return;
      setIsDeleting(true);
      try {
        await expenseService.deleteExpense(id);
        options.onSuccess?.(id);
      } catch (err) {
        const e = err as ServiceError;
        if (e.kind === 'not_found') {
          // FR-027: treat as silent success — the expense is already gone.
          options.onSuccess?.(id);
        } else {
          options.onError?.(e);
        }
      } finally {
        setIsDeleting(false);
      }
    },
    [isDeleting, options],
  );

  return { remove, isDeleting };
}
