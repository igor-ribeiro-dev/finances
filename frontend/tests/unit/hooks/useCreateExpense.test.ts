import { act, renderHook } from '@testing-library/react';

jest.mock('../../../src/services/expense.service', () => ({
  expenseService: {
    createExpense: jest.fn(),
  },
}));

import { expenseService } from '../../../src/services/expense.service';
import { useCreateExpense } from '../../../src/hooks/useCreateExpense';
import type { Expense, ServiceError } from '../../../src/types/expense';

const createMock = expenseService.createExpense as jest.MockedFunction<
  typeof expenseService.createExpense
>;

const body = {
  amountCents: 12345,
  date: '2026-05-20',
  description: 'Mercado',
  paymentMethod: 'CASH_OR_DEBIT' as const,
  ownerMemberId: 'm-1',
};

function mockExpense(): Expense {
  return {
    id: 'exp-1',
    groupId: 'g-1',
    amountCents: 12345,
    date: '2026-05-20',
    description: 'Mercado',
    paymentMethod: 'CASH_OR_DEBIT',
    ownerMemberId: 'm-1',
    ownerMember: { id: 'm-1', name: 'Ana', isExMember: false },
    createdById: 'u-1',
    updatedById: 'u-1',
    createdAt: '2026-05-20T10:00:00Z',
    updatedAt: '2026-05-20T10:00:00Z',
  };
}

describe('useCreateExpense', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // jsdom has crypto.randomUUID since Node 20+
  });

  it('calls service with an Idempotency-Key and invokes onSuccess with the new expense', async () => {
    createMock.mockResolvedValue(mockExpense());
    const onSuccess = jest.fn();
    const { result } = renderHook(() => useCreateExpense({ onSuccess }));

    await act(async () => {
      await result.current.submit(body);
    });

    expect(createMock).toHaveBeenCalledTimes(1);
    const [, key] = createMock.mock.calls[0]!;
    expect(typeof key).toBe('string');
    expect(key.length).toBeGreaterThan(10);
    expect(onSuccess).toHaveBeenCalledWith(mockExpense());
  });

  it('keeps the same Idempotency-Key across a validation-error retry but rotates after success', async () => {
    const validationError: ServiceError = {
      kind: 'validation',
      status: 400,
      message: 'Dados inválidos.',
      fieldErrors: [{ field: 'description', code: 'too_short', message: 'X' }],
    };
    createMock.mockRejectedValueOnce(validationError);
    createMock.mockResolvedValueOnce(mockExpense());
    createMock.mockResolvedValueOnce(mockExpense());

    const { result } = renderHook(() => useCreateExpense());

    // First attempt fails validation — key cached for retry
    await act(async () => {
      await result.current.submit(body);
    });
    expect(result.current.fieldErrors).toHaveLength(1);
    const firstKey = createMock.mock.calls[0]![1];

    // Retry uses the SAME key (same logical intent)
    await act(async () => {
      await result.current.submit(body);
    });
    const secondKey = createMock.mock.calls[1]![1];
    expect(secondKey).toBe(firstKey);

    // Third submit (new intent) generates a NEW key
    await act(async () => {
      await result.current.submit(body);
    });
    const thirdKey = createMock.mock.calls[2]![1];
    expect(thirdKey).not.toBe(firstKey);
  });

  it('rotates key on non-validation errors (so next submit retries fresh)', async () => {
    const networkErr: ServiceError = { kind: 'network', message: 'Falha de rede.' };
    createMock.mockRejectedValueOnce(networkErr);
    createMock.mockResolvedValueOnce(mockExpense());

    const { result } = renderHook(() => useCreateExpense());

    await act(async () => {
      await result.current.submit(body);
    });
    const firstKey = createMock.mock.calls[0]![1];

    await act(async () => {
      await result.current.submit(body);
    });
    const secondKey = createMock.mock.calls[1]![1];
    expect(secondKey).not.toBe(firstKey);
  });

  it('exposes fieldErrors on validation failure and clears via resetFieldErrors', async () => {
    const validationError: ServiceError = {
      kind: 'validation',
      status: 400,
      message: 'Dados inválidos.',
      fieldErrors: [{ field: 'amountCents', code: 'too_small', message: 'Valor zero' }],
    };
    createMock.mockRejectedValueOnce(validationError);

    const { result } = renderHook(() => useCreateExpense());

    await act(async () => {
      await result.current.submit(body);
    });
    expect(result.current.fieldErrors).toEqual(validationError.fieldErrors);

    act(() => result.current.resetFieldErrors());
    expect(result.current.fieldErrors).toEqual([]);
  });

  it('forwards categoryId in the submitted body', async () => {
    createMock.mockResolvedValue(mockExpense());
    const { result } = renderHook(() => useCreateExpense());
    await act(async () => {
      await result.current.submit({ ...body, categoryId: 'cat-1' });
    });
    expect(createMock.mock.calls[0]![0]).toMatchObject({ categoryId: 'cat-1' });
  });

  it('invokes onConcurrentCategoryRemoval when the response carries the warning (FR-018)', async () => {
    createMock.mockResolvedValue({ ...mockExpense(), warnings: ['category.removed_concurrently'] });
    const onConcurrentCategoryRemoval = jest.fn();
    const { result } = renderHook(() => useCreateExpense({ onConcurrentCategoryRemoval }));
    await act(async () => {
      await result.current.submit(body);
    });
    expect(onConcurrentCategoryRemoval).toHaveBeenCalled();
  });

  it('blocks concurrent submits while isSaving', async () => {
    let resolveCreate!: (v: Expense) => void;
    createMock.mockImplementationOnce(() => new Promise<Expense>((res) => (resolveCreate = res)));
    const { result } = renderHook(() => useCreateExpense());

    let promise!: Promise<void>;
    act(() => {
      promise = result.current.submit(body);
    });
    // Second submit while saving — should be a no-op
    await act(async () => {
      await result.current.submit(body);
    });
    expect(createMock).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveCreate(mockExpense());
      await promise;
    });
  });
});
