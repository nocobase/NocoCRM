import { answerApi, renderWithApp } from '@nocobase/app-testing/client';
import { apiClientToken, type ClientApplication } from '@nocobase/app-client';
import { resolveAppClientContributions } from '@nocobase/app-client/plugins';
import {
  AuthorizationClient,
  authorizationClientToken,
} from '@nocobase/app-plugin-authorization/client';
import { act, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState, type ReactNode } from 'react';
import { Route, Routes } from 'react-router';
import { expect, it } from 'vitest';
import metadata from '../../package.json' with { type: 'json' };
import { BodyPortal } from '../../client/components/body-portal.js';
import { Breadcrumbs } from '../../client/components/breadcrumbs.js';
import enUS from '../../client/locales/en-US.js';
import zhCN from '../../client/locales/zh-CN.js';
import { useSettingsLeave } from '../../client/pages/settings/hooks.js';
import { PermissionManagementPage } from '../../client/pages/settings/permission-management-page.js';
import settingsRoutes from '../../client/pages/settings/routes.js';
import shellRoutes from '../../client/pages/settings/shell-routes.js';
import { ClientRoute } from '../../client/routing/client-route.js';
import { RouteTreeProvider } from '../../client/routing/route-context.js';
import { RouteLeaveBoundary } from '../../client/routing/route-leave-boundary.js';
import { useRouteNavigation } from '../../client/routing/route-navigation.js';

// Roles (client/pages/settings/permission-management-page.tsx) is a settings
// module of one view in the CRM, which registers no Default access page: it
// draws its heading on the template's module frame without a tab bar, and
// keeps a draft through a permission recheck and a leave confirmation.

const { routes } = resolveAppClientContributions([
  {
    packageName: metadata.name,
    source: 'application',
    routes: [shellRoutes, settingsRoutes],
  },
]);
const roles = routes
  .flatMap((route) => route.children ?? [])
  .flatMap((route) => route.children ?? [])
  .find((route) => route.name === 'settings-roles')!;

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

/** The shell's route tree and permission check, as `AppLayout` provides them. */
function Shell({ children }: { children: ReactNode }) {
  const { denied, loading } = useRouteNavigation(routes);
  return (
    <RouteTreeProvider routes={routes} access={{ denied, loading }}>
      <output aria-label='Permission check'>
        {loading ? 'Checking' : 'Ready'}
      </output>
      <RouteLeaveBoundary hidden={loading}>{children}</RouteLeaveBoundary>
    </RouteTreeProvider>
  );
}

function Draft() {
  const [value, setValue] = useState('');
  const leave = useSettingsLeave(value !== '', false);
  return (
    <>
      <input
        aria-label='Draft'
        value={value}
        onChange={(event) => setValue(event.target.value)}
      />
      <BodyPortal>
        <div aria-label='Draft overlay' role='dialog'>
          {value}
        </div>
      </BodyPortal>
      {leave.dialog}
    </>
  );
}

function DraftPage() {
  return (
    <PermissionManagementPage tab='roles'>
      <Draft />
    </PermissionManagementPage>
  );
}

function mount(
  ui: ReactNode,
  {
    locale = 'en-US',
    hold,
  }: { locale?: string; hold?: () => Promise<void> | undefined } = {},
) {
  return renderWithApp(<Shell>{ui}</Shell>, {
    route: '/settings/roles',
    locale,
    namespace: metadata.name,
    namespaces,
    services,
    fetch: answerApi(async ({ path }) => {
      if (path !== 'authorization/permissions') return { data: [] };
      await hold?.();
      return { data: { unrestricted: true, permissions: [] } };
    }),
  });
}

it.each([
  ['en-US', enUS.crm.navigation.roles],
  ['zh-CN', zhCN.crm.navigation.roles],
])(
  'names the page as its card in %s and draws no single tab',
  async (locale, title) => {
    await mount(<DraftPage />, { locale });
    expect(
      await screen.findByRole('heading', { level: 1, name: title }),
    ).toBeVisible();
    await waitFor(() =>
      expect(
        screen.getByRole('status', { name: 'Permission check' }),
      ).toHaveTextContent('Ready'),
    );
    expect(screen.queryByRole('tablist')).not.toBeInTheDocument();
    expect(screen.queryByRole('tab')).not.toBeInTheDocument();
  },
);

it('keeps the draft hidden while permissions are rechecked, then shows it again', async () => {
  let pending: PromiseWithResolvers<void> | undefined;
  // The Roles route with its grant, drawing a draft in place of the list.
  const draftRoute = {
    ...roles,
    componentLoader: async () => ({ default: DraftPage }),
  };
  const next = await mount(<ClientRoute route={draftRoute} />, {
    hold: () => pending?.promise,
  });
  const draft = await screen.findByRole('textbox', { name: 'Draft' });
  await userEvent.type(draft, 'Keep this unsaved value');
  pending = Promise.withResolvers<void>();
  try {
    act(() =>
      next.app.container.resolve(authorizationClientToken).invalidate(),
    );
    await waitFor(() => expect(draft).not.toBeVisible());
    expect(
      screen.queryByRole('dialog', { name: 'Draft overlay' }),
    ).not.toBeInTheDocument();
    expect(draft).toHaveValue('Keep this unsaved value');
  } finally {
    pending.resolve();
    pending = undefined;
  }
  await waitFor(() => expect(draft).toBeVisible());
  expect(screen.getByRole('textbox', { name: 'Draft' })).toBe(draft);
  expect(draft).toHaveValue('Keep this unsaved value');
});

it('asks before the Settings breadcrumb leaves a draft', async () => {
  const user = userEvent.setup();
  await mount(
    <>
      <Breadcrumbs />
      <Routes>
        <Route path='/settings/roles' element={<DraftPage />} />
        <Route path='/settings' element={<h1>Settings destination</h1>} />
      </Routes>
    </>,
  );
  const draft = await screen.findByRole('textbox', { name: 'Draft' });
  await user.type(draft, 'Unsaved draft');
  await waitFor(() =>
    expect(
      screen.getByRole('status', { name: 'Permission check' }),
    ).toHaveTextContent('Ready'),
  );
  const home = await screen.findByRole('link', {
    name: enUS.settings.title,
  });
  await user.click(home);
  expect(await screen.findByRole('alertdialog')).toBeVisible();
  await user.click(screen.getByRole('button', { name: 'Cancel', exact: true }));
  expect(draft).toHaveValue('Unsaved draft');
  await user.click(home);
  await user.click(
    await screen.findByRole('button', { name: 'Confirm', exact: true }),
  );
  expect(
    await screen.findByRole('heading', { name: 'Settings destination' }),
  ).toBeVisible();
  expect(
    screen.queryByRole('textbox', { name: 'Draft' }),
  ).not.toBeInTheDocument();
});
