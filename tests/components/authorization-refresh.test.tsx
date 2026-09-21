import { render, renderHook, screen, waitFor } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
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
it('removes already loaded page content when authorization has no valid result', async () => {
  const route = {
    id: 'users',
    name: 'users',
    path: '/settings/users',
    packageName: 'crm',
    auth: 'required',
    authz,
    componentLoader: async () => ({ default: () => <p>Protected content</p> }),
  } as unknown as AppClientRegisteredRoute;
  const { rerender } = render(<ClientRoute route={route} />);
  await screen.findByText('Protected content');
  state.decision = undefined;
  state.revision++;
  rerender(<ClientRoute route={route} />);
  expect(screen.queryByText('Protected content')).not.toBeInTheDocument();
  state.decision = false;
  rerender(<ClientRoute route={route} />);
  expect(screen.getByText('Access denied')).toBeInTheDocument();
});
