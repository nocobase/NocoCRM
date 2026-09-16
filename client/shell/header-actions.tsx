import { useClientApplication } from '@nocobase/app-client';
import { MonitorCog, Settings, Sparkles } from 'lucide-react';
import type { ReactElement } from 'react';
import { Link, useLocation } from 'react-router';

import {
  navigationPages,
  useRouteNavigation,
} from '../routing/route-navigation.js';

import { ThemeSettings } from '../theme/index.js';
import { UserMenu } from './user-menu.js';
// Application change to the template's header: the CRM's notification centre
// is reached from here (a bell with the unread count) rather than from the
// sidebar, so it is one click away on every page without taking a menu row.
import { NotificationBell } from '../components/crm/notification-bell.js';

const ACTION_LINK_CLASS =
  'inline-flex size-10 items-center justify-center rounded-xl border border-border/70 bg-background/60 text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50';

/**
 * Keep header entries visible on their destination pages so navigation stays consistent across surfaces. The CRM
 * entries (bell, assistant) belong to the application surface only; the current surface's own link is marked, so the
 * settings entry is shown only when its navigation contains an accessible page.
 */
export function HeaderActions(): ReactElement {
  const routes = useClientApplication().runtime.settingsRouteTree;
  // Share the Settings navigation checks instead of opening an empty surface.
  const { items } = useRouteNavigation(routes, true);
  const hasSettings = navigationPages(items).length > 0;
  const { pathname } = useLocation();
  const surface = pathname.startsWith('/settings')
    ? 'settings'
    : pathname.startsWith('/dev')
      ? 'dev'
      : 'app';
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
      {hasSettings ? (
        <Link
          aria-current={surface === 'settings' ? 'page' : undefined}
          aria-label='Settings'
          className={`${ACTION_LINK_CLASS} ${surface === 'settings' ? 'bg-muted' : ''}`}
          title='Settings'
          to='/settings'
        >
          <Settings className='size-5' />
        </Link>
      ) : null}
      <ThemeSettings />
      <UserMenu />
    </div>
  );
}
