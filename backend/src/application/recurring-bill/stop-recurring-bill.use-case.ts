import { AppError } from '../../api/errors';
import { prisma } from '../../infra/prisma';
import { recurringBillRepository } from '../../domain/recurring-bill/recurring-bill.repository';

function getCurrentMonthDate(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

export async function stopRecurringBillUseCase(groupId: string, id: string) {
  const existing = await recurringBillRepository.findById(id, groupId);
  if (!existing) {
    throw new AppError('recurring_bill_not_found', 'Conta recorrente não encontrada.', 404);
  }

  if (existing.status === 'STOPPED' || existing.deletedAt !== null) {
    throw new AppError(
      'recurring_bill_already_stopped',
      'Esta conta recorrente já está parada ou excluída.',
      409,
    );
  }

  const currentMonthDate = getCurrentMonthDate();

  await prisma.$transaction(async () => {
    await recurringBillRepository.update(id, { status: 'STOPPED' });
    await recurringBillRepository.cancelFuturePendingInstances(id, currentMonthDate);
  });

  return recurringBillRepository.findById(id, groupId) as Promise<
    NonNullable<Awaited<ReturnType<typeof recurringBillRepository.findById>>>
  >;
}
