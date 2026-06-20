import { Link } from 'react-router-dom';
import { formatCents } from '../../utils/money';
import { BudgetProgressBar } from './BudgetProgressBar';
import { GlassCard } from '@/components/ui';
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
    <GlassCard aria-labelledby="family-summary-title" className="p-6">
      <h2 id="family-summary-title" className="text-sm font-medium text-fg-muted">
        Resumo da família
      </h2>
      <div className="mt-2 flex flex-wrap items-baseline gap-x-2">
        <span className="text-money">{formatCents(family.spentCents)}</span>
        {hasBudget && <span className="text-base text-fg-muted">de {formatCents(limitCents)}</span>}
        <span className="text-sm text-fg-muted">gastos no mês</span>
      </div>

      {hasBudget ? (
        <div className="mt-4 space-y-2">
          <BudgetProgressBar spentCents={family.spentCents} limitCents={limitCents} />
          {over ? (
            <p className="text-sm font-semibold text-danger">
              Excedido em {formatCents(family.spentCents - limitCents)}
            </p>
          ) : (
            <p className="text-sm text-fg-muted">
              Restante: {formatCents(limitCents - family.spentCents)}
            </p>
          )}
        </div>
      ) : (
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <p className="text-sm text-fg-muted">Orçamento não definido para este mês.</p>
          <Link
            to="/orcamentos"
            className="text-sm font-medium text-primary hover:text-primary-hover transition-colors"
          >
            Definir orçamentos
          </Link>
        </div>
      )}
    </GlassCard>
  );
}
