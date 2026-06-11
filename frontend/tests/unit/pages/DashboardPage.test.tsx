// T013 (states) + T027 (month switching) — DashboardPage.
import { TextEncoder, TextDecoder } from 'util';
Object.assign(global, { TextEncoder, TextDecoder });

import '@testing-library/jest-dom';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

jest.mock('../../../src/services/dashboard.service', () => ({
  dashboardService: { getMonth: jest.fn() },
}));

import { dashboardService } from '../../../src/services/dashboard.service';
import { DashboardPage } from '../../../src/pages/DashboardPage';
import { currentMonth, previousMonth, formatMonthLabel } from '../../../src/utils/month';
import type { MonthDashboard } from '../../../src/types/dashboard';

const getMonthMock = dashboardService.getMonth as jest.MockedFunction<
  typeof dashboardService.getMonth
>;

function emptyEnvelope(month: string): MonthDashboard {
  return {
    month,
    family: { spentCents: 0, budget: null },
    members: [],
    categories: [],
    uncategorizedSpentCents: 0,
  };
}

function renderPage() {
  return render(
    <MemoryRouter>
      <DashboardPage />
    </MemoryRouter>,
  );
}

beforeEach(() => jest.clearAllMocks());

describe('DashboardPage', () => {
  it('opens on the current month, clearly identified in PT-BR (FR-001/FR-015)', async () => {
    getMonthMock.mockResolvedValue(emptyEnvelope(currentMonth()));
    renderPage();
    expect(await screen.findByText(formatMonthLabel(currentMonth()))).toBeInTheDocument();
    expect(getMonthMock).toHaveBeenCalledWith(currentMonth());
  });

  it('shows a loading state while the dashboard loads', () => {
    getMonthMock.mockReturnValue(new Promise(() => {}));
    renderPage();
    expect(screen.getByText(/carregando dashboard/i)).toBeInTheDocument();
  });

  it('shows an error state with retry when the load fails', async () => {
    getMonthMock.mockRejectedValue({ kind: 'server', status: 500, code: 'x', message: 'boom' });
    renderPage();
    expect(await screen.findByRole('alert')).toHaveTextContent(/não foi possível carregar/i);
    getMonthMock.mockResolvedValue(emptyEnvelope(currentMonth()));
    fireEvent.click(screen.getByRole('button', { name: /tentar novamente/i }));
    expect(await screen.findByText(/0,00/)).toBeInTheDocument();
  });

  it('renders explanatory empty states for a month without data (FR-016)', async () => {
    getMonthMock.mockResolvedValue(emptyEnvelope(currentMonth()));
    renderPage();
    expect(await screen.findByText(/orçamento não definido/i)).toBeInTheDocument();
    expect(screen.getByText(/nenhuma despesa registrada neste mês/i)).toBeInTheDocument();
  });

  it('refetches all sections when navigating to a past month (US4/FR-014)', async () => {
    getMonthMock.mockImplementation((m: string) => Promise.resolve(emptyEnvelope(m)));
    renderPage();
    await screen.findByText(formatMonthLabel(currentMonth()));

    fireEvent.click(screen.getByRole('button', { name: /mês anterior/i }));
    const past = previousMonth(currentMonth());
    expect(await screen.findByText(formatMonthLabel(past))).toBeInTheDocument();
    expect(getMonthMock).toHaveBeenLastCalledWith(past);

    fireEvent.click(screen.getByRole('button', { name: /voltar ao mês atual/i }));
    expect(await screen.findByText(formatMonthLabel(currentMonth()))).toBeInTheDocument();
    expect(getMonthMock).toHaveBeenLastCalledWith(currentMonth());
  });
});
