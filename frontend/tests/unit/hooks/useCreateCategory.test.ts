import { act, renderHook } from '@testing-library/react';

jest.mock('../../../src/services/category.service', () => ({
  categoryService: { createCategory: jest.fn() },
}));

import { categoryService } from '../../../src/services/category.service';
import { useCreateCategory } from '../../../src/hooks/useCreateCategory';
import type { Category, CategoryServiceError } from '../../../src/types/category';

const createMock = categoryService.createCategory as jest.MockedFunction<
  typeof categoryService.createCategory
>;

const body = { name: 'Alimentação', parentId: null };

function mockCategory(): Category {
  return {
    id: 'c1',
    groupId: 'g',
    name: 'Alimentação',
    parentId: null,
    createdAt: '',
    updatedAt: '',
  };
}

describe('useCreateCategory', () => {
  beforeEach(() => jest.clearAllMocks());

  it('calls the service with an Idempotency-Key and invokes onSuccess', async () => {
    createMock.mockResolvedValue(mockCategory());
    const onSuccess = jest.fn();
    const { result } = renderHook(() => useCreateCategory({ onSuccess }));

    await act(async () => {
      await result.current.submit(body);
    });

    expect(createMock).toHaveBeenCalledTimes(1);
    const [, key] = createMock.mock.calls[0]!;
    expect(typeof key).toBe('string');
    expect(key.length).toBeGreaterThan(10);
    expect(onSuccess).toHaveBeenCalledWith(mockCategory());
  });

  it('keeps the key across a validation retry but rotates after success', async () => {
    const validationError: CategoryServiceError = {
      kind: 'validation',
      status: 400,
      message: 'Dados inválidos.',
      fieldErrors: [{ field: 'name', code: 'too_short', message: 'X' }],
    };
    createMock.mockRejectedValueOnce(validationError);
    createMock.mockResolvedValueOnce(mockCategory());
    createMock.mockResolvedValueOnce(mockCategory());

    const { result } = renderHook(() => useCreateCategory());

    await act(async () => {
      await result.current.submit(body);
    });
    expect(result.current.fieldErrors).toHaveLength(1);
    const firstKey = createMock.mock.calls[0]![1];

    await act(async () => {
      await result.current.submit(body);
    });
    expect(createMock.mock.calls[1]![1]).toBe(firstKey);

    await act(async () => {
      await result.current.submit(body);
    });
    expect(createMock.mock.calls[2]![1]).not.toBe(firstKey);
  });

  it('rotates the key on a network error', async () => {
    createMock.mockRejectedValueOnce({
      kind: 'network',
      message: 'Falha de rede.',
    } as CategoryServiceError);
    createMock.mockResolvedValueOnce(mockCategory());
    const { result } = renderHook(() => useCreateCategory());

    await act(async () => {
      await result.current.submit(body);
    });
    const firstKey = createMock.mock.calls[0]![1];
    await act(async () => {
      await result.current.submit(body);
    });
    expect(createMock.mock.calls[1]![1]).not.toBe(firstKey);
  });

  it('exposes fieldErrors on 422 validation failure', async () => {
    const validationError: CategoryServiceError = {
      kind: 'validation',
      status: 422,
      message: 'Dados inválidos.',
      fieldErrors: [{ field: 'name', code: 'category.duplicate_name', message: 'Duplicada' }],
    };
    createMock.mockRejectedValueOnce(validationError);
    const { result } = renderHook(() => useCreateCategory());

    await act(async () => {
      await result.current.submit(body);
    });
    expect(result.current.fieldErrors).toEqual(validationError.fieldErrors);
  });

  it('forwards a 409 idempotency conflict to onError', async () => {
    const conflict: CategoryServiceError = {
      kind: 'conflict',
      code: 'idempotency.conflict',
      message: 'Conflito.',
    };
    createMock.mockRejectedValueOnce(conflict);
    const onError = jest.fn();
    const { result } = renderHook(() => useCreateCategory({ onError }));

    await act(async () => {
      await result.current.submit(body);
    });
    expect(onError).toHaveBeenCalledWith(conflict);
  });
});
