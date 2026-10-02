import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { DateTimeInput } from '../../client/components/crm/datetime-input.js';
import { crmEn } from '../../client/locales/crm/index.js';

vi.mock('../../client/components/crm/api.js', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('../../client/components/crm/api.js')>();
  return {
    ...actual,
    useCrmText: () => ({
      text: (key: string): string =>
        (crmEn as Record<string, string>)[key] ?? key,
      language: 'en-US',
    }),
  };
});

// Instants built on the test machine's clock, which is what the editor shows.
const local = (...parts: [number, number, number, number, number]): string =>
  new Date(parts[0], parts[1] - 1, parts[2], parts[3], parts[4]).toISOString();

function Harness({
  initial,
  onChange,
}: {
  initial: string | null;
  onChange: (value: string | null) => void;
}) {
  const [value, setValue] = useState(initial);
  return (
    <DateTimeInput
      label='Start'
      value={value}
      onChange={(next) => {
        setValue(next);
        onChange(next);
      }}
    />
  );
}

describe('DateTimeInput', () => {
  it('shows a stored instant as yyyy-mm-dd HH:mm on a 24-hour clock', () => {
    render(<Harness initial={local(2026, 9, 24, 14, 30)} onChange={vi.fn()} />);
    expect(screen.getByLabelText('Start')).toHaveValue('2026-09-24 14:30');
  });

  it('saves typed text once it is a whole date and time', async () => {
    const onChange = vi.fn();
    render(<Harness initial={null} onChange={onChange} />);
    const input = screen.getByLabelText<HTMLInputElement>('Start');
    await userEvent.type(input, '2026-09-24 18:0');
    expect(onChange).not.toHaveBeenCalled();
    // Half-typed text blocks the form rather than submitting nothing.
    expect(input.validity.valid).toBe(false);
    expect(input).toHaveAttribute('aria-invalid', 'true');
    await userEvent.type(input, '5');
    expect(onChange).toHaveBeenLastCalledWith(local(2026, 9, 24, 18, 5));
    expect(input.validity.valid).toBe(true);
    expect(input).toHaveValue('2026-09-24 18:05');
  });

  it('refuses dates that do not exist', () => {
    const onChange = vi.fn();
    render(<Harness initial={null} onChange={onChange} />);
    const input = screen.getByLabelText<HTMLInputElement>('Start');
    fireEvent.change(input, { target: { value: '2026-02-30 10:00' } });
    fireEvent.change(input, { target: { value: '2026-09-24 24:00' } });
    expect(onChange).not.toHaveBeenCalled();
    expect(input.validity.valid).toBe(false);
  });

  it('clears to null', () => {
    const onChange = vi.fn();
    render(<Harness initial={local(2026, 9, 24, 9, 0)} onChange={onChange} />);
    fireEvent.change(screen.getByLabelText('Start'), { target: { value: '' } });
    expect(onChange).toHaveBeenLastCalledWith(null);
  });

  it('picks the hour from 00 to 23 and keeps the day', async () => {
    const onChange = vi.fn();
    render(<Harness initial={local(2026, 9, 24, 9, 15)} onChange={onChange} />);
    await userEvent.click(
      screen.getByRole('button', { name: crmEn.pickDateTime }),
    );
    const hours = await screen.findByRole('listbox', { name: crmEn.hour });
    const options = hours.querySelectorAll('[role="option"]');
    expect(options).toHaveLength(24);
    expect(options[0]).toHaveTextContent('00');
    expect(options[23]).toHaveTextContent('23');
    expect(
      screen.getByRole('listbox', { name: crmEn.minute }).children,
    ).toHaveLength(60);
    await userEvent.click(within(hours).getByRole('option', { name: '21' }));
    expect(onChange).toHaveBeenLastCalledWith(local(2026, 9, 24, 21, 15));
    expect(screen.getByLabelText('Start')).toHaveValue('2026-09-24 21:15');
  });
});
