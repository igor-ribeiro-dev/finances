import { useState, type ReactNode } from 'react';
import { Menu } from 'lucide-react';
import { Sidebar } from './Sidebar';
import { ThemeToggle } from '@/components/ui/ThemeToggle';

interface Props {
  children: ReactNode;
}

export function AppLayout({ children }: Props) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div className="flex h-screen bg-bg">
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      <div className={isMobileMenuOpen ? 'flex fixed inset-y-0 left-0 z-50' : 'hidden md:flex'}>
        <Sidebar onClose={() => setIsMobileMenuOpen(false)} />
      </div>

      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <header className="md:hidden flex items-center justify-between px-4 py-3 glass border-b border-border">
          <button
            onClick={() => setIsMobileMenuOpen(true)}
            aria-label="Abrir menu"
            className="inline-flex items-center justify-center w-9 h-9 rounded-lg text-fg-muted hover:text-fg hover:bg-surface transition-colors"
          >
            <Menu size={20} aria-hidden="true" />
          </button>
          <ThemeToggle />
        </header>

        <main className="flex-1 overflow-auto p-4">
          <div className="rounded-xl bg-surface shadow-card min-h-full p-4">{children}</div>
        </main>
      </div>
    </div>
  );
}
