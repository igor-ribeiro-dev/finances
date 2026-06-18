// T053 — US4 RTL: register-fatura modal (submit + pending_exists message).
import '@testing-library/jest-dom';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

const mockGetCard = jest.fn().mockResolvedValue({
  id: 'c1',
  name: 'Nubank',
  closingDay: 10,
  status: 'ACTIVE',
  openChargesCents: 12000,
  cycleCloseDate: '2026-06-10',
  openCharges: [],
});
const mockRegisterFatura = jest.fn();

jest.mock('../../../../src/services/credit-card.service', () => ({
  creditCardService: {
    getCard: (...a: unknown[]) => mockGetCard(...a),
    registerFatura: (...a: unknown[]) => mockRegisterFatura(...a),
  },
}));

import { RegisterFaturaModal } from '../../../../src/components/credit-cards/RegisterFaturaModal';

function renderModal() {
  const onSuccess = jest.fn();
  const onClose = jest.fn();
  render(<RegisterFaturaModal cardId="c1" onClose={onClose} onSuccess={onSuccess} />);
  return { onSuccess, onClose };
}

describe('RegisterFaturaModal', () => {
  beforeEach(() => jest.clearAllMocks());

  it('prefills the amount with the card open charges and submits', async () => {
    mockRegisterFatura.mockResolvedValue({ id: 'fatura-1' });
    const { onSuccess } = renderModal();
    // prefilled R$ 120,00 from open charges
    await waitFor(() =>
      expect(screen.getByLabelText('Valor da fatura (R$)')).toHaveValue('120,00'),
    );
    fireEvent.submit(screen.getByLabelText('Valor da fatura (R$)').closest('form')!);
    await waitFor(() => expect(mockRegisterFatura).toHaveBeenCalled());
    expect(mockRegisterFatura).toHaveBeenCalledWith(
      'c1',
      expect.objectContaining({ expectedAmountCents: 12000 }),
    );
    await waitFor(() => expect(onSuccess).toHaveBeenCalled());
  });

  it('shows the error when a pending fatura already exists', async () => {
    mockRegisterFatura.mockRejectedValue({
      kind: 'conflict',
      code: 'fatura.pending_exists',
      message: 'Já existe uma fatura pendente para este cartão.',
    });
    renderModal();
    await waitFor(() =>
      expect(screen.getByLabelText('Valor da fatura (R$)')).toHaveValue('120,00'),
    );
    fireEvent.submit(screen.getByLabelText('Valor da fatura (R$)').closest('form')!);
    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(/já existe uma fatura pendente/i),
    );
  });
});
