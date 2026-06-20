import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '@/theme/useTheme';
import { cn } from '@/lib/cn';

interface Props {
  className?: string;
}

export function ThemeToggle({ className }: Props) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? 'Mudar para tema claro' : 'Mudar para tema escuro'}
      className={cn(
        'inline-flex items-center justify-center w-9 h-9 rounded-lg',
        'text-fg-muted hover:text-fg hover:bg-surface',
        'transition-colors duration-200',
        className,
      )}
    >
      {isDark ? <Sun size={18} aria-hidden="true" /> : <Moon size={18} aria-hidden="true" />}
    </button>
  );
}
