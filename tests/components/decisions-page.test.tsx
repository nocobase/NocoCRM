import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactElement } from 'react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  definitions,
  defaultSettings,
} from '../../server/providers/crm/schema.js';
import { crmZh } from '../../client/locales/crm/index.js';

// Waiting on me: the entry being read is in the address, and on a phone the
// list and the entry take turns, with a way back to the list.

const state = vi.hoisted(() => ({ api: vi.fn() }));

vi.mock('@nocobase/i18n/client', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
vi.mock('../../client/components/crm/lead-evaluation.js', () => ({
  VerdictBadge: () => null,
  VerdictPanel: ({ entry }: { entry: { id: string } }) => (
    <p>panel {entry.id}</p>
  ),
}));
vi.mock('../../client/components/crm/approval-review.js', () => ({
  ReviewPanel: () => null,
}));
vi.mock('../../client/components/crm/api.js', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('../../client/components/crm/api.js')>();
  const metadata = {
    userId: 'rep',
    assistant: true,
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

const { default: DecisionsPage } =
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

function renderPage(narrow: boolean, path = '/crm/decisions'): void {
  window.matchMedia = ((query: string) => ({
    matches: !narrow,
    media: query,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  })) as unknown as typeof window.matchMedia;
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/crm', path]} initialIndex={1}>
        <Routes>
          <Route
            path='/crm/decisions'
            element={
              <>
                <DecisionsPage />
                <Where />
              </>
            }
          />
          <Route path='/crm' element={<Where />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  state.api.mockReset();
  state.api.mockResolvedValue({
    data: [entry('e1', '周晓'), entry('e2', '林悦', 'accepted')],
    total: 2,
    pending: 1,
  });
});

describe('Waiting on me', () => {
  it('opens an entry from the list on a phone, and goes back to the list', async () => {
    renderPage(true);
    await userEvent.click(await screen.findByText('林悦'));
    expect(screen.getByTestId('where').textContent).toBe(
      '/crm/decisions?entry=e2',
    );
    expect(screen.getByText('panel e2')).toBeTruthy();
    await userEvent.click(
      screen.getByRole('button', { name: /navigation.back/ }),
    );
    // Opened from the list, Back steps back to it.
    expect(screen.getByTestId('where').textContent).toBe('/crm/decisions');
  });

  it('opens the entry the address names', async () => {
    renderPage(true, '/crm/decisions?entry=e2');
    expect(await screen.findByText('panel e2')).toBeTruthy();
  });

  it('leaves a linked entry for the list without leaving the page', async () => {
    renderPage(true, '/crm/decisions?entry=e2');
    await userEvent.click(
      await screen.findByRole('button', { name: /navigation.back/ }),
    );
    // Not opened from the list here: back to it, not to the page before.
    expect(screen.getByTestId('where').textContent).toBe('/crm/decisions');
  });

  it('marks the pick in the address on a wide screen too', async () => {
    renderPage(false);
    expect(await screen.findByText('panel e1')).toBeTruthy();
    await userEvent.click(screen.getByText('林悦'));
    expect(screen.getByTestId('where').textContent).toBe(
      '/crm/decisions?entry=e2',
    );
  });
});
