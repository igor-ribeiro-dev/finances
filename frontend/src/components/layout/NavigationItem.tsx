import { Link } from 'react-router-dom';
import type { NavItem } from '../../config/navigation';

interface Props {
  item: NavItem;
  isActive: boolean;
  onNavigate?: () => void;
}

export function NavigationItem({ item, isActive, onNavigate }: Props) {
  const { label, path, icon: Icon, status } = item;

  if (status === 'coming-soon') {
    return (
      <li role="listitem">
        <div
          aria-disabled="true"
          className="flex items-center gap-3 px-3 py-2 text-gray-400 cursor-not-allowed"
        >
          <Icon size={18} aria-hidden="true" />
          <span className="flex-1">{label}</span>
          <span className="text-xs bg-gray-100 text-gray-400 rounded-full px-2 py-0.5">
            Em breve
          </span>
        </div>
      </li>
    );
  }

  const activeClasses =
    'bg-teal-50 text-teal-700 font-medium border-l-4 border-teal-600 cursor-pointer';
  const defaultClasses = 'text-gray-700 hover:bg-gray-100 cursor-pointer';

  return (
    <li role="listitem">
      <Link
        to={path}
        aria-current={isActive ? 'page' : undefined}
        className={`flex items-center gap-3 px-3 py-2 ${isActive ? activeClasses : defaultClasses}`}
        onClick={onNavigate}
      >
        <Icon size={18} aria-hidden="true" />
        <span>{label}</span>
      </Link>
    </li>
  );
}
