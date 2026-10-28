import { enableDemoMode } from '../setup/demo-mode.js';
import demoMode from '@nocobase/app-plugin-demo-mode/client';
import {
  answerApi,
  renderWithApp,
  type ApiCall,
} from '@nocobase/app-testing/client';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it, vi } from 'vitest';

import { HeaderActions } from '../../client/layouts/components/header-actions.js';

vi.mock('../../client/components/crm/assistant-header-button.js', () => ({
  AssistantHeaderButton: () => null,
}));
vi.mock('../../client/theme/index.js', () => ({ ThemeSettings: () => null }));
vi.mock('../../client/layouts/components/user-menu.js', () => ({
  UserMenu: () => null,
}));

it('mounts the plugin menu and allows retry after a failed switch', async () => {
  const requests: ApiCall[] = [];
  const view = await renderWithApp(<HeaderActions />, {
    route: '/leads?view=board#selected',
    plugins: [demoMode()],
    services: enableDemoMode,
    fetch: answerApi((call) => {
      requests.push(call);
      switch (call.path) {
        case 'demoMode/accounts':
          return {
            data: [
              {
                username: 'admin',
                name: 'Super Admin',
                role: 'Administrator',
                current: true,
              },
              {
                username: 'sales',
                name: 'Sophie Bennett',
                role: 'Sales',
                current: false,
              },
            ],
          };
        case 'demoMode/accounts/sales/signIn':
          return Response.json(
            { error: { message: 'Unavailable' } },
            { status: 503 },
          );
        default:
          return new Response(null, { status: 404 });
      }
    }),
  });
  await userEvent.click(
    await screen.findByRole('button', { name: 'Demo mode · Switch account' }),
  );
  expect(
    await screen.findByRole('menuitemradio', { name: /Super Admin/ }),
  ).toHaveAttribute('aria-checked', 'true');
  expect(
    screen.getByText(
      'Data resets automatically every day. Changes are not saved.',
      { exact: false },
    ),
  ).toBeVisible();
  const sales = screen.getByRole('menuitemradio', { name: /Sophie Bennett/ });
  await userEvent.click(sales);
  await waitFor(() =>
    expect(view.toasts()).toEqual([
      expect.objectContaining({
        type: 'error',
        title: 'Could not enter this account.',
      }),
    ]),
  );
  expect(requests.some(({ path }) => path === 'demoMode/status')).toBe(false);
  expect(requests).toContainEqual({
    method: 'POST',
    path: 'demoMode/accounts/sales/signIn',
  });
  expect(sales).not.toHaveAttribute('aria-disabled', 'true');
  await userEvent.click(sales);
  await waitFor(() =>
    expect(requests.filter(({ method }) => method === 'POST')).toHaveLength(2),
  );
});

it('keeps ordinary application headers free of demo controls', async () => {
  const api = vi.fn(() => new Response(null, { status: 404 }));
  await renderWithApp(<HeaderActions />, {
    route: '/leads',
    plugins: [demoMode()],
    fetch: answerApi(api),
  });
  expect(api).not.toHaveBeenCalled();
  expect(
    screen.queryByRole('button', { name: /Demo mode/ }),
  ).not.toBeInTheDocument();
});
