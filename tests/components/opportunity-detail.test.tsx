import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactElement } from 'react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  definitions,
  defaultSettings,
  probabilities,
} from '../../server/providers/crm/schema.js';
import { crmZh } from '../../client/locales/crm/index.js';

// The opportunity page is laid out as the lead's: account / name heading
// the particulars, the stage a row among them, the tabs on the right.

const state = vi.hoisted(() => ({
  api: vi.fn(),
  record: {} as Record<string, unknown>,
  canDelete: true,
}));

vi.mock('../../client/components/crm/api.js', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('../../client/components/crm/api.js')>();
  const metadata = {
    userId: 'rep',
    assign: true,
    approve: false,
    export: false,
    settingsAccess: false,
    assistant: true,
    probabilities,
    settings: { ...defaultSettings, timeZone: 'Asia/Shanghai' },
    definitions,
    users: [
      {
        id: 'rep',
        name: '赵敏',
        roles: ['sales-representative'],
        disabled: false,
        canApprove: false,
      },
    ],
    permissions: {
      contacts: { create: false },
      activities: { create: false },
      approvals: { create: false },
    },
  };
  return {
    ...actual,
    useCrmApi: () => state.api,
    useRefresh: () => () => Promise.resolve(),
    useSessionUserId: () => 'rep',
    useCrmScopeKey: () => ['crm', 'rep', 'zh-CN'],
    useAssistantAvailable: () => true,
    useMetadata: () => ({ data: metadata }),
    useMore: (
      _base: unknown,
      initial?: { data: unknown[]; total: number },
    ) => ({
      records: initial?.data ?? [],
      total: initial?.total ?? 0,
      titles: {},
      hasMore: false,
      loading: false,
      loadMore: () => Promise.resolve(),
    }),
    useCrmQuery: (path: string) =>
      path === 'opportunities/opp-1'
        ? {
            isLoading: false,
            data: {
              record: state.record,
              titles: { 'account-1': '沃格光电' },
              names: {},
              related: { approvals: [] },
              relatedTotals: {},
              history: [],
              historyTotal: 0,
              notesTotal: 2,
              permissions: {
                edit: true,
                delete: state.canDelete,
                approve: false,
              },
            },
          }
        : path === 'metadata'
          ? { isLoading: false, data: metadata }
          : { isLoading: false, data: undefined },
    useCrmText: () => ({
      text: (key: string, values?: Record<string, unknown>): string => {
        const value = key
          .split('.')
          .reduce<unknown>(
            (node, part) => (node as Record<string, unknown>)?.[part],
            crmZh,
          );
        return typeof value === 'string'
          ? value.replace(/\{\{(\w+)\}\}/g, (_, k: string) =>
              String(values?.[k] ?? ''),
            )
          : key;
      },
      language: 'zh-CN',
    }),
  };
});

// The long text's fold measures itself; jsdom has no observer to do so.
globalThis.ResizeObserver ??= class {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
} as unknown as typeof ResizeObserver;

const { default: EntityDetail } =
  await import('../../client/pages/crm-entity-detail.js');

function Where(): ReactElement {
  return <output data-testid='where'>{useLocation().pathname}</output>;
}

function renderPage(path = '/crm/opportunities/opp-1'): void {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route
            path='/crm/:entity/:id/*'
            element={
              <>
                <EntityDetail entity='opportunities' id='opp-1' />
                <Where />
              </>
            }
          />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

const deal = {
  id: 'opp-1',
  name: '供应链集成系统',
  accountId: 'account-1',
  stage: 'contact',
  ownerId: 'rep',
  amount: 300000,
  currency: 'CNY',
  source: 'exhibition',
  contacts: [],
  attachments: [],
  createdAt: '2026-10-02T07:18:00.000Z',
  updatedAt: '2026-10-02T07:18:00.000Z',
};

beforeEach(() => {
  state.api.mockReset();
  state.api.mockResolvedValue({ data: {} });
  state.record = { ...deal };
  state.canDelete = true;
});

describe('the opportunity page', () => {
  it('heads the column with the account and the name, and groups the particulars', () => {
    renderPage();
    for (const heading of screen.getAllByRole('heading', { level: 1 })) {
      expect(heading.textContent).toContain('沃格光电');
      expect(heading.textContent).toContain('供应链集成系统');
    }
    expect(screen.queryByText(/ID: opp-1/)).toBeNull();
    for (const group of ['概况', '详情', '系统'])
      expect(screen.getByRole('heading', { name: group })).toBeTruthy();
    // No stepper: the stage is a row among the particulars.
    expect(screen.getByRole('button', { name: '阶段' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: /赢单/ })).toBeNull();
  });

  it("shows the open stage's win probability beside the stage, not as a row of its own", () => {
    renderPage();
    const chance = `${Math.round(probabilities.contact * 100)}%`;
    const stage = screen.getByRole('button', { name: '阶段' });
    expect(stage.textContent).toContain(chance);
    expect(screen.queryByText('成交概率')).toBeNull();
    expect(screen.queryByText('关闭时间')).toBeNull();
  });

  it('shows the closing time and no probability for a won deal', () => {
    state.record = {
      ...deal,
      stage: 'won',
      closedAt: '2026-10-05T02:00:00.000Z',
    };
    renderPage();
    expect(screen.queryByText('100%')).toBeNull();
    expect(screen.getByText('关闭时间')).toBeTruthy();
  });

  it('shows the resume date while paused', () => {
    state.record = {
      ...deal,
      stage: 'paused',
      pauseReason: 'budgetDeferred',
      resumeAt: '2026-11-01',
    };
    renderPage();
    expect(screen.getByText('预计恢复日期')).toBeTruthy();
  });

  it('clears the pause reason and resume date when a paused deal is lost', async () => {
    state.record = {
      ...deal,
      stage: 'paused',
      pauseReason: 'budgetDeferred',
      resumeAt: '2026-11-01',
    };
    renderPage();
    await userEvent.click(screen.getByRole('button', { name: '阶段' }));
    await userEvent.click(
      await screen.findByRole('menuitem', { name: '输单' }),
    );
    await userEvent.click(
      await screen.findByRole('menuitem', { name: '价格' }),
    );
    expect(state.api).toHaveBeenCalledWith('opportunities/opp-1', 'PATCH', {
      lostReason: 'price',
      pauseReason: null,
      resumeAt: null,
      stage: 'lost',
    });
  });

  it('gives each of the six tabs its place, the timeline without a count', async () => {
    renderPage();
    for (const name of ['动态', '活动', '联系人', '审批', '附件', '备注'])
      expect(
        screen.getAllByRole('tab', { name: new RegExp(name) }),
      ).toHaveLength(2);
    for (const tab of screen.getAllByRole('tab', { name: /动态/ }))
      expect(tab.textContent).toBe('动态');
    await userEvent.click(screen.getAllByRole('tab', { name: /联系人/ })[0]);
    expect(screen.getByTestId('where').textContent).toBe(
      '/crm/opportunities/opp-1/contacts',
    );
  });

  it('keeps asking the AI to follow up among the actions under the name, not in the tab band', () => {
    renderPage();
    const followUp = screen.getByRole('button', { name: /跟进/ });
    expect(followUp.closest('[role="tablist"]')).toBeNull();
    // The left column, the section that also holds the particulars' groups.
    const column = followUp.closest('section') as HTMLElement;
    expect(within(column).getByRole('heading', { name: '概况' })).toBeTruthy();
    expect(within(column).queryByRole('tab')).toBeNull();
  });

  it('offers no follow-up on a won deal', () => {
    state.record = {
      ...deal,
      stage: 'won',
      closedAt: '2026-10-05T02:00:00.000Z',
    };
    renderPage();
    expect(screen.queryByRole('button', { name: /跟进/ })).toBeNull();
  });

  it('puts deleting the deal in the More menu only for whoever may delete', async () => {
    renderPage();
    await userEvent.click(screen.getByRole('button', { name: '更多…' }));
    expect(
      await screen.findByRole('menuitem', { name: '删除商机' }),
    ).toBeTruthy();
  });

  it('leaves the More menu out without delete permission', () => {
    state.canDelete = false;
    renderPage();
    expect(screen.queryByRole('button', { name: '更多…' })).toBeNull();
  });
});
