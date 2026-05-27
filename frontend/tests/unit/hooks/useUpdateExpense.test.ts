import { act, renderHook } from '@testing-library/react';

jest.mock('../../../src/services/expense.service', () => ({
  expenseService: {
    updateExpense: jest.fn(),
  },
}));

import { expenseService } from '../../../src/services/expense.service';
import { useUpdateExpense } from '../../../src/hooks/useUpdateExpense';
import type { Expense, ServiceError } from '../../../src/types/expense';

const updateMock = expenseService.updateExpense as jest.MockedFunction<
  typeof expenseService.updateExpense
>;

const body = {
  amountCents: 9999,
  date: '2026-05-21',
  description: 'Atualizado',
  paymentMethod: 'CREDIT_CARD' as const,
  ownerMemberId: 'm-2',
};

function mockExpense(): Expense {
  return {
    id: 'exp-1',
    groupId: 'g-1',
    amountCents: 9999,
    date: '2026-05-21',
    description: 'Atualizado',
    paymentMethod: 'CREDIT_CARD',
    ownerMemberId: 'm-2',
    ownerMember: { id: 'm-2', name: 'Bruno', isExMember: false },
    createdById: 'u-1',
    updatedById: 'u-2',
    createdAt: '2026-05-20T10:00:00Z',
    updatedAt: '2026-05-21T15:00:00Z',
  };
}

describe('useUpdateExpense', () => {
  beforeEach(() => jest.clearAllMocks());

  it('calls service and invokes onSuccess with the updated expense', async () => {
    updateMock.mockResolvedValue(mockExpense());
    const onSuccess = jest.fn();
    const { result } = renderHook(() => useUpdateExpense({ onSuccess }));

    await act(async () => {
      await result.current.submit('exp-1', body);
    });

    expect(updateMock).toHaveBeenCalledWith('exp-1', body);
    expect(onSuccess).toHaveBeenCalledWith(mockExpense());
  });

  it('exposes fieldErrors on validation failure', async () => {
    const err: ServiceError = {
      kind: 'validation',
      status: 400,
      message: 'Dados inválidos.',
      fieldErrors: [{ field: 'amountCents', code: 'too_small', message: 'X' }],
    };
    updateMock.mockRejectedValue(err);
    const onError = jest.fn();
    const { result } = renderHook(() => useUpdateExpense({ onError }));

    await act(async () => {
      await result.current.submit('exp-1', body);
    });

    expect(result.current.fieldErrors).toEqual(err.fieldErrors);
    expect(onError).toHaveBeenCalledWith(err);
  });

  it('invokes on404Concurrent when the service throws not_found', async () => {
    const err: ServiceError = { kind: 'not_found', message: 'Despesa não encontrada.' };
    updateMock.mockRejectedValue(err);
    const on404 = jest.fn();
    const onError = jest.fn();
    const { result } = renderHook(() => useUpdateExpense({ on404Concurrent: on404, onError }));

    await act(async () => {
      await result.current.submit('exp-1', body);
    });

    expect(on404).toHaveBeenCalledWith('exp-1');
    expect(onError).toHaveBeenCalledWith(err);
  });

  it('blocks concurrent submits while isSaving', async () => {
    let resolve!: (v: Expense) => void;
    updateMock.mockImplementationOnce(() => new Promise<Expense>((res) => (resolve = res)));

    const { result } = renderHook(() => useUpdateExpense());

    let p!: Promise<void>;
    act(() => {
      p = result.current.submit('exp-1', body);
    });
    await act(async () => {
      await result.current.submit('exp-1', body);
    });
    expect(updateMock).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolve(mockExpense());
      await p;
    });
  });
});
