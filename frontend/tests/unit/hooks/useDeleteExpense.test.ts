import { act, renderHook } from '@testing-library/react';

jest.mock('../../../src/services/expense.service', () => ({
  expenseService: {
    deleteExpense: jest.fn(),
  },
}));

import { expenseService } from '../../../src/services/expense.service';
import { useDeleteExpense } from '../../../src/hooks/useDeleteExpense';
import type { ServiceError } from '../../../src/types/expense';

const deleteMock = expenseService.deleteExpense as jest.MockedFunction<
  typeof expenseService.deleteExpense
>;

describe('useDeleteExpense', () => {
  beforeEach(() => jest.clearAllMocks());

  it('calls service and invokes onSuccess on 204', async () => {
    deleteMock.mockResolvedValue(undefined);
    const onSuccess = jest.fn();
    const { result } = renderHook(() => useDeleteExpense({ onSuccess }));

    await act(async () => {
      await result.current.remove('exp-1');
    });

    expect(deleteMock).toHaveBeenCalledWith('exp-1');
    expect(onSuccess).toHaveBeenCalledWith('exp-1');
  });

  it('treats 404 as silent success (no onError, calls onSuccess)', async () => {
    const err: ServiceError = { kind: 'not_found', message: 'Despesa não encontrada.' };
    deleteMock.mockRejectedValue(err);

    const onSuccess = jest.fn();
    const onError = jest.fn();
    const { result } = renderHook(() => useDeleteExpense({ onSuccess, onError }));

    await act(async () => {
      await result.current.remove('exp-1');
    });

    expect(onSuccess).toHaveBeenCalledWith('exp-1');
    expect(onError).not.toHaveBeenCalled();
  });

  it('calls onError for non-404 failures', async () => {
    const err: ServiceError = { kind: 'network', message: 'Falha de rede.' };
    deleteMock.mockRejectedValue(err);

    const onSuccess = jest.fn();
    const onError = jest.fn();
    const { result } = renderHook(() => useDeleteExpense({ onSuccess, onError }));

    await act(async () => {
      await result.current.remove('exp-1');
    });

    expect(onSuccess).not.toHaveBeenCalled();
    expect(onError).toHaveBeenCalledWith(err);
  });

  it('blocks concurrent calls while isDeleting', async () => {
    let resolve!: () => void;
    deleteMock.mockImplementationOnce(() => new Promise<void>((res) => (resolve = res)));

    const { result } = renderHook(() => useDeleteExpense());
    let p!: Promise<void>;
    act(() => {
      p = result.current.remove('exp-1');
    });
    await act(async () => {
      await result.current.remove('exp-1');
    });
    expect(deleteMock).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolve();
      await p;
    });
  });
});
