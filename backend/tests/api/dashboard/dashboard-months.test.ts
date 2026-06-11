import request from 'supertest';
import { createApp } from '../../../src/app';

// T026 — US4 contract: months are independent; any valid month is accepted (R6).
jest.mock('../../../src/infra/prisma', () => ({
  prisma: {
    session: { findUnique: jest.fn(), update: jest.fn() },
    user: { findUnique: jest.fn(), findMany: jest.fn() },
    category: { findMany: jest.fn() },
    budget: { findMany: jest.fn() },
    expense: { groupBy: jest.fn() },
  },
}));

import { prisma } from '../../../src/infra/prisma';

const app = createApp();

const session = prisma.session as unknown as { findUnique: jest.Mock; update: jest.Mock };
const user = prisma.user as unknown as { findUnique: jest.Mock; findMany: jest.Mock };
const category = prisma.category as unknown as { findMany: jest.Mock };
const budget = prisma.budget as unknown as { findMany: jest.Mock };
const expense = prisma.expense as unknown as { groupBy: jest.Mock };

const GROUP = 'group-1';
const ANA = 'user-ana';

function setupAuth(): void {
  session.findUnique.mockResolvedValue({
    id: 'sess-1',
    userId: ANA,
    expiresAt: new Date(Date.now() + 60_000),
  });
  session.update.mockResolvedValue({});
  user.findUnique.mockResolvedValue({ familyGroupId: GROUP });
}

function authed(path: string) {
  return request(app as Parameters<typeof request>[0])
    .get(path)
    .set('Cookie', 'session_id=sess-1');
}

beforeEach(() => {
  jest.clearAllMocks();
  setupAuth();
  user.findMany.mockResolvedValue([{ id: ANA, name: 'Ana' }]);
  category.findMany.mockResolvedValue([]);
});

describe('GET /api/v1/dashboard — month independence (US4)', () => {
  it('queries expenses and budgets strictly within the requested month (FR-014)', async () => {
    budget.findMany.mockResolvedValue([]);
    // May has expenses; June does not — the mock answers by date range.
    expense.groupBy.mockImplementation(
      ({ by, where }: { by: string[]; where: { date: { gte: Date } } }) => {
        const isMay = where.date.gte.getTime() === Date.UTC(2026, 4, 1);
        if (by[0] !== 'ownerMemberId') return Promise.resolve([]);
        return Promise.resolve(isMay ? [{ ownerMemberId: ANA, _sum: { amountCents: 70000 } }] : []);
      },
    );

    const may = await authed('/api/v1/dashboard?month=2026-05');
    expect(may.body.month).toBe('2026-05');
    expect(may.body.family.spentCents).toBe(70000);

    const june = await authed('/api/v1/dashboard?month=2026-06');
    expect(june.body.month).toBe('2026-06');
    expect(june.body.family.spentCents).toBe(0);

    // Budgets are read for the exact month too.
    const budgetMonths = budget.findMany.mock.calls.map((c: [{ where: { month: Date } }]) =>
      c[0].where.month.getTime(),
    );
    expect(budgetMonths).toContain(Date.UTC(2026, 4, 1));
    expect(budgetMonths).toContain(Date.UTC(2026, 5, 1));
  });

  it('returns zeroed totals for any data-less valid month, including future (R6)', async () => {
    budget.findMany.mockResolvedValue([]);
    expense.groupBy.mockResolvedValue([]);
    const res = await authed('/api/v1/dashboard?month=2030-01');
    expect(res.status).toBe(200);
    expect(res.body.family.spentCents).toBe(0);
    expect(res.body.uncategorizedSpentCents).toBe(0);
  });
});
