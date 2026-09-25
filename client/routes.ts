import {
  defineAppRoutes,
  defineSettingsRoutes,
  type AppClientRouteContribution,
} from '@nocobase/app-client/plugins';
import {
  Building2,
  CalendarDays,
  ContactRound,
  Handshake,
  LayoutDashboard,
  ListChecks,
  Radar,
  Settings2,
} from 'lucide-react';

// Navigation is read from these declarations: the sidebar follows their
// order: the workspace first, then the two object sections. A group without a path is menu-only; the sidebar renders it
// as a headed section. Detail pages carry no navigation entry and select the
// nearest visible ancestor, which keeps an object highlighted on its records.
const appRoutes: AppClientRouteContribution = defineAppRoutes([
  {
    auth: 'required',
    componentLoader: () => import('./pages/crm-dashboard.js'),
    name: 'home',
    navigation: { title: 'navigation.home', icon: LayoutDashboard },
    path: '/',
  },
  {
    name: 'crm-action',
    navigation: { title: 'crm.navigation.action' },
    children: [
      ['leads', Radar],
      ['opportunities', Handshake],
      ['activities', CalendarDays],
      ['approvals', ListChecks],
    ].map(([entity, icon]) => ({
      name: `crm-${String(entity)}`,
      path: `/crm/${String(entity)}`,
      auth: 'required' as const,
      navigation: {
        title: `crm.entities.${String(entity)}`,
        icon: icon as typeof Radar,
      },
      componentLoader: () => import('./pages/crm-list.js'),
    })),
  },
  {
    name: 'crm-relations',
    navigation: { title: 'crm.navigation.relations' },
    children: [
      ['accounts', Building2],
      ['contacts', ContactRound],
    ].map(([entity, icon]) => ({
      name: `crm-${String(entity)}`,
      path: `/crm/${String(entity)}`,
      auth: 'required' as const,
      navigation: {
        title: `crm.entities.${String(entity)}`,
        icon: icon as typeof Radar,
      },
      componentLoader: () => import('./pages/crm-list.js'),
    })),
  },
  {
    name: 'crm-record',
    path: '/crm/:entity/:id',
    auth: 'required',
    componentLoader: () => import('./pages/crm-detail.js'),
    // A tab has an address of its own (/crm/accounts/<id>/contacts), read by
    // useDetailTab; the page draws the tab, see pages/crm-record-tab.tsx.
    children: [
      {
        name: 'crm-record-tab',
        path: ':tab',
        componentLoader: () => import('./pages/crm-record-tab.js'),
      },
    ],
  },
  {
    name: 'crm-notifications',
    path: '/crm/notifications',
    auth: 'required',
    componentLoader: () => import('./pages/crm-notifications.js'),
  },
  {
    auth: 'guest',
    componentLoader: () => import('./pages/auth/login.js'),
    name: 'login',
    path: '/login',
  },
  {
    auth: 'guest',
    componentLoader: () => import('./pages/auth/forgot-password.js'),
    name: 'forgot-password',
    path: '/forgot-password',
  },
  {
    auth: 'guest',
    componentLoader: () => import('./pages/auth/reset-password.js'),
    name: 'reset-password',
    path: '/reset-password',
  },
]);

const settingsRoutes: AppClientRouteContribution = defineSettingsRoutes([
  {
    name: 'crm-settings',
    path: '/crm',
    navigation: { title: 'crm.settings', icon: Settings2 },
    authz: {
      resource: { type: 'settings', id: 'crm' },
      action: 'manage',
    },
    componentLoader: () => import('./pages/crm-settings.js'),
  },
]);

const routes: readonly AppClientRouteContribution[] = [
  appRoutes,
  settingsRoutes,
];

export default routes;
