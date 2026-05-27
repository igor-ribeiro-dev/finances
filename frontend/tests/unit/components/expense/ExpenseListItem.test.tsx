import '@testing-library/jest-dom';
import { render, screen, fireEvent } from '@testing-library/react';
import { ExpenseListItem } from '../../../../src/components/expense/ExpenseListItem';
import type { Expense } from '../../../../src/types/expense';

function mk(overrides: Partial<Expense> = {}): Expense {
  return {
    id: 'exp-1',
    groupId: 'g-1',
    amountCents: 12345,
    date: '2026-05-25',
    description: 'Mercado',
    paymentMethod: 'CASH_OR_DEBIT',
    ownerMemberId: 'm-1',
    ownerMember: { id: 'm-1', name: 'Ana', isExMember: false },
    createdById: 'u-1',
    updatedById: 'u-1',
    createdAt: '2026-05-25T10:00:00Z',
    updatedAt: '2026-05-25T10:00:00Z',
    ...overrides,
  };
}

describe('ExpenseListItem', () => {
  it('formats the date in pt-BR (DD/MM/YYYY)', () => {
    render(<ExpenseListItem expense={mk()} />);
    expect(screen.getByText('25/05/2026')).toBeInTheDocument();
  });

  it('formats the amount as BRL currency', () => {
    render(<ExpenseListItem expense={mk({ amountCents: 12345 })} />);
    expect(screen.getByText(/R\$\s*123,45/)).toBeInTheDocument();
  });

  it('shows the owner name and payment method label', () => {
    render(<ExpenseListItem expense={mk()} />);
    expect(screen.getByText('Ana')).toBeInTheDocument();
    expect(screen.getByText('Dinheiro/Débito')).toBeInTheDocument();
  });

  it('renders credit-card label when applicable', () => {
    render(<ExpenseListItem expense={mk({ paymentMethod: 'CREDIT_CARD' })} />);
    expect(screen.getByText('Cartão de Crédito')).toBeInTheDocument();
  });

  it('shows "ex-membro" badge when ownerMember.isExMember is true', () => {
    render(
      <ExpenseListItem
        expense={mk({
          ownerMember: { id: 'm-x', name: 'Carlos', isExMember: true },
        })}
      />,
    );
    expect(screen.getByText('ex-membro')).toBeInTheDocument();
  });

  it('does not render the badge when isExMember is false', () => {
    render(<ExpenseListItem expense={mk()} />);
    expect(screen.queryByText('ex-membro')).not.toBeInTheDocument();
  });

  it('renders edit and delete buttons when handlers are provided and calls them', () => {
    const onEdit = jest.fn();
    const onDelete = jest.fn();
    render(<ExpenseListItem expense={mk()} onEdit={onEdit} onDelete={onDelete} />);

    fireEvent.click(screen.getByRole('button', { name: /Editar despesa/ }));
    expect(onEdit).toHaveBeenCalledWith(expect.objectContaining({ id: 'exp-1' }));

    fireEvent.click(screen.getByRole('button', { name: /Excluir despesa/ }));
    expect(onDelete).toHaveBeenCalledWith(expect.objectContaining({ id: 'exp-1' }));
  });

  it('triggers onEdit when the row (outside buttons) is clicked', () => {
    const onEdit = jest.fn();
    render(<ExpenseListItem expense={mk()} onEdit={onEdit} />);
    fireEvent.click(screen.getByText('Mercado'));
    expect(onEdit).toHaveBeenCalled();
  });
});
