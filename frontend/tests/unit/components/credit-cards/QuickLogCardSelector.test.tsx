// T031 — US2 RTL: the credit-card selector appears in QuickLogModal only for
// the credit-card payment method and is sent on submit.
import { TextEncoder, TextDecoder } from 'util';
Object.assign(global, { TextEncoder, TextDecoder });

import '@testing-library/jest-dom';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const mockLogSpending = jest.fn().mockResolvedValue({ bill: { id: 'b1' } });

jest.mock('../../../../src/services/bill.service', () => ({
  billService: { logSpending: mockLogSpending },
}));
jest.mock('../../../../src/services/group.service', () => ({
  listGroupMembers: jest.fn().mockResolvedValue([{ id: 'member-ana', name: 'Ana' }]),
}));
jest.mock('../../../../src/services/credit-card.service', () => ({
  creditCardService: {
    listCards: jest.fn().mockResolvedValue([
      { id: 'card-nu', name: 'Nubank', closingDay: 10, status: 'ACTIVE', openChargesCents: 0 },
      { id: 'card-old', name: 'Antigo', closingDay: 5, status: 'ARCHIVED', openChargesCents: 0 },
    ]),
  },
}));

import { QuickLogModal } from '../../../../src/components/bills/QuickLogModal';

function renderModal() {
  return render(
    <MemoryRouter>
      <QuickLogModal open onClose={jest.fn()} onSuccess={jest.fn()} />
    </MemoryRouter>,
  );
}

describe('QuickLogModal — credit card selector', () => {
  beforeEach(() => jest.clearAllMocks());

  it('hides the card selector for cash/debit', () => {
    renderModal();
    expect(screen.queryByLabelText('Cartão')).not.toBeInTheDocument();
  });

  it('shows the selector with only ACTIVE cards when credit is chosen', async () => {
    renderModal();
    fireEvent.click(screen.getByRole('button', { name: /cartão de crédito/i }));
    const select = await screen.findByLabelText('Cartão');
    expect(select).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Nubank' })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'Antigo' })).not.toBeInTheDocument();
  });

  it('blocks submit when credit is chosen without a card', async () => {
    renderModal();
    fireEvent.change(screen.getByLabelText('Descrição'), { target: { value: 'Mercado' } });
    fireEvent.change(screen.getByLabelText('Valor (R$)'), { target: { value: '5000' } });
    fireEvent.click(screen.getByRole('button', { name: /cartão de crédito/i }));
    await screen.findByLabelText('Cartão');
    fireEvent.submit(screen.getByLabelText('Descrição').closest('form')!);
    expect(mockLogSpending).not.toHaveBeenCalled();
    expect(screen.getByText('Selecione o cartão de crédito utilizado.')).toBeInTheDocument();
  });

  it('sends creditCardId when a card is selected', async () => {
    renderModal();
    await waitFor(() => expect(screen.getByLabelText('Responsável')).toBeInTheDocument());
    fireEvent.change(screen.getByLabelText('Descrição'), { target: { value: 'Mercado' } });
    fireEvent.change(screen.getByLabelText('Valor (R$)'), { target: { value: '5000' } });
    fireEvent.click(screen.getByRole('button', { name: /cartão de crédito/i }));
    const select = await screen.findByLabelText('Cartão');
    fireEvent.change(select, { target: { value: 'card-nu' } });
    fireEvent.submit(screen.getByLabelText('Descrição').closest('form')!);
    await waitFor(() => expect(mockLogSpending).toHaveBeenCalled());
    expect(mockLogSpending).toHaveBeenCalledWith(
      expect.objectContaining({ paymentMethod: 'CREDIT_CARD', creditCardId: 'card-nu' }),
    );
  });
});
