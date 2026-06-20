import React from 'react';
import { render, screen } from '@testing-library/react';
import { Input } from '@/components/ui/Input';

describe('Input', () => {
  it('renders an input element', () => {
    render(<Input placeholder="Digite aqui" />);
    expect(screen.getByPlaceholderText('Digite aqui')).toBeInTheDocument();
  });

  it('applies invalid styles when invalid prop passed', () => {
    render(<Input invalid aria-label="Campo inválido" />);
    const input = screen.getByRole('textbox');
    expect(input.className).toMatch(/border-danger/);
  });

  it('applies normal styles when not invalid', () => {
    render(<Input aria-label="Normal" />);
    const input = screen.getByRole('textbox');
    expect(input.className).not.toMatch(/border-danger/);
  });

  it('forwards additional props', () => {
    render(<Input type="email" data-testid="email-input" />);
    expect(screen.getByTestId('email-input')).toHaveAttribute('type', 'email');
  });
});
