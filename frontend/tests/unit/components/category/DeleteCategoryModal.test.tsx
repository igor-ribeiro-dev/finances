import '@testing-library/jest-dom';
import { render, screen, fireEvent } from '@testing-library/react';
import { DeleteCategoryModal } from '../../../../src/components/category/DeleteCategoryModal';

describe('DeleteCategoryModal (destructive)', () => {
  function renderDestructive(overrides = {}) {
    const onClose = jest.fn();
    const onConfirm = jest.fn();
    render(
      <DeleteCategoryModal
        open
        mode="destructive"
        categoryName="Alimentação"
        onClose={onClose}
        onConfirm={onConfirm}
        {...overrides}
      />,
    );
    return { onClose, onConfirm };
  }

  it('shows the destructive title, warning, and Cancelar/Excluir buttons', () => {
    renderDestructive();
    expect(screen.getByText('Excluir esta categoria?')).toBeInTheDocument();
    expect(screen.getByText(/não pode ser desfeita/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancelar' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Excluir' })).toBeInTheDocument();
  });

  it('calls onConfirm when Excluir is clicked', () => {
    const { onConfirm } = renderDestructive();
    fireEvent.click(screen.getByRole('button', { name: 'Excluir' }));
    expect(onConfirm).toHaveBeenCalled();
  });

  it('closes on Escape and on backdrop click', () => {
    const { onClose } = renderDestructive();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByTestId('modal-overlay'));
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it('disables both buttons while deleting', () => {
    renderDestructive({ isDeleting: true });
    expect(screen.getByRole('button', { name: 'Cancelar' })).toBeDisabled();
    expect(screen.getByRole('button', { name: /excluindo/i })).toBeDisabled();
  });
});

describe('DeleteCategoryModal (blocking)', () => {
  function renderBlocking(overrides = {}) {
    const onClose = jest.fn();
    const onConfirm = jest.fn();
    render(
      <DeleteCategoryModal
        open
        mode="blocking"
        categoryName="Alimentação"
        blockers={{ subCategoriesCount: 3, affectedExpensesCount: 12 }}
        onClose={onClose}
        onConfirm={onConfirm}
        {...overrides}
      />,
    );
    return { onClose, onConfirm };
  }

  it('shows the blocking title and the dependency counts', () => {
    renderBlocking();
    expect(screen.getByText('Não é possível excluir esta categoria')).toBeInTheDocument();
    expect(screen.getByText(/3 sub-categorias/i)).toBeInTheDocument();
    expect(screen.getByText(/12 despesas vinculadas/i)).toBeInTheDocument();
  });

  it('shows a single OK button and no Excluir button', () => {
    renderBlocking();
    expect(screen.getByRole('button', { name: 'OK' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Excluir' })).not.toBeInTheDocument();
  });

  it('closes on OK, Escape and backdrop, never calling onConfirm', () => {
    const { onClose, onConfirm } = renderBlocking();
    fireEvent.click(screen.getByRole('button', { name: 'OK' }));
    fireEvent.keyDown(document, { key: 'Escape' });
    fireEvent.click(screen.getByTestId('modal-overlay'));
    expect(onClose).toHaveBeenCalledTimes(3);
    expect(onConfirm).not.toHaveBeenCalled();
  });
});
