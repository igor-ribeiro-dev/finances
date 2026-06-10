/**
 * SC-006 automated proxy: listing up to 50 categories must stay well under the
 * 1s end-to-end target. This measures the `list-categories` use case against a
 * real Postgres (the React render is covered manually in quickstart §3).
 *
 * Skipped automatically when DATABASE_URL is absent so it never breaks a dev
 * machine without Postgres running.
 */
import { randomUUID } from 'node:crypto';

const hasDb = Boolean(process.env['DATABASE_URL']);
const describePerf = hasDb ? describe : describe.skip;

// Imported lazily inside the guarded block so a missing client/db never throws
// at module load on machines that skip this suite.
import { prisma } from '../../src/infra/prisma';
import { listCategoriesUseCase } from '../../src/application/category/list-categories.use-case';

const AVG_BUDGET_MS = 200;
const P95_BUDGET_MS = 350;
const RUNS = 20;

describePerf('list-categories performance (SC-006)', () => {
  let groupId: string;

  beforeAll(async () => {
    groupId = randomUUID();
    await prisma.$transaction(async (tx) => {
      await tx.familyGroup.create({ data: { id: groupId, name: 'Perf Group' } });
      // 10 roots + 40 sub-categories (4 per root) = 50 total.
      for (let r = 0; r < 10; r++) {
        const rootId = randomUUID();
        await tx.category.create({
          data: { id: rootId, groupId, name: `Raiz ${String(r).padStart(2, '0')} Açaí` },
        });
        for (let s = 0; s < 4; s++) {
          await tx.category.create({
            data: {
              id: randomUUID(),
              groupId,
              parentId: rootId,
              name: `Sub ${r}-${s} Pão`,
            },
          });
        }
      }
    });
  });

  afterAll(async () => {
    await prisma.category.deleteMany({ where: { groupId } });
    await prisma.familyGroup.deleteMany({ where: { id: groupId } });
    await prisma.$disconnect();
  });

  it(`lists 50 categories within avg<${AVG_BUDGET_MS}ms / p95<${P95_BUDGET_MS}ms over ${RUNS} runs`, async () => {
    const samples: number[] = [];
    for (let i = 0; i < RUNS; i++) {
      const t0 = performance.now();
      const result = await listCategoriesUseCase({ groupId });
      samples.push(performance.now() - t0);
      expect(result).toHaveLength(50);
    }
    samples.sort((a, b) => a - b);
    const avg = samples.reduce((s, x) => s + x, 0) / samples.length;
    const p95 = samples[Math.min(samples.length - 1, Math.ceil(0.95 * samples.length) - 1)]!;
    // Logged for visibility in CI output.
    console.log(JSON.stringify({ event: 'perf.list_categories', avg, p95, runs: RUNS }));
    expect(avg).toBeLessThan(AVG_BUDGET_MS);
    expect(p95).toBeLessThan(P95_BUDGET_MS);
  });
});
