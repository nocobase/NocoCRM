import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nRuntime } from '@nocobase/i18n';
import { I18nProvider } from '@nocobase/i18n/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactElement, ReactNode } from 'react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import locales from '../../client/locales/index.js';
import { chatFake } from '../setup/agent-chat-fake.js';
import { crmZh } from '../../client/locales/crm/index.js';
import {
  definitions,
  defaultSettings,
} from '../../server/providers/crm/schema.js';

// The conversations with the assistant (the Agents plugin's native chat with
// the CRM's scope): the list beside the one open, a new one, the composer's
// keys, and the plans the assistant proposed placed among its messages.

const state = vi.hoisted(() => ({
  api: vi.fn(),
  root: false,
  send: vi.fn(),
  archive: vi.fn(),
  agents: [] as unknown[],
  open: [] as unknown[],
  archived: [] as unknown[],
  messages: [] as unknown[],
  plans: [] as unknown[],
}));

vi.mock('@nocobase/app-plugin-agents/client/chat', async (importOriginal) => {
  const actual =
    await importOriginal<
      typeof import('@nocobase/app-plugin-agents/client/chat')
    >();
  const list = (items: unknown[]) => ({
    data: { pages: [{ items, nextCursor: null }], pageParams: [null] },
    isLoading: false,
    error: null,
    hasNextPage: false,
    isFetchingNextPage: false,
    fetchNextPage: vi.fn(),
    refetch: vi.fn(),
  });
  const fake = (await import('../setup/agent-chat-fake.js')).fakeChatModule(
    actual,
  );
  return {
    ...actual,
    // The panel's pieces the composer uses: pins, sources, uploads.
    useChatPanel: fake.useChatPanel,
    useChatSources: fake.useChatSources,
    useChatAttachments: fake.useChatAttachments,
    useChatApi: fake.useChatApi,
    useChatController: fake.useChatController,
    useChatModels: fake.useChatModels,
    useChatStream: fake.useChatStream,
    ChatProvider: ({ children }: { children: ReactNode }) => children,
    useChatAgents: () => ({
      data: state.agents,
      isLoading: false,
      error: null,
    }),
    useConversationList: (query: { archived?: boolean }) =>
      list(query.archived ? state.archived : state.open),
    useConversation: (id: string | null) => ({
      data: id
        ? {
            ...(state.open.find(
              (item) => (item as { id: string }).id === id,
            ) as object),
            availability: { online: true, reason: null, onlineRunners: 1 },
          }
        : undefined,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    }),
    useConversationMessages: () => ({
      items: state.messages,
      pending: [],
      hasMore: false,
      olderToken: null,
      lastSeq: state.messages.length,
      loaded: true,
      loadingOlder: false,
      error: null,
      loadOlder: vi.fn(),
      fetchNewer: vi.fn(),
      dispatch: vi.fn(),
    }),
    useSendMessage: () => state.send,
    useConversationActions: () => ({
      archive: { mutate: state.archive, isPending: false },
      markRead: vi.fn(),
    }),
    AgentAvatar: () => <span />,
  };
});

vi.mock(
  '@nocobase/app-plugin-authorization/client',
  async (importOriginal) => ({
    ...(await importOriginal<
      typeof import('@nocobase/app-plugin-authorization/client')
    >()),
    useCan: () => ({ can: state.root }),
  }),
);
vi.mock('@nocobase/app-client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@nocobase/app-client')>()),
  useToaster: () => ({ show: vi.fn(), close: vi.fn() }),
}));
vi.mock('../../client/components/crm/api.js', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('../../client/components/crm/api.js')>();
  const metadata = {
    userId: 'root',
    settings: { ...defaultSettings, timeZone: 'Asia/Shanghai' },
    definitions,
    users: [{ id: 'root', name: 'Root', roles: [], disabled: false }],
    permissions: {},
  };
  const lookup = (key: string): unknown =>
    key
      .split('.')
      .reduce<unknown>(
        (node, part) => (node as Record<string, unknown>)?.[part],
        crmZh,
      );
  const text = (key: string, options: Record<string, unknown> = {}): string => {
    const value =
      'count' in options
        ? (lookup(`${key}_other`) ?? lookup(key))
        : lookup(key);
    if (typeof value !== 'string') return key;
    return value.replace(/\{\{(\w+)\}\}/gu, (_, name: string) =>
      String(options[name] ?? ''),
    );
  };
  return {
    ...actual,
    useCrmApi: () => state.api,
    useCrmScopeKey: () => ['crm', 'root', 'zh-CN'],
    useMetadata: () => ({ data: metadata }),
    useCrmText: () => ({ text, language: 'zh-CN' }),
  };
});

const { default: AgentChatPage } =
  await import('../../client/pages/crm-agent-chat/index.js');

const agent = {
  id: 'online',
  name: 'Online agent',
  description: null,
  nameText: null,
  descriptionText: null,
  avatar: null,
  runnerNames: [],
  personalOnly: false,
  isSystemDefault: true,
  isMyDefault: false,
  availability: { online: true, reason: null, onlineRunners: 0 },
};
const conversation = (id: string, title: string) => ({
  id,
  title,
  titleSource: 'agent',
  category: 'chat',
  source: 'crm',
  mode: 'online',
  agent: {
    id: 'online',
    name: 'Online agent',
    nameText: null,
    avatar: null,
    archived: false,
  },
  fallbackFrom: null,
  model: null,
  read: true,
  lastMessageAt: '2026-10-10T08:00:00.000Z',
  archivedAt: null,
  createdAt: '2026-10-10T07:00:00.000Z',
  updatedAt: '2026-10-10T08:00:00.000Z',
  run: null,
  execution: { status: 'idle' },
});
// A saved message as the plugin's chat answers it: an SDK UI message.
const message = (
  seq: number,
  role: 'user' | 'assistant',
  content: string,
  at: string,
) => ({
  id: `m${seq}`,
  role,
  metadata: { conversationId: 'c1', createdAt: at, revision: 1, seq },
  parts: [
    role === 'assistant'
      ? { type: 'text', text: content, state: 'done' }
      : { type: 'text', text: content },
  ],
});

function Where(): ReactElement {
  const location = useLocation();
  return (
    <output data-testid='where'>{location.pathname + location.search}</output>
  );
}

let runtime: I18nRuntime;
beforeEach(async () => {
  state.agents = [agent];
  state.open = [];
  state.archived = [];
  state.messages = [];
  state.plans = [];
  state.send.mockReset();
  state.archive.mockReset();
  state.api.mockReset();
  state.api.mockImplementation(async (path: string) =>
    path.startsWith('plans')
      ? { data: state.plans, meta: { total: state.plans.length } }
      : { data: {} },
  );
  window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  })) as unknown as typeof window.matchMedia;
  runtime = new I18nRuntime({
    defaultLocale: 'en-US',
    locales: ['en-US', 'zh-CN'],
    applicationNamespace: 'test-app',
  });
  runtime.registerApplicationNamespace('test-app', locales);
  await runtime.init('en-US');
});

function renderAt(path: string): void {
  render(
    <QueryClientProvider
      client={
        new QueryClient({ defaultOptions: { queries: { retry: false } } })
      }
    >
      <MemoryRouter initialEntries={[path]}>
        <I18nProvider runtime={runtime}>
          <Routes>
            <Route
              path='/agent-chat'
              element={
                <>
                  <AgentChatPage />
                  <Where />
                </>
              }
            >
              <Route path=':conversationId' element={null} />
            </Route>
            <Route path='/' element={<p>Overview page</p>} />
          </Routes>
        </I18nProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('the agent conversations', () => {
  it('collapses into the side panel, back to the overview when it was opened first', async () => {
    renderAt('/agent-chat');
    expect(screen.getByRole('heading', { name: '全部对话' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '收起' }));
    expect(await screen.findByText('Overview page')).toBeTruthy();
    expect(chatFake.opened.at(-1)).toEqual({});
  });

  it('starts with an empty state holding the only way to a new one', () => {
    renderAt('/agent-chat');
    expect(screen.getByText('还没有对话')).toBeTruthy();
    // A link drawn as a button: the only one, in the empty state.
    const start = screen.getAllByRole('button', { name: '新建对话' });
    expect(start).toHaveLength(1);
    expect(start[0]).toHaveAttribute('href', '/agent-chat/new');
  });

  it('offers the archived ones from the empty state once every conversation is archived', async () => {
    state.archived = [conversation('c9', '旧对话')];
    renderAt('/agent-chat');
    expect(screen.getByText('还没有对话')).toBeTruthy();
    await userEvent.click(screen.getByRole('button', { name: '显示已归档' }));
    expect(screen.getByTestId('where').textContent).toBe(
      '/agent-chat?archived=1',
    );
    expect(screen.getByRole('link', { name: /旧对话/u })).toBeTruthy();
  });

  it('lists the conversations, none open until one is picked', () => {
    state.open = [conversation('c1', '展会线索'), conversation('c2', '月报')];
    renderAt('/agent-chat');
    const list = screen.getByRole('navigation', { name: '对话' });
    expect(within(list).getAllByRole('link')).toHaveLength(2);
    expect(screen.getByText('选择一个对话，或新建一个')).toBeTruthy();
  });

  it('says when nothing is archived and hides the archived list again', async () => {
    state.open = [conversation('c1', '展会线索')];
    renderAt('/agent-chat?archived=1');
    expect(screen.getByText('没有已归档的对话')).toBeTruthy();
    await userEvent.click(screen.getByRole('button', { name: '隐藏已归档' }));
    expect(screen.getByTestId('where').textContent).toBe('/agent-chat');
  });

  it('places the plans of a conversation among its messages, by time', async () => {
    state.open = [conversation('c1', '展会线索')];
    state.messages = [
      message(1, 'user', '把周晓加成线索', '2026-10-10T07:00:00.000Z'),
      message(
        2,
        'assistant',
        '计划已提出，等你确认。',
        '2026-10-10T07:02:00.000Z',
      ),
    ];
    state.plans = [
      {
        id: 'p1',
        title: '新增线索周晓',
        summary: null,
        status: 'pending',
        revision: 1,
        proposerUserId: 'root',
        agentId: 'crm-assistant',
        agentName: 'Sales Expert',
        runId: 'r1',
        conversationId: 'c1',
        deciderUserId: null,
        decidedAt: null,
        failure: null,
        expiresAt: '2099-01-01T00:00:00.000Z',
        createdAt: '2026-10-10T07:01:00.000Z',
        steps: [],
      },
    ];
    renderAt('/agent-chat/c1');
    const card = await screen.findByRole('region', { name: '新增线索周晓' });
    const asked = screen.getByText('把周晓加成线索');
    const answered = screen.getByText('计划已提出，等你确认。');
    expect(
      asked.compareDocumentPosition(card) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      card.compareDocumentPosition(answered) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    // Inside its conversation the card does not link back to it.
    expect(within(card).queryByRole('link', { name: '来自对话' })).toBeNull();
  });

  it('sends on Enter, never on Shift+Enter or while composing', async () => {
    state.open = [conversation('c1', '展会线索')];
    renderAt('/agent-chat/c1');
    const box = screen.getByRole('textbox', { name: '问任何问题…' });
    await userEvent.type(box, '本周新线索有几条');
    fireEvent.keyDown(box, { key: 'Enter', isComposing: true, keyCode: 229 });
    fireEvent.keyDown(box, { key: 'Enter', shiftKey: true });
    expect(state.send).not.toHaveBeenCalled();
    fireEvent.keyDown(box, { key: 'Enter' });
    // The page it was written on goes with it; nothing was pinned.
    expect(state.send).toHaveBeenCalledWith({
      content: '本周新线索有几条',
      context: { route: window.location.pathname, items: [] },
      attachments: [],
    });
    expect((box as HTMLTextAreaElement).value).toBe('');
  });

  it('archives the open conversation and goes back to the list', async () => {
    state.open = [conversation('c1', '展会线索')];
    state.archive.mockImplementation(
      (_input: unknown, options?: { onSuccess?: () => void }) =>
        options?.onSuccess?.(),
    );
    renderAt('/agent-chat/c1');
    // Behind the conversation's "…" menu.
    await userEvent.click(screen.getByRole('button', { name: '对话操作' }));
    await userEvent.click(
      await screen.findByRole('menuitem', { name: '归档' }),
    );
    expect(state.archive).toHaveBeenCalledWith(
      { id: 'c1', archived: true },
      expect.anything(),
    );
    expect(screen.getByTestId('where').textContent).toBe('/agent-chat');
  });

  it('starts a first conversation without the empty list or a second way to start one', () => {
    renderAt('/agent-chat/new');
    expect(screen.queryByRole('navigation')).toBeNull();
    expect(screen.queryByText('没有已归档的对话')).toBeNull();
    expect(screen.queryByRole('button', { name: '新建对话' })).toBeNull();
    expect(screen.getByRole('textbox', { name: '问任何问题…' })).toBeTruthy();
  });

  it("shows none of the reader's plans in a conversation not yet started", async () => {
    state.open = [conversation('c1', '展会线索')];
    state.plans = [
      {
        id: 'p1',
        title: '别处的计划',
        summary: null,
        status: 'pending',
        revision: 1,
        proposerUserId: 'root',
        agentId: 'crm-assistant',
        agentName: 'Sales Expert',
        runId: 'r1',
        conversationId: 'c9',
        deciderUserId: null,
        decidedAt: null,
        failure: null,
        expiresAt: '2099-01-01T00:00:00.000Z',
        createdAt: '2026-10-10T07:01:00.000Z',
        steps: [],
      },
    ];
    // The inbox's unfiltered query, already in the cache.
    const client = new QueryClient();
    client.setQueryData(
      ['crm', 'root', 'zh-CN', 'plans?pageSize=100'],
      state.plans,
    );
    render(
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={['/agent-chat/new']}>
          <I18nProvider runtime={runtime}>
            <Routes>
              <Route path='/agent-chat' element={<AgentChatPage />}>
                <Route path=':conversationId' element={null} />
              </Route>
            </Routes>
          </I18nProvider>
        </MemoryRouter>
      </QueryClientProvider>,
    );
    expect(screen.getByRole('textbox', { name: '问任何问题…' })).toBeTruthy();
    expect(screen.queryByText('别处的计划')).toBeNull();
  });

  it('points to the models when the assistant is not there', () => {
    state.agents = [];
    state.open = [conversation('c1', '展会线索')];
    renderAt('/agent-chat/new');
    expect(screen.getByText('还没有 Agent')).toBeTruthy();
    expect(screen.getByRole('button', { name: '配置模型' })).toHaveAttribute(
      'href',
      '/models',
    );
  });

  it('shows why an agent cannot answer and keeps Send off', async () => {
    state.agents = [
      {
        ...agent,
        availability: {
          online: false,
          reason: 'noModel',
          onlineRunners: 0,
        },
      },
    ];
    renderAt('/agent-chat/new');
    await userEvent.type(
      screen.getByRole('textbox', { name: '问任何问题…' }),
      '你好',
    );
    expect(screen.getByRole('button', { name: '发送' })).toBeDisabled();
    expect(screen.getByText('还没有配置 AI 模型')).toBeTruthy();
  });
});
