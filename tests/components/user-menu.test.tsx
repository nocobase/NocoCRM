import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, expect, it, vi } from 'vitest';
import { UserMenu } from '../../client/layouts/components/user-menu.js';
const state = vi.hoisted(() => ({
  signOut: vi.fn(),
  refresh: vi.fn(),
  error: vi.fn(),
}));
vi.mock('@nocobase/app-plugin-authentication/client', () => ({
  useAuthentication: () => ({
    client: { signOut: state.signOut },
    session: { user: { name: 'Test user' } },
    refresh: state.refresh,
  }),
}));
vi.mock('@nocobase/i18n/client', () => ({
  useTranslation: () => ({
    t: (_key: string, options: { defaultValue: string }) =>
      options.defaultValue,
  }),
}));
vi.mock('sonner', () => ({ toast: { error: state.error } }));
vi.mock('../../client/layouts/components/language-switcher.js', () => ({
  LanguageSwitcher: () => null,
}));
beforeEach(() => {
  state.signOut.mockReset();
  state.refresh.mockReset();
  state.error.mockReset();
});
it('reports an API sign-out failure without refreshing the session', async () => {
  state.signOut.mockResolvedValue({ error: { message: 'Unavailable' } });
  render(<UserMenu />);
  screen.getByRole('button', { name: 'Open account menu' }).focus();
  await userEvent.keyboard('{Enter}');
  await userEvent.click(
    await screen.findByRole('menuitem', { name: 'Sign out' }),
  );
  await waitFor(() =>
    expect(state.error).toHaveBeenCalledWith(
      'Unable to sign out. Please try again.',
    ),
  );
  expect(state.refresh).not.toHaveBeenCalled();
});
it('refreshes the session after successful sign-out', async () => {
  state.signOut.mockResolvedValue({ error: null });
  render(<UserMenu />);
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
  render(<UserMenu />);
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
