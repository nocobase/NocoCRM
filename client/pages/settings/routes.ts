import {
  defineAppRoutes,
  type AppClientRouteContribution,
  type AppClientRouteDefinition,
} from '@nocobase/app-client/plugins';
import { demoModeRoutes } from '@nocobase/app-plugin-demo-mode/client';
import {
  Bell,
  CalendarClock,
  KeyRound,
  PackageOpen,
  ShieldUser,
  SlidersHorizontal,
  UsersRound,
  Workflow,
} from 'lucide-react';

import { notificationTemplateRoute } from './notification-routes.js';

/**
 * The CRM's settings modules, one card each on the settings home (`shell-routes.ts`), placed in a category by
 * `parent`. These pages were the tabs of one Settings page until template 1.0.0-beta.92: each keeps the route
 * name, the /settings/... address and the grant it had then, so stored grants, links and bookmarks still work, and
 * a card shows only to whoever its grant lets open it. Every module but Notification management has one view. The
 * Database Explorer (`database-explorer/routes.ts`) and the Foundation plugin's Features and extensions join the
 * System category of their own accord; mail accounts and the WhatsApp connection are reached from their pages.
 */
const page = (name: string) =>
  ({
    resource: { type: 'page', id: name },
    action: 'access',
  }) as const;

// Only the dedicated deployment registers the plugin's management page.
// Ordinary installations keep the existing CRM sample-data importer at this URL.
const demoEnvironmentRoutes = demoModeRoutes([
  {
    parent: 'settingsBusiness',
    name: 'settings-demo-data',
    path: '/demo-data',
    auth: 'required',
    authz: {
      resource: { type: 'settings', id: 'demoMode.data' },
      action: 'read',
    },
    navigation: {
      title: 'crm.navigation.demoData',
      description: 'crm.settingsCards.demoEnvironment',
      icon: PackageOpen,
    },
    componentLoader: () => import('./demo-environment.js'),
  },
]);

const settingsRoutes: AppClientRouteContribution = defineAppRoutes([
  // Business configuration.
  {
    parent: 'settingsBusiness',
    name: 'crm-settings',
    path: '/crm',
    auth: 'required',
    authz: {
      resource: { type: 'settings', id: 'crm' },
      action: 'manage',
    },
    navigation: {
      title: 'crm.navigation.general',
      description: 'crm.settingsCards.general',
      icon: SlidersHorizontal,
    },
    componentLoader: () => import('../crm-settings.js'),
  },
  {
    // How an approval moves, read only; the administrators', as General is.
    parent: 'settingsBusiness',
    name: 'settings-approval-flow',
    path: '/approval-flow',
    auth: 'required',
    authz: {
      resource: { type: 'settings', id: 'crm' },
      action: 'manage',
    },
    navigation: {
      title: 'crm.navigation.approvalFlow',
      description: 'crm.settingsCards.approvalFlow',
      icon: Workflow,
    },
    componentLoader: () => import('./approval-flow/index.js'),
  },
  // Last: a trial's, rarely opened once the CRM is in use.
  ...(demoEnvironmentRoutes.length
    ? demoEnvironmentRoutes
    : [
        {
          // Ordinary sample data is independent of the dedicated Demo Mode page.
          parent: 'settingsBusiness',
          name: 'settings-demo-data',
          path: '/demo-data',
          auth: 'required',
          authz: {
            resource: { type: 'settings', id: 'crm' },
            action: 'manage',
          },
          navigation: {
            title: 'crm.navigation.demoData',
            description: 'crm.settingsCards.demoData',
            icon: PackageOpen,
          },
          componentLoader: () => import('./demo-data.js'),
        } satisfies AppClientRouteDefinition,
      ]),
  // Accounts and permissions: NocoBase 3's prepared Users and Roles pages
  // (the template's since 1.0.0-beta.74), registered here rather than through
  // the template's own routes file, without its Default access page, which
  // the CRM does not offer. Each route checks what the plugin's own API checks.
  {
    parent: 'settingsAccount',
    name: 'settings-users',
    path: '/users',
    auth: 'required',
    authz: { resource: { type: 'user', id: '*' }, action: 'read' },
    navigation: {
      title: 'crm.navigation.users',
      description: 'crm.settingsCards.users',
      icon: UsersRound,
    },
    componentLoader: () => import('./users.js'),
    children: [
      {
        name: 'settings-users-create',
        path: 'create',
        authz: { resource: { type: 'user', id: '*' }, action: 'create' },
        componentLoader: () => import('./user-form.js'),
      },
      {
        // Application addition: inviting by email, which the prepared
        // pages leave out (pages/settings/accounts/).
        name: 'settings-users-invite',
        path: 'invite',
        authz: { resource: { type: 'user', id: '*' }, action: 'invite' },
        componentLoader: () => import('./accounts/invite.js'),
      },
      {
        // Application addition: a new password set by an administrator.
        name: 'settings-users-password',
        path: ':userId/password',
        componentLoader: () => import('./accounts/password.js'),
      },
      // The editor is the detail route's sibling at the same address, as
      // in template 1.0.0-beta.92: its `user-detail.tsx` only forwards
      // older detail links to `edit`, and the editor closes to the list
      // it resolves as its parent.
      {
        name: 'settings-user',
        path: ':userId',
        componentLoader: () => import('./user-detail.js'),
      },
      {
        name: 'settings-user-edit',
        path: ':userId/edit',
        componentLoader: () => import('./user-form.js'),
      },
    ],
  },
  {
    parent: 'settingsAccount',
    name: 'settings-roles',
    path: '/roles',
    auth: 'required',
    authz: {
      resource: { type: 'settings', id: 'authorization.permission-sets' },
      action: 'read',
    },
    navigation: {
      title: 'crm.navigation.roles',
      description: 'crm.settingsCards.roles',
      icon: ShieldUser,
    },
    componentLoader: () => import('./roles.js'),
    children: [
      {
        name: 'settings-role-create',
        path: 'create',
        authz: {
          resource: {
            type: 'settings',
            id: 'authorization.permission-sets',
          },
          action: 'create',
        },
        componentLoader: () => import('./role-form.js'),
      },
      {
        name: 'settings-role-edit',
        path: ':key/edit',
        componentLoader: () => import('./role-form.js'),
      },
    ],
  },
  {
    // The address the CRM's own Permission sets page had, kept for links
    // and bookmarks; no card of its own.
    parent: 'settingsAccount',
    name: 'settings-permission-sets',
    path: '/permission-sets',
    auth: 'required',
    authz: {
      resource: { type: 'settings', id: 'authorization.permission-sets' },
      action: 'read',
    },
    componentLoader: () => import('./permission-sets-redirect.js'),
  },
  {
    // Every signed-in person manages their own keys only; the API answers
    // for the caller alone, so everyone signed in has this card.
    parent: 'settingsAccount',
    name: 'settings-api-keys',
    path: '/api-keys',
    auth: 'required',
    authz: 'skip',
    navigation: {
      title: 'crm.navigation.apiKeys',
      description: 'crm.settingsCards.apiKeys',
      icon: KeyRound,
    },
    componentLoader: () => import('./api-keys/index.js'),
    children: [
      {
        name: 'settings-api-keys-new',
        path: 'new',
        componentLoader: () => import('./api-keys/new.js'),
      },
    ],
  },
  // System.
  {
    // The template's Notification management module, with the template's own
    // title, description and icon. Application change: declared here with
    // both its views, Notification templates first, then Notification logs
    // (the UI Library's notification-logs-ui block), rather than letting
    // `includeNotificationTemplateRoutes` append the templates after the logs.
    parent: 'settingsSystem',
    name: 'notificationManagement',
    navigation: {
      title: 'settings.notificationManagement',
      description: 'settings.notificationManagementDescription',
      icon: Bell,
    },
    breadcrumb: { title: 'settings.notificationManagement' },
    children: [
      // The template's view at its address, /settings/notifications/templates.
      {
        ...notificationTemplateRoute,
        path: '/notifications/templates',
        // Application change: a template opens in a drawer over the list
        // (notification-template-detail.tsx) rather than under its cards.
        children: [
          {
            name: 'notificationTemplate',
            path: ':templateId',
            presentation: {
              kind: 'drawer',
              title: 'settings.notificationTemplates',
            },
            componentLoader: () => import('./notification-template-detail.js'),
          },
        ],
      },
      {
        // The page checks the same grant as GET /api/notifications/logs.
        name: 'notificationLogs',
        path: '/notifications/logs',
        auth: 'required',
        authz: page('notification.logs'),
        navigation: { title: 'settings.notificationLogs' },
        breadcrumb: { title: 'settings.notificationLogs' },
        componentLoader: () => import('./notification-logs.js'),
      },
    ],
  },
  {
    // The page grant the scheduler's API checks.
    parent: 'settingsSystem',
    name: 'settings-scheduled-tasks',
    path: '/scheduled-tasks',
    auth: 'required',
    authz: page('scheduler.schedules'),
    navigation: {
      title: 'crm.navigation.scheduledTasks',
      description: 'crm.settingsCards.scheduledTasks',
      icon: CalendarClock,
    },
    componentLoader: () => import('./scheduled-tasks/index.js'),
    children: [
      {
        name: 'settings-scheduled-task',
        path: ':scheduleId',
        componentLoader: () => import('./scheduled-tasks/detail.js'),
      },
    ],
  },
]);

export default settingsRoutes;
