import { useCallback, useRef, useState } from 'react';
import { expenseService } from '../services/expense.service';
import type { CreateExpenseBody, Expense, FieldError, ServiceError } from '../types/expense';

interface UseCreateExpenseOptions {
  onSuccess?: (expense: Expense) => void;
  onError?: (err: ServiceError) => void;
  /** FR-018: invoked when the response carries category.removed_concurrently. */
  onConcurrentCategoryRemoval?: () => void;
}

interface UseCreateExpenseReturn {
  submit: (body: CreateExpenseBody) => Promise<void>;
  isSaving: boolean;
  fieldErrors: FieldError[];
  resetFieldErrors: () => void;
}

function generateIdempotencyKey(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // Fallback for environments without Web Crypto (e.g. older jsdom)
  return 'fallback-' + Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function useCreateExpense(options: UseCreateExpenseOptions = {}): UseCreateExpenseReturn {
  const [isSaving, setIsSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldError[]>([]);
  const keyRef = useRef<string | null>(null);

  const submit = useCallback(
    async (body: CreateExpenseBody) => {
      if (isSaving) return;
      // Generate a new Idempotency-Key per submit attempt (kept stable across retries
      // within the same submit cycle via the ref).
      if (!keyRef.current) {
        keyRef.current = generateIdempotencyKey();
      }
      const key = keyRef.current;

      setIsSaving(true);
      setFieldErrors([]);
      try {
        const expense = await expenseService.createExpense(body, key);
        keyRef.current = null; // success — next submit will regenerate
        if (expense.warnings?.includes('category.removed_concurrently')) {
          options.onConcurrentCategoryRemoval?.();
        }
        options.onSuccess?.(expense);
      } catch (err) {
        const e = err as ServiceError;
        if (e.kind === 'validation') {
          setFieldErrors(e.fieldErrors);
          // keep idempotency key for retry of the corrected submit (same intent)
        } else {
          keyRef.current = null; // distinct failure — fresh key on next try
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
