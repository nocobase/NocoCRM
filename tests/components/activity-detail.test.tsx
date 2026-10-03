import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactElement } from 'react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  definitions,
  defaultSettings,
} from '../../server/providers/crm/schema.js';
import { crmZh } from '../../client/locales/crm/index.js';

// The activity page is laid out as the lead's: no header, the particulars
// in groups on the left, the timeline and its other tabs on the right.

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
    probabilities: {},
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
    permissions: {},
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
      path.startsWith('activities/')
        ? {
            isLoading: false,
            data: {
              record: state.record,
              titles: { 'lead-1': '罗雨萱 / 新域零售' },
              names: {},
              related: {},
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

function renderPage(path = '/crm/activities/act-1'): void {
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
                <EntityDetail entity='activities' id='act-1' />
                <Where />
              </>
            }
          />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

const planned = {
  id: 'act-1',
  name: '新域零售 培训计划沟通',
  type: 'email',
  status: 'planned',
  ownerId: 'rep',
  startAt: '2026-10-23T03:00:00.000Z',
  endAt: '2026-10-23T04:00:00.000Z',
  leadId: 'lead-1',
  description: '回顾最新进展',
  attachments: [],
  createdAt: '2026-09-22T02:00:00.000Z',
  updatedAt: '2026-09-22T02:00:00.000Z',
};

beforeEach(() => {
  state.api.mockReset();
  state.api.mockResolvedValue({ data: {} });
  state.record = { ...planned };
  state.canDelete = true;
});

describe('the activity page', () => {
  it('heads the page with the name and groups the particulars', () => {
    renderPage();
    // Drawn in the band and, for the stacked layout, atop the column; CSS
    // shows one of them, jsdom keeps both.
    for (const heading of screen.getAllByRole('heading', { level: 1 }))
      expect(heading.textContent).toContain('新域零售 培训计划沟通');
    // No generic header line with the record's id.
    expect(screen.queryByText(/ID: act-1/)).toBeNull();
    for (const group of ['概况', '参与人', '关联', '内容', '系统'])
      expect(screen.getByRole('heading', { name: group })).toBeTruthy();
    const related = screen
      .getByRole('heading', { name: '关联' })
      .closest('section') as HTMLElement;
    expect(within(related).getByText('关联线索')).toBeTruthy();
    expect(
      within(related).getByRole('link', { name: '罗雨萱 / 新域零售' }),
    ).toBeTruthy();
    // A planned activity has no completion time yet.
    expect(screen.queryByText('完成时间')).toBeNull();
  });

  it('offers recording the outcome only while the activity is planned', () => {
    renderPage();
    expect(screen.getByRole('button', { name: /记录结果/ })).toBeTruthy();
  });

  // The outcome of a planned activity goes through "Record outcome", which
  // completes it and has the AI follow up; typed into the field it would
  // do neither, so the field waits until there is one.
  it('keeps the outcome field out of a planned activity until it has one', () => {
    renderPage();
    expect(screen.queryByText('反馈 / 结果')).toBeNull();
    cleanup();
    state.record = { ...planned, feedback: '客户确认了报价' };
    renderPage();
    expect(screen.getByText('反馈 / 结果')).toBeTruthy();
  });

  // Marking it done from the status menu records its outcome, as the
  // button does, rather than completing it with nothing for the AI to read.
  it('records the outcome when the status menu marks a planned activity completed', async () => {
    renderPage();
    await userEvent.click(screen.getByRole('button', { name: '状态' }));
    await userEvent.click(
      await screen.findByRole('menuitem', { name: '已完成' }),
    );
    expect(await screen.findByRole('dialog')).toBeTruthy();
    expect(state.api).not.toHaveBeenCalledWith(
      expect.stringContaining('activities/'),
      'PATCH',
      expect.objectContaining({ status: 'completed' }),
    );
  });

  it('shows the completion time and no outcome button once completed', () => {
    state.record = {
      ...planned,
      status: 'completed',
      completedAt: '2026-10-23T04:30:00.000Z',
    };
    renderPage();
    expect(screen.queryByRole('button', { name: /记录结果/ })).toBeNull();
    expect(screen.getByText('完成时间')).toBeTruthy();
    expect(screen.getByText('反馈 / 结果')).toBeTruthy();
  });

  it('counts attachments and notes but not the timeline, and keeps the tab in the address', async () => {
    renderPage();
    const tabs = screen.getAllByRole('tab', { name: /动态/ });
    // Side by side and stacked, the bar is drawn twice; neither counts.
    for (const tab of tabs) expect(tab.textContent).toBe('动态');
    expect(screen.getAllByRole('tab', { name: /备注/ })[0].textContent).toBe(
      '备注2',
    );
    await userEvent.click(screen.getAllByRole('tab', { name: /附件/ })[0]);
    expect(screen.getByTestId('where').textContent).toBe(
      '/crm/activities/act-1/attachments',
    );
  });

  it('puts deleting in the More menu only for whoever may delete', async () => {
    renderPage();
    await userEvent.click(screen.getByRole('button', { name: '更多…' }));
    expect(
      await screen.findByRole('menuitem', { name: '删除活动' }),
    ).toBeTruthy();
  });

  it('leaves the More menu out without delete permission', () => {
    state.canDelete = false;
    renderPage();
    expect(screen.queryByRole('button', { name: '更多…' })).toBeNull();
  });
});
