import { useInfiniteQuery } from '@tanstack/react-query';
import { Check, ChevronsUpDown, Search, X } from 'lucide-react';
import { useEffect, useState, type ReactElement } from 'react';
import { Button } from '../ui/button.js';
import { Input } from '../ui/input.js';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover.js';
import {
  PAGE_SIZE,
  toText,
  useCrmApi,
  useCrmScopeKey,
  useCrmText,
  useRecord,
  type CrmRecord,
  type Entity,
  type ListData,
} from './api.js';
import { recordTitle } from './lookups.js';

// Picking a record by searching for it, one page of matches at a time, so a
// form never has to load every account or contact there is. The search goes
// through the list endpoint with the same filters the pages use (an
// activity's participants come from its account, a deal's contacts too).
interface SearchProps {
  entity: Entity;
  filter?: Record<string, string | undefined>;
  // A status not offered (converted leads) unless it is the current pick.
  excludeStatus?: string;
}

function useRecordSearch(
  { entity, filter = {}, excludeStatus }: SearchProps,
  search: string,
  enabled: boolean,
) {
  const api = useCrmApi();
  const scopeKey = useCrmScopeKey();
  const params = new URLSearchParams({ pageSize: String(PAGE_SIZE) });
  if (search) params.set('search', search);
  if (excludeStatus) params.set('excludeStatus', excludeStatus);
  for (const [key, value] of Object.entries(filter))
    if (value) params.set(key, value);
  const base = params.toString();
  return useInfiniteQuery({
    queryKey: [...scopeKey, `${toText(entity)}/picker`, base],
    queryFn: ({ pageParam }) =>
      api<ListData>(`${toText(entity)}?${base}&page=${toText(pageParam)}`),
    initialPageParam: 1,
    getNextPageParam: (last) =>
      last.page * last.pageSize < last.total ? last.page + 1 : undefined,
    enabled,
    staleTime: 20000,
  });
}

function useDebounced(value: string, delay = 250): string {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

function ResultList({
  entity,
  search,
  setSearch,
  enabled,
  filter,
  excludeStatus,
  isPicked,
  onPick,
  bare = false,
}: SearchProps & {
  search: string;
  setSearch: (v: string) => void;
  enabled: boolean;
  isPicked: (id: string) => boolean;
  onPick: (record: CrmRecord, titles: Record<string, string>) => void;
  // Bare names: the list is already scoped to one account.
  bare?: boolean;
}): ReactElement {
  const { text } = useCrmText();
  const debounced = useDebounced(search);
  const query = useRecordSearch(
    { entity, filter, excludeStatus },
    debounced,
    enabled,
  );
  const pages = query.data?.pages ?? [];
  const total = pages[0]?.total ?? 0;
  return (
    <div className='flex max-h-80 w-72 flex-col'>
      <div className='relative border-b p-2'>
        <Search className='pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-muted-foreground' />
        <Input
          autoFocus
          value={search}
          placeholder={text('searchRecords')}
          aria-label={text('searchRecords')}
          className='pl-8'
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      <ul role='listbox' className='min-h-0 flex-1 overflow-y-auto p-1'>
        {pages.flatMap((page) =>
          page.data.map((record) => {
            const picked = isPicked(toText(record.id));
            return (
              <li key={record.id}>
                <button
                  type='button'
                  role='option'
                  aria-selected={picked}
                  className='flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent hover:text-accent-foreground'
                  onClick={() => onPick(record, page.titles)}
                >
                  <Check
                    className={`size-4 shrink-0 ${picked ? '' : 'invisible'}`}
                  />
                  <span className='min-w-0 truncate'>
                    {bare
                      ? toText(record.name)
                      : recordTitle(entity, record, page.titles)}
                  </span>
                </button>
              </li>
            );
          }),
        )}
        {query.isLoading ? (
          <li className='px-2 py-1.5 text-sm text-muted-foreground'>
            {text('loading')}
          </li>
        ) : !total ? (
          <li className='px-2 py-1.5 text-sm text-muted-foreground'>
            {text('noMatches')}
          </li>
        ) : null}
        {query.hasNextPage && (
          <li className='p-1'>
            <Button
              type='button'
              variant='ghost'
              size='sm'
              className='w-full'
              disabled={query.isFetchingNextPage}
              onClick={() => void query.fetchNextPage()}
            >
              {text('loadMore')} ·{' '}
              {total - pages.reduce((n, p) => n + p.data.length, 0)}
            </Button>
          </li>
        )}
      </ul>
    </div>
  );
}

export function RecordPicker({
  entity,
  value,
  onChange,
  label,
  titles = {},
  filter,
  excludeStatus,
  disabled,
  variant = 'default',
  onOpenChange,
  bare = false,
}: SearchProps & {
  value: string;
  // The picked record comes along, for a caller that wants its fields.
  onChange: (id: string, record?: CrmRecord) => void;
  label: string;
  // Names already resolved by the page, so the current pick shows at once.
  titles?: Record<string, string>;
  disabled?: boolean;
  // Bare names: the search is already scoped to one account.
  bare?: boolean;
  // "inline": the quiet trigger of a pick inside a list row.
  variant?: 'default' | 'inline';
  onOpenChange?: (open: boolean) => void;
}): ReactElement {
  const { text } = useCrmText();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [known, setKnown] = useState<Record<string, string>>({});
  // The current value may be a record no page has named yet (a form opened
  // with a preset id): one light read names it.
  const current = useRecord(
    titles[value] || known[value] ? undefined : entity,
    value,
  );
  const shown =
    titles[value] ??
    known[value] ??
    (current.data?.record
      ? bare
        ? toText(current.data.record.name)
        : recordTitle(entity, current.data.record, current.data.titles)
      : value
        ? text('loading')
        : '');
  const change = (next: boolean): void => {
    setOpen(next);
    if (!next) setSearch('');
    onOpenChange?.(next);
  };
  return (
    <Popover open={open} onOpenChange={change}>
      <PopoverTrigger
        disabled={disabled}
        role='combobox'
        aria-expanded={open}
        aria-label={label}
        className={
          variant === 'inline'
            ? 'flex h-7 w-full min-w-0 items-center justify-between gap-2 rounded-md border border-transparent bg-transparent px-2 text-xs hover:border-border hover:bg-muted disabled:opacity-50'
            : 'flex h-8 w-full min-w-32 items-center justify-between gap-2 rounded-md border border-input bg-background px-3 text-sm shadow-xs hover:bg-muted/50 disabled:cursor-not-allowed disabled:opacity-50'
        }
      >
        <span
          className={`min-w-0 truncate ${shown ? '' : 'text-muted-foreground'}`}
        >
          {shown || text('choose')}
        </span>
        <ChevronsUpDown className='size-4 shrink-0 opacity-50' />
      </PopoverTrigger>
      <PopoverContent align='start' className='w-auto p-0'>
        <ResultList
          entity={entity}
          filter={filter}
          excludeStatus={excludeStatus}
          search={search}
          setSearch={setSearch}
          enabled={open}
          bare={bare}
          isPicked={(id) => id === value}
          onPick={(record, pageTitles) => {
            const id = toText(record.id);
            setKnown((k) => ({
              ...k,
              [id]: bare
                ? toText(record.name)
                : recordTitle(entity, record, pageTitles),
            }));
            onChange(id === value ? '' : id, id === value ? undefined : record);
            change(false);
          }}
        />
        {value ? (
          <div className='border-t p-1'>
            <Button
              type='button'
              variant='ghost'
              size='sm'
              className='w-full justify-start text-muted-foreground'
              onClick={() => {
                onChange('');
                change(false);
              }}
            >
              <X className='size-4' />
              {text('clearChoice')}
            </Button>
          </div>
        ) : null}
      </PopoverContent>
    </Popover>
  );
}

// Several records from one scope (the contacts of an account): the trigger
// lists what is chosen by bare name, the popup ticks items on and off and
// stays open between picks.
export function RecordMultiPicker({
  entity,
  value,
  onChange,
  label,
  names = {},
  filter,
  disabled,
  onOpenChange,
}: SearchProps & {
  value: string[];
  onChange: (ids: string[]) => void;
  label: string;
  names?: Record<string, string>;
  disabled?: boolean;
  onOpenChange?: (open: boolean) => void;
}): ReactElement {
  const { text } = useCrmText();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [known, setKnown] = useState<Record<string, string>>({});
  const nameOf = (id: string): string => names[id] ?? known[id] ?? id;
  const change = (next: boolean): void => {
    setOpen(next);
    if (!next) setSearch('');
    onOpenChange?.(next);
  };
  return (
    <Popover open={open} onOpenChange={change}>
      <PopoverTrigger
        disabled={disabled}
        role='combobox'
        aria-expanded={open}
        aria-label={label}
        className='flex min-h-8 w-full min-w-32 items-center justify-between gap-2 rounded-md border border-input bg-background px-3 py-1 text-left text-sm shadow-xs hover:bg-muted/50 disabled:cursor-not-allowed disabled:opacity-50'
      >
        <span
          className={`min-w-0 whitespace-normal ${value.length ? '' : 'text-muted-foreground'}`}
        >
          {value.length ? value.map(nameOf).join('、') : text('choose')}
        </span>
        <ChevronsUpDown className='size-4 shrink-0 opacity-50' />
      </PopoverTrigger>
      <PopoverContent align='start' className='w-auto p-0'>
        <ResultList
          entity={entity}
          filter={filter}
          search={search}
          setSearch={setSearch}
          enabled={open}
          bare
          isPicked={(id) => value.includes(id)}
          onPick={(record) => {
            const id = toText(record.id);
            setKnown((k) => ({ ...k, [id]: toText(record.name) }));
            onChange(
              value.includes(id)
                ? value.filter((v) => v !== id)
                : [...value, id],
            );
          }}
        />
      </PopoverContent>
    </Popover>
  );
}
