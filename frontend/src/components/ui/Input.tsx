import React, { type InputHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean;
}

export function Input({ invalid = false, className, ...props }: Props) {
  return (
    <input
      {...props}
      className={cn(
        'w-full rounded-lg px-3 py-2 text-sm',
        'bg-surface text-fg placeholder:text-fg-muted',
        'border transition-colors duration-200',
        'focus:outline-none focus:ring-2 focus:ring-primary',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        invalid ? 'border-danger focus:ring-danger' : 'border-border',
        className,
      )}
    />
  );
}
