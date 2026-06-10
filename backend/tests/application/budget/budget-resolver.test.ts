import {
  resolvePercent,
  resolveLimit,
  computeSummary,
  computeWarnings,
  type RawLimit,
  type ResolvedLimit,
} from '../../../src/application/budget/budget-resolver';

const abs = (amountCents: number): RawLimit => ({
  limitType: 'ABSOLUTE',
  amountCents,
  percent: null,
});
const pct = (percent: number): RawLimit => ({ limitType: 'PERCENT', amountCents: null, percent });

describe('resolvePercent (half-up, FR-021)', () => {
  it('rounds half-up to the nearest cent', () => {
    // 10% of R$ 1.234,55 = 12345.5 cents → 12346 (half-up)
    expect(resolvePercent(10, 123455)).toBe(12346);
  });
  it('resolves exact values', () => {
    expect(resolvePercent(30, 500000)).toBe(150000); // 30% of R$5.000 = R$1.500
    expect(resolvePercent(40, 500000)).toBe(200000);
  });
});

describe('resolveLimit', () => {
  it('ABSOLUTE returns its own amount regardless of base', () => {
    expect(resolveLimit(abs(180000), 500000).resolvedCents).toBe(180000);
    expect(resolveLimit(abs(180000), null).resolvedCents).toBe(180000);
  });
  it('PERCENT resolves over the base (FR-021)', () => {
    expect(resolveLimit(pct(30), 500000).resolvedCents).toBe(150000);
  });
  it('PERCENT with a missing base is not resolvable (FR-022)', () => {
    expect(resolveLimit(pct(30), null).resolvedCents).toBeNull();
  });
});

describe('computeSummary', () => {
  it('sums root resolved cents and computes the balance', () => {
    const roots: ResolvedLimit[] = [
      { limitType: 'PERCENT', amountCents: null, percent: 40, resolvedCents: 200000 },
      { limitType: 'ABSOLUTE', amountCents: 100000, percent: null, resolvedCents: 100000 },
    ];
    const s = computeSummary(500000, roots);
    expect(s.totalAllocatedCents).toBe(300000);
    expect(s.unallocatedCents).toBe(200000);
    expect(s.allocatedPercent).toBe(60);
  });
  it('null family base yields null percentages', () => {
    const s = computeSummary(null, []);
    expect(s.familyAmountCents).toBeNull();
    expect(s.allocatedPercent).toBeNull();
  });
});

describe('computeWarnings (FR-009, advisory)', () => {
  const root = (
    categoryId: string,
    raw: RawLimit | null,
    resolvedCents: number | null,
    subs: ResolvedLimit[] = [],
  ) => ({
    categoryId,
    raw,
    resolved: raw ? { ...raw, resolvedCents } : null,
    subs,
  });

  it('warns when root percentages exceed 100%', () => {
    const warnings = computeWarnings(500000, [
      root('a', pct(70), 350000),
      root('b', pct(40), 200000),
    ]);
    expect(warnings.map((w) => w.code)).toContain('category.allocation_exceeds_family');
  });

  it('warns when allocations in value exceed the family budget', () => {
    const warnings = computeWarnings(500000, [
      root('a', abs(400000), 400000),
      root('b', abs(300000), 300000),
    ]);
    expect(warnings.map((w) => w.code)).toContain('category.allocation_exceeds_family');
  });

  it('does NOT warn when allocations exactly equal the family budget / 100%', () => {
    const warnings = computeWarnings(500000, [
      root('a', pct(60), 300000),
      root('b', pct(40), 200000),
    ]);
    expect(warnings).toHaveLength(0);
  });

  it('warns per root when sub-categories exceed the root', () => {
    const subs: ResolvedLimit[] = [
      { limitType: 'ABSOLUTE', amountCents: 150000, percent: null, resolvedCents: 150000 },
      { limitType: 'ABSOLUTE', amountCents: 120000, percent: null, resolvedCents: 120000 },
    ];
    const warnings = computeWarnings(null, [root('food', abs(200000), 200000, subs)]);
    expect(warnings).toEqual([{ code: 'subcategory.exceeds_root', categoryId: 'food' }]);
  });
});

describe('re-resolution when the family base changes (FR-024)', () => {
  it('a percentage member/root resolves to different cents under a new base', () => {
    expect(resolveLimit(pct(30), 500000).resolvedCents).toBe(150000);
    expect(resolveLimit(pct(30), 600000).resolvedCents).toBe(180000);
  });
});
