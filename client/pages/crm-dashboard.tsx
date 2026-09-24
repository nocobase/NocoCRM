import { TrendChart } from '../components/crm/trend-chart.js';
import { SortableTable } from '../components/crm/sortable-table.js';
import { toText } from '../components/crm/api.js';
import { useState, type ReactElement, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router';
import {
  AlertCircle,
  ArrowUpRight,
  CalendarClock,
  CheckCircle2,
  CircleDashed,
  Clock,
  Inbox,
  Layers,
  PauseCircle,
  Percent,
  Sparkles,
  Trophy,
  type LucideIcon,
  Scale,
  User,
  ShieldCheck,
  Building2,
  FilePen,
  PhoneOff,
  UserMinus,
  UserX,
  XCircle,
} from 'lucide-react';
import { Button } from '../components/ui/button.js';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '../components/ui/card.js';
import { Badge } from '../components/ui/badge.js';
import {
  CrmFrame,
  Loading,
  ErrorNotice,
  Metric,
  RecordLink,
} from '../components/crm/common.js';
import {
  useCrmQuery,
  useCrmApi,
  useCrmText,
  useMetadata,
  rows,
  moneyTotals,
  localDate,
  type Data,
  type CrmRecord,
  type Entity,
  type ListData,
} from '../components/crm/api.js';

// The six risk cards: which list page they open, the metric key that page
// filters by, and the icon. The number itself comes from the same rule the
// list page's card uses, so the two always agree.
const attentionCards: {
  key: string;
  entity: Entity;
  metric: string;
  icon: LucideIcon;
  days?: 'leadStaleDays' | 'staleDays' | 'closeReminderDays';
}[] = [
  {
    key: 'uncontacted',
    entity: 'leads',
    metric: 'uncontacted',
    icon: Clock,
  },
  {
    key: 'staleLeads',
    entity: 'leads',
    metric: 'stale',
    icon: PauseCircle,
    days: 'leadStaleDays',
  },
  {
    key: 'staleAccounts',
    entity: 'accounts',
    metric: 'stale',
    icon: PauseCircle,
    days: 'staleDays',
  },
  {
    key: 'noOpenOpportunity',
    entity: 'accounts',
    metric: 'noOpenOpportunity',
    icon: CircleDashed,
  },
  {
    key: 'closingSoon',
    entity: 'opportunities',
    metric: 'closingSoon',
    icon: CalendarClock,
    days: 'closeReminderDays',
  },
  {
    key: 'overdueOpportunities',
    entity: 'opportunities',
    metric: 'overdueOpportunities',
    icon: AlertCircle,
  },
  // Gaps in the book itself, and one's own unfinished requests.
  { key: 'noContacts', entity: 'accounts', metric: 'noContacts', icon: UserX },
  {
    key: 'missingContact',
    entity: 'contacts',
    metric: 'missingContact',
    icon: PhoneOff,
  },
  { key: 'toSubmit', entity: 'approvals', metric: 'toSubmit', icon: FilePen },
];

export default function DashboardPage(): ReactElement {
  const { text, language } = useCrmText();
  const { data: meta } = useMetadata();
  const navigate = useNavigate();
  const [scope, setScope] = useState<'mine' | 'team'>('team');
  const query = useCrmQuery<Data>(`dashboard?scope=${scope}`);
  const data = query.data;
  const attention = (data?.attention ?? {}) as Data;
  const business = (data?.business ?? {}) as Data;
  const overall = (data?.overall ?? {}) as Data;
  const funnel = rows(data?.funnel);
  const maxCount = Math.max(1, ...funnel.map((r) => Number(r.count)));
  const timeZone = meta?.settings.timeZone ?? 'Asia/Shanghai';
  const ask = (key: 'planToday' | 'analyzeSales'): void => {
    window.dispatchEvent(
      new CustomEvent('crm-assistant', {
        detail: { prompt: text(`prompts.${key}`), send: true },
      }),
    );
  };
  const openList = (entity: Entity, metric: string): void =>
    void navigate(`/crm/${toText(entity)}?metric=${metric}`);

  // One of the three "today" lists: activities carry their type and a start
  // time; approvals carry their topic and when they were submitted. The
  // workspace brings the first page of each; the card asks for the rest.
  const agenda = (
    name: AgendaName,
    empty: string,
    to: string,
  ): ReactElement => (
    <AgendaCard
      key={`${name}-${scope}`}
      name={name}
      scope={scope}
      initial={data?.[name] as ListData | undefined}
      empty={empty}
      to={to}
      timeZone={timeZone}
    />
  );

  const section = (title: string, children: ReactNode): ReactElement => (
    <section className='space-y-3'>
      <h2 className='text-sm font-medium text-muted-foreground'>{title}</h2>
      {children}
    </section>
  );

  // The value a cell shows and the value its column sorts by: an amount by
  // its total, a source by its label, a rate or a count as a number.
  const display = (row: Data, key: string): ReactNode =>
    key === 'conversionRate'
      ? row[key] == null
        ? '—'
        : `${toText(Math.round(Number(row[key]) * 100))}%`
      : typeof row[key] === 'object' && row[key] !== null
        ? moneyTotals(row[key], language)
        : key === 'source'
          ? text(`options.${toText(row[key])}`, {
              defaultValue: toText(row[key]),
            })
          : toText(row[key] ?? '—');
  const sortValue = (row: Data, key: string): number | string | undefined => {
    const value = row[key];
    if (value === null || value === undefined || value === '') return undefined;
    if (key === 'source') return toText(display(row, key));
    if (typeof value === 'number') return value;
    if (typeof value === 'object') {
      // No amount at all shows as "—" and sorts with the other blanks.
      const amounts = Object.values(value as Record<string, unknown>);
      if (!amounts.length) return undefined;
      return amounts.reduce<number>(
        (sum, amount) => sum + Number(amount ?? 0),
        0,
      );
    }
    const number = Number(value);
    return Number.isFinite(number) ? number : toText(value);
  };
  const table = (
    title: string,
    items: Data[],
    columns: [string, string][],
    keyOf: (row: Data) => string,
  ): ReactElement => (
    <Card className='shadow-none'>
      <CardHeader>
        <CardTitle className='text-base'>{text(title)}</CardTitle>
      </CardHeader>
      <CardContent>
        <SortableTable
          rows={items}
          rowKey={keyOf}
          columns={columns.map(([key, label]) => ({
            id: key,
            title: text(label),
            sortValue: (row: Data) => sortValue(row, key),
            cell: (row: Data) => display(row, key),
          }))}
        />
      </CardContent>
    </Card>
  );

  return (
    <CrmFrame
      title={text('dashboard')}
      description={text('dashboardDescription')}
      assistant={false}
      titleAside={
        <div className='flex rounded-lg border p-0.5'>
          {(['mine', 'team'] as const).map((value) => (
            <Button
              key={value}
              size='sm'
              variant={scope === value ? 'secondary' : 'ghost'}
              onClick={() => setScope(value)}
            >
              {text(value === 'mine' ? 'scopeMine' : 'scopeTeam')}
            </Button>
          ))}
        </div>
      }
      actions={
        <>
          {meta?.assistant && meta.permissions.leads.create && (
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
          {meta?.assistant && (
            <>
              <Button
                variant='ghost'
                className='text-ai hover:text-ai'
                onClick={() => ask('planToday')}
              >
                <Sparkles />
                {text('planToday')}
              </Button>
              <Button
                variant='ghost'
                className='text-ai hover:text-ai'
                onClick={() => ask('analyzeSales')}
              >
                <Sparkles />
                {text('analyzeSales')}
              </Button>
            </>
          )}
        </>
      }
    >
      <ErrorNotice error={query.error} />
      {query.isLoading || !data ? (
        <Loading />
      ) : (
        <>
          {section(
            text('todaysWork'),
            <div className='grid gap-4 lg:grid-cols-3'>
              {agenda(
                'today',
                text('noToday'),
                '/crm/activities?metric=todayActivities',
              )}
              {agenda(
                'overdue',
                text('noOverdue'),
                '/crm/activities?metric=overdueActivities',
              )}
              {agenda(
                'approvals',
                text('overdueApprovalHint'),
                scope === 'team'
                  ? '/crm/approvals?status=pending'
                  : '/crm/approvals?metric=myDecisions',
              )}
            </div>,
          )}
          {section(
            text('overall'),
            <>
              <div className='grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(10rem,1fr))]'>
                <Metric
                  title={text('pipeline')}
                  icon={Layers}
                  value={moneyTotals(business.pipeline, language)}
                  note={text('metricNotes.pipeline')}
                  onClick={() => openList('opportunities', 'open')}
                />
                <Metric
                  title={text('weighted')}
                  icon={Scale}
                  value={moneyTotals(business.weighted, language)}
                  note={text('metricNotes.weighted')}
                  onClick={() => openList('opportunities', 'open')}
                />
                <Metric
                  title={text('leadConversionRate')}
                  icon={Percent}
                  value={
                    overall.conversionRate == null
                      ? '—'
                      : `${toText(Math.round(Number(overall.conversionRate) * 100))}%`
                  }
                  note={
                    overall.conversionRate == null
                      ? text('noRate')
                      : text('metricNotes.conversionRate')
                  }
                />
                <Metric
                  title={text('winRate')}
                  icon={Percent}
                  value={
                    overall.winRate == null
                      ? '—'
                      : `${toText(Math.round(Number(overall.winRate) * 100))}%`
                  }
                  note={
                    overall.winRate == null
                      ? text('noRate')
                      : text('metricNotes.winRate')
                  }
                />
                <Metric
                  title={text('customers')}
                  icon={Building2}
                  value={Number(overall.customers ?? 0)}
                  note={text('metricNotes.customers', {
                    share: Number(overall.accounts)
                      ? `${toText(Math.round((Number(overall.customers ?? 0) / Number(overall.accounts)) * 100))}%`
                      : '0%',
                  })}
                  onClick={() => openList('accounts', 'customers')}
                />
              </div>
              <Card className='shadow-none'>
                <CardHeader className='flex flex-row items-center justify-between'>
                  <CardTitle className='text-base'>{text('funnel')}</CardTitle>
                  <Link
                    className='text-xs text-muted-foreground hover:text-primary'
                    to='/crm/opportunities'
                  >
                    {text('more')} ↗
                  </Link>
                </CardHeader>
                <CardContent className='space-y-3'>
                  {funnel.map((stage) => (
                    <div
                      key={toText(stage.stage)}
                      className='grid grid-cols-[7rem_1fr_auto] items-center gap-3 text-xs'
                    >
                      <span>{text(`options.${toText(stage.stage)}`)}</span>
                      <div className='h-6 rounded-md bg-muted'>
                        <div
                          className='h-full rounded-md bg-primary/75'
                          style={{
                            width: `${toText((Number(stage.count) / maxCount) * 100)}%`,
                          }}
                        />
                      </div>
                      <span className='text-right tabular-nums'>
                        <span className='font-medium'>
                          {Number(stage.count)}
                        </span>
                        <span className='ml-2 text-muted-foreground'>
                          {moneyTotals(stage.amount, language)}
                        </span>
                      </span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </>,
          )}
          {section(
            text('risks'),
            // The same grid as the other sections, so every group of figures
            // lays out alike: two to a row on a phone, as many as fit wider.
            <div className='grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(10rem,1fr))]'>
              {attentionCards.map((card) => (
                <Metric
                  key={card.key}
                  title={text(card.key)}
                  icon={card.icon}
                  value={Number(attention[card.key] ?? 0)}
                  tone={
                    Number(attention[card.key] ?? 0) > 0
                      ? 'attention'
                      : 'neutral'
                  }
                  note={text(`metricNotes.${card.key}`, {
                    defaultValue: '',
                    days: card.days ? meta?.settings[card.days] : undefined,
                  })}
                  onClick={() => openList(card.entity, card.metric)}
                />
              ))}
            </div>,
          )}
          {section(
            text('monthBusiness'),
            <>
              <div className='grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(10rem,1fr))]'>
                <Metric
                  title={text('newLeads')}
                  icon={Inbox}
                  value={Number(business.newLeads ?? 0)}
                  note={text('metricNotes.newLeads')}
                  onClick={() => openList('leads', 'newThisMonth')}
                />
                <Metric
                  title={text('convertedLeads')}
                  icon={CheckCircle2}
                  value={Number(business.convertedLeads ?? 0)}
                  note={text('metricNotes.convertedLeads')}
                  onClick={() => openList('leads', 'convertedThisMonth')}
                />
                <Metric
                  title={text('wonThisMonth')}
                  icon={Trophy}
                  value={moneyTotals(business.wonThisMonth, language)}
                  note={text('metricNotes.wonThisMonth')}
                  onClick={() => openList('opportunities', 'wonThisMonth')}
                />
                <Metric
                  title={text('completedThisMonth')}
                  icon={CheckCircle2}
                  value={Number(business.completedThisMonth ?? 0)}
                  note={text('metricNotes.completedThisMonth')}
                  onClick={() => openList('activities', 'completedThisMonth')}
                />
                <Metric
                  title={text('churnedThisMonth')}
                  icon={UserMinus}
                  value={Number(business.churnedThisMonth ?? 0)}
                  tone={
                    Number(business.churnedThisMonth ?? 0) > 0
                      ? 'attention'
                      : 'neutral'
                  }
                  note={text('metricNotes.churnedThisMonth', {
                    added: Number(business.newAccounts ?? 0),
                  })}
                  onClick={() => openList('accounts', 'churnedThisMonth')}
                />
                <Metric
                  title={text('approvedThisMonth')}
                  icon={ShieldCheck}
                  value={Number(business.approvedThisMonth ?? 0)}
                  note={text('metricNotes.approvedThisMonth')}
                  onClick={() => openList('approvals', 'approvedThisMonth')}
                />
                <Metric
                  title={text('rejectedThisMonth')}
                  icon={XCircle}
                  value={Number(business.rejectedThisMonth ?? 0)}
                  note={text('metricNotes.rejectedThisMonth', {
                    rate:
                      business.approvalRate == null
                        ? '—'
                        : `${toText(Math.round(Number(business.approvalRate) * 100))}%`,
                  })}
                  onClick={() => openList('approvals', 'rejectedThisMonth')}
                />
              </div>
            </>,
          )}
          {scope === 'team' &&
            section(
              text('teamSection'),
              <div className='space-y-4'>
                {table(
                  'sellers',
                  rows(data.sellers),
                  [
                    ['name', 'owner'],
                    ['pipeline', 'pipeline'],
                    ['wonThisMonth', 'wonThisMonth'],
                    ['uncontacted', 'uncontacted'],
                    ['staleLeads', 'staleLeads'],
                    ['staleAccounts', 'staleAccounts'],
                    ['overdueActivities', 'overdueActivities'],
                  ],
                  (row) => toText(row.id),
                )}
                {/* Side by side only when the section itself is wide enough (72rem),
                    not the screen, and the source table takes the larger share:
                    its five sortable columns need about 690px. */}
                <div className='@container'>
                  <div className='grid gap-4 @6xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]'>
                    {table(
                      'sources',
                      rows(data.sources),
                      [
                        ['source', 'fields.source'],
                        ['leads', 'entities.leads'],
                        ['converted', 'converted'],
                        ['conversionRate', 'conversionRate'],
                        ['won', 'won'],
                      ],
                      (row) => toText(row.source),
                    )}
                    <TrendChart
                      title={text('trends')}
                      rows={rows(data.trends)}
                      language={language}
                      table={
                        <SortableTable
                          rows={rows(data.trends)}
                          rowKey={(row) => toText(row.month)}
                          columns={(
                            [
                              ['month', 'month'],
                              ['won', 'options.won'],
                              ['lost', 'options.lost'],
                            ] as const
                          ).map(([key, label]) => ({
                            id: key,
                            title: text(label),
                            sortValue: (row: Data) =>
                              key === 'month'
                                ? toText(row.month)
                                : Number(row[key] ?? 0),
                            cell: (row: Data) =>
                              key === 'month'
                                ? toText(row.month)
                                : Number(row[key] ?? 0),
                          }))}
                        />
                      }
                    />
                  </div>
                </div>
              </div>,
            )}
        </>
      )}
    </CrmFrame>
  );
}

type AgendaName = 'today' | 'overdue' | 'approvals';
// A workspace card pages in fives: five is what fits under the day's
// heading without scrolling, and the rest comes on request.
const AGENDA_PAGE = 5;

function AgendaCard({
  name,
  scope,
  initial,
  empty,
  to,
  timeZone,
}: {
  name: AgendaName;
  scope: 'mine' | 'team';
  initial: ListData | undefined;
  empty: string;
  to: string;
  timeZone: string;
}): ReactElement {
  const { text, language } = useCrmText();
  const { data: meta } = useMetadata();
  const api = useCrmApi();
  const entity: Entity = name === 'approvals' ? 'approvals' : 'activities';
  // Pages fetched past the first, which came with the workspace itself.
  const [more, setMore] = useState<CrmRecord[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const records = [...(initial?.data ?? []), ...more];
  const total = initial?.total ?? 0;
  const loadMore = async (): Promise<void> => {
    setLoading(true);
    try {
      const next = await api<ListData>(
        `dashboard/${name}?scope=${scope}&page=${toText(page + 1)}&pageSize=${toText(AGENDA_PAGE)}`,
      );
      setMore((all) => [...all, ...next.data]);
      setPage(next.page);
    } finally {
      setLoading(false);
    }
  };
  return (
    <Card className='shadow-none'>
      <CardHeader className='flex flex-row items-center justify-between'>
        <CardTitle className='text-base'>
          {text(
            name === 'approvals'
              ? scope === 'team'
                ? 'pendingApprovalsTeam'
                : 'pendingApprovals'
              : name,
          )}
          <span className='ml-2 text-muted-foreground'>{total}</span>
        </CardTitle>
        <Link to={to} aria-label={text('more')}>
          <ArrowUpRight className='size-4 text-muted-foreground' />
        </Link>
      </CardHeader>
      <CardContent className='space-y-3'>
        {records.length ? (
          records.map((r) => (
            <div
              key={r.id}
              className='border-b pb-3 text-sm last:border-0 last:pb-0'
            >
              <div className='flex items-center gap-2'>
                <Badge variant='outline'>
                  {text(`options.${toText(r.type ?? r.topic)}`, {
                    defaultValue: toText(r.type ?? r.topic),
                  })}
                </Badge>
                <span className='min-w-0 flex-1 truncate'>
                  <RecordLink entity={entity} record={r} />
                </span>
              </div>
              <p className='mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground'>
                <span className='inline-flex items-center gap-1'>
                  <Clock className='size-3 shrink-0' />
                  {localDate(r.startAt ?? r.submittedAt, language, timeZone)}
                </span>
                {/* Whose it is — the same line in both scopes, so the
                      cards read alike: an approval names its applicant and
                      approver, an activity its owner. */}
                {name === 'approvals' ? (
                  <>
                    <span className='inline-flex items-center gap-1'>
                      <User className='size-3 shrink-0' />
                      {toText(
                        meta?.users.find((u) => u.id === r.ownerId)?.name,
                      )}
                    </span>
                    <span className='inline-flex items-center gap-1'>
                      <ShieldCheck className='size-3 shrink-0' />
                      {toText(
                        meta?.users.find((u) => u.id === r.approverId)?.name,
                      )}
                    </span>
                  </>
                ) : (
                  <span className='inline-flex items-center gap-1'>
                    <User className='size-3 shrink-0' />
                    {meta?.users.find((u) => u.id === r.ownerId)?.name}
                  </span>
                )}
              </p>
              {entity === 'activities' && meta?.assistant && (
                <div className='mt-1 flex gap-1'>
                  {(['prepareActivity', 'reportActivity'] as const).map(
                    (key) => (
                      <Button
                        key={key}
                        size='sm'
                        variant='ghost'
                        className='h-7 px-2 text-xs text-ai hover:text-ai'
                        onClick={() =>
                          window.dispatchEvent(
                            new CustomEvent('crm-assistant', {
                              detail: {
                                prompt: text(`prompts.${key}`),
                                entity: 'activities',
                                recordId: r.id,
                                send: key === 'prepareActivity',
                              },
                            }),
                          )
                        }
                      >
                        <Sparkles />
                        {text(key)}
                      </Button>
                    ),
                  )}
                </div>
              )}
            </div>
          ))
        ) : (
          <p className='py-2 text-sm text-muted-foreground'>{empty}</p>
        )}
        {records.length < total && (
          <Button
            variant='ghost'
            size='sm'
            className='w-full'
            disabled={loading}
            onClick={() => void loadMore()}
          >
            {text('loadMore')}
            <span className='ml-1 tabular-nums text-muted-foreground'>
              {total - records.length}
            </span>
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
