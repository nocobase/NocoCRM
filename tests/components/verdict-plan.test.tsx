import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  definitions,
  defaultSettings,
} from '../../server/providers/crm/schema.js';
import { crmZh } from '../../client/locales/crm/index.js';

const state = vi.hoisted(() => ({ api: vi.fn(), assign: true }));
vi.mock('../../client/components/crm/api.js', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('../../client/components/crm/api.js')>();
  return {
    ...actual,
    useCrmApi: () => state.api,
    useRefresh: () => () => Promise.resolve(),
    useRecord: (entity: string | undefined, id: unknown) => ({
      data: !entity
        ? undefined
        : {
            record:
              entity === 'activities'
                ? {
                    id,
                    type: 'call',
                    name: '首次电话',
                    status: 'planned',
                    ownerId: 'rep',
                    // act-1 long gone by (overdue); any other still ahead,
                    // already prepared.
                    startAt:
                      id === 'act-1'
                        ? '2020-01-01T02:00:00.000Z'
                        : '2099-01-01T02:00:00.000Z',
                    description:
                      id === 'act-1'
                        ? ''
                        : '**准备要点**\n- 梳理方案\n\n**邮件草稿**\n\n方案\n\n您好。',
                  }
                : { id, name: '张伟', company: '沃格光电', ownerId: 'rep' },
            titles: {},
            names: {},
          },
    }),
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
    useMetadata: () => ({
      data: {
        userId: 'manager',
        assign: state.assign,
        assistant: true,
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
          {
            id: 'manager',
            name: '李明',
            roles: ['sales-manager'],
            disabled: false,
            canApprove: true,
          },
        ],
        permissions: {},
      },
    }),
  };
});

// The long text's fold measures itself; jsdom has no observer to do so.
globalThis.ResizeObserver ??= class {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
} as unknown as typeof ResizeObserver;

const { VerdictPanel } =
  await import('../../client/components/crm/lead-evaluation.js');

const entry = {
  id: 'entry-1',
  status: 'pending' as const,
  createdAt: '2026-10-01T02:00:00.000Z',
  ai: {
    result: {
      recommendation: 'follow' as const,
      grade: 'A' as const,
      summary: '需求明确',
      reasons: [],
      edition: null,
      invalidReason: null,
      nextStep: { type: 'call', subject: '确认集成范围', inDays: 2 },
      prep: ['梳理方案'],
      questions: ['覆盖哪些环节？'],
    },
  },
};

beforeEach(() => {
  state.api.mockReset();
  state.api.mockResolvedValue({ data: {} });
  state.assign = true;
});

describe('the activity a follow-up card creates', () => {
  it('lays it out and accepts it as the person changed it', async () => {
    render(
      <VerdictPanel
        entry={entry}
        recordId='lead-1'
        editable
        onChanged={() => Promise.resolve()}
      />,
    );
    expect(screen.getByText('将创建的活动')).toBeTruthy();
    // Shown as it will be, not as a form: the proposed name, the lead's
    // owner and the description it will hold, headed.
    expect(screen.getByRole('button', { name: '名称' }).textContent).toBe(
      '确认集成范围',
    );
    expect(screen.getByRole('button', { name: '负责人' }).textContent).toBe(
      '赵敏',
    );
    expect(screen.getByRole('button', { name: '描述' }).textContent).toContain(
      '梳理方案',
    );
    // Not repeated in the list above.
    expect(screen.queryByText('准备要点：')).toBeNull();
    expect(screen.queryByText('下一步：')).toBeNull();
    // A double-click edits a value; Escape takes it back, Enter keeps it.
    await userEvent.dblClick(screen.getByRole('button', { name: '名称' }));
    const name = screen.getByRole('textbox', { name: '名称' });
    await userEvent.clear(name);
    await userEvent.type(name, '不要这个{Escape}');
    expect(screen.getByRole('button', { name: '名称' }).textContent).toBe(
      '确认集成范围',
    );
    await userEvent.dblClick(screen.getByRole('button', { name: '名称' }));
    await userEvent.clear(screen.getByRole('textbox', { name: '名称' }));
    await userEvent.type(
      screen.getByRole('textbox', { name: '名称' }),
      '发送方案资料{Enter}',
    );
    // The description opens as the Markdown it holds.
    await userEvent.dblClick(screen.getByRole('button', { name: '描述' }));
    expect(
      (screen.getByRole('textbox', { name: '描述' }) as HTMLTextAreaElement)
        .value,
    ).toBe('**准备要点**\n- 梳理方案\n\n**要问的问题**\n- 覆盖哪些环节？');
    await userEvent.keyboard('{Escape}');
    await userEvent.click(
      screen.getByRole('button', { name: '采纳并安排联系' }),
    );
    expect(state.api).toHaveBeenCalledWith(
      'leads/lead-1/evaluation/entry-1',
      'POST',
      { decision: 'accept', fields: [], activity: { name: '发送方案资料' } },
    );
  });

  it('edits the start as yyyy-mm-dd HH:mm on a 24-hour clock', async () => {
    render(
      <VerdictPanel
        entry={entry}
        recordId='lead-1'
        editable
        onChanged={() => Promise.resolve()}
      />,
    );
    await userEvent.dblClick(screen.getByRole('button', { name: '开始时间' }));
    const start = screen.getByRole('textbox', { name: '开始时间' });
    expect(start).not.toHaveAttribute('type', 'datetime-local');
    expect((start as HTMLInputElement).value).toMatch(
      /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/,
    );
    await userEvent.clear(start);
    await userEvent.type(start, '2026-10-09 15:45{Enter}');
    await userEvent.click(
      screen.getByRole('button', { name: '采纳并安排联系' }),
    );
    // Typed on the laptop's clock, sent as the instant it names.
    expect(state.api).toHaveBeenCalledWith(
      'leads/lead-1/evaluation/entry-1',
      'POST',
      {
        decision: 'accept',
        fields: [],
        activity: { startAt: new Date(2026, 9, 9, 15, 45).toISOString() },
      },
    );
  });
  it('keeps the owner for whoever may not assign', () => {
    state.assign = false;
    render(
      <VerdictPanel
        entry={entry}
        recordId='lead-1'
        editable
        onChanged={() => Promise.resolve()}
      />,
    );
    // Shown, but not opened for editing.
    expect(screen.getByText('赵敏')).toBeTruthy();
    expect(screen.queryByRole('button', { name: '负责人' })).toBeNull();
  });

  it('is not laid out on a card the reader cannot decide', () => {
    render(
      <VerdictPanel
        entry={entry}
        recordId='lead-1'
        editable={false}
        onChanged={() => Promise.resolve()}
      />,
    );
    expect(screen.queryByText('将创建的活动')).toBeNull();
    expect(screen.getByText('下一步：')).toBeTruthy();
  });
});

describe('the planned activity description', () => {
  it('heads what to prepare, ask and send, in the reader language', async () => {
    const { planDescription } =
      await import('../../server/providers/crm/plan.js');
    expect(
      planDescription(
        {
          prep: ['带案例'],
          questions: [],
          email: { subject: '方案', body: '您好。' },
        },
        true,
      ),
    ).toBe('**准备要点**\n- 带案例\n\n**邮件草稿**\n\n方案\n\n您好。');
    expect(planDescription({ questions: ['Who decides?'] }, false)).toBe(
      '**To ask**\n- Who decides?',
    );
  });
});

describe('a follow-up that carries on an overdue activity', () => {
  it('asks whether it was done, and records what came of it', async () => {
    render(
      <VerdictPanel
        entry={{
          ...entry,
          ai: {
            result: {
              ...entry.ai.result,
              nextStep: {
                type: 'call',
                subject: '首次电话',
                inDays: 1,
                activityId: 'act-1',
              },
            },
          },
        }}
        recordId='lead-1'
        editable
        onChanged={() => Promise.resolve()}
      />,
    );
    expect(screen.getByText('逾期的活动')).toBeTruthy();
    // The activity is shown as it stands, while its outcome is being told:
    // read, not open for changes.
    expect(screen.getByText('首次电话')).toBeTruthy();
    expect(screen.queryByRole('button', { name: '名称' })).toBeNull();
    // Done is the first answer: what came of it is needed to record it.
    const record = screen.getByRole('button', { name: '记录结果' });
    expect((record as HTMLButtonElement).disabled).toBe(true);
    await userEvent.type(
      screen.getByRole('textbox', { name: '反馈 / 结果' }),
      '对方下周看演示',
    );
    await userEvent.click(screen.getByRole('button', { name: '记录结果' }));
    expect(state.api).toHaveBeenCalledWith(
      'leads/lead-1/evaluation/entry-1',
      'POST',
      {
        decision: 'accept',
        fields: [],
        activity: { mode: 'report', outcome: '对方下周看演示' },
      },
    );
    // Not done: moved instead.
    await userEvent.click(screen.getByRole('radio', { name: '未完成，改期' }));
    expect(screen.getByRole('button', { name: '采纳并改期' })).toBeTruthy();
  });
});

describe('a follow-up on an activity that has an earlier one', () => {
  it('takes the place of the earlier parts, keeping what a person wrote', async () => {
    const { mergePlanDescription } =
      await import('../../server/providers/crm/plan.js');
    const before = [
      '客户要求先看报价',
      '',
      '**准备要点**',
      '- 旧要点',
      '',
      '**要问的问题**',
      '- 旧问题',
      '',
      '**邮件草稿**',
      '',
      '旧主题',
      '',
      '旧正文',
    ].join('\n');
    expect(
      mergePlanDescription(
        before,
        { prep: ['新要点'], questions: ['新问题'] },
        true,
      ),
    ).toBe(
      [
        '客户要求先看报价',
        '',
        '**准备要点**',
        '- 新要点',
        '',
        '**要问的问题**',
        '- 新问题',
        '',
        '**邮件草稿**',
        '',
        '旧主题',
        '',
        '旧正文',
      ].join('\n'),
    );
    // Run on what it wrote, the same follow-up changes nothing.
    const once = mergePlanDescription('', { prep: ['要点'] }, true);
    expect(mergePlanDescription(once, { prep: ['要点'] }, true)).toBe(once);
  });
});

describe('a follow-up that carries on a planned activity', () => {
  const carry = (email: { subject: string; body: string }) => ({
    ...entry,
    ai: {
      result: {
        ...entry.ai.result,
        prep: [],
        questions: [],
        email,
        nextStep: {
          type: 'email',
          subject: '首次电话',
          inDays: 2,
          activityId: 'act-2',
        },
      },
    },
  });

  it('says when the activity is ready as it is', () => {
    render(
      <VerdictPanel
        entry={carry({ subject: '方案', body: '您好。' })}
        recordId='lead-1'
        editable
        onChanged={() => Promise.resolve()}
      />,
    );
    expect(screen.getByText('跟进的活动（已安排）')).toBeTruthy();
    expect(screen.getByText('活动内容已经准备好，无需改动。')).toBeTruthy();
    expect(screen.getByRole('button', { name: '采纳' })).toBeTruthy();
  });

  it('says what accepting changes on it', () => {
    render(
      <VerdictPanel
        entry={carry({ subject: '方案', body: '您好，附上案例。' })}
        recordId='lead-1'
        editable
        onChanged={() => Promise.resolve()}
      />,
    );
    expect(
      screen.getByText('采纳后：准备要点 不变 · 邮件草稿 更新'),
    ).toBeTruthy();
    expect(screen.getByRole('button', { name: '采纳并更新活动' })).toBeTruthy();
  });

  it('may be told as done though not yet due, the notes written up by the AI', async () => {
    state.api.mockResolvedValue({
      data: { text: '**对方反馈**\n- 下周看演示' },
    });
    render(
      <VerdictPanel
        entry={carry({ subject: '方案', body: '您好。' })}
        recordId='lead-1'
        editable
        onChanged={() => Promise.resolve()}
      />,
    );
    // Not due: "not yet" to start with.
    await userEvent.click(screen.getByRole('radio', { name: '已完成' }));
    const outcome = screen.getByRole('textbox', { name: '反馈 / 结果' });
    await userEvent.type(outcome, '张总说下周看演示');
    await userEvent.click(screen.getByRole('button', { name: 'AI 整理' }));
    expect(state.api).toHaveBeenCalledWith(
      'activities/act-2/feedback/organise',
      'POST',
      { text: '张总说下周看演示' },
    );
    expect(
      (
        screen.getByRole('textbox', {
          name: '反馈 / 结果',
        }) as HTMLTextAreaElement
      ).value,
    ).toBe('**对方反馈**\n- 下周看演示');
    expect(screen.getByRole('button', { name: '记录结果' })).toBeTruthy();
    // The lead followed up anew once recorded, unless unticked.
    const again = screen.getByRole('checkbox', {
      name: '记录后让 AI 继续跟进',
    });
    expect(again).toBeChecked();
    await userEvent.click(again);
    await userEvent.click(screen.getByRole('button', { name: '记录结果' }));
    expect(state.api).toHaveBeenLastCalledWith(
      'leads/lead-1/evaluation/entry-1',
      'POST',
      expect.objectContaining({
        decision: 'accept',
        activity: expect.objectContaining({
          mode: 'report',
          outcome: '**对方反馈**\n- 下周看演示',
          followUp: false,
        }),
      }),
    );
  });
});

describe("a deal's follow-up card", () => {
  const deal = (result: Record<string, unknown>) => ({
    id: 'entry-2',
    status: 'pending' as const,
    createdAt: '2026-10-01T02:00:00.000Z',
    ai: {
      result: {
        recommendation: 'advance' as const,
        confidence: 'medium' as const,
        stage: 'validation',
        summary: '演示做过，客户试用反馈良好',
        reasons: ['上周演示（活动）'],
        risks: ['还没见过拍板人'],
        nextStep: { type: 'meeting', subject: '技术评估会', inDays: 2 },
        prep: ['带上部署方案'],
        questions: [],
        email: null,
        updates: [
          {
            field: 'expectedCloseAt' as const,
            value: '2026-12-31',
            reason: '客户说年底上线',
            current: null,
          },
          {
            field: 'amount' as const,
            value: '60000',
            reason: '加了实施服务',
            current: '50000',
          },
        ],
        pauseReason: null,
        resumeInDays: null,
        lostReason: null,
        revisitInDays: null,
        changes: [],
        ...result,
      },
    },
  });

  it('advances the stage with the updates still ticked and plans the next step', async () => {
    render(
      <VerdictPanel
        entity='opportunities'
        entry={deal({})}
        recordId='opp-1'
        editable
        onChanged={() => Promise.resolve()}
      />,
    );
    // The verdict in a few words, the stage it moves to and its risks.
    expect(screen.getByText('推进到方案验证 · 把握一般')).toBeTruthy();
    expect(screen.getByText('改为方案验证')).toBeTruthy();
    expect(screen.getByText('还没见过拍板人')).toBeTruthy();
    // Both changes ticked; the amount is unticked here.
    const boxes = screen.getAllByRole('checkbox');
    expect(boxes).toHaveLength(2);
    await userEvent.click(boxes[1]);
    expect(screen.getByRole('button', { name: '名称' }).textContent).toBe(
      '技术评估会',
    );
    await userEvent.click(screen.getByRole('button', { name: '采纳并推进' }));
    expect(state.api).toHaveBeenCalledWith(
      'opportunities/opp-1/evaluation/entry-2',
      'POST',
      { decision: 'accept', fields: ['expectedCloseAt'], activity: {} },
    );
  });

  // The terms on the table, each with where it stands against the approvals.
  it('lists the terms and where each stands', () => {
    render(
      <VerdictPanel
        entity='opportunities'
        entry={deal({
          terms: [
            {
              topic: 'discount',
              term: '85 折',
              status: 'approved',
              approval: '一期8折优惠申请',
            },
            {
              topic: 'paymentTerms',
              term: '尾款验收后 60 天',
              status: 'needed',
            },
          ],
        })}
        recordId='opp-1'
        editable
        onChanged={() => Promise.resolve()}
      />,
    );
    expect(screen.getByText('条款核对')).toBeTruthy();
    const row = (term: string) =>
      screen.getByText(term).parentElement?.textContent ?? '';
    expect(row('85 折')).toContain('已批准');
    expect(row('85 折')).toContain('一期8折优惠申请');
    expect(row('尾款验收后 60 天')).toContain('需审批');
  });

  // Followed up after its approvals were decided: which, and how.
  it('names the approvals whose outcomes started it', () => {
    const entry = deal({});
    render(
      <VerdictPanel
        entity='opportunities'
        entry={{
          ...entry,
          ai: {
            ...entry.ai,
            trigger: 'approvalDecided',
            decidedApprovals: [
              { id: 'a1', name: '一期 8 折', status: 'approved' },
              { id: 'a2', name: '源码交付', status: 'rejected' },
            ],
          },
        }}
        recordId='opp-1'
        editable
        onChanged={() => Promise.resolve()}
      />,
    );
    expect(
      screen.getByText(
        '审批有了结果（一期 8 折 已通过 · 源码交付 已拒绝），AI 继续跟进。',
      ),
    ).toBeTruthy();
  });

  it('pauses with the task to resume it', async () => {
    render(
      <VerdictPanel
        entity='opportunities'
        entry={deal({
          recommendation: 'pause',
          stage: null,
          nextStep: null,
          prep: [],
          updates: [],
          pauseReason: 'budgetDeferred',
          resumeInDays: 60,
        })}
        recordId='opp-1'
        editable
        onChanged={() => Promise.resolve()}
      />,
    );
    expect(screen.getByText('预算推迟')).toBeTruthy();
    // The task named as the server names it: the deal, then what it is.
    expect(screen.getByRole('button', { name: '名称' }).textContent).toBe(
      '张伟 恢复跟进',
    );
    await userEvent.click(screen.getByRole('button', { name: '采纳并暂停' }));
    expect(state.api).toHaveBeenCalledWith(
      'opportunities/opp-1/evaluation/entry-2',
      'POST',
      { decision: 'accept', fields: [], activity: {} },
    );
  });
});
