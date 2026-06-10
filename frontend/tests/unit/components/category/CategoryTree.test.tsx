import '@testing-library/jest-dom';
import { render, screen, fireEvent } from '@testing-library/react';
import { CategoryTree } from '../../../../src/components/category/CategoryTree';
import type { Category } from '../../../../src/types/category';

function cat(id: string, name: string, parentId: string | null): Category {
  return { id, groupId: 'g', name, parentId, createdAt: '', updatedAt: '' };
}

function editTargets(): string[] {
  return screen
    .getAllByRole('button', { name: /^Editar / })
    .map((b) => b.getAttribute('aria-label')!.replace('Editar ', ''));
}

describe('CategoryTree', () => {
  it('renders roots in pt-BR alphabetical order', () => {
    render(
      <CategoryTree
        categories={[
          cat('1', 'Alvenaria', null),
          cat('2', 'Águas', null),
          cat('3', 'Alimentação', null),
        ]}
        onEdit={jest.fn()}
        onDelete={jest.fn()}
      />,
    );
    expect(editTargets()).toEqual(['Águas', 'Alimentação', 'Alvenaria']);
  });

  it('nests sub-categories under the correct root in alphabetical order', () => {
    render(
      <CategoryTree
        categories={[
          cat('r', 'Alimentação', null),
          cat('s1', 'Mercado', 'r'),
          cat('s2', 'Açougue', 'r'),
        ]}
        onEdit={jest.fn()}
        onDelete={jest.fn()}
      />,
    );
    expect(editTargets()).toEqual(['Alimentação', 'Açougue', 'Mercado']);
  });

  it('renders an empty state with a CTA when there are no categories', () => {
    const onCreateFirst = jest.fn();
    render(
      <CategoryTree
        categories={[]}
        onEdit={jest.fn()}
        onDelete={jest.fn()}
        onCreateFirst={onCreateFirst}
      />,
    );
    const cta = screen.getByRole('button', { name: /cadastre sua primeira categoria/i });
    fireEvent.click(cta);
    expect(onCreateFirst).toHaveBeenCalled();
  });

  it('ignores orphan sub-categories whose parent is absent (defensive)', () => {
    render(
      <CategoryTree
        categories={[cat('r', 'Alimentação', null), cat('orphan', 'Fantasma', 'missing-root')]}
        onEdit={jest.fn()}
        onDelete={jest.fn()}
      />,
    );
    expect(screen.queryByText('Fantasma')).not.toBeInTheDocument();
  });

  it('fires onEdit and onDelete with the category', () => {
    const onEdit = jest.fn();
    const onDelete = jest.fn();
    const c = cat('r', 'Alimentação', null);
    render(<CategoryTree categories={[c]} onEdit={onEdit} onDelete={onDelete} />);
    fireEvent.click(screen.getByRole('button', { name: 'Editar Alimentação' }));
    fireEvent.click(screen.getByRole('button', { name: 'Excluir Alimentação' }));
    expect(onEdit).toHaveBeenCalledWith(c);
    expect(onDelete).toHaveBeenCalledWith(c);
  });
});
