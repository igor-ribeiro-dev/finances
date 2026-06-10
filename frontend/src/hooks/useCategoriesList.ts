import { useCallback, useEffect, useMemo, useState } from 'react';
import { categoryService } from '../services/category.service';
import type { Category, CategoryServiceError } from '../types/category';

const collator = new Intl.Collator('pt-BR', { sensitivity: 'accent' });

/** pt-BR alphabetical sort applied locally as a backup to the server ordering. */
function sortByName(cats: Category[]): Category[] {
  return [...cats].sort((a, b) => collator.compare(a.name, b.name));
}

export interface UseCategoriesListReturn {
  categories: Category[];
  roots: Category[];
  isLoading: boolean;
  error: CategoryServiceError | null;
  /** Lookup map id → Category (O(1)) used by the expense pickers (US2). */
  byId: Map<string, Category>;
  /** Sub-categories grouped by their root id (US2 sub-category picker). */
  rootsById: Map<string, Category[]>;
  insertOptimistic: (c: Category) => void;
  removeOptimistic: (id: string) => void;
  replaceOptimistic: (id: string, patch: Partial<Category>) => void;
  refresh: () => Promise<void>;
}

export function useCategoriesList(): UseCategoriesListReturn {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<CategoryServiceError | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const list = await categoryService.listCategories();
      setCategories(sortByName(list));
    } catch (err) {
      setError(err as CategoryServiceError);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const insertOptimistic = useCallback((c: Category) => {
    setCategories((prev) => sortByName([...prev, c]));
  }, []);

  const removeOptimistic = useCallback((id: string) => {
    setCategories((prev) => prev.filter((c) => c.id !== id));
  }, []);

  const replaceOptimistic = useCallback((id: string, patch: Partial<Category>) => {
    setCategories((prev) => sortByName(prev.map((c) => (c.id === id ? { ...c, ...patch } : c))));
  }, []);

  const byId = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);

  const roots = useMemo(() => categories.filter((c) => c.parentId === null), [categories]);

  const rootsById = useMemo(() => {
    const map = new Map<string, Category[]>();
    for (const c of categories) {
      if (c.parentId) {
        const arr = map.get(c.parentId) ?? [];
        arr.push(c);
        map.set(c.parentId, arr);
      }
    }
    return map;
  }, [categories]);

  return {
    categories,
    roots,
    isLoading,
    error,
    byId,
    rootsById,
    insertOptimistic,
    removeOptimistic,
    replaceOptimistic,
    refresh: load,
  };
}
