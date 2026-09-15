import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RecordForm } from '../../client/components/crm/form.js';
import {
  definitions,
  defaultSettings,
} from '../../server/providers/crm/schema.js';
import { crmEn, crmZh } from '../../client/locales/crm.js';
import { csvCell, parseCsv } from '../../client/components/crm/csv.js';
const state = vi.hoisted(() => ({
  api: vi.fn(),
  refresh: vi.fn(),
  locale: 'en',
}));
vi.mock('../../client/components/crm/api.js', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('../../client/components/crm/api.js')>();
  return {
    ...actual,
    useCrmApi: () => state.api,
    useRefresh: () => state.refresh,
    useCrmQuery: () => ({
      data: { subdivisions: [{ value: 'CN-11', label: 'Beijing' }] },
    }),
    useCrmText: () => ({
      text: (key: string): string => {
        const value = key
          .split('.')
          .reduce<unknown>(
            (node, part) => (node as Record<string, unknown>)?.[part],
            state.locale === 'zh' ? crmZh : crmEn,
          );
        return typeof value === 'string' ? value : key;
      },
      language: state.locale === 'zh' ? 'zh-CN' : 'en-US',
    }),
    useMetadata: () => ({
      data: {
        userId: 'rep',
        assign: false,
        settings: defaultSettings,
        definitions,
        users: [
          {
            id: 'rep',
            name: 'Representative',
            roles: ['sales-representative'],
            disabled: false,
            canApprove: false,
          },
        ],
        permissions: Object.fromEntries(
          Object.keys(definitions).map((entity) => [
            entity,
            { create: { fields: '*' }, update: { fields: '*' } },
          ]),
        ),
      },
    }),
  };
});
vi.mock('../../client/components/crm/lookups.js', async (importOriginal) => ({
  // Only the data hook is stubbed; the pure title helpers stay real.
  ...(await importOriginal<
    typeof import('../../client/components/crm/lookups.js')
  >()),
  useLookups: () => ({
    leads: [{ id: 'lead-a', name: 'Lead A' }],
    accounts: [{ id: 'account-a', name: 'Account A' }],
    contacts: [],
    opportunities: [],
    activities: [],
    approvals: [],
  }),
}));
vi.mock('../../client/components/crm/common.js', () => ({
  Loading: () => null,
  ErrorNotice: ({ error }: { error?: unknown }) =>
    error ? <p role='alert'>Could not save</p> : null,
}));
beforeEach(() => {
  state.api.mockReset();
  state.refresh.mockReset();
  state.locale = 'en';
});
describe('CRM forms and file interchange', () => {
  it('saves a lead, refreshes lists and closes', async () => {
    const onClose = vi.fn();
    const onSaved = vi.fn();
    state.api.mockResolvedValue({ data: { id: 'saved', name: 'Ada' } });
    render(<RecordForm entity='leads' onClose={onClose} onSaved={onSaved} />);
    await userEvent.type(screen.getByLabelText('Name'), 'Ada');
    // Source has no default: saving without one is refused on the client.
    await userEvent.click(
      screen.getByRole('button', { name: 'Save', exact: true }),
    );
    expect(state.api).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('combobox', { name: 'Source' }));
    await userEvent.click(await screen.findByRole('option', { name: 'Website' }));
    await userEvent.click(
      screen.getByRole('button', { name: 'Save', exact: true }),
    );
    await waitFor(() =>
      expect(state.api).toHaveBeenCalledWith(
        'leads',
        'POST',
        expect.objectContaining({
          name: 'Ada',
          ownerId: 'rep',
          status: 'new',
          source: 'website',
        }),
      ),
    );
    expect(state.refresh).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
    expect(onSaved).toHaveBeenCalledWith({ id: 'saved', name: 'Ada' });
  });
  it('keeps a lead activity linked and hides account and external participants', () => {
    render(
      <RecordForm
        entity='activities'
        initial={{ leadId: 'lead-a' }}
        onClose={vi.fn()}
      />,
    );
    expect(screen.getByRole('combobox', { name: 'Lead' })).toBeDisabled();
    expect(
      screen.queryByRole('combobox', { name: 'Account' }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText('External participants')).not.toBeInTheDocument();
  });
  it('renders Chinese labels and keeps a failed submission editable', async () => {
    state.locale = 'zh';
    state.api.mockRejectedValue(new Error('failed'));
    const onClose = vi.fn();
    render(<RecordForm entity='leads' onClose={onClose} />);
    fireEvent.change(screen.getByLabelText('名称'), {
      target: { value: '新线索' },
    });
    await userEvent.click(
      screen.getByRole('button', { name: '保存', exact: true }),
    );
    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent('Could not save'),
    );
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByLabelText('名称')).toHaveValue('新线索');
  });
  it('preserves CSV text and neutralizes spreadsheet formulas', () => {
    const values = [
      'Jane, Doe',
      'A "quoted" company',
      'Line one\nLine two',
      '中文',
    ];
    expect(
      parseCsv('\uFEFF' + values.map(csvCell).join(',') + '\r\n')[0],
    ).toEqual(values);
    expect(csvCell('=HYPERLINK("bad")')).toMatch(/^"'/);
    expect(() => parseCsv('"unfinished')).toThrow('invalidCsv');
  });
});
