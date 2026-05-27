import { act, renderHook, waitFor } from '@testing-library/react';

jest.mock('../../../src/services/expense.service', () => ({
  expenseService: {
    listExpenses: jest.fn(),
  },
}));

import { expenseService } from '../../../src/services/expense.service';
import { useExpensesList } from '../../../src/hooks/useExpensesList';
import type { Expense } from '../../../src/types/expense';

const listMock = expenseService.listExpenses as jest.MockedFunction<
  typeof expenseService.listExpenses
>;

function mk(id: string, date = '2026-05-20'): Expense {
  return {
    id,
    groupId: 'g-1',
    amountCents: 100,
    date,
    description: id,
    paymentMethod: 'CASH_OR_DEBIT',
    ownerMemberId: 'm-1',
    ownerMember: { id: 'm-1', name: 'Ana', isExMember: false },
    createdById: 'u-1',
    updatedById: 'u-1',
    createdAt: '2026-05-20T10:00:00Z',
    updatedAt: '2026-05-20T10:00:00Z',
  };
}

describe('useExpensesList', () => {
  beforeEach(() => jest.clearAllMocks());

  it('loads the first page on mount', async () => {
    listMock.mockResolvedValue({ items: [mk('a')], nextCursor: null });
    const { result } = renderHook(() => useExpensesList());

    expect(result.current.isInitialLoading).toBe(true);
    await waitFor(() => expect(result.current.isInitialLoading).toBe(false));
    expect(result.current.items).toHaveLength(1);
    expect(result.current.nextCursor).toBeNull();
  });

  it('loadMore fetches the next page using nextCursor and appends items', async () => {
    listMock.mockResolvedValueOnce({ items: [mk('a'), mk('b')], nextCursor: 'cursor-1' });
    listMock.mockResolvedValueOnce({ items: [mk('c')], nextCursor: null });

    const { result } = renderHook(() => useExpensesList());
    await waitFor(() => expect(result.current.isInitialLoading).toBe(false));

    await act(async () => {
      await result.current.loadMore();
    });

    expect(listMock).toHaveBeenCalledTimes(2);
    expect(listMock.mock.calls[1]![0]?.cursor).toBe('cursor-1');
    expect(result.current.items.map((i) => i.id)).toEqual(['a', 'b', 'c']);
    expect(result.current.nextCursor).toBeNull();
  });

  it('prependItem adds to the head (used by optimistic create)', async () => {
    listMock.mockResolvedValue({ items: [mk('a')], nextCursor: null });
    const { result } = renderHook(() => useExpensesList());
    await waitFor(() => expect(result.current.isInitialLoading).toBe(false));

    act(() => result.current.prependItem(mk('new')));
    expect(result.current.items.map((i) => i.id)).toEqual(['new', 'a']);
  });

  it('replaceItem swaps an item in place by id', async () => {
    listMock.mockResolvedValue({ items: [mk('a'), mk('b')], nextCursor: null });
    const { result } = renderHook(() => useExpensesList());
    await waitFor(() => expect(result.current.isInitialLoading).toBe(false));

    const updated = { ...mk('a'), description: 'updated' };
    act(() => result.current.replaceItem('a', updated));
    expect(result.current.items[0]?.description).toBe('updated');
    expect(result.current.items[1]?.id).toBe('b');
  });

  it('removeItem filters by id', async () => {
    listMock.mockResolvedValue({ items: [mk('a'), mk('b'), mk('c')], nextCursor: null });
    const { result } = renderHook(() => useExpensesList());
    await waitFor(() => expect(result.current.isInitialLoading).toBe(false));

    act(() => result.current.removeItem('b'));
    expect(result.current.items.map((i) => i.id)).toEqual(['a', 'c']);
  });

  it('does not call loadMore when nextCursor is null', async () => {
    listMock.mockResolvedValue({ items: [], nextCursor: null });
    const { result } = renderHook(() => useExpensesList());
    await waitFor(() => expect(result.current.isInitialLoading).toBe(false));

    await act(async () => {
      await result.current.loadMore();
    });
    expect(listMock).toHaveBeenCalledTimes(1);
  });
});
