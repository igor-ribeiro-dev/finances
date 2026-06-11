// T024 — US3: category distribution with percentages (FR-009..FR-012, Q1/Q3, R8).
import '@testing-library/jest-dom';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { CategorySpendingList } from '../../../../src/components/dashboard/CategorySpendingList';
import type { CategorySpending } from '../../../../src/types/dashboard';

function absolute(cents: number) {
  return {
    limitType: 'ABSOLUTE' as const,
    amountCents: cents,
    percent: null,
    resolvedCents: cents,
  };
}

function cat(overrides: Partial<CategorySpending> & { categoryId: string }): CategorySpending {
  return {
    name: overrides.categoryId,
    parentId: null,
    directSpentCents: 0,
    spentCents: 0,
    budget: null,
    ...overrides,
  };
}

const FOOD = cat({
  categoryId: 'food',
  name: 'Alimentação',
  directSpentCents: 40000,
  spentCents: 150000,
  budget: absolute(200000),
});
const MARKET = cat({
  categoryId: 'market',
  name: 'Mercado',
  parentId: 'food',
  directSpentCents: 110000,
  spentCents: 110000,
});
const HOME = cat({
  categoryId: 'home',
  name: 'Moradia',
  spentCents: 100000,
  directSpentCents: 100000,
});
const IDLE = cat({ categoryId: 'idle', name: 'Lazer' }); // zero spend, no budget → hidden (R8)

describe('CategorySpendingList', () => {
  it('orders roots by participation desc and shows value + % of month total (FR-009)', () => {
    render(
      <CategorySpendingList
        categories={[HOME, FOOD, MARKET, IDLE]}
        uncategorizedSpentCents={50000}
        totalSpentCents={300000}
      />,
    );
    const rows = screen.getAllByTestId(/^category-root-/);
    // 150000 (Alimentação) > 100000 (Moradia) > 50000 (Sem categoria); Lazer hidden.
    expect(rows[0]).toHaveTextContent('Alimentação');
    expect(rows[1]).toHaveTextContent('Moradia');
    expect(rows[2]).toHaveTextContent('Sem categoria');
    expect(screen.queryByText('Lazer')).not.toBeInTheDocument();

    expect(within(rows[0] as HTMLElement).getByText(/50%/)).toBeInTheDocument();
    expect(within(rows[1] as HTMLElement).getByText(/33%/)).toBeInTheDocument();
    expect(within(rows[2] as HTMLElement).getByText(/17%/)).toBeInTheDocument();
  });

  it('shows budget cap consumption for roots with a defined cap (FR-012)', () => {
    render(
      <CategorySpendingList
        categories={[FOOD, MARKET]}
        uncategorizedSpentCents={0}
        totalSpentCents={150000}
      />,
    );
    const food = screen.getByTestId('category-root-food');
    expect(within(food).getByText(/75% do teto/)).toBeInTheDocument();
  });

  it('keeps zero-spend roots visible when they have a cap (0% consumed, R8)', () => {
    const capped = cat({ categoryId: 'cap', name: 'Doação', budget: absolute(50000) });
    render(
      <CategorySpendingList
        categories={[capped]}
        uncategorizedSpentCents={0}
        totalSpentCents={0}
      />,
    );
    const row = screen.getByTestId('category-root-cap');
    expect(within(row).getByText('Doação')).toBeInTheDocument();
    expect(within(row).getByText(/0% do teto/)).toBeInTheDocument();
  });

  it('expands a root into sub-categories with % relative to the root (Q3/FR-011)', () => {
    render(
      <CategorySpendingList
        categories={[FOOD, MARKET]}
        uncategorizedSpentCents={0}
        totalSpentCents={150000}
      />,
    );
    const toggle = screen.getByRole('button', { name: /alimentação/i });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');

    const market = screen.getByTestId('category-sub-market');
    expect(within(market).getByText('Mercado')).toBeInTheDocument();
    expect(within(market).getByText(/73%/)).toBeInTheDocument(); // 110000/150000 of the ROOT

    // Direct-on-root bucket appears when both levels have spending (FR-011).
    const direct = screen.getByTestId('category-sub-food-direct');
    expect(within(direct).getByText(/lançadas direto/i)).toBeInTheDocument();
    expect(within(direct).getByText(/27%/)).toBeInTheDocument(); // 40000/150000
  });

  it('renders an explanatory empty state without percentages (FR-016)', () => {
    render(
      <CategorySpendingList categories={[IDLE]} uncategorizedSpentCents={0} totalSpentCents={0} />,
    );
    expect(screen.getByText(/nenhuma despesa registrada neste mês/i)).toBeInTheDocument();
    expect(screen.queryByText(/%/)).not.toBeInTheDocument();
  });
});
