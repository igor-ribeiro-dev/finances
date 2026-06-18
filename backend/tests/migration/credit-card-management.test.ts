// T005 — 012 credit-card-management structural migration test.
// Requires a real database connection (run with TEST_INTEGRATION=true).
// Verifies the schema shape and that no data was converted (historical
// CREDIT_CARD bills stay grandfathered: creditCardId NULL, isFatura false).

import { prisma } from '../../src/infra/prisma';

const runMigrationTest = process.env['TEST_INTEGRATION'] === 'true';

(runMigrationTest ? describe : describe.skip)('012 credit-card-management migration', () => {
  it('creates the CreditCard table with the expected columns', async () => {
    const cols = await prisma.$queryRaw<{ column_name: string }[]>`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'CreditCard'
    `;
    const names = cols.map((c) => c.column_name);
    expect(names).toEqual(
      expect.arrayContaining(['id', 'groupId', 'name', 'closingDay', 'status', 'normalizedName']),
    );
  });

  it('adds creditCardId / isFatura / settledByFaturaId to Bill', async () => {
    const cols = await prisma.$queryRaw<{ column_name: string }[]>`
      SELECT column_name FROM information_schema.columns WHERE table_name = 'Bill'
    `;
    const names = cols.map((c) => c.column_name);
    expect(names).toEqual(
      expect.arrayContaining(['creditCardId', 'isFatura', 'settledByFaturaId']),
    );
  });

  it('enforces one pending fatura per card via a partial unique index', async () => {
    const idx = await prisma.$queryRaw<{ indexname: string }[]>`
      SELECT indexname FROM pg_indexes
      WHERE tablename = 'Bill' AND indexname = 'bill_one_pending_fatura_per_card'
    `;
    expect(idx.length).toBe(1);
  });

  it('enforces active-card name uniqueness via a partial unique index', async () => {
    const idx = await prisma.$queryRaw<{ indexname: string }[]>`
      SELECT indexname FROM pg_indexes
      WHERE tablename = 'CreditCard' AND indexname = 'credit_card_active_name_unique'
    `;
    expect(idx.length).toBe(1);
  });

  it('does not convert data — every existing bill keeps creditCardId NULL and isFatura false', async () => {
    const linked = await prisma.bill.count({ where: { creditCardId: { not: null } } });
    const faturas = await prisma.bill.count({ where: { isFatura: true } });
    expect(linked).toBe(0);
    expect(faturas).toBe(0);
  });
});
