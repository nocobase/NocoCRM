import type { ReactElement } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router';
import { useCan } from '@nocobase/app-plugin-authorization/client';
import {
  CalendarClock,
  Database,
  KeyRound,
  Settings2,
  ShieldUser,
  UsersRound,
  Workflow,
  type LucideIcon,
} from 'lucide-react';
import { PageFrameContext } from '../../components/page-frame.js';
import { LinkTabs } from '../../components/crm/link-tabs.js';
import { Loading } from '../../components/crm/common.js';
import { useCrmText } from '../../components/crm/api.js';

// Settings, the menu's one entry for them: the pages that configure the CRM
// and its people, a tab each, at the addresses they had as entries of their
// own (/settings/crm, /settings/users …). Each tab's route still checks its
// own grant; a tab shows only to whoever that grant lets open it, and
// /settings opens on the first of those. This page draws the title and the
// tabs, which stick to the top as it scrolls; the tabs' pages keep their
// description and actions, which PageHeader draws under the tabs
// (components/page-frame.ts).
interface Tab {
  path: string;
  label: string;
  icon: LucideIcon;
}
const TABS: readonly Tab[] = [
  { path: 'crm', label: 'navigation.general', icon: Settings2 },
  {
    path: 'approval-flow',
    label: 'navigation.approvalFlow',
    icon: Workflow,
  },
  { path: 'users', label: 'navigation.users', icon: UsersRound },
  { path: 'roles', label: 'navigation.roles', icon: ShieldUser },
  { path: 'api-keys', label: 'navigation.apiKeys', icon: KeyRound },
  {
    path: 'scheduled-tasks',
    label: 'navigation.scheduledTasks',
    icon: CalendarClock,
  },
  // Last: a trial's, rarely opened once the CRM is in use.
  { path: 'demo-data', label: 'navigation.demoData', icon: Database },
];

export default function SettingsPage(): ReactElement {
  const { text } = useCrmText();
  const { pathname } = useLocation();
  // The same checks as the tabs' routes in client/routes.ts; API keys are
  // everyone's own.
  const access: Record<string, ReturnType<typeof useCan>> = {
    crm: useCan({
      resource: { type: 'settings', id: 'crm' },
      action: 'manage',
    }),
    'demo-data': useCan({
      resource: { type: 'settings', id: 'crm' },
      action: 'manage',
    }),
    'approval-flow': useCan({
      resource: { type: 'settings', id: 'crm' },
      action: 'manage',
    }),
    users: useCan({ resource: { type: 'user', id: '*' }, action: 'read' }),
    roles: useCan({
      resource: { type: 'settings', id: 'authorization.permission-sets' },
      action: 'read',
    }),
    'scheduled-tasks': useCan({
      resource: { type: 'page', id: 'scheduler.schedules' },
      action: 'access',
    }),
  };
  const pending = Object.values(access).some((check) => check.isPending);
  const tabs = TABS.filter((tab) => access[tab.path]?.can ?? true);
  const current = /\/settings\/([^/]+)/.exec(pathname)?.[1];
  if (!current) {
    if (pending) return <Loading />;
    return <Navigate to={`/settings/${tabs[0]?.path ?? 'api-keys'}`} replace />;
  }
  return (
    <>
      <div className='px-6 pt-6 md:px-8 md:pt-8'>
        <h1 className='font-heading text-2xl font-semibold tracking-[-0.035em]'>
          {text('navigation.settings')}
        </h1>
      </div>
      {/* The tabs stick to the top of the layout's scrolling column as the
          page scrolls, as the reports page's section row does, with a band
          under their rule that the content scrolls beneath; below the
          covering pages (z-10) that a tab opens over itself. */}
      <div className='sticky top-0 z-[9] bg-background/85 px-6 pt-2 pb-3 backdrop-blur-xl md:px-8'>
        <LinkTabs
          label={text('navigation.settings')}
          tabs={tabs.map((tab) => ({
            to: `/settings/${tab.path}`,
            label: text(tab.label),
            icon: tab.icon,
            selected: tab.path === current,
          }))}
        />
      </div>
      <PageFrameContext.Provider value>
        <Outlet />
      </PageFrameContext.Provider>
    </>
  );
}
