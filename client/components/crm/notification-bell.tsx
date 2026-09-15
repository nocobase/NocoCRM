import { Bell } from 'lucide-react';
import type { ReactElement } from 'react';
import { Link, useLocation } from 'react-router';
import {
  NotificationInAppProvider,
  useNotificationInAppRuntime,
} from '@nocobase/app-plugin-notification-in-app/client';
import { useCrmText } from './api.js';

// The notification centre's entry in the header: a bell with the unread
// count, kept current by the plugin's own provider (it listens to the
// realtime channel). Highlighted while the centre itself is open.
export function NotificationBell({
  className,
}: {
  className: string;
}): ReactElement {
  return (
    <NotificationInAppProvider>
      <BellLink className={className} />
    </NotificationInAppProvider>
  );
}

function BellLink({ className }: { className: string }): ReactElement {
  const { text } = useCrmText();
  const { unreadCount } = useNotificationInAppRuntime();
  const active = useLocation().pathname.endsWith('/crm/notifications');
  const label = toLabel(text('notifications'), unreadCount);
  return (
    <Link
      aria-label={label}
      aria-current={active ? 'page' : undefined}
      className={`relative ${className} ${active ? 'bg-muted' : ''}`}
      title={label}
      to='/crm/notifications'
    >
      <Bell className='size-5' />
      {unreadCount > 0 && (
        <span className='absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold leading-none text-destructive-foreground'>
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      )}
    </Link>
  );
}

function toLabel(base: unknown, unread: number): string {
  const name = typeof base === 'string' ? base : String(base);
  return unread > 0 ? `${name} (${unread})` : name;
}
