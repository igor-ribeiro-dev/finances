import { useEffect, useRef } from 'react';
import type { Expense } from '../../types/expense';
import { ExpenseListItem } from './ExpenseListItem';

interface ExpenseListProps {
  items: Expense[];
  nextCursor: string | null;
  isInitialLoading: boolean;
  isLoadingMore: boolean;
  onLoadMore: () => void | Promise<void>;
  onEdit?: (expense: Expense) => void;
  onDelete?: (expense: Expense) => void;
  onEmptyCta?: () => void;
}

function Skeleton() {
  return (
    <div className="space-y-3 p-4" aria-hidden="true">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4">
          <div className="h-10 flex-1 rounded-md bg-gray-100" />
          <div className="h-6 w-24 rounded-md bg-gray-100" />
        </div>
      ))}
    </div>
  );
}

export function ExpenseList({
  items,
  nextCursor,
  isInitialLoading,
  isLoadingMore,
  onLoadMore,
  onEdit,
  onDelete,
  onEmptyCta,
}: ExpenseListProps) {
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!nextCursor || isInitialLoading) return;
    const node = sentinelRef.current;
    if (!node) return;
    if (typeof IntersectionObserver === 'undefined') return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            void onLoadMore();
          }
        }
      },
      { rootMargin: '200px' },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [nextCursor, isInitialLoading, onLoadMore]);

  if (isInitialLoading) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        <Skeleton />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-gray-300 bg-white p-12 text-center shadow-sm">
        <p className="mb-4 text-gray-700">Você ainda não registrou nenhuma despesa.</p>
        {onEmptyCta && (
          <button
            type="button"
            onClick={onEmptyCta}
            className="font-medium text-teal-700 hover:underline"
          >
            Registrar primeira despesa
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
      <div role="list">
        {items.map((expense) => (
          <ExpenseListItem key={expense.id} expense={expense} onEdit={onEdit} onDelete={onDelete} />
        ))}
      </div>
      {nextCursor && (
        <div
          ref={sentinelRef}
          className="flex items-center justify-center p-4 text-sm text-gray-500"
        >
          {isLoadingMore ? 'Carregando mais…' : 'Role para carregar mais'}
        </div>
      )}
    </div>
  );
}
