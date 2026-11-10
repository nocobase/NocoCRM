import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  QueryClient,
  QueryClientProvider,
  useQuery,
} from '@tanstack/react-query';
import type { ReactElement } from 'react';
import {
  createMemoryRouter,
  MemoryRouter,
  Outlet,
  Route,
  RouterProvider,
  Routes,
} from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { crmEn } from '../../client/locales/crm/index.js';
import { WhatsAppComposer } from '../../client/components/crm/whatsapp/composer.js';

// The WhatsApp pages (client/pages/crm-whatsapp/, components/crm/whatsapp/,
// pages/crm-whatsapp/connection.tsx): the messages as bubbles with their media,
// the workspace's list and conversation with its actions, a record's tab,
// and the connection page with its numbers and the number dialog.

function english(key: string, options?: Record<string, unknown>): string {
  let value: unknown = crmEn;
  for (const part of key.split('.'))
    value = (value as Record<string, unknown> | undefined)?.[part];
  if (typeof value !== 'string')
    return typeof options?.defaultValue === 'string'
      ? options.defaultValue
      : key;
  return value.replace(/\{\{(\w+)\}\}/g, (_, name: string) =>
    String(options?.[name] ?? ''),
  );
}
const state = vi.hoisted(() => ({
  api: vi.fn(),
  meta: {} as Record<string, unknown>,
}));
vi.mock('@nocobase/app-client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@nocobase/app-client')>()),
  // The unsaved-changes guard, whose provider the application shell gives.
  useNavigationGuard: () => undefined,
}));
// The WhatsApp page's grant, which opening a conversation asks for.
vi.mock('@nocobase/app-plugin-authorization/client', () => ({
  useCan: () => ({ can: true, isPending: false, error: undefined }),
}));
vi.mock('@nocobase/app-plugin-authentication/client', () => ({
  useAuthentication: () => ({ refresh: async () => undefined }),
}));
vi.mock('../../client/components/crm/api.js', async (importOriginal) => ({
  ...(await importOriginal<
    typeof import('../../client/components/crm/api.js')
  >()),
  useCrmText: () => ({ text: english, language: 'en-US' }),
  useCrmApi: () => state.api,
  useCrmScopeKey: () => ['crm'],
  useMetadata: () => ({ data: state.meta }),
  useRefresh: () => async () => undefined,
  // A picker names a record it was handed without asking here.
  useRecord: () => ({ data: undefined }),
  // Asked through the test's API, as the hook asks the application's.
  useCrmQuery: (path: string, enabled = true) =>
    useQuery({
      queryKey: ['crm', path],
      queryFn: () =>
        (state.api(path) as Promise<{ data: unknown }>).then((r) => r.data),
      enabled,
    }),
}));

const { WhatsAppMessages } =
  await import('../../client/components/crm/whatsapp/messages.js');
const { RecordWhatsAppPanel } =
  await import('../../client/components/crm/whatsapp/record-tab.js');
const { default: WhatsAppPage } =
  await import('../../client/pages/crm-whatsapp/index.js');
const { default: ConversationPane } =
  await import('../../client/pages/crm-whatsapp/conversation.js');
const { default: WhatsAppSettingsPage } =
  await import('../../client/pages/crm-whatsapp/connection.js');
const { default: WhatsAppNumberDialog } =
  await import('../../client/pages/crm-whatsapp/number.js');
const { default: LinkConversationDialog } =
  await import('../../client/pages/crm-whatsapp/link.js');

const message = (
  id: string,
  at: string,
  extra: Record<string, unknown> = {},
) => ({
  id,
  conversationId: 'c1',
  direction: 'in' as const,
  origin: 'customer',
  type: 'text',
  text: `Message ${id}`,
  caption: null,
  media: null,
  replyTo: null,
  status: null,
  errorCode: null,
  sentById: null,
  occurredAt: at,
  ...extra,
});
const customer = {
  id: 'w1',
  name: 'Ana Souza',
  phone: '+5511999990000',
  username: null,
  profileName: 'Ana Souza',
  state: 'unlinked' as const,
  leadId: null,
  contactId: null,
  matchedBy: null,
};
const conversation = {
  id: 'c1',
  lastInboundAt: '2026-10-15T08:00:00.000Z',
  unreadCount: 0,
  contact: customer,
  record: null,
  messages: [message('m1', '2026-10-14T08:00:00.000Z')],
  more: false,
};
const wrap = (ui: ReactElement): ReactElement => (
  <QueryClientProvider
    client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
  >
    {ui}
  </QueryClientProvider>
);

beforeEach(() => {
  state.api.mockReset();
  state.meta = {
    userId: 'u1',
    settingsAccess: true,
    users: [],
    whatsapp: { configured: true },
    permissions: { leads: { create: false } },
    // WhatsApp's times read in the CRM's zone.
    settings: { timeZone: 'UTC' },
  };
  Element.prototype.scrollTo ??= () => undefined;
});

describe('the messages', () => {
  it("mark coexistence's messages by where they came from, an edit, and a deletion", () => {
    render(
      <WhatsAppMessages
        messages={[
          message('h1', '2026-09-01T08:00:00.000Z', {
            origin: 'imported',
            text: 'From the history',
          }),
          message('h2', '2026-09-01T08:05:00.000Z', {
            direction: 'out',
            origin: 'imported',
            type: 'media_placeholder',
            text: null,
          }),
          message('a1', '2026-10-15T08:00:00.000Z', {
            direction: 'out',
            origin: 'businessApp',
            text: 'Answered on the phone',
            editedAt: '2026-10-15T08:01:00.000Z',
          }),
          message('a2', '2026-10-15T08:02:00.000Z', {
            direction: 'out',
            origin: 'businessApp',
            text: 'Taken back',
            revokedAt: '2026-10-15T08:03:00.000Z',
          }),
        ]}
        more={false}
        loadingEarlier={false}
        onLoadEarlier={() => undefined}
        senderOf={() => 'Ana Souza'}
      />,
    );
    expect(screen.getAllByText(/^Imported · /)).toHaveLength(2);
    expect(screen.getByText(/^From the app · Edited · /)).toBeTruthy();
    expect(screen.getByText('File from the history')).toBeTruthy();
    // A deletion shows no words of it.
    expect(screen.getByText('This message was deleted')).toBeTruthy();
    expect(screen.queryByText('Taken back')).toBeNull();
  });

  it('open a stored photo in the preview dialog rather than a new tab', async () => {
    render(
      <WhatsAppMessages
        messages={[
          message('m1', '2026-10-15T08:00:00.000Z', {
            type: 'image',
            text: null,
            caption: 'Our line',
            media: {
              status: 'stored',
              fileId: 'f1',
              url: '/api/attachments/f1/content',
              mimeType: 'image/jpeg',
              filename: null,
            },
          }),
        ]}
        more={false}
        senderOf={() => 'Ana Souza'}
      />,
    );
    expect(screen.queryByRole('link')).toBeNull();
    await userEvent.click(screen.getByRole('img', { name: 'Our line' }));
    expect(await screen.findByRole('dialog')).toBeTruthy();
  });

  it('open a stored file in the preview dialog rather than downloading it', async () => {
    render(
      <WhatsAppMessages
        messages={[
          message('m1', '2026-10-15T08:00:00.000Z', {
            type: 'document',
            text: null,
            caption: 'Our needs',
            media: {
              status: 'stored',
              fileId: 'f2',
              url: '/api/attachments/f2/content',
              mimeType: 'application/pdf',
              filename: 'spec.pdf',
            },
          }),
        ]}
        more={false}
        senderOf={() => 'Ana Souza'}
      />,
    );
    // A button, not a download link.
    expect(screen.queryByRole('link', { name: /spec\.pdf/ })).toBeNull();
    await userEvent.click(
      screen.getByRole('button', { name: `${crmEn.preview} spec.pdf` }),
    );
    expect(await screen.findByRole('dialog')).toBeTruthy();
  });

  it("read their times and days in the CRM's time zone, not the browser's", () => {
    state.meta = { ...state.meta, settings: { timeZone: 'America/New_York' } };
    render(
      <WhatsAppMessages
        messages={[message('m1', '2026-10-15T01:50:00.000Z')]}
        more={false}
        senderOf={() => 'Ana Souza'}
      />,
    );
    // 21:50 on the 14th in New York, whatever zone the browser is in.
    expect(screen.getByText('Oct 14, 2026')).toBeTruthy();
    expect(screen.getByText(/09:50\sPM/)).toBeTruthy();
  });

  it('show a day separator, the media by its state, and who wrote each', () => {
    render(
      <WhatsAppMessages
        messages={[
          message('m1', '2026-10-14T08:00:00.000Z'),
          message('m2', '2026-10-15T08:00:00.000Z', {
            type: 'image',
            text: null,
            caption: 'Our line',
            media: {
              status: 'stored',
              fileId: 'f1',
              url: '/api/attachments/f1/content',
              mimeType: 'image/jpeg',
              filename: null,
            },
          }),
          message('m3', '2026-10-15T08:01:00.000Z', {
            type: 'document',
            text: null,
            media: {
              status: 'pending',
              fileId: null,
              url: null,
              mimeType: null,
              filename: 'spec.pdf',
            },
          }),
          message('m4', '2026-10-15T08:02:00.000Z', {
            type: 'audio',
            text: null,
            media: {
              status: 'unavailable',
              fileId: null,
              url: null,
              mimeType: null,
              filename: null,
            },
          }),
          message('m5', '2026-10-15T08:03:00.000Z', {
            direction: 'out',
            origin: 'crm',
            text: 'Thanks',
          }),
        ]}
        more
        loadingEarlier={false}
        onLoadEarlier={() => undefined}
        senderOf={() => 'Ana Souza'}
      />,
    );
    // Two days, two separators.
    expect(screen.getByText('Oct 14, 2026')).toBeTruthy();
    expect(screen.getByText('Oct 15, 2026')).toBeTruthy();
    const image = screen.getByRole('img', { name: 'Our line' });
    expect(image.getAttribute('src')).toBe(
      '/api/attachments/f1/content?inline=1',
    );
    expect(screen.getByText(crmEn.whatsapp.media.pending)).toBeTruthy();
    expect(screen.getByText(crmEn.whatsapp.media.unavailable)).toBeTruthy();
    expect(screen.getByText(crmEn.whatsapp.kind.audio)).toBeTruthy();
    // Who wrote each, for screen readers too.
    expect(screen.getAllByText('Ana Souza:')).toHaveLength(4);
    expect(screen.getByText(`${crmEn.whatsapp.team}:`)).toBeTruthy();
    expect(
      screen.getByRole('button', { name: crmEn.whatsapp.loadEarlier }),
    ).toBeTruthy();
  });
});

describe('the workspace', () => {
  const routes = (path: string): ReactElement =>
    wrap(
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path='/whatsapp' element={<WhatsAppPage />}>
            <Route path=':conversationId' element={<ConversationPane />} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );
  const respond = (overrides: Record<string, unknown> = {}) =>
    state.api.mockImplementation(async (path: string, method = 'GET') => {
      if (path in overrides) return overrides[path];
      if (path.startsWith('whatsapp/conversations?'))
        return {
          data: [
            {
              id: 'c1',
              waContactId: 'w1',
              name: 'Ana Souza',
              phone: '+5511999990000',
              state: 'unlinked',
              leadId: null,
              contactId: null,
              lastMessageAt: '2026-10-14T08:00:00.000Z',
              lastDirection: 'in',
              unreadCount: 2,
              last: {
                type: 'image',
                text: null,
                caption: 'Our line',
                direction: 'in',
                occurredAt: '2026-10-14T08:00:00.000Z',
              },
            },
          ],
          meta: { total: 1 },
        };
      if (path === 'whatsapp/conversations/c1/link' && method === 'POST')
        return {
          data: {
            ...conversation,
            contact: { ...customer, state: 'dismissed' },
          },
        };
      if (path.startsWith('whatsapp/conversations/c1'))
        return { data: conversation };
      return {};
    });

  it('lists the conversations with their state and opens one beside the list', async () => {
    respond();
    render(routes('/whatsapp/c1?view=unlinked'));
    const list = await screen.findByRole('list');
    const row = within(list).getByRole('link', { name: /Ana Souza/ });
    expect(row.getAttribute('aria-current')).toBe('page');
    expect(row.getAttribute('href')).toBe('/whatsapp/c1?view=unlinked');
    expect(within(row).getByText(crmEn.whatsapp.state.unlinked)).toBeTruthy();
    expect(within(row).getByText(crmEn.whatsapp.kind.image)).toBeTruthy();
    // The customer wrote last: it awaits a reply.
    expect(within(row).getByText(crmEn.whatsapp.awaiting)).toBeTruthy();
    // The conversation: its customer, and the way to link them; no New
    // lead without the right to create leads.
    expect(
      await screen.findByRole('heading', { name: 'Ana Souza' }),
    ).toBeTruthy();
    const link = screen.getByText(crmEn.whatsapp.link).closest('a');
    expect(link?.getAttribute('href')).toBe('/whatsapp/c1/link?view=unlinked');
    expect(screen.queryByText(crmEn.whatsapp.newLead)).toBe(null);
    expect(screen.getByText('Message m1')).toBeTruthy();
    // The number's connection, from the page's header, for an administrator.
    expect(
      screen
        .getByText(crmEn.whatsapp.manageConnection)
        .closest('a')
        ?.getAttribute('href'),
    ).toBe('/whatsapp/connection');
    // No reply box for a reader who may not send.
    expect(screen.getByText(crmEn.whatsapp.composer.noPermission)).toBeTruthy();
  });

  it('filters by number once there are two, naming each row’s number', async () => {
    const numbers = [
      { id: 'n1', phone: '+1 555 0100', name: 'Sales', mode: 'coexistence' },
      { id: 'n2', phone: '+44 7700 900123', name: 'Abroad', mode: 'api' },
    ];
    respond({ 'whatsapp/numbers': { data: numbers } });
    state.api.mockImplementation(
      ((base) => async (path: string, method?: string) =>
        path.startsWith('whatsapp/conversations?')
          ? {
              ...(await base(path, method)),
              data: (
                (await base(path, method)) as { data: { id: string }[] }
              ).data.map((row) => ({
                ...row,
                numberId: 'n2',
                number: numbers[1],
              })),
            }
          : base(path, method))(
        state.api.getMockImplementation() as (
          path: string,
          method?: string,
        ) => Promise<unknown>,
      ),
    );
    const { unmount } = render(routes('/whatsapp?view=all'));
    const list = await screen.findByRole('list');
    expect(await within(list).findByText('Abroad')).toBeTruthy();
    // A switch of which number's inbox the page shows, in its header, not a
    // filter to clear.
    const numberSwitch = screen.getByRole('combobox', {
      name: crmEn.whatsapp.numberFilter,
    });
    expect(numberSwitch.closest('header')).toBeTruthy();
    expect(numberSwitch.textContent).toContain(crmEn.whatsapp.allNumbers);
    await userEvent.click(numberSwitch);
    await userEvent.click(
      await screen.findByRole('option', { name: 'Abroad · +44 7700 900123' }),
    );
    await waitFor(() =>
      expect(state.api).toHaveBeenCalledWith(
        'whatsapp/conversations?view=all&numberId=n2&page=1&pageSize=50',
      ),
    );
    expect(numberSwitch.textContent).toContain('Abroad · +44 7700 900123');
    unmount();
    // Picked from the address: the list asks for that number's alone.
    render(routes('/whatsapp?view=all&number=n2'));
    await waitFor(() =>
      expect(state.api).toHaveBeenCalledWith(
        'whatsapp/conversations?view=all&numberId=n2&page=1&pageSize=50',
      ),
    );
  });

  it('names a lone number without a menu', async () => {
    respond({
      'whatsapp/numbers': {
        data: [{ id: 'n1', phone: '+1 555 0100', name: 'Sales', mode: 'api' }],
      },
    });
    render(routes('/whatsapp?view=all'));
    expect(await screen.findByText('Sales · +1 555 0100')).toBeTruthy();
    expect(
      screen.queryByRole('combobox', { name: crmEn.whatsapp.numberFilter }),
    ).toBe(null);
  });

  it('sets a customer aside at once, and offers to restore them', async () => {
    const user = userEvent.setup();
    respond();
    render(routes('/whatsapp/c1'));
    await user.click(
      await screen.findByRole('button', {
        name: 'Actions for Ana Souza',
      }),
    );
    await user.click(
      await screen.findByRole('menuitem', { name: crmEn.whatsapp.dismiss }),
    );
    await waitFor(() =>
      expect(state.api).toHaveBeenCalledWith(
        'whatsapp/conversations/c1/link',
        'POST',
        { state: 'dismissed' },
      ),
    );
    expect(
      await screen.findByRole('button', { name: crmEn.whatsapp.restore }),
    ).toBeTruthy();
    expect(screen.getByText(crmEn.whatsapp.setAside.dismissed)).toBeTruthy();
  });

  it("deletes a conversation for the connection's managers after asking, and goes back to the list", async () => {
    const user = userEvent.setup();
    respond();
    render(routes('/whatsapp/c1?view=all'));
    await user.click(
      await screen.findByRole('button', { name: 'Actions for Ana Souza' }),
    );
    await user.click(
      await screen.findByRole('menuitem', {
        name: crmEn.whatsapp.deleteConversation,
      }),
    );
    const dialog = await screen.findByRole('alertdialog');
    expect(within(dialog).getByText(crmEn.whatsapp.deleteBody)).toBeTruthy();
    await user.click(
      within(dialog).getByRole('button', {
        name: crmEn.whatsapp.deleteConversation,
      }),
    );
    await waitFor(() =>
      expect(state.api).toHaveBeenCalledWith(
        'whatsapp/conversations/c1',
        'DELETE',
      ),
    );
    await waitFor(() =>
      expect(screen.queryByRole('heading', { name: 'Ana Souza' })).toBe(null),
    );
    expect(screen.getByText(crmEn.whatsapp.choose)).toBeTruthy();
  });

  it("offers no deleting to a reader who doesn't manage the connection", async () => {
    const user = userEvent.setup();
    state.meta = { ...state.meta, settingsAccess: false };
    respond();
    render(routes('/whatsapp/c1'));
    await user.click(
      await screen.findByRole('button', { name: 'Actions for Ana Souza' }),
    );
    expect(
      await screen.findByRole('menuitem', { name: crmEn.whatsapp.dismiss }),
    ).toBeTruthy();
    expect(
      screen.queryByRole('menuitem', {
        name: crmEn.whatsapp.deleteConversation,
      }),
    ).toBe(null);
  });

  it('says what each empty view holds', async () => {
    respond({
      'whatsapp/conversations?view=all&page=1&pageSize=50': {
        data: [],
        meta: { total: 0 },
      },
    });
    // All by default, and for an old address naming the Mine there was.
    render(routes('/whatsapp?view=mine'));
    expect(await screen.findByText(crmEn.whatsapp.empty.title)).toBeTruthy();
    expect(screen.getByText(crmEn.whatsapp.choose)).toBeTruthy();
  });
});

describe('changing a link', () => {
  it('says where a contact’s messages also go, and keeps the current contact when its kind is picked again', async () => {
    const user = userEvent.setup();
    const linked = {
      ...conversation,
      contact: { ...customer, state: 'linked' as const, contactId: 'k1' },
      record: { entity: 'contacts' as const, id: 'k1', name: 'Ana Souza' },
    };
    state.api.mockImplementation(async (path: string) => {
      if (path === 'whatsapp/conversations/c1') return { data: linked };
      if (path === 'contacts/k1')
        return {
          data: {
            record: { id: 'k1', companyId: 'co1' },
            names: { co1: 'Souza Ltda' },
            related: { opportunities: [{}, {}] },
            relatedTotals: { opportunities: 2 },
          },
        };
      if (path.startsWith('contacts') || path.startsWith('leads'))
        return { data: [], meta: { total: 0, titles: {} } };
      return {};
    });
    render(
      wrap(
        <RouterProvider
          router={createMemoryRouter(
            [
              {
                // The conversation's context alone: its header's record
                // link needs the application shell.
                path: '/whatsapp/:conversationId',
                element: (
                  <Outlet
                    context={{
                      conversation: linked,
                      settle: () => undefined,
                      focusName: () => undefined,
                    }}
                  />
                ),
                children: [
                  { path: 'link', element: <LinkConversationDialog /> },
                ],
              },
            ],
            { initialEntries: ['/whatsapp/c1/link'] },
          )}
        />,
      ),
    );
    const dialog = await screen.findByRole('dialog');
    expect(
      await within(dialog).findByText(
        crmEn.whatsapp.reach.companyAndDeals
          .replace('{{company}}', 'Souza Ltda')
          .replace('{{count}}', '2'),
      ),
    ).toBeTruthy();
    await user.click(
      within(dialog).getByRole('radio', { name: crmEn.whatsapp.lead }),
    );
    expect(within(dialog).queryByText('Ana Souza')).toBe(null);
    await user.click(
      within(dialog).getByRole('radio', { name: crmEn.whatsapp.contact }),
    );
    expect(await within(dialog).findByText('Ana Souza')).toBeTruthy();
  });
});

describe("a record's WhatsApp tab", () => {
  it('shows one person’s conversation at a time, a tab each when there are two, or says there are none', async () => {
    const user = userEvent.setup();
    state.api.mockResolvedValueOnce({
      data: { messages: [], more: false, people: [], person: null },
    });
    const { unmount } = render(
      wrap(<RecordWhatsAppPanel entity='leads' id='l1' />),
    );
    expect(await screen.findByText(crmEn.whatsapp.tabEmptyTitle)).toBeTruthy();
    unmount();
    const people = [
      {
        ...customer,
        id: 'w1',
        name: 'Ana Souza',
        messageCount: 1,
        lastMessageAt: '2026-10-14T09:00:00.000Z',
      },
      {
        ...customer,
        id: 'w2',
        name: 'Bruno Lima',
        messageCount: 1,
        lastMessageAt: '2026-10-14T08:00:00.000Z',
      },
    ];
    state.api.mockImplementation(async (path: string) =>
      path === 'whatsapp/conversations/c1'
        ? {
            data: {
              ...conversation,
              contact: { ...customer, name: 'Bruno Lima' },
              messages: [message('m2', '2026-10-14T08:00:00.000Z')],
            },
          }
        : path.endsWith('?person=w2')
          ? {
              data: {
                messages: [
                  {
                    ...message('m2', '2026-10-14T08:00:00.000Z'),
                    waContactId: 'w2',
                  },
                ],
                more: false,
                people,
                person: 'w2',
              },
            }
          : {
              data: {
                messages: [
                  {
                    ...message('m1', '2026-10-14T09:00:00.000Z'),
                    waContactId: 'w1',
                  },
                ],
                more: false,
                people,
                person: 'w1',
              },
            },
    );
    render(
      wrap(
        <MemoryRouter>
          <RecordWhatsAppPanel entity='companies' id='co1' />
        </MemoryRouter>,
      ),
    );
    // The latest to write first, the other a tab away.
    expect(await screen.findByText('Message m1')).toBeTruthy();
    expect(screen.queryByText('Message m2')).toBe(null);
    // Laid out by its own head, out of the line tabs' shared rule.
    expect(screen.getByRole('tablist').getAttribute('data-tabs-layout')).toBe(
      'own',
    );
    await user.click(screen.getByRole('tab', { name: /Bruno Lima/ }));
    expect(await screen.findByText('Message m2')).toBeTruthy();
    expect(state.api).toHaveBeenCalledWith(
      'companies/co1/whatsappMessages?person=w2',
    );
    // The person's conversation, in a drawer over the page.
    await user.click(
      screen.getByRole('button', { name: crmEn.whatsapp.openConversation }),
    );
    const drawer = await screen.findByRole('dialog');
    expect(
      await within(drawer).findByRole('heading', { name: 'Bruno Lima' }),
    ).toBeTruthy();
    expect(
      within(drawer)
        .getByText(crmEn.openFullPage)
        .closest('a')
        ?.getAttribute('href'),
    ).toBe('/whatsapp/c1?view=all');
  });
});

describe('the connection settings', () => {
  const number = {
    id: 'n1',
    phoneNumberId: '1234567890',
    wabaId: null,
    mode: 'coexistence',
    displayPhone: '+1 555 0100',
    displayName: 'Sales',
    qualityRating: 'GREEN',
    status: 'CONNECTED',
    messagingLimit: null,
    hasAccessToken: true,
    connectedAt: null,
    lastWebhookAt: null,
    conversations: 3,
  };
  const connection = {
    configured: true,
    hasAppSecret: false,
    verifyToken: null,
    webhookPath: '/main/webhooks/whatsapp',
    secretsReady: true,
    numbers: [number],
    demoNumbers: [
      {
        ...number,
        id: 'd1',
        phoneNumberId: 'demo-d1',
        mode: 'demo',
        displayPhone: '+44 7700 900123',
        hasAccessToken: false,
        conversations: 2,
      },
    ],
  };
  const respond = () =>
    state.api.mockImplementation(async (path: string, method = 'GET') => {
      if (path === 'whatsapp/connection' && method === 'GET')
        return { data: connection };
      if (path === 'whatsapp/health')
        return {
          data: {
            received: 0,
            processed: 0,
            pending: 0,
            failed: 0,
            failures: [],
            mediaPending: 0,
            mediaUnavailable: 0,
          },
        };
      if (path === 'whatsapp/connection' && method === 'PUT')
        return {
          data: { ...connection, hasAppSecret: true, verifyToken: 'tok' },
        };
      if (path === 'whatsapp/numbers' && method === 'POST')
        return {
          data: {
            ...connection,
            numbers: [number, { ...number, id: 'n2', conversations: 0 }],
          },
        };
      return {};
    });
  const page = (path: string) =>
    render(
      wrap(
        <RouterProvider
          router={createMemoryRouter(
            [
              {
                path: '/whatsapp/connection',
                element: <WhatsAppSettingsPage />,
                children: [
                  { path: 'numbers/new', element: <WhatsAppNumberDialog /> },
                ],
              },
            ],
            { initialEntries: [path] },
          )}
        />,
      ),
    );

  it('asks for the app secret until it is stored, and lists the numbers with their mode', async () => {
    const user = userEvent.setup();
    respond();
    page('/whatsapp/connection');
    const save = await screen.findByRole('button', {
      name: crmEn.whatsappSettings.save,
    });
    expect(screen.getByText(crmEn.whatsappSettings.tokenLater)).toBeTruthy();
    // Nothing to do and nothing delivered yet: one line says so.
    expect(
      await screen.findByText(crmEn.whatsappSettings.noDeliveries),
    ).toBeTruthy();
    // The number, its mode; one holding conversations is not removed.
    expect(screen.getByText('+1 555 0100')).toBeTruthy();
    expect(
      // The company's, and the demo's, which behaves as coexistence does.
      screen.getAllByText(crmEn.whatsappSettings.modes.coexistence),
    ).toHaveLength(2);
    // The demo's number, read-only: no Check, Edit or Remove of its own.
    expect(screen.getByText('+44 7700 900123')).toBeTruthy();
    expect(screen.getByText(crmEn.whatsappSettings.demoHint)).toBeTruthy();
    expect(screen.getAllByRole('button', { name: crmEn.remove })).toHaveLength(
      1,
    );
    expect(
      screen
        .getByText(crmEn.whatsappSettings.addNumber)
        .closest('a')
        ?.getAttribute('href'),
    ).toBe('/whatsapp/connection/numbers/new');
    await user.click(screen.getByRole('button', { name: crmEn.remove }));
    expect(
      await screen.findByText(crmEn.whatsappSettings.removeInUse),
    ).toBeTruthy();
    const dialog = screen.getByRole('dialog');
    expect(
      (
        within(dialog).getByRole('button', {
          name: crmEn.remove,
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(true);
    await user.click(
      within(dialog).getByRole('button', { name: crmEn.cancel }),
    );
    await user.click(save);
    expect(
      await screen.findByText(crmEn.whatsappSettings.enterSecret),
    ).toBeTruthy();
    expect(document.activeElement?.id).toBe('crm-whatsapp-app-appSecret');
    await user.type(
      screen.getByLabelText(new RegExp(crmEn.whatsappSettings.appSecret)),
      'app-secret',
    );
    await user.click(save);
    await waitFor(() =>
      expect(state.api).toHaveBeenCalledWith('whatsapp/connection', 'PUT', {
        appSecret: 'app-secret',
      }),
    );
    expect(
      await screen.findByText(
        `${window.location.origin}/main/webhooks/whatsapp`,
      ),
    ).toBeTruthy();
  });

  it('adds a number, coexistence by default, asking for its id and token', async () => {
    const user = userEvent.setup();
    respond();
    page('/whatsapp/connection/numbers/new');
    const dialog = await screen.findByRole('dialog');
    await user.click(
      within(dialog).getByRole('button', {
        name: crmEn.whatsappSettings.save,
      }),
    );
    expect(
      await within(dialog).findByText(crmEn.whatsappSettings.phoneInvalid),
    ).toBeTruthy();
    expect(
      within(dialog).getByText(crmEn.whatsappSettings.enterToken),
    ).toBeTruthy();
    expect(
      (
        within(dialog).getByRole('radio', {
          name: new RegExp(crmEn.whatsappSettings.modes.coexistence),
        }) as HTMLInputElement
      ).getAttribute('aria-checked'),
    ).toBe('true');
    await user.type(
      within(dialog).getByLabelText(
        new RegExp(crmEn.whatsappSettings.phoneNumberId),
      ),
      '2223334445',
    );
    await user.type(
      within(dialog).getByLabelText(
        new RegExp(crmEn.whatsappSettings.accessToken),
      ),
      'EAAG-token',
    );
    await user.click(
      within(dialog).getByRole('button', {
        name: crmEn.whatsappSettings.save,
      }),
    );
    await waitFor(() =>
      expect(state.api).toHaveBeenCalledWith('whatsapp/numbers', 'POST', {
        phoneNumberId: '2223334445',
        wabaId: null,
        mode: 'coexistence',
        accessToken: 'EAAG-token',
      }),
    );
  });
});

describe('the reply box', () => {
  const hoursAgo = (hours: number): string =>
    new Date(Date.now() - hours * 3_600_000).toISOString();
  const box = (
    extra: Record<string, unknown> = {},
    onSent = vi.fn(),
  ): ReturnType<typeof render> =>
    render(
      wrap(
        <WhatsAppComposer
          conversation={{
            ...conversation,
            lastInboundAt: hoursAgo(3.5),
            number: {
              id: 'n1',
              phone: '+1 555 0100',
              name: 'Sales',
              mode: 'api',
            },
            ...extra,
          }}
          onSent={onSent}
        />,
      ),
    );
  beforeEach(() => {
    state.meta = { ...state.meta, sendWhatsApp: true };
  });

  it('sends the words with Enter within the window, saying the time left', async () => {
    const onSent = vi.fn();
    const next = { ...conversation, messages: [] };
    state.api.mockResolvedValue({ data: next });
    box({}, onSent);
    expect(screen.getByText('Reply window: 20 h left')).toBeTruthy();
    const input = screen.getByRole('textbox', {
      name: crmEn.whatsapp.composer.placeholder,
    });
    await userEvent.type(input, 'Here it is.{Enter}');
    await waitFor(() => expect(onSent).toHaveBeenCalledWith(next));
    const [path, method, body] = state.api.mock.calls[0] as [
      string,
      string,
      FormData,
    ];
    expect([path, method]).toEqual([
      'whatsapp/conversations/c1/messages',
      'POST',
    ]);
    expect(body.get('text')).toBe('Here it is.');
    expect((input as HTMLTextAreaElement).value).toBe('');
  });

  it('says why it is absent: no permission, the window closed, no number', () => {
    state.meta = { ...state.meta, sendWhatsApp: false };
    const { unmount } = box();
    expect(screen.getByText(crmEn.whatsapp.composer.noPermission)).toBeTruthy();
    unmount();
    state.meta = { ...state.meta, sendWhatsApp: true };
    box({ lastInboundAt: hoursAgo(30) }).unmount();
    box({
      lastInboundAt: hoursAgo(30),
      number: { id: 'n1', phone: '+1', name: 'Sales', mode: 'coexistence' },
    });
    expect(
      screen.getByText(crmEn.whatsapp.composer.windowClosedApp),
    ).toBeTruthy();
    expect(screen.queryByRole('textbox')).toBeNull();
  });

  it('on a demo number, keeps the box open whenever they last wrote, and says nothing leaves', () => {
    box({
      lastInboundAt: hoursAgo(72),
      number: {
        id: 'n9',
        phone: '+1 555 010 0199',
        name: 'Demo',
        mode: 'demo',
      },
    });
    expect(screen.getByText(crmEn.whatsapp.composer.demo)).toBeTruthy();
    expect(screen.getByRole('textbox')).toBeTruthy();
  });

  it('cannot send to a customer known only by a username', () => {
    box({ contact: { ...customer, phone: null, username: 'kevin' } });
    expect(screen.getByText(crmEn.whatsapp.composer.noRecipient)).toBeTruthy();
  });
});
