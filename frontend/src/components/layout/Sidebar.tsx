import { useLocation, useNavigate } from 'react-router-dom';
import { NAV_ITEMS } from '../../config/navigation';
import { NavigationItem } from './NavigationItem';
import { useAuth } from '../../contexts/AuthContext';

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
    <aside className="flex flex-col w-sidebar h-full bg-white border-r border-gray-200">
      <div className="backdrop-blur-md bg-teal-800/80 border-b border-white/10 px-4 py-3">
        <p className="text-xs text-teal-200 font-medium uppercase tracking-wide">Grupo Familiar</p>
        <p className="text-white font-semibold truncate">Finanças</p>
      </div>

      <nav className="flex-1 overflow-y-auto py-2">
        <ul role="list">
          {NAV_ITEMS.map((item) => (
            <NavigationItem key={item.id} item={item} isActive={location.pathname === item.path} />
          ))}
        </ul>
      </nav>

      <div className="px-4 py-3 border-t border-gray-200">
        <p className="text-sm font-medium text-gray-900 truncate">{user?.name}</p>
        <button onClick={handleLogout} className="mt-1 text-sm text-gray-500 hover:text-gray-700">
          Sair
        </button>
      </div>
    </aside>
  );
}
