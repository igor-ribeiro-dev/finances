import React, { type ReactNode } from 'react';
import { cn } from '@/lib/cn';

export type BadgeTone = 'default' | 'success' | 'danger' | 'warning' | 'primary';

interface Props {
  tone?: BadgeTone;
  children: ReactNode;
  className?: string;
}

const toneClasses: Record<BadgeTone, string> = {
  default: 'bg-surface text-fg-muted border border-border',
  success: 'bg-success/10 text-success success',
  danger: 'bg-danger/10 text-danger danger',
  warning: 'bg-accent/10 text-accent warning',
  primary: 'bg-primary/10 text-primary',
};

export function Badge({ tone = 'default', children, className }: Props) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
        toneClasses[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
