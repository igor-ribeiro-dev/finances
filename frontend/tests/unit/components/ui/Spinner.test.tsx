import React from 'react';
import { render } from '@testing-library/react';
import { Spinner } from '@/components/ui/Spinner';

describe('Spinner', () => {
  it('renders without crashing', () => {
    const { container } = render(<Spinner />);
    expect(container.firstChild).toBeTruthy();
  });

  it('has aria-hidden by default', () => {
    const { container } = render(<Spinner />);
    expect((container.firstChild as HTMLElement)?.getAttribute('aria-hidden')).toBe('true');
  });

  it('applies sm size class', () => {
    const { container } = render(<Spinner size="sm" />);
    const cls = (container.firstChild as Element)?.getAttribute('class') ?? '';
    expect(cls).toMatch(/h-4|w-4|sm/);
  });

  it('applies lg size class', () => {
    const { container } = render(<Spinner size="lg" />);
    const cls = (container.firstChild as Element)?.getAttribute('class') ?? '';
    expect(cls).toMatch(/h-8|w-8|lg/);
  });
});
