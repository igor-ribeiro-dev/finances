// T008/T017/T022 — unit tests for the pure month-dashboard aggregator.
import {
  buildMonthDashboard,
  type BuildMonthDashboardInput,
} from '../../../src/application/dashboard/dashboard-aggregator';
import type { ResolvedLimit } from '../../../src/application/budget/budget-resolver';

function absolute(cents: number): ResolvedLimit {
  return { limitType: 'ABSOLUTE', amountCents: cents, percent: null, resolvedCents: cents };
}

function baseInput(overrides: Partial<BuildMonthDashboardInput> = {}): BuildMonthDashboardInput {
  return {
    month: '2026-06',
    familyBudget: null,
    activeMembers: [],
    categories: [],
    byMember: [],
    byCategory: [],
    exMemberNames: {},
    ...overrides,
  };
}

describe('buildMonthDashboard — family (US1)', () => {
  it('sums every member bucket into family.spentCents (invariant 1)', () => {
    const out = buildMonthDashboard(
      baseInput({
        familyBudget: absolute(500000),
        byMember: [
          { ownerMemberId: 'a', spentCents: 120000 },
          { ownerMemberId: 'b', spentCents: 205000 },
        ],
      }),
    );
    expect(out.month).toBe('2026-06');
    expect(out.family.spentCents).toBe(325000);
    expect(out.family.budget?.resolvedCents).toBe(500000);
  });

  it('produces zeroed totals for an empty month (FR-016)', () => {
    const out = buildMonthDashboard(baseInput());
    expect(out.family.spentCents).toBe(0);
    expect(out.family.budget).toBeNull();
    expect(out.uncategorizedSpentCents).toBe(0);
    expect(out.members).toEqual([]);
    expect(out.categories).toEqual([]);
  });
});

describe('buildMonthDashboard — members (US2, Clarification Q2)', () => {
  const activeMembers = [
    { memberId: 'a', name: 'Ana', budget: absolute(200000) },
    { memberId: 'b', name: 'Bia', budget: null },
  ];

  it('keeps every active member (zero-spend included) and appends ex-members with spending', () => {
    const out = buildMonthDashboard(
      baseInput({
        activeMembers,
        byMember: [
          { ownerMemberId: 'a', spentCents: 120000 },
          { ownerMemberId: 'x', spentCents: 25000 },
        ],
        exMemberNames: { x: 'Carlos' },
      }),
    );
    expect(out.members).toEqual([
      {
        memberId: 'a',
        name: 'Ana',
        isExMember: false,
        spentCents: 120000,
        budget: absolute(200000),
      },
      { memberId: 'b', name: 'Bia', isExMember: false, spentCents: 0, budget: null },
      { memberId: 'x', name: 'Carlos', isExMember: true, spentCents: 25000, budget: null },
    ]);
    // Invariant 1: member rows sum to the family total.
    const sum = out.members.reduce((acc, m) => acc + m.spentCents, 0);
    expect(sum).toBe(out.family.spentCents);
  });

  it('omits ex-members without spending in the month', () => {
    const out = buildMonthDashboard(
      baseInput({ activeMembers, byMember: [{ ownerMemberId: 'a', spentCents: 100 }] }),
    );
    expect(out.members.map((m) => m.memberId)).toEqual(['a', 'b']);
  });
});

describe('buildMonthDashboard — categories (US3, Clarification Q1)', () => {
  const categories = [
    { categoryId: 'food', name: 'Alimentação', parentId: null, budget: absolute(200000) },
    { categoryId: 'market', name: 'Mercado', parentId: 'food', budget: null },
    { categoryId: 'home', name: 'Moradia', parentId: null, budget: null },
  ];

  it('root spentCents = direct + Σ sub direct; subs keep their own sums', () => {
    const out = buildMonthDashboard(
      baseInput({
        categories,
        byMember: [{ ownerMemberId: 'a', spentCents: 200000 }],
        byCategory: [
          { categoryId: 'food', spentCents: 40000 },
          { categoryId: 'market', spentCents: 110000 },
          { categoryId: null, spentCents: 50000 },
        ],
      }),
    );
    const food = out.categories.find((c) => c.categoryId === 'food')!;
    expect(food.directSpentCents).toBe(40000);
    expect(food.spentCents).toBe(150000);
    const market = out.categories.find((c) => c.categoryId === 'market')!;
    expect(market.spentCents).toBe(110000);
    expect(out.uncategorizedSpentCents).toBe(50000);

    // Invariant 2: Σ roots + uncategorized = family total.
    const rootsSum = out.categories
      .filter((c) => c.parentId === null)
      .reduce((acc, c) => acc + c.spentCents, 0);
    expect(rootsSum + out.uncategorizedSpentCents).toBe(out.family.spentCents);
  });

  it('keeps zero-spend categories with their budget caps (FR-012 visibility)', () => {
    const out = buildMonthDashboard(baseInput({ categories }));
    const home = out.categories.find((c) => c.categoryId === 'home')!;
    expect(home.spentCents).toBe(0);
    expect(home.directSpentCents).toBe(0);
  });
});
