import '@testing-library/jest-dom';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';

jest.mock('../../../src/services/group.service', () => ({
  listGroupMembers: jest.fn(),
}));
jest.mock('../../../src/services/expense.service', () => ({
  expenseService: {
    createExpense: jest.fn(),
    listExpenses: jest.fn(),
    updateExpense: jest.fn(),
    deleteExpense: jest.fn(),
  },
}));

import { listGroupMembers } from '../../../src/services/group.service';
import { expenseService } from '../../../src/services/expense.service';
import { ExpensesPage } from '../../../src/pages/ExpensesPage';
import type { Expense } from '../../../src/types/expense';

const listMembersMock = listGroupMembers as jest.MockedFunction<typeof listGroupMembers>;
const listMock = expenseService.listExpenses as jest.MockedFunction<
  typeof expenseService.listExpenses
>;
const createMock = expenseService.createExpense as jest.MockedFunction<
  typeof expenseService.createExpense
>;

function mockExpense(): Expense {
  return {
    id: 'exp-new',
    groupId: 'g-1',
    amountCents: 12345,
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
}

describe('ExpensesPage — create flow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    listMembersMock.mockResolvedValue([{ id: 'm-1', name: 'Ana' }]);
    listMock.mockResolvedValue({ items: [], nextCursor: null });
  });

  it('shows empty state initially and opens form when CTA clicked', async () => {
    render(<ExpensesPage />);
    await waitFor(() => expect(listMock).toHaveBeenCalled());
    expect(screen.getByText(/Você ainda não registrou nenhuma despesa/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Registrar primeira despesa/i }));
    expect(screen.getByRole('dialog', { name: 'Nova despesa' })).toBeInTheDocument();
  });

  it('creates expense, closes modal, shows toast, and prepends to list', async () => {
    createMock.mockResolvedValue(mockExpense());
    render(<ExpensesPage />);
    await waitFor(() => expect(listMembersMock).toHaveBeenCalled());
    await waitFor(() => expect(listMock).toHaveBeenCalled());

    // Open modal
    fireEvent.click(screen.getByRole('button', { name: /Nova despesa/i }));

    // Type 12345 cents
    const valueInput = screen.getByLabelText('Valor');
    for (const k of ['1', '2', '3', '4', '5']) {
      fireEvent.keyDown(valueInput, { key: k });
    }
    fireEvent.change(screen.getByLabelText('Descrição'), { target: { value: 'Mercado' } });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    });

    // Toast shown
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent('Despesa registrada.'),
    );
    // Modal closed
    expect(screen.queryByRole('dialog', { name: 'Nova despesa' })).not.toBeInTheDocument();
    // List has the new item
    expect(screen.getByText('Mercado')).toBeInTheDocument();
    expect(screen.getByText(/R\$\s*123,45/)).toBeInTheDocument();
  });

  it('keeps modal open and shows field errors on validation failure', async () => {
    createMock.mockRejectedValue({
      kind: 'validation',
      status: 400,
      message: 'Dados inválidos.',
      fieldErrors: [{ field: 'amountCents', code: 'too_small', message: 'Valor server-side ruim' }],
    });

    render(<ExpensesPage />);
    await waitFor(() => expect(listMock).toHaveBeenCalled());

    fireEvent.click(screen.getByRole('button', { name: /Nova despesa/i }));
    const valueInput = screen.getByLabelText('Valor');
    fireEvent.keyDown(valueInput, { key: '5' });
    fireEvent.change(screen.getByLabelText('Descrição'), { target: { value: 'X' } });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    });

    await waitFor(() => expect(screen.getByText('Valor server-side ruim')).toBeInTheDocument());
    expect(screen.getByRole('dialog', { name: 'Nova despesa' })).toBeInTheDocument();
  });
});
