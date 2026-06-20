import React, { type HTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

interface Props extends HTMLAttributes<HTMLDivElement> {
  interactive?: boolean;
}

export function GlassCard({ interactive = false, className, children, ...props }: Props) {
  return (
    <div
      {...props}
      className={cn(
        'glass rounded-xl shadow-overlay p-4',
        interactive &&
          'cursor-pointer hover:shadow-overlay transition-all duration-200 hover:scale-[1.01]',
        className,
      )}
    >
      {children}
    </div>
  );
}
