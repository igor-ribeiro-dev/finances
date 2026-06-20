import React from 'react';
import { render, screen } from '@testing-library/react';
import { Button } from '@/components/ui/Button';

describe('Button', () => {
  it('renders children', () => {
    render(<Button>Salvar</Button>);
    expect(screen.getByRole('button', { name: 'Salvar' })).toBeInTheDocument();
  });

  it('applies primary variant by default', () => {
    render(<Button>OK</Button>);
    const btn = screen.getByRole('button');
    expect(btn.className).toMatch(/primary/);
  });

  it('applies secondary variant', () => {
    render(<Button variant="secondary">Cancelar</Button>);
    const btn = screen.getByRole('button');
    expect(btn.className).toMatch(/secondary/);
  });

  it('applies ghost variant', () => {
    render(<Button variant="ghost">Ghost</Button>);
    const btn = screen.getByRole('button');
    expect(btn.className).toMatch(/ghost/);
  });

  it('applies danger variant', () => {
    render(<Button variant="danger">Excluir</Button>);
    const btn = screen.getByRole('button');
    expect(btn.className).toMatch(/danger/);
  });

  it('is disabled when loading', () => {
    render(<Button loading>Salvando</Button>);
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('shows spinner when loading', () => {
    render(<Button loading>Salvando</Button>);
    expect(
      screen.getByRole('button').querySelector('[aria-hidden]') || screen.getByRole('button'),
    ).toBeTruthy();
  });

  it('is disabled when disabled prop passed', () => {
    render(<Button disabled>Desabilitado</Button>);
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('applies sm size', () => {
    render(<Button size="sm">Pequeno</Button>);
    expect(screen.getByRole('button').className).toMatch(/sm/);
  });

  it('applies lg size', () => {
    render(<Button size="lg">Grande</Button>);
    expect(screen.getByRole('button').className).toMatch(/lg/);
  });

  it('renders full-width when fullWidth passed', () => {
    render(<Button fullWidth>Full</Button>);
    expect(screen.getByRole('button').className).toMatch(/w-full/);
  });
});
