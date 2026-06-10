import '@testing-library/jest-dom';
import { render, screen, fireEvent } from '@testing-library/react';
import { CategoryFormModal } from '../../../../src/components/category/CategoryFormModal';
import type { Category } from '../../../../src/types/category';

function root(id: string, name: string): Category {
  return { id, groupId: 'g', name, parentId: null, createdAt: '', updatedAt: '' };
}

const roots = [root('r1', 'Alimentação'), root('r2', 'Transporte')];

function renderModal(props: Partial<React.ComponentProps<typeof CategoryFormModal>> = {}) {
  const onSubmit = jest.fn();
  const onCancel = jest.fn();
  render(
    <CategoryFormModal
      open
      mode="create"
      roots={roots}
      isSaving={false}
      onSubmit={onSubmit}
      onCancel={onCancel}
      {...props}
    />,
  );
  return { onSubmit, onCancel };
}

describe('CategoryFormModal (create mode)', () => {
  it('shows the "Nova categoria" title and autofocuses the name input', () => {
    renderModal();
    expect(screen.getByText('Nova categoria')).toBeInTheDocument();
    expect(screen.getByLabelText('Nome')).toHaveFocus();
  });

  it('lists existing roots plus the "Criar como raiz" option', () => {
    renderModal();
    expect(screen.getByRole('option', { name: 'Criar como raiz' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Alimentação' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Transporte' })).toBeInTheDocument();
  });

  it('blocks submit and shows inline error when the name is empty', () => {
    const { onSubmit } = renderModal();
    fireEvent.submit(screen.getByLabelText('Nome').closest('form')!);
    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent(/informe um nome/i);
  });

  it('submits { name, parentId } with parentId null when "Criar como raiz" is selected', async () => {
    const { onSubmit } = renderModal();
    fireEvent.change(screen.getByLabelText('Nome'), { target: { value: '  Lazer  ' } });
    fireEvent.submit(screen.getByLabelText('Nome').closest('form')!);
    expect(onSubmit).toHaveBeenCalledWith({ name: 'Lazer', parentId: null });
  });

  it('submits with the selected root id as parentId', () => {
    const { onSubmit } = renderModal();
    fireEvent.change(screen.getByLabelText('Nome'), { target: { value: 'Mercado' } });
    fireEvent.change(screen.getByLabelText('Categoria pai'), { target: { value: 'r1' } });
    fireEvent.submit(screen.getByLabelText('Nome').closest('form')!);
    expect(onSubmit).toHaveBeenCalledWith({ name: 'Mercado', parentId: 'r1' });
  });

  it('calls onCancel on Escape and on backdrop click', () => {
    const { onCancel } = renderModal();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onCancel).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('dialog'));
    expect(onCancel).toHaveBeenCalledTimes(2);
  });

  it('ignores Escape and disables buttons while saving', () => {
    const { onCancel } = renderModal({ isSaving: true });
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onCancel).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: /salvando/i })).toBeDisabled();
  });

  it('renders server fieldErrors for name inline (422 duplicate_name)', () => {
    renderModal({
      fieldErrors: [
        {
          field: 'name',
          code: 'category.duplicate_name',
          message: 'Já existe uma categoria com esse nome neste nível.',
        },
      ],
    });
    expect(screen.getByText(/já existe uma categoria com esse nome/i)).toBeInTheDocument();
  });
});

describe('CategoryFormModal (edit mode)', () => {
  const rootSelf = root('r1', 'Alimentação');
  const otherRoot = root('r2', 'Transporte');

  it('shows the "Editar categoria" title and pre-fills the name', () => {
    renderModal({
      mode: 'edit',
      initial: { id: 'r1', name: 'Alimentação', parentId: null },
      roots: [rootSelf, otherRoot],
    });
    expect(screen.getByText('Editar categoria')).toBeInTheDocument();
    expect(screen.getByLabelText('Nome')).toHaveValue('Alimentação');
  });

  it('disables the parent picker and explains immutability when editing a root', () => {
    renderModal({
      mode: 'edit',
      initial: { id: 'r1', name: 'Alimentação', parentId: null },
      roots: [rootSelf, otherRoot],
    });
    expect(screen.getByLabelText('Categoria pai')).toBeDisabled();
    expect(screen.getByText(/não podem virar sub-categorias/i)).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Criar como raiz' })).toBeInTheDocument();
  });

  it('lists other roots (and no "Criar como raiz") when editing a sub-category', () => {
    renderModal({
      mode: 'edit',
      initial: { id: 's1', name: 'Mercado', parentId: 'r1' },
      roots: [rootSelf, otherRoot],
    });
    expect(screen.getByLabelText('Categoria pai')).not.toBeDisabled();
    expect(screen.queryByRole('option', { name: 'Criar como raiz' })).not.toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Alimentação' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Transporte' })).toBeInTheDocument();
  });

  it('submits { name, parentId } from the edited values', () => {
    const onSubmit = jest.fn();
    renderModal({
      mode: 'edit',
      initial: { id: 's1', name: 'Mercado', parentId: 'r1' },
      roots: [rootSelf, otherRoot],
      onSubmit,
    });
    fireEvent.change(screen.getByLabelText('Nome'), { target: { value: 'Feira' } });
    fireEvent.change(screen.getByLabelText('Categoria pai'), { target: { value: 'r2' } });
    fireEvent.submit(screen.getByLabelText('Nome').closest('form')!);
    expect(onSubmit).toHaveBeenCalledWith({ name: 'Feira', parentId: 'r2' });
  });
});
