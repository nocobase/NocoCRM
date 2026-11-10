import { resolveAppRuntime } from '@nocobase/app-client/runtime';
import {
  defineAppRoutes,
  resolveAppClientContributions,
  type AppClientRegisteredRoute,
} from '@nocobase/app-client/plugins';
import { CAPABILITY_GUIDE_ACCESS } from '@nocobase/app-plugin-foundation/client';
import { describe, expect, it } from 'vitest';
import appRuntime from '../../client/runtime.js';
import settingsRoutes from '../../client/pages/settings/routes.js';
import shellRoutes from '../../client/pages/settings/shell-routes.js';
import {
  buildRouteNavigation,
  buildSettingsCatalog,
  routeKey,
  selectedNavigationId,
} from '../../client/routing/route-navigation.js';

// Settings is one entry of the menu opening a home page of cards by category
// (client/pages/settings/shell-routes.ts); the pages that were the tabs of
// the former Settings page are its modules, each at the address, route name
// and grant it had (client/pages/settings/routes.ts).

function search(
  routes: readonly AppClientRegisteredRoute[],
  name: string,
): AppClientRegisteredRoute | undefined {
  for (const route of routes) {
    if (route.name === name) return route;
    const nested = route.children && search(route.children, name);
    if (nested) return nested;
  }
  return undefined;
}

function find(
  routes: readonly AppClientRegisteredRoute[],
  name: string,
): AppClientRegisteredRoute {
  const route = search(routes, name);
  if (!route) throw new Error(`No route named ${name}`);
  return route;
}

const catalog = (
  routes: readonly AppClientRegisteredRoute[],
  denied: ReadonlySet<string> = new Set(),
) =>
  buildSettingsCatalog(routes, denied).map((category) => [
    category.route.name,
    category.modules.map((module) => [module.route.name, module.target.path]),
  ]);

const resolved = async () => (await resolveAppRuntime(appRuntime)).routes;

const manage = {
  resource: { type: 'settings', id: 'crm' },
  action: 'manage',
};

describe('the settings home', () => {
  it('keeps the address, the route name and the grant of every settings page', async () => {
    const routes = await resolved();
    expect(
      [
        'settingsHome',
        'crm-settings',
        'settings-approval-flow',
        'settings-demo-data',
        'settings-users',
        'settings-user-edit',
        'settings-roles',
        'settings-role-edit',
        'settings-permission-sets',
        'settings-api-keys',
        'settings-scheduled-tasks',
        'notificationLogs',
        'notificationTemplates',
        'databaseExplorer',
      ].map((name) => {
        const route = find(routes, name);
        return [name, route.path, route.authz];
      }),
    ).toEqual([
      ['settingsHome', '/settings', 'skip'],
      ['crm-settings', '/settings/crm', manage],
      ['settings-approval-flow', '/settings/approval-flow', manage],
      ['settings-demo-data', '/settings/demo-data', manage],
      [
        'settings-users',
        '/settings/users',
        { resource: { type: 'user', id: '*' }, action: 'read' },
      ],
      [
        'settings-user-edit',
        '/settings/users/:userId/edit',
        { resource: { type: 'user', id: '*' }, action: 'read' },
      ],
      [
        'settings-roles',
        '/settings/roles',
        {
          resource: { type: 'settings', id: 'authorization.permission-sets' },
          action: 'read',
        },
      ],
      [
        'settings-role-edit',
        '/settings/roles/:key/edit',
        {
          resource: { type: 'settings', id: 'authorization.permission-sets' },
          action: 'read',
        },
      ],
      [
        'settings-permission-sets',
        '/settings/permission-sets',
        {
          resource: { type: 'settings', id: 'authorization.permission-sets' },
          action: 'read',
        },
      ],
      ['settings-api-keys', '/settings/api-keys', 'skip'],
      [
        'settings-scheduled-tasks',
        '/settings/scheduled-tasks',
        {
          resource: { type: 'page', id: 'scheduler.schedules' },
          action: 'access',
        },
      ],
      [
        'notificationLogs',
        '/settings/notifications/logs',
        {
          resource: { type: 'page', id: 'notification.logs' },
          action: 'access',
        },
      ],
      [
        'notificationTemplates',
        '/settings/notifications/templates',
        {
          resource: { type: 'page', id: 'notification.templates' },
          action: 'access',
        },
      ],
      [
        'databaseExplorer',
        '/settings/database-explorer',
        {
          resource: { type: 'page', id: 'database-explorer' },
          action: 'access',
        },
      ],
    ]);
    // The ids the page grants and route overrides name are unchanged.
    expect(find(routes, 'settings-users').id).toBe('crm:settings-users');
  });

  it('is one menu entry, selected on every settings page', async () => {
    const routes = await resolved();
    const menu = buildRouteNavigation(routes, new Set());
    const entries = menu.filter(({ route }) => route.path === '/settings');
    expect(entries.map(({ route }) => route.name)).toEqual(['settingsHome']);
    expect(entries[0]!.children).toEqual([]);
    expect(entries[0]!.route.navigation?.title).toBe('settings.title');
    // Nothing of the settings is a menu entry of its own.
    expect(
      menu.some(({ route }) =>
        ['capabilityGuide', 'foundation', 'foundationSettings'].includes(
          route.name,
        ),
      ),
    ).toBe(false);
    const entry = routeKey(entries[0]!.route);
    for (const path of [
      '/settings',
      '/settings/crm',
      '/settings/approval-flow',
      '/settings/demo-data',
      '/settings/users',
      '/settings/users/create',
      '/settings/users/alice/edit',
      '/settings/roles',
      '/settings/roles/member/edit',
      '/settings/permission-sets',
      '/settings/api-keys/new',
      '/settings/scheduled-tasks/daily',
      '/settings/notifications/logs',
      '/settings/notifications/templates',
      '/settings/database-explorer',
      '/settings/capabilities',
    ])
      expect([path, selectedNavigationId(routes, path)]).toEqual([path, entry]);
  });

  it('groups the cards in business, people and system categories, each with what it is for', async () => {
    const routes = await resolved();
    expect(catalog(routes)).toEqual([
      [
        'settingsBusiness',
        [
          ['crm-settings', '/settings/crm'],
          ['settings-approval-flow', '/settings/approval-flow'],
          ['settings-demo-data', '/settings/demo-data'],
        ],
      ],
      [
        'settingsAccount',
        [
          ['settings-users', '/settings/users'],
          ['settings-roles', '/settings/roles'],
          ['settings-api-keys', '/settings/api-keys'],
        ],
      ],
      [
        'settingsSystem',
        [
          // The template's Notification management module, first in its
          // category, its card opening its first view, Notification
          // templates, then Notification logs (pages/settings/routes.ts).
          ['notificationManagement', '/settings/notifications/templates'],
          ['settings-scheduled-tasks', '/settings/scheduled-tasks'],
          ['databaseExplorer', '/settings/database-explorer'],
          ['capabilityGuide', '/settings/capabilities'],
        ],
      ],
    ]);
    for (const module of buildSettingsCatalog(routes, new Set()).flatMap(
      (category) => category.modules,
    )) {
      expect({
        module: module.route.name,
        description: Boolean(module.route.navigation?.description),
        icon: Boolean(module.route.navigation?.icon),
      }).toEqual({ module: module.route.name, description: true, icon: true });
    }
    expect(find(routes, 'capabilityGuide').authz).toEqual(
      CAPABILITY_GUIDE_ACCESS,
    );
  });

  it('shows a restricted reader only the cards their grants open, and no empty category', async () => {
    const routes = await resolved();
    const guarded = (names: readonly string[]): ReadonlySet<string> =>
      new Set(names.map((name) => routeKey(find(routes, name))));
    // Everyone signed in has their own API keys, and nothing else here.
    const everything = guarded([
      'crm-settings',
      'settings-approval-flow',
      'settings-demo-data',
      'settings-users',
      'settings-roles',
      'settings-scheduled-tasks',
      'notificationLogs',
      'notificationTemplates',
      'databaseExplorer',
      'capabilityGuide',
    ]);
    expect(catalog(routes, everything)).toEqual([
      ['settingsAccount', [['settings-api-keys', '/settings/api-keys']]],
    ]);
    // A reader without the CRM's settings grant has no business category.
    expect(
      catalog(
        routes,
        guarded([
          'crm-settings',
          'settings-approval-flow',
          'settings-demo-data',
        ]),
      ).map(([name]) => name),
    ).toEqual(['settingsAccount', 'settingsSystem']);
    // Notification management's card opens the first view the reader may
    // open, and shows only while they may open one; each view's grant is the
    // one its API checks.
    const notifications = (denied: readonly string[]) =>
      catalog(routes, guarded(denied))
        .flatMap(([, modules]) => modules as [string, string][])
        .find(([name]) => name === 'notificationManagement')?.[1];
    expect(notifications(['notificationLogs'])).toBe(
      '/settings/notifications/templates',
    );
    expect(notifications(['notificationTemplates'])).toBe(
      '/settings/notifications/logs',
    );
    expect(
      notifications(['notificationLogs', 'notificationTemplates']),
    ).toBeUndefined();
  });

  it('takes a later module with several views into its category without another menu entry', () => {
    const { routes } = resolveAppClientContributions([
      {
        packageName: 'crm',
        source: 'application',
        routes: [
          shellRoutes,
          settingsRoutes,
          defineAppRoutes([
            {
              parent: 'settingsSystem',
              name: 'auditManagement',
              navigation: {
                title: 'Audit',
                description: 'Audit records.',
              },
              breadcrumb: { title: 'Audit' },
              children: [
                {
                  name: 'auditLogs',
                  path: '/audit/logs',
                  authz: {
                    resource: { type: 'page', id: 'audit.logs' },
                    action: 'access',
                  },
                  navigation: { title: 'Audit logs' },
                  componentLoader: async () => ({ default: () => null }),
                },
              ],
            },
          ]),
        ],
      },
    ]);
    expect(find(routes, 'auditLogs').path).toBe('/settings/audit/logs');
    expect(catalog(routes).at(-1)).toEqual([
      'settingsSystem',
      [
        ['notificationManagement', '/settings/notifications/templates'],
        ['settings-scheduled-tasks', '/settings/scheduled-tasks'],
        ['auditManagement', '/settings/audit/logs'],
      ],
    ]);
    const menu = buildRouteNavigation(routes, new Set());
    expect(menu.map(({ route }) => route.name)).toEqual(['settingsHome']);
    expect(selectedNavigationId(routes, '/settings/audit/logs')).toBe(
      routeKey(menu[0]!.route),
    );
  });
});
