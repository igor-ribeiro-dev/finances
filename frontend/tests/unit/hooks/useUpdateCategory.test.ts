import { act, renderHook } from '@testing-library/react';

jest.mock('../../../src/services/category.service', () => ({
  categoryService: { updateCategory: jest.fn() },
}));

import { categoryService } from '../../../src/services/category.service';
import { useUpdateCategory } from '../../../src/hooks/useUpdateCategory';
import type { Category, CategoryServiceError } from '../../../src/types/category';

const updateMock = categoryService.updateCategory as jest.MockedFunction<
  typeof categoryService.updateCategory
>;

function mockCategory(): Category {
  return { id: 'c1', groupId: 'g', name: 'Comida', parentId: null, createdAt: '', updatedAt: '' };
}

describe('useUpdateCategory', () => {
  beforeEach(() => jest.clearAllMocks());

  it('calls the service and invokes onSuccess on 200', async () => {
    updateMock.mockResolvedValue(mockCategory());
    const onSuccess = jest.fn();
    const { result } = renderHook(() => useUpdateCategory({ onSuccess }));
    await act(async () => {
      await result.current.submit('c1', { name: 'Comida', parentId: null });
    });
    expect(updateMock).toHaveBeenCalledWith('c1', { name: 'Comida', parentId: null });
    expect(onSuccess).toHaveBeenCalledWith(mockCategory());
  });

  it('exposes fieldErrors on 422 validation', async () => {
    const err: CategoryServiceError = {
      kind: 'validation',
      status: 422,
      message: 'inválido',
      fieldErrors: [{ field: 'name', code: 'category.duplicate_name', message: 'Dup' }],
    };
    updateMock.mockRejectedValueOnce(err);
    const { result } = renderHook(() => useUpdateCategory());
    await act(async () => {
      await result.current.submit('c1', { name: 'Comida', parentId: null });
    });
    expect(result.current.fieldErrors).toEqual(err.fieldErrors);
  });

  it('propagates the role_immutable code to onError', async () => {
    const err: CategoryServiceError = {
      kind: 'validation',
      status: 422,
      message: 'imutável',
      fieldErrors: [{ field: 'parentId', code: 'category.role_immutable', message: 'x' }],
    };
    updateMock.mockRejectedValueOnce(err);
    const onError = jest.fn();
    const { result } = renderHook(() => useUpdateCategory({ onError }));
    await act(async () => {
      await result.current.submit('c1', { name: 'Comida', parentId: 'r2' });
    });
    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({
        fieldErrors: [expect.objectContaining({ code: 'category.role_immutable' })],
      }),
    );
  });
});
