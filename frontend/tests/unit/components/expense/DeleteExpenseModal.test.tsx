import '@testing-library/jest-dom';
import { render, screen, fireEvent } from '@testing-library/react';
import { DeleteExpenseModal } from '../../../../src/components/expense/DeleteExpenseModal';
import type { Expense } from '../../../../src/types/expense';

const expense: Expense = {
  id: 'exp-1',
  groupId: 'g-1',
  amountCents: 100,
  date: '2026-05-20',
  description: 'Mercado',
  paymentMethod: 'CASH_OR_DEBIT',
  ownerMemberId: 'm-1',
  ownerMember: { id: 'm-1', name: 'Ana', isExMember: false },
  createdById: 'u-1',
  updatedById: 'u-1',
  createdAt: '2026-05-20T10:00:00Z',
  updatedAt: '2026-05-20T10:00:00Z',
};

function setup(overrides: Partial<React.ComponentProps<typeof DeleteExpenseModal>> = {}) {
  const props = {
    open: true,
    expense,
    isDeleting: false,
    onCancel: jest.fn(),
    onConfirm: jest.fn(),
    ...overrides,
  };
  render(<DeleteExpenseModal {...props} />);
  return props;
}

describe('DeleteExpenseModal', () => {
  it('does not render when open=false', () => {
    setup({ open: false });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('renders title and destructive copy', () => {
    setup();
    expect(screen.getByText('Excluir esta despesa?')).toBeInTheDocument();
    expect(screen.getByText('Esta ação não pode ser desfeita.')).toBeInTheDocument();
  });

  it('focuses the Cancelar button by default', () => {
    setup();
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Cancelar' }));
  });

  it('calls onCancel on Escape', () => {
    const { onCancel } = setup();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onCancel).toHaveBeenCalled();
  });

  it('calls onConfirm with the expense id when "Excluir" is clicked', () => {
    const { onConfirm } = setup();
    fireEvent.click(screen.getByRole('button', { name: 'Excluir' }));
    expect(onConfirm).toHaveBeenCalledWith('exp-1');
  });

  it('disables buttons and shows "Excluindo…" while isDeleting', () => {
    setup({ isDeleting: true });
    expect(screen.getByRole('button', { name: 'Cancelar' })).toBeDisabled();
    const confirm = screen.getByRole('button', { name: 'Excluindo…' });
    expect(confirm).toBeDisabled();
  });

  it('does not respond to Escape while deleting', () => {
    const { onCancel } = setup({ isDeleting: true });
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onCancel).not.toHaveBeenCalled();
  });
});
