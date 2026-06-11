import { formatCents } from '../../utils/money';
import { BudgetProgressBar } from './BudgetProgressBar';
import type { MemberSpending } from '../../types/dashboard';

interface MemberSpendingListProps {
  members: MemberSpending[];
}

/** US2 — each member's spending vs. their resolved individual budget (FR-006/FR-008). */
export function MemberSpendingList({ members }: MemberSpendingListProps) {
  if (members.length === 0) return null;

  return (
    <section
      aria-labelledby="member-spending-title"
      className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm"
    >
      <h2 id="member-spending-title" className="text-sm font-medium text-gray-500">
        Membros
      </h2>
      <ul className="mt-4 divide-y divide-gray-100">
        {members.map((m) => {
          const limitCents = m.budget?.resolvedCents ?? null;
          const hasBudget = !m.isExMember && limitCents !== null && limitCents > 0;
          const over = hasBudget && m.spentCents > limitCents;
          return (
            <li key={m.memberId} data-testid={`member-row-${m.memberId}`} className="py-3">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="font-medium text-gray-900">
                  {m.name}
                  {m.isExMember && (
                    <span className="ml-2 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500">
                      Ex-membro
                    </span>
                  )}
                </span>
                <span className="text-sm text-gray-700">
                  {formatCents(m.spentCents)}
                  {hasBudget && (
                    <span className="text-gray-400"> de {formatCents(limitCents)}</span>
                  )}
                </span>
              </div>
              {hasBudget ? (
                <div className="mt-2 space-y-1">
                  <BudgetProgressBar spentCents={m.spentCents} limitCents={limitCents} />
                  {over ? (
                    <p className="text-xs font-semibold text-red-600">
                      Excedido em {formatCents(m.spentCents - limitCents)}
                    </p>
                  ) : (
                    <p className="text-xs text-gray-500">
                      Restante: {formatCents(limitCents - m.spentCents)}
                    </p>
                  )}
                </div>
              ) : (
                !m.isExMember && (
                  <p className="mt-1 text-xs text-gray-400">Sem orçamento definido</p>
                )
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
