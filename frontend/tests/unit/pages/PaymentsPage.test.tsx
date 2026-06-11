import { TextEncoder, TextDecoder } from 'util';
Object.assign(global, { TextEncoder, TextDecoder });

import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// Mock all services and hooks before importing components
jest.mock('../../../src/services/bill.service', () => ({
  billService: {
    listByMonth: jest.fn().mockResolvedValue({
      month: '2026-06',
      summary: {
        totalExpectedCents: 0,
        totalPaidCents: 0,
        totalPendingCents: 0,
        projectedCents: 0,
      },
      bills: [],
      projectedBills: [],
    }),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    copyDryRun: jest.fn(),
    copy: jest.fn(),
    pay: jest.fn(),
    updatePayment: jest.fn(),
    revertPayment: jest.fn(),
    cancel: jest.fn(),
    reactivate: jest.fn(),
  },
}));

jest.mock('../../../src/services/recurring-bill.service', () => ({
  recurringBillService: {
    list: jest.fn().mockResolvedValue({ recurringBills: [] }),
    stop: jest.fn(),
    remove: jest.fn(),
  },
}));

import { PaymentsPage } from '../../../src/pages/PaymentsPage';

function renderPage() {
  return render(
    <MemoryRouter>
      <PaymentsPage />
    </MemoryRouter>,
  );
}

describe('PaymentsPage', () => {
  it('renders page heading "Pagamentos"', async () => {
    renderPage();
    expect(await screen.findByRole('heading', { name: /pagamentos/i })).toBeInTheDocument();
  });

  it('renders "Nova conta" button', async () => {
    renderPage();
    expect(await screen.findByRole('button', { name: /^nova conta$/i })).toBeInTheDocument();
  });

  it('renders "Copiar do mês anterior" button', async () => {
    renderPage();
    expect(
      await screen.findByRole('button', { name: /copiar do mês anterior/i }),
    ).toBeInTheDocument();
  });

  it('renders empty checklist state after loading', async () => {
    renderPage();
    expect(await screen.findByText(/nenhuma conta registrada/i)).toBeInTheDocument();
  });

  it('renders "Contas Fixas" section', async () => {
    renderPage();
    expect(await screen.findByRole('heading', { name: /contas fixas/i })).toBeInTheDocument();
  });
});
