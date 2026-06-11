// T027 — US4: month navigation capped at the current month (FR-013/FR-015).
import '@testing-library/jest-dom';
import { render, screen, fireEvent } from '@testing-library/react';
import { DashboardMonthSelector } from '../../../../src/components/dashboard/DashboardMonthSelector';
import { currentMonth, previousMonth, formatMonthLabel } from '../../../../src/utils/month';

describe('DashboardMonthSelector', () => {
  it('shows the month label in PT-BR (FR-015)', () => {
    render(<DashboardMonthSelector month={currentMonth()} onChange={jest.fn()} />);
    expect(screen.getByText(formatMonthLabel(currentMonth()))).toBeInTheDocument();
  });

  it('disables "next" at the current month — no future months (FR-013)', () => {
    render(<DashboardMonthSelector month={currentMonth()} onChange={jest.fn()} />);
    expect(screen.getByRole('button', { name: /próximo mês/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /mês anterior/i })).toBeEnabled();
  });

  it('enables "next" for past months and navigates with prev/next', () => {
    const onChange = jest.fn();
    const past = previousMonth(currentMonth());
    render(<DashboardMonthSelector month={past} onChange={onChange} />);

    const next = screen.getByRole('button', { name: /próximo mês/i });
    expect(next).toBeEnabled();
    fireEvent.click(next);
    expect(onChange).toHaveBeenCalledWith(currentMonth());

    fireEvent.click(screen.getByRole('button', { name: /mês anterior/i }));
    expect(onChange).toHaveBeenCalledWith(previousMonth(past));
  });

  it('returns to the current month in a single action (US4 scenario 3)', () => {
    const onChange = jest.fn();
    render(<DashboardMonthSelector month={previousMonth(currentMonth())} onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: /voltar ao mês atual/i }));
    expect(onChange).toHaveBeenCalledWith(currentMonth());
  });

  it('hides the "back to current" action when already at the current month', () => {
    render(<DashboardMonthSelector month={currentMonth()} onChange={jest.fn()} />);
    expect(screen.queryByRole('button', { name: /voltar ao mês atual/i })).not.toBeInTheDocument();
  });
});
