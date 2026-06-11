import type { RecurringBillWithRelations } from '../../domain/recurring-bill/recurring-bill.repository';
import { isEligible, clampDueDay } from './recurrence-engine';

export interface ProjectedBillEntry {
  recurringBillId: string;
  description: string;
  expectedAmountCents: number;
  dueDate: string; // YYYY-MM-DD
  categoryId: string | null;
  ownerMemberId: string | null;
}

function toIsoDate(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Projects recurring bill templates into virtual bill entries for a given month.
 * Returns only templates that are eligible for the month and don't already have
 * a persisted bill instance (tracked via persistedRecurringIds).
 */
export function projectBills(
  templates: RecurringBillWithRelations[],
  persistedRecurringIds: Set<string>,
  monthDate: Date,
): ProjectedBillEntry[] {
  const year = monthDate.getUTCFullYear();
  const monthIndex = monthDate.getUTCMonth(); // 0-based

  return templates
    .filter((t) => !persistedRecurringIds.has(t.id) && isEligible(t, monthDate))
    .map((t) => {
      const clampedDay = clampDueDay(t.dueDay, year, monthIndex);
      const dueDate = new Date(Date.UTC(year, monthIndex, clampedDay));
      return {
        recurringBillId: t.id,
        description: t.description,
        expectedAmountCents: t.expectedAmountCents,
        dueDate: toIsoDate(dueDate),
        categoryId: t.categoryId,
        ownerMemberId: t.ownerMemberId,
      };
    });
}
