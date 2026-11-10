import { describe, expect, it } from 'vitest';
import { CAPABILITY_GUIDE_ACCESS } from '@nocobase/app-plugin-foundation/client';
import {
  createCapabilityCatalog,
  entryContent,
  guideContent,
  type DependencyManifest,
} from '@nocobase/app-plugin-foundation/capability-guide';
import { resolveAppRuntime } from '@nocobase/app-client/runtime';
import packageMetadata from '../../package.json' with { type: 'json' };
import appRuntime from '../../client/runtime.js';
import cliPlugins from '../../cli/plugins.js';
import serverPlugins from '../../server/plugins.js';
import {
  buildRouteNavigation,
  buildSettingsCatalog,
  routeKey,
} from '../../client/routing/route-navigation.js';

// App foundation (@nocobase/app-plugin-foundation): registered on the server,
// the client and the command line (its build hook). As in template
// 1.0.0-beta.92, its capability guide, Features and extensions, is a card of
// the settings home's System category, for whoever its page grant lets open
// it, and the protected /foundation page keeps its URL without an entry.

describe('App foundation', () => {
  it('is registered on the server and the command line', () => {
    for (const plugins of [serverPlugins.plugins, cliPlugins.plugins])
      expect(
        plugins.filter(
          (plugin) => plugin.packageName === '@nocobase/app-plugin-foundation',
        ),
      ).toHaveLength(1);
  });

  it('keeps its overview at the protected URL, without a menu entry', async () => {
    const runtime = await resolveAppRuntime(appRuntime);
    // In the plugin's own settings group (`settingsGroup`), which adds
    // nothing to its address and has no entry while the page has none.
    const page = runtime.routes
      .flatMap((route) => [route, ...(route.children ?? [])])
      .find(({ name }) => name === 'foundation');
    expect(page).toMatchObject({
      path: '/foundation',
      auth: 'required',
      authz: 'unrestricted',
    });
    expect(
      buildRouteNavigation(runtime.routes, new Set()).some(
        ({ route }) => route.name === 'foundation',
      ),
    ).toBe(false);
  });

  it('puts Features and extensions in the System settings for whoever may open it', async () => {
    const runtime = await resolveAppRuntime(appRuntime);
    const guide = buildSettingsCatalog(runtime.routes, new Set())
      .find(({ route }) => route.name === 'settingsSystem')
      ?.modules.find(({ route }) => route.name === 'capabilityGuide');
    expect(guide?.target).toMatchObject({
      path: '/settings/capabilities',
      auth: 'required',
      authz: CAPABILITY_GUIDE_ACCESS,
    });
    expect(
      runtime.routes.find(({ name }) => name === 'capabilityGuideEntry')?.authz,
    ).toEqual(CAPABILITY_GUIDE_ACCESS);
    // Not a menu entry of its own: the settings entry stands for it.
    const menu = buildRouteNavigation(runtime.routes, new Set());
    expect(
      menu.some(({ route }) =>
        ['capabilityGuide', 'foundationSettings'].includes(route.name),
      ),
    ).toBe(false);
    expect(
      buildSettingsCatalog(runtime.routes, new Set([routeKey(guide!.route)]))
        .flatMap(({ modules }) => modules)
        .some(({ route }) => route.name === 'capabilityGuide'),
    ).toBe(false);
  });

  it('lists every plugin this application declares in the capability guide', () => {
    const manifest = packageMetadata as DependencyManifest;
    const { entries } = createCapabilityCatalog(manifest);
    const declared = Object.keys({
      ...manifest.dependencies,
      ...manifest.devDependencies,
    })
      .filter((name) => name.includes('app-plugin-'))
      .sort();
    expect(
      entries
        .filter((entry) => entry.source === 'plugin')
        .map((entry) => entry.packageName)
        .sort(),
    ).toEqual(declared);
    for (const entry of entries) {
      for (const locale of ['en-US', 'zh-CN']) {
        const text = entryContent(guideContent(locale), entry);
        expect(text.title.trim()).not.toBe('');
        expect(text.summary.trim()).not.toBe('');
      }
    }
  });
});
