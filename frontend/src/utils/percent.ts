/**
 * Display percentages from integer cents (FR-018, research R5).
 *
 * The contract carries cents only; every percentage shown in the UI is derived
 * here. The single rounding point is the final Math.round over a ratio of safe
 * integers — no monetary value is ever derived from a float (Constitution III).
 */

/** Integer percentage of `numCents` over `denCents`; null when there is no valid base. */
export function percentOf(numCents: number, denCents: number | null | undefined): number | null {
  if (denCents == null || denCents <= 0) return null;
  return Math.round((numCents * 100) / denCents);
}
