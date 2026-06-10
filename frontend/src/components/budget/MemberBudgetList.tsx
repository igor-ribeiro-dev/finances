import { LimitEditor } from './LimitEditor';
import type { EditableLimit } from './limit-draft';
import type { MemberBudget } from '../../types/budget';

interface MemberBudgetListProps {
  members: MemberBudget[];
  drafts: Record<string, EditableLimit>;
  onChange: (memberId: string, next: EditableLimit) => void;
  disabled?: boolean;
}

/**
 * Per-member budgets (US2). Each member's limit can be an absolute value or a
 * percentage of the family budget; they are independent from each other and from
 * the family total (FR-007).
 */
export function MemberBudgetList({ members, drafts, onChange, disabled }: MemberBudgetListProps) {
  return (
    <section
      className="rounded-xl border border-gray-200 bg-white p-5"
      aria-labelledby="member-budgets-heading"
    >
      <h2 id="member-budgets-heading" className="mb-1 text-lg font-semibold text-gray-900">
        Orçamentos por membro
      </h2>
      <p className="mb-3 text-sm text-gray-500">
        Teto individual de cada membro — em R$ ou em % do orçamento da família.
      </p>
      {members.length === 0 ? (
        <p className="text-sm text-gray-400">Nenhum membro no grupo.</p>
      ) : (
        <ul className="divide-y divide-gray-100">
          {members.map((m) => (
            <li key={m.memberId} className="flex items-center justify-between gap-4 py-3">
              <span className="text-sm font-medium text-gray-800">{m.name}</span>
              <LimitEditor
                label={m.name}
                value={drafts[m.memberId] ?? { type: 'ABSOLUTE', cents: 0, percent: 0 }}
                onChange={(next) => onChange(m.memberId, next)}
                resolvedCents={m.budget?.resolvedCents ?? null}
                disabled={disabled}
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
