import { useLocation, useNavigate } from 'react-router-dom';
import { NAV_ITEMS } from '../../config/navigation';
import { NavigationItem } from './NavigationItem';
import { useAuth } from '../../contexts/AuthContext';
import { ThemeToggle } from '@/components/ui/ThemeToggle';

interface Props {
  onClose?: () => void;
}

export function Sidebar({ onClose }: Props) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  async function handleLogout() {
    await logout();
    onClose?.();
    navigate('/login', { replace: true });
  }

  return (
    <aside className="flex flex-col w-sidebar h-full bg-surface border-r border-border">
      <div className="glass border-b border-border/60 px-4 py-3 flex items-center justify-between">
        <div>
          <p className="text-xs text-primary font-semibold uppercase tracking-widest">
            Grupo Familiar
          </p>
          <p className="text-fg font-bold truncate">Finanças</p>
        </div>
        <ThemeToggle />
      </div>

      <nav className="flex-1 overflow-y-auto py-2">
        <ul role="list">
          {NAV_ITEMS.map((item) => (
            <NavigationItem
              key={item.id}
              item={item}
              isActive={location.pathname === item.path}
              onNavigate={item.status === 'active' ? onClose : undefined}
            />
          ))}
        </ul>
      </nav>

      <div className="px-4 py-3 border-t border-border">
        <p className="text-sm font-medium text-fg truncate">{user?.name}</p>
        <button
          onClick={handleLogout}
          className="mt-1 text-sm text-fg-muted hover:text-danger transition-colors"
        >
          Sair
        </button>
      </div>
    </aside>
  );
}
