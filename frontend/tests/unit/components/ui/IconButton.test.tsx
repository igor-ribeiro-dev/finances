import React from 'react';
import { render, screen } from '@testing-library/react';
import { IconButton } from '@/components/ui/IconButton';
import { X } from 'lucide-react';

describe('IconButton', () => {
  it('renders a button with aria-label', () => {
    render(
      <IconButton aria-label="Fechar">
        <X />
      </IconButton>,
    );
    expect(screen.getByRole('button', { name: 'Fechar' })).toBeInTheDocument();
  });

  it('requires aria-label (TypeScript enforces; test checks presence)', () => {
    render(
      <IconButton aria-label="Deletar">
        <X />
      </IconButton>,
    );
    expect(screen.getByRole('button')).toHaveAttribute('aria-label', 'Deletar');
  });

  it('applies ghost variant by default', () => {
    render(
      <IconButton aria-label="Menu">
        <X />
      </IconButton>,
    );
    expect(screen.getByRole('button').className).toMatch(/ghost/);
  });

  it('is disabled when disabled prop passed', () => {
    render(
      <IconButton aria-label="Desabilitado" disabled>
        <X />
      </IconButton>,
    );
    expect(screen.getByRole('button')).toBeDisabled();
  });
});
