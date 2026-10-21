import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SidebarProvider } from '../../client/components/ui/sidebar.js';
import { crmEn } from '../../client/locales/crm/index.js';

// The global search: ⌘K, keyword results grouped by kind, going to a record
// or its list, and asking the AI, which opens its panel on the question.

const state = vi.hoisted(() => ({
  assistant: true,
  requests: [] as string[],
}));

function english(key: string, options: Record<string, unknown> = {}): string {
  let value: unknown = crmEn;
  for (const part of key.split('.'))
    value = (value as Record<string, unknown> | undefined)?.[part];
  const textValue = typeof value === 'string' ? value : key;
  return textValue.replace(/\{\{(\w+)\}\}/gu, (_, name: string) =>
    String(options[name] ?? ''),
  );
}

const lead = {
  id: 'l1',
  name: 'Zhou Wei',
  company: 'Orbit Kitchen',
  status: 'new',
};
const company = { id: 'a1', name: 'Orbit Group', industry: 'retail' };

vi.mock('../../client/components/crm/api.js', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('../../client/components/crm/api.js')>();
  return {
    ...actual,
    useMetadata: () => ({
      data: {
        assistant: state.assistant,
        definitions: {
          leads: { fields: [{ key: 'status', type: 'select' }] },
          companies: { fields: [{ key: 'industry', type: 'select' }] },
        },
        settings: { timeZone: 'Asia/Shanghai' },
      },
    }),
    useCrmText: () => ({ text: english, language: 'en-US' }),
    useCrmScopeKey: () => ['crm', 'u1', 'en-US'],
    useCrmApi:
      () =>
      (path: string): Promise<unknown> => {
        state.requests.push(path);
        if (path.startsWith('search?'))
          return Promise.resolve({
            data: [
              {
                entity: 'leads',
                total: 7,
                rows: [lead],
                titles: {},
                names: {},
              },
              {
                entity: 'companies',
                total: 1,
                rows: [company],
                titles: {},
                names: {},
              },
            ],
          });
        return Promise.resolve({ data: [], total: 0 });
      },
  };
});
// The assistant on the Agents plugin (tests/setup/agent-chat-fake).
vi.mock('@nocobase/app-plugin-agents/client/chat', async (importOriginal) =>
  (await import('../setup/agent-chat-fake.js')).fakeChatModule(
    await importOriginal(),
  ),
);
const { chatFake } = await import('../setup/agent-chat-fake.js');

const { GlobalSearchProvider } =
  await import('../../client/components/crm/global-search.js');
const { GlobalSearchDialog, SearchHeaderButton, SearchNavButton } =
  await import('../../client/components/crm/search-dialog.js');

function Where() {
  const location = useLocation();
  return (
    <output data-testid='where'>{location.pathname + location.search}</output>
  );
}

function renderSearch(extra?: ReactNode, open = true) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/tasks']}>
        <SidebarProvider defaultOpen={open}>
          <GlobalSearchProvider>
            <SearchHeaderButton />
            <SearchNavButton />
            <GlobalSearchDialog />
            {extra}
            <Routes>
              <Route path='*' element={<Where />} />
            </Routes>
          </GlobalSearchProvider>
        </SidebarProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

const pressShortcut = () =>
  act(() => {
    window.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'k', metaKey: true, bubbles: true }),
    );
  });

describe('the global search', () => {
  beforeEach(() => {
    state.assistant = true;
    state.requests = [];
    chatFake.reset();
    chatFake.messages = [
      {
        id: 'm1',
        role: 'assistant',
        metadata: {
          conversationId: 'c1',
          createdAt: '2026-10-12T08:00:00.000Z',
          revision: 1,
        },
        parts: [
          { type: 'text', text: 'Orbit has two open leads.', state: 'done' },
        ],
      },
    ];
    // cmdk measures its list and scrolls the selection into view.
    vi.stubGlobal(
      'ResizeObserver',
      class {
        observe(): void {}
        unobserve(): void {}
        disconnect(): void {}
      },
    );
    Element.prototype.scrollIntoView = vi.fn();
    vi.stubGlobal('matchMedia', () => ({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }));
  });
  afterEach(() => vi.unstubAllGlobals());

  it('opens with the shortcut, lists matches by kind, and goes to a record', async () => {
    const user = userEvent.setup();
    renderSearch();
    pressShortcut();
    const dialog = await screen.findByRole('dialog');
    const input = within(dialog).getByRole('combobox', {
      name: english('globalSearch.placeholder'),
    });
    await user.type(input, 'orbit');
    expect(
      await within(dialog).findByText(`${english('entities.leads')} · 7`),
    ).toBeTruthy();
    expect(
      within(dialog).getByText(`${english('entities.companies')} · 1`),
    ).toBeTruthy();
    expect(state.requests).toContain('search?q=orbit');
    // The typed word in bold, in the name and on the detail line.
    expect(
      within(dialog)
        .getAllByText('Orbit')
        .every((node) => node.tagName === 'STRONG'),
    ).toBe(true);
    // The first result is selected; Enter opens it.
    await user.keyboard('{Enter}');
    expect(screen.getByTestId('where').textContent).toBe('/leads/l1');
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('sits beside the brand, and in the collapsed sidebar under the overview', () => {
    const label = new RegExp(english('globalSearch.label'));
    const { unmount } = renderSearch();
    // Expanded: the icon button alone.
    expect(screen.getAllByRole('button', { name: label })).toHaveLength(1);
    expect(screen.queryByText(english('globalSearch.label'))).toBeNull();
    unmount();
    // Collapsed: the menu's item, which shows its label.
    renderSearch(undefined, false);
    expect(screen.getByText(english('globalSearch.label'))).toBeTruthy();
  });

  it("opens a kind's whole list with the search, and asks the AI from the last row", async () => {
    const user = userEvent.setup();
    renderSearch();
    await user.click(
      screen.getByRole('button', {
        name: new RegExp(english('globalSearch.label')),
      }),
    );
    const dialog = await screen.findByRole('dialog');
    await user.type(within(dialog).getByRole('combobox'), 'orbit');
    await user.click(
      await within(dialog).findByText(
        english('globalSearch.showAllIn', {
          list: english('entities.leads'),
          count: 7,
        }),
      ),
    );
    expect(screen.getByTestId('where').textContent).toBe('/leads?search=orbit');
    pressShortcut();
    const again = await screen.findByRole('dialog');
    await user.click(
      await within(again).findByText(
        english('globalSearch.askAbout', { text: 'orbit' }),
      ),
    );
    // The question goes to the assistant in a conversation of the search's
    // own, answered in the dialog; the panel opens only on going on asking,
    // which keeps it.
    await waitFor(() => expect(chatFake.sent).toHaveLength(1));
    expect(chatFake.created[0]).toMatchObject({
      agentId: 'online',
      source: 'crm-search',
      config: { scope: ['crm'] },
    });
    expect(chatFake.sent[0]).toMatchObject({ content: 'orbit' });
    expect(screen.getByRole('dialog')).toBeTruthy();
    expect(chatFake.opened).toEqual([]);
    expect(await screen.findByText('Orbit has two open leads.')).toBeTruthy();
    await user.click(
      screen.getByRole('button', {
        name: english('globalSearch.continueAsking'),
      }),
    );
    expect(screen.queryByRole('dialog')).toBeNull();
    await waitFor(() =>
      expect(state.requests).toContain('searchAnswers/c1/keep'),
    );
    expect(chatFake.opened).toEqual([{ conversationId: 'c1', view: 'chat' }]);
  });

  it('discards an answer left for the results', async () => {
    const user = userEvent.setup();
    renderSearch();
    pressShortcut();
    const dialog = await screen.findByRole('dialog');
    await user.type(within(dialog).getByRole('combobox'), 'orbit');
    await user.click(
      await within(dialog).findByText(
        english('globalSearch.askAbout', { text: 'orbit' }),
      ),
    );
    await waitFor(() => expect(chatFake.sent).toHaveLength(1));
    await user.click(
      await screen.findByRole('button', {
        name: english('globalSearch.backToResults'),
      }),
    );
    await waitFor(() => expect(state.requests).toContain('searchAnswers/c1'));
    expect(chatFake.opened).toEqual([]);
    // Back on the results, the question still typed.
    expect(
      await screen.findByText(
        english('globalSearch.askAbout', { text: 'orbit' }),
      ),
    ).toBeTruthy();
  });

  it('offers the AI disabled with the reason while the chat cannot start, and not at all with the assistant off', async () => {
    const user = userEvent.setup();
    chatFake.agents = [];
    const first = renderSearch();
    pressShortcut();
    let dialog = await screen.findByRole('dialog');
    await user.type(within(dialog).getByRole('combobox'), 'orbit');
    const askRow = await within(dialog).findByText(
      english('globalSearch.askAbout', { text: 'orbit' }),
    );
    expect(askRow.closest('[cmdk-item]')).toHaveAttribute(
      'aria-disabled',
      'true',
    );
    // The reason in the open, since a disabled row takes no pointer.
    expect(
      within(dialog).getByText(english('agentPanel.notSetUp')),
    ).toBeTruthy();
    first.unmount();

    state.assistant = false;
    chatFake.reset();
    renderSearch();
    pressShortcut();
    dialog = await screen.findByRole('dialog');
    await user.type(within(dialog).getByRole('combobox'), 'orbit');
    await within(dialog).findByText(`${english('entities.leads')} · 7`);
    expect(
      within(dialog).queryByText(
        english('globalSearch.askAbout', { text: 'orbit' }),
      ),
    ).toBeNull();
  });

  it('does not open over another dialog', () => {
    renderSearch(<div role='dialog' aria-label='Another' />);
    pressShortcut();
    expect(screen.getAllByRole('dialog')).toHaveLength(1);
    fireEvent.keyDown(window, { key: 'k', ctrlKey: true, isComposing: true });
    expect(screen.getAllByRole('dialog')).toHaveLength(1);
  });
});
