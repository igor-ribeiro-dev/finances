import { AppError } from '../../api/errors';
import { expenseRepository, type ExpenseWithOwner } from '../../domain/expense/expense.repository';

export interface GetExpenseInput {
  groupId: string;
  id: string;
}

export async function getExpenseUseCase(input: GetExpenseInput): Promise<ExpenseWithOwner> {
  const found = await expenseRepository.findByIdInGroup(input.id, input.groupId);
  if (!found) throw new AppError('not_found', 'Despesa não encontrada.');
  return found;
}
