import { AppError } from '../../api/errors';
import { expenseRepository } from '../../domain/expense/expense.repository';

export interface DeleteExpenseInput {
  groupId: string;
  id: string;
}

export async function deleteExpenseUseCase(input: DeleteExpenseInput): Promise<void> {
  const existing = await expenseRepository.findByIdInGroup(input.id, input.groupId);
  if (!existing) throw new AppError('not_found', 'Despesa não encontrada.');
  await expenseRepository.delete(input.id);
}
