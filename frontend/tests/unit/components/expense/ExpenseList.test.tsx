import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import { ExpenseList } from '../../../../src/components/expense/ExpenseList';
import type { Expense } from '../../../../src/types/expense';

function mk(id: string): Expense {
  return {
    id,
    groupId: 'g-1',
    amountCents: 1000,
    date: '2026-05-20',
    description: `Item ${id}`,
    paymentMethod: 'CASH_OR_DEBIT',
    ownerMemberId: 'm-1',
    ownerMember: { id: 'm-1', name: 'Ana', isExMember: false },
    createdById: 'u-1',
    updatedById: 'u-1',
    createdAt: '2026-05-20T10:00:00Z',
    updatedAt: '2026-05-20T10:00:00Z',
  };
}

const baseProps = {
  items: [] as Expense[],
  nextCursor: null,
  isInitialLoading: false,
  isLoadingMore: false,
  onLoadMore: jest.fn(),
};

describe('ExpenseList', () => {
  it('shows skeleton while isInitialLoading', () => {
    const { container } = render(<ExpenseList {...baseProps} isInitialLoading items={[]} />);
    // Skeleton is aria-hidden — assert via container instead of role
    expect(container.querySelector('[aria-hidden="true"]')).toBeInTheDocument();
  });

  it('shows empty state with CTA when no items and not loading', () => {
    const onEmptyCta = jest.fn();
    render(<ExpenseList {...baseProps} onEmptyCta={onEmptyCta} />);
    expect(screen.getByText(/Você ainda não registrou nenhuma despesa/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Registrar primeira despesa/i })).toBeInTheDocument();
  });

  it('renders an item for each expense in the list', () => {
    const items = [mk('a'), mk('b'), mk('c')];
    render(<ExpenseList {...baseProps} items={items} />);
    expect(screen.getByText('Item a')).toBeInTheDocument();
    expect(screen.getByText('Item b')).toBeInTheDocument();
    expect(screen.getByText('Item c')).toBeInTheDocument();
  });

  it('renders the load-more sentinel when nextCursor is set', () => {
    render(<ExpenseList {...baseProps} items={[mk('a')]} nextCursor="cursor-xyz" />);
    expect(screen.getByText(/Role para carregar mais/i)).toBeInTheDocument();
  });

  it('shows "Carregando mais" when isLoadingMore', () => {
    render(<ExpenseList {...baseProps} items={[mk('a')]} nextCursor="cursor-xyz" isLoadingMore />);
    expect(screen.getByText(/Carregando mais/i)).toBeInTheDocument();
  });
});
