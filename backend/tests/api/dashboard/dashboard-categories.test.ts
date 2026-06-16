import request from 'supertest';
import { createApp } from '../../../src/app';

// T020 (US2) — category spending now sourced from PAID Bills, not Expenses.
jest.mock('../../../src/infra/prisma', () => ({
  prisma: {
    session: { findUnique: jest.fn(), update: jest.fn() },
    user: { findUnique: jest.fn(), findMany: jest.fn() },
    category: { findMany: jest.fn() },
    budget: { findMany: jest.fn() },
    bill: { groupBy: jest.fn() },
  },
}));

import { prisma } from '../../../src/infra/prisma';

const app = createApp();

const session = prisma.session as unknown as { findUnique: jest.Mock; update: jest.Mock };
const user = prisma.user as unknown as { findUnique: jest.Mock; findMany: jest.Mock };
const category = prisma.category as unknown as { findMany: jest.Mock };
const budget = prisma.budget as unknown as { findMany: jest.Mock };
const bill = prisma.bill as unknown as { groupBy: jest.Mock };

const GROUP = 'group-1';
const ANA = 'user-ana';
const FOOD = 'cat-food';
const MARKET = 'cat-market'; // sub of FOOD
const HOME = 'cat-home';

const CATEGORIES = [
  { id: FOOD, name: 'Alimentação', parentId: null },
  { id: MARKET, name: 'Mercado', parentId: FOOD },
  { id: HOME, name: 'Moradia', parentId: null },
];

function setupAuth(): void {
  session.findUnique.mockResolvedValue({
    id: 'sess-1',
    userId: ANA,
    expiresAt: new Date(Date.now() + 60_000),
  });
  session.update.mockResolvedValue({});
  user.findUnique.mockResolvedValue({ familyGroupId: GROUP });
}

interface SpendRow {
  paidByMemberId?: string;
  categoryId?: string | null;
  _sum: { actualAmountCents: number | null };
}

function setupReads(opts: {
  budgetRows?: object[];
  byMember?: SpendRow[];
  byCategory?: SpendRow[];
}): void {
  budget.findMany.mockResolvedValue(opts.budgetRows ?? []);
  user.findMany.mockResolvedValue([{ id: ANA, name: 'Ana' }]);
  category.findMany.mockResolvedValue(CATEGORIES);
  bill.groupBy.mockImplementation(({ by }: { by: string[] }) =>
    Promise.resolve(by[0] === 'paidByMemberId' ? (opts.byMember ?? []) : (opts.byCategory ?? [])),
  );
}

function categoryRow(categoryId: string, amountCents: number) {
  return {
    id: 'b-' + categoryId,
    groupId: GROUP,
    month: new Date(Date.UTC(2026, 5, 1)),
    targetType: 'CATEGORY',
    targetMemberId: null,
    targetCategoryId: categoryId,
    limitType: 'ABSOLUTE',
    amountCents,
    percent: null,
  };
}

function authed(path: string) {
  return request(app as Parameters<typeof request>[0])
    .get(path)
    .set('Cookie', 'session_id=sess-1');
}

function catOf(body: { categories: { categoryId: string }[] }, id: string) {
  return (
    body.categories as {
      categoryId: string;
      directSpentCents: number;
      spentCents: number;
      budget: { resolvedCents: number | null } | null;
    }[]
  ).find((c) => c.categoryId === id)!;
}

beforeEach(() => {
  jest.clearAllMocks();
  setupAuth();
});

describe('GET /api/v1/dashboard — categories (US3)', () => {
  it('aggregates sub-category spending into the root (umbrella rule, Q1)', async () => {
    setupReads({
      byMember: [{ paidByMemberId: ANA, _sum: { actualAmountCents: 200000 } }],
      byCategory: [
        { categoryId: FOOD, _sum: { actualAmountCents: 40000 } },
        { categoryId: MARKET, _sum: { actualAmountCents: 110000 } },
        { categoryId: null, _sum: { actualAmountCents: 50000 } },
      ],
    });
    const res = await authed('/api/v1/dashboard?month=2026-06');
    expect(res.status).toBe(200);

    const food = catOf(res.body, FOOD);
    expect(food.directSpentCents).toBe(40000);
    expect(food.spentCents).toBe(150000); // direct + Mercado

    const market = catOf(res.body, MARKET);
    expect(market.directSpentCents).toBe(110000);
    expect(market.spentCents).toBe(110000);

    expect(res.body.uncategorizedSpentCents).toBe(50000);

    // Invariant 2: Σ roots + uncategorized = family total.
    const rootsSum = (res.body.categories as { parentId: string | null; spentCents: number }[])
      .filter((c) => c.parentId === null)
      .reduce((acc, c) => acc + c.spentCents, 0);
    expect(rootsSum + res.body.uncategorizedSpentCents).toBe(res.body.family.spentCents);
  });

  it('includes zero-spend categories with their resolved budget caps (FR-012)', async () => {
    setupReads({ budgetRows: [categoryRow(HOME, 180000)] });
    const res = await authed('/api/v1/dashboard?month=2026-06');
    const home = catOf(res.body, HOME);
    expect(home.spentCents).toBe(0);
    expect(home.budget?.resolvedCents).toBe(180000);
  });

  it('returns the full flattened tree with parentId for client-side grouping', async () => {
    setupReads({});
    const res = await authed('/api/v1/dashboard?month=2026-06');
    expect(res.body.categories).toHaveLength(3);
    const market = res.body.categories.find((c: { categoryId: string }) => c.categoryId === MARKET);
    expect(market.parentId).toBe(FOOD);
  });
});
