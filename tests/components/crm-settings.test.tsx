import { render, screen, waitFor, within } from '@testing-library/react';
import { ApiClientError } from '@nocobase/app-client';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { inboxKeys } from '@nocobase/app-plugin-notification-in-app/client/inbox';
import { describe, expect, it, vi } from 'vitest';
import { crmEn } from '../../client/locales/crm/index.js';
import { defaultSettings } from '../../server/providers/crm/schema.js';

// The settings page's in-app notification switches: each kind of message
// the CRM sends, on by default, saved by the reminders card's own Save with
// that card's settings alone; and the business guidance page, the shipped
// guidance until an administrator writes over it.

const state = vi.hoisted(() => ({
  api: vi.fn(),
  // Whether the demo dataset reads as imported.
  demoPresent: false,
}));

const lookup = (key: string): unknown =>
  key
    .split('.')
    .reduce<unknown>(
      (value, part) =>
        value && typeof value === 'object'
          ? (value as Record<string, unknown>)[part]
          : undefined,
      crmEn,
    );

vi.mock('../../client/components/crm/api.js', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('../../client/components/crm/api.js')>();
  return {
    ...actual,
    useCrmQuery: (path: string) => ({
      isLoading: false,
      data:
        path === 'systemSettings'
          ? defaultSettings
          : {
              present: state.demoPresent,
              createdAt: null,
              records: state.demoPresent ? 201 : 0,
              accounts: [],
            },
    }),
    useCrmApi: () => state.api,
    useCrmScopeKey: () => ['crm'],
    useRefresh: () => async () => undefined,
    useCrmText: () => ({
      text: (key: string): string => {
        const value = lookup(key);
        return typeof value === 'string' ? value : key;
      },
      language: 'en-US',
    }),
  };
});

const { default: SettingsPage } =
  await import('../../client/pages/crm-settings.js');
const { default: GuidancePage } =
  await import('../../client/pages/crm-guidance.js');
const { default: DemoDataPage } =
  await import('../../client/pages/settings/demo-data.js');

describe('the settings page', () => {
  it("switches a kind of in-app message off and saves it with the reminders card's settings", async () => {
    const user = userEvent.setup();
    state.api.mockResolvedValue({ data: {} });
    render(
      <QueryClientProvider client={new QueryClient()}>
        <MemoryRouter initialEntries={['/settings/crm']}>
          <SettingsPage />
        </MemoryRouter>
      </QueryClientProvider>,
    );
    const approvals = screen.getByRole('switch', {
      name: crmEn.notifications.notifyApprovals,
    });
    for (const name of [
      crmEn.notifications.notifyApprovals,
      crmEn.notifications.notifyRecordChanges,
      crmEn.notifications.notifyTaskReminders,
    ])
      expect(
        screen.getByRole('switch', { name }).getAttribute('aria-checked'),
      ).toBe('true');
    const card = document.getElementById('settings-reminders') as HTMLElement;
    const save = within(card).getByRole('button', { name: crmEn.save });
    // Nothing to save until something on the card changes.
    expect(save).toHaveProperty('disabled', true);
    await user.click(approvals);
    expect(approvals.getAttribute('aria-checked')).toBe('false');
    await user.click(save);
    expect(state.api).toHaveBeenCalledWith(
      'systemSettings',
      'PUT',
      expect.objectContaining({
        notifyApprovals: false,
        notifyRecordChanges: true,
        notifyTaskReminders: true,
      }),
    );
    // The business card's settings are its own Save's.
    expect(state.api.mock.lastCall?.[2]).not.toHaveProperty('currency');
  });

  it("switches the AI ask box at the bottom of pages off with the business card's settings", async () => {
    const user = userEvent.setup();
    state.api.mockResolvedValue({ data: {} });
    render(
      <QueryClientProvider client={new QueryClient()}>
        <MemoryRouter initialEntries={['/settings/crm']}>
          <SettingsPage />
        </MemoryRouter>
      </QueryClientProvider>,
    );
    const card = document.getElementById('settings-business') as HTMLElement;
    const dock = within(card).getByRole('switch', {
      name: crmEn.fields.assistantDock,
    });
    expect(dock.getAttribute('aria-checked')).toBe('true');
    await user.click(dock);
    await user.click(within(card).getByRole('button', { name: crmEn.save }));
    expect(state.api).toHaveBeenLastCalledWith(
      'systemSettings',
      'PUT',
      expect.objectContaining({ assistantDock: false, currency: 'USD' }),
    );
    expect(state.api.mock.lastCall?.[2]).not.toHaveProperty('notifyApprovals');
  });

  it('shows the shipped business guidance, saves one written over it, and restores the default', async () => {
    const user = userEvent.setup();
    state.api.mockReset();
    state.api.mockResolvedValue({ data: {} });
    render(
      <MemoryRouter initialEntries={['/guidance']}>
        <GuidancePage />
      </MemoryRouter>,
    );
    const box = screen.getByRole('textbox', { name: crmEn.guidance });
    // The shipped guidance, in the AI language (English by default).
    expect((box as HTMLTextAreaElement).value).toContain('Company: NocoBase');
    expect(screen.getByText(crmEn.guidanceShipped)).toBeTruthy();
    const restore = screen.getByRole('button', {
      name: crmEn.guidanceRestore,
    });
    expect(restore).toHaveProperty('disabled', true);
    await user.clear(box);
    await user.type(box, '# Our rules{Enter}- Quote list prices only');
    expect(screen.getByText(crmEn.guidanceCustom)).toBeTruthy();
    await user.click(screen.getByRole('button', { name: crmEn.save }));
    expect(state.api).toHaveBeenLastCalledWith(
      'systemSettings',
      'PUT',
      expect.objectContaining({
        businessGuidance: '# Our rules\n- Quote list prices only',
      }),
    );
    // Back to the shipped one: saved as empty.
    await user.click(restore);
    expect((box as HTMLTextAreaElement).value).toContain('Company: NocoBase');
    await user.click(screen.getByRole('button', { name: crmEn.save }));
    expect(state.api).toHaveBeenLastCalledWith(
      'systemSettings',
      'PUT',
      expect.objectContaining({ businessGuidance: '' }),
    );
  });

  it('takes an import a gateway cut off for done once the dataset is there, and hides the banner', async () => {
    // On the settings' Demo data tab, the General tab's last card once.
    const user = userEvent.setup();
    state.api.mockReset();
    // The import's request is cut off by a gateway; the server finishes it,
    // and the dataset reads as present on the next ask.
    state.api.mockImplementation((path: string) =>
      path === 'demoData/import'
        ? Promise.reject(
            new ApiClientError('Gateway Timeout', {
              status: 504,
              method: 'POST',
              url: '/api/demoData/import',
              payload: null,
            }),
          )
        : Promise.resolve({
            data: {
              present: true,
              createdAt: null,
              records: 201,
              accounts: [],
            },
          }),
    );
    const client = new QueryClient();
    client.setQueryData(['crm', 'workspace'], { demoPresent: false });
    render(
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={['/settings/demo-data']}>
          <DemoDataPage />
        </MemoryRouter>
      </QueryClientProvider>,
    );
    await user.click(screen.getByRole('button', { name: crmEn.demoImport }));
    await user.click(screen.getByRole('button', { name: crmEn.confirm }));
    await waitFor(
      () =>
        expect(client.getQueryData(['crm', 'workspace'])).toEqual({
          demoPresent: true,
        }),
      { timeout: 5000 },
    );
    expect(client.getQueryData(['crm', 'demoData'])).toMatchObject({
      present: true,
    });
    expect(state.api).toHaveBeenCalledWith('demoData');
  }, 10000);

  it("refreshes the inbox's notifications once the demo data is removed, without waiting for the realtime event", async () => {
    const user = userEvent.setup();
    state.api.mockReset();
    state.api.mockImplementation((path: string) =>
      Promise.resolve({
        data: {
          present: path !== 'demoData/remove',
          createdAt: null,
          records: path === 'demoData/remove' ? 0 : 201,
          accounts: [],
        },
      }),
    );
    state.demoPresent = true;
    const client = new QueryClient();
    // The menu's unread count, as the in-app plugin keeps it.
    client.setQueryData([...inboxKeys.unread], { count: 5 });
    render(
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={['/settings/demo-data']}>
          <DemoDataPage />
        </MemoryRouter>
      </QueryClientProvider>,
    );
    // Offered once the dataset reads as present.
    const remove = await screen.findByRole('button', { name: crmEn.demoReset });
    await waitFor(() =>
      expect((remove as HTMLButtonElement).disabled).toBe(false),
    );
    await user.click(remove);
    await user.click(screen.getByRole('button', { name: crmEn.confirm }));
    await waitFor(() =>
      expect(state.api).toHaveBeenCalledWith('demoData/remove', 'POST', {}),
    );
    await waitFor(() =>
      expect(client.getQueryState([...inboxKeys.unread])?.isInvalidated).toBe(
        true,
      ),
    );
    state.demoPresent = false;
  });
});

describe('the General settings tab', () => {
  it('no longer carries the demo dataset, which has a tab of its own', () => {
    render(
      <QueryClientProvider client={new QueryClient()}>
        <MemoryRouter initialEntries={['/settings/crm']}>
          <SettingsPage />
        </MemoryRouter>
      </QueryClientProvider>,
    );
    expect(screen.queryByRole('button', { name: crmEn.demoImport })).toBeNull();
  });
});
