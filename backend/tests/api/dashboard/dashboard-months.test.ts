import request from 'supertest';
import { createApp } from '../../../src/app';

// T020 (US2) — month independence, spending sourced from PAID Bills.
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
  it('queries PAID bills and budgets strictly within the requested month (FR-014)', async () => {
    budget.findMany.mockResolvedValue([]);
    // May has PAID bills; June does not — the mock answers by paidDate range.
    bill.groupBy.mockImplementation(
      ({ by, where }: { by: string[]; where: { paidDate: { gte: Date } } }) => {
        const isMay = where.paidDate.gte.getTime() === Date.UTC(2026, 4, 1);
        if (by[0] !== 'paidByMemberId') return Promise.resolve([]);
        return Promise.resolve(
          isMay ? [{ paidByMemberId: ANA, _sum: { actualAmountCents: 70000 } }] : [],
        );
      },
    );

    const may = await authed('/api/v1/dashboard?month=2026-05');
    expect(may.body.month).toBe('2026-05');
    expect(may.body.family.spentCents).toBe(70000);

    const june = await authed('/api/v1/dashboard?month=2026-06');
    expect(june.body.month).toBe('2026-06');
    expect(june.body.family.spentCents).toBe(0);

    const budgetMonths = budget.findMany.mock.calls.map((c: [{ where: { month: Date } }]) =>
      c[0].where.month.getTime(),
    );
    expect(budgetMonths).toContain(Date.UTC(2026, 4, 1));
    expect(budgetMonths).toContain(Date.UTC(2026, 5, 1));
  });

  it('returns zeroed totals for any data-less valid month, including future (R6)', async () => {
    budget.findMany.mockResolvedValue([]);
    bill.groupBy.mockResolvedValue([]);
    const res = await authed('/api/v1/dashboard?month=2030-01');
    expect(res.status).toBe(200);
    expect(res.body.family.spentCents).toBe(0);
    expect(res.body.uncategorizedSpentCents).toBe(0);
  });
});
