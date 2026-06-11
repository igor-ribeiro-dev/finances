import { AppError } from '../../api/errors';
import { recurringBillRepository } from '../../domain/recurring-bill/recurring-bill.repository';

function getCurrentMonthDate(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

function addOneMonth(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1));
}

export async function pauseRecurringBillUseCase(groupId: string, id: string) {
  const existing = await recurringBillRepository.findById(id, groupId);
  if (!existing) {
    throw new AppError('recurring_bill_not_found', 'Conta recorrente não encontrada.', 404);
  }

  if (existing.status !== 'ACTIVE') {
    throw new AppError(
      'recurring_bill_not_active',
      'Apenas contas recorrentes ativas podem ser pausadas.',
      409,
    );
  }

  return recurringBillRepository.update(id, { status: 'PAUSED' });
}

export async function resumeRecurringBillUseCase(groupId: string, id: string) {
  const existing = await recurringBillRepository.findById(id, groupId);
  if (!existing) {
    throw new AppError('recurring_bill_not_found', 'Conta recorrente não encontrada.', 404);
  }

  if (existing.status !== 'PAUSED') {
    throw new AppError(
      'recurring_bill_not_paused',
      'Apenas contas recorrentes pausadas podem ser retomadas.',
      409,
    );
  }

  const currentMonth = getCurrentMonthDate();
  const nextMonthDate = addOneMonth(currentMonth);

  return recurringBillRepository.update(id, {
    status: 'ACTIVE',
    activeFromMonth: nextMonthDate,
  });
}
