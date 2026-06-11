import { billRepository } from '../../domain/bill/bill.repository';
import { prisma } from '../../infra/prisma';

function monthDateRange(month: string): { gte: Date; lt: Date } {
  const [y, m] = month.split('-').map(Number);
  return {
    gte: new Date(Date.UTC(y as number, (m as number) - 1, 1)),
    lt: new Date(Date.UTC(y as number, m as number, 1)),
  };
}

function lastDayOfMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export async function copyPreviousMonthUseCase(input: {
  groupId: string;
  fromMonth: string;
  toMonth: string;
  dryRun: boolean;
}): Promise<{ count: number }> {
  const { gte } = monthDateRange(input.fromMonth);

  // Only avulsas (recurringBillId IS NULL) that are not CANCELLED
  const sourceBills = await billRepository.listByMonth(input.groupId, gte);
  const eligible = sourceBills.filter(
    (b) => b.recurringBillId === null && b.status !== 'CANCELLED',
  );

  if (input.dryRun) return { count: eligible.length };

  if (eligible.length === 0) return { count: 0 };

  const [toY, toM] = input.toMonth.split('-').map(Number);
  const targetMonth = new Date(Date.UTC(toY as number, (toM as number) - 1, 1));
  const lastDay = lastDayOfMonth(toY as number, toM as number);

  const rows = eligible.map((b) => {
    const originalDay = b.dueDate.getUTCDate();
    const clampedDay = Math.min(originalDay, lastDay);
    const dueDate = new Date(Date.UTC(toY as number, (toM as number) - 1, clampedDay));
    return {
      groupId: input.groupId,
      description: b.description,
      expectedAmountCents: b.expectedAmountCents,
      dueDate,
      month: targetMonth,
      status: 'PENDING' as const,
      categoryId: b.categoryId,
      ownerMemberId: b.ownerMemberId,
      recurringBillId: null,
    };
  });

  await prisma.bill.createMany({ data: rows });
  return { count: rows.length };
}
