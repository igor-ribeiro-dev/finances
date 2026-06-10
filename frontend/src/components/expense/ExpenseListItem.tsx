import { Pencil, Trash2 } from 'lucide-react';
import type { Expense } from '../../types/expense';
import { CategoryBadge } from './CategoryBadge';

interface ExpenseListItemProps {
  expense: Expense;
  onEdit?: (expense: Expense) => void;
  onDelete?: (expense: Expense) => void;
}

const DATE_FORMATTER = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});
const MONEY_FORMATTER = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

const METHOD_LABEL: Record<Expense['paymentMethod'], string> = {
  CASH_OR_DEBIT: 'Dinheiro/Débito',
  CREDIT_CARD: 'Cartão de Crédito',
};

function formatDate(iso: string): string {
  // Avoid timezone shift: parse YYYY-MM-DD as local date.
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return iso;
  return DATE_FORMATTER.format(new Date(y, m - 1, d));
}

export function ExpenseListItem({ expense, onEdit, onDelete }: ExpenseListItemProps) {
  const { isExMember } = expense.ownerMember;

  function handleRowClick(e: React.MouseEvent<HTMLDivElement>) {
    // Ignore clicks that came from action buttons
    if ((e.target as HTMLElement).closest('button')) return;
    onEdit?.(expense);
  }

  return (
    <div
      role={onEdit ? 'button' : undefined}
      tabIndex={onEdit ? 0 : undefined}
      onClick={onEdit ? handleRowClick : undefined}
      onKeyDown={
        onEdit
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onEdit(expense);
              }
            }
          : undefined
      }
      className="flex items-center justify-between gap-4 border-b border-gray-100 px-4 py-3 last:border-b-0 hover:bg-gray-50 focus:bg-gray-50 focus:outline-none"
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2 mb-1">
          <span className="text-xs font-medium text-gray-500">{formatDate(expense.date)}</span>
          <span className="text-xs text-gray-400">·</span>
          <span className="text-xs text-gray-500">{METHOD_LABEL[expense.paymentMethod]}</span>
        </div>
        <p className="truncate text-sm font-medium text-gray-900">{expense.description}</p>
        <CategoryBadge category={expense.category} subCategory={expense.subCategory} />
        <p className="mt-1 text-xs text-gray-600">
          <span>{expense.ownerMember.name}</span>
          {isExMember && (
            <span
              className="ml-2 inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium italic text-gray-600"
              title="Este membro não pertence mais ao grupo"
            >
              ex-membro
            </span>
          )}
        </p>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-right text-base font-semibold text-gray-900 tabular-nums">
          {MONEY_FORMATTER.format(expense.amountCents / 100)}
        </span>
        {(onEdit || onDelete) && (
          <div className="flex items-center gap-1">
            {onEdit && (
              <button
                type="button"
                onClick={() => onEdit(expense)}
                aria-label={`Editar despesa ${expense.description}`}
                className="rounded-md p-1.5 text-gray-500 hover:bg-gray-200 hover:text-gray-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                <Pencil className="h-4 w-4" />
              </button>
            )}
            {onDelete && (
              <button
                type="button"
                onClick={() => onDelete(expense)}
                aria-label={`Excluir despesa ${expense.description}`}
                className="rounded-md p-1.5 text-gray-500 hover:bg-red-50 hover:text-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
