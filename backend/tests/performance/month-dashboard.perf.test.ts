/**
 * T032 — SC-002 automated proxy: the month dashboard for 500 expenses,
 * 10 members and 50 categories must resolve well under the 2s end-to-end
 * target (backend budget: avg < 200ms, p95 < 350ms). Runs against a real
 * Postgres and also re-checks data-model.md invariants 1–2 at scale.
 *
 * Skipped automatically when DATABASE_URL is absent so it never breaks a dev
 * machine without Postgres running.
 */
import { randomUUID } from 'node:crypto';

const hasDb = Boolean(process.env['DATABASE_URL']);
const describePerf = hasDb ? describe : describe.skip;

import { prisma } from '../../src/infra/prisma';
import { getMonthDashboardUseCase } from '../../src/application/dashboard/get-month-dashboard.use-case';

const AVG_BUDGET_MS = 200;
const P95_BUDGET_MS = 350;
const RUNS = 20;
const MONTH = '2026-06';

describePerf('month dashboard performance (SC-002)', () => {
  let groupId: string;
  const memberIds: string[] = [];
  const categoryIds: string[] = [];

  beforeAll(async () => {
    groupId = randomUUID();
    await prisma.$transaction(async (tx) => {
      await tx.familyGroup.create({ data: { id: groupId, name: 'Perf Dashboard Group' } });

      for (let m = 0; m < 10; m++) {
        const id = randomUUID();
        memberIds.push(id);
        await tx.user.create({
          data: {
            id,
            name: `Membro ${String(m).padStart(2, '0')}`,
            email: `perf-dash-${groupId}-${m}@example.com`,
            passwordHash: 'x',
            familyGroupId: groupId,
          },
        });
      }

      // 10 roots + 40 subs = 50 categories.
      for (let r = 0; r < 10; r++) {
        const rootId = randomUUID();
        categoryIds.push(rootId);
        await tx.category.create({
          data: { id: rootId, groupId, name: `Raiz ${String(r).padStart(2, '0')}` },
        });
        for (let s = 0; s < 4; s++) {
          const subId = randomUUID();
          categoryIds.push(subId);
          await tx.category.create({
            data: { id: subId, groupId, parentId: rootId, name: `Sub ${r}-${s}` },
          });
        }
      }

      // Family budget + a few member/category caps.
      await tx.budget.create({
        data: {
          groupId,
          month: new Date(Date.UTC(2026, 5, 1)),
          targetType: 'FAMILY',
          limitType: 'ABSOLUTE',
          amountCents: 1_000_000,
        },
      });

      // 500 expenses spread across members/categories (1 in 10 uncategorized).
      const day = (i: number) => String((i % 28) + 1).padStart(2, '0');
      const rows = Array.from({ length: 500 }, (_, i) => ({
        id: randomUUID(),
        groupId,
        amountCents: 1000 + i,
        date: new Date(`2026-06-${day(i)}`),
        description: `Despesa perf ${i}`,
        paymentMethod: (i % 2 === 0 ? 'CASH_OR_DEBIT' : 'CREDIT_CARD') as
          | 'CASH_OR_DEBIT'
          | 'CREDIT_CARD',
        ownerMemberId: memberIds[i % memberIds.length] as string,
        categoryId: i % 10 === 0 ? null : (categoryIds[i % categoryIds.length] as string),
        createdById: memberIds[0] as string,
        updatedById: memberIds[0] as string,
      }));
      await tx.expense.createMany({ data: rows });
    });
  });

  afterAll(async () => {
    await prisma.expense.deleteMany({ where: { groupId } });
    await prisma.budget.deleteMany({ where: { groupId } });
    await prisma.category.deleteMany({ where: { groupId, parentId: { not: null } } });
    await prisma.category.deleteMany({ where: { groupId } });
    await prisma.user.deleteMany({ where: { familyGroupId: groupId } });
    await prisma.familyGroup.delete({ where: { id: groupId } });
    await prisma.$disconnect();
  });

  it('answers a 500-expense month within budget and keeps the invariants', async () => {
    const durations: number[] = [];
    let last = await getMonthDashboardUseCase({ groupId, month: MONTH });

    for (let i = 0; i < RUNS; i++) {
      const t0 = performance.now();
      last = await getMonthDashboardUseCase({ groupId, month: MONTH });
      durations.push(performance.now() - t0);
    }

    // Invariant 1: Σ member rows = family total.
    const memberSum = last.members.reduce((acc, m) => acc + m.spentCents, 0);
    expect(memberSum).toBe(last.family.spentCents);

    // Invariant 2: Σ roots + uncategorized = family total.
    const rootsSum = last.categories
      .filter((c) => c.parentId === null)
      .reduce((acc, c) => acc + c.spentCents, 0);
    expect(rootsSum + last.uncategorizedSpentCents).toBe(last.family.spentCents);

    expect(last.members).toHaveLength(10);
    expect(last.categories).toHaveLength(50);

    durations.sort((a, b) => a - b);
    const avg = durations.reduce((a, b) => a + b, 0) / durations.length;
    const p95 = durations[Math.floor(durations.length * 0.95)] as number;
    // eslint-disable-next-line no-console
    console.log(JSON.stringify({ event: 'perf.dashboard', avgMs: avg, p95Ms: p95, runs: RUNS }));
    expect(avg).toBeLessThan(AVG_BUDGET_MS);
    expect(p95).toBeLessThan(P95_BUDGET_MS);
  });
});
