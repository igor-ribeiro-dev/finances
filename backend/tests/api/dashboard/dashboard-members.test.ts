import request from 'supertest';
import { createApp } from '../../../src/app';

// T020 (US2) — member spending now sourced from PAID Bills (paidByMemberId), not Expenses.
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
const CARLOS = 'user-carlos'; // left the group; still has PAID bills this month

const ACTIVE = [
  { id: ANA, name: 'Ana' },
  { id: BIA, name: 'Bia' },
];
const ALL_USERS = [...ACTIVE, { id: CARLOS, name: 'Carlos', familyGroupId: null }];

function setupAuth(userId: string = ANA): void {
  session.findUnique.mockResolvedValue({
    id: 'sess-1',
    userId,
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

function setupReads(opts: { budgetRows?: object[]; byMember?: SpendRow[] }): void {
  budget.findMany.mockResolvedValue(opts.budgetRows ?? []);
  user.findMany.mockImplementation(
    ({ where }: { where: { id?: { in: string[] }; familyGroupId?: string } }) => {
      if (where.id?.in) {
        return Promise.resolve(ALL_USERS.filter((u) => where.id!.in.includes(u.id)));
      }
      return Promise.resolve(ACTIVE);
    },
  );
  category.findMany.mockResolvedValue([]);
  bill.groupBy.mockImplementation(({ by }: { by: string[] }) =>
    Promise.resolve(by[0] === 'paidByMemberId' ? (opts.byMember ?? []) : []),
  );
}

function memberRow(memberId: string, limit: { amountCents?: number; percent?: number }) {
  return {
    id: 'b-' + memberId,
    groupId: GROUP,
    month: new Date(Date.UTC(2026, 5, 1)),
    targetType: 'MEMBER',
    targetMemberId: memberId,
    targetCategoryId: null,
    limitType: limit.percent !== undefined ? 'PERCENT' : 'ABSOLUTE',
    amountCents: limit.amountCents ?? null,
    percent: limit.percent ?? null,
  };
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

describe('GET /api/v1/dashboard — members (US2)', () => {
  it('lists every active member, zero-spend included, with resolved budgets', async () => {
    setupReads({
      budgetRows: [familyRow(500000), memberRow(ANA, { percent: 30 })],
      byMember: [{ paidByMemberId: ANA, _sum: { actualAmountCents: 120000 } }],
    });
    const res = await authed('/api/v1/dashboard?month=2026-06');
    expect(res.status).toBe(200);
    expect(res.body.members).toEqual([
      {
        memberId: ANA,
        name: 'Ana',
        isExMember: false,
        spentCents: 120000,
        budget: { limitType: 'PERCENT', amountCents: null, percent: 30, resolvedCents: 150000 },
      },
      { memberId: BIA, name: 'Bia', isExMember: false, spentCents: 0, budget: null },
    ]);
  });

  it('marks an unresolvable percent limit with resolvedCents null (FR-007)', async () => {
    setupReads({
      budgetRows: [memberRow(ANA, { percent: 30 })],
      byMember: [{ paidByMemberId: ANA, _sum: { actualAmountCents: 5000 } }],
    });
    const res = await authed('/api/v1/dashboard?month=2026-06');
    expect(res.body.members[0].budget.resolvedCents).toBeNull();
  });

  it('includes ex-members with PAID bills as inactive rows; sum matches family (Q2)', async () => {
    setupReads({
      byMember: [
        { paidByMemberId: ANA, _sum: { actualAmountCents: 120000 } },
        { paidByMemberId: CARLOS, _sum: { actualAmountCents: 25000 } },
      ],
    });
    const res = await authed('/api/v1/dashboard?month=2026-06');
    const carlos = res.body.members.find((m: { memberId: string }) => m.memberId === CARLOS);
    expect(carlos).toEqual({
      memberId: CARLOS,
      name: 'Carlos',
      isExMember: true,
      spentCents: 25000,
      budget: null,
    });
    const sum = res.body.members.reduce(
      (acc: number, m: { spentCents: number }) => acc + m.spentCents,
      0,
    );
    expect(sum).toBe(res.body.family.spentCents);
    expect(res.body.family.spentCents).toBe(145000);
  });

  it('omits ex-members without PAID bills in the month', async () => {
    setupReads({ byMember: [{ paidByMemberId: ANA, _sum: { actualAmountCents: 100 } }] });
    const res = await authed('/api/v1/dashboard?month=2026-06');
    const ids = res.body.members.map((m: { memberId: string }) => m.memberId);
    expect(ids).toEqual([ANA, BIA]);
  });

  it('returns the identical envelope to a second member of the same group (FR-017/SC-004)', async () => {
    setupReads({
      budgetRows: [familyRow(500000), memberRow(ANA, { percent: 30 })],
      byMember: [
        { paidByMemberId: ANA, _sum: { actualAmountCents: 120000 } },
        { paidByMemberId: BIA, _sum: { actualAmountCents: 80000 } },
      ],
    });
    const asAna = await authed('/api/v1/dashboard?month=2026-06');

    jest.clearAllMocks();
    setupAuth(BIA);
    setupReads({
      budgetRows: [familyRow(500000), memberRow(ANA, { percent: 30 })],
      byMember: [
        { paidByMemberId: ANA, _sum: { actualAmountCents: 120000 } },
        { paidByMemberId: BIA, _sum: { actualAmountCents: 80000 } },
      ],
    });
    const asBia = await authed('/api/v1/dashboard?month=2026-06');

    expect(asAna.status).toBe(200);
    expect(asBia.status).toBe(200);
    expect(asBia.body).toEqual(asAna.body);
  });
});
