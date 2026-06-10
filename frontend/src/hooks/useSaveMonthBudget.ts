import { useCallback, useState } from 'react';
import { budgetService } from '../services/budget.service';
import type {
  MonthBudget,
  UpsertMonthBudgetBody,
  BudgetServiceError,
  FieldError,
} from '../types/budget';

interface UseSaveMonthBudgetOptions {
  onSuccess?: (result: MonthBudget) => void;
  onError?: (err: BudgetServiceError) => void;
}

interface UseSaveMonthBudgetReturn {
  save: (month: string, body: UpsertMonthBudgetBody) => Promise<MonthBudget | null>;
  isSaving: boolean;
  fieldErrors: FieldError[];
  resetFieldErrors: () => void;
}

export function useSaveMonthBudget(
  options: UseSaveMonthBudgetOptions = {},
): UseSaveMonthBudgetReturn {
  const [isSaving, setIsSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldError[]>([]);

  const save = useCallback(
    async (month: string, body: UpsertMonthBudgetBody) => {
      setIsSaving(true);
      setFieldErrors([]);
      try {
        const result = await budgetService.saveMonth(month, body);
        options.onSuccess?.(result);
        return result;
      } catch (err) {
        const e = err as BudgetServiceError;
        if (e.kind === 'validation') setFieldErrors(e.fieldErrors);
        options.onError?.(e);
        return null;
      } finally {
        setIsSaving(false);
      }
    },
    [options],
  );

  const resetFieldErrors = useCallback(() => setFieldErrors([]), []);

  return { save, isSaving, fieldErrors, resetFieldErrors };
}
