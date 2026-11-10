import { answerApi, renderWithApp } from '@nocobase/app-testing/client';
import { apiClientToken, type ClientApplication } from '@nocobase/app-client';
import { resolveAppClientContributions } from '@nocobase/app-client/plugins';
import {
  AuthorizationClient,
  authorizationClientToken,
} from '@nocobase/app-plugin-authorization/client';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { Route, Routes, useLocation } from 'react-router';
import { expect, it } from 'vitest';
import metadata from '../../package.json' with { type: 'json' };
import { Breadcrumbs } from '../../client/components/breadcrumbs.js';
import enUS from '../../client/locales/en-US.js';
import zhCN from '../../client/locales/zh-CN.js';
import databaseExplorerRoutes from '../../client/pages/settings/database-explorer/routes.js';
import settingsRoutes from '../../client/pages/settings/routes.js';
import SettingsHomePage from '../../client/pages/settings/settings-home.js';
import shellRoutes from '../../client/pages/settings/shell-routes.js';
import { RouteTreeProvider } from '../../client/routing/route-context.js';
import { useRouteNavigation } from '../../client/routing/route-navigation.js';

// The settings home (client/pages/settings/settings-home.tsx): the CRM's
// settings pages as cards by category, each shown only to whoever its grant
// lets open it, in place of the tabs of the former Settings page.

const { routes } = resolveAppClientContributions([
  {
    packageName: metadata.name,
    source: 'application',
    routes: [shellRoutes, settingsRoutes, databaseExplorerRoutes],
  },
]);

const namespaces = {
  [metadata.name]: {
    'en-US': async () => ({ default: enUS }),
    'zh-CN': async () => ({ default: zhCN }),
  },
};
const services = (app: ClientApplication) =>
  app.container.instance(
    authorizationClientToken,
    new AuthorizationClient(app.container.resolve(apiClientToken)),
  );

function Shell({ children }: { children: ReactNode }) {
  const { denied, loading } = useRouteNavigation(routes);
  return (
    <RouteTreeProvider routes={routes} access={{ denied, loading }}>
      <Breadcrumbs denied={denied} />
      {children}
    </RouteTreeProvider>
  );
}

function Where() {
  return <output aria-label='Route'>{useLocation().pathname}</output>;
}

type Snapshot = {
  unrestricted: boolean;
  permissions: readonly {
    resource: { type: string; id: string };
    actions: readonly string[];
  }[];
};

function mount(
  snapshot: Snapshot = { unrestricted: true, permissions: [] },
  { route = '/settings', locale = 'en-US' } = {},
) {
  return renderWithApp(
    <Shell>
      <Routes>
        <Route path='/settings' element={<SettingsHomePage />} />
        <Route path='*' element={<Where />} />
      </Routes>
    </Shell>,
    {
      route,
      locale,
      namespace: metadata.name,
      namespaces,
      services,
      fetch: answerApi(({ path }) =>
        path === 'authorization/permissions'
          ? { data: snapshot }
          : { data: [] },
      ),
    },
  );
}

const cardsOf = (region: HTMLElement) =>
  within(region)
    .getAllByRole('link')
    .map((card) => card.getAttribute('href'));

it('groups everything an administrator may set into business, people and system cards that open their pages', async () => {
  const user = userEvent.setup();
  await mount();
  expect(
    await screen.findByRole('heading', { level: 1, name: 'System settings' }),
  ).toBeVisible();
  const business = await screen.findByRole('region', {
    name: enUS.settings.categories.business,
  });
  expect(
    screen.getAllByRole('region').map((region) => region.ariaLabel),
  ).toEqual([
    enUS.settings.categories.business,
    enUS.settings.categories.account,
    enUS.settings.categories.system,
  ]);
  const general = within(business).getAllByRole('link')[0]!;
  expect(general.textContent).toBe(
    `${enUS.crm.navigation.general}${enUS.crm.settingsCards.general}`,
  );
  expect(cardsOf(business)).toEqual([
    '/settings/crm',
    '/settings/approval-flow',
    '/settings/demo-data',
  ]);
  expect(
    cardsOf(
      screen.getByRole('region', { name: enUS.settings.categories.account }),
    ),
  ).toEqual(['/settings/users', '/settings/roles', '/settings/api-keys']);
  expect(
    cardsOf(
      screen.getByRole('region', { name: enUS.settings.categories.system }),
    ),
  ).toEqual([
    '/settings/notifications/templates',
    '/settings/scheduled-tasks',
    '/settings/database-explorer',
  ]);
  general.focus();
  await user.keyboard('{Enter}');
  await waitFor(() =>
    expect(screen.getByRole('status', { name: 'Route' })).toHaveTextContent(
      '/settings/crm',
    ),
  );
});

it('shows a restricted reader only the cards their grants open, and no empty category', async () => {
  await mount({
    unrestricted: false,
    permissions: [
      { resource: { type: 'settings', id: 'crm' }, actions: ['manage'] },
    ],
  });
  const business = await screen.findByRole('region', {
    name: enUS.settings.categories.business,
  });
  await waitFor(() => expect(screen.getAllByRole('region')).toHaveLength(2));
  expect(cardsOf(business)).toHaveLength(3);
  // Everyone signed in manages their own API keys.
  expect(
    cardsOf(
      screen.getByRole('region', { name: enUS.settings.categories.account }),
    ),
  ).toEqual(['/settings/api-keys']);
  expect(
    screen.queryByRole('region', { name: enUS.settings.categories.system }),
  ).not.toBeInTheDocument();
});

it('reads in Chinese', async () => {
  await mount(undefined, { locale: 'zh-CN' });
  expect(
    await screen.findByRole('heading', { level: 1, name: '系统设置' }),
  ).toBeVisible();
  const business = await screen.findByRole('region', { name: '业务配置' });
  expect(within(business).getAllByRole('link')[0]!.textContent).toBe(
    `通用${zhCN.crm.settingsCards.general}`,
  );
});

it('links the System settings breadcrumb back to the home from a settings page', async () => {
  await mount(undefined, { route: '/settings/roles' });
  const trail = await screen.findByRole('navigation', { name: 'Breadcrumb' });
  expect(
    await within(trail).findByRole('link', { name: 'System settings' }),
  ).toHaveAttribute('href', '/settings');
  expect(within(trail).getByText(enUS.crm.navigation.roles)).toBeVisible();
});
