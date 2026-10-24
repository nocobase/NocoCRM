import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router';
import { UserMenu } from '../../client/layouts/components/user-menu.js';
const state = vi.hoisted(() => ({
  accounts: [] as {
    username: string;
    name: string;
    role: string;
    current: boolean;
  }[],
  signIn: vi.fn(),
  signOut: vi.fn(),
  refresh: vi.fn(),
  error: vi.fn(),
  resolveError: vi.fn(),
}));
vi.mock('@nocobase/app-plugin-demo-mode/client/accounts', () => ({
  useDemoAccounts: () => ({ accounts: state.accounts, signIn: state.signIn }),
}));
vi.mock('@nocobase/app-plugin-authentication/client', () => ({
  useAuthentication: () => ({
    client: { signOut: state.signOut },
    session: { user: { name: 'Test user' } },
    refresh: state.refresh,
  }),
}));
// The plugin turns a sign-out error into its own localized message.
vi.mock('@nocobase/app-plugin-authentication/client/actions', () => ({
  useAuthenticationErrorResolver: () => state.resolveError,
}));
vi.mock('@nocobase/i18n/client', () => ({
  useTranslation: () => ({
    t: (key: string, options?: { defaultValue?: string }) =>
      options?.defaultValue ?? key,
  }),
}));
vi.mock('@nocobase/app-client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@nocobase/app-client')>()),
  useToaster: () => ({ show: state.error, close: vi.fn() }),
}));
vi.mock('../../client/layouts/components/language-switcher.js', () => ({
  LanguageSwitcher: () => null,
}));
beforeEach(() => {
  state.accounts = [];
  state.signIn.mockReset().mockResolvedValue(undefined);
  state.signOut.mockReset();
  state.refresh.mockReset();
  state.error.mockReset();
  state.resolveError.mockReset();
  state.resolveError.mockReturnValue({
    message: 'Localized authentication error',
  });
});
it('reports an API sign-out failure without refreshing the session', async () => {
  state.signOut.mockResolvedValue({ error: { message: 'Unavailable' } });
  render(
    <MemoryRouter initialEntries={['/leads']}>
      <UserMenu />
    </MemoryRouter>,
  );
  screen.getByRole('button', { name: 'Open account menu' }).focus();
  await userEvent.keyboard('{Enter}');
  await userEvent.click(
    await screen.findByRole('menuitem', { name: 'Sign out' }),
  );
  await waitFor(() =>
    expect(state.error).toHaveBeenCalledWith({
      type: 'error',
      title: 'Localized authentication error',
    }),
  );
  expect(state.resolveError).toHaveBeenCalledWith({ message: 'Unavailable' });
  expect(state.refresh).not.toHaveBeenCalled();
});
it('refreshes the session after successful sign-out', async () => {
  state.signOut.mockResolvedValue({ error: null });
  render(
    <MemoryRouter initialEntries={['/leads']}>
      <UserMenu />
    </MemoryRouter>,
  );
  screen.getByRole('button', { name: 'Open account menu' }).focus();
  await userEvent.keyboard('{Enter}');
  await userEvent.click(
    await screen.findByRole('menuitem', { name: 'Sign out' }),
  );
  await waitFor(() => expect(state.refresh).toHaveBeenCalledOnce());
  expect(state.error).not.toHaveBeenCalled();
});

it('reports a network sign-out failure and allows retry', async () => {
  state.signOut
    .mockRejectedValueOnce(new Error('Network unavailable'))
    .mockResolvedValueOnce({ error: null });
  render(
    <MemoryRouter initialEntries={['/leads']}>
      <UserMenu />
    </MemoryRouter>,
  );
  screen.getByRole('button', { name: 'Open account menu' }).focus();
  await userEvent.keyboard('{Enter}');
  await userEvent.click(
    await screen.findByRole('menuitem', { name: 'Sign out' }),
  );
  await waitFor(() => expect(state.error).toHaveBeenCalledOnce());
  expect(state.refresh).not.toHaveBeenCalled();
  screen.getByRole('button', { name: 'Open account menu' }).focus();
  await userEvent.keyboard('{Enter}');
  await userEvent.click(
    await screen.findByRole('menuitem', { name: 'Sign out' }),
  );
  await waitFor(() => expect(state.refresh).toHaveBeenCalledOnce());
});

it('offers the plugin account switcher and preserves the current page', async () => {
  state.accounts = [
    {
      username: 'admin',
      name: 'Demo admin',
      role: 'Administrator',
      current: true,
    },
    { username: 'sales', name: 'Demo sales', role: 'Sales', current: false },
  ];
  render(
    <MemoryRouter initialEntries={['/leads']}>
      <UserMenu />
    </MemoryRouter>,
  );
  screen.getByRole('button', { name: 'Open account menu' }).focus();
  await userEvent.keyboard('{Enter}');
  await userEvent.hover(
    await screen.findByRole('menuitem', { name: 'accounts.menu' }),
  );
  await userEvent.click(
    await screen.findByRole('menuitemradio', { name: /Demo sales/ }),
  );
  expect(state.signIn).toHaveBeenCalledWith('sales', '/leads');
});
