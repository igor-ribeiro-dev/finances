import { act, renderHook, waitFor } from '@testing-library/react';

jest.mock('../../../src/services/category.service', () => ({
  categoryService: { listCategories: jest.fn() },
}));

import { categoryService } from '../../../src/services/category.service';
import { useCategoriesList } from '../../../src/hooks/useCategoriesList';
import type { Category } from '../../../src/types/category';

const listMock = categoryService.listCategories as jest.MockedFunction<
  typeof categoryService.listCategories
>;

function cat(id: string, name: string, parentId: string | null = null): Category {
  return { id, groupId: 'g', name, parentId, createdAt: '', updatedAt: '' };
}

describe('useCategoriesList', () => {
  beforeEach(() => jest.clearAllMocks());

  it('loads categories on mount and exposes them sorted (pt-BR)', async () => {
    listMock.mockResolvedValue([cat('1', 'Alvenaria'), cat('2', 'Águas')]);
    const { result } = renderHook(() => useCategoriesList());

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.categories.map((c) => c.name)).toEqual(['Águas', 'Alvenaria']);
    expect(result.current.error).toBeNull();
  });

  it('insertOptimistic adds and keeps the list sorted', async () => {
    listMock.mockResolvedValue([cat('1', 'Alvenaria')]);
    const { result } = renderHook(() => useCategoriesList());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => result.current.insertOptimistic(cat('2', 'Águas')));
    expect(result.current.categories.map((c) => c.name)).toEqual(['Águas', 'Alvenaria']);
  });

  it('removeOptimistic removes by id', async () => {
    listMock.mockResolvedValue([cat('1', 'A'), cat('2', 'B')]);
    const { result } = renderHook(() => useCategoriesList());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => result.current.removeOptimistic('1'));
    expect(result.current.categories.map((c) => c.id)).toEqual(['2']);
  });

  it('replaceOptimistic merges a patch', async () => {
    listMock.mockResolvedValue([cat('1', 'A')]);
    const { result } = renderHook(() => useCategoriesList());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => result.current.replaceOptimistic('1', { name: 'Z' }));
    expect(result.current.categories[0]!.name).toBe('Z');
  });

  it('refresh refetches', async () => {
    listMock
      .mockResolvedValueOnce([cat('1', 'A')])
      .mockResolvedValueOnce([cat('1', 'A'), cat('2', 'B')]);
    const { result } = renderHook(() => useCategoriesList());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.refresh();
    });
    expect(result.current.categories).toHaveLength(2);
  });

  it('exposes a byId map and a rootsById grouping of sub-categories', async () => {
    listMock.mockResolvedValue([cat('r', 'Alimentação'), cat('s', 'Mercado', 'r')]);
    const { result } = renderHook(() => useCategoriesList());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.byId.get('r')!.name).toBe('Alimentação');
    expect(result.current.rootsById.get('r')!.map((c) => c.id)).toEqual(['s']);
    expect(result.current.roots.map((c) => c.id)).toEqual(['r']);
  });
});
