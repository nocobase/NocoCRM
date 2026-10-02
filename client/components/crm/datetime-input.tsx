import { CalendarClock } from 'lucide-react';
import { enUS, zhCN } from 'react-day-picker/locale';
import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactElement,
} from 'react';
import { Calendar } from '../ui/calendar.js';
import { Input } from '../ui/input.js';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover.js';
import { useCrmText } from './api.js';

const pad = (n: number): string => String(n).padStart(2, '0');

// The editor speaks the same yyyy-mm-dd HH:mm, on a 24-hour clock, that every
// date with a time is displayed in. A native datetime-local control cannot do
// that: its format and its 12/24-hour clock follow the browser's locale.
// Times are entered on the laptop's clock, as the form's hint says.
function formatLocalDateTime(date: Date): string {
  return `${String(date.getFullYear())}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function parseLocalDateTime(value: string): Date | null {
  const match = /^(\d{4})-(\d{1,2})-(\d{1,2})[ T](\d{1,2}):(\d{2})$/.exec(
    value.trim(),
  );
  if (!match) return null;
  const [year, month, day, hour, minute] = match.slice(1).map(Number);
  const date = new Date(year, month - 1, day, hour, minute);
  // new Date rolls 2026-02-30 over into March; a real date reads back the same.
  return date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day &&
    date.getHours() === hour &&
    date.getMinutes() === minute
    ? date
    : null;
}

const toDate = (value: string | null | undefined): Date | null => {
  const date = value ? new Date(value) : null;
  return date && Number.isFinite(+date) ? date : null;
};

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = Array.from({ length: 60 }, (_, i) => i);

function TimeColumn({
  label,
  values,
  selected,
  open,
  onPick,
}: {
  label: string;
  values: number[];
  selected: number | undefined;
  open: boolean;
  onPick: (value: number) => void;
}): ReactElement {
  const listRef = useRef<HTMLDivElement>(null);
  // Opening scrolls the picked hour or minute to the middle of its column;
  // scrollIntoView would also scroll the dialog or page behind the popup.
  useEffect(() => {
    const list = listRef.current;
    const picked = list?.querySelector<HTMLElement>('[aria-selected="true"]');
    if (open && list && picked)
      list.scrollTop =
        picked.offsetTop - (list.clientHeight - picked.offsetHeight) / 2;
  }, [open, selected]);
  // The column is as tall as the calendar beside it and scrolls within that.
  return (
    <div className='relative w-12 border-l'>
      <div
        ref={listRef}
        role='listbox'
        aria-label={label}
        className='absolute inset-0 flex flex-col gap-0.5 overflow-y-auto p-1'
      >
        {values.map((value) => (
          <button
            key={value}
            type='button'
            role='option'
            aria-selected={value === selected}
            className={`shrink-0 rounded-md py-1 text-center text-sm tabular-nums transition-colors ${value === selected ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
            onClick={() => {
              onPick(value);
            }}
          >
            {pad(value)}
          </button>
        ))}
      </div>
    </div>
  );
}

export function DateTimeInput({
  id,
  label,
  value,
  autoFocus,
  required,
  disabled,
  onChange,
  onKeyDown,
  onOpenChange,
}: {
  id?: string;
  label: string;
  // The stored ISO instant, or empty.
  value: string | null | undefined;
  autoFocus?: boolean;
  required?: boolean;
  disabled?: boolean;
  // An ISO instant, or null once the text is cleared. Text that is not yet a
  // whole date and time changes nothing.
  onChange: (value: string | null) => void;
  onKeyDown?: (event: KeyboardEvent<HTMLInputElement>) => void;
  onOpenChange?: (open: boolean) => void;
}): ReactElement {
  const { text, language } = useCrmText();
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const current = toDate(value);
  const [draft, setDraft] = useState(() =>
    current ? formatLocalDateTime(current) : '',
  );
  // A value set from outside (the picker, a reset) replaces the text, unless
  // the text already says the same instant.
  const [shown, setShown] = useState(value);
  if (value !== shown) {
    setShown(value);
    const typed = parseLocalDateTime(draft);
    if (current ? +(typed ?? 0) !== +current : typed)
      setDraft(current ? formatLocalDateTime(current) : '');
  }
  const invalid = draft.trim() !== '' && !parseLocalDateTime(draft);
  // Half-typed text must not submit the form with the previous value.
  useEffect(() => {
    inputRef.current?.setCustomValidity(
      invalid ? text('dateTimeFormatInvalid') : '',
    );
  }, [invalid, text]);

  const pick = (date: Date): void => {
    date.setSeconds(0, 0);
    setDraft(formatLocalDateTime(date));
    onChange(date.toISOString());
  };
  // Picking a day keeps the chosen time; picking a time with no day yet
  // starts from today.
  const base = (): Date => {
    if (current) return new Date(current);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
  };
  const change = (next: boolean): void => {
    setOpen(next);
    onOpenChange?.(next);
  };

  return (
    <div className='relative'>
      <Input
        ref={inputRef}
        id={id}
        aria-label={label}
        aria-invalid={invalid || undefined}
        className='pr-9 tabular-nums'
        placeholder='yyyy-mm-dd HH:mm'
        inputMode='numeric'
        autoComplete='off'
        value={draft}
        autoFocus={autoFocus}
        required={required}
        disabled={disabled}
        onChange={(event) => {
          const typed = event.target.value;
          setDraft(typed);
          if (typed.trim() === '') onChange(null);
          else {
            const date = parseLocalDateTime(typed);
            if (date) onChange(date.toISOString());
          }
        }}
        onKeyDown={onKeyDown}
      />
      <Popover open={open} onOpenChange={change}>
        <PopoverTrigger
          type='button'
          disabled={disabled}
          aria-label={text('pickDateTime')}
          className='absolute inset-y-0 right-0 flex w-9 items-center justify-center rounded-r-lg text-muted-foreground hover:text-foreground disabled:opacity-50'
        >
          <CalendarClock className='size-4' />
        </PopoverTrigger>
        <PopoverContent
          align='end'
          className='w-auto flex-row gap-0 p-0'
          finalFocus={inputRef}
        >
          <Calendar
            mode='single'
            locale={language.startsWith('zh') ? zhCN : enUS}
            selected={current ?? undefined}
            defaultMonth={current ?? undefined}
            onSelect={(day) => {
              if (!day) return;
              const next = base();
              next.setFullYear(
                day.getFullYear(),
                day.getMonth(),
                day.getDate(),
              );
              pick(next);
            }}
          />
          <TimeColumn
            label={text('hour')}
            values={HOURS}
            selected={current?.getHours()}
            open={open}
            onPick={(hour) => {
              const next = base();
              next.setHours(hour);
              pick(next);
            }}
          />
          <TimeColumn
            label={text('minute')}
            values={MINUTES}
            selected={current?.getMinutes()}
            open={open}
            onPick={(minute) => {
              const next = base();
              next.setMinutes(minute);
              pick(next);
            }}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
