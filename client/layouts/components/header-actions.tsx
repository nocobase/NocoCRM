import { useTranslation } from '@nocobase/i18n/client';
import { MonitorCog, Settings } from 'lucide-react';
import type { ReactElement } from 'react';
import { Link, useLocation } from 'react-router';
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from '@/components/ui/tooltip';

import { ThemeSettings } from '../../theme/index.js';
import { UserMenu } from './user-menu.js';
// Application change to the template's header: the CRM's notification centre
// is reached from here (a bell with the unread count) rather than from the
// sidebar, so it is one click away on every page without taking a menu row.
import { NotificationBell } from '../../components/crm/notification-bell.js';

const ACTION_LINK_CLASS =
  'inline-flex size-10 items-center justify-center rounded-xl border border-border/70 bg-background/60 text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50';

/**
 * Keep header entries visible on their destination pages so navigation stays consistent across surfaces. The CRM
 * entry (the notification bell) belongs to the application surface only; the AI assistant opens from its own
 * floating launcher (client/components/crm/ai-chat.tsx). The current surface's own link is marked.
 */
export function HeaderActions({
  showSettings,
  showDev,
}: {
  readonly showSettings: boolean;
  readonly showDev: boolean;
}): ReactElement {
  const { t } = useTranslation();
  const { pathname } = useLocation();
  const surface = pathname.startsWith('/settings')
    ? 'settings'
    : pathname.startsWith('/dev')
      ? 'dev'
      : 'app';

  return (
    <TooltipProvider>
      <div className='flex shrink-0 items-center gap-2'>
        {surface === 'app' ? (
          <NotificationBell className={ACTION_LINK_CLASS} />
        ) : null}
        {/* The dev entry sits left of settings and exists only while developing: a production build evaluates this to
          false and drops the link along with the whole dev surface it points at. */}
        {showDev ? (
          <Tooltip>
            <TooltipTrigger
              render={
                <Link
                  to='/dev'
                  aria-current={surface === 'dev' ? 'page' : undefined}
                  className={`${ACTION_LINK_CLASS} ${surface === 'dev' ? 'bg-muted' : ''}`}
                />
              }
              aria-label={t('dev.componentExamples', {
                defaultValue: 'Component examples',
              })}
            >
              <MonitorCog className='size-5' />
            </TooltipTrigger>
            <TooltipContent side='bottom'>
              {t('dev.componentExamples', {
                defaultValue: 'Component examples',
              })}
            </TooltipContent>
          </Tooltip>
        ) : null}
        {showSettings ? (
          <Tooltip>
            <TooltipTrigger
              render={
                <Link
                  to='/settings'
                  aria-current={surface === 'settings' ? 'page' : undefined}
                  className={`${ACTION_LINK_CLASS} ${surface === 'settings' ? 'bg-muted' : ''}`}
                />
              }
              aria-label={t('settings.title', { defaultValue: 'Settings' })}
            >
              <Settings className='size-5' />
            </TooltipTrigger>
            <TooltipContent side='bottom'>
              {t('settings.title', { defaultValue: 'Settings' })}
            </TooltipContent>
          </Tooltip>
        ) : null}
        <ThemeSettings />
        <UserMenu />
      </div>
    </TooltipProvider>
  );
}
