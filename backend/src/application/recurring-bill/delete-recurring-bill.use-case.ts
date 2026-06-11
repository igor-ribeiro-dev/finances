import { AppError } from '../../api/errors';
import { prisma } from '../../infra/prisma';
import { recurringBillRepository } from '../../domain/recurring-bill/recurring-bill.repository';

function getCurrentMonthDate(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

export async function deleteRecurringBillUseCase(groupId: string, id: string): Promise<void> {
  const existing = await recurringBillRepository.findById(id, groupId);
  if (!existing) {
    throw new AppError('recurring_bill_not_found', 'Conta recorrente não encontrada.', 404);
  }

  if (existing.deletedAt !== null) {
    throw new AppError(
      'recurring_bill_already_deleted',
      'Esta conta recorrente já foi excluída.',
      409,
    );
  }

  const currentMonthDate = getCurrentMonthDate();

  await prisma.$transaction(async () => {
    await recurringBillRepository.softDelete(id);
    await recurringBillRepository.cancelFuturePendingInstances(id, currentMonthDate);
  });
}
