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
      className="rounded-xl border border-border bg-surface p-5"
      aria-labelledby="member-budgets-heading"
    >
      <h2 id="member-budgets-heading" className="mb-1 text-lg font-semibold text-fg">
        Orçamentos por membro
      </h2>
      <p className="mb-3 text-sm text-fg-muted">
        Teto individual de cada membro — em R$ ou em % do orçamento da família.
      </p>
      {members.length === 0 ? (
        <p className="text-sm text-fg-muted">Nenhum membro no grupo.</p>
      ) : (
        <ul className="divide-y divide-border">
          {members.map((m) => (
            <li key={m.memberId} className="flex items-center justify-between gap-4 py-3">
              <span className="text-sm font-medium text-fg">{m.name}</span>
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
