import request from 'supertest';
import { createApp } from '../../../src/app';

// T020 (US2) — family spending now sourced from PAID Bills, not Expenses.
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
const BIA = 'user-bia';

const MEMBERS = [
  { id: ANA, name: 'Ana' },
  { id: BIA, name: 'Bia' },
];

interface SpendRow {
  paidByMemberId?: string;
  categoryId?: string | null;
  _sum: { actualAmountCents: number | null };
}

function setupAuth(): void {
  session.findUnique.mockResolvedValue({
    id: 'sess-1',
    userId: ANA,
    expiresAt: new Date(Date.now() + 60_000),
  });
  session.update.mockResolvedValue({});
  user.findUnique.mockResolvedValue({ familyGroupId: GROUP });
}

function setupReads(opts: {
  budgetRows?: object[];
  byMember?: SpendRow[];
  byCategory?: SpendRow[];
}): void {
  budget.findMany.mockResolvedValue(opts.budgetRows ?? []);
  user.findMany.mockImplementation(({ where }: { where: { id?: { in: string[] } } }) =>
    Promise.resolve(where.id?.in ? MEMBERS.filter((m) => where.id!.in.includes(m.id)) : MEMBERS),
  );
  category.findMany.mockResolvedValue([]);
  bill.groupBy.mockImplementation(({ by }: { by: string[] }) =>
    Promise.resolve(by[0] === 'paidByMemberId' ? (opts.byMember ?? []) : (opts.byCategory ?? [])),
  );
}

function familyRow(amountCents: number) {
  return {
    id: 'b-family',
    groupId: GROUP,
    month: new Date(Date.UTC(2026, 5, 1)),
    targetType: 'FAMILY',
    targetMemberId: null,
    targetCategoryId: null,
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

beforeEach(() => {
  jest.clearAllMocks();
  setupAuth();
});

describe('GET /api/v1/dashboard — family summary (US1)', () => {
  it('sums all PAID bills of the month into family.spentCents', async () => {
    setupReads({
      byMember: [
        { paidByMemberId: ANA, _sum: { actualAmountCents: 120000 } },
        { paidByMemberId: BIA, _sum: { actualAmountCents: 205000 } },
      ],
      budgetRows: [familyRow(500000)],
    });

    const res = await authed('/api/v1/dashboard?month=2026-06');
    expect(res.status).toBe(200);
    expect(res.body.month).toBe('2026-06');
    expect(res.body.family.spentCents).toBe(325000);
    expect(res.body.family.budget).toEqual({
      limitType: 'ABSOLUTE',
      amountCents: 500000,
      percent: null,
      resolvedCents: 500000,
    });

    // Civil-date paidDate month bucketing on the session's group.
    const groupByArgs = bill.groupBy.mock.calls[0][0];
    expect(groupByArgs.where.groupId).toBe(GROUP);
    expect(groupByArgs.where.status).toBe('PAID');
    expect(groupByArgs.where.paidDate.gte).toEqual(new Date(Date.UTC(2026, 5, 1)));
    expect(groupByArgs.where.paidDate.lt).toEqual(new Date(Date.UTC(2026, 6, 1)));
  });

  it('returns budget null when the month has no family budget (FR-005)', async () => {
    setupReads({ byMember: [{ paidByMemberId: ANA, _sum: { actualAmountCents: 9900 } }] });
    const res = await authed('/api/v1/dashboard?month=2026-06');
    expect(res.status).toBe(200);
    expect(res.body.family.spentCents).toBe(9900);
    expect(res.body.family.budget).toBeNull();
  });

  it('returns zeroed totals for a month without PAID bills (FR-016)', async () => {
    setupReads({ budgetRows: [familyRow(500000)] });
    const res = await authed('/api/v1/dashboard?month=2026-06');
    expect(res.status).toBe(200);
    expect(res.body.family.spentCents).toBe(0);
    expect(res.body.uncategorizedSpentCents).toBe(0);
    expect(res.body.family.budget?.resolvedCents).toBe(500000);
  });

  it('echoes the requested month and returns zeros for a data-less past month', async () => {
    setupReads({});
    const res = await authed('/api/v1/dashboard?month=2020-01');
    expect(res.status).toBe(200);
    expect(res.body.month).toBe('2020-01');
    expect(res.body.family.spentCents).toBe(0);
  });

  it('emits a structured access log without monetary values (T030, Constitution V)', async () => {
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    try {
      setupReads({
        byMember: [{ paidByMemberId: ANA, _sum: { actualAmountCents: 325000 } }],
        budgetRows: [familyRow(500000)],
      });
      await authed('/api/v1/dashboard?month=2026-06');

      const entry = logSpy.mock.calls
        .map((c) => {
          try {
            return JSON.parse(c[0] as string) as Record<string, unknown>;
          } catch {
            return null;
          }
        })
        .find((e) => e?.['event'] === 'dashboard.read');

      expect(entry).toBeDefined();
      expect(entry).toMatchObject({
        outcome: 'success',
        userId: ANA,
        groupId: GROUP,
        month: '2026-06',
      });
      const raw = JSON.stringify(entry);
      expect(raw).not.toContain('325000');
      expect(raw).not.toContain('500000');
      expect(raw).not.toContain('Cents');
    } finally {
      logSpy.mockRestore();
    }
  });
});
