import {
  defineAppRoutes,
  defineSettingsRoutes,
  type AppClientRouteContribution,
} from '@nocobase/app-client/plugins';
import { Settings2 } from 'lucide-react';

const appRoutes: AppClientRouteContribution = defineAppRoutes([
  {
    auth: 'required',
    componentLoader: () => import('./pages/crm-dashboard.js'),
    name: 'home',
    path: '/',
  },
  ...[
    'leads',
    'accounts',
    'contacts',
    'opportunities',
    'activities',
    'approvals',
  ].map((entity) => ({
    name: `crm-${entity}`,
    path: `/crm/${entity}`,
    auth: 'required' as const,
    componentLoader: () => import('./pages/crm-list.js'),
  })),
  {
    name: 'crm-record',
    path: '/crm/:entity/:id',
    auth: 'required',
    componentLoader: () => import('./pages/crm-detail.js'),
  },
  {
    name: 'crm-actions',
    path: '/crm/actions',
    auth: 'required',
    componentLoader: () => import('./pages/crm-actions.js'),
  },
  {
    name: 'crm-notifications',
    path: '/crm/notifications',
    auth: 'required',
    componentLoader: () => import('./pages/crm-notifications.js'),
  },
]);

const settingsRoutes: AppClientRouteContribution = defineSettingsRoutes([
  {
    name: 'crm-settings',
    path: '/crm',
    navigation: { title: 'crm.settings', icon: Settings2 },
    access: { resource: 'authorization.settings.crm', action: 'manage' },
    componentLoader: () => import('./pages/crm-settings.js'),
  },
]);

const routes: readonly AppClientRouteContribution[] = [
  appRoutes,
  settingsRoutes,
];

export default routes;
