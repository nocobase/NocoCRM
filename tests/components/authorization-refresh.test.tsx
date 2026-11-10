import { render, renderHook, screen, waitFor } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
import { NavigationGuardProvider } from '@nocobase/app-client';
import { MemoryRouter } from 'react-router';
import type { AppClientRegisteredRoute } from '@nocobase/app-client/plugins';
import { useRouteNavigation } from '../../client/routing/route-navigation.js';
import { ClientRoute } from '../../client/routing/client-route.js';
const state = vi.hoisted(() => {
  const can = vi.fn();
  return {
    revision: 0,
    can,
    // One client object for the whole test: the navigation hook keys its
    // result on the client's identity.
    client: { can: (check: unknown) => can(check) as Promise<boolean> },
    decision: true as boolean | undefined,
  };
});
vi.mock('@nocobase/app-plugin-authorization/client', () => ({
  useAuthorizationRevision: () => state.revision,
  useAuthorizationClient: () => state.client,
  useCan: () => ({
    can: state.decision === true,
    isPending: state.decision === undefined,
  }),
}));
vi.mock('@nocobase/i18n/client', () => ({
  NamespaceScope: ({ children }: { children: React.ReactNode }) => children,
  // The route wrappers read their status text through the locale; the
  // English default is what this test looks for.
  useTranslation: () => ({
    t: (key: string, options?: { defaultValue?: string }) =>
      options?.defaultValue ?? key,
  }),
}));
beforeEach(() => {
  state.revision = 0;
  state.can.mockReset();
  state.decision = true;
});
const authz = {
  resource: { type: 'page', id: 'users' },
  action: 'access',
} as const;
it('hides a mounted menu while a new permission revision is checked', async () => {
  const routes = [
    {
      id: 'users',
      name: 'users',
      path: '/settings/users',
      packageName: 'crm',
      auth: 'required',
      authz,
      navigation: { title: 'Users' },
      componentLoader: async () => ({ default: () => null }),
    },
  ] as AppClientRegisteredRoute[];
  state.can.mockResolvedValue(true);
  const { result, rerender } = renderHook(() => useRouteNavigation(routes));
  await waitFor(() => expect(result.current.items).toHaveLength(1));
  state.can.mockResolvedValue(false);
  state.revision++;
  rerender();
  expect(result.current.items).toHaveLength(0);
  await waitFor(() => expect(result.current.loading).toBe(false));
  expect(result.current.items).toHaveLength(0);
});
// Since template 1.0.0-beta.92 a recheck conceals an allowed page with React
// Activity, keeping its drafts, and only a settled denial removes it; the
// route's leave guard needs the application's NavigationGuardProvider.
it('hides loaded page content while authorization rechecks and removes it on denial', async () => {
  const route = {
    id: 'users',
    name: 'users',
    path: '/settings/users',
    packageName: 'crm',
    auth: 'required',
    authz,
    componentLoader: async () => ({ default: () => <p>Protected content</p> }),
  } as unknown as AppClientRegisteredRoute;
  // A new element each time, so every rerender reads the mocked decision.
  const view = () => (
    <MemoryRouter>
      <NavigationGuardProvider>
        <ClientRoute route={route} />
      </NavigationGuardProvider>
    </MemoryRouter>
  );
  const { rerender } = render(view());
  await screen.findByText('Protected content');
  state.decision = undefined;
  state.revision++;
  rerender(view());
  await waitFor(() =>
    expect(screen.getByText('Protected content')).not.toBeVisible(),
  );
  state.decision = false;
  rerender(view());
  expect(screen.queryByText('Protected content')).not.toBeInTheDocument();
  expect(screen.getByText('Access denied')).toBeInTheDocument();
});
