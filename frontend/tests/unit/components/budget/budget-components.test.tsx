import '@testing-library/jest-dom';
import { useState } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { FamilyBudgetSection } from '../../../../src/components/budget/FamilyBudgetSection';
import { LimitEditor } from '../../../../src/components/budget/LimitEditor';
import { AllocationSummaryBar } from '../../../../src/components/budget/AllocationSummaryBar';
import { CopyPreviousMonthDialog } from '../../../../src/components/budget/CopyPreviousMonthDialog';
import { emptyLimit, type EditableLimit } from '../../../../src/components/budget/limit-draft';

describe('FamilyBudgetSection (US1)', () => {
  it('shows "Não definido" when the value is zero', () => {
    render(<FamilyBudgetSection cents={0} onChange={() => {}} />);
    expect(screen.getByText('Não definido')).toBeInTheDocument();
  });
  it('renders the family amount input', () => {
    render(<FamilyBudgetSection cents={500000} onChange={() => {}} />);
    expect(screen.getByRole('textbox', { name: 'Orçamento da família' })).toBeInTheDocument();
  });
});

describe('LimitEditor (US2/US3 — value/percent toggle)', () => {
  function Harness({ resolvedCents = null }: { resolvedCents?: number | null }) {
    const [v, setV] = useState<EditableLimit>(emptyLimit());
    return <LimitEditor label="Ana" value={v} onChange={setV} resolvedCents={resolvedCents} />;
  }

  it('starts in R$ (absolute) mode and switches to % mode', () => {
    render(<Harness resolvedCents={150000} />);
    // absolute mode: the MoneyInput (aria "Valor — Ana") is shown
    expect(screen.getByLabelText('Valor — Ana')).toBeInTheDocument();
    // switch to percent
    fireEvent.click(screen.getByRole('button', { name: '%' }));
    expect(screen.getByLabelText('Percentual — Ana')).toBeInTheDocument();
    // resolved badge shows the formatted cents
    expect(screen.getByLabelText('Valor resolvido — Ana')).toHaveTextContent('1.500,00');
  });

  it('captures an integer percentage', () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole('button', { name: '%' }));
    const pctInput = screen.getByLabelText('Percentual — Ana') as HTMLInputElement;
    fireEvent.change(pctInput, { target: { value: '40' } });
    expect(pctInput.value).toBe('40');
  });
});

describe('AllocationSummaryBar (US3, FR-023)', () => {
  it('shows the remaining balance', () => {
    render(<AllocationSummaryBar familyCents={500000} allocatedCents={300000} />);
    expect(screen.getByText(/Saldo:/)).toBeInTheDocument();
  });
  it('shows the advisory note when over-allocated', () => {
    render(<AllocationSummaryBar familyCents={500000} allocatedCents={600000} />);
    expect(screen.getByText(/somam mais que o orçamento/)).toBeInTheDocument();
  });
});

describe('CopyPreviousMonthDialog (US4)', () => {
  it('renders nothing when closed', () => {
    const { container } = render(
      <CopyPreviousMonthDialog
        open={false}
        fromMonth="2026-05"
        toMonth="2026-06"
        onClose={() => {}}
        onConfirm={() => {}}
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });
  it('confirms and dismisses', () => {
    const onConfirm = jest.fn();
    const onClose = jest.fn();
    render(
      <CopyPreviousMonthDialog
        open
        fromMonth="2026-05"
        toMonth="2026-06"
        onClose={onClose}
        onConfirm={onConfirm}
      />,
    );
    expect(screen.getByText(/Copiar orçamentos do mês anterior/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Copiar' }));
    expect(onConfirm).toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Agora não' }));
    expect(onClose).toHaveBeenCalled();
  });
});
