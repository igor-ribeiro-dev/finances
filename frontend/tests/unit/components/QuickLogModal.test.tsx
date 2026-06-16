// T011 — US1 RTL tests for QuickLogModal (written first — MUST FAIL before implementation)
import { TextEncoder, TextDecoder } from 'util';
Object.assign(global, { TextEncoder, TextDecoder });

import '@testing-library/jest-dom';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const mockLogSpending = jest.fn();

jest.mock('../../../src/services/bill.service', () => ({
  billService: {
    logSpending: mockLogSpending,
  },
}));

jest.mock('../../../src/services/category.service', () => ({
  categoryService: {
    list: jest.fn().mockResolvedValue({ categories: [] }),
  },
}));

jest.mock('../../../src/services/group.service', () => ({
  listGroupMembers: jest.fn().mockResolvedValue([
    { id: 'member-ana', name: 'Ana' },
    { id: 'member-bia', name: 'Bia' },
  ]),
}));

import { QuickLogModal } from '../../../src/components/bills/QuickLogModal';

const TODAY = new Date().toISOString().slice(0, 10);

function renderModal(open = true, onClose = jest.fn(), onSuccess = jest.fn()) {
  return render(
    <MemoryRouter>
      <QuickLogModal open={open} onClose={onClose} onSuccess={onSuccess} />
    </MemoryRouter>,
  );
}

describe('QuickLogModal', () => {
  beforeEach(() => jest.clearAllMocks());

  it('does not render when closed', () => {
    renderModal(false);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('renders the modal when open', async () => {
    renderModal();
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
  });

  it('default date is today', async () => {
    renderModal();
    const dateInput = await screen.findByLabelText(/data/i);
    expect(dateInput).toHaveValue(TODAY);
  });

  it('shows description field', async () => {
    renderModal();
    expect(await screen.findByLabelText(/descrição/i)).toBeInTheDocument();
  });

  it('shows amount field', async () => {
    renderModal();
    expect(await screen.findByLabelText(/valor/i)).toBeInTheDocument();
  });

  it('shows payment method field', async () => {
    renderModal();
    expect(await screen.findByText(/método de pagamento/i)).toBeInTheDocument();
  });

  it('shows responsible member field', async () => {
    renderModal();
    expect(await screen.findByLabelText(/responsável/i)).toBeInTheDocument();
  });

  it('calls logSpending and invokes onSuccess when form is submitted successfully', async () => {
    mockLogSpending.mockResolvedValue({ bill: { id: 'bill-new', status: 'PAID' } });
    const onSuccess = jest.fn();
    renderModal(true, jest.fn(), onSuccess);

    fireEvent.change(await screen.findByLabelText(/descrição/i), {
      target: { value: 'Mercado' },
    });
    fireEvent.change(screen.getByLabelText(/valor/i), {
      target: { value: '50.00' },
    });

    const submitBtn = screen.getByRole('button', { name: /registrar/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(mockLogSpending).toHaveBeenCalled();
      expect(onSuccess).toHaveBeenCalled();
    });
  });

  it('does not submit when description is empty', async () => {
    renderModal();
    const submitBtn = await screen.findByRole('button', { name: /registrar/i });
    fireEvent.click(submitBtn);
    await waitFor(() => {
      expect(mockLogSpending).not.toHaveBeenCalled();
    });
  });
});
