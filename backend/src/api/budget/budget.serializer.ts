import type { Budget } from '@prisma/client';
import {
  resolveLimit,
  computeSummary,
  computeWarnings,
  type RawLimit,
  type ResolvedLimit,
  type AllocationSummary,
  type Warning,
} from '../../application/budget/budget-resolver';

export interface MemberRef {
  id: string;
  name: string;
}
export interface CategoryRef {
  id: string;
  name: string;
  parentId: string | null;
}

export interface MemberBudget {
  memberId: string;
  name: string;
  budget: ResolvedLimit | null;
}
export interface CategoryBudget {
  categoryId: string;
  name: string;
  parentId: string | null;
  budget: ResolvedLimit | null;
}
export interface MonthBudget {
  month: string;
  family: ResolvedLimit | null;
  members: MemberBudget[];
  categories: CategoryBudget[];
  summary: AllocationSummary;
  warnings: Warning[];
}

function rawOf(row: Budget): RawLimit {
  return { limitType: row.limitType, amountCents: row.amountCents, percent: row.percent };
}

export interface BuildMonthBudgetInput {
  month: string;
  rows: Budget[];
  members: MemberRef[];
  categories: CategoryRef[];
}

/**
 * Assemble the aggregated month picture: resolves every percentage limit against
 * its base (family for members/roots; resolved root for subs), then computes the
 * allocation summary and the advisory warnings.
 */
export function buildMonthBudget(input: BuildMonthBudgetInput): MonthBudget {
  const { month, rows, members, categories } = input;

  const familyRow = rows.find((r) => r.targetType === 'FAMILY') ?? null;
  const memberRows = new Map<string, Budget>();
  const categoryRows = new Map<string, Budget>();
  for (const r of rows) {
    if (r.targetType === 'MEMBER' && r.targetMemberId) memberRows.set(r.targetMemberId, r);
    if (r.targetType === 'CATEGORY' && r.targetCategoryId) categoryRows.set(r.targetCategoryId, r);
  }

  // Family — always ABSOLUTE; its amountCents is the base for percentages.
  const family = familyRow ? resolveLimit(rawOf(familyRow), null) : null;
  const familyAmountCents = familyRow?.amountCents ?? null;

  // Members — base is the family budget.
  const membersOut: MemberBudget[] = members.map((m) => {
    const row = memberRows.get(m.id);
    return {
      memberId: m.id,
      name: m.name,
      budget: row ? resolveLimit(rawOf(row), familyAmountCents) : null,
    };
  });

  // Categories — roots resolve over family; subs resolve over their root's resolved value.
  const roots = categories.filter((c) => c.parentId === null);
  const subsByRoot = new Map<string, CategoryRef[]>();
  for (const c of categories) {
    if (c.parentId) {
      const arr = subsByRoot.get(c.parentId) ?? [];
      arr.push(c);
      subsByRoot.set(c.parentId, arr);
    }
  }

  const categoriesOut: CategoryBudget[] = [];
  const rootResolvedLimits: ResolvedLimit[] = [];
  const rootsForWarnings: {
    categoryId: string;
    raw: RawLimit | null;
    resolved: ResolvedLimit | null;
    subs: ResolvedLimit[];
  }[] = [];

  for (const root of roots) {
    const rootRow = categoryRows.get(root.id) ?? null;
    const rootResolved = rootRow ? resolveLimit(rawOf(rootRow), familyAmountCents) : null;
    const rootResolvedCents = rootResolved?.resolvedCents ?? null;
    categoriesOut.push({
      categoryId: root.id,
      name: root.name,
      parentId: null,
      budget: rootResolved,
    });
    if (rootResolved) rootResolvedLimits.push(rootResolved);

    const subResolvedList: ResolvedLimit[] = [];
    for (const sub of subsByRoot.get(root.id) ?? []) {
      const subRow = categoryRows.get(sub.id) ?? null;
      const subResolved = subRow ? resolveLimit(rawOf(subRow), rootResolvedCents) : null;
      categoriesOut.push({
        categoryId: sub.id,
        name: sub.name,
        parentId: root.id,
        budget: subResolved,
      });
      if (subResolved) subResolvedList.push(subResolved);
    }

    rootsForWarnings.push({
      categoryId: root.id,
      raw: rootRow ? rawOf(rootRow) : null,
      resolved: rootResolved,
      subs: subResolvedList,
    });
  }

  return {
    month,
    family,
    members: membersOut,
    categories: categoriesOut,
    summary: computeSummary(familyAmountCents, rootResolvedLimits),
    warnings: computeWarnings(familyAmountCents, rootsForWarnings),
  };
}
