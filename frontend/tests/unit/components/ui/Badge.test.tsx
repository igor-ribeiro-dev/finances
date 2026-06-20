import React from 'react';
import { render, screen } from '@testing-library/react';
import { Badge } from '@/components/ui/Badge';

describe('Badge', () => {
  it('renders children', () => {
    render(<Badge>Pago</Badge>);
    expect(screen.getByText('Pago')).toBeInTheDocument();
  });

  it('applies success tone', () => {
    const { container } = render(<Badge tone="success">OK</Badge>);
    expect((container.firstChild as HTMLElement)?.className).toMatch(/success/);
  });

  it('applies danger tone', () => {
    const { container } = render(<Badge tone="danger">Erro</Badge>);
    expect((container.firstChild as HTMLElement)?.className).toMatch(/danger/);
  });

  it('applies default/neutral tone', () => {
    const { container } = render(<Badge>Neutro</Badge>);
    expect(container.firstChild).toBeTruthy();
  });
});
