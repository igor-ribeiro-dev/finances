import { act, renderHook } from '@testing-library/react';

jest.mock('../../../src/services/category.service', () => ({
  categoryService: { previewDeleteCategory: jest.fn() },
}));

import { categoryService } from '../../../src/services/category.service';
import { useDeletePreview } from '../../../src/hooks/useDeletePreview';

const previewMock = categoryService.previewDeleteCategory as jest.MockedFunction<
  typeof categoryService.previewDeleteCategory
>;

describe('useDeletePreview', () => {
  beforeEach(() => jest.clearAllMocks());

  it('fetches the preview and exposes it', async () => {
    previewMock.mockResolvedValue({ subCategoriesCount: 1, affectedExpensesCount: 4 });
    const { result } = renderHook(() => useDeletePreview());
    await act(async () => {
      await result.current.fetch('c1');
    });
    expect(previewMock).toHaveBeenCalledWith('c1');
    expect(result.current.preview).toEqual({ subCategoriesCount: 1, affectedExpensesCount: 4 });
    expect(result.current.error).toBeNull();
  });

  it('caches per id within 1s (no second GET)', async () => {
    previewMock.mockResolvedValue({ subCategoriesCount: 0, affectedExpensesCount: 0 });
    const { result } = renderHook(() => useDeletePreview());
    await act(async () => {
      await result.current.fetch('c1');
    });
    await act(async () => {
      await result.current.fetch('c1');
    });
    expect(previewMock).toHaveBeenCalledTimes(1);
  });

  it('exposes the error when the request fails', async () => {
    previewMock.mockRejectedValueOnce({ kind: 'network', message: 'Falha de rede.' });
    const { result } = renderHook(() => useDeletePreview());
    await act(async () => {
      await result.current.fetch('c1');
    });
    expect(result.current.error).toMatchObject({ kind: 'network' });
    expect(result.current.preview).toBeNull();
  });
});
