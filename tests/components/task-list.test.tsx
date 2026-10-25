import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactElement } from 'react';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  definitions,
  defaultSettings,
} from '../../server/providers/crm/schema.js';
import { crmZh } from '../../client/locales/crm/index.js';

// The task list reads as a to-do list: open tasks by when they are due,
// then what is done or cancelled, folded at first, each ticked or set aside
// in place.

const state = vi.hoisted(() => ({ api: vi.fn() }));

vi.mock('../../client/components/crm/api.js', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('../../client/components/crm/api.js')>();
  const metadata = {
    userId: 'rep',
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
    permissions: { tasks: { update: { all: false } } },
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

const { TaskList } = await import('../../client/components/crm/task-list.js');

function Page({ status }: { status: string }): ReactElement {
  const params = new URLSearchParams({ search: '' });
  return <TaskList params={params} status={status} empty={<p>empty</p>} />;
}

const task = (
  id: string,
  name: string,
  status: string,
  ownerId = 'rep',
): Record<string, unknown> => ({
  id,
  name,
  status,
  ownerId,
  // Untimed, so the open ones sit in a group shown at first.
  dueAt: null,
  leadId: 'lead-1',
  internalParticipants: [],
});

const page = (data: Record<string, unknown>[]) => ({
  data,
  meta: {
    total: data.length,
    page: 1,
    pageSize: 50,
    titles: { 'lead-1': '罗雨萱 / 新域零售' },
    names: {},
  },
});

function renderList(status = ''): void {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <Page status={status} />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  localStorage.clear();
  state.api.mockReset();
  state.api.mockImplementation((path: string) =>
    Promise.resolve(
      path.includes('excludeStatus=open')
        ? page([
            task('done-1', '已完成的任务', 'completed'),
            task('off-1', '已取消的任务', 'cancelled'),
          ])
        : path.startsWith('tasks?')
          ? page([
              task('open-1', '我的待办', 'open'),
              task('open-2', '别人的待办', 'open', 'other'),
            ])
          : { data: {} },
    ),
  );
});

afterEach(cleanup);

describe('the task list', () => {
  it('lists what is to do, then what is closed folded away', async () => {
    renderList();
    expect(await screen.findByText('我的待办')).toBeTruthy();
    const closedGroup = screen.getByRole('button', { name: /已结束/ });
    expect(closedGroup.getAttribute('aria-expanded')).toBe('false');
    expect(screen.queryByText('已完成的任务')).toBeNull();
    // Open tasks soonest first; what is done latest first.
    const paths = state.api.mock.calls.map(([path]) => String(path));
    expect(
      paths.some(
        (p) => p.includes('status=open') && p.includes('orderBy=dueAt'),
      ),
    ).toBe(true);
    expect(
      paths.some(
        (p) =>
          p.includes('excludeStatus=open') && p.includes('orderBy=-updatedAt'),
      ),
    ).toBe(true);
    await userEvent.click(closedGroup);
    expect(await screen.findByText('已完成的任务')).toBeTruthy();
    expect(screen.getByText('我的待办')).toBeTruthy();
    // Completed is ticked; cancelled has no box to tick.
    expect(
      screen
        .getByRole('checkbox', { name: '重新打开' })
        .getAttribute('aria-checked'),
    ).toBe('true');
    expect(screen.getAllByRole('checkbox', { name: '重新打开' })).toHaveLength(
      1,
    );
  });

  it('shows the tasks due later at first, only the closed ones folded', async () => {
    state.api.mockImplementation((path: string) =>
      Promise.resolve(
        path.includes('excludeStatus=open')
          ? page([task('done-1', '已完成的任务', 'completed')])
          : path.startsWith('tasks?')
            ? page([
                {
                  ...task('later-1', '下个月的待办', 'open'),
                  dueAt: '2099-01-05T01:00:00.000Z',
                },
              ])
            : { data: {} },
      ),
    );
    renderList();
    expect(await screen.findByText('下个月的待办')).toBeTruthy();
    expect(
      screen
        .getByRole('button', { name: /以后/ })
        .getAttribute('aria-expanded'),
    ).toBe('true');
    expect(
      screen
        .getByRole('button', { name: /已结束/ })
        .getAttribute('aria-expanded'),
    ).toBe('false');
  });

  it('completes a task through its outcome dialog and opens it again', async () => {
    renderList();
    await screen.findByText('我的待办');
    const boxes = screen.getAllByRole('checkbox', { name: '标记为已完成' });
    // Someone else's task is not the reader's to tick.
    expect(boxes[1].hasAttribute('data-disabled')).toBe(true);
    // Ticking asks what came of it, as the task page's Complete does.
    await userEvent.click(boxes[0]);
    const dialog = await screen.findByRole('dialog');
    expect(state.api).not.toHaveBeenCalledWith(
      'tasks/open-1',
      'PATCH',
      expect.anything(),
    );
    await userEvent.click(within(dialog).getByRole('button', { name: '完成' }));
    expect(state.api).toHaveBeenCalledWith(
      'tasks/open-1/recordOutcome',
      'POST',
      expect.objectContaining({ outcome: '' }),
    );
    await userEvent.click(screen.getByRole('button', { name: /已结束/ }));
    await userEvent.click(
      await screen.findByRole('checkbox', { name: '重新打开' }),
    );
    expect(state.api).toHaveBeenCalledWith('tasks/done-1', 'PATCH', {
      status: 'open',
    });
  });

  it('lists one status alone when the filters pick it', async () => {
    renderList('completed');
    await screen.findByText('我的待办');
    expect(screen.queryByRole('tab')).toBeNull();
    const paths = state.api.mock.calls.map(([path]) => String(path));
    expect(paths.every((p) => !p.includes('excludeStatus'))).toBe(true);
    expect(paths.some((p) => p.includes('status=completed'))).toBe(true);
  });
});
