import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UploadZone } from '../../client/pages/crm-detail.js';
import { crmEn } from '../../client/locales/crm/index.js';

const state = vi.hoisted(() => ({
  api: vi.fn(),
  refresh: vi.fn(),
}));
vi.mock('../../client/components/crm/api.js', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('../../client/components/crm/api.js')>();
  return {
    ...actual,
    useCrmApi: () => state.api,
    useRefresh: () => state.refresh,
    useCrmText: () => ({
      text: (key: string): string => {
        const value = key
          .split('.')
          .reduce<unknown>(
            (node, part) => (node as Record<string, unknown>)?.[part],
            crmEn,
          );
        return typeof value === 'string' ? value : key;
      },
      language: 'en-US',
    }),
  };
});

const file = (name: string): File =>
  new File(['name,amount\nA,1\n'], name, { type: 'text/csv' });

function renderZone(busy = false) {
  const setBusy = vi.fn();
  const onError = vi.fn();
  render(
    <UploadZone
      entity='leads'
      record={{ id: 'lead-1', attachments: ['old-file'] }}
      busy={busy}
      setBusy={setBusy}
      onError={onError}
    />,
  );
  return { setBusy, onError, zone: screen.getByRole('button') };
}

beforeEach(() => {
  state.api.mockReset();
  state.refresh.mockReset();
  state.api.mockImplementation(async (path: string) =>
    path.startsWith('files') ? { data: [{ id: 'new-file' }] } : true,
  );
});

describe('UploadZone', () => {
  it('uploads dropped files and appends them to the record', async () => {
    const { setBusy, zone } = renderZone();
    fireEvent.drop(zone, { dataTransfer: { files: [file('a.csv')] } });
    await waitFor(() => expect(state.refresh).toHaveBeenCalled());
    const [upload, patch] = state.api.mock.calls;
    expect(upload[0]).toBe('files?entity=leads');
    expect(upload[1]).toBe('POST');
    expect(upload[2]).toBeInstanceOf(FormData);
    expect((upload[2] as FormData).getAll('file')).toHaveLength(1);
    expect(patch).toEqual([
      'leads/lead-1',
      'PATCH',
      { attachments: ['old-file', 'new-file'] },
    ]);
    expect(setBusy.mock.calls).toEqual([[true], [false]]);
  });

  it('highlights while a drag is over it and clears on leave', () => {
    const { zone } = renderZone();
    fireEvent.dragEnter(zone, { dataTransfer: { files: [] } });
    expect(zone.className).toContain('border-primary');
    fireEvent.dragLeave(zone);
    expect(zone.className).not.toContain('border-primary ');
  });

  it('uploads files picked through the hidden input', async () => {
    const { zone } = renderZone();
    const input = zone.querySelector('input[type=file]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [file('b.csv')] } });
    await waitFor(() => expect(state.refresh).toHaveBeenCalled());
    expect(state.api.mock.calls[1][2]).toEqual({
      attachments: ['old-file', 'new-file'],
    });
  });

  it('reports a failed upload and does not touch the record', async () => {
    state.api.mockRejectedValueOnce(new Error('nope'));
    const { onError, zone } = renderZone();
    fireEvent.drop(zone, { dataTransfer: { files: [file('c.csv')] } });
    await waitFor(() => expect(onError).toHaveBeenCalled());
    expect(state.api).toHaveBeenCalledTimes(1);
    expect(state.refresh).not.toHaveBeenCalled();
  });

  it('ignores drops while an upload is in flight', () => {
    const { zone } = renderZone(true);
    fireEvent.drop(zone, { dataTransfer: { files: [file('d.csv')] } });
    expect(state.api).not.toHaveBeenCalled();
    expect(zone).toHaveAttribute('aria-disabled', 'true');
  });
});
