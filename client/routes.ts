import {
  defineAppRoutes,
  defineSettingsRoutes,
  type AppClientRouteContribution,
} from '@nocobase/app-client/plugins';
import {
  BookOpenText,
  Building2,
  CalendarDays,
  ContactRound,
  Handshake,
  LayoutDashboard,
  ListChecks,
  ListTodo,
  Radar,
  Settings2,
} from 'lucide-react';

// Navigation is read from these declarations, and the sidebar follows their
// order: the workspace first, then the AI and the two object sections. A
// group without a path is menu-only; the sidebar renders it as a headed
// section. Detail pages carry no navigation entry and select the
// nearest visible ancestor, which keeps an object highlighted on its records.
//
// Every page states its check: a page left without one is hidden from all but
// root. The page id is the route name, which the permission sets' page grants
// name (crmPages in server/providers/crm/resources.ts); renaming one means
// migrating those grants.
const page = (name: string) =>
  ({
    resource: { type: 'page', id: name },
    action: 'access',
  }) as const;

const appRoutes: AppClientRouteContribution = defineAppRoutes([
  {
    auth: 'required',
    authz: page('home'),
    componentLoader: () => import('./pages/crm-dashboard.js'),
    name: 'home',
    navigation: { title: 'navigation.home', icon: LayoutDashboard },
    path: '/',
  },
  // The AI, right under the overview: its suggestions waiting on the
  // reader, then its skills, read by everyone and edited by whoever holds
  // manageSkills.
  {
    name: 'crm-ai',
    navigation: { title: 'crm.navigation.ai' },
    children: [
      {
        name: 'crm-decisions',
        path: '/crm/decisions',
        auth: 'required',
        authz: page('crm-decisions'),
        navigation: { title: 'crm.decisions.title', icon: ListTodo },
        componentLoader: () => import('./pages/crm-decisions.js'),
      },
      {
        name: 'crm-skills',
        path: '/crm/skills',
        auth: 'required',
        authz: page('crm-skills'),
        navigation: { title: 'crm.skillsPage.title', icon: BookOpenText },
        componentLoader: () => import('./pages/crm-skills.js'),
      },
    ],
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
      authz: page(`crm-${String(entity)}`),
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
      authz: page(`crm-${String(entity)}`),
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
    authz: page('crm-record'),
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
    authz: page('crm-notifications'),
    componentLoader: () => import('./pages/crm-notifications.js'),
  },
  {
    auth: 'guest',
    authz: 'skip',
    componentLoader: () => import('./pages/auth/login.js'),
    name: 'login',
    path: '/login',
  },
  {
    auth: 'guest',
    authz: 'skip',
    componentLoader: () => import('./pages/auth/forgot-password.js'),
    name: 'forgot-password',
    path: '/forgot-password',
  },
  {
    auth: 'guest',
    authz: 'skip',
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
