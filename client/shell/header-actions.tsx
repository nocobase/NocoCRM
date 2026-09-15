import { MonitorCog, Settings, Sparkles } from 'lucide-react';
import type { ReactElement } from 'react';
import { Link } from 'react-router';

import { ThemeSettings } from '../theme/index.js';
import { UserMenu } from './user-menu.js';
// Application change to the template's header: the CRM's notification centre
// is reached from here (a bell with the unread count) rather than from the
// sidebar, so it is one click away on every page without taking a menu row.
import { NotificationBell } from '../components/crm/notification-bell.js';

const ACTION_LINK_CLASS =
  'inline-flex size-10 items-center justify-center rounded-xl border border-border/70 bg-background/60 text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50';

/**
 * The surface the header is being rendered inside, or `app` for the application shell. The CRM entries (bell,
 * assistant) belong to the application surface only; the settings and dev links stay on every surface — application
 * change to the template, which dropped a surface's own link: keeping it marks where the user is, and the four icons
 * then never shift position between surfaces.
 */
export type HeaderSurface = 'app' | 'settings' | 'dev';

export interface HeaderActionsProps {
  readonly surface?: HeaderSurface;
}

/** The controls in the top-right of every header, so every surface matches the application shell. */
export function HeaderActions({
  surface = 'app',
}: HeaderActionsProps): ReactElement {
  return (
    <div className='flex shrink-0 items-center gap-2'>
      {surface === 'app' ? (
        <NotificationBell className={ACTION_LINK_CLASS} />
      ) : null}
      {surface === 'app' ? (
        <button
          aria-label='AI 助手'
          className={ACTION_LINK_CLASS}
          title='AI 助手'
          type='button'
          onClick={() =>
            window.dispatchEvent(
              new CustomEvent('crm-assistant', { detail: {} }),
            )
          }
        >
          <Sparkles className='size-5' />
        </button>
      ) : null}
      {/* The dev entry sits left of settings and exists only while developing: a production build evaluates this to
          false and drops the link along with the whole dev surface it points at. */}
      {import.meta.env.DEV ? (
        <Link
          aria-current={surface === 'dev' ? 'page' : undefined}
          aria-label='Dev tools'
          className={`${ACTION_LINK_CLASS} ${surface === 'dev' ? 'bg-muted' : ''}`}
          title='Dev tools'
          to='/dev'
        >
          <MonitorCog className='size-5' />
        </Link>
      ) : null}
      <Link
        aria-current={surface === 'settings' ? 'page' : undefined}
        aria-label='Settings'
        className={`${ACTION_LINK_CLASS} ${surface === 'settings' ? 'bg-muted' : ''}`}
        title='Settings'
        to='/settings'
      >
        <Settings className='size-5' />
      </Link>
      <ThemeSettings />
      <UserMenu />
    </div>
  );
}
