import { recurringBillRepository } from '../../domain/recurring-bill/recurring-bill.repository';
import type { CreateManyBillRow } from '../../domain/bill/bill.repository';
import { billRepository } from '../../domain/bill/bill.repository';
import { isEligible, clampDueDay } from './recurrence-engine';

function getCurrentMonthDate(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

function addOneMonth(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1));
}

/**
 * Materializes recurring bill instances for the current month and the next month.
 * Uses skipDuplicates=true for idempotency (unique index on recurringBillId + month).
 *
 * @param groupId - If provided, only materialize for templates in this group.
 *                  If omitted, materialize for all active templates.
 */
export async function materializeWindowUseCase(groupId?: string): Promise<{ count: number }> {
  const templates = groupId
    ? await recurringBillRepository.listByGroup(groupId)
    : await recurringBillRepository.listAllActive();

  const currentMonth = getCurrentMonthDate();
  const nextMonth = addOneMonth(currentMonth);
  const months = [currentMonth, nextMonth];

  const rows: CreateManyBillRow[] = [];

  for (const template of templates) {
    for (const monthDate of months) {
      if (!isEligible(template, monthDate)) continue;

      const year = monthDate.getUTCFullYear();
      const monthIndex = monthDate.getUTCMonth(); // 0-based
      const clampedDay = clampDueDay(template.dueDay, year, monthIndex);
      const dueDate = new Date(Date.UTC(year, monthIndex, clampedDay));

      rows.push({
        groupId: template.groupId,
        description: template.description,
        expectedAmountCents: template.expectedAmountCents,
        dueDate,
        month: monthDate,
        status: 'PENDING',
        categoryId: template.categoryId,
        ownerMemberId: template.ownerMemberId,
        recurringBillId: template.id,
        // Inherit the subscription's card so the PENDING instance is pre-filled
        // (value already inherited via expectedAmountCents). Feature 012.
        creditCardId: template.creditCardId,
      });
    }
  }

  if (rows.length === 0) {
    return { count: 0 };
  }

  return billRepository.createMany(rows, true);
}
