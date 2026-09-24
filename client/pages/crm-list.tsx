import {
  PAGE_SIZE,
  useCrmScopeKey,
  useRefresh,
} from '../components/crm/api.js';
import { recordTitle } from '../components/crm/lookups.js';
import { editsAll, fieldLabelKey, toText } from '../components/crm/api.js';
import { useEffect, useState, type ReactElement } from 'react';
import { useLocation } from 'react-router';
import {
  useInfiniteQuery,
  useQuery,
  useQueryClient,
  type InfiniteData,
} from '@tanstack/react-query';
import {
  Plus,
  Search,
  Download,
  Upload,
  LayoutList,
  Columns3,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  X,
  Sparkles,
  User,
  Megaphone,
  Factory,
  CalendarClock,
  Clock,
  History,
} from 'lucide-react';
import { Button } from '../components/ui/button.js';
import { KindTag } from '../components/crm/kind-tag.js';
import { Badge } from '../components/ui/badge.js';
import { Input } from '../components/ui/input.js';
import { Card, CardContent } from '../components/ui/card.js';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table.js';
import {
  useCrmApi,
  useCrmText,
  useMetadata,
  type Entity,
  type CrmRecord,
  type ListData,
  type Data,
  useCrmQuery,
  money,
} from '../components/crm/api.js';
import {
  CrmFrame,
  ErrorNotice,
  Loading,
  Empty,
  RecordLink,
  Status,
  Value,
} from '../components/crm/common.js';
import { Choice, RecordForm } from '../components/crm/form.js';
import { ReasonDialog } from '../components/crm/reasons.js';
import { reasonFor } from '../components/crm/reason-rules.js';
import { ImportDialog } from '../components/crm/import-export.js';
import { downloadCsv } from '../components/crm/csv.js';
import { SortableHead } from '../components/crm/sortable-table.js';

// A calendar cell lists this many before asking to show the rest.
const CALENDAR_DAY_LIMIT = 5;

// "2026-09" ± n months, staying in the yyyy-mm shape the calendar keys on.
function shiftMonth(month: string, by: number): string {
  const d = new Date(
    Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5)) - 1 + by, 1),
  );
  return d.toISOString().slice(0, 7);
}

export default function CrmListPage(): ReactElement {
  const location = useLocation();
  // The segment after /crm: on the way to a record page or the action
  // centre this component can render once more with the new location, and
  // the last segment would then be an id or "actions".
  const entity = location.pathname.split('/').filter(Boolean)[1] as Entity;
  // "?metric=stale" opens the list already filtered by that card;
  // "?status=pending" with that status filter applied.
  const params = new URLSearchParams(location.search);
  const initialMetric = params.get('metric') ?? undefined;
  const initialStatus = params.get('status') ?? undefined;
  return (
    <EntityList
      key={entity}
      entity={entity}
      initialMetric={initialMetric}
      initialStatus={initialStatus}
    />
  );
}
function EntityList({
  entity,
  initialMetric,
  initialStatus,
}: {
  entity: Entity;
  initialMetric?: string;
  initialStatus?: string;
}): ReactElement {
  const { text, language } = useCrmText();
  const { data: meta, error: metadataError } = useMetadata();
  const api = useCrmApi();
  const scopeKey = useCrmScopeKey();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState(initialStatus ?? '');
  const [ownerId, setOwnerId] = useState('');
  const [source, setSource] = useState('');
  const [employed, setEmployed] = useState('');
  const [topic, setTopic] = useState('');
  // Activities only: everyone's, the ones I own, the ones I take part in.
  const [scope, setScope] = useState<'all' | 'mine' | 'participating'>('all');
  const [approverId, setApproverId] = useState('');
  // Leads and opportunities are worked as funnels, so they open on the
  // board; activities are read by date, so they open on the calendar; the
  // rest open on the list.
  const [view, setView] = useState(
    ['leads', 'opportunities'].includes(entity)
      ? 'board'
      : entity === 'activities'
        ? 'calendar'
        : 'list',
  );
  const [page, setPage] = useState(1);
  // The column the list is sorted by, from a header click; unset, the server
  // lists the newest first.
  const [sort, setSort] = useState<{
    key: string;
    direction: 'asc' | 'desc';
  }>();
  const [filtersOpen, setFiltersOpen] = useState(false);
  // A statistic card clicked into a filter: the key names the chip, the ids
  // are what the server restricts the list to.
  // A metric filter: undefined until the reader touches it, null once
  // cleared, so a workspace card's opening filter applies until dismissed.
  const [metric, setMetric] = useState<{ key: string; ids: string[] } | null>();
  // Unfiltered on purpose: the title shows how many leads exist, not how
  // many match the current filters. One row is enough to learn the total.
  const totals = useQuery({
    queryKey: [...scopeKey, `${toText(entity)}?pageSize=1`],
    queryFn: () => api<ListData>(`${toText(entity)}?pageSize=1`),
  });
  // A workspace card opens the list already filtered to its members: the
  // statistics endpoint names them, once, when the page opens with a metric.
  const initialMembers = useCrmQuery<{ members?: Record<string, string[]> }>(
    `${toText(entity)}/statistics?`,
    Boolean(initialMetric),
  );
  const initialIds = initialMetric
    ? initialMembers.data?.members?.[initialMetric]
    : undefined;
  const activeMetric =
    metric === undefined
      ? initialMetric && initialIds
        ? { key: initialMetric, ids: initialIds }
        : undefined
      : (metric ?? undefined);
  const filtering = Boolean(
    search || status || ownerId || source || employed || topic || approverId,
  );
  const [month, setMonth] = useState(() =>
    new Date().toISOString().slice(0, 7),
  );
  // Days the reader has opened past the calendar's per-day cap.
  const [expandedDays, setExpandedDays] = useState<Set<string>>(
    () => new Set(),
  );
  // Today's date in the business timezone, the key the calendar cells use.
  // Read once on mount: a page open across midnight is rare enough.
  const [now] = useState(() => new Date());
  const today = new Intl.DateTimeFormat('en-CA', {
    timeZone: meta?.settings.timeZone ?? 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
  const [form, setForm] = useState<{ id?: string; input: Data }>();
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<unknown>();
  const refresh = useRefresh();
  // A card dropped on a closing status waits here until its reason is given;
  // the server refuses the status without one, and rightly so.
  const [invalidating, setInvalidating] = useState<{
    record: CrmRecord;
    stage: string;
  }>();
  const [moving, setMoving] = useState(false);
  // The card being dragged, dimmed in its column while it is in the air.
  const [dragging, setDragging] = useState<string>();
  // The card that just landed in a column, marked for a moment so the eye
  // finds it among the others; the mark clears on its own.
  const [landed, setLanded] = useState<string>();
  useEffect(() => {
    if (!landed) return;
    const timer = setTimeout(() => setLanded(undefined), 2000);
    return () => clearTimeout(timer);
  }, [landed]);
  useEffect(() => {
    const done = (): void => setDragging(undefined);
    window.addEventListener('dragend', done);
    window.addEventListener('drop', done);
    return () => {
      window.removeEventListener('dragend', done);
      window.removeEventListener('drop', done);
    };
  }, []);
  const client = useQueryClient();
  const definition = meta?.definitions[entity];
  // A drop moves the card between the two columns' cached pages at once,
  // so it lands where it was dropped before the server has answered; the
  // refresh afterwards makes the columns exact, and a failure reloads them.
  const moveInCache = (record: CrmRecord, stage: string): void => {
    const statusField = definition?.statusField;
    if (!statusField) return;
    const prefix = [...scopeKey, `${toText(entity)}/board`];
    const columns = client.getQueriesData<InfiniteData<ListData>>({
      queryKey: prefix,
    });
    const from = toText(record[statusField]);
    const full =
      columns
        .flatMap(([, data]) => data?.pages.flatMap((p) => p.data) ?? [])
        .find((r) => r.id === record.id) ?? record;
    for (const [queryKey, data] of columns) {
      if (!data) continue;
      const column = toText(queryKey[prefix.length]);
      if (column === from)
        client.setQueryData<InfiniteData<ListData>>(queryKey, {
          ...data,
          pages: data.pages.map((p) => ({
            ...p,
            data: p.data.filter((r) => r.id !== record.id),
            total: Math.max(0, p.total - 1),
          })),
        });
      else if (column === stage)
        client.setQueryData<InfiniteData<ListData>>(queryKey, {
          ...data,
          pages: data.pages.map((p, i) => ({
            ...p,
            data:
              i === 0 ? [{ ...full, [statusField]: stage }, ...p.data] : p.data,
            total: p.total + 1,
          })),
        });
    }
  };
  const move = async (record: CrmRecord, patch: Data): Promise<void> => {
    setMoving(true);
    setError(undefined);
    const stage = definition?.statusField
      ? patch[definition.statusField]
      : undefined;
    if (typeof stage === 'string') {
      moveInCache(record, stage);
      setLanded(toText(record.id));
    }
    try {
      await api(`${toText(entity)}/${toText(record.id)}`, 'PATCH', patch);
      setInvalidating(undefined);
      await refresh();
    } catch (e) {
      setError(e);
      await refresh();
    } finally {
      setMoving(false);
    }
  };
  const params = new URLSearchParams({
    search,
    status,
    ownerId: scope === 'mine' ? toText(meta?.userId) : ownerId,
    source,
    employed,
    topic,
    approverId,
    participantId: scope === 'participating' ? toText(meta?.userId) : '',
    page: toText(page),
    pageSize: String(PAGE_SIZE),
  });
  if (activeMetric) params.set('ids', activeMetric.ids.join(','));
  // Each board column pages its own status through the list endpoint, so it
  // takes the filters without page, size or status.
  const columnParams = new URLSearchParams(params);
  for (const key of ['page', 'pageSize', 'status']) columnParams.delete(key);
  const listParams = new URLSearchParams(params);
  if (sort)
    listParams.set(
      'sort',
      sort.direction === 'desc' ? `-${sort.key}` : sort.key,
    );
  const path = `${toText(entity)}?${listParams.toString()}`;
  const query = useQuery({
    queryKey: [...scopeKey, path],
    queryFn: () => api<ListData>(path),
    enabled: Boolean(definition),
  });
  // The calendar reads one month from the server, by when activities
  // happen, with the same filters as the list. The range is widened by a
  // day either side so every business timezone's month is covered; the
  // cells only draw the days they own. Pages are read until the month is
  // complete: a month's activities are bounded, and a cell needs them all
  // to say how many it hides.
  const monthStart = Date.UTC(
    Number(month.slice(0, 4)),
    Number(month.slice(5)) - 1,
    1,
  );
  const monthEnd = Date.UTC(
    Number(month.slice(0, 4)),
    Number(month.slice(5)),
    1,
  );
  const calendarParams = new URLSearchParams(params);
  for (const key of ['page', 'pageSize']) calendarParams.delete(key);
  calendarParams.set(
    'startFrom',
    new Date(monthStart - 86400000).toISOString(),
  );
  calendarParams.set('startTo', new Date(monthEnd + 86400000).toISOString());
  calendarParams.set('pageSize', '500');
  const calendarPath = `${toText(entity)}?${calendarParams.toString()}`;
  const calendar = useQuery({
    queryKey: [...scopeKey, calendarPath],
    queryFn: async () => {
      const all: CrmRecord[] = [];
      for (let page = 1; page <= 20; page++) {
        const result = await api<ListData>(
          `${calendarPath}&page=${toText(page)}`,
        );
        all.push(...result.data);
        if (result.page * result.pageSize >= result.total) break;
      }
      return all;
    },
    enabled: Boolean(definition) && view === 'calendar',
  });
  const filtered = calendar.data ?? [];
  const writable = Boolean(meta?.permissions[entity]?.create);
  const lookup = query.data?.titles ?? {};
  const read = meta?.permissions[entity]?.read;
  // A lead's name cell carries "name / company", so the company column would
  // repeat it.
  const columns =
    definition?.columns
      .filter(
        (key) =>
          read &&
          (read.fields === '*' || read.fields.includes(key)) &&
          !(entity === 'leads' && key === 'company'),
      )
      // An approval is judged against the deal's size, so the amount of the
      // opportunity it belongs to follows that column.
      .flatMap((key) =>
        entity === 'approvals' && key === 'opportunityId'
          ? [key, 'opportunityAmount']
          : [key],
      ) ?? [];
  // A header click sorts by its column: numbers and dates start from the
  // largest and latest, the rest from A; a second click reverses it and a
  // third returns to the default order. The opportunity's amount beside an
  // approval is not a field of the approval, so it does not sort.
  const firstDirection = (key: string): 'asc' | 'desc' => {
    const type = definition?.fields.find((field) => field.key === key)?.type;
    return type === 'number' ||
      type === 'date' ||
      type === 'datetime' ||
      (!type && key.endsWith('At'))
      ? 'desc'
      : 'asc';
  };
  const sortBy = (key: string): void => {
    const first = firstDirection(key);
    setSort(
      sort?.key !== key
        ? { key, direction: first }
        : sort.direction === first
          ? { key, direction: first === 'asc' ? 'desc' : 'asc' }
          : undefined,
    );
    setPage(1);
  };
  const opportunityOf = (
    record: CrmRecord,
  ): { amount: number; currency: string } | undefined =>
    query.data?.opportunities?.[toText(record.opportunityId ?? '')];
  const newButton = (
    <>
      {writable && (
        <Button onClick={() => setForm({ input: {} })}>
          <Plus />
          {text('newRecord', { entity: text(`entity.${toText(entity)}`) })}
        </Button>
      )}
      {/* The list page's assistant entries are about the funnel as a whole:
          capture a lead in prose instead of a form, or turn the attention
          metrics above into follow-up activities. */}
      {meta?.assistant &&
        ['leads', 'accounts', 'opportunities'].includes(entity) && (
          <div className='flex flex-wrap items-center'>
            {entity === 'leads' && writable && (
              <Button
                variant='ghost'
                className='text-ai hover:text-ai'
                onClick={() =>
                  window.dispatchEvent(
                    new CustomEvent('crm-assistant', {
                      detail: { prompt: text('prompts.captureLead') },
                    }),
                  )
                }
              >
                <Sparkles />
                {text('captureLead')}
              </Button>
            )}
            <Button
              variant='ghost'
              className='text-ai hover:text-ai'
              onClick={() =>
                window.dispatchEvent(
                  new CustomEvent('crm-assistant', {
                    detail: {
                      prompt: text(`prompts.planFollowUps.${toText(entity)}`),
                      send: true,
                    },
                  }),
                )
              }
            >
              <Sparkles />
              {text('planFollowUps')}
            </Button>
          </div>
        )}
    </>
  );
  const change =
    (setter: (value: string) => void) =>
    (value: string): void => {
      setter(value);
      setPage(1);
    };
  if (metadataError)
    return (
      <CrmFrame title={text(`entities.${toText(entity)}`)}>
        <ErrorNotice error={metadataError} />
      </CrmFrame>
    );
  if (!meta || !definition) return <Loading />;
  // The view switch, the activity scope, the search toggle and the CSV
  // actions sit in the header beside the create button, not on a row of
  // their own.
  const toolbar = (
    <>
      <div className='flex gap-1 rounded-lg border p-1'>
        {[
          ['list', LayoutList],
          ...(['leads', 'accounts', 'opportunities'].includes(entity)
            ? [['board', Columns3]]
            : []),
          ...(entity === 'activities' ? [['calendar', CalendarDays]] : []),
        ].map(([name, Icon]) => {
          const Component = Icon as typeof LayoutList;
          return (
            <Button
              key={toText(name)}
              variant={view === name ? 'secondary' : 'ghost'}
              onClick={() => setView(toText(name))}
            >
              <Component />
              {text(toText(name))}
            </Button>
          );
        })}
      </div>
      <Button
        variant={filtersOpen || filtering ? 'secondary' : 'ghost'}
        size='icon'
        aria-label={text('search')}
        aria-expanded={filtersOpen}
        onClick={() => setFiltersOpen((v) => !v)}
      >
        <Search />
      </Button>
      {/* Whose activities: always in the toolbar, not a filter to open. */}
      {entity === 'activities' && (
        <div className='flex rounded-lg border p-0.5'>
          {(['all', 'mine', 'participating'] as const).map((value) => (
            <Button
              key={value}
              size='sm'
              variant={scope === value ? 'secondary' : 'ghost'}
              onClick={() => {
                setScope(value);
                setPage(1);
              }}
            >
              {text(value)}
            </Button>
          ))}
        </div>
      )}
      <div className='flex gap-2'>
        {writable && (
          <Button
            variant='ghost'
            size='icon'
            aria-label={text('import')}
            title={text('import')}
            onClick={() => setImporting(true)}
          >
            <Upload />
          </Button>
        )}
        {/* Export is a manager's action; the server refuses it otherwise. */}
        {meta?.export && (
          <Button
            variant='ghost'
            size='icon'
            aria-label={text('export')}
            title={text('export')}
            onClick={() => {
              void (async () => {
                try {
                  const response = await api<{ data: CrmRecord[] }>(
                    `${toText(entity)}/export?${params.toString()}`,
                  );
                  downloadCsv(
                    `${toText(entity)}.csv`,
                    definition?.fields
                      .map((f) => f.key)
                      .filter(
                        (key) =>
                          read &&
                          (read.fields === '*' || read.fields.includes(key)),
                      ) ?? [],
                    response.data,
                  );
                } catch (e) {
                  setError(e);
                }
              })();
            }}
          >
            <Download />
          </Button>
        )}
      </div>
    </>
  );
  return (
    <CrmFrame
      // The board takes the viewport height with each column scrolling on
      // its own, so its horizontal scrollbar stays in view at the bottom
      // rather than below a page-long column.
      fill={view === 'board'}
      // The lead total sits beside the title rather than as a metric card:
      // it is context, not something to act on.
      title={
        totals.data?.total !== undefined ? (
          <>
            {text(`entities.${toText(entity)}`)}
            <span className='ml-2 align-middle text-base font-normal text-muted-foreground tabular-nums'>
              {toText(totals.data.total)}
            </span>
          </>
        ) : (
          text(`entities.${toText(entity)}`)
        )
      }
      description={text(`descriptions.${toText(entity)}`)}
      actions={
        <>
          {toolbar}
          {newButton}
        </>
      }
      // No list page carries the generic assistant button: the global entry
      // and the record pages' own shortcuts cover it.
      assistant={false}
    >
      <ErrorNotice error={query.error ?? error} />
      {activeMetric && (
        <div className='flex items-center gap-2 text-sm'>
          <span className='text-muted-foreground'>{text('showing')}</span>
          <Button variant='secondary' size='sm' onClick={() => setMetric(null)}>
            {text(activeMetric.key)}
            <X className='size-3.5' />
          </Button>
        </div>
      )}
      {/* Filters live under the toolbar and open on demand; they stay open
          whenever one is set so an active filter is never hidden. */}
      {(filtersOpen || filtering) && (
        <div className='flex flex-wrap items-center gap-3'>
          <div className='relative min-w-52 flex-1'>
            <Search className='absolute top-2 left-3 size-4 text-muted-foreground' />
            <Input
              className='pl-9'
              aria-label={text('search')}
              placeholder={text('search')}
              value={search}
              onChange={(e) => change(setSearch)(e.target.value)}
            />
          </div>
          {definition?.statuses.length ? (
            <div className='w-44'>
              <Choice
                label={text('fields.status')}
                emptyLabel={text('allOf', { what: text('fields.status') })}
                value={status}
                onChange={change(setStatus)}
                choices={definition.statuses.map((v) => ({
                  value: v,
                  label: text(`options.${toText(v)}`),
                }))}
              />
            </div>
          ) : null}
          <div className='w-44'>
            <Choice
              label={text(
                entity === 'approvals' ? 'fields.applicant' : 'owner',
              )}
              emptyLabel={text('allOf', {
                what: text(
                  entity === 'approvals' ? 'fields.applicant' : 'owner',
                ),
              })}
              value={ownerId}
              onChange={change(setOwnerId)}
              choices={
                meta?.users.map((u) => ({ value: u.id, label: u.name })) ?? []
              }
            />
          </div>
          {entity === 'approvals' && (
            <>
              <div className='w-44'>
                <Choice
                  label={text('fields.topic')}
                  emptyLabel={text('allOf', { what: text('fields.topic') })}
                  value={topic}
                  onChange={change(setTopic)}
                  choices={(
                    definition?.fields.find((f) => f.key === 'topic')
                      ?.options ?? []
                  ).map((v) => ({
                    value: v,
                    label: text(`options.${toText(v)}`),
                  }))}
                />
              </div>
              <div className='w-44'>
                <Choice
                  label={text('fields.approverId')}
                  emptyLabel={text('allOf', {
                    what: text('fields.approverId'),
                  })}
                  value={approverId}
                  onChange={change(setApproverId)}
                  choices={
                    meta?.users
                      .filter((u) => u.canApprove)
                      .map((u) => ({ value: u.id, label: u.name })) ?? []
                  }
                />
              </div>
            </>
          )}
          {definition?.fields.some((f) => f.key === 'employed') && (
            <div className='w-44'>
              <Choice
                label={text('fields.employed')}
                emptyLabel={text('allOf', { what: text('fields.employed') })}
                value={employed}
                onChange={change(setEmployed)}
                choices={[
                  { value: 'true', label: text('yes') },
                  { value: 'false', label: text('no') },
                ]}
              />
            </div>
          )}
          {definition?.fields.some((f) => f.key === 'source') && (
            <div className='w-44'>
              <Choice
                label={text('fields.source')}
                emptyLabel={text('allOf', { what: text('fields.source') })}
                value={source}
                onChange={change(setSource)}
                choices={(meta?.settings.options.source ?? []).map((v) => ({
                  value: v,
                  label: text(`options.${toText(v)}`, { defaultValue: v }),
                }))}
              />
            </div>
          )}
        </div>
      )}
      {query.isLoading ? (
        <Loading />
      ) : view === 'list' ? (
        !query.data?.data.length ? (
          <Empty action={newButton} />
        ) : (
          <>
            <div className='overflow-hidden rounded-xl border bg-card'>
              <Table>
                <TableHeader>
                  <TableRow>
                    {columns.map((key) => {
                      const title =
                        key === 'name' && entity === 'leads'
                          ? text('leadTitle')
                          : text(fieldLabelKey(entity, toText(key)));
                      return key === 'opportunityAmount' ? (
                        <TableHead className='px-4 py-3' key={key}>
                          {title}
                        </TableHead>
                      ) : (
                        <SortableHead
                          className='px-4 py-3'
                          key={key}
                          title={title}
                          direction={sort?.key === key && sort.direction}
                          onClick={() => sortBy(key)}
                        />
                      );
                    })}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {query.data.data.map((record) => (
                    <TableRow key={record.id}>
                      {columns.map((key) => (
                        <TableCell
                          // Every value, the name included, is cut with an
                          // ellipsis, so a cell never runs over the next one,
                          // which on a phone put two columns' text on top of
                          // each other.
                          className='max-w-72 truncate px-4 py-4'
                          key={key}
                        >
                          {key === 'name' ? (
                            <RecordLink
                              entity={entity}
                              record={{
                                id: record.id,
                                // A contact's account is its own column
                                // here, so the link is the bare name.
                                name:
                                  entity === 'contacts'
                                    ? toText(record.name)
                                    : recordTitle(entity, record, lookup),
                              }}
                            />
                          ) : key === 'opportunityAmount' ? (
                            (() => {
                              const deal = opportunityOf(record);
                              return deal?.amount ? (
                                <span className='tabular-nums'>
                                  {money(
                                    deal.amount,
                                    toText(deal.currency),
                                    language,
                                  )}
                                </span>
                              ) : (
                                '—'
                              );
                            })()
                          ) : (entity === 'activities' && key === 'type') ||
                            (entity === 'approvals' && key === 'topic') ? (
                            record[key] ? (
                              <KindTag value={record[key]} />
                            ) : (
                              '—'
                            )
                          ) : key === 'status' &&
                            entity === 'approvals' &&
                            record.status === 'pending' &&
                            record.approverId === meta?.userId ? (
                            // The reader's own queue, marked as on the page.
                            <span className='flex flex-wrap items-center gap-2'>
                              <Status value={record.status} />
                              <Badge>{text('yourDecision')}</Badge>
                            </span>
                          ) : (
                            <Value
                              record={record}
                              field={
                                definition.fields.find(
                                  (f) => f.key === key,
                                ) ?? {
                                  key,
                                }
                              }
                              lookup={lookup}
                            />
                          )}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div className='flex items-center justify-between text-sm text-muted-foreground'>
              <span>
                {text('page', {
                  page,
                  pages: Math.max(1, Math.ceil(query.data.total / PAGE_SIZE)),
                })}
              </span>
              <div className='flex gap-2'>
                <Button
                  variant='outline'
                  disabled={page === 1}
                  onClick={() => setPage(page - 1)}
                >
                  {text('previous')}
                </Button>
                <Button
                  variant='outline'
                  disabled={page * PAGE_SIZE >= query.data.total}
                  onClick={() => setPage(page + 1)}
                >
                  {text('next')}
                </Button>
              </div>
            </div>
          </>
        )
      ) : view === 'board' ? (
        <div className='flex min-h-0 flex-1 gap-4 overflow-x-auto pb-2'>
          {definition?.statuses.map((stage) => (
            <BoardColumn
              key={stage}
              entity={entity}
              stage={stage}
              params={columnParams}
              droppable={stage !== 'converted'}
              onDrop={(dragged) => {
                // The card is about to be re-rendered in another column, so
                // its own dragend never reaches the element that started the
                // drag; the drop is where the dimming ends.
                setDragging(undefined);
                if (
                  dragged.status === 'converted' ||
                  dragged[definition.statusField!] === stage ||
                  !(editsAll(meta, entity) || dragged.ownerId === meta?.userId)
                )
                  return;
                // Dragging is the whole gesture: the status changes on drop.
                // A closing status that must carry a reason asks for it first.
                if (reasonFor(entity, stage))
                  setInvalidating({ record: dragged, stage });
                else void move(dragged, { [definition.statusField!]: stage });
              }}
              renderCard={(record, titles) => (
                <Card
                  key={record.id}
                  className={`gap-0 py-4 shadow-none transition-[opacity,box-shadow,background-color] duration-700 ${toText(
                    dragging === record.id ? 'opacity-40' : '',
                  )} ${toText(
                    landed === record.id
                      ? 'bg-primary/15 ring-2 ring-primary/60'
                      : '',
                  )} ${toText(
                    record.status !== 'converted' &&
                      (editsAll(meta, entity) ||
                        record.ownerId === meta?.userId)
                      ? 'cursor-grab active:cursor-grabbing'
                      : '',
                  )}`}
                  draggable={
                    record.status !== 'converted' &&
                    (editsAll(meta, entity) || record.ownerId === meta?.userId)
                  }
                  onDragEnd={() => setDragging(undefined)}
                  // The card carries what the drop needs, since the target
                  // column does not hold the source column's records.
                  onDragStart={(e) => {
                    e.dataTransfer.effectAllowed = 'move';
                    setDragging(toText(record.id));
                    e.dataTransfer.setData(
                      'application/json',
                      JSON.stringify({
                        id: record.id,
                        name: record.name,
                        company: record.company,
                        ownerId: record.ownerId,
                        status: record.status,
                        [definition.statusField!]:
                          record[definition.statusField!],
                      }),
                    );
                  }}
                >
                  <CardContent className='space-y-1.5 px-4'>
                    <RecordLink
                      entity={entity}
                      record={{
                        id: record.id,
                        name: recordTitle(entity, record, titles),
                      }}
                      lines={2}
                    />
                    <div className='space-y-0.5 text-xs text-muted-foreground'>
                      {/* Same icons as the detail pages' field labels, so
                          the card reads without headings. */}
                      <p className='flex flex-wrap gap-x-3'>
                        <span className='inline-flex items-center gap-1'>
                          <User className='size-3 shrink-0' />
                          {
                            meta?.users.find((u) => u.id === record.ownerId)
                              ?.name
                          }
                        </span>
                        {entity === 'leads' && (
                          <span className='inline-flex items-center gap-1'>
                            <Megaphone className='size-3 shrink-0' />
                            <Value
                              record={record}
                              field={{ key: 'source', type: 'select' }}
                            />
                          </span>
                        )}
                        {entity === 'accounts' && (
                          <span className='inline-flex items-center gap-1'>
                            <Factory className='size-3 shrink-0' />
                            <Value
                              record={record}
                              field={{ key: 'industry', type: 'select' }}
                            />
                          </span>
                        )}
                        {entity === 'opportunities' &&
                          Boolean(record.expectedCloseAt) && (
                            <span className='inline-flex items-center gap-1'>
                              <CalendarClock className='size-3 shrink-0' />
                              <Value
                                record={record}
                                field={{ key: 'expectedCloseAt', type: 'date' }}
                              />
                            </span>
                          )}
                      </p>
                      <p className='inline-flex items-center gap-1 tabular-nums'>
                        <History className='size-3 shrink-0' />
                        <Value
                          record={record}
                          field={{ key: 'updatedAt', type: 'datetime' }}
                        />{' '}
                        {text('updatedSuffix')}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}
            />
          ))}
        </div>
      ) : (
        <section className='space-y-4'>
          {/* Own month stepper rather than <input type="month">: the native
              control speaks the browser's language, not the app's. */}
          <div className='flex items-center gap-1'>
            <Button
              variant='ghost'
              size='icon-sm'
              aria-label={text('previousMonth')}
              onClick={() => setMonth(shiftMonth(month, -1))}
            >
              <ChevronLeft />
            </Button>
            <span className='min-w-32 text-center text-sm font-medium tabular-nums'>
              {new Intl.DateTimeFormat(language, {
                year: 'numeric',
                month: 'long',
                timeZone: 'UTC',
              }).format(
                new Date(
                  Date.UTC(
                    Number(month.slice(0, 4)),
                    Number(month.slice(5)) - 1,
                    1,
                  ),
                ),
              )}
            </span>
            <Button
              variant='ghost'
              size='icon-sm'
              aria-label={text('nextMonth')}
              onClick={() => setMonth(shiftMonth(month, 1))}
            >
              <ChevronRight />
            </Button>
            <Button
              variant='outline'
              size='sm'
              className='ml-2'
              onClick={() => setMonth(today.slice(0, 7))}
            >
              {text('thisMonth')}
            </Button>
          </div>
          {/* The month grid needs about 110px a day, which a tablet beside the
              sidebar does not have; below 1024px the days stack as a list. */}
          <div className='grid gap-px overflow-hidden rounded-xl border bg-border lg:grid-cols-7'>
            {Array.from({ length: 7 }, (_, i) => (
              <div
                key={i + 1}
                className='hidden bg-card p-3 text-sm font-medium lg:block'
              >
                {new Intl.DateTimeFormat(language, {
                  weekday: 'short',
                  timeZone: 'UTC',
                }).format(new Date(Date.UTC(2026, 8, 6 + i)))}
              </div>
            ))}
            {Array.from(
              {
                length: new Date(
                  Number(month.slice(0, 4)),
                  Number(month.slice(5)) - 1,
                  1,
                ).getDay(),
              },
              (_, i) => (
                <div
                  key={i + 100}
                  aria-hidden
                  className='hidden bg-muted lg:block'
                />
              ),
            )}
            {Array.from(
              {
                length: new Date(
                  Number(month.slice(0, 4)),
                  Number(month.slice(5)),
                  0,
                ).getDate(),
              },
              (_, i) => {
                const day = `${toText(month)}-${toText(toText(i + 1).padStart(2, '0'))}`;
                const items = filtered
                  .filter(
                    (r) =>
                      r.startAt &&
                      new Intl.DateTimeFormat('en-CA', {
                        timeZone: meta?.settings.timeZone ?? 'Asia/Shanghai',
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit',
                      }).format(new Date(toText(r.startAt))) === day,
                  )
                  // Morning first, the way a day is read.
                  .sort((a, b) =>
                    toText(a.startAt).localeCompare(toText(b.startAt)),
                  );
                const isToday = day === today;
                return (
                  <div
                    key={day}
                    className={`min-h-36 space-y-2 p-3 ${toText(
                      isToday ? 'bg-ai/10 dark:bg-ai/20' : 'bg-card',
                    )}`}
                    aria-current={isToday ? 'date' : undefined}
                  >
                    <p
                      className={`flex items-center gap-1.5 text-sm font-medium ${toText(
                        isToday ? 'text-ai' : 'text-muted-foreground',
                      )}`}
                    >
                      {isToday && (
                        <span
                          aria-hidden
                          className='inline-block size-1.5 rounded-full bg-ai'
                        />
                      )}
                      {new Intl.DateTimeFormat(language, {
                        month: 'numeric',
                        day: 'numeric',
                        timeZone: 'UTC',
                      }).format(new Date(`${day}T00:00:00Z`))}
                    </p>
                    {/* A cell shows a handful; a busy day reveals the rest
                        on demand rather than stretching the whole row. */}
                    {(expandedDays.has(day)
                      ? items
                      : items.slice(0, CALENDAR_DAY_LIMIT)
                    ).map((r) => (
                      <div
                        key={r.id}
                        // On today's tinted cell the cards sit on the card
                        // surface, so they still read as cards.
                        className={`rounded-lg p-2 text-xs ${toText(
                          isToday ? 'bg-card' : 'bg-muted',
                        )}`}
                      >
                        <RecordLink entity={entity} record={r} />
                        {/* The cell is the date, so the card carries only
                            the clock time, with the owner, under the title
                            the way the workspace's agenda cards do. */}
                        <p className='mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-muted-foreground'>
                          <span className='inline-flex items-center gap-1 tabular-nums'>
                            <Clock className='size-3 shrink-0' />
                            {new Intl.DateTimeFormat(language, {
                              timeStyle: 'short',
                              timeZone:
                                meta?.settings.timeZone ?? 'Asia/Shanghai',
                            }).format(new Date(toText(r.startAt)))}
                          </span>
                          <span className='inline-flex items-center gap-1'>
                            <User className='size-3 shrink-0' />
                            {meta?.users.find((u) => u.id === r.ownerId)?.name}
                          </span>
                        </p>
                      </div>
                    ))}
                    {!expandedDays.has(day) &&
                      items.length > CALENDAR_DAY_LIMIT && (
                        <Button
                          variant='ghost'
                          size='sm'
                          className='h-7 w-full text-xs'
                          onClick={() =>
                            setExpandedDays((all) => new Set(all).add(day))
                          }
                        >
                          {text('loadMore')}
                          <span className='ml-1 tabular-nums text-muted-foreground'>
                            {items.length - CALENDAR_DAY_LIMIT}
                          </span>
                        </Button>
                      )}
                  </div>
                );
              },
            )}
          </div>
        </section>
      )}
      {form && (
        <RecordForm
          entity={entity}
          initial={form.input}
          id={form.id}
          titles={lookup}
          onClose={() => setForm(undefined)}
          andThen={
            entity === 'approvals'
              ? {
                  label: text('saveAndSubmit'),
                  run: async (r) => {
                    await api(`approvals/${toText(r.id)}/submit`, 'POST', {
                      comment: '',
                    });
                  },
                }
              : undefined
          }
        />
      )}
      {importing && (
        <ImportDialog entity={entity} onClose={() => setImporting(false)} />
      )}
      {invalidating && definition && (
        <ReasonDialog
          entity={entity}
          stage={invalidating.stage}
          title={recordTitle(entity, invalidating.record, lookup)}
          busy={moving}
          onCancel={() => setInvalidating(undefined)}
          onConfirm={(reasons) =>
            void move(invalidating.record, {
              [definition.statusField!]: invalidating.stage,
              ...reasons,
            })
          }
        />
      )}
    </CrmFrame>
  );
}

// One board column, paging its own status through the list endpoint so the
// board never loads every record. The header count is the server's total for
// the column's filter, not the number of cards loaded so far.
function BoardColumn({
  entity,
  stage,
  params,
  droppable,
  onDrop,
  renderCard,
}: {
  entity: Entity;
  stage: string;
  params: URLSearchParams;
  droppable: boolean;
  onDrop: (dragged: CrmRecord) => void;
  renderCard: (
    record: CrmRecord,
    titles: Record<string, string>,
  ) => ReactElement;
}): ReactElement {
  const { text } = useCrmText();
  const api = useCrmApi();
  const scopeKey = useCrmScopeKey();
  const base = new URLSearchParams(params);
  base.set('status', stage);
  base.set('pageSize', String(PAGE_SIZE));
  // Most recently touched first: a card dropped here was just touched, so
  // it stays at the top where it landed, and a column reads as recent work.
  base.set('sort', '-updatedAt');
  const query = useInfiniteQuery({
    queryKey: [...scopeKey, `${toText(entity)}/board`, stage, base.toString()],
    queryFn: ({ pageParam }) => {
      const p = new URLSearchParams(base);
      p.set('page', String(pageParam));
      return api<ListData>(`${toText(entity)}?${p.toString()}`);
    },
    initialPageParam: 1,
    getNextPageParam: (last) =>
      last.page * last.pageSize < last.total ? last.page + 1 : undefined,
  });
  const items = query.data?.pages.flatMap((p) => p.data) ?? [];
  const total = query.data?.pages[0]?.total ?? 0;
  const titles = (query.data?.pages ?? []).reduce<Record<string, string>>(
    (all, p) => ({ ...all, ...p.titles }),
    {},
  );
  // Whether a card is held over this column: counted, because entering a
  // child fires leave on the parent, and the highlight must not flicker.
  const [overCount, setOverCount] = useState(0);
  const over = droppable && overCount > 0;
  return (
    <section
      className={`flex w-72 shrink-0 flex-col rounded-xl border p-3 transition-colors ${toText(
        over ? 'border-dashed border-primary bg-primary/5' : 'bg-muted/40',
      )}`}
      // A non-droppable column (converted, reached only through the
      // conversion flow) never calls preventDefault, so the cursor says no
      // before the user lets go instead of the drop silently doing nothing.
      onDragOver={
        droppable
          ? (e) => {
              e.preventDefault();
              e.dataTransfer.dropEffect = 'move';
            }
          : undefined
      }
      onDragEnter={droppable ? () => setOverCount((n) => n + 1) : undefined}
      onDragLeave={
        droppable ? () => setOverCount((n) => Math.max(0, n - 1)) : undefined
      }
      onDrop={(e) => {
        e.preventDefault();
        setOverCount(0);
        try {
          onDrop(
            JSON.parse(e.dataTransfer.getData('application/json')) as CrmRecord,
          );
        } catch {
          /* not one of our cards */
        }
      }}
    >
      <div className='mb-4 flex shrink-0 items-center justify-between'>
        <Status value={stage} />
        <span className='text-sm tabular-nums text-muted-foreground'>
          {total}
        </span>
      </div>
      {/* The cards scroll inside the column; the padding keeps a landed
          card's ring from being clipped at the edges. */}
      <div className='-m-1 min-h-0 flex-1 space-y-3 overflow-y-auto p-1'>
        {items.map((record) => renderCard(record, titles))}
        {query.hasNextPage && (
          <Button
            variant='ghost'
            size='sm'
            className='w-full'
            disabled={query.isFetchingNextPage}
            onClick={() => void query.fetchNextPage()}
          >
            {text('loadMore')}
            <span className='ml-1 tabular-nums text-muted-foreground'>
              {total - items.length}
            </span>
          </Button>
        )}
      </div>
    </section>
  );
}
