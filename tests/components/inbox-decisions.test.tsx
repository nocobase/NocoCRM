import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nRuntime } from '@nocobase/i18n';
import { I18nProvider } from '@nocobase/i18n/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactElement } from 'react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import locales from '../../client/locales/index.js';
import { crmZh } from '../../client/locales/crm/index.js';
import {
  definitions,
  defaultSettings,
} from '../../server/providers/crm/schema.js';

// The AI's suggestions waiting on the reader are a category of the inbox's
// To do view: listed there, counted on To do, chosen into the address and
// decided in the detail pane; the old Waiting on me address leads there.

const state = vi.hoisted(() => ({
  api: vi.fn(),
  decisions: {} as unknown,
  plans: [] as unknown[],
  can: true,
  wide: true,
  // Whether there is a model to ask (the workspace's `assistant`).
  assistant: true,
  request: vi.fn(),
}));

vi.mock('@nocobase/app-plugin-authentication/client', () => ({
  useAuthentication: () => ({
    session: { user: { id: 'rep' } },
    isPending: false,
  }),
}));
vi.mock(
  '@nocobase/app-plugin-authorization/client',
  async (importOriginal) => ({
    ...(await importOriginal<
      typeof import('@nocobase/app-plugin-authorization/client')
    >()),
    useCan: () => ({ can: state.can }),
  }),
);
vi.mock('@nocobase/app-client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@nocobase/app-client')>();
  const client = { request: state.request };
  const realtime = {
    subscribe: () => vi.fn(),
    onOpen: () => vi.fn(),
    watch: () => ({ close: vi.fn() }),
  };
  return {
    ...actual,
    useApiClient: () => client,
    useService: (token: unknown) =>
      token === actual.realtimeClientToken ? realtime : client,
  };
});
vi.mock('../../client/components/crm/lead-evaluation.js', () => ({
  VerdictBadge: () => null,
  VerdictPanel: ({ entry }: { entry: { id: string } }) => (
    <p>panel {entry.id}</p>
  ),
}));
// The detail pane is the record's left column opened at the AI's card; here
// it names the card it was opened at.
vi.mock('../../client/pages/crm-detail.js', () => ({
  RecordPane: ({ focus }: { focus: string }) => <p>panel {focus}</p>,
}));
vi.mock('../../client/components/crm/approval-review.js', () => ({
  ReviewPanel: ({ entry }: { entry: { id: string } }) => (
    <p>review {entry.id}</p>
  ),
}));
vi.mock('../../client/components/crm/api.js', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('../../client/components/crm/api.js')>();
  const metadata = {
    userId: 'rep',
    get assistant() {
      return state.assistant;
    },
    settings: { ...defaultSettings, timeZone: 'Asia/Shanghai' },
    definitions,
    users: [{ id: 'rep', name: '赵敏', roles: [], disabled: false }],
    permissions: { leads: { update: { fields: '*', all: false } } },
  };
  return {
    ...actual,
    useCrmApi: () => state.api,
    useRefresh: () => () => Promise.resolve(),
    useCrmScopeKey: () => ['crm', 'rep', 'zh-CN'],
    useMetadata: () => ({ data: metadata }),
    useCrmText: () => ({
      text: (key: string): string => {
        const value = key
          .split('.')
          .reduce<unknown>(
            (node, part) => (node as Record<string, unknown>)?.[part],
            crmZh,
          );
        return typeof value === 'string' ? value : key;
      },
      language: 'zh-CN',
    }),
  };
});

const { default: InboxPage } = await import('../../client/pages/inbox.js');
const { default: DecisionsRedirect } =
  await import('../../client/pages/crm-decisions.js');

function Where(): ReactElement {
  const location = useLocation();
  return (
    <output data-testid='where'>{location.pathname + location.search}</output>
  );
}

const entry = (id: string, name: string, status = 'pending') => ({
  id,
  entity: 'leads',
  status,
  createdAt: '2026-10-03T05:00:00.000Z',
  lead: {
    id: `lead-${id}`,
    name,
    company: null,
    ownerId: 'rep',
    status: 'working',
  },
  ai: { result: { recommendation: 'follow', summary: `${name} 的建议` } },
});

let runtime: I18nRuntime;
beforeEach(async () => {
  state.can = true;
  state.wide = true;
  state.assistant = true;
  state.api.mockReset();
  state.decisions = {
    data: [entry('e1', '周晓'), entry('e2', '林悦', 'accepted')],
    meta: { page: 1, pageSize: 100, total: 2, pending: 1 },
  };
  state.api.mockImplementation(async (path: string) =>
    path.startsWith('plans')
      ? { data: state.plans, meta: { total: state.plans.length } }
      : state.decisions,
  );
  state.plans = [];
  state.request.mockReset();
  state.request.mockImplementation(
    async ({ path }: { readonly path: string }) => {
      if (path.endsWith('/unreadCount')) return { data: { count: 0 } };
      if (path.startsWith('notificationInApp/messages?'))
        return { data: [], meta: {} };
      return { data: {} };
    },
  );
  window.matchMedia = ((query: string) => ({
    matches: state.wide,
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
              path='/inbox'
              element={
                <>
                  <InboxPage />
                  <Where />
                </>
              }
            />
            <Route path='/crm/decisions' element={<DecisionsRedirect />} />
          </Routes>
        </I18nProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("The inbox's AI suggestions", () => {
  it('opens on its tab, first of the two, counts what waits there and opens the first beside the list', async () => {
    renderAt('/inbox');
    expect(await screen.findByText('panel e1')).toBeTruthy();
    const tabs = screen.getAllByRole('tab');
    expect(tabs.map((tab) => tab.textContent?.replace(/\d+/gu, ''))).toEqual([
      'AI suggestions',
      'Notifications',
    ]);
    expect(tabs[0]!.textContent).toContain('1');
    expect(tabs[0]).toHaveAttribute('aria-selected', 'true');
    // The handled ones under those waiting, without asking; no type filter
    // to pick, no mine/team switch, no keyboard hints.
    expect(screen.getByText('林悦')).toBeTruthy();
    // Each says its kind by its menu icon, named on hover and to screen
    // readers, not by a tag.
    const kind = screen.getAllByTitle('线索')[0]!;
    expect(kind.querySelector('svg')).toBeTruthy();
    expect(kind.textContent).toBe('线索');
    expect(kind.querySelector('.sr-only')).toBeTruthy();
    expect(screen.queryByRole('combobox')).toBeNull();
    expect(screen.queryByText('查看已处理的建议')).toBeNull();
    expect(screen.queryByRole('button', { name: '团队' })).toBeNull();
    expect(screen.getByTestId('where').textContent).toContain('decision=e1');
  });

  it('opens a handled one from the list and puts the pick in the address', async () => {
    renderAt('/inbox');
    await userEvent.click(await screen.findByText('林悦'));
    await waitFor(() =>
      expect(screen.getByTestId('where').textContent).toContain('decision=e2'),
    );
    expect(screen.getByText('panel e2')).toBeTruthy();
  });

  it('opens nothing by itself on a narrow screen', async () => {
    state.wide = false;
    renderAt('/inbox?view=todo');
    expect(await screen.findByText('周晓')).toBeTruthy();
    expect(screen.getByTestId('where').textContent).toBe('/inbox?view=todo');
  });

  // An approval's review handled says what became of it, as a lead's does:
  // here the applicant withdrew the approval, which voided the review.
  it("says an approval's review was withdrawn", async () => {
    state.decisions = {
      data: [
        entry('e1', '周晓'),
        {
          id: 'r1',
          entity: 'approvals',
          status: 'superseded',
          createdAt: '2026-10-03T05:00:00.000Z',
          approval: {
            id: 'ap-1',
            name: '源码交付条款',
            topic: 'contractTerms',
            status: 'withdrawn',
            ownerId: 'rep',
            opportunityId: 'opp-1',
            opportunity: '老板电器',
          },
          ai: {
            approvalOutcome: 'withdrawn',
            retiredById: 'rep',
            retiredAt: '2026-10-03T06:00:00.000Z',
            result: { recommendation: 'conditional', summary: '改为源码托管' },
          },
        },
      ],
      meta: { page: 1, pageSize: 100, total: 2, pending: 1 },
    };
    renderAt('/inbox?view=todo&kind=crm-decisions');
    const item = (await screen.findByText('源码交付条款')).closest('button')!;
    expect(item.textContent).toContain('已撤回');
    expect(within(item).getByText(/建议有条件批准/u)).toBeTruthy();
  });

  it('shows what the AI suggested without a model to ask, as an external demo does', async () => {
    state.assistant = false;
    renderAt('/inbox');
    expect(await screen.findByText('panel e1')).toBeTruthy();
    expect(screen.getAllByRole('tab')[0]!.textContent).toContain(
      'AI suggestions',
    );
    expect(screen.getByText('林悦')).toBeTruthy();
  });

  it('is notifications alone without the page grant', async () => {
    state.can = false;
    renderAt('/inbox?view=todo');
    expect(await screen.findByText(/Nothing here/u)).toBeTruthy();
    expect(screen.queryByRole('tab')).toBeNull();
    // The suggestions are never asked for.
    expect(state.api.mock.calls).toEqual([]);
  });

  it("opens Waiting on me's old address in the inbox", async () => {
    renderAt('/crm/decisions?entry=e2');
    await waitFor(() =>
      expect(screen.getByTestId('where').textContent).toBe(
        '/inbox?view=todo&kind=crm-decisions&decision=e2',
      ),
    );
    expect(await screen.findByText('panel e2')).toBeTruthy();
  });
});

// A plan an agent proposed is a category of To do beside the suggestions,
// for the reader who has any; its card is decided in the detail pane.
const plan = (status = 'pending') => ({
  id: 'p1',
  title: '新增展会线索周晓',
  summary: null,
  status,
  revision: 1,
  proposerUserId: 'rep',
  agentId: 'a1',
  agentName: 'AI',
  runId: 'r1',
  conversationId: 'c1',
  deciderUserId: status === 'pending' ? null : 'rep',
  decidedAt: status === 'pending' ? null : '2026-10-03T06:00:00.000Z',
  failure: null,
  expiresAt: '2099-01-01T00:00:00.000Z',
  createdAt: '2026-10-03T05:00:00.000Z',
  steps: [
    {
      id: 's1',
      position: 1,
      op: 'record.update',
      ref: null,
      params: {},
      check: {
        entity: 'leads',
        id: 'lead-1',
        name: '周晓',
        changes: [{ field: 'name', from: '周小', to: '周晓' }],
      },
      status: 'pending',
      result: null,
    },
  ],
});

// The changes agents suggest in conversations are decided in their
// conversation and on the records they change, never in the inbox.
describe('The inbox and the changes suggested in conversations', () => {
  it('lists none of them, waiting or not', async () => {
    state.plans = [plan(), { ...plan('executed'), id: 'p2' }];
    renderAt('/inbox?view=todo');
    expect(await screen.findByText('panel e1')).toBeTruthy();
    expect(screen.queryByText('新增展会线索周晓')).toBeNull();
    // Nor are they asked for.
    expect(
      state.api.mock.calls.filter(([path]) => String(path).startsWith('plans')),
    ).toEqual([]);
  });
});
