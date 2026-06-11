export interface BillSummary {
  totalExpectedCents: number;
  totalPaidCents: number;
  totalPendingCents: number;
  projectedCents: number;
}

interface BillForSummary {
  status: 'PENDING' | 'PAID' | 'CANCELLED';
  expectedAmountCents: number;
  actualAmountCents: number | null;
}

/**
 * Pure function — no DB access.
 * totalExpectedCents = sum of expectedAmountCents of PENDING + PAID bills
 * totalPaidCents     = sum of actualAmountCents of PAID bills
 * totalPendingCents  = sum of expectedAmountCents of PENDING bills
 * CANCELLED bills are excluded from all totals.
 * projectedCents is passed separately (from projected recurring bills).
 */
export function computeBillSummary(bills: BillForSummary[], projectedCents: number): BillSummary {
  let totalExpectedCents = 0;
  let totalPaidCents = 0;
  let totalPendingCents = 0;

  for (const bill of bills) {
    if (bill.status === 'CANCELLED') continue;

    totalExpectedCents += bill.expectedAmountCents;

    if (bill.status === 'PAID') {
      totalPaidCents += bill.actualAmountCents ?? 0;
    } else if (bill.status === 'PENDING') {
      totalPendingCents += bill.expectedAmountCents;
    }
  }

  return { totalExpectedCents, totalPaidCents, totalPendingCents, projectedCents };
}
