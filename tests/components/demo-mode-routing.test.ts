import { afterEach, expect, it, vi } from 'vitest';
import type { AppClientRouteDefinition } from '@nocobase/app-client/plugins';

afterEach(() => document.getElementById('nocobase-runtime-config')?.remove());

function flatten(
  routes: readonly AppClientRouteDefinition[],
): AppClientRouteDefinition[] {
  return routes.flatMap((route) => [route, ...flatten(route.children ?? [])]);
}

it.each([true, false])(
  'loads the appropriate settings page for demoMode=%s',
  async (enabled) => {
    document.getElementById('nocobase-runtime-config')?.remove();
    const config = document.createElement('script');
    config.id = 'nocobase-runtime-config';
    config.type = 'application/json';
    config.textContent = JSON.stringify({
      version: 1,
      config: {},
      public: { demoMode: { enabled } },
    });
    document.head.append(config);
    vi.resetModules();
    const { default: contributions } = await import('../../client/routes.js');
    const matches = contributions
      .flatMap(({ routes }) => flatten(routes))
      .filter((route) => route.name === 'settings-demo-data');
    expect(matches).toHaveLength(1);
    const route = matches[0]!;
    expect(route.authz).toEqual({
      resource: { type: 'settings', id: enabled ? 'demoMode.data' : 'crm' },
      action: enabled ? 'read' : 'manage',
    });
    if (!('componentLoader' in route) || !route.componentLoader)
      throw new Error('Settings must load a page');
    const { default: Page } = await route.componentLoader();
    expect(Page).toBe(
      (
        await import(
          enabled
            ? '../../client/pages/settings/demo-environment.js'
            : '../../client/pages/settings/demo-data.js'
        )
      ).default,
    );
  },
);
