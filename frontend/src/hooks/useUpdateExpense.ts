import { useCallback, useState } from 'react';
import { expenseService } from '../services/expense.service';
import type { Expense, FieldError, ServiceError, UpdateExpenseBody } from '../types/expense';

interface UseUpdateExpenseOptions {
  onSuccess?: (expense: Expense) => void;
  onError?: (err: ServiceError) => void;
  on404Concurrent?: (id: string) => void;
  /** FR-018: invoked when the response carries category.removed_concurrently. */
  onConcurrentCategoryRemoval?: () => void;
}

interface UseUpdateExpenseReturn {
  submit: (id: string, body: UpdateExpenseBody) => Promise<void>;
  isSaving: boolean;
  fieldErrors: FieldError[];
  resetFieldErrors: () => void;
}

export function useUpdateExpense(options: UseUpdateExpenseOptions = {}): UseUpdateExpenseReturn {
  const [isSaving, setIsSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldError[]>([]);

  const submit = useCallback(
    async (id: string, body: UpdateExpenseBody) => {
      if (isSaving) return;
      setIsSaving(true);
      setFieldErrors([]);
      try {
        const expense = await expenseService.updateExpense(id, body);
        if (expense.warnings?.includes('category.removed_concurrently')) {
          options.onConcurrentCategoryRemoval?.();
        }
        options.onSuccess?.(expense);
      } catch (err) {
        const e = err as ServiceError;
        if (e.kind === 'validation') {
          setFieldErrors(e.fieldErrors);
        }
        if (e.kind === 'not_found') {
          options.on404Concurrent?.(id);
        }
        options.onError?.(e);
      } finally {
        setIsSaving(false);
      }
    },
    [isSaving, options],
  );

  const resetFieldErrors = useCallback(() => setFieldErrors([]), []);

  return { submit, isSaving, fieldErrors, resetFieldErrors };
}
