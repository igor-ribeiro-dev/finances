import { useState, type ReactNode } from 'react';
import { Menu } from 'lucide-react';
import { Sidebar } from './Sidebar';

interface Props {
  children: ReactNode;
}

export function AppLayout({ children }: Props) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div className="flex h-screen">
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-40 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      <div className={isMobileMenuOpen ? 'flex fixed inset-y-0 left-0 z-50' : 'hidden md:flex'}>
        <Sidebar onClose={() => setIsMobileMenuOpen(false)} />
      </div>

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="md:hidden flex items-center px-4 py-3 bg-white border-b border-gray-200">
          <button onClick={() => setIsMobileMenuOpen(true)} aria-label="Abrir menu">
            <Menu size={20} />
          </button>
        </header>

        <main className="flex-1 overflow-auto bg-gray-50 p-4">
          <div className="rounded-lg shadow-card bg-white min-h-full">{children}</div>
        </main>
      </div>
    </div>
  );
}
