import { useState } from 'react';
import { FamilySummaryCard } from '../components/dashboard/FamilySummaryCard';
import { MemberSpendingList } from '../components/dashboard/MemberSpendingList';
import { CategorySpendingList } from '../components/dashboard/CategorySpendingList';
import { DashboardMonthSelector } from '../components/dashboard/DashboardMonthSelector';
import { useMonthDashboard } from '../hooks/useMonthDashboard';
import { currentMonth } from '../utils/month';

/**
 * Feature 009 — monthly dashboard (home page): family spending vs. budget,
 * per-member consumption and category distribution, navigable to past months.
 * Pure read view, recomputed on every load (FR-017).
 */
export function DashboardPage() {
  const [month, setMonth] = useState<string>(currentMonth());
  const { data, isLoading, error, refresh } = useMonthDashboard(month);

  return (
    <div className="space-y-6 p-8">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-fg">Dashboard</h1>
        <DashboardMonthSelector month={month} onChange={setMonth} />
      </header>

      {isLoading && <p className="text-fg-muted">Carregando dashboard…</p>}

      {!isLoading && error && (
        <div className="space-y-3">
          <p role="alert" className="text-sm text-danger">
            Não foi possível carregar o dashboard.
          </p>
          <button
            type="button"
            onClick={() => void refresh()}
            className="rounded-lg border border-border px-3 py-2 text-sm font-medium text-fg-muted hover:bg-surface hover:text-fg transition-colors"
          >
            Tentar novamente
          </button>
        </div>
      )}

      {!isLoading && !error && data && (
        <>
          <FamilySummaryCard family={data.family} />
          <MemberSpendingList members={data.members} />
          <CategorySpendingList
            categories={data.categories}
            uncategorizedSpentCents={data.uncategorizedSpentCents}
            totalSpentCents={data.family.spentCents}
          />
        </>
      )}
    </div>
  );
}
