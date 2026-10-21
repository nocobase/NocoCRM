import { describe, expect, it } from 'vitest';
import { resolveAppRuntime } from '@nocobase/app-client/runtime';
import appRuntime from '../../client/runtime.js';
import cliPlugins from '../../cli/plugins.js';
import serverPlugins from '../../server/plugins.js';
import { buildRouteNavigation } from '../../client/routing/route-navigation.js';

// The App foundation page (@nocobase/app-plugin-foundation): registered on
// the server, the client and the command line (its build hook), and in the
// menu, after Settings, only for whoever has unrestricted access. The CRM
// does not use the template's settings group: its own Settings is a page.

describe('the App foundation page', () => {
  it('is registered on the server and the command line', () => {
    for (const plugins of [serverPlugins.plugins, cliPlugins.plugins])
      expect(
        plugins.filter(
          (plugin) => plugin.packageName === '@nocobase/app-plugin-foundation',
        ),
      ).toHaveLength(1);
  });

  it('is in the menu for unrestricted administrators alone, at its protected URL', async () => {
    const runtime = await resolveAppRuntime(appRuntime);
    const menu = buildRouteNavigation(runtime.routes, new Set());
    const page = menu.find(({ route }) => route.name === 'foundation')?.route;
    expect(page).toMatchObject({
      path: '/foundation',
      auth: 'required',
      authz: 'unrestricted',
    });
    if (!page) throw new Error('Foundation route missing');
    expect(
      buildRouteNavigation(
        runtime.routes,
        new Set([`${page.packageName}:${page.path}:${page.id}`]),
      ).some(({ route }) => route.name === 'foundation'),
    ).toBe(false);
  });
});
