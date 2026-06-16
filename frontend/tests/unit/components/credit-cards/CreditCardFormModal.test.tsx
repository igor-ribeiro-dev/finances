// T020 — US1 RTL for the credit-card form modal.
import '@testing-library/jest-dom';
import { render, screen, fireEvent } from '@testing-library/react';
import { CreditCardFormModal } from '../../../../src/components/credit-cards/CreditCardFormModal';

function renderModal(props: Partial<React.ComponentProps<typeof CreditCardFormModal>> = {}) {
  const onSubmit = jest.fn();
  const onCancel = jest.fn();
  render(
    <CreditCardFormModal
      open
      mode="create"
      isSaving={false}
      onSubmit={onSubmit}
      onCancel={onCancel}
      {...props}
    />,
  );
  return { onSubmit, onCancel };
}

describe('CreditCardFormModal (create mode)', () => {
  it('shows the "Novo cartão" title with name and closing-day fields', () => {
    renderModal();
    expect(screen.getByText('Novo cartão')).toBeInTheDocument();
    expect(screen.getByLabelText('Nome')).toBeInTheDocument();
    expect(screen.getByLabelText('Dia de fechamento da fatura')).toBeInTheDocument();
  });

  it('blocks submit and shows an inline error when the name is empty', () => {
    const { onSubmit } = renderModal();
    fireEvent.submit(screen.getByLabelText('Nome').closest('form')!);
    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByText(/informe um nome/i)).toBeInTheDocument();
  });

  it('blocks submit when closingDay is out of 1..31', () => {
    const { onSubmit } = renderModal();
    fireEvent.change(screen.getByLabelText('Nome'), { target: { value: 'Nubank' } });
    fireEvent.change(screen.getByLabelText('Dia de fechamento da fatura'), {
      target: { value: '40' },
    });
    fireEvent.submit(screen.getByLabelText('Nome').closest('form')!);
    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByText(/entre 1 e 31/i)).toBeInTheDocument();
  });

  it('submits { name, closingDay } trimmed when valid', () => {
    const { onSubmit } = renderModal();
    fireEvent.change(screen.getByLabelText('Nome'), { target: { value: '  Nubank  ' } });
    fireEvent.change(screen.getByLabelText('Dia de fechamento da fatura'), {
      target: { value: '10' },
    });
    fireEvent.submit(screen.getByLabelText('Nome').closest('form')!);
    expect(onSubmit).toHaveBeenCalledWith({ name: 'Nubank', closingDay: 10 });
  });

  it('renders the initial values in edit mode', () => {
    renderModal({ mode: 'edit', initial: { name: 'Itaú', closingDay: 5 } });
    expect(screen.getByText('Editar cartão')).toBeInTheDocument();
    expect(screen.getByLabelText('Nome')).toHaveValue('Itaú');
    expect(screen.getByLabelText('Dia de fechamento da fatura')).toHaveValue(5);
  });
});
