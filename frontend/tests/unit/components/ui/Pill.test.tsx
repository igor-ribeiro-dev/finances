import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { Pill } from '@/components/ui/Pill';

describe('Pill', () => {
  it('renders label', () => {
    render(<Pill>Crédito</Pill>);
    expect(screen.getByText('Crédito')).toBeInTheDocument();
  });

  it('applies selected styles when selected', () => {
    const { container } = render(<Pill selected>Ativo</Pill>);
    expect((container.firstChild as HTMLElement)?.className).toMatch(/bg-primary/);
  });

  it('applies inactive styles when not selected', () => {
    const { container } = render(<Pill>Inativo</Pill>);
    expect((container.firstChild as HTMLElement)?.className).not.toMatch(/bg-primary/);
  });

  it('calls onClick when clicked', () => {
    const onClick = jest.fn();
    render(<Pill onClick={onClick}>Pagar</Pill>);
    fireEvent.click(screen.getByText('Pagar'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('does not call onClick when disabled', () => {
    const onClick = jest.fn();
    render(
      <Pill onClick={onClick} disabled>
        Desabilitado
      </Pill>,
    );
    fireEvent.click(screen.getByText('Desabilitado'));
    expect(onClick).not.toHaveBeenCalled();
  });

  it('applies disabled styles when disabled', () => {
    const { container } = render(<Pill disabled>Off</Pill>);
    expect((container.firstChild as HTMLElement)?.className).toMatch(/opacity/);
  });

  it('renders icon when provided', () => {
    const Icon = () => <span data-testid="icon">★</span>;
    render(<Pill icon={<Icon />}>Com ícone</Pill>);
    expect(screen.getByTestId('icon')).toBeInTheDocument();
  });
});
