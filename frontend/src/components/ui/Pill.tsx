import React, { type ReactNode } from 'react';
import { cn } from '@/lib/cn';

interface Props {
  selected?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function Pill({
  selected = false,
  disabled = false,
  onClick,
  icon,
  children,
  className,
}: Props) {
  return (
    <button
      type="button"
      onClick={disabled ? undefined : onClick}
      aria-pressed={selected}
      disabled={disabled}
      className={cn(
        'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium',
        'border transition-colors duration-200',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
        selected
          ? 'bg-primary text-primary-fg border-primary'
          : 'bg-surface text-fg-muted border-border hover:border-primary hover:text-fg',
        disabled && 'opacity-50 cursor-not-allowed',
        className,
      )}
    >
      {icon && <span aria-hidden="true">{icon}</span>}
      {children}
    </button>
  );
}
