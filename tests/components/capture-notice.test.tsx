import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import { crmEn } from '../../client/locales/crm/index.js';

// The notice atop a lead the AI organised: what the CRM may already hold,
// each record with why it is listed, and a merge only beside a lead of the
// same person.

const lookup = (key: string): unknown =>
  key
    .split('.')
    .reduce<unknown>(
      (value, part) =>
        value && typeof value === 'object'
          ? (value as Record<string, unknown>)[part]
          : undefined,
      crmEn,
    );

vi.mock('../../client/components/crm/api.js', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('../../client/components/crm/api.js')>();
  return {
    ...actual,
    useCrmText: () => ({
      text: (key: string, options: Record<string, unknown> = {}): string => {
        const value = lookup(key);
        return typeof value === 'string'
          ? value
          : toTextOr(options.defaultValue, key);
      },
      language: 'en-US',
    }),
  };
});

const toTextOr = (value: unknown, fallback: string): string =>
  typeof value === 'string' ? value : fallback;

const { CaptureNotice } =
  await import('../../client/components/crm/lead-capture.js');

describe('the capture notice', () => {
  it('names why each record is listed and offers a merge only for the same person', async () => {
    const user = userEvent.setup();
    const onMerge = vi.fn();
    render(
      <MemoryRouter>
        <CaptureNotice
          lead={{
            duplicates: [
              {
                entity: 'leads',
                id: 'same-person',
                name: 'Liang Zhiyuan / SF Express',
                matched: ['email', 'person'],
                mergeable: true,
              },
              {
                entity: 'leads',
                id: 'same-company',
                name: 'Jiang Yu / SF Express',
                matched: ['company'],
                mergeable: false,
              },
              {
                entity: 'companies',
                id: 'company',
                name: 'SF Express',
                matched: ['company'],
              },
            ],
          }}
          unfilled={[]}
          onMerge={onMerge}
        />
      </MemoryRouter>,
    );
    const notice = screen.getByText(crmEn.leadCapture.duplicates).closest('p');
    const text = notice?.textContent ?? '';
    expect(text).toContain(
      `Liang Zhiyuan / SF Express ${crmEn.leadCapture.samePerson}`,
    );
    expect(text).toContain(
      `Jiang Yu / SF Express ${crmEn.leadCapture.sameCompany}`,
    );
    // A company is listed as itself, with no reason beside it.
    expect(text).not.toMatch(/SF Express \(same company\)$/);
    // One merge, beside the same person.
    const merges = screen.getAllByRole('button', {
      name: crmEn.leadCapture.mergeInto,
    });
    expect(merges).toHaveLength(1);
    await user.click(merges[0]);
    expect(onMerge).toHaveBeenCalledWith('same-person');
  });
});
