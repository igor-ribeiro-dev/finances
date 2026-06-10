import { useCallback, useState } from 'react';
import { categoryService } from '../services/category.service';
import type {
  Category,
  CategoryFormPayload,
  CategoryServiceError,
  FieldError,
} from '../types/category';

interface UseUpdateCategoryOptions {
  onSuccess?: (category: Category) => void;
  onError?: (err: CategoryServiceError) => void;
}

interface UseUpdateCategoryReturn {
  submit: (id: string, body: CategoryFormPayload) => Promise<void>;
  isSaving: boolean;
  fieldErrors: FieldError[];
  resetFieldErrors: () => void;
}

// No Idempotency-Key — PATCH is naturally idempotent (FR-024 last-write-wins).
export function useUpdateCategory(options: UseUpdateCategoryOptions = {}): UseUpdateCategoryReturn {
  const [isSaving, setIsSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldError[]>([]);

  const submit = useCallback(
    async (id: string, body: CategoryFormPayload) => {
      if (isSaving) return;
      setIsSaving(true);
      setFieldErrors([]);
      try {
        const category = await categoryService.updateCategory(id, body);
        options.onSuccess?.(category);
      } catch (err) {
        const e = err as CategoryServiceError;
        if (e.kind === 'validation') setFieldErrors(e.fieldErrors);
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
