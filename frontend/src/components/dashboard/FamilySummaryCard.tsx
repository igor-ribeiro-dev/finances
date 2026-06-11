import { Link } from 'react-router-dom';
import { formatCents } from '../../utils/money';
import { BudgetProgressBar } from './BudgetProgressBar';
import type { FamilySummary } from '../../types/dashboard';

interface FamilySummaryCardProps {
  family: FamilySummary;
}

/** US1 — total spent vs. the family budget (FR-002/FR-004/FR-005). */
export function FamilySummaryCard({ family }: FamilySummaryCardProps) {
  const limitCents = family.budget?.resolvedCents ?? null;
  const hasBudget = limitCents !== null && limitCents > 0;
  const over = hasBudget && family.spentCents > limitCents;

  return (
    <section
      aria-labelledby="family-summary-title"
      className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm"
    >
      <h2 id="family-summary-title" className="text-sm font-medium text-gray-500">
        Resumo da família
      </h2>
      <div className="mt-2 flex flex-wrap items-baseline gap-x-2">
        <span className="text-3xl font-bold text-gray-900">{formatCents(family.spentCents)}</span>
        {hasBudget && <span className="text-base text-gray-500">de {formatCents(limitCents)}</span>}
        <span className="text-sm text-gray-400">gastos no mês</span>
      </div>

      {hasBudget ? (
        <div className="mt-4 space-y-2">
          <BudgetProgressBar spentCents={family.spentCents} limitCents={limitCents} />
          {over ? (
            <p className="text-sm font-semibold text-red-600">
              Excedido em {formatCents(family.spentCents - limitCents)}
            </p>
          ) : (
            <p className="text-sm text-gray-600">
              Restante: {formatCents(limitCents - family.spentCents)}
            </p>
          )}
        </div>
      ) : (
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <p className="text-sm text-gray-600">Orçamento não definido para este mês.</p>
          <Link
            to="/orcamentos"
            className="text-sm font-medium text-indigo-600 hover:text-indigo-700"
          >
            Definir orçamentos
          </Link>
        </div>
      )}
    </section>
  );
}
