// T019 — US2: per-member spending vs individual budgets (FR-006/FR-008).
import '@testing-library/jest-dom';
import { render, screen, within } from '@testing-library/react';
import { MemberSpendingList } from '../../../../src/components/dashboard/MemberSpendingList';
import type { MemberSpending } from '../../../../src/types/dashboard';

function absolute(cents: number) {
  return {
    limitType: 'ABSOLUTE' as const,
    amountCents: cents,
    percent: null,
    resolvedCents: cents,
  };
}

function member(overrides: Partial<MemberSpending>): MemberSpending {
  return {
    memberId: 'm1',
    name: 'Ana',
    isExMember: false,
    spentCents: 0,
    budget: null,
    ...overrides,
  };
}

describe('MemberSpendingList', () => {
  it('renders one row per member with spent, limit, % and remaining', () => {
    render(
      <MemberSpendingList
        members={[
          member({ memberId: 'a', name: 'Ana', spentCents: 120000, budget: absolute(200000) }),
        ]}
      />,
    );
    const row = screen.getByTestId('member-row-a');
    expect(within(row).getByText('Ana')).toBeInTheDocument();
    expect(within(row).getByText(/1\.200,00/)).toBeInTheDocument();
    expect(within(row).getByText(/2\.000,00/)).toBeInTheDocument();
    expect(within(row).getByText(/60%/)).toBeInTheDocument();
    expect(within(row).getByText(/restante/i)).toBeInTheDocument();
  });

  it('highlights a member above their limit (>100% + exceeded amount)', () => {
    render(
      <MemberSpendingList
        members={[
          member({ memberId: 'b', name: 'Bia', spentCents: 180000, budget: absolute(150000) }),
        ]}
      />,
    );
    const row = screen.getByTestId('member-row-b');
    expect(within(row).getByText(/120%/)).toBeInTheDocument();
    expect(within(row).getByText(/excedido/i)).toBeInTheDocument();
    expect(within(row).getByText(/300,00/)).toBeInTheDocument();
  });

  it('shows "sem orçamento definido" when there is no usable limit (FR-008)', () => {
    render(
      <MemberSpendingList
        members={[member({ memberId: 'c', name: 'Caio', spentCents: 5000, budget: null })]}
      />,
    );
    const row = screen.getByTestId('member-row-c');
    expect(within(row).getByText(/sem orçamento definido/i)).toBeInTheDocument();
    expect(within(row).queryByText(/%/)).not.toBeInTheDocument();
  });

  it('treats an unresolvable percent budget as "sem orçamento definido" (FR-007)', () => {
    render(
      <MemberSpendingList
        members={[
          member({
            memberId: 'd',
            name: 'Davi',
            spentCents: 1000,
            budget: { limitType: 'PERCENT', amountCents: null, percent: 30, resolvedCents: null },
          }),
        ]}
      />,
    );
    expect(
      within(screen.getByTestId('member-row-d')).getByText(/sem orçamento definido/i),
    ).toBeInTheDocument();
  });

  it('renders ex-members as inactive rows without budget comparison (Q2)', () => {
    render(
      <MemberSpendingList
        members={[member({ memberId: 'x', name: 'Carlos', isExMember: true, spentCents: 25000 })]}
      />,
    );
    const row = screen.getByTestId('member-row-x');
    expect(within(row).getByText('Carlos')).toBeInTheDocument();
    expect(within(row).getByText(/ex-membro/i)).toBeInTheDocument();
    expect(within(row).getByText(/250,00/)).toBeInTheDocument();
    expect(within(row).queryByText(/sem orçamento definido/i)).not.toBeInTheDocument();
    expect(within(row).queryByText(/%/)).not.toBeInTheDocument();
  });

  it('shows zero spending for active members without expenses', () => {
    render(
      <MemberSpendingList
        members={[member({ memberId: 'e', name: 'Eva', spentCents: 0, budget: absolute(100000) })]}
      />,
    );
    const row = screen.getByTestId('member-row-e');
    expect(within(row).getAllByText(/0,00/).length).toBeGreaterThanOrEqual(1);
    expect(within(row).getByText(/0% consumido/)).toBeInTheDocument();
  });
});
