import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RecordForm } from '../../client/components/crm/form.js';
import {
  definitions,
  defaultSettings,
} from '../../server/providers/crm/schema.js';
import { crmEn, crmZh } from '../../client/locales/crm/index.js';
import { csvCell, parseCsv } from '../../client/components/crm/csv.js';
const state = vi.hoisted(() => ({
  api: vi.fn(),
  refresh: vi.fn(),
  locale: 'en',
  assistant: false,
}));
vi.mock('../../client/components/crm/api.js', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('../../client/components/crm/api.js')>();
  return {
    ...actual,
    useCrmApi: () => state.api,
    useRefresh: () => state.refresh,
    // A picker names its preset value through one record read.
    useRecord: (entity: string, id: unknown) => ({
      data:
        entity && id
          ? {
              record: { id, name: id === 'lead-a' ? 'Lead A' : String(id) },
              titles: {},
              names: {},
            }
          : undefined,
    }),
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
        assistant: state.assistant,
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
vi.mock('../../client/components/crm/common.js', () => ({
  Loading: () => null,
  ErrorNotice: ({ error }: { error?: unknown }) =>
    error ? <p role='alert'>Could not save</p> : null,
}));
beforeEach(() => {
  state.api.mockReset();
  state.refresh.mockReset();
  state.locale = 'en';
  state.assistant = false;
});
describe('CRM forms and file interchange', () => {
  it('lets the AI follow a new lead up at once, unless unticked', async () => {
    state.assistant = true;
    state.api.mockResolvedValue({ data: { id: 'saved', name: 'Ada' } });
    render(<RecordForm entity='leads' onClose={vi.fn()} />);
    const option = screen.getByRole('checkbox', {
      name: 'AI follows up at once',
    });
    expect(option).toBeChecked();
    await userEvent.click(option);
    await userEvent.type(screen.getByLabelText('Name'), 'Ada');
    await userEvent.click(screen.getByRole('combobox', { name: 'Source' }));
    await userEvent.click(
      await screen.findByRole('option', { name: 'Website' }),
    );
    await userEvent.click(
      screen.getByRole('button', { name: 'Save', exact: true }),
    );
    await waitFor(() =>
      expect(state.api).toHaveBeenCalledWith(
        'leads?followUp=0',
        'POST',
        expect.objectContaining({ name: 'Ada' }),
      ),
    );
  });

  it('offers no follow-up while the AI is off', () => {
    render(<RecordForm entity='leads' onClose={vi.fn()} />);
    expect(
      screen.queryByRole('checkbox', { name: 'AI follows up at once' }),
    ).toBeNull();
  });

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
    await userEvent.click(
      await screen.findByRole('option', { name: 'Website' }),
    );
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
          source: 'website',
        }),
      ),
    );
    // A new lead is new; the server sets that, the form does not ask.
    expect(state.api.mock.calls[0][2]).not.toHaveProperty('status');
    expect(
      screen.queryByRole('combobox', { name: 'Status' }),
    ).not.toBeInTheDocument();
    expect(state.refresh).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
    expect(onSaved).toHaveBeenCalledWith({ id: 'saved', name: 'Ada' });
  });
  it("asks an opportunity's amount as one field, its currency leading the number", () => {
    render(<RecordForm entity='opportunities' onClose={vi.fn()} />);
    const amount = screen.getByLabelText('Amount');
    const currency = screen.getByRole('combobox', { name: 'Currency' });
    // One label, Amount; the currency sits in the same block, before it.
    expect(
      screen.queryByText('Currency', { selector: 'label span' }),
    ).toBeNull();
    const block = amount.closest('.space-y-1\\.5') as HTMLElement;
    expect(block.contains(currency)).toBe(true);
    expect(
      currency.compareDocumentPosition(amount) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
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
  it('edits an activity time as yyyy-mm-dd HH:mm, not a locale clock', () => {
    state.locale = 'en';
    const startAt = new Date(2026, 8, 24, 14, 30).toISOString();
    render(
      <RecordForm
        entity='activities'
        initial={{ startAt }}
        onClose={vi.fn()}
      />,
    );
    const start = screen.getByLabelText('Start time');
    // A native datetime-local control would show 02:30 PM in English.
    expect(start).not.toHaveAttribute('type', 'datetime-local');
    expect(start).toHaveValue('2026-09-24 14:30');
    expect(screen.getByLabelText('End time')).toHaveAttribute(
      'placeholder',
      'yyyy-mm-dd HH:mm',
    );
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
  it('opens a lead the AI captured prefilled, marking its doubts', async () => {
    state.api.mockResolvedValue({ data: { id: 'captured' } });
    render(
      <RecordForm
        entity='leads'
        initial={{ name: 'Zhou Li', source: 'exhibition' }}
        review={['name']}
        notice={<p>Filled in by the AI</p>}
        onClose={vi.fn()}
      />,
    );
    expect(screen.getByText('Filled in by the AI')).toBeInTheDocument();
    expect(screen.getByLabelText('Name')).toHaveValue('Zhou Li');
    // The doubt sits beside its field.
    expect(screen.getAllByText('Check')).toHaveLength(1);
    await userEvent.click(
      screen.getByRole('button', { name: 'Save', exact: true }),
    );
    await waitFor(() =>
      expect(state.api).toHaveBeenCalledWith(
        'leads',
        'POST',
        expect.objectContaining({ name: 'Zhou Li', source: 'exhibition' }),
      ),
    );
  });
  it('tells an AI-filled form which required fields are still empty', async () => {
    render(
      <RecordForm
        entity='leads'
        initial={{ name: 'Wang Lei' }}
        review={[]}
        notice={(unfilled) => <p>Still needed: {unfilled.join(', ')}</p>}
        onClose={vi.fn()}
      />,
    );
    // The owner defaults to the reader; the source is the one left empty.
    expect(screen.getByText('Still needed: source')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('combobox', { name: 'Source' }));
    await userEvent.click(
      await screen.findByRole('option', { name: 'Website' }),
    );
    expect(screen.getByText('Still needed:')).toBeInTheDocument();
  });
  it('opens a new lead with the main fields, the rest behind More', async () => {
    render(
      <RecordForm
        entity='leads'
        initial={{ city: 'Hangzhou' }}
        onClose={vi.fn()}
      />,
    );
    // A field with a value stays out; an empty one waits behind More.
    expect(screen.getByLabelText('City')).toHaveValue('Hangzhou');
    expect(screen.queryByLabelText('Website')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /^More:/ }));
    expect(screen.getByLabelText('Website')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Fewer fields' }));
    expect(screen.queryByLabelText('Website')).not.toBeInTheDocument();
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
