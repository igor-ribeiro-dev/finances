import request from 'supertest';
import { createApp } from '../../../src/app';

jest.mock('../../../src/infra/prisma', () => {
  const txHandler = jest.fn();
  return {
    prisma: {
      session: { findUnique: jest.fn(), update: jest.fn() },
      user: { findUnique: jest.fn(), findMany: jest.fn() },
      category: { findMany: jest.fn() },
      budget: {
        findMany: jest.fn(),
        deleteMany: jest.fn(),
        create: jest.fn(),
        createMany: jest.fn(),
      },
      $transaction: txHandler,
    },
  };
});

import { prisma } from '../../../src/infra/prisma';

const app = createApp();

const session = prisma.session as unknown as { findUnique: jest.Mock; update: jest.Mock };
const user = prisma.user as unknown as { findUnique: jest.Mock; findMany: jest.Mock };
const category = prisma.category as unknown as { findMany: jest.Mock };
const budget = prisma.budget as unknown as {
  findMany: jest.Mock;
  deleteMany: jest.Mock;
  create: jest.Mock;
  createMany: jest.Mock;
};
const tx = prisma.$transaction as unknown as jest.Mock;

const GROUP = 'group-1';
const ANA = 'user-ana';
const BIA = 'user-bia';
const ROOT = 'cat-food';
const SUB = 'cat-market';

function authed(method: 'get' | 'put' | 'post', path: string) {
  return request(app as Parameters<typeof request>[0])
    [method](path)
    .set('Cookie', 'session_id=sess-1');
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

interface Row {
  targetType: 'FAMILY' | 'MEMBER' | 'CATEGORY';
  targetMemberId?: string | null;
  targetCategoryId?: string | null;
  limitType: 'ABSOLUTE' | 'PERCENT';
  amountCents?: number | null;
  percent?: number | null;
}
function row(r: Row) {
  return {
    id: 'b-' + Math.random().toString(36).slice(2),
    groupId: GROUP,
    month: new Date(Date.UTC(2026, 5, 1)),
    targetMemberId: null,
    targetCategoryId: null,
    amountCents: null,
    percent: null,
    ...r,
  };
}

const MEMBERS = [
  { id: ANA, name: 'Ana' },
  { id: BIA, name: 'Bia' },
];
const CATEGORIES = [
  { id: ROOT, name: 'Alimentação', parentId: null },
  { id: SUB, name: 'Mercado', parentId: ROOT },
];

/** Wire the read mocks (members/categories dual-purpose findMany + budget rows). */
function setupReads(rows: ReturnType<typeof row>[]): void {
  budget.findMany.mockResolvedValue(rows);
  user.findMany.mockImplementation(({ where }: { where: { id?: { in: string[] } } }) =>
    Promise.resolve(where.id?.in ? MEMBERS.filter((m) => where.id!.in.includes(m.id)) : MEMBERS),
  );
  category.findMany.mockImplementation(({ where }: { where: { id?: { in: string[] } } }) =>
    Promise.resolve(
      where.id?.in ? CATEGORIES.filter((c) => where.id!.in.includes(c.id)) : CATEGORIES,
    ),
  );
  tx.mockImplementation((cb: (c: unknown) => Promise<unknown>) => cb(prisma as unknown as object));
  budget.deleteMany.mockResolvedValue({ count: 0 });
  budget.create.mockResolvedValue({});
  budget.createMany.mockResolvedValue({ count: 0 });
}

beforeEach(() => {
  jest.clearAllMocks();
  setupAuth();
});

describe('GET /api/v1/budgets', () => {
  it('returns an empty picture (family null, members/categories listed)', async () => {
    setupReads([]);
    const res = await authed('get', '/api/v1/budgets?month=2026-06');
    expect(res.status).toBe(200);
    expect(res.body.family).toBeNull();
    expect(res.body.members).toHaveLength(2);
    expect(res.body.members[0].budget).toBeNull();
    expect(res.body.categories).toHaveLength(2);
  });

  it('rejects an invalid month with budget.invalid_month', async () => {
    setupReads([]);
    const res = await authed('get', '/api/v1/budgets?month=2026-13');
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('budget.invalid_month');
  });

  it('requires a session (401)', async () => {
    session.findUnique.mockResolvedValue(null);
    const res = await request(app as Parameters<typeof request>[0]).get(
      '/api/v1/budgets?month=2026-06',
    );
    expect(res.status).toBe(401);
  });

  it('resolves a member percentage over the family budget (US2, FR-021)', async () => {
    setupReads([
      row({ targetType: 'FAMILY', limitType: 'ABSOLUTE', amountCents: 500000 }),
      row({ targetType: 'MEMBER', targetMemberId: ANA, limitType: 'PERCENT', percent: 30 }),
    ]);
    const res = await authed('get', '/api/v1/budgets?month=2026-06');
    expect(res.status).toBe(200);
    const ana = res.body.members.find((m: { memberId: string }) => m.memberId === ANA);
    expect(ana.budget.resolvedCents).toBe(150000);
  });

  it('resolves root over family and sub over root, and emits warnings (US3)', async () => {
    setupReads([
      row({ targetType: 'FAMILY', limitType: 'ABSOLUTE', amountCents: 500000 }),
      row({ targetType: 'CATEGORY', targetCategoryId: ROOT, limitType: 'PERCENT', percent: 40 }),
      row({ targetType: 'CATEGORY', targetCategoryId: SUB, limitType: 'PERCENT', percent: 60 }),
    ]);
    const res = await authed('get', '/api/v1/budgets?month=2026-06');
    const root = res.body.categories.find((c: { categoryId: string }) => c.categoryId === ROOT);
    const sub = res.body.categories.find((c: { categoryId: string }) => c.categoryId === SUB);
    expect(root.budget.resolvedCents).toBe(200000); // 40% of 5000
    expect(sub.budget.resolvedCents).toBe(120000); // 60% of root (2000)
  });
});

describe('PUT /api/v1/budgets', () => {
  it('upserts the family budget (delete + create)', async () => {
    setupReads([]);
    const res = await authed('put', '/api/v1/budgets?month=2026-06').send({
      family: { limitType: 'ABSOLUTE', amountCents: 500000 },
    });
    expect(res.status).toBe(200);
    expect(budget.deleteMany).toHaveBeenCalled();
    expect(budget.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ targetType: 'FAMILY', amountCents: 500000 }),
      }),
    );
  });

  it('clears the family budget when sent null (FR-008, no create)', async () => {
    setupReads([]);
    const res = await authed('put', '/api/v1/budgets?month=2026-06').send({ family: null });
    expect(res.status).toBe(200);
    expect(budget.deleteMany).toHaveBeenCalled();
    expect(budget.create).not.toHaveBeenCalled();
  });

  it('rejects a non-integer percentage (FR-010)', async () => {
    setupReads([]);
    const res = await authed('put', '/api/v1/budgets?month=2026-06').send({
      categories: [{ categoryId: ROOT, budget: { limitType: 'PERCENT', percent: 12.5 } }],
    });
    expect(res.status).toBe(400);
    expect(res.body.fieldErrors.length).toBeGreaterThan(0);
  });

  it('returns 404 budget.target_not_found for a member outside the group (US2 scoping)', async () => {
    setupReads([]);
    const res = await authed('put', '/api/v1/budgets?month=2026-06').send({
      members: [
        {
          memberId: 'aaaaaaaa-1111-4abc-8def-999999999999',
          budget: { limitType: 'ABSOLUTE', amountCents: 1000 },
        },
      ],
    });
    expect(res.status).toBe(404);
    expect(res.body.code).toBe('budget.target_not_found');
  });
});

describe('POST /api/v1/budgets/copy (US4, non-destructive)', () => {
  it('copies only the targets missing in the destination month', async () => {
    // from (2026-05) has family + member Ana; to (2026-06) already has family.
    const may = new Date(Date.UTC(2026, 4, 1));
    const jun = new Date(Date.UTC(2026, 5, 1));
    const fromRows = [
      { ...row({ targetType: 'FAMILY', limitType: 'ABSOLUTE', amountCents: 500000 }), month: may },
      {
        ...row({
          targetType: 'MEMBER',
          targetMemberId: ANA,
          limitType: 'ABSOLUTE',
          amountCents: 100000,
        }),
        month: may,
      },
    ];
    const toRows = [
      { ...row({ targetType: 'FAMILY', limitType: 'ABSOLUTE', amountCents: 700000 }), month: jun },
    ];
    user.findMany.mockResolvedValue(MEMBERS);
    category.findMany.mockResolvedValue(CATEGORIES);
    tx.mockImplementation((cb: (c: unknown) => Promise<unknown>) =>
      cb(prisma as unknown as object),
    );
    budget.createMany.mockResolvedValue({ count: 1 });
    budget.findMany.mockImplementation(({ where }: { where: { month: Date } }) =>
      Promise.resolve(where.month.getTime() === may.getTime() ? fromRows : toRows),
    );

    const res = await authed('post', '/api/v1/budgets/copy').send({
      fromMonth: '2026-05',
      toMonth: '2026-06',
    });
    expect(res.status).toBe(200);
    expect(res.body.copiedCount).toBe(1);
    // only the member (missing in dest) is copied, not the family (already present)
    expect(budget.createMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.arrayContaining([
          expect.objectContaining({ targetType: 'MEMBER', targetMemberId: ANA }),
        ]),
      }),
    );
    const created = budget.createMany.mock.calls[0][0].data as { targetType: string }[];
    expect(created).toHaveLength(1);
  });
});
