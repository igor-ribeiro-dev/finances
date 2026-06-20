import { formatCents } from '../../utils/money';
import { BudgetProgressBar } from './BudgetProgressBar';
import { GlassCard } from '@/components/ui';
import type { MemberSpending } from '../../types/dashboard';

interface MemberSpendingListProps {
  members: MemberSpending[];
}

/** US2 — each member's spending vs. their resolved individual budget (FR-006/FR-008). */
export function MemberSpendingList({ members }: MemberSpendingListProps) {
  if (members.length === 0) return null;

  return (
    <GlassCard aria-labelledby="member-spending-title" className="p-6">
      <h2 id="member-spending-title" className="text-sm font-medium text-fg-muted">
        Membros
      </h2>
      <ul className="mt-4 divide-y divide-border">
        {members.map((m) => {
          const limitCents = m.budget?.resolvedCents ?? null;
          const hasBudget = !m.isExMember && limitCents !== null && limitCents > 0;
          const over = hasBudget && m.spentCents > limitCents;
          return (
            <li key={m.memberId} data-testid={`member-row-${m.memberId}`} className="py-3">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="font-medium text-fg">
                  {m.name}
                  {m.isExMember && (
                    <span className="ml-2 rounded-full bg-surface border border-border px-2 py-0.5 text-xs font-medium text-fg-muted">
                      Ex-membro
                    </span>
                  )}
                </span>
                <span className="text-sm text-fg">
                  {formatCents(m.spentCents)}
                  {hasBudget && (
                    <span className="text-fg-muted"> de {formatCents(limitCents)}</span>
                  )}
                </span>
              </div>
              {hasBudget ? (
                <div className="mt-2 space-y-1">
                  <BudgetProgressBar spentCents={m.spentCents} limitCents={limitCents} />
                  {over ? (
                    <p className="text-xs font-semibold text-danger">
                      Excedido em {formatCents(m.spentCents - limitCents)}
                    </p>
                  ) : (
                    <p className="text-xs text-fg-muted">
                      Restante: {formatCents(limitCents - m.spentCents)}
                    </p>
                  )}
                </div>
              ) : (
                !m.isExMember && (
                  <p className="mt-1 text-xs text-fg-muted">Sem orçamento definido</p>
                )
              )}
            </li>
          );
        })}
      </ul>
    </GlassCard>
  );
}
