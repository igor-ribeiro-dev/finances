import '@testing-library/jest-dom';
import { render, screen, fireEvent } from '@testing-library/react';
import { PasswordInput } from '../../../src/components/auth/PasswordInput';

describe('PasswordInput', () => {
  it('shows all rules as unmet initially', () => {
    render(<PasswordInput value="" onChange={() => {}} />);
    expect(screen.getByText(/8 caracteres/)).toBeInTheDocument();
    expect(screen.getByText(/1 número/)).toBeInTheDocument();
    expect(screen.getByText(/1 letra maiúscula/)).toBeInTheDocument();
  });

  it('marks length rule as met when 8+ chars typed', () => {
    render(<PasswordInput value="abcdefgh" onChange={() => {}} />);
    const lengthRule = screen.getByTestId('rule-length');
    expect(lengthRule).toHaveClass('text-success');
  });

  it('marks digit rule as met when a number is present', () => {
    render(<PasswordInput value="abcdefg1" onChange={() => {}} />);
    expect(screen.getByTestId('rule-digit')).toHaveClass('text-success');
  });

  it('marks uppercase rule as met when an uppercase letter is present', () => {
    render(<PasswordInput value="Abcdefg1" onChange={() => {}} />);
    expect(screen.getByTestId('rule-upper')).toHaveClass('text-success');
  });

  it('calls onChange when input changes', () => {
    const onChange = jest.fn();
    render(<PasswordInput value="" onChange={onChange} />);
    fireEvent.change(document.querySelector('input[type="password"]')!, {
      target: { value: 'test' },
    });
    expect(onChange).toHaveBeenCalled();
  });
});
