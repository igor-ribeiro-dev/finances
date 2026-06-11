// T011 — display percentages from integer cents (FR-018, research R5).
import { percentOf } from '../../../src/utils/percent';

describe('percentOf', () => {
  it('computes the integer percentage of spent over limit', () => {
    expect(percentOf(325000, 500000)).toBe(65);
  });

  it('allows values above 100% (overspend, FR-004)', () => {
    expect(percentOf(580000, 500000)).toBe(116);
  });

  it('rounds to the nearest integer (half-up)', () => {
    expect(percentOf(1, 3)).toBe(33);
    expect(percentOf(125, 1000)).toBe(13); // 12.5 → 13
  });

  it('returns null for missing or non-positive denominators (never ∞/NaN)', () => {
    expect(percentOf(100, 0)).toBeNull();
    expect(percentOf(100, null)).toBeNull();
    expect(percentOf(100, undefined)).toBeNull();
  });

  it('returns 0 for zero spending against a valid limit', () => {
    expect(percentOf(0, 500000)).toBe(0);
  });
});
