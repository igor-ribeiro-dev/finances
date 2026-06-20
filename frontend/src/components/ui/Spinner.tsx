import React from 'react';
import { cn } from '@/lib/cn';

type SpinnerSize = 'sm' | 'md' | 'lg';

interface Props {
  size?: SpinnerSize;
  className?: string;
}

const sizeClasses: Record<SpinnerSize, string> = {
  sm: 'h-4 w-4 sm',
  md: 'h-5 w-5',
  lg: 'h-8 w-8 lg',
};

export function Spinner({ size = 'md', className }: Props) {
  return (
    <svg
      aria-hidden="true"
      className={cn('animate-spin text-current', sizeClasses[size], className)}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  );
}
