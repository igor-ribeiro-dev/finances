import React from 'react';
import { render, screen } from '@testing-library/react';
import { GlassCard } from '@/components/ui/GlassCard';

describe('GlassCard', () => {
  it('renders children', () => {
    render(<GlassCard>Resumo</GlassCard>);
    expect(screen.getByText('Resumo')).toBeInTheDocument();
  });

  it('applies glass utility class', () => {
    const { container } = render(<GlassCard>X</GlassCard>);
    expect((container.firstChild as HTMLElement)?.className).toMatch(/glass/);
  });

  it('applies shadow-overlay', () => {
    const { container } = render(<GlassCard>X</GlassCard>);
    expect((container.firstChild as HTMLElement)?.className).toMatch(/shadow-overlay/);
  });

  it('applies interactive styles when interactive prop set', () => {
    const { container } = render(<GlassCard interactive>X</GlassCard>);
    expect((container.firstChild as HTMLElement)?.className).toMatch(/cursor-pointer/);
  });
});
