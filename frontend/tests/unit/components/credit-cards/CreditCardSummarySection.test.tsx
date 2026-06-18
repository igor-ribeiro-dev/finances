// T040 — US3 RTL: per-card open-charges summary in the tracker.
import '@testing-library/jest-dom';
import { render, screen, waitFor } from '@testing-library/react';

jest.mock('../../../../src/services/credit-card.service', () => ({
  creditCardService: {
    listCards: jest.fn().mockResolvedValue([
      { id: 'c1', name: 'Nubank', closingDay: 10, status: 'ACTIVE', openChargesCents: 12000 },
      { id: 'c2', name: 'Itaú', closingDay: 5, status: 'ACTIVE', openChargesCents: 0 },
    ]),
  },
}));

import { CreditCardSummarySection } from '../../../../src/components/credit-cards/CreditCardSummarySection';

describe('CreditCardSummarySection', () => {
  it('lists only cards with open charges and their totals', async () => {
    render(<CreditCardSummarySection />);
    await waitFor(() => expect(screen.getByText('Nubank')).toBeInTheDocument());
    expect(screen.getByText('R$ 120,00')).toBeInTheDocument();
    // Itaú has zero open charges → not listed
    expect(screen.queryByText('Itaú')).not.toBeInTheDocument();
  });
});
