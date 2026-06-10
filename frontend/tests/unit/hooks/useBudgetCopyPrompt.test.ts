import { renderHook, act, waitFor } from '@testing-library/react';
import { useBudgetCopyPrompt } from '../../../src/hooks/useBudgetCopyPrompt';
import { budgetService } from '../../../src/services/budget.service';
import type { MonthBudget } from '../../../src/types/budget';

jest.mock('../../../src/services/budget.service', () => ({
  budgetService: { getMonth: jest.fn(), copyPrevious: jest.fn() },
}));

const svc = budgetService as unknown as { getMonth: jest.Mock; copyPrevious: jest.Mock };

function picture(overrides: Partial<MonthBudget>): MonthBudget {
  return {
    month: '2026-06',
    family: null,
    members: [],
    categories: [],
    summary: {
      familyAmountCents: null,
      totalAllocatedCents: 0,
      unallocatedCents: 0,
      allocatedPercent: null,
      unallocatedPercent: null,
    },
    warnings: [],
    ...overrides,
  };
}

describe('useBudgetCopyPrompt (FR-025)', () => {
  beforeEach(() => jest.clearAllMocks());

  it('prompts when the expense month is empty but the previous month has budgets', async () => {
    svc.getMonth.mockImplementation((m: string) =>
      Promise.resolve(
        m === '2026-06'
          ? picture({ month: '2026-06' }) // empty
          : picture({
              month: '2026-05',
              family: {
                limitType: 'ABSOLUTE',
                amountCents: 500000,
                percent: null,
                resolvedCents: 500000,
              },
            }),
      ),
    );
    const { result } = renderHook(() => useBudgetCopyPrompt());
    await act(async () => {
      await result.current.checkAfterExpense('2026-06-10');
    });
    await waitFor(() =>
      expect(result.current.prompt).toEqual({ fromMonth: '2026-05', toMonth: '2026-06' }),
    );
  });

  it('does NOT prompt when the month already has a budget', async () => {
    svc.getMonth.mockResolvedValue(
      picture({
        family: { limitType: 'ABSOLUTE', amountCents: 1, percent: null, resolvedCents: 1 },
      }),
    );
    const { result } = renderHook(() => useBudgetCopyPrompt());
    await act(async () => {
      await result.current.checkAfterExpense('2026-06-10');
    });
    expect(result.current.prompt).toBeNull();
  });
});
