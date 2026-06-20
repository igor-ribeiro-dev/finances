import { Link } from 'react-router-dom';
import type { NavItem } from '../../config/navigation';
import { cn } from '@/lib/cn';

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
          className="flex items-center gap-3 px-3 py-2 text-fg-muted cursor-not-allowed opacity-60"
        >
          <Icon size={18} aria-hidden="true" />
          <span className="flex-1">{label}</span>
          <span className="text-xs bg-surface text-fg-muted border border-border rounded-full px-2 py-0.5">
            Em breve
          </span>
        </div>
      </li>
    );
  }

  return (
    <li role="listitem">
      <Link
        to={path}
        aria-current={isActive ? 'page' : undefined}
        className={cn(
          'flex items-center gap-3 px-3 py-2 transition-colors duration-200 cursor-pointer',
          isActive
            ? 'bg-primary/10 text-primary font-semibold border-l-4 border-primary'
            : 'text-fg-muted hover:bg-surface hover:text-fg',
        )}
        onClick={onNavigate}
      >
        <Icon size={18} aria-hidden="true" />
        <span>{label}</span>
      </Link>
    </li>
  );
}
