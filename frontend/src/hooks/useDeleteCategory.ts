import { useCallback, useState } from 'react';
import { categoryService } from '../services/category.service';
import type { BlockerInfo, CategoryServiceError } from '../types/category';

interface UseDeleteCategoryOptions {
  onSuccess?: (id: string) => void;
  /** 409 has_dependencies — carries the blocking counts. */
  onBlocked?: (blockers: BlockerInfo) => void;
  onError?: (err: CategoryServiceError) => void;
}

interface UseDeleteCategoryReturn {
  remove: (id: string) => Promise<void>;
  isDeleting: boolean;
}

export function useDeleteCategory(options: UseDeleteCategoryOptions = {}): UseDeleteCategoryReturn {
  const [isDeleting, setIsDeleting] = useState(false);

  const remove = useCallback(
    async (id: string) => {
      if (isDeleting) return;
      setIsDeleting(true);
      try {
        await categoryService.deleteCategory(id);
        options.onSuccess?.(id);
      } catch (err) {
        const e = err as CategoryServiceError;
        if (e.kind === 'conflict' && e.code === 'category.has_dependencies' && e.blockers) {
          options.onBlocked?.(e.blockers);
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
