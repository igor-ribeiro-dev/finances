// T013 — US1: family spending vs family budget (FR-004/FR-005).
import { TextEncoder, TextDecoder } from 'util';
Object.assign(global, { TextEncoder, TextDecoder });

import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { FamilySummaryCard } from '../../../../src/components/dashboard/FamilySummaryCard';
import type { FamilySummary } from '../../../../src/types/dashboard';

function renderCard(family: FamilySummary) {
  return render(
    <MemoryRouter>
      <FamilySummaryCard family={family} />
    </MemoryRouter>,
  );
}

const BUDGET_5000 = {
  limitType: 'ABSOLUTE' as const,
  amountCents: 500000,
  percent: null,
  resolvedCents: 500000,
};

describe('FamilySummaryCard', () => {
  it('shows spent, limit, consumed % and remaining balance', () => {
    renderCard({ spentCents: 325000, budget: BUDGET_5000 });
    expect(screen.getByText(/3\.250,00/)).toBeInTheDocument();
    expect(screen.getByText(/5\.000,00/)).toBeInTheDocument();
    expect(screen.getByText(/65%/)).toBeInTheDocument();
    expect(screen.getByText(/restante/i)).toBeInTheDocument();
    expect(screen.getByText(/1\.750,00/)).toBeInTheDocument();
  });

  it('highlights overspending with >100% and the exceeded amount (FR-004)', () => {
    renderCard({ spentCents: 580000, budget: BUDGET_5000 });
    expect(screen.getByText(/116%/)).toBeInTheDocument();
    expect(screen.getByText(/excedido em/i)).toHaveTextContent('800,00');
  });

  it('shows "orçamento não definido" with a link to /orcamentos when budget is null (FR-005)', () => {
    renderCard({ spentCents: 12345, budget: null });
    expect(screen.getByText(/123,45/)).toBeInTheDocument();
    expect(screen.getByText(/orçamento não definido/i)).toBeInTheDocument();
    const link = screen.getByRole('link', { name: /definir orçamentos/i });
    expect(link).toHaveAttribute('href', '/orcamentos');
    expect(screen.queryByText(/%/)).not.toBeInTheDocument();
  });

  it('renders 0% and full balance for an expense-less month with a budget (FR-016)', () => {
    renderCard({ spentCents: 0, budget: BUDGET_5000 });
    expect(screen.getByText(/0%/)).toBeInTheDocument();
    expect(screen.getAllByText(/5\.000,00/).length).toBeGreaterThanOrEqual(1);
  });
});
