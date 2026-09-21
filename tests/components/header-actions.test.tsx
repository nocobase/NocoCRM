import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { expect, it, vi } from 'vitest';
import { HeaderActions } from '../../client/layouts/components/header-actions.js';

vi.mock('../../client/theme/index.js', () => ({ ThemeSettings: () => null }));
vi.mock('../../client/layouts/components/user-menu.js', () => ({
  UserMenu: () => null,
}));
vi.mock('../../client/components/crm/notification-bell.js', () => ({
  NotificationBell: () => <button aria-label='Notifications' />,
}));
it('hides Settings when navigation has no accessible pages', () => {
  render(
    <MemoryRouter>
      <HeaderActions showSettings={false} showDev={false} />
    </MemoryRouter>,
  );
  expect(
    screen.queryByRole('link', { name: 'Settings' }),
  ).not.toBeInTheDocument();
});

it('keeps Settings visible and current on an accessible settings page', () => {
  render(
    <MemoryRouter initialEntries={['/settings/users']}>
      <HeaderActions showSettings showDev={false} />
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
        <HeaderActions showSettings showDev={false} />
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
