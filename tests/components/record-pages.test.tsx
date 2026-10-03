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

// The account, contact and approval pages are laid out as the lead's: the
// heading over grouped particulars, every action under it, tabs on the right.

const state = vi.hoisted(() => ({
  api: vi.fn(),
  entity: 'accounts' as string,
  record: {} as Record<string, unknown>,
  related: {} as Record<string, unknown>,
  canDelete: true,
  canApprove: true,
  userId: 'rep',
}));

vi.mock('../../client/components/crm/api.js', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('../../client/components/crm/api.js')>();
  const metadata = {
    get userId() {
      return state.userId;
    },
    assign: true,
    approve: true,
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
      approvals: { create: false, delete: false },
      opportunities: { create: false },
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
      path === `${state.entity}/rec-1`
        ? {
            isLoading: false,
            data: {
              record: state.record,
              titles: { 'account-1': '沃格光电', 'opp-1': '沃格光电 / 供应链' },
              names: {},
              related: state.related,
              relatedTotals: {},
              history: [],
              historyTotal: 0,
              notesTotal: 2,
              permissions: {
                edit: true,
                delete: state.canDelete,
                approve: state.canApprove,
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

function renderPage(path = `/crm/${state.entity}/rec-1`): void {
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
                <EntityDetail entity={state.entity as 'accounts'} id='rec-1' />
                <Where />
              </>
            }
          />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

const stamps = {
  createdAt: '2026-10-01T02:00:00.000Z',
  updatedAt: '2026-10-01T03:00:00.000Z',
};

beforeEach(() => {
  state.api.mockReset();
  state.api.mockResolvedValue({ data: {} });
  state.canDelete = true;
  state.userId = 'rep';
  state.canApprove = true;
  state.related = {};
});

describe('the account page', () => {
  beforeEach(() => {
    state.entity = 'accounts';
    state.record = {
      id: 'rec-1',
      name: '杭州海康威视',
      ownerId: 'rep',
      status: 'churned',
      churnReason: 'toCompetitor',
      website: 'https://example.com',
      country: 'CN',
      attachments: [],
      ...stamps,
    };
    state.related = {
      contacts: [],
      opportunities: [],
      leads: [{ id: 'lead-1', name: '张伟', company: '海康' }],
    };
  });

  it('heads the page with the name and groups the particulars, with no header or ID line', () => {
    renderPage();
    for (const heading of screen.getAllByRole('heading', { level: 1 }))
      expect(heading.textContent).toContain('杭州海康威视');
    expect(screen.queryByText(/ID: rec-1/)).toBeNull();
    for (const group of ['概况', '公司', '系统'])
      expect(screen.getByRole('heading', { name: group })).toBeTruthy();
    expect(screen.getByText('地区')).toBeTruthy();
  });

  it('lists the leads it came from', () => {
    renderPage();
    const company = screen
      .getByRole('heading', { name: '公司' })
      .closest('section') as HTMLElement;
    expect(within(company).getByText('转化自线索')).toBeTruthy();
    expect(within(company).getByRole('link', { name: /张伟/ })).toBeTruthy();
  });

  it('offers the AI shortcuts under the name and keeps the tab band to tabs', () => {
    renderPage();
    for (const name of ['总结客户', '调研公司', '发现销售机会']) {
      const button = screen.getByRole('button', { name: new RegExp(name) });
      expect(button.closest('[role="tablist"]')).toBeNull();
    }
    for (const name of ['动态', '活动', '联系人', '商机', '附件', '备注'])
      expect(
        screen.getAllByRole('tab', { name: new RegExp(name) }),
      ).toHaveLength(2);
  });
});

describe('the account page shortcuts and reason', () => {
  beforeEach(() => {
    state.entity = 'accounts';
    state.record = {
      id: 'rec-1',
      name: '丰味食品',
      ownerId: 'rep',
      status: 'churned',
      churnReason: 'toCompetitor',
      attachments: [],
      ...stamps,
    };
    state.related = { contacts: [], opportunities: [] };
  });

  it("keeps a churned account's reason editable as its own row", () => {
    renderPage();
    expect(screen.getByRole('button', { name: '流失原因' })).toBeTruthy();
  });

  it('researches the company with web search on', async () => {
    const sent: CustomEvent[] = [];
    const listen = (event: Event): void => {
      sent.push(event as CustomEvent);
    };
    window.addEventListener('crm-assistant', listen);
    renderPage();
    await userEvent.click(screen.getByRole('button', { name: /调研公司/ }));
    window.removeEventListener('crm-assistant', listen);
    expect(sent.at(-1)?.detail).toMatchObject({
      entity: 'accounts',
      recordId: 'rec-1',
      webSearch: true,
    });
  });
});

describe('the contact page', () => {
  beforeEach(() => {
    state.entity = 'contacts';
    state.record = {
      id: 'rec-1',
      name: '周晓',
      accountId: 'account-1',
      ownerId: 'rep',
      phone: '138 0000 5217',
      ...stamps,
    };
    state.related = { opportunities: [] };
  });

  it('heads the page with the name and its account, and has no attachments tab', () => {
    renderPage();
    for (const heading of screen.getAllByRole('heading', { level: 1 })) {
      expect(heading.textContent).toContain('周晓');
      expect(heading.textContent).toContain('沃格光电');
    }
    for (const group of ['概况', '联系方式', '系统'])
      expect(screen.getByRole('heading', { name: group })).toBeTruthy();
    expect(screen.queryByRole('tab', { name: /附件/ })).toBeNull();
    expect(screen.getAllByRole('tab', { name: /商机/ })).toHaveLength(2);
  });
});

describe('the approval page', () => {
  beforeEach(() => {
    state.entity = 'approvals';
    state.record = {
      id: 'rec-1',
      name: '华策精密 企业版折扣特批',
      ownerId: 'applicant',
      approverId: 'rep',
      status: 'pending',
      topic: 'discount',
      opportunityId: 'opp-1',
      description: '申请 10% 折扣',
      submittedAt: '2026-10-01T03:00:00.000Z',
      attachments: [],
      ...stamps,
    };
  });

  it('gives the approver the decision, the marker, and no creation time', () => {
    renderPage();
    expect(screen.getByRole('button', { name: /通过/ })).toBeTruthy();
    expect(screen.getByText('待你审批')).toBeTruthy();
    expect(screen.queryByText('创建时间')).toBeNull();
    expect(screen.getByText('提交时间')).toBeTruthy();
    // Not decided yet: the last time is its update, and no comment.
    expect(screen.getByText('更新时间')).toBeTruthy();
    expect(screen.queryByText('审批意见')).toBeNull();
  });

  it('offers the review briefing only to whoever may approve', () => {
    renderPage();
    expect(screen.getByRole('button', { name: /辅助审批/ })).toBeTruthy();
  });

  it('withholds the review briefing without approval permission', () => {
    state.canApprove = false;
    renderPage();
    expect(screen.queryByRole('button', { name: /辅助审批/ })).toBeNull();
  });

  it('shows the applicant no marker and the creation time', () => {
    state.userId = 'applicant';
    renderPage();
    expect(screen.queryByText('待你审批')).toBeNull();
    expect(screen.getByText('创建时间')).toBeTruthy();
  });

  it('shows the decision time and the comment, read only, once decided', () => {
    state.record = {
      ...state.record,
      status: 'approved',
      decidedAt: '2026-10-02T03:00:00.000Z',
      decisionComment: '同意 60 天账期',
    };
    renderPage();
    expect(screen.getByText('审批时间')).toBeTruthy();
    expect(screen.queryByText('更新时间')).toBeNull();
    expect(screen.getByText('审批意见')).toBeTruthy();
    expect(screen.getByText('同意 60 天账期')).toBeTruthy();
    // Shown, not edited: no editor button carries its label.
    expect(screen.queryByRole('button', { name: '审批意见' })).toBeNull();
    expect(screen.getByText('你是审批人')).toBeTruthy();
  });
});
