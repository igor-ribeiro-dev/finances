import React, { type ButtonHTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/lib/cn';

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  'aria-label': string;
  children: ReactNode;
  variant?: 'ghost' | 'primary';
  size?: 'sm' | 'md';
}

export function IconButton({
  variant = 'ghost',
  size = 'md',
  children,
  className,
  ...props
}: Props) {
  const sizeClass = size === 'sm' ? 'w-7 h-7' : 'w-9 h-9';
  const variantClass =
    variant === 'primary'
      ? 'bg-primary text-primary-fg hover:bg-primary-hover'
      : 'text-fg-muted hover:text-fg hover:bg-surface ghost';

  return (
    <button
      type="button"
      {...props}
      className={cn(
        'inline-flex items-center justify-center rounded-lg transition-colors duration-200',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        variantClass,
        sizeClass,
        className,
      )}
    >
      {children}
    </button>
  );
}
