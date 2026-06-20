import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { Modal } from '@/components/ui/Modal';

describe('Modal', () => {
  it('does not render when open=false', () => {
    render(
      <Modal open={false} onClose={() => {}} title="Teste">
        Conteúdo
      </Modal>,
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('renders when open=true', () => {
    render(
      <Modal open={true} onClose={() => {}} title="Teste">
        Conteúdo
      </Modal>,
    );
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('displays title', () => {
    render(
      <Modal open={true} onClose={() => {}} title="Meu Modal">
        Corpo
      </Modal>,
    );
    expect(screen.getByText('Meu Modal')).toBeInTheDocument();
  });

  it('renders children', () => {
    render(
      <Modal open={true} onClose={() => {}} title="Modal">
        Corpo do modal
      </Modal>,
    );
    expect(screen.getByText('Corpo do modal')).toBeInTheDocument();
  });

  it('calls onClose when overlay clicked', () => {
    const onClose = jest.fn();
    render(
      <Modal open={true} onClose={onClose} title="Modal">
        Corpo
      </Modal>,
    );
    const overlay =
      document.querySelector('[data-testid="modal-overlay"]') ||
      screen.getByRole('dialog').parentElement;
    if (overlay) fireEvent.click(overlay);
    expect(onClose).toHaveBeenCalled();
  });

  it('calls onClose when ESC pressed', () => {
    const onClose = jest.fn();
    render(
      <Modal open={true} onClose={onClose} title="Modal">
        Corpo
      </Modal>,
    );
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();
  });

  it('has role=dialog', () => {
    render(
      <Modal open={true} onClose={() => {}} title="Modal">
        Corpo
      </Modal>,
    );
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('renders footer when provided', () => {
    render(
      <Modal open={true} onClose={() => {}} title="Modal" footer={<button>Salvar</button>}>
        Corpo
      </Modal>,
    );
    expect(screen.getByRole('button', { name: 'Salvar' })).toBeInTheDocument();
  });
});
