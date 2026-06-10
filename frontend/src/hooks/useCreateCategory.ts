import { useCallback, useRef, useState } from 'react';
import { categoryService } from '../services/category.service';
import type {
  Category,
  CategoryFormPayload,
  CategoryServiceError,
  FieldError,
} from '../types/category';

interface UseCreateCategoryOptions {
  onSuccess?: (category: Category) => void;
  onError?: (err: CategoryServiceError) => void;
}

interface UseCreateCategoryReturn {
  submit: (body: CategoryFormPayload) => Promise<void>;
  isSaving: boolean;
  fieldErrors: FieldError[];
  resetFieldErrors: () => void;
}

function generateIdempotencyKey(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'fallback-' + Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function useCreateCategory(options: UseCreateCategoryOptions = {}): UseCreateCategoryReturn {
  const [isSaving, setIsSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldError[]>([]);
  const keyRef = useRef<string | null>(null);

  const submit = useCallback(
    async (body: CategoryFormPayload) => {
      if (isSaving) return;
      // New Idempotency-Key per submit attempt, kept stable across a validation retry.
      if (!keyRef.current) keyRef.current = generateIdempotencyKey();
      const key = keyRef.current;

      setIsSaving(true);
      setFieldErrors([]);
      try {
        const category = await categoryService.createCategory(body, key);
        keyRef.current = null; // success — next submit regenerates
        options.onSuccess?.(category);
      } catch (err) {
        const e = err as CategoryServiceError;
        if (e.kind === 'validation') {
          setFieldErrors(e.fieldErrors);
          // keep the key for a corrected retry of the same intent
        } else {
          keyRef.current = null; // distinct failure — fresh key next time
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
