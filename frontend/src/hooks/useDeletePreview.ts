import { useCallback, useRef, useState } from 'react';
import { categoryService } from '../services/category.service';
import type { CategoryServiceError, DeletePreview } from '../types/category';

const CACHE_TTL_MS = 1000;

interface UseDeletePreviewReturn {
  preview: DeletePreview | null;
  isLoading: boolean;
  error: CategoryServiceError | null;
  fetch: (id: string) => Promise<DeletePreview | null>;
  reset: () => void;
}

export function useDeletePreview(): UseDeletePreviewReturn {
  const [preview, setPreview] = useState<DeletePreview | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<CategoryServiceError | null>(null);
  // In-memory cache so re-opening the same row within 1s doesn't refetch.
  const cache = useRef<Map<string, { at: number; value: DeletePreview }>>(new Map());

  const fetch = useCallback(async (id: string): Promise<DeletePreview | null> => {
    const cached = cache.current.get(id);
    if (cached && Date.now() - cached.at < CACHE_TTL_MS) {
      setPreview(cached.value);
      setError(null);
      return cached.value;
    }
    setIsLoading(true);
    setError(null);
    try {
      const value = await categoryService.previewDeleteCategory(id);
      cache.current.set(id, { at: Date.now(), value });
      setPreview(value);
      return value;
    } catch (err) {
      setError(err as CategoryServiceError);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setPreview(null);
    setError(null);
  }, []);

  return { preview, isLoading, error, fetch, reset };
}
