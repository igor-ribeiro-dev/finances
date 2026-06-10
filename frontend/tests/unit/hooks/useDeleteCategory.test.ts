import { act, renderHook } from '@testing-library/react';

jest.mock('../../../src/services/category.service', () => ({
  categoryService: { deleteCategory: jest.fn() },
}));

import { categoryService } from '../../../src/services/category.service';
import { useDeleteCategory } from '../../../src/hooks/useDeleteCategory';
import type { CategoryServiceError } from '../../../src/types/category';

const deleteMock = categoryService.deleteCategory as jest.MockedFunction<
  typeof categoryService.deleteCategory
>;

describe('useDeleteCategory', () => {
  beforeEach(() => jest.clearAllMocks());

  it('invokes onSuccess(id) on 204', async () => {
    deleteMock.mockResolvedValue(undefined);
    const onSuccess = jest.fn();
    const { result } = renderHook(() => useDeleteCategory({ onSuccess }));
    await act(async () => {
      await result.current.remove('c1');
    });
    expect(onSuccess).toHaveBeenCalledWith('c1');
  });

  it('invokes onBlocked with blockers on 409 has_dependencies (not onSuccess)', async () => {
    const conflict: CategoryServiceError = {
      kind: 'conflict',
      code: 'category.has_dependencies',
      message: 'bloqueada',
      blockers: { subCategoriesCount: 2, affectedExpensesCount: 5 },
    };
    deleteMock.mockRejectedValueOnce(conflict);
    const onSuccess = jest.fn();
    const onBlocked = jest.fn();
    const { result } = renderHook(() => useDeleteCategory({ onSuccess, onBlocked }));
    await act(async () => {
      await result.current.remove('c1');
    });
    expect(onBlocked).toHaveBeenCalledWith({ subCategoriesCount: 2, affectedExpensesCount: 5 });
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it('invokes onError on a network error', async () => {
    deleteMock.mockRejectedValueOnce({
      kind: 'network',
      message: 'Falha de rede.',
    } as CategoryServiceError);
    const onError = jest.fn();
    const { result } = renderHook(() => useDeleteCategory({ onError }));
    await act(async () => {
      await result.current.remove('c1');
    });
    expect(onError).toHaveBeenCalled();
  });
});
