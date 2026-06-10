import type { ResolvedLimit, LimitInput } from '../../types/budget';

/** Editable form state for one limit: both values kept so toggling preserves input. */
export interface EditableLimit {
  type: 'ABSOLUTE' | 'PERCENT';
  cents: number;
  percent: number;
}

export function emptyLimit(): EditableLimit {
  return { type: 'ABSOLUTE', cents: 0, percent: 0 };
}

/** Seed an editable draft from a server-resolved limit (or null = empty). */
export function fromResolved(budget: ResolvedLimit | null): EditableLimit {
  if (!budget) return emptyLimit();
  if (budget.limitType === 'ABSOLUTE') {
    return { type: 'ABSOLUTE', cents: budget.amountCents ?? 0, percent: 0 };
  }
  return { type: 'PERCENT', cents: 0, percent: budget.percent ?? 0 };
}

/** Convert a draft into the API input. Zero in the active mode clears (returns null). */
export function toInput(l: EditableLimit): LimitInput | null {
  if (l.type === 'ABSOLUTE') {
    return l.cents > 0 ? { limitType: 'ABSOLUTE', amountCents: l.cents } : null;
  }
  return l.percent > 0 ? { limitType: 'PERCENT', percent: l.percent } : null;
}
