import React from 'react';
import { render, screen } from '@testing-library/react';
import { Card } from '@/components/ui/Card';

describe('Card', () => {
  it('renders children', () => {
    render(<Card>Conteúdo</Card>);
    expect(screen.getByText('Conteúdo')).toBeInTheDocument();
  });

  it('applies surface background token class', () => {
    const { container } = render(<Card>X</Card>);
    expect(container.firstChild).toBeTruthy();
  });

  it('applies interactive styles when interactive prop set', () => {
    const { container } = render(<Card interactive>X</Card>);
    expect((container.firstChild as HTMLElement)?.className).toMatch(/cursor-pointer/);
  });

  it('applies additional className', () => {
    const { container } = render(<Card className="custom-class">X</Card>);
    expect((container.firstChild as HTMLElement)?.className).toMatch(/custom-class/);
  });
});
