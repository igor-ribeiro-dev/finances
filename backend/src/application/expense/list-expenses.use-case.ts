import { AppError } from '../../api/errors';
import { expenseRepository, type ExpenseWithOwner } from '../../domain/expense/expense.repository';
import { decodeCursor, encodeCursor } from './cursor';

export interface ListExpensesInput {
  groupId: string;
  limit: number;
  cursor?: string;
}

export interface ListExpensesResult {
  items: ExpenseWithOwner[];
  nextCursor: string | null;
}

function toIsoDate(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export async function listExpensesUseCase(input: ListExpensesInput): Promise<ListExpensesResult> {
  const { groupId, limit, cursor } = input;

  let decoded: { date: string; id: string } | undefined;
  if (cursor) {
    const parsed = decodeCursor(cursor);
    if (!parsed) {
      throw new AppError('invalid_cursor', 'Cursor inválido.');
    }
    decoded = parsed;
  }

  const fetched = await expenseRepository.listByGroupWithCursor(groupId, limit + 1, decoded);

  let nextCursor: string | null = null;
  let items = fetched;
  if (fetched.length > limit) {
    items = fetched.slice(0, limit);
    const last = items[items.length - 1]!;
    nextCursor = encodeCursor({ date: toIsoDate(last.date), id: last.id });
  }

  return { items, nextCursor };
}
