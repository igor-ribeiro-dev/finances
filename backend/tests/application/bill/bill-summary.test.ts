import { computeBillSummary } from '../../../src/application/bill/bill-summary';
import { createBillInDb, createPaidBill, createCancelledBill } from '../../helpers/bill-factories';

describe('computeBillSummary', () => {
  it('returns all zeros for empty bills', () => {
    const result = computeBillSummary([], 0);
    expect(result.totalExpectedCents).toBe(0);
    expect(result.totalPaidCents).toBe(0);
    expect(result.totalPendingCents).toBe(0);
    expect(result.projectedCents).toBe(0);
  });

  it('includes PENDING in totalExpected and totalPending', () => {
    const pending = createBillInDb({ expectedAmountCents: 50000 });
    const result = computeBillSummary([pending], 0);
    expect(result.totalExpectedCents).toBe(50000);
    expect(result.totalPendingCents).toBe(50000);
    expect(result.totalPaidCents).toBe(0);
  });

  it('includes PAID expectedAmountCents in totalExpected and actualAmountCents in totalPaid', () => {
    const paid = createPaidBill({ expectedAmountCents: 100000, actualAmountCents: 98000 });
    const result = computeBillSummary([paid], 0);
    expect(result.totalExpectedCents).toBe(100000);
    expect(result.totalPaidCents).toBe(98000);
    expect(result.totalPendingCents).toBe(0);
  });

  it('excludes CANCELLED from all totals', () => {
    const cancelled = createCancelledBill({ expectedAmountCents: 30000 });
    const result = computeBillSummary([cancelled], 0);
    expect(result.totalExpectedCents).toBe(0);
    expect(result.totalPaidCents).toBe(0);
    expect(result.totalPendingCents).toBe(0);
  });

  it('sums mixed PENDING + PAID + CANCELLED correctly', () => {
    const pending = createBillInDb({ expectedAmountCents: 50000 });
    const paid = createPaidBill({ expectedAmountCents: 100000, actualAmountCents: 98000 });
    const cancelled = createCancelledBill({ expectedAmountCents: 30000 });
    const result = computeBillSummary([pending, paid, cancelled], 0);
    expect(result.totalExpectedCents).toBe(150000); // 50000 + 100000
    expect(result.totalPaidCents).toBe(98000);
    expect(result.totalPendingCents).toBe(50000);
    expect(result.projectedCents).toBe(0);
  });

  it('tracks projectedCents separately from other totals', () => {
    const pending = createBillInDb({ expectedAmountCents: 50000 });
    const result = computeBillSummary([pending], 75000);
    expect(result.totalExpectedCents).toBe(50000);
    expect(result.projectedCents).toBe(75000);
  });

  it('uses integer cents (no floating point)', () => {
    const pending = createBillInDb({ expectedAmountCents: 33333 });
    const result = computeBillSummary([pending], 0);
    expect(Number.isInteger(result.totalExpectedCents)).toBe(true);
    expect(Number.isInteger(result.totalPendingCents)).toBe(true);
  });

  it('handles multiple PAID bills summing actualAmountCents', () => {
    const paid1 = createPaidBill({ id: 'b1', expectedAmountCents: 10000, actualAmountCents: 9500 });
    const paid2 = createPaidBill({
      id: 'b2',
      expectedAmountCents: 20000,
      actualAmountCents: 21000,
    });
    const result = computeBillSummary([paid1, paid2], 0);
    expect(result.totalExpectedCents).toBe(30000);
    expect(result.totalPaidCents).toBe(30500);
  });
});
