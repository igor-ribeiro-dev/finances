import { useCallback, useState } from 'react';
import { budgetService } from '../services/budget.service';
import { previousMonth } from '../utils/month';
import type { MonthBudget } from '../types/budget';

export interface CopyPromptState {
  fromMonth: string;
  toMonth: string;
}

interface UseBudgetCopyPromptReturn {
  prompt: CopyPromptState | null;
  /** Call after an expense is saved; opens the prompt if the rule (FR-025) holds. */
  checkAfterExpense: (expenseDate: string) => Promise<void>;
  confirm: () => Promise<void>;
  dismiss: () => void;
  isCopying: boolean;
}

function hasAnyBudget(b: MonthBudget): boolean {
  return (
    b.family !== null ||
    b.members.some((m) => m.budget !== null) ||
    b.categories.some((c) => c.budget !== null)
  );
}

/**
 * FR-025: after registering an expense in a month that has NO budget, if the
 * previous month does have budgets, offer to copy them over (asking first). The
 * prompt never blocks expense registration.
 */
export function useBudgetCopyPrompt(): UseBudgetCopyPromptReturn {
  const [prompt, setPrompt] = useState<CopyPromptState | null>(null);
  const [isCopying, setIsCopying] = useState(false);

  const checkAfterExpense = useCallback(async (expenseDate: string) => {
    const month = expenseDate.slice(0, 7); // YYYY-MM
    const prev = previousMonth(month);
    try {
      const [current, previousPicture] = await Promise.all([
        budgetService.getMonth(month),
        budgetService.getMonth(prev),
      ]);
      if (!hasAnyBudget(current) && hasAnyBudget(previousPicture)) {
        setPrompt({ fromMonth: prev, toMonth: month });
      }
    } catch {
      // FR-025: never let a budget check disrupt the expense flow.
    }
  }, []);

  const confirm = useCallback(async () => {
    if (!prompt) return;
    setIsCopying(true);
    try {
      await budgetService.copyPrevious(prompt.fromMonth, prompt.toMonth);
    } catch {
      /* swallow — advisory convenience only */
    } finally {
      setIsCopying(false);
      setPrompt(null);
    }
  }, [prompt]);

  const dismiss = useCallback(() => setPrompt(null), []);

  return { prompt, checkAfterExpense, confirm, dismiss, isCopying };
}
