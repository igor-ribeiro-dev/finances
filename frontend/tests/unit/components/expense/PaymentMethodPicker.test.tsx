import '@testing-library/jest-dom';
import { render, screen, fireEvent } from '@testing-library/react';
import { PaymentMethodPicker } from '../../../../src/components/expense/PaymentMethodPicker';

describe('PaymentMethodPicker', () => {
  it('renders an accessible radiogroup with two options', () => {
    render(<PaymentMethodPicker value="CASH_OR_DEBIT" onChange={() => undefined} />);
    expect(screen.getByRole('radiogroup')).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Dinheiro/Débito' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Cartão de Crédito' })).toBeInTheDocument();
  });

  it('marks the current value as aria-checked', () => {
    render(<PaymentMethodPicker value="CREDIT_CARD" onChange={() => undefined} />);
    expect(screen.getByRole('radio', { name: 'Cartão de Crédito' })).toHaveAttribute(
      'aria-checked',
      'true',
    );
    expect(screen.getByRole('radio', { name: 'Dinheiro/Débito' })).toHaveAttribute(
      'aria-checked',
      'false',
    );
  });

  it('calls onChange when an option is clicked', () => {
    const onChange = jest.fn();
    render(<PaymentMethodPicker value="CASH_OR_DEBIT" onChange={onChange} />);
    fireEvent.click(screen.getByRole('radio', { name: 'Cartão de Crédito' }));
    expect(onChange).toHaveBeenCalledWith('CREDIT_CARD');
  });

  it('disables all options when disabled', () => {
    render(<PaymentMethodPicker value="CASH_OR_DEBIT" onChange={() => undefined} disabled />);
    expect(screen.getByRole('radio', { name: 'Dinheiro/Débito' })).toBeDisabled();
    expect(screen.getByRole('radio', { name: 'Cartão de Crédito' })).toBeDisabled();
  });
});
