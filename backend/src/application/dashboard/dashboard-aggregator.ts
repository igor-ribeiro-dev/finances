/**
 * Pure month-dashboard assembly (no I/O) — feature 009.
 *
 * Merges the month's spending sums (groupBy over Expense) with the resolved
 * budget limits from feature 008 into the `MonthDashboard` wire envelope.
 * All monetary fields are integer cents (Constitution III); display
 * percentages are a frontend concern (research R5).
 *
 * Derivation rules (data-model.md):
 *   - family.spentCents   = Σ per-member sums (invariant 1 by construction).
 *   - members[]           = every active member (zero included) + ex-members
 *                           that own expenses in the month (isExMember, no budget).
 *   - root spentCents     = direct + Σ sub-categories' direct (Clarification Q1).
 *   - uncategorized       = sums whose categoryId is null.
 */
import type { ResolvedLimit } from '../budget/budget-resolver';

export interface FamilySummary {
  spentCents: number;
  budget: ResolvedLimit | null;
}

export interface MemberSpending {
  memberId: string;
  name: string;
  isExMember: boolean;
  spentCents: number;
  budget: ResolvedLimit | null;
}

export interface CategorySpending {
  categoryId: string;
  name: string;
  parentId: string | null;
  directSpentCents: number;
  spentCents: number;
  budget: ResolvedLimit | null;
}

export interface MonthDashboard {
  month: string;
  family: FamilySummary;
  members: MemberSpending[];
  categories: CategorySpending[];
  uncategorizedSpentCents: number;
}

export interface BuildMonthDashboardInput {
  month: string;
  familyBudget: ResolvedLimit | null;
  /** Current group members with their resolved limits (feature 008 order: name asc). */
  activeMembers: { memberId: string; name: string; budget: ResolvedLimit | null }[];
  /** Full flattened category tree with resolved limits (roots followed by their subs). */
  categories: {
    categoryId: string;
    name: string;
    parentId: string | null;
    budget: ResolvedLimit | null;
  }[];
  byMember: { ownerMemberId: string; spentCents: number }[];
  byCategory: { categoryId: string | null; spentCents: number }[];
  /** Display names for expense owners that are no longer group members. */
  exMemberNames: Record<string, string>;
}

export function buildMonthDashboard(input: BuildMonthDashboardInput): MonthDashboard {
  const memberSpend = new Map(input.byMember.map((r) => [r.ownerMemberId, r.spentCents]));
  const familySpentCents = input.byMember.reduce((acc, r) => acc + r.spentCents, 0);

  // Members — every active member (zero-spend included)…
  const members: MemberSpending[] = input.activeMembers.map((m) => ({
    memberId: m.memberId,
    name: m.name,
    isExMember: false,
    spentCents: memberSpend.get(m.memberId) ?? 0,
    budget: m.budget,
  }));
  // …plus ex-members that own expenses this month (Clarification Q2 — keeps
  // Σ members[].spentCents === family.spentCents). Budgets never apply to them.
  const activeIds = new Set(input.activeMembers.map((m) => m.memberId));
  const exMembers: MemberSpending[] = input.byMember
    .filter((r) => !activeIds.has(r.ownerMemberId))
    .map((r) => ({
      memberId: r.ownerMemberId,
      name: input.exMemberNames[r.ownerMemberId] ?? '',
      isExMember: true,
      spentCents: r.spentCents,
      budget: null,
    }))
    .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  members.push(...exMembers);

  // Categories — direct sums first, then the umbrella rule for roots (Q1).
  const directSpend = new Map<string | null, number>(
    input.byCategory.map((r) => [r.categoryId, r.spentCents]),
  );
  const subDirectByRoot = new Map<string, number>();
  for (const c of input.categories) {
    if (c.parentId !== null) {
      const direct = directSpend.get(c.categoryId) ?? 0;
      subDirectByRoot.set(c.parentId, (subDirectByRoot.get(c.parentId) ?? 0) + direct);
    }
  }
  const categories: CategorySpending[] = input.categories.map((c) => {
    const direct = directSpend.get(c.categoryId) ?? 0;
    const spent = c.parentId === null ? direct + (subDirectByRoot.get(c.categoryId) ?? 0) : direct;
    return {
      categoryId: c.categoryId,
      name: c.name,
      parentId: c.parentId,
      directSpentCents: direct,
      spentCents: spent,
      budget: c.budget,
    };
  });

  return {
    month: input.month,
    family: { spentCents: familySpentCents, budget: input.familyBudget },
    members,
    categories,
    uncategorizedSpentCents: directSpend.get(null) ?? 0,
  };
}
