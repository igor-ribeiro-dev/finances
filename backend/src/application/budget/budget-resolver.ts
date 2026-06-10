/**
 * Pure budget resolution (no I/O). Resolves percentage limits to effective cents
 * and computes the advisory allocation warnings. Used by the serializer/use-cases.
 *
 *   - FAMILY                : always ABSOLUTE → amountCents.
 *   - MEMBER / root  PERCENT: over the family budget (FR-021).
 *   - sub-category   PERCENT: over the parent root's RESOLVED value (FR-021).
 *   - base missing          : resolvedCents = null ("não resolvível", FR-022).
 *
 * Rounding is half-up over integer cents: round(percent * base / 100) (FR-021).
 */

export type LimitType = 'ABSOLUTE' | 'PERCENT';

/** The raw stored shape of a single budget limit (target-agnostic). */
export interface RawLimit {
  limitType: LimitType;
  amountCents: number | null;
  percent: number | null;
}

/** Output limit with the server-resolved effective value. */
export interface ResolvedLimit {
  limitType: LimitType;
  amountCents: number | null;
  percent: number | null;
  /** Effective cents (half-up); null when the base is missing (not resolvable). */
  resolvedCents: number | null;
}

/** Half-up rounding of `percent`% of `baseCents` in integer-cent arithmetic (FR-021). */
export function resolvePercent(percent: number, baseCents: number): number {
  return Math.round((percent * baseCents) / 100);
}

/**
 * Resolve a single limit against a base.
 * - ABSOLUTE → its own amountCents.
 * - PERCENT  → resolvePercent(percent, base) when base != null, else null.
 */
export function resolveLimit(raw: RawLimit, baseCents: number | null): ResolvedLimit {
  let resolvedCents: number | null;
  if (raw.limitType === 'ABSOLUTE') {
    resolvedCents = raw.amountCents;
  } else {
    resolvedCents =
      baseCents === null || raw.percent === null ? null : resolvePercent(raw.percent, baseCents);
  }
  return {
    limitType: raw.limitType,
    amountCents: raw.amountCents,
    percent: raw.percent,
    resolvedCents,
  };
}

export interface Warning {
  code: 'category.allocation_exceeds_family' | 'subcategory.exceeds_root';
  categoryId?: string;
}

export interface AllocationSummary {
  familyAmountCents: number | null;
  totalAllocatedCents: number;
  unallocatedCents: number;
  allocatedPercent: number | null;
  unallocatedPercent: number | null;
}

/** A resolved root with its resolved sub-categories, used for summary/warnings. */
export interface ResolvedRoot {
  raw: RawLimit | null;
  resolved: ResolvedLimit | null;
  subs: ResolvedLimit[];
  /** Sub-categories that are PERCENT (to detect over-100% within a root, optional). */
}

/**
 * Compute the allocation summary over the resolved ROOT categories.
 * Sub-categories are NOT summed here — they live inside their root.
 * Unresolvable roots contribute 0 to the allocated total.
 */
export function computeSummary(
  familyAmountCents: number | null,
  roots: ResolvedLimit[],
): AllocationSummary {
  const totalAllocatedCents = roots.reduce((acc, r) => acc + (r.resolvedCents ?? 0), 0);
  const familyKnown = familyAmountCents !== null && familyAmountCents > 0;
  const unallocatedCents = (familyAmountCents ?? 0) - totalAllocatedCents;
  return {
    familyAmountCents,
    totalAllocatedCents,
    unallocatedCents,
    allocatedPercent: familyKnown
      ? Math.round((totalAllocatedCents / (familyAmountCents as number)) * 100)
      : null,
    unallocatedPercent: familyKnown
      ? Math.round((unallocatedCents / (familyAmountCents as number)) * 100)
      : null,
  };
}

/**
 * Advisory warnings (FR-009), never blocking:
 *  - category.allocation_exceeds_family: sum of root resolved > family, OR
 *    sum of root PERCENTs > 100.
 *  - subcategory.exceeds_root: per root, sum of sub resolved > root resolved.
 * Members never produce warnings (FR-007 independence).
 */
export function computeWarnings(
  familyAmountCents: number | null,
  roots: {
    categoryId: string;
    raw: RawLimit | null;
    resolved: ResolvedLimit | null;
    subs: ResolvedLimit[];
  }[],
): Warning[] {
  const warnings: Warning[] = [];

  const rootResolvedTotal = roots.reduce((acc, r) => acc + (r.resolved?.resolvedCents ?? 0), 0);
  const rootPercentTotal = roots.reduce(
    (acc, r) => acc + (r.raw?.limitType === 'PERCENT' ? (r.raw.percent ?? 0) : 0),
    0,
  );
  const exceedsByValue =
    familyAmountCents !== null && familyAmountCents > 0 && rootResolvedTotal > familyAmountCents;
  const exceedsByPercent = rootPercentTotal > 100;
  if (exceedsByValue || exceedsByPercent) {
    warnings.push({ code: 'category.allocation_exceeds_family' });
  }

  for (const root of roots) {
    const rootCents = root.resolved?.resolvedCents;
    if (rootCents === undefined || rootCents === null) continue;
    const subTotal = root.subs.reduce((acc, s) => acc + (s.resolvedCents ?? 0), 0);
    if (subTotal > rootCents) {
      warnings.push({ code: 'subcategory.exceeds_root', categoryId: root.categoryId });
    }
  }

  return warnings;
}
