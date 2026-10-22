import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ApiClientError } from '@nocobase/app-client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { crmZh } from '../../client/locales/crm/index.js';
import {
  definitions,
  defaultSettings,
} from '../../server/providers/crm/schema.js';
import type { PlanView } from '../../client/components/crm/plans.js';

// A plan an agent proposed is decided on its card: what each step changes,
// old value beside new, which steps to keep, and what came of the decision.

const state = vi.hoisted(() => ({
  api: vi.fn(),
  plans: [] as unknown[],
}));

// The assistant panel the conversation opens in (tests/setup/agent-chat-fake).
vi.mock('@nocobase/app-plugin-agents/client/chat', async (importOriginal) =>
  (await import('../setup/agent-chat-fake.js')).fakeChatModule(
    await importOriginal(),
  ),
);
const { chatFake } = await import('../setup/agent-chat-fake.js');
vi.mock('../../client/components/crm/api.js', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('../../client/components/crm/api.js')>();
  const metadata = {
    userId: 'rep',
    settings: { ...defaultSettings, timeZone: 'Asia/Shanghai' },
    definitions,
    users: [{ id: 'rep', name: '赵敏', roles: [], disabled: false }],
    permissions: {},
  };
  // The Chinese wording, with plurals and placeholders as i18next fills them.
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
    useCrmScopeKey: () => ['crm', 'rep', 'zh-CN'],
    useMetadata: () => ({ data: metadata }),
    useCrmText: () => ({ text, language: 'zh-CN' }),
  };
});

const { PlanCard } = await import('../../client/components/crm/plan-card.js');

const step = (
  position: number,
  changes: { field: string; from: unknown; to: unknown }[],
  op: PlanView['steps'][number]['op'] = 'record.update',
) => ({
  id: `s${position}`,
  position,
  op,
  ref: null,
  params: {},
  check: { entity: 'leads' as const, id: 'lead-1', name: '周晓', changes },
  status: 'pending' as const,
  result: null,
});

const plan = (overrides: Partial<PlanView> = {}): PlanView => ({
  id: 'p1',
  title: '更新周晓的线索',
  summary: null,
  status: 'pending',
  revision: 3,
  proposerUserId: 'rep',
  agentId: 'a1',
  agentName: 'AI',
  runId: 'r1',
  conversationId: 'c1',
  deciderUserId: null,
  decidedAt: null,
  failure: null,
  expiresAt: new Date(Date.now() + 5 * 3_600_000).toISOString(),
  createdAt: new Date().toISOString(),
  steps: [
    step(1, [{ field: 'name', from: '周小', to: '周晓' }]),
    step(
      2,
      [{ field: 'comment', from: null, to: '展会上认识' }],
      'comment.create',
    ),
  ],
  titles: {},
  ...overrides,
});

function renderWith(node: React.ReactNode): void {
  render(
    <QueryClientProvider
      client={
        new QueryClient({ defaultOptions: { queries: { retry: false } } })
      }
    >
      <MemoryRouter>{node}</MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  chatFake.reset();
  state.plans = [];
  state.api.mockReset();
  state.api.mockImplementation(async (path: string) =>
    path.startsWith('plans?')
      ? { data: state.plans, meta: { total: state.plans.length } }
      : { data: {} },
  );
});

describe('a plan card', () => {
  it('shows a paragraph changed with its old text above, struck and plain', () => {
    // The long text's fold measures itself.
    vi.stubGlobal(
      'ResizeObserver',
      class {
        observe(): void {}
        disconnect(): void {}
      },
    );
    renderWith(
      <PlanCard
        plan={plan({
          steps: [
            step(1, [
              {
                field: 'message',
                from: '**目标**\n回顾最新进展，确认客户当前的需求和顾虑。',
                to: '约到并打完电话',
              },
            ]),
          ],
        })}
      />,
    );
    const old = screen.getByText(/回顾最新进展/u);
    expect(old.className).toContain('line-through');
    expect(old.className).toContain('line-clamp-2');
    expect(old.textContent).not.toContain('**');
  });

  it('shows an email whole before it is sent, and whether it went', () => {
    const email = {
      ...step(1, [], 'mail.send'),
      check: {
        entity: 'opportunities' as const,
        id: 'deal-1',
        name: '年度采购',
        changes: [],
        mail: {
          from: 'me@example.com',
          to: ['buyer@example.com'],
          cc: [],
          subject: '报价已批准',
          text: '您好，\n折扣已经批准。',
        },
      },
    };
    const approve = {
      ...step(2, [{ field: 'status', from: 'pending', to: 'approved' }]),
      op: 'approval.decide' as const,
      params: { decision: 'approve' },
      check: {
        entity: 'approvals' as const,
        id: 'approval-1',
        name: '九折',
        changes: [{ field: 'status', from: 'pending', to: 'approved' }],
      },
    };
    renderWith(<PlanCard plan={plan({ steps: [email, approve] })} />);
    const card = screen.getByRole('region', { name: '更新周晓的线索' });
    expect(within(card).getByText('发送邮件')).toBeTruthy();
    expect(within(card).getByText('buyer@example.com')).toBeTruthy();
    expect(within(card).getByText('报价已批准')).toBeTruthy();
    expect(within(card).getByText(/折扣已经批准/u)).toBeTruthy();
    expect(within(card).getByText('执行后从你的邮箱发出。')).toBeTruthy();
    // Deciding an approval reads as the decision.
    expect(within(card).getByText('批准')).toBeTruthy();
  });

  it('says an email of a plan carried out was not sent', () => {
    const email = {
      ...step(1, [], 'mail.send'),
      status: 'failed' as const,
      result: { code: 'mailFailed' },
      check: {
        entity: 'contacts' as const,
        id: null,
        name: '',
        changes: [],
        mail: {
          from: 'me@example.com',
          to: ['buyer@example.com'],
          cc: [],
          subject: '提醒',
          text: '还感兴趣吗？',
        },
      },
    };
    renderWith(
      <PlanCard
        plan={plan({
          status: 'executed',
          deciderUserId: 'rep',
          decidedAt: new Date().toISOString(),
          steps: [email],
        })}
      />,
    );
    expect(screen.getByText('未发送：邮件没能发出。')).toBeTruthy();
  });

  it.each(['pending', 'executed'] as const)(
    'names the company and deal a %s step creating a task links to',
    (status) => {
      const task = {
        ...step(
          1,
          [
            { field: 'name', from: null, to: '方案演示' },
            { field: 'companyId', from: null, to: 'company-1' },
            { field: 'opportunityId', from: null, to: 'deal-1' },
          ],
          'record.create',
        ),
        status: status === 'pending' ? ('pending' as const) : ('done' as const),
        check: {
          entity: 'tasks' as const,
          id: null,
          name: '方案演示',
          changes: [
            { field: 'name', from: null, to: '方案演示' },
            { field: 'companyId', from: null, to: 'company-1' },
            { field: 'opportunityId', from: null, to: 'deal-1' },
          ],
        },
      };
      renderWith(
        <PlanCard
          plan={plan({
            status,
            deciderUserId: status === 'pending' ? null : 'rep',
            decidedAt: status === 'pending' ? null : new Date().toISOString(),
            steps: [task],
            titles: {
              'company-1': '华光科技',
              'deal-1': '华光科技 / 年度采购',
            },
          })}
        />,
      );
      const card = screen.getByRole('region', { name: '更新周晓的线索' });
      // Each by its name, linked to its page, not by what kind of record.
      expect(
        within(card)
          .getByRole('link', { name: '华光科技' })
          .getAttribute('href'),
      ).toContain('company-1');
      expect(
        within(card)
          .getByRole('link', { name: '华光科技 / 年度采购' })
          .getAttribute('href'),
      ).toContain('deal-1');
      for (const entity of ['companies', 'opportunities'])
        expect(
          within(card).queryByText(crmZh.entities[entity as 'companies']),
        ).toBeNull();
    },
  );

  it('shows each change from its old value to its new one, without hover', () => {
    renderWith(<PlanCard plan={plan()} />);
    const card = screen.getByRole('region', { name: '更新周晓的线索' });
    const old = within(card).getByText('周小');
    expect(old.closest('.line-through')).toBeTruthy();
    expect(within(card).getByText('展会上认识')).toBeTruthy();
    expect(within(card).getByText('5 小时后过期')).toBeTruthy();
  });

  it('carries out the steps kept, and its button counts them', async () => {
    state.api.mockImplementation(async () => ({
      data: plan({ status: 'executed', deciderUserId: 'rep' }),
    }));
    renderWith(<PlanCard plan={plan()} />);
    await userEvent.click(
      screen.getByRole('checkbox', { name: '保留第 2 步' }),
    );
    const button = screen.getByRole('button', { name: '执行 1 项改动' });
    // In the primary, as the assistant's confirmation cards were.
    expect(button.className).toContain('bg-primary');
    await userEvent.click(button);
    await waitFor(() =>
      expect(state.api).toHaveBeenCalledWith('plans/p1/execute', 'POST', {
        revision: 3,
        skip: [2],
      }),
    );
  });

  it('says a plan that no longer exists is gone, and offers nothing', async () => {
    state.api.mockRejectedValue(
      new ApiClientError('gone', {
        status: 404,
        method: 'POST',
        url: '/api/plans/p1/void',
        payload: {
          error: { status: 'NOT_FOUND', reason: 'NOT_FOUND', domain: 'crm' },
        },
      }),
    );
    renderWith(<PlanCard plan={plan()} />);
    await userEvent.click(screen.getByRole('button', { name: '忽略' }));
    expect(await screen.findByText('这些建议的改动已不存在。')).toBeTruthy();
    expect(screen.queryByRole('button', { name: '忽略' })).toBeNull();
    expect(document.activeElement?.textContent).toBe(
      '这些建议的改动已不存在。',
    );
  });

  it('shows a plan being carried out without its buttons', () => {
    renderWith(<PlanCard plan={plan({ status: 'executing' })} />);
    expect(screen.getByText('执行中…')).toBeTruthy();
    expect(screen.queryByRole('button', { name: /执行 \d/u })).toBeNull();
    expect(screen.queryByRole('button', { name: '忽略' })).toBeNull();
  });

  it('says a plan was replaced by a newer one', () => {
    renderWith(
      <PlanCard
        plan={plan({
          status: 'superseded',
          failure: { code: 'superseded', supersededBy: 'p2' },
        })}
      />,
    );
    expect(screen.getByText('已替换')).toBeTruthy();
    expect(screen.getByText(/已被后来提出的同类改动替换/u)).toBeTruthy();
    expect(screen.queryByRole('button', { name: '忽略' })).toBeNull();
  });

  it('explains a stale plan', () => {
    renderWith(
      <PlanCard plan={plan({ status: 'stale', failure: { position: 1 } })} />,
    );
    expect(screen.getByText(/涉及的记录在提出建议后被改动过/u)).toBeTruthy();
  });
});
