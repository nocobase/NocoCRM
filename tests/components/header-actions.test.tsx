import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { beforeEach, expect, it, vi } from 'vitest';
import { HeaderActions } from '../../client/shell/header-actions.js';

vi.mock('@nocobase/app-client', () => ({
  useClientApplication: () => ({ runtime: { settingsRouteTree: [] } }),
}));

const state = vi.hoisted(() => ({ pages: [] as unknown[] }));
vi.mock('../../client/routing/route-navigation.js', () => ({
  useRouteNavigation: () => ({ items: state.pages }),
  navigationPages: (items: unknown[]) => items,
}));
vi.mock('../../client/theme/index.js', () => ({ ThemeSettings: () => null }));
vi.mock('../../client/shell/user-menu.js', () => ({ UserMenu: () => null }));
vi.mock('../../client/components/crm/notification-bell.js', () => ({
  NotificationBell: () => <button aria-label='Notifications' />,
}));
beforeEach(() => {
  state.pages = [];
});

it('hides Settings when navigation has no accessible pages', () => {
  render(
    <MemoryRouter>
      <HeaderActions />
    </MemoryRouter>,
  );
  expect(
    screen.queryByRole('link', { name: 'Settings' }),
  ).not.toBeInTheDocument();
});

it('keeps Settings visible and current on an accessible settings page', () => {
  state.pages = [{}];
  render(
    <MemoryRouter initialEntries={['/settings/users']}>
      <HeaderActions />
    </MemoryRouter>,
  );
  expect(screen.getByRole('link', { name: 'Settings' })).toHaveAttribute(
    'aria-current',
    'page',
  );
  expect(
    screen.queryByRole('button', { name: 'Notifications' }),
  ).not.toBeInTheDocument();
  expect(
    screen.queryByRole('button', { name: 'AI 助手' }),
  ).not.toBeInTheDocument();
});

it('preserves CRM notifications and the assistant action on application pages', () => {
  const listener = vi.fn();
  window.addEventListener('crm-assistant', listener);
  try {
    render(
      <MemoryRouter initialEntries={['/leads']}>
        <HeaderActions />
      </MemoryRouter>,
    );
    expect(
      screen.getByRole('button', { name: 'Notifications' }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'AI 助手' }));
    expect(listener).toHaveBeenCalledOnce();
  } finally {
    window.removeEventListener('crm-assistant', listener);
  }
});
