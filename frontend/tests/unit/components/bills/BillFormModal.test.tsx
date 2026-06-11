import '@testing-library/jest-dom';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BillFormModal } from '../../../../src/components/bills/BillFormModal';

jest.mock('../../../../src/services/bill.service', () => ({
  billService: {
    create: jest.fn().mockResolvedValue({ bill: {} }),
    update: jest.fn().mockResolvedValue({ bill: {} }),
  },
}));

import { billService } from '../../../../src/services/bill.service';

const createMock = billService.create as jest.MockedFunction<typeof billService.create>;

const baseProps = {
  open: true,
  mode: 'create' as const,
  selectedMonth: '2026-06',
  onClose: jest.fn(),
  onSuccess: jest.fn(),
};

beforeEach(() => jest.clearAllMocks());

describe('BillFormModal', () => {
  it('does not render when open=false', () => {
    render(<BillFormModal {...baseProps} open={false} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('renders dialog with title "Nova conta" in create mode', () => {
    render(<BillFormModal {...baseProps} />);
    expect(screen.getByRole('dialog', { name: /nova conta/i })).toBeInTheDocument();
  });

  it('shows description, amount, and due date fields', () => {
    render(<BillFormModal {...baseProps} />);
    expect(screen.getByLabelText(/descrição/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/valor/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/vencimento/i)).toBeInTheDocument();
  });

  it('defaults dueDate to first day of selected month', () => {
    render(<BillFormModal {...baseProps} selectedMonth="2026-07" />);
    const dateInput = screen.getByLabelText(/vencimento/i) as HTMLInputElement;
    expect(dateInput.value).toBe('2026-07-01');
  });

  it('shows validation error when description is empty on submit', async () => {
    render(<BillFormModal {...baseProps} />);
    fireEvent.click(screen.getByRole('button', { name: /salvar/i }));
    expect(await screen.findByText(/informe uma descrição/i)).toBeInTheDocument();
    expect(createMock).not.toHaveBeenCalled();
  });

  it('shows validation error when amount is zero on submit', async () => {
    render(<BillFormModal {...baseProps} />);
    fireEvent.change(screen.getByLabelText(/descrição/i), { target: { value: 'Aluguel' } });
    // amount stays empty (0)
    fireEvent.click(screen.getByRole('button', { name: /salvar/i }));
    expect(await screen.findByText(/informe um valor maior que zero/i)).toBeInTheDocument();
  });

  it('calls billService.create with correct data on valid submit', async () => {
    render(<BillFormModal {...baseProps} />);
    fireEvent.change(screen.getByLabelText(/descrição/i), { target: { value: 'Aluguel' } });
    fireEvent.change(screen.getByLabelText(/valor/i), { target: { value: '1500,00' } });
    fireEvent.change(screen.getByLabelText(/vencimento/i), { target: { value: '2026-06-10' } });
    fireEvent.click(screen.getByRole('button', { name: /salvar/i }));

    await waitFor(() => expect(createMock).toHaveBeenCalledTimes(1));
    const arg = createMock.mock.calls[0]![0];
    expect(arg.description).toBe('Aluguel');
    expect(arg.expectedAmountCents).toBe(150000);
    expect(arg.dueDate).toBe('2026-06-10');
  });

  it('calls onClose when cancel button is clicked', () => {
    const onClose = jest.fn();
    render(<BillFormModal {...baseProps} onClose={onClose} />);
    fireEvent.click(screen.getByRole('button', { name: /cancelar/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('renders "Editar conta" title in edit mode', () => {
    const bill = {
      id: 'b-1',
      groupId: 'g-1',
      description: 'Aluguel',
      expectedAmountCents: 150000,
      dueDate: '2026-06-10',
      month: '2026-06',
      status: 'PENDING' as const,
      isOverdue: false,
      categoryId: null,
      category: null,
      ownerMemberId: null,
      ownerMember: null,
      recurringBillId: null,
      payment: null,
    };
    render(<BillFormModal {...baseProps} mode="edit" bill={bill} />);
    expect(screen.getByRole('dialog', { name: /editar conta/i })).toBeInTheDocument();
  });
});
