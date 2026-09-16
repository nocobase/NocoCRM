import { render, renderHook, screen, waitFor } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
import type { AppClientRegisteredRoute } from '@nocobase/app-client/plugins';
import { useRouteNavigation } from '../../client/routing/route-navigation.js';
import { ClientPage } from '../../client/routing/client-route.js';
const state = vi.hoisted(() => ({
  revision: 0,
  can: vi.fn(),
  decision: { can: true } as { can: boolean } | undefined,
}));
vi.mock('@nocobase/app-plugin-authorization/client', () => ({
  useAuthorizationRevision: () => state.revision,
}));
vi.mock('@refinedev/core', () => ({
  useCanWithoutCache: () => ({ can: state.can }),
  useCan: () => ({ data: state.decision, isLoading: false }),
}));
vi.mock('@nocobase/i18n/client', () => ({
  NamespaceScope: ({ children }: { children: React.ReactNode }) => children,
}));
beforeEach(() => {
  state.revision = 0;
  state.can.mockReset();
  state.decision = { can: true };
});
it('hides a mounted menu while a new permission revision is checked', async () => {
  const routes = [
    {
      id: 'users',
      name: 'users',
      path: '/settings/users',
      packageName: 'crm',
      auth: 'required',
      access: { resource: 'users', action: 'read' },
      navigation: { title: 'Users' },
      componentLoader: async () => ({ default: () => null }),
    },
  ] as AppClientRegisteredRoute[];
  state.can.mockResolvedValue({ can: true });
  const { result, rerender } = renderHook(() =>
    useRouteNavigation(routes, true),
  );
  await waitFor(() => expect(result.current.items).toHaveLength(1));
  state.can.mockResolvedValue({ can: false });
  state.revision++;
  rerender();
  expect(result.current.items).toHaveLength(0);
  await waitFor(() => expect(result.current.loading).toBe(false));
  expect(result.current.items).toHaveLength(0);
});
it('removes already loaded page content when authorization has no valid result', async () => {
  const page = {
    access: { resource: 'users', action: 'read' },
    checkAccess: true,
    componentLoader: async () => ({ default: () => <p>Protected content</p> }),
    kind: 'page' as const,
    label: 'Users',
    packageName: 'crm',
  };
  const { rerender } = render(<ClientPage page={page} />);
  await screen.findByText('Protected content');
  state.decision = undefined;
  state.revision++;
  rerender(<ClientPage page={page} />);
  expect(screen.queryByText('Protected content')).not.toBeInTheDocument();
  expect(screen.getByText('Access denied')).toBeInTheDocument();
});
