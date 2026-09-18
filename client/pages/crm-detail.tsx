import {
  fieldLabelKey,
  linkOf,
  PAGE_SIZE,
  sentence,
  toText,
} from '../components/crm/api.js';
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
} from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router';
import { Sheet, SheetContent, SheetTitle } from '../components/ui/sheet.js';
import {
  RecordDrawerContext,
  useRecordDrawer,
  useRecordLink,
  type RecordDrawerApi,
} from '../components/crm/record-drawer.js';
import {
  ArrowLeft,
  ArrowRightLeft,
  ArrowUpRight,
  Briefcase,
  Building2,
  CalendarPlus,
  CircleDot,
  Factory,
  FileText,
  Globe,
  History,
  Mail,
  MapPin,
  MapPinned,
  Megaphone,
  Download,
  Maximize2,
  X,
  Paperclip,
  Phone,
  Plus,
  Sparkles,
  Trash2,
  type LucideIcon,
  Upload,
  User,
  Users,
} from 'lucide-react';
import { Button } from '../components/ui/button.js';
import { Badge } from '../components/ui/badge.js';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '../components/ui/card.js';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../components/ui/dialog.js';
import {
  useCrmApi,
  useCrmQuery,
  useMore,
  useCrmText,
  useMetadata,
  useRefresh,
  localDate,
  rows,
  arrayValues,
  errorCode,
  type Entity,
  type Data,
  type Detail,
  type Field,
  type CrmRecord,
} from '../components/crm/api.js';
import {
  CrmFrame,
  Loading,
  ErrorNotice,
  RecordLink,
  Status,
  Value,
} from '../components/crm/common.js';
import { RecordForm } from '../components/crm/form.js';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useQuery } from '@tanstack/react-query';
import EntityDetail from './crm-entity-detail.js';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu.js';
import { InlineField } from '../components/crm/inline.js';
import { ConvertDialog } from '../components/crm/conversion.js';

const drawerEntities: Entity[] = [
  'leads',
  'accounts',
  'contacts',
  'opportunities',
  'activities',
  'approvals',
];

export default function CrmDetailPage(): ReactElement {
  const params = useParams();
  const navigate = useNavigate();
  // The record shown in the drawer lives in the URL ("?open=entity/id"),
  // so a reload, the back button and a copied link all restore it.
  const [searchParams, setSearchParams] = useSearchParams();
  const opened = toText(searchParams.get('open') ?? '');
  const open = useCallback<RecordDrawerApi['open']>(
    (target, id) => {
      // A phone has no room for a drawer over a page: go to the record.
      if (window.matchMedia('(max-width: 767px)').matches) {
        void navigate(`/crm/${toText(target)}/${toText(id)}`);
        return;
      }
      setSearchParams((previous) => {
        const next = new URLSearchParams(previous);
        next.set('open', `${toText(target)}/${toText(id)}`);
        return next;
      });
    },
    [navigate, setSearchParams],
  );
  const close = useCallback(() => {
    setSearchParams((previous) => {
      const next = new URLSearchParams(previous);
      next.delete('open');
      return next;
    });
  }, [setSearchParams]);
  const entity = params.entity as Entity;
  const key = `${toText(params.entity)}/${toText(params.id)}`;
  // The route can render once more with empty params while it is being left
  // (after a delete); without both there is nothing to load.
  if (!params.entity || !params.id) return <></>;
  return (
    <RecordDrawerContext.Provider value={{ open, close, inDrawer: false }}>
      {entity === 'leads' ? (
        <LeadDetail key={key} id={params.id} />
      ) : (
        <EntityDetail key={key} entity={entity} id={params.id} />
      )}
      <RecordDrawer target={opened} open={open} close={close} />
    </RecordDrawerContext.Provider>
  );
}

// The drawer a detail page opens other records in: the same detail
// component as the full page, over the page the reader came from. Links
// inside it replace what it shows (the back button steps back through
// them), and the toolbar offers the full page.
function RecordDrawer({
  target,
  open,
  close,
}: {
  target: string;
  open: RecordDrawerApi['open'];
  close: () => void;
}): ReactElement {
  const { text } = useCrmText();
  const [entity, id] = target.split('/') as [Entity, string | undefined];
  const valid = Boolean(id) && drawerEntities.includes(entity);
  return (
    <Sheet open={valid} onOpenChange={(next) => !next && close()}>
      <SheetContent
        side='right'
        showCloseButton={false}
        // The primitive sizes a right sheet with side-scoped classes, so the
        // wider drawer has to override them at the same specificity.
        className='gap-0 overflow-y-auto p-0 data-[side=right]:w-full data-[side=right]:sm:max-w-none data-[side=right]:md:w-[72vw] data-[side=right]:lg:w-[64vw] data-[side=right]:xl:w-[56vw] data-[side=right]:2xl:max-w-[1100px]'
      >
        {valid && (
          <RecordDrawerContext.Provider value={{ open, close, inDrawer: true }}>
            <div className='sticky top-0 z-10 flex items-center gap-2 border-b bg-popover/95 px-4 py-2 backdrop-blur'>
              <SheetTitle className='flex-1 text-sm text-muted-foreground'>
                {text(`entities.${toText(entity)}`)}
              </SheetTitle>
              <Button
                variant='ghost'
                size='sm'
                nativeButton={false}
                render={<Link to={`/crm/${toText(entity)}/${toText(id)}`} />}
              >
                <Maximize2 />
                {text('openFullPage')}
              </Button>
              <Button
                variant='ghost'
                size='icon-sm'
                aria-label={text('close')}
                onClick={close}
              >
                <X />
              </Button>
            </div>
            {entity === 'leads' ? (
              <LeadDetail key={target} id={toText(id)} />
            ) : (
              <EntityDetail key={target} entity={entity} id={toText(id)} />
            )}
          </RecordDrawerContext.Provider>
        )}
      </SheetContent>
    </Sheet>
  );
}
const leadFieldIcons: Record<string, LucideIcon> = {
  name: User,
  phone: Phone,
  email: Mail,
  jobTitle: Briefcase,
  company: Building2,
  website: Globe,
  industry: Factory,
  region: MapPin,
  message: FileText,
  source: Megaphone,
  companyDescription: Building2,
  employees: Users,
  address: MapPinned,
};

// Name and company are the page heading, edited there, so not listed here.
const leadFields = [
  'phone',
  'email',
  'jobTitle',
  'website',
  'industry',
  'employees',
  'region',
  'address',
  'message',
  'source',
  'companyDescription',
] as const;

function LeadDetail({ id }: { id: string }): ReactElement {
  const {
    data: detail,
    error: loadError,
    isLoading,
  } = useCrmQuery<Detail>(`leads/${toText(id)}`);
  const { data: meta } = useMetadata();
  const api = useCrmApi();
  const refresh = useRefresh();
  const navigate = useNavigate();
  const drawer = useRecordDrawer();
  const { text, language } = useCrmText();
  const [tab, setTab] = useState('activities');
  // The activities and the history arrive one page each with the lead;
  // these grow them from the list and history endpoints.
  const moreActivities = useMore(
    `activities?leadId=${toText(id)}&sort=-startAt`,
    detail?.related.activities
      ? {
          data: rows(detail.related.activities) as CrmRecord[],
          total:
            detail.relatedTotals?.activities ??
            rows(detail.related.activities).length,
        }
      : undefined,
  );
  const moreHistory = useMore<Data>(
    `leads/${toText(id)}/history`,
    detail
      ? {
          data: detail.history,
          total: detail.historyTotal ?? detail.history.length,
        }
      : undefined,
  );
  const [uploading, setUploading] = useState(false);
  // History records attachments as ids; one lookup for everything on screen
  // turns "Attachments 3" into the actual filenames. Declared with the other
  // hooks so it runs before this component's early returns.
  const historyFileIds = [
    ...new Set(
      moreHistory.records
        .flatMap((event) =>
          arrayValues((event.changes as Data | undefined)?.attachments).map(
            toText,
          ),
        )
        .filter(Boolean),
    ),
  ];
  const { data: historyFiles } = useCrmQuery<
    { id: string; filename: string }[]
  >(
    `files?ids=${encodeURIComponent(historyFileIds.join(','))}`,
    historyFileIds.length > 0,
  );
  const fileNames = Object.fromEntries(
    (historyFiles ?? []).map((file) => [file.id, file.filename]),
  );
  const [form, setForm] = useState<{ entity: Entity; initial: Data }>();
  const [convert, setConvert] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<unknown>();
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent('crm-context', {
        detail: { entity: 'leads', recordId: id },
      }),
    );
    return () => {
      window.dispatchEvent(new CustomEvent('crm-context', { detail: {} }));
    };
  }, [id]);
  if (isLoading || !meta) return <Loading />;
  if (!detail)
    return (
      <CrmFrame title={text('entities.leads')}>
        <ErrorNotice error={loadError} />
      </CrmFrame>
    );
  const record = detail.record;
  const definition = meta.definitions.leads;
  const editable = detail.permissions.edit;
  // Names for everything this page links to, resolved by the server with
  // the record itself.
  const names = {
    ...detail.titles,
    ...moreActivities.titles,
    ...moreHistory.titles,
  };
  const field = (key: string): Field =>
    definition.fields.find((f) => f.key === key) ?? { key, type: 'text' };
  // Newest first by when the activity happens, not when the row was written:
  // a call logged today for last week belongs below tomorrow's meeting.
  // slice() first — sorting in place would mutate the cached query data.
  // Same de-duplication the attachments tab uses, so the count matches the list.
  const attachmentCount = new Set([
    ...arrayValues(record.attachments).map(toText),
    ...rows(detail.related.activities).flatMap((activity) =>
      arrayValues(activity.attachments).map(toText),
    ),
  ]).size;
  // Newest first by when they happen, in the server's order so pages join.
  const activities = moreActivities.records;
  const converted = record.status === 'converted';
  const patch = async (values: Data): Promise<void> => {
    await api(`leads/${toText(id)}`, 'PATCH', values);
    await refresh();
  };
  // Deleting the lead takes its lead-only activities with it; ones that also
  // hang off an account or opportunity survive, so the confirmation can state
  // both outcomes without asking the server first.
  const cascadedActivities = activities.filter(
    (activity) => !activity.accountId && !activity.opportunityId,
  );
  const keptActivities = activities.filter(
    (activity) => activity.accountId ?? activity.opportunityId,
  );
  const inline = (key: string): ReactElement => (
    <InlineField
      entity='leads'
      record={record}
      field={field(key)}
      editable={editable}
      lookup={names}
      label={text(fieldLabelKey('leads', key))}
    />
  );
  return (
    <CrmFrame
      // "name / company", both edited in place; the card below omits them.
      title={
        <span className='-mx-2 flex flex-wrap items-center'>
          <InlineField
            entity='leads'
            record={record}
            field={field('name')}
            editable={editable}
            label={text(fieldLabelKey('leads', 'name'))}
            size='title'
          />
          <span className='text-muted-foreground/60'>/</span>
          <InlineField
            entity='leads'
            record={record}
            field={field('company')}
            editable={editable}
            label={text(fieldLabelKey('leads', 'company'))}
            size='title'
          />
        </span>
      }
      description={
        <span className='flex flex-wrap items-center gap-x-2 gap-y-1'>
          <Link
            className='inline-flex items-center gap-1 hover:text-foreground'
            to='/crm/leads'
          >
            <ArrowLeft className='size-3.5' />
            {text('back')}
          </Link>
          <span aria-hidden className='text-muted-foreground/50'>
            ·
          </span>
          <span>
            {text('leadIdPrefix')}: {toText(record.id)}
          </span>
        </span>
      }
      // The page-level assistant entry is the lead-specific one: it opens the
      // same panel with a follow-up prompt already typed.
      assistant={false}
      actions={
        <>
          {detail.permissions.delete && (
            <Button variant='outline' onClick={() => setConfirmDelete(true)}>
              <Trash2 />
              {text('deleteRecord', { entity: text('entity.leads') })}
            </Button>
          )}
          {editable && (
            <Button onClick={() => setConvert(true)}>
              <ArrowRightLeft />
              {text('convert')}
            </Button>
          )}
          {!converted && (
            // The two assistant entries read as one group, tighter than the
            // gap between the primary actions.
            <div className='flex items-center'>
              {(['leads', 'researchCompany', 'assessConversion'] as const).map(
                (key) => (
                  <Button
                    key={key}
                    variant='ghost'
                    className='text-ai hover:text-ai'
                    onClick={() =>
                      window.dispatchEvent(
                        new CustomEvent('crm-assistant', {
                          detail: {
                            prompt: text(`prompts.${key}`),
                            entity: 'leads',
                            recordId: id,
                            send: true,
                            // Background research alone looks outside the CRM.
                            webSearch: key === 'researchCompany',
                          },
                        }),
                      )
                    }
                  >
                    <Sparkles />
                    {text(key === 'leads' ? 'followUpLead' : key)}
                  </Button>
                ),
              )}
            </div>
          )}
        </>
      }
    >
      <ErrorNotice error={error ?? loadError} />
      <div className='flex flex-wrap items-center gap-x-8 gap-y-2 rounded-xl border bg-card p-4'>
        <LeadRow label={text('fields.ownerId')} icon={User}>
          {inline('ownerId')}
        </LeadRow>
        <LeadRow label={text('fields.status')} icon={CircleDot}>
          <LeadStatusField
            record={record}
            editable={editable}
            statuses={(field('status').options ?? []).map((value) => ({
              value,
              label: text(`options.${toText(value)}`, { defaultValue: value }),
            }))}
            reasons={(
              meta.settings.options.invalidReason ??
              field('invalidReason').options ??
              []
            ).map((value) => ({
              value,
              label: text(`options.${toText(value)}`, { defaultValue: value }),
            }))}
            onSave={patch}
          />
        </LeadRow>
        <LeadRow label={text('fields.createdAt')} icon={CalendarPlus}>
          <div className='px-2 py-1.5 text-sm'>
            {localDate(record.createdAt, language, meta.settings.timeZone)}
          </div>
        </LeadRow>
        {/* A converted lead is frozen, so its last update is the conversion:
            showing both would be the same moment twice. */}
        <LeadRow
          label={text(converted ? 'fields.convertedAt' : 'fields.updatedAt')}
          icon={converted ? ArrowRightLeft : History}
        >
          <div className='px-2 py-1.5 text-sm'>
            {localDate(
              converted ? record.convertedAt : record.updatedAt,
              language,
              meta.settings.timeZone,
            )}
          </div>
        </LeadRow>
      </div>
      {converted && (
        <div className='flex gap-3 rounded-xl border border-primary/30 bg-primary/5 p-4'>
          <ArrowRightLeft className='mt-0.5 size-4 shrink-0 text-primary' />
          <div className='min-w-0 flex-1 space-y-3'>
            <p className='text-sm text-muted-foreground'>
              {text('convertedHint')}
            </p>
            {/* A fixed grid, not a wrapping row: the three slots keep their
                columns so the labels line up, and an empty one is shown rather
                than dropped — "no opportunity" is itself worth seeing. */}
            <dl className='grid gap-x-6 gap-y-3 sm:grid-cols-3'>
              {[
                ['accounts', 'convertedAccountId'],
                ['contacts', 'convertedContactId'],
                ['opportunities', 'convertedOpportunityId'],
              ].map(([e, key]) => (
                <div className='flex min-w-0 items-center gap-2' key={key}>
                  <dt className='shrink-0 text-xs text-muted-foreground'>
                    {text(`entities.${toText(e)}`)}
                  </dt>
                  <dd className='min-w-0 flex-1 truncate text-sm'>
                    {record[key] ? (
                      <RecordLink
                        entity={e as Entity}
                        record={{
                          id: toText(record[key]),
                          name:
                            names[toText(record[key])] ??
                            text(`entities.${toText(e)}`),
                        }}
                      />
                    ) : (
                      <span className='text-muted-foreground'>—</span>
                    )}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      )}
      {/* Container query, not a viewport one: opening the AI panel narrows this
          area without changing the viewport, and a viewport breakpoint would
          keep both columns in a box too small for them. */}
      <div className='@container'>
        <div className='grid items-start gap-6 @3xl:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]'>
          <Card className='shadow-none'>
            <CardHeader>
              <CardTitle>
                {sentence(text('basicInfo', { entity: text('entity.leads') }))}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <dl className='divide-y'>
                {leadFields.map((key) => (
                  <div
                    key={key}
                    className='grid grid-cols-[8rem_minmax(0,1fr)] items-start gap-2 py-2'
                  >
                    <dt className='flex items-center gap-1.5 px-2 py-1.5 text-xs font-medium text-muted-foreground'>
                      {(() => {
                        const Icon = leadFieldIcons[key];
                        return Icon ? (
                          <Icon className='size-3.5 shrink-0' />
                        ) : null;
                      })()}
                      <span className='min-w-0 leading-snug'>
                        {text(
                          key === 'region'
                            ? 'region'
                            : fieldLabelKey('leads', key),
                        )}
                      </span>
                    </dt>
                    <dd className='min-w-0 text-sm'>
                      {key === 'region' ? (
                        <div className='flex flex-wrap items-center'>
                          {['country', 'state', 'city'].map((part, index) => (
                            <div
                              className='flex min-w-0 items-center'
                              key={part}
                            >
                              {index > 0 && (
                                <span
                                  aria-hidden
                                  className='text-muted-foreground/60'
                                >
                                  /
                                </span>
                              )}
                              {inline(part)}
                            </div>
                          ))}
                        </div>
                      ) : key === 'website' ? (
                        <WebsiteField
                          record={record}
                          editable={editable}
                          label={text('fields.website')}
                        />
                      ) : (
                        inline(key)
                      )}
                    </dd>
                  </div>
                ))}
              </dl>
            </CardContent>
          </Card>
          <Card className='shadow-none'>
            <CardHeader className='gap-3'>
              <div className='flex flex-wrap items-center justify-between gap-2'>
                {/* Ghost buttons carry px-2.5 for their hover target, which
                    pushes the label off the content edge below. Pulling the row
                    left by that padding lines the label up with the list. */}
                <div className='-ml-2.5 flex gap-1'>
                  {(
                    [
                      [
                        'activities',
                        'entities.activities',
                        moreActivities.total,
                      ],
                      ['attachments', 'fields.attachments', attachmentCount],
                      ['historyTab', 'historyTab', moreHistory.total],
                    ] as const
                  ).map(([name, label, count]) => (
                    <Button
                      key={name}
                      size='sm'
                      variant={name === tab ? 'secondary' : 'ghost'}
                      onClick={() => setTab(name)}
                    >
                      {text(label)}
                      <span className='text-muted-foreground'>{count}</span>
                    </Button>
                  ))}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {tab === 'activities' ? (
                <div className='space-y-3'>
                  {/* Scheduling lives inside its tab, the way upload lives in
                    attachments. A converted lead rejects it server-side. */}
                  {!converted &&
                    Boolean(meta.permissions.activities.create) && (
                      <Button
                        size='sm'
                        variant='outline'
                        onClick={() =>
                          setForm({
                            entity: 'activities',
                            initial: { leadId: id },
                          })
                        }
                      >
                        <Plus />
                        {text('newActivity')}
                      </Button>
                    )}
                  {!activities.length ? (
                    <p className='text-sm text-muted-foreground'>
                      {text('noActivities')}
                    </p>
                  ) : (
                    <>
                      {/* One continuous rule down the list; each item hangs a node on it. */}
                      <ol className='relative ml-1.5 border-l border-border'>
                        {activities.map((activity) => (
                          <ActivityItem
                            key={toText(activity.id)}
                            activity={activity}
                            titles={names}
                            names={detail.names}
                          />
                        ))}
                      </ol>
                      {moreActivities.hasMore && (
                        <Button
                          className='mt-3'
                          variant='ghost'
                          size='sm'
                          disabled={moreActivities.loading}
                          onClick={() => void moreActivities.loadMore()}
                        >
                          {text('loadMore')} ·{' '}
                          {moreActivities.total - activities.length}
                        </Button>
                      )}
                    </>
                  )}
                </div>
              ) : tab === 'attachments' ? (
                <RecordAttachments
                  entity='leads'
                  record={record}
                  activities={activities}
                  editable={editable}
                  onError={setError}
                  uploader={
                    editable ? (
                      <UploadZone
                        entity='leads'
                        record={record}
                        busy={uploading}
                        setBusy={setUploading}
                        onError={setError}
                      />
                    ) : undefined
                  }
                />
              ) : (
                <>
                  <ol>
                    {moreHistory.records.map((event) => (
                      // Read as a log: fixed time and actor columns frame a
                      // flexible middle, so the eye can scan one column at a
                      // time instead of re-parsing each row.
                      <li
                        className='flex items-baseline gap-3 border-b border-border/60 py-1.5 text-sm last:border-0'
                        key={toText(event.id)}
                      >
                        <span className='flex min-w-0 flex-1 flex-wrap items-baseline gap-x-2 gap-y-0.5'>
                          <span
                            className={
                              event.fromValue
                                ? 'font-medium'
                                : 'text-muted-foreground'
                            }
                          >
                            {text(`events.${toText(event.action)}`)}
                            {event.fromValue
                              ? ` · ${toText(text(`options.${toText(event.fromValue)}`, { defaultValue: toText(event.fromValue) }))} → ${toText(text(`options.${toText(event.toValue)}`, { defaultValue: toText(event.toValue) }))}`
                              : ''}
                          </span>
                          <HistoryChanges
                            record={record}
                            changes={event.changes}
                            movedField={event.fromValue ? 'status' : undefined}
                            names={names}
                            fileNames={fileNames}
                          />
                        </span>
                        {/* Who and when are the same kind of context, so they
                            sit together on the right and leave the left edge to
                            what actually changed. */}
                        <span className='shrink-0 text-right text-xs text-muted-foreground tabular-nums'>
                          {meta.users.find((u) => u.id === event.actorId)?.name}{' '}
                          ·{' '}
                          {localDate(
                            event.createdAt,
                            language,
                            meta.settings.timeZone,
                          )}
                        </span>
                      </li>
                    ))}
                  </ol>
                  {moreHistory.hasMore && (
                    <Button
                      className='mt-3'
                      variant='ghost'
                      size='sm'
                      disabled={moreHistory.loading}
                      onClick={() => void moreHistory.loadMore()}
                    >
                      {text('loadMore')} ·{' '}
                      {moreHistory.total - moreHistory.records.length}
                    </Button>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
      {form && <RecordForm {...form} onClose={() => setForm(undefined)} />}
      {convert && (
        <ConvertDialog lead={record} onClose={() => setConvert(false)} />
      )}
      {confirmDelete && (
        <Dialog
          open
          onOpenChange={(v) => {
            if (!v && !busy) setConfirmDelete(false);
          }}
        >
          <DialogContent showCloseButton={false}>
            <DialogHeader>
              <DialogTitle>
                {text('deleteRecordTitle', {
                  entity: text('entity.leads'),
                  name: `${toText(record.name)}${record.company ? ` / ${toText(record.company)}` : ''}`,
                })}
              </DialogTitle>
              {/* Not the shared hint: it tells the reader to unlink related
                  records first, which is no longer how leads behave. */}
              <DialogDescription>{text('deleteLeadHint')}</DialogDescription>
              {cascadedActivities.length > 0 && (
                <p className='text-sm text-destructive'>
                  {text('deleteLeadActivities', {
                    count: cascadedActivities.length,
                  })}
                </p>
              )}
              {keptActivities.length > 0 && (
                <p className='text-sm text-muted-foreground'>
                  {text('deleteLeadKeptActivities', {
                    count: keptActivities.length,
                  })}
                </p>
              )}
            </DialogHeader>
            <ErrorNotice error={error} />
            <DialogFooter>
              <Button
                variant='outline'
                disabled={busy}
                onClick={() => setConfirmDelete(false)}
              >
                {text('cancel')}
              </Button>
              <Button
                variant='destructive'
                disabled={busy}
                onClick={() => {
                  void (async () => {
                    setBusy(true);
                    setError(undefined);
                    try {
                      await api(`leads/${toText(id)}`, 'DELETE');
                      // Leave first: refreshing while still on the page
                      // refetches the record that no longer exists.
                      if (drawer?.inDrawer) drawer.close();
                      else void navigate('/crm/leads');
                      void refresh();
                    } catch (e) {
                      setError(e);
                    } finally {
                      setBusy(false);
                    }
                  })();
                }}
              >
                {busy ? text('saving') : text('confirm')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </CrmFrame>
  );
}

// Status and its invalid reason are one decision: the server refuses an invalid
// lead without a reason, so picking "invalid" cascades straight into the reason
// list and only that choice commits both fields.
function LeadStatusField({
  record,
  editable,
  statuses,
  reasons,
  onSave,
}: {
  record: CrmRecord;
  editable: boolean;
  statuses: { value: string; label: string }[];
  reasons: { value: string; label: string }[];
  onSave: (values: Data) => Promise<void>;
}): ReactElement {
  const { text } = useCrmText();
  const [error, setError] = useState('');
  const commit = async (values: Data): Promise<void> => {
    try {
      await onSave(values);
      setError('');
    } catch (cause) {
      setError(text(`errors.${errorCode(cause).code}`, { defaultValue: '' }));
    }
  };
  const trigger = (
    <span className='flex items-center gap-2'>
      <Status value={record.status} />
      {record.status === 'invalid' && record.invalidReason ? (
        <span className='text-sm text-muted-foreground'>
          {text(`options.${toText(record.invalidReason)}`, {
            defaultValue: toText(record.invalidReason),
          })}
        </span>
      ) : null}
      {error ? <span className='text-xs text-destructive'>{error}</span> : null}
    </span>
  );
  if (!editable) return <div className='px-2 py-1.5'>{trigger}</div>;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={text('fields.status')}
        className='flex w-full items-center rounded-md px-2 py-1.5 text-left transition-colors hover:bg-muted'
      >
        {trigger}
      </DropdownMenuTrigger>
      <DropdownMenuContent align='start'>
        {statuses
          .filter((option) => option.value !== 'invalid')
          .map((option) => (
            <DropdownMenuItem
              key={option.value}
              onClick={() =>
                void commit({ status: option.value, invalidReason: null })
              }
            >
              {option.label}
            </DropdownMenuItem>
          ))}
        {/* A submenu rather than a replacement list: the statuses stay on screen,
            and no reason can be skipped because only its items commit. */}
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            {statuses.find((option) => option.value === 'invalid')?.label ??
              text('options.invalid')}
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            {reasons.map((reason) => (
              <DropdownMenuItem
                key={reason.value}
                onClick={() =>
                  void commit({
                    status: 'invalid',
                    invalidReason: reason.value,
                  })
                }
              >
                {reason.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuSubContent>
        </DropdownMenuSub>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function LeadRow({
  label,
  icon: Icon,
  children,
}: {
  label: string;
  icon?: LucideIcon;
  children: ReactElement;
}): ReactElement {
  return (
    <div className='flex min-w-0 items-center gap-2'>
      <span className='flex shrink-0 items-center gap-1.5 text-xs font-medium text-muted-foreground'>
        {Icon ? <Icon className='size-3.5 shrink-0' /> : null}
        {label}
      </span>
      <div className='min-w-0 flex-1'>{children}</div>
    </div>
  );
}

// The one field where clicking the value opens a link instead of editing it.
// Double-clicking the row (beside the link text) or Enter / F2 with focus
// opens the editor, the same gesture as every other field.
export function WebsiteField({
  entity = 'leads',
  record,
  editable,
  label,
}: {
  entity?: Entity;
  record: CrmRecord;
  editable: boolean;
  label: string;
}): ReactElement {
  const { text } = useCrmText();
  const [editing, setEditing] = useState(false);
  const url = toText(record.website);
  const href = linkOf(url);
  if (editing || !href)
    return (
      <InlineField
        entity={entity}
        record={record}
        field={{ key: 'website', type: 'url' }}
        editable={editable}
        label={label}
      />
    );
  return (
    <div
      role={editable ? 'button' : undefined}
      tabIndex={editable ? 0 : undefined}
      aria-label={editable ? label : undefined}
      className={`rounded-md px-2 py-1.5 ${toText(
        editable
          ? 'cursor-text transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none'
          : '',
      )}`}
      onDoubleClick={editable ? () => setEditing(true) : undefined}
      onKeyDown={(event) => {
        if (editable && (event.key === 'Enter' || event.key === 'F2')) {
          event.preventDefault();
          setEditing(true);
        }
      }}
    >
      {/* The link is inline, so the rest of the row stays a plain surface a
          double-click can land on without opening the site. */}
      <a
        className='text-sm text-primary hover:underline'
        href={href}
        target='_blank'
        rel='noopener noreferrer'
        title={url}
        aria-label={`${toText(label)}: ${toText(text('openWebsite'))}`}
        onDoubleClick={(e) => e.stopPropagation()}
      >
        {url}
      </a>
    </div>
  );
}

export function ActivityItem({
  activity,
  titles = {},
  names: bareNames = {},
}: {
  activity: Data;
  // Resolved by the server with the page this item sits on: composed
  // titles for links, bare names for the participants.
  titles?: Record<string, string>;
  names?: Record<string, string>;
}): ReactElement {
  const { text, language } = useCrmText();
  const activityLink = useRecordLink('activities', toText(activity.id));
  const { data: meta } = useMetadata();
  const names = titles;
  // External participants are shown by bare name: the activity's account is
  // already on screen, so "name / account" would only repeat it.
  const contactNames = bareNames;
  const [open, setOpen] = useState(false);
  const [activityError, setActivityError] = useState<unknown>();
  const status = toText(activity.status);
  // Mirrors the server rule for activities: the owner edits their own, a manager
  // edits any.
  const editable = Boolean(
    meta && (meta.manage || activity.ownerId === meta.userId),
  );
  const activityField = (key: string): Field =>
    meta?.definitions.activities.fields.find((f) => f.key === key) ?? {
      key,
      type: 'text',
    };
  // External participants come from the activity's account, as in the form.
  const editableField = (key: string): ReactElement => (
    <InlineField
      entity='activities'
      record={activity as CrmRecord}
      field={activityField(key)}
      editable={editable}
      lookup={key === 'externalParticipants' ? contactNames : names}
      relationFilter={
        activity.accountId
          ? { accountId: toText(activity.accountId) }
          : undefined
      }
      label={text(fieldLabelKey('activities', key))}
    />
  );
  return (
    <li className='relative pl-5'>
      <span
        aria-hidden
        className={`absolute top-4 left-0 size-2.5 -translate-x-1/2 rounded-full border-2 border-card ${toText(
          status === 'completed'
            ? 'bg-primary'
            : status === 'cancelled' || status === 'noShow'
              ? 'bg-muted-foreground/40'
              : 'bg-background ring-2 ring-primary/40',
        )}`}
      />
      <button
        type='button'
        className='w-full rounded-md px-2 py-2 text-left transition-colors hover:bg-muted'
        onClick={() => setOpen((v) => !v)}
      >
        <div className='flex flex-wrap items-center gap-2'>
          <Badge variant='outline'>
            {text(`options.${toText(activity.type)}`, {
              defaultValue: toText(activity.type),
            })}
          </Badge>
          <span className='min-w-0 flex-1 truncate text-sm font-medium'>
            {toText(activity.name)}
          </span>
          <Status value={activity.status} />
        </div>
        <p className='mt-1 text-xs text-muted-foreground'>
          {localDate(
            activity.startAt,
            language,
            meta?.settings.timeZone ?? 'Asia/Shanghai',
          )}
        </p>
      </button>
      {/* An upcoming activity can be prepared for and reported on; a finished
          one can still have its feedback added to. Cancelled and no-show ones
          have neither. Both buttons pre-fill the assistant and leave sending
          to the user, so "feedback" is finished in their own words. */}
      {(status === 'planned' || status === 'completed') && (
        <div className='mt-0.5 flex gap-1 px-2 pb-1'>
          {(status === 'planned'
            ? (['prepareActivity', 'reportActivity'] as const)
            : (['reportActivity'] as const)
          ).map((key) => (
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
                      recordId: activity.id,
                      // "Report back" is only an opening the user completes.
                      send: key === 'prepareActivity',
                    },
                  }),
                )
              }
            >
              <Sparkles />
              {text(key)}
            </Button>
          ))}
        </div>
      )}
      {open && (
        <div className='mt-1 mb-4 divide-y divide-border rounded-md bg-muted/40 px-3 py-0.5 text-sm [&>*]:py-1.5'>
          <dl className='grid gap-x-3 gap-y-1 sm:grid-cols-[7rem_minmax(0,1fr)]'>
            {['type', 'name'].map((key) => (
              <div key={key}>
                <dt className='px-2 text-xs text-muted-foreground'>
                  {text(fieldLabelKey('activities', key))}
                </dt>
                <dd>{editableField(key)}</dd>
              </div>
            ))}
          </dl>
          <dl className='grid gap-x-3 gap-y-1 sm:grid-cols-[7rem_minmax(0,1fr)]'>
            <div>
              <dt className='px-2 text-xs text-muted-foreground'>
                {text('fields.status')}
              </dt>
              <dd>{editableField('status')}</dd>
            </div>
            {/* One "time" cell: start and end read as a range, each half
                still editable on its own. */}
            <div>
              <dt className='px-2 text-xs text-muted-foreground'>
                {text('fields.time')}
              </dt>
              {/* The inline editor is full-width by default; here each half
                  shrinks to its value so the two sit on one line. */}
              <dd className='flex flex-wrap items-center [&>div>div]:w-auto'>
                <div>{editableField('startAt')}</div>
                <span className='text-muted-foreground'>–</span>
                <div>{editableField('endAt')}</div>
              </dd>
            </div>
          </dl>
          {['description', 'feedback'].map((key) => (
            <div key={key}>
              <p className='px-2 text-xs text-muted-foreground'>
                {text(fieldLabelKey('activities', key))}
              </p>
              {editableField(key)}
            </div>
          ))}
          <Attachments
            entity='activities'
            record={activity}
            editable={editable}
            onError={setActivityError}
          />
          <dl className='grid gap-x-3 gap-y-1 sm:grid-cols-3'>
            <div>
              <dt className='px-2 text-xs text-muted-foreground'>
                {text('fields.ownerId')}
              </dt>
              <dd>{editableField('ownerId')}</dd>
            </div>
            {['internalParticipants', 'externalParticipants'].map((key) => (
              <div key={key}>
                <dt className='px-2 text-xs text-muted-foreground'>
                  {text(`fields.${key}`)}
                </dt>
                <dd>{editableField(key)}</dd>
              </div>
            ))}
          </dl>
          <ErrorNotice error={activityError} />
          <Link
            className='mx-2 inline-flex items-center gap-1 font-medium hover:text-primary hover:underline'
            {...activityLink}
          >
            {text('viewDetails')}
            <ArrowUpRight className='size-3 text-muted-foreground' />
          </Link>
        </div>
      )}
    </li>
  );
}

interface CrmFile {
  id: string;
  filename: string;
  createdAt: string;
  // The stored type when the browser can show it inline, otherwise null.
  mimeType: string | null;
  size: number | null;
  url: string;
}

// "1.2 MB" style sizes for the preview's subtitle.
function fileSize(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB'];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${unit ? value.toFixed(1) : String(value)} ${units[unit]}`;
}

// A Markdown attachment, fetched as text and rendered on the client. HTML
// inside it is escaped rather than rendered, so an upload cannot run
// anything in the page.
function MarkdownPreview({ url }: { url: string }): ReactElement {
  const { text } = useCrmText();
  const { data, error, isLoading } = useQuery({
    queryKey: ['crm', 'file-text', url],
    queryFn: async () => {
      const response = await fetch(url, { credentials: 'same-origin' });
      if (!response.ok) throw new Error(String(response.status));
      return response.text();
    },
    staleTime: 60000,
  });
  if (isLoading)
    return <p className='text-sm text-muted-foreground'>{text('loading')}</p>;
  if (error || data === undefined)
    return (
      <p className='rounded-md border border-dashed px-4 py-8 text-center text-sm text-muted-foreground'>
        {text('noPreview')}
      </p>
    );
  return (
    <div className='min-h-0 flex-1 overflow-auto rounded-md border px-5 py-4 text-sm leading-relaxed [&_a]:text-primary [&_a]:underline [&_blockquote]:border-l-2 [&_blockquote]:pl-3 [&_blockquote]:text-muted-foreground [&_code]:rounded [&_code]:bg-muted [&_code]:px-1 [&_code]:font-mono [&_code]:text-[0.9em] [&_h1]:mt-4 [&_h1]:mb-2 [&_h1]:text-xl [&_h1]:font-semibold [&_h2]:mt-4 [&_h2]:mb-2 [&_h2]:text-lg [&_h2]:font-semibold [&_h3]:mt-3 [&_h3]:mb-1 [&_h3]:font-semibold [&_h4]:mt-3 [&_h4]:font-medium [&_hr]:my-4 [&_img]:max-w-full [&_li]:my-0.5 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:my-2 [&_pre]:my-2 [&_pre]:overflow-x-auto [&_pre]:rounded-md [&_pre]:bg-muted [&_pre]:p-3 [&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_table]:my-2 [&_table]:border-collapse [&_td]:border [&_td]:px-2 [&_td]:py-1 [&_th]:border [&_th]:bg-muted/50 [&_th]:px-2 [&_th]:py-1 [&_th]:text-left [&_ul]:list-disc [&_ul]:pl-5'>
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{data}</ReactMarkdown>
    </div>
  );
}

// Opening an attachment shows it in a dialog rather than saving it: images
// and PDFs render inline, Markdown is rendered from its text, anything else
// is named and offered for download. The download stays a click away in the
// footer either way.
function FilePreview({
  file,
  onClose,
  timeZone,
}: {
  file: CrmFile | null;
  onClose: () => void;
  timeZone: string;
}): ReactElement {
  const { text, language } = useCrmText();
  const type = file?.mimeType ?? '';
  const inlineUrl = file ? `${file.url}?inline=1` : '';
  const kind = type.startsWith('image/')
    ? 'image'
    : type === 'application/pdf' || type === 'text/plain'
      ? 'frame'
      : type === 'text/markdown' || type === 'text/x-markdown'
        ? 'markdown'
        : 'none';
  return (
    <Dialog open={file !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className={
          kind === 'none'
            ? 'sm:max-w-md'
            : 'flex max-h-[90vh] flex-col sm:max-w-4xl'
        }
      >
        <DialogHeader>
          <DialogTitle className='break-all'>{file?.filename}</DialogTitle>
          <DialogDescription>
            {file
              ? [
                  file.size === null ? null : fileSize(file.size),
                  localDate(file.createdAt, language, timeZone),
                ]
                  .filter(Boolean)
                  .join(' · ')
              : null}
          </DialogDescription>
        </DialogHeader>
        {kind === 'image' ? (
          <div className='flex min-h-0 flex-1 items-center justify-center overflow-auto rounded-md bg-muted/40 p-2'>
            <img
              src={inlineUrl}
              alt={file?.filename ?? ''}
              className='max-h-[70vh] max-w-full object-contain'
            />
          </div>
        ) : kind === 'frame' ? (
          <iframe
            src={inlineUrl}
            title={file?.filename ?? ''}
            className='h-[70vh] w-full rounded-md border bg-background'
          />
        ) : kind === 'markdown' ? (
          <MarkdownPreview url={inlineUrl} />
        ) : (
          <p className='rounded-md border border-dashed px-4 py-8 text-center text-sm text-muted-foreground'>
            {text('noPreview')}
          </p>
        )}
        <DialogFooter>
          <Button variant='outline' onClick={onClose}>
            {text('close')}
          </Button>
          {file ? (
            <Button
              nativeButton={false}
              render={<a href={file.url} download={file.filename} />}
            >
              <Download />
              {text('download')}
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function FileLinks({
  files,
  onRemove,
  sourceLabel,
}: {
  files: unknown[];
  onRemove?: (id: string) => void;
  // Names the record a file came from, used where one list mixes several.
  sourceLabel?: (id: string) => ReactNode;
}): ReactElement {
  const { text, language } = useCrmText();
  const { data: meta } = useMetadata();
  const attachmentStep = PAGE_SIZE;
  const [shown, setShown] = useState(attachmentStep);
  const [previewing, setPreviewing] = useState<CrmFile | null>(null);
  const timeZone = meta?.settings.timeZone ?? 'Asia/Shanghai';
  const ids = files.map(toText).filter(Boolean);
  const { data } = useCrmQuery<CrmFile[]>(
    `files?ids=${encodeURIComponent(ids.join(','))}`,
    ids.length > 0,
  );
  // Newest upload first, so a truncated list shows the most recent files rather
  // than whichever happened to be appended first.
  const ordered = data
    ? [...ids].sort(
        (left, right) =>
          new Date(
            data.find((file) => file.id === right)?.createdAt ?? 0,
          ).getTime() -
          new Date(
            data.find((file) => file.id === left)?.createdAt ?? 0,
          ).getTime(),
      )
    : ids;
  const visible = ordered.slice(0, shown);
  if (!ids.length)
    return (
      <p className='text-sm text-muted-foreground'>{text('noAttachments')}</p>
    );
  return (
    <ul className='space-y-1'>
      <FilePreview
        file={previewing}
        onClose={() => setPreviewing(null)}
        timeZone={timeZone}
      />
      {visible.map((id) => {
        const file = data?.find((f) => f.id === id);
        return (
          <li key={id} className='flex items-start gap-1'>
            {file ? (
              // The name opens the preview dialog; the download and remove
              // icons sit together at the end of the row (the endpoint sends
              // Content-Disposition: attachment, so the link saves the file).
              // One flex row so the name, its time and its source sit on a
              // single centre line despite the differing text sizes.
              <span className='flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-0.5'>
                <button
                  type='button'
                  className='inline-flex min-w-0 items-center gap-2 text-left text-sm text-primary hover:underline'
                  aria-label={`${toText(text('preview'))} ${file.filename}`}
                  onClick={() => setPreviewing(file)}
                >
                  <Paperclip className='size-3.5 shrink-0 text-muted-foreground' />
                  <span className='break-all'>{file.filename}</span>
                </button>
                <span className='text-xs text-muted-foreground'>
                  {localDate(file.createdAt, language, timeZone)}
                </span>
                {sourceLabel ? (
                  <span className='text-xs'>{sourceLabel(id)}</span>
                ) : null}
              </span>
            ) : (
              <span className='inline-flex items-center gap-2 text-sm text-muted-foreground'>
                <Paperclip className='size-3.5 shrink-0' />…
              </span>
            )}
            <span className='ml-auto flex shrink-0 items-center'>
              {file && (
                <a
                  className='inline-flex size-6 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground'
                  href={file.url}
                  download={file.filename}
                  aria-label={`${toText(text('download'))} ${file.filename}`}
                >
                  <Download className='size-3.5' />
                </a>
              )}
              {onRemove && (
                <Button
                  className='size-6 text-muted-foreground hover:text-destructive'
                  variant='ghost'
                  size='icon-sm'
                  // Two uploads may share a filename, so the label carries the
                  // upload time to stay distinguishable to screen readers.
                  aria-label={`${toText(text('remove'))} ${toText(
                    file?.filename ?? id,
                  )}${
                    file
                      ? ` · ${toText(localDate(file.createdAt, language, timeZone))}`
                      : ''
                  }`}
                  onClick={() => onRemove(id)}
                >
                  <Trash2 />
                </Button>
              )}
            </span>
          </li>
        );
      })}
      {ids.length > shown && (
        <li>
          <Button
            variant='ghost'
            size='sm'
            onClick={() => setShown((n) => n + attachmentStep)}
          >
            {text('loadMore')} · {ids.length - shown}
          </Button>
        </li>
      )}
    </ul>
  );
}

export function Attachments({
  entity,
  record,
  editable,
  onError,
}: {
  entity: Entity;
  record: Data;
  editable: boolean;
  onError: (error: unknown) => void;
}): ReactElement {
  const api = useCrmApi();
  const refresh = useRefresh();
  const { text } = useCrmText();
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState('');
  const files = Array.isArray(record.attachments) ? record.attachments : [];
  // Removing only unlinks the file from this record; the stored file is left
  // alone because another record may reference the same upload.
  const remove = (id: string): void => {
    void (async () => {
      setBusy(true);
      try {
        await api(`${toText(entity)}/${toText(record.id)}`, 'PATCH', {
          attachments: files.map(toText).filter((file) => file !== id),
        });
        await refresh();
        setPending('');
      } catch (cause) {
        onError(cause);
      } finally {
        setBusy(false);
      }
    })();
  };
  return (
    <div className='space-y-2 px-2'>
      <p className='text-xs text-muted-foreground'>
        {text('fields.attachments')}
      </p>
      {/* The drop zone sits between the heading and the list, so adding a
          file happens right where the files are. */}
      {editable && (
        <UploadZone
          entity={entity}
          record={record}
          busy={busy}
          setBusy={setBusy}
          onError={onError}
        />
      )}
      <FileLinks files={files} onRemove={editable ? setPending : undefined} />
      {pending && (
        <ConfirmDialog
          title={text('removeFileTitle')}
          description={text('removeFileHint')}
          busy={busy}
          onCancel={() => setPending('')}
          onConfirm={() => remove(pending)}
        />
      )}
    </div>
  );
}

// Multiple files at once, dropped on the area or picked through its button;
// they attach to whichever record hosts the zone.
export function UploadZone({
  entity,
  record,
  busy,
  setBusy,
  onError,
}: {
  entity: Entity;
  record: Data;
  busy: boolean;
  setBusy: (busy: boolean) => void;
  onError: (error: unknown) => void;
}): ReactElement {
  const api = useCrmApi();
  const refresh = useRefresh();
  const { text } = useCrmText();
  const fileRef = useRef<HTMLInputElement>(null);
  // Counts enters and leaves, because dragging over a child fires a leave
  // for the parent before the child's enter.
  const [dragDepth, setDragDepth] = useState(0);
  const over = dragDepth > 0;
  const upload = (picked: File[]): void => {
    if (!picked.length || busy) return;
    void (async () => {
      setBusy(true);
      const body = new FormData();
      picked.forEach((file) => body.append('file', file));
      try {
        const result = await api<{ data: { id: string }[] }>(
          `files?entity=${toText(entity)}`,
          'POST',
          body,
        );
        await api(`${toText(entity)}/${toText(record.id)}`, 'PATCH', {
          attachments: [
            ...arrayValues(record.attachments).map(toText),
            ...result.data.map((uploaded) => uploaded.id),
          ],
        });
        await refresh();
      } catch (cause) {
        onError(cause);
      } finally {
        setBusy(false);
      }
    })();
  };
  return (
    <div
      role='button'
      tabIndex={busy ? -1 : 0}
      aria-disabled={busy}
      aria-label={text('uploadFile')}
      className={`flex flex-wrap items-center justify-center gap-x-1.5 gap-y-1 rounded-md border border-dashed px-3 py-3 text-sm transition-colors ${
        over
          ? 'border-primary bg-primary/5 text-foreground'
          : 'border-border text-muted-foreground hover:border-primary/60 hover:bg-muted/40'
      } ${busy ? 'cursor-progress opacity-60' : 'cursor-pointer'}`}
      onClick={() => !busy && fileRef.current?.click()}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          if (!busy) fileRef.current?.click();
        }
      }}
      onDragEnter={(event) => {
        event.preventDefault();
        setDragDepth((n) => n + 1);
      }}
      onDragOver={(event) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = busy ? 'none' : 'copy';
      }}
      onDragLeave={() => setDragDepth((n) => Math.max(0, n - 1))}
      onDrop={(event) => {
        event.preventDefault();
        setDragDepth(0);
        upload(Array.from(event.dataTransfer.files ?? []));
      }}
    >
      <Upload className='size-4 shrink-0' />
      <span>{busy ? text('uploading') : text('dropFilesHere')}</span>
      {!busy && (
        <span className='font-medium text-primary underline-offset-4 hover:underline'>
          {text('chooseFiles')}
        </span>
      )}
      <input
        ref={fileRef}
        type='file'
        multiple
        hidden
        tabIndex={-1}
        aria-hidden
        onChange={(event) => {
          upload(Array.from(event.target.files ?? []));
          // Without this, picking the same file twice fires no change event.
          event.target.value = '';
        }}
      />
    </div>
  );
}

// The record a linked file came from, opened like any other record link.
function SourceLink({
  entity,
  id,
  name,
}: {
  entity: Entity;
  id: string;
  name: string;
}): ReactElement {
  const link = useRecordLink(entity, id);
  return (
    <Link
      className='text-muted-foreground hover:text-primary hover:underline'
      {...link}
    >
      {name}
    </Link>
  );
}

// The lead's own uploads plus everything attached to its activities, so the tab
// answers "what documents exist for this lead" rather than "what is on this row".
// Each file remembers which record holds it, because removing one has to unlink
// it from that record, not from the lead.
export function RecordAttachments({
  entity,
  record,
  activities,
  opportunities = [],
  approvals = [],
  editable,
  onError,
  uploader,
}: {
  entity: Entity;
  record: CrmRecord;
  activities: Data[];
  // An account's or contact's opportunities: their proposals and contracts
  // are the files most often wanted from the customer's side.
  opportunities?: Data[];
  // An opportunity's approval requests, whose files back the decision.
  approvals?: Data[];
  editable: boolean;
  onError: (error: unknown) => void;
  // The upload zone, rendered under the record's own group so adding a
  // file happens where those files are listed.
  uploader?: ReactNode;
}): ReactElement {
  const api = useCrmApi();
  const refresh = useRefresh();
  const { text } = useCrmText();
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState('');
  const sources = new Map<string, { entity: Entity; record: Data }>();
  for (const id of arrayValues(record.attachments))
    sources.set(toText(id), { entity, record });
  for (const activity of activities)
    for (const id of arrayValues(activity.attachments))
      sources.set(toText(id), { entity: 'activities', record: activity });
  for (const opportunity of opportunities)
    for (const id of arrayValues(opportunity.attachments))
      sources.set(toText(id), { entity: 'opportunities', record: opportunity });
  for (const approval of approvals)
    for (const id of arrayValues(approval.attachments))
      sources.set(toText(id), { entity: 'approvals', record: approval });
  const remove = (id: string): void => {
    const source = sources.get(id);
    if (!source) return;
    void (async () => {
      setBusy(true);
      try {
        await api(
          `${toText(source.entity)}/${toText(source.record.id)}`,
          'PATCH',
          {
            attachments: arrayValues(source.record.attachments)
              .map(toText)
              .filter((file) => file !== id),
          },
        );
        await refresh();
        setPending('');
      } catch (cause) {
        onError(cause);
      } finally {
        setBusy(false);
      }
    })();
  };
  const pendingSource = pending ? sources.get(pending) : undefined;
  const own = [...sources.entries()]
    .filter(([, source]) => source.entity === entity)
    .map(([id]) => id);
  // An object without an attachments field (a contact) shows only the
  // linked groups: there is nothing of its own to list or upload to.
  const hasOwnFiles = 'attachments' in record;
  // The linked groups, each shown when the record has any such links.
  const linked: {
    entity: Entity;
    label: string;
    records: Data[];
  }[] = [
    {
      entity: 'activities',
      label: 'attachmentsFromActivities',
      records: activities,
    },
    {
      entity: 'opportunities',
      label: 'attachmentsFromOpportunities',
      records: opportunities,
    },
    {
      entity: 'approvals',
      label: 'attachmentsFromApprovals',
      records: approvals,
    },
  ];
  const filesFrom = (source: Entity): string[] =>
    [...sources.entries()]
      .filter(([, s]) => s.entity === source)
      .map(([id]) => id);
  return (
    <div className='space-y-6'>
      {/* Two groups rather than one mixed list, both always shown: which
          record a file belongs to decides what removing it changes, and an
          empty group still tells the reader where an upload would land. */}
      {hasOwnFiles && (
        <div className='space-y-2'>
          <p className='text-xs font-medium text-muted-foreground'>
            {text('attachmentsOwn', {
              entity: text(`entity.${toText(entity)}`),
            })}
          </p>
          {uploader}
          <FileLinks files={own} onRemove={editable ? setPending : undefined} />
        </div>
      )}
      {!hasOwnFiles && !linked.some((g) => g.records.length > 0) && (
        <p className='text-sm text-muted-foreground'>{text('noAttachments')}</p>
      )}
      {linked
        .filter((group) => group.entity !== entity && group.records.length > 0)
        .map((group) => (
          <div key={group.entity} className='space-y-2'>
            <p className='text-xs font-medium text-muted-foreground'>
              {text(group.label)}
            </p>
            <FileLinks
              files={filesFrom(group.entity)}
              onRemove={editable ? setPending : undefined}
              sourceLabel={(id) => {
                const source = sources.get(id);
                if (!source) return null;
                return (
                  <SourceLink
                    entity={group.entity}
                    id={toText(source.record.id)}
                    name={toText(source.record.name)}
                  />
                );
              }}
            />
          </div>
        ))}
      {pending && (
        <ConfirmDialog
          title={text('removeFileTitle')}
          description={
            // Say which record when the file is not this one's own, because
            // the record being changed is not the one the user is looking at.
            pendingSource && pendingSource.entity !== entity
              ? `${toText(
                  text('removeFileFromRecord', {
                    entity: text(`entity.${toText(pendingSource.entity)}`),
                    name: toText(pendingSource.record.name),
                  }),
                )} ${toText(text('removeFileHint'))}`
              : text('removeFileHint')
          }
          busy={busy}
          onCancel={() => setPending('')}
          onConfirm={() => remove(pending)}
        />
      )}
    </div>
  );
}

export function ConfirmDialog({
  title,
  description,
  busy,
  confirmDisabled = false,
  onCancel,
  onConfirm,
}: {
  title: string;
  description: ReactNode;
  busy: boolean;
  // The description explains why; the confirm button simply cannot proceed.
  confirmDisabled?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}): ReactElement {
  const { text } = useCrmText();
  return (
    <Dialog
      open
      onOpenChange={(next) => {
        if (!next && !busy) onCancel();
      }}
    >
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant='outline' disabled={busy} onClick={onCancel}>
            {text('cancel')}
          </Button>
          <Button
            variant='destructive'
            disabled={busy || confirmDisabled}
            onClick={onConfirm}
          >
            {busy ? text('saving') : text('confirm')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// "Updated" on its own says nothing, so each changed field is listed with the
// value it was given. Old values are not stored, so this shows the new one only.
export function HistoryChanges({
  record,
  changes,
  movedField,
  names,
  fileNames,
}: {
  record: CrmRecord;
  changes: unknown;
  movedField?: string;
  names: Record<string, string>;
  fileNames: Record<string, string>;
}): ReactElement | null {
  const { text } = useCrmText();
  const { data: meta } = useMetadata();
  const changed =
    changes && typeof changes === 'object' ? (changes as Data) : {};
  const fields = meta?.definitions.leads.fields ?? [];
  const shown = Object.keys(changed).filter((key) => {
    if (key === movedField || key === 'id') return false;
    // Leaving "invalid" clears the reason in the same save; reporting that as
    // "Invalid reason —" is noise, since the reason only means anything while
    // the lead is actually invalid.
    if (key === 'invalidReason' && !toText(changed[key])) return false;
    return true;
  });
  if (!shown.length) return null;
  return (
    <dl className='flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-xs'>
      {shown.map((key) => (
        <div
          className='flex items-baseline gap-1 rounded bg-muted/60 px-1.5 py-0.5'
          key={key}
        >
          <dt className='text-muted-foreground'>
            {text(fieldLabelKey('leads', key), {
              defaultValue: key,
            })}
          </dt>
          {/* Clamped so one long value cannot turn a history row into a
              paragraph; the full text stays available on hover. */}
          <dd
            // The descendant rule is needed because the shared value renderer
            // sets whitespace-pre-wrap on its own span, which would otherwise
            // win over the clamp here.
            className='min-w-0 max-w-80 truncate [&_*]:whitespace-nowrap'
            title={toText(changed[key])}
          >
            {key === 'attachments' ? (
              // A count says nothing about which documents changed.
              arrayValues(changed.attachments).length ? (
                arrayValues(changed.attachments)
                  .map((id) => fileNames[toText(id)] ?? toText(id).slice(0, 8))
                  .join('、')
              ) : (
                <span className='text-muted-foreground'>
                  {text('noAttachments')}
                </span>
              )
            ) : (
              <Value
                // Merged so fields the formatter leans on — a currency for an
                // amount — resolve even when this save did not include them.
                record={{ ...record, ...changed }}
                field={
                  fields.find((f) => f.key === key) ?? { key, type: 'text' }
                }
                lookup={names}
              />
            )}
          </dd>
        </div>
      ))}
    </dl>
  );
}
