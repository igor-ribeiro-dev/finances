import '@testing-library/jest-dom';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';

jest.mock('../../../../src/services/category.service', () => ({
  categoryService: {
    listCategories: jest.fn(),
    createCategory: jest.fn(),
  },
}));

import { categoryService } from '../../../../src/services/category.service';
import { CategoriesPage } from '../../../../src/pages/CategoriesPage';
import type { Category } from '../../../../src/types/category';

const listMock = categoryService.listCategories as jest.MockedFunction<
  typeof categoryService.listCategories
>;

function cat(id: string, name: string, parentId: string | null = null): Category {
  return { id, groupId: 'g', name, parentId, createdAt: '', updatedAt: '' };
}

describe('CategoriesPage', () => {
  beforeEach(() => jest.clearAllMocks());

  it('shows a loading state while categories load', () => {
    listMock.mockReturnValue(new Promise(() => {})); // never resolves
    render(<CategoriesPage />);
    expect(screen.getByText('Carregando categorias…')).toBeInTheDocument();
  });

  it('renders the empty state with a CTA when there are no categories', async () => {
    listMock.mockResolvedValue([]);
    render(<CategoriesPage />);
    expect(
      await screen.findByRole('button', { name: /cadastre sua primeira categoria/i }),
    ).toBeInTheDocument();
  });

  it('renders the tree once categories load', async () => {
    listMock.mockResolvedValue([cat('r', 'Alimentação')]);
    render(<CategoriesPage />);
    expect(await screen.findByText('Alimentação')).toBeInTheDocument();
  });

  it('opens an empty create modal (name focused) when clicking "Nova categoria"', async () => {
    listMock.mockResolvedValue([]);
    render(<CategoriesPage />);
    await waitFor(() => expect(listMock).toHaveBeenCalled());

    fireEvent.click(screen.getByRole('button', { name: /nova categoria/i }));

    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByRole('heading', { name: 'Nova categoria' })).toBeInTheDocument();
    expect(screen.getByLabelText('Nome')).toHaveFocus();
  });
});
