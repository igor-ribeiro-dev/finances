import { AppError } from '../../api/errors';
import { expenseRepository } from '../../domain/expense/expense.repository';
import { prisma } from '../../infra/prisma';

export interface DeleteExpenseInput {
  groupId: string;
  id: string;
}

export async function deleteExpenseUseCase(input: DeleteExpenseInput): Promise<void> {
  const existing = await expenseRepository.findByIdInGroup(input.id, input.groupId);
  if (!existing) throw new AppError('not_found', 'Despesa não encontrada.');

  // FR-007: despesa gerenciada pelo tracker de pagamentos é somente leitura
  const linkedBill = await prisma.bill.findFirst({
    where: { expenseId: input.id },
    select: { id: true },
  });
  if (linkedBill) {
    throw new AppError(
      'expense.managed_by_bill',
      'Esta despesa é gerenciada pelo controle de pagamentos e não pode ser excluída diretamente.',
      409,
    );
  }

  await expenseRepository.delete(input.id);
}
