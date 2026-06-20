import React, { type HTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

interface Props extends HTMLAttributes<HTMLDivElement> {
  interactive?: boolean;
}

export function Card({ interactive = false, className, children, ...props }: Props) {
  return (
    <div
      {...props}
      className={cn(
        'bg-surface rounded-lg shadow-card p-4',
        interactive && 'cursor-pointer hover:shadow-overlay transition-shadow duration-200',
        className,
      )}
    >
      {children}
    </div>
  );
}
