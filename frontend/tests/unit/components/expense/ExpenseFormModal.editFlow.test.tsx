import '@testing-library/jest-dom';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ExpenseFormModal } from '../../../../src/components/expense/ExpenseFormModal';
import type { Expense } from '../../../../src/types/expense';

const members = [
  { id: 'm-1', name: 'Ana' },
  { id: 'm-2', name: 'Bruno' },
];

const initial: Expense = {
  id: 'exp-1',
  groupId: 'g-1',
  amountCents: 12345,
  date: '2026-05-20',
  description: 'Mercado',
  paymentMethod: 'CASH_OR_DEBIT',
  ownerMemberId: 'm-2',
  ownerMember: { id: 'm-2', name: 'Bruno', isExMember: false },
  createdById: 'u-1',
  updatedById: 'u-1',
  createdAt: '2026-05-20T10:00:00Z',
  updatedAt: '2026-05-20T10:00:00Z',
};

describe('ExpenseFormModal (edit mode)', () => {
  it('renders dialog titled "Editar despesa"', () => {
    render(
      <ExpenseFormModal
        open
        mode="edit"
        members={members}
        initial={initial}
        isSaving={false}
        onClose={() => undefined}
        onSubmit={() => undefined}
      />,
    );
    expect(screen.getByRole('dialog', { name: 'Editar despesa' })).toBeInTheDocument();
  });

  it('pre-fills all inputs from initial', () => {
    render(
      <ExpenseFormModal
        open
        mode="edit"
        members={members}
        initial={initial}
        isSaving={false}
        onClose={() => undefined}
        onSubmit={() => undefined}
      />,
    );
    expect((screen.getByLabelText('Valor') as HTMLInputElement).value).toMatch(/R\$\s*123,45/);
    expect(screen.getByLabelText('Data')).toHaveValue('2026-05-20');
    expect(screen.getByLabelText('Descrição')).toHaveValue('Mercado');
    expect(screen.getByLabelText('Responsável')).toHaveValue('m-2');
    expect(screen.getByRole('radio', { name: 'Dinheiro/Débito' })).toHaveAttribute(
      'aria-checked',
      'true',
    );
  });

  it('submits with updated body when fields change', async () => {
    const onSubmit = jest.fn();
    render(
      <ExpenseFormModal
        open
        mode="edit"
        members={members}
        initial={initial}
        isSaving={false}
        onClose={() => undefined}
        onSubmit={onSubmit}
      />,
    );

    // Change description
    fireEvent.change(screen.getByLabelText('Descrição'), { target: { value: 'Atualizado' } });
    // Change payment method
    fireEvent.click(screen.getByRole('radio', { name: 'Cartão de Crédito' }));
    // Change owner
    fireEvent.change(screen.getByLabelText('Responsável'), { target: { value: 'm-1' } });

    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0]![0]).toEqual({
      amountCents: 12345,
      date: '2026-05-20',
      description: 'Atualizado',
      paymentMethod: 'CREDIT_CARD',
      ownerMemberId: 'm-1',
    });
  });

  it('shows concurrency notice when concurrencyError is set, hiding form fields', () => {
    const onClose = jest.fn();
    render(
      <ExpenseFormModal
        open
        mode="edit"
        members={members}
        initial={initial}
        isSaving={false}
        concurrencyError
        onClose={onClose}
        onSubmit={() => undefined}
      />,
    );
    expect(screen.getByText(/Despesa não encontrada/i)).toBeInTheDocument();
    expect(screen.getByText(/excluída por outro membro/i)).toBeInTheDocument();
    expect(screen.queryByLabelText('Descrição')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Salvar' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'OK' }));
    expect(onClose).toHaveBeenCalled();
  });
});
