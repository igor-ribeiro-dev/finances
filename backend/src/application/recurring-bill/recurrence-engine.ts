import type { RecurringBillWithRelations } from '../../domain/recurring-bill/recurring-bill.repository';

/**
 * Returns the last day of the given month.
 * monthIndex is 0-based (0 = January, 11 = December).
 */
export function clampDueDay(dueDay: number, year: number, monthIndex: number): number {
  const lastDayOfMonth = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
  return Math.min(dueDay, lastDayOfMonth);
}

/**
 * Determines whether a recurring bill template applies to the given month.
 */
export function isEligible(template: RecurringBillWithRelations, monthDate: Date): boolean {
  if (template.status !== 'ACTIVE') return false;
  if (template.deletedAt !== null) return false;
  if (monthDate < template.activeFromMonth) return false;

  if (template.interval === 'MONTHLY') {
    return true;
  }

  if (template.interval === 'ANNUAL') {
    return monthDate.getUTCMonth() === template.startMonth.getUTCMonth();
  }

  return false;
}
