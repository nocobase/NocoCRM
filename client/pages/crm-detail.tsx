import { fieldLabelKey, linkOf, toText } from '../components/crm/api.js';
import { markdownLine } from '../components/crm/line-breaks.js';
import { useEffect, useState, type ReactElement, type ReactNode } from 'react';
import { useTranslation } from '@nocobase/i18n/client';
import {
  Link,
  Outlet,
  useLocation,
  useNavigate,
  useParams,
  useSearchParams,
} from 'react-router';
import { Sheet, SheetContent, SheetTitle } from '../components/ui/sheet.js';
import {
  RecordDrawerContext,
  useRecordDrawer,
  resolveTab,
  useDetailTab,
  useRecordDrawerState,
  useRecordLink,
  type RecordDrawerApi,
} from '../components/crm/record-drawer.js';
import {
  ArrowLeft,
  ArrowRightLeft,
  ArrowUpRight,
  Merge,
  CalendarDays,
  CirclePlus,
  ChevronDown,
  Clock,
  User,
  Ellipsis,
  History,
  Paperclip,
  MessageCircle,
  PencilLine,
  StickyNote,
  Maximize2,
  X,
  Plus,
  Sparkles,
  Trash2,
  type LucideIcon,
} from 'lucide-react';
import { Button, buttonVariants } from '../components/ui/button.js';
import { Spinner } from '../components/ui/spinner.js';
import { Textarea } from '../components/ui/textarea.js';
import { LONG_TEXT_LIMIT } from '../../server/providers/crm/limits.js';
import { KindTag } from '../components/crm/kind-tag.js';
import { Badge } from '../components/ui/badge.js';
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
  useCrmScopeKey,
  PAGE_SIZE,
  useMore,
  useCrmText,
  useMetadata,
  useRefresh,
  sentence,
  localDate,
  localTime,
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
  LongText,
  Loading,
  ErrorNotice,
  RecordLink,
  Status,
  Value,
} from '../components/crm/common.js';
import { revealScrollbar } from '../components/crm/scrollbar.js';
import { RecordForm } from '../components/crm/form.js';
import { useQuery } from '@tanstack/react-query';
import {
  EvaluateButton,
  EvaluationStatus,
  EvaluationFeedEntry,
  VerdictPanel,
  type EvaluationEntry,
} from '../components/crm/lead-evaluation.js';
import { FileLinks, UploadZone } from '../components/crm/attachments.js';
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
import { AskAIButton } from '../components/crm/ask-ai.js';
import { ConvertDialog } from '../components/crm/conversion.js';
import { LeadDuplicates } from '../components/crm/lead-merge.js';
import {
  ReviewFeedEntry,
  ReviewPanel,
  type ReviewEntry,
} from '../components/crm/approval-review.js';

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
  const { opened, open, close } = useRecordDrawerState();
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
      {/* The tab's child route (crm-record-tab) draws nothing; the page
          shows the tab its address names. */}
      <Outlet />
    </RecordDrawerContext.Provider>
  );
}

// The drawer a detail page or the workspace opens records in: the same
// detail component as the full page, over the page the reader came from.
// Links inside it replace what it shows (the back button steps back through
// them), and the toolbar offers the full page.
export function RecordDrawer({
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
        className='crm-record-drawer gap-0 overflow-y-auto p-0 data-[side=right]:w-full data-[side=right]:sm:max-w-none data-[side=right]:md:w-[72vw] data-[side=right]:lg:w-[64vw] data-[side=right]:xl:w-[56vw] data-[side=right]:2xl:max-w-[1100px]'
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

// The lead's particulars in groups, each under its heading: how the lead
// stands (after owner and status), the person, their company. Name and
// company head the page as well and lead their groups here too, so the
// column reads whole on its own. When it came and last changed close the
// column as a group of their own.
const leadGroups = [
  ['general', ['source', 'message']],
  ['contact', ['name', 'jobTitle', 'phone', 'email']],
  [
    'company',
    [
      'company',
      'website',
      'industry',
      'employees',
      'region',
      'address',
      'companyDescription',
    ],
  ],
] as const;
type LeadField = (typeof leadGroups)[number][1][number];
// Under the Company heading its fields drop the word: "Name", not "Company
// name". The region's three parts share one row.
const groupLabels: Partial<Record<LeadField, string>> = {
  region: 'region',
  company: 'fields.companyName',
  companyDescription: 'fields.companyIntro',
};

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
  const [tabSlug, setTab] = useDetailTab();
  const tab =
    resolveTab(tabSlug, ['historyTab', 'activities', 'attachments', 'notes']) ??
    'historyTab';
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
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState<{ entity: Entity; initial: Data }>();
  // The timeline entry the page was asked to show (a waiting evaluation).
  // `at` tells a repeated click from the last one, so it scrolls again.
  const [focus, setFocus] = useState<{ id: string; at: number }>();
  // The note the timeline opened in the Notes tab.
  const [noteFocus, setNoteFocus] = useState<string>();
  const [convert, setConvert] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<unknown>();
  const [busy, setBusy] = useState(false);
  // The lead's title, for "Ask AI", which starts the assistant's
  // conversation from it.
  const contextName = detail
    ? `${toText(detail.record.name)}${detail.record.company ? ` / ${toText(detail.record.company)}` : ''}`
    : undefined;
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
  const fieldRow = (key: LeadField): ReactElement => (
    <InfoRow
      key={key}
      label={text(groupLabels[key] ?? fieldLabelKey('leads', key))}
    >
      {key === 'region' ? (
        <div className='flex flex-wrap items-center'>
          {['country', 'state', 'city'].map((part, index) => (
            <div className='flex min-w-0 items-center' key={part}>
              {index > 0 && (
                <span aria-hidden className='text-muted-foreground/60'>
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
    </InfoRow>
  );
  // The timeline first, where the lead opens, without a count: its entries
  // only grow and the number says nothing. The activities' icon is their
  // menu entry's. The notes also show in the timeline among its entries.
  const tabBar = (
    <DetailTabBar
      active={tab}
      onSelect={setTab}
      tabs={[
        { name: 'historyTab', label: 'historyTab', icon: History },
        {
          name: 'activities',
          label: 'entities.activities',
          icon: CalendarDays,
          count: moreActivities.total,
        },
        {
          name: 'attachments',
          label: 'fields.attachments',
          icon: Paperclip,
          count: attachmentCount,
        },
        {
          name: 'notes',
          label: 'notes.tab',
          icon: StickyNote,
          count: detail.notesTotal ?? 0,
        },
      ]}
    />
  );
  // "name / company", both edited in place: the page's heading, atop the
  // particulars (a <div> with the heading role, since the editors bring block
  // elements an <h1> may not hold).
  const heading = (
    <div role='heading' aria-level={1} className='-ml-2 py-1.5'>
      <InlineField
        entity='leads'
        record={record}
        field={field('name')}
        editable={editable}
        label={text(fieldLabelKey('leads', 'name'))}
        size='heading'
      />
      <AfterSlash>
        <InlineField
          entity='leads'
          record={record}
          field={field('company')}
          editable={editable}
          label={text(fieldLabelKey('leads', 'company'))}
          size='heading'
        />
      </AfterSlash>
    </div>
  );
  // Everything the reader can do with the lead, right of its heading:
  // converting it, the assistant, asking the AI to follow it up, and the
  // rarer deleting in "More" (opening to the right edge's left).
  const leadActions = (
    <>
      {editable && (
        <Button size='sm' onClick={() => setConvert(true)}>
          <ArrowRightLeft />
          {text('convert')}
        </Button>
      )}
      <AskAIButton entity='leads' recordId={id} name={contextName} />
      {meta.assistant && !converted && editable && (
        <EvaluateButton recordId={id} onError={setError} />
      )}
      {detail.permissions.delete && (
        <DropdownMenu>
          <DropdownMenuTrigger
            aria-label={text('moreActions')}
            className={buttonVariants({
              size: 'icon-sm',
              variant: 'outline',
            })}
          >
            <Ellipsis />
          </DropdownMenuTrigger>
          <DropdownMenuContent align='end'>
            <DropdownMenuItem
              variant='destructive'
              onClick={() => setConfirmDelete(true)}
            >
              <Trash2 />
              {text('deleteRecord', { entity: text('entity.leads') })}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </>
  );
  // Under the heading, where the AI's latest follow-up stands, which opens
  // it in the timeline.
  const leadStatus = (
    <EvaluationStatus
      recordId={id}
      onOpen={(entryId) => {
        setFocus({ id: entryId, at: Date.now() });
        setTab('historyTab');
      }}
    />
  );
  return (
    <DetailColumns
      entity='leads'
      heading={heading}
      actions={leadActions}
      status={leadStatus}
      tabBar={tabBar}
      notice={<ErrorNotice error={error ?? loadError} />}
      left={
        <>
          {/* Open leads that repeat this one, each to merge. */}
          <LeadDuplicates
            lead={record}
            onMerged={(keptId) => {
              // This lead merged away: on to the one kept, before the
              // refresh refetches a lead that no longer exists.
              if (keptId !== toText(id)) {
                if (drawer?.inDrawer) drawer.close();
                else void navigate(`/crm/leads/${keptId}`);
              }
              void refresh();
            }}
          />
          <div>
            {/* Who has the lead and where it stands head the first group. */}
            <InfoGroup title={text('leadGroups.general')}>
              <InfoRow label={text('fields.ownerId')}>
                {inline('ownerId')}
              </InfoRow>
              <InfoRow label={text('fields.status')}>
                <LeadStatusField
                  record={record}
                  editable={editable}
                  statuses={(field('status').options ?? []).map((value) => ({
                    value,
                    label: text(`options.${toText(value)}`, {
                      defaultValue: value,
                    }),
                  }))}
                  reasons={(
                    meta.settings.options.invalidReason ??
                    field('invalidReason').options ??
                    []
                  ).map((value) => ({
                    value,
                    label: text(`options.${toText(value)}`, {
                      defaultValue: value,
                    }),
                  }))}
                  onSave={patch}
                />
                {/* A converted lead is read-only: its work goes on in
                        what it became, listed under its status. */}
                {converted && (
                  <p className='px-2 pb-1 text-xs text-muted-foreground'>
                    {text('convertedHint')}
                  </p>
                )}
              </InfoRow>
              {converted && (
                <>
                  {(
                    [
                      ['accounts', 'convertedAccountId'],
                      ['contacts', 'convertedContactId'],
                      ['opportunities', 'convertedOpportunityId'],
                    ] as const
                  ).map(([e, key]) => (
                    <InfoRow key={key} label={text(`fields.${key}`)}>
                      {/* An empty one is shown rather than dropped: "no
                              opportunity" is itself worth seeing. */}
                      <div className='px-2 py-1.5'>
                        {record[key] ? (
                          <RecordLink
                            entity={e}
                            record={{
                              id: toText(record[key]),
                              name:
                                names[toText(record[key])] ??
                                text(`entities.${e}`),
                            }}
                          />
                        ) : (
                          <span className='text-muted-foreground'>—</span>
                        )}
                      </div>
                    </InfoRow>
                  ))}
                </>
              )}
              {leadGroups[0][1].map(fieldRow)}
            </InfoGroup>
            {leadGroups.slice(1).map(([group, keys]) => (
              <InfoGroup key={group} title={text(`leadGroups.${group}`)}>
                {keys.map(fieldRow)}
              </InfoGroup>
            ))}
            <InfoGroup title={text('leadGroups.system')}>
              <InfoRow label={text('fields.createdAt')}>
                <div className='px-2 py-1.5'>
                  {localDate(
                    record.createdAt,
                    language,
                    meta.settings.timeZone,
                  )}
                </div>
              </InfoRow>
              <InfoRow label={text('fields.updatedAt')}>
                <div className='px-2 py-1.5'>
                  {localDate(
                    record.updatedAt,
                    language,
                    meta.settings.timeZone,
                  )}
                </div>
              </InfoRow>
              {/* When it was converted, under its last update. */}
              {converted && (
                <InfoRow label={text('fields.convertedAt')}>
                  <div className='px-2 py-1.5'>
                    {localDate(
                      record.convertedAt,
                      language,
                      meta.settings.timeZone,
                    )}
                  </div>
                </InfoRow>
              )}
            </InfoGroup>
          </div>
        </>
      }
      right={
        <div>
          {tab === 'activities' ? (
            <div className='space-y-3'>
              {/* Scheduling lives inside its tab, the way upload lives in
                    attachments. A converted lead rejects it server-side. */}
              {!converted && Boolean(meta.permissions.activities.create) && (
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
          ) : tab === 'notes' ? (
            <NotesPanel entity='leads' id={id} focusId={noteFocus} />
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
            <HistoryFeed
              entity='leads'
              id={id}
              record={record}
              initial={{
                data: detail.history,
                total: detail.historyTotal ?? detail.history.length,
              }}
              names={names}
              statusKey='status'
              editable={editable && record.status !== 'converted'}
              recordName={contextName}
              focusId={focus?.id}
              focusAt={focus?.at}
              onOpenNote={(noteId) => {
                setNoteFocus(noteId);
                setTab('notes');
              }}
            />
          )}
        </div>
      }
    >
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
    </DetailColumns>
  );
}

// A record page laid out as the lead's: no header, the record's heading in a
// band over its particulars on the left and the tabs in the same band over
// the rest. The lead and the activity pages share it.
export function DetailColumns({
  entity,
  heading,
  actions,
  status,
  tabBar,
  notice,
  left,
  right,
  children,
}: {
  // The kind of record, named over the heading on a phone.
  entity: Entity;
  heading: ReactNode;
  // Everything the reader can do with the record, right of the heading.
  actions: ReactNode;
  // Where the AI's latest work on the record stands, under the heading.
  status?: ReactNode;
  tabBar: ReactNode;
  notice: ReactNode;
  left: ReactNode;
  right: ReactNode;
  // The page's dialogs.
  children?: ReactNode;
}): ReactElement {
  // In the drawer the page is already on the popover's white, with its own
  // padding: nothing to reach past.
  const inDrawer = useRecordDrawer()?.inDrawer ?? false;
  return (
    <CrmFrame
      // The page is the window's height; side by side its two columns scroll
      // each on their own below the header, the rule between them running to
      // the bottom. CrmFrame draws no header: the record's own is below.
      fill
    >
      {notice}
      {/* Container query, not a viewport one: opening the AI panel narrows this
          area without changing the viewport, and a viewport breakpoint would
          keep both columns in a box too small for them. */}
      <div className='@container min-h-0 flex-1'>
        {/* White (the card colour) out to the screen's edges, stacked or side
            by side: the block reaches past the frame's padding and the parts
            inside give it back. */}
        <div
          className={`flex h-full flex-col @3xl:-mx-4 md:@3xl:-mx-8 ${
            inDrawer ? '' : '-mx-4 bg-card md:-mx-8'
          }`}
        >
          {/* Stacked, the header, the particulars and the tabs scroll as one;
              side by side, the header stays and each column scrolls. */}
          <div
            className={`flex min-h-0 flex-1 flex-col overflow-y-auto pb-24 @3xl:overflow-hidden @3xl:pb-0 scroll-quiet ${
              inDrawer ? '' : 'px-4 md:px-8 @3xl:px-0'
            }`}
            onScroll={revealScrollbar}
          >
            {/* The record's header, across both columns: the heading with
                the actions at its right (below it when there is no room),
                the AI's latest suggestion under it. */}
            <header className='pt-5 @3xl:border-b @3xl:pt-4 @3xl:pr-4 @3xl:pb-3 @3xl:pl-4 md:@3xl:pr-8 md:@3xl:pl-6'>
              <DetailBack entity={entity} />
              <div className='flex flex-wrap items-start justify-between gap-x-6 gap-y-2'>
                <div className='min-w-0 flex-1 basis-full @3xl:basis-80'>
                  {heading}
                </div>
                {actions ? (
                  <div className='flex flex-wrap items-center gap-2 empty:hidden @3xl:pt-1'>
                    {actions}
                  </div>
                ) : null}
              </div>
              {/* Empty when the status draws nothing (no AI work yet). */}
              {status ? (
                <div className='mt-2 empty:hidden'>{status}</div>
              ) : null}
            </header>
            <div className='grid gap-6 pt-5 @3xl:min-h-0 @3xl:flex-1 @3xl:grid-cols-[22rem_minmax(0,1fr)] @3xl:grid-rows-[minmax(0,1fr)] @3xl:gap-0 @3xl:pt-0 md:@3xl:grid-cols-[23rem_minmax(0,1fr)]'>
              {/* The particulars in a narrow column on the left, the timeline
                  and the other tabs taking the rest, the way record pages
                  commonly lay them out. Stacked, the particulars come first
                  (a phone number before the history). */}
              <section
                className='min-w-0 @3xl:overflow-y-auto @3xl:pt-4 @3xl:pr-6 @3xl:pb-8 @3xl:pl-4 md:@3xl:pl-6 scroll-quiet'
                onScroll={revealScrollbar}
              >
                {left}
              </section>
              {/* The tabs head the right column: stacked, they stay in view as
                  the page scrolls; side by side, their content scrolls below
                  them. Their own rule is the divide. */}
              <section className='flex min-w-0 flex-col @3xl:min-h-0 @3xl:border-l'>
                <div className='sticky top-0 z-10 mb-4 flex flex-wrap items-center border-b bg-card @3xl:static @3xl:mb-0 @3xl:pt-2 @3xl:pr-4 @3xl:pl-6 md:@3xl:pr-8'>
                  {tabBar}
                </div>
                <div
                  className='min-w-0 @3xl:min-h-0 @3xl:flex-1 @3xl:overflow-y-auto @3xl:pt-4 @3xl:pr-4 @3xl:pb-24 @3xl:pl-6 md:@3xl:pr-8 scroll-quiet'
                  onScroll={revealScrollbar}
                >
                  {right}
                </div>
              </section>
            </div>
          </div>
        </div>
      </div>
      {children}
    </CrmFrame>
  );
}

// The part of a record's heading after a slash ("name / company", "account /
// deal"). The heading flows as text and wraps wherever its line is full.
export function AfterSlash({
  children,
}: {
  children: ReactNode;
}): ReactElement {
  return (
    <>
      <span aria-hidden className='text-xl text-muted-foreground/60'>
        /
      </span>
      {children}
    </>
  );
}

// Over a stacked record page (a phone, a narrow window): the way back to the
// page before, and what kind of record this is. Back is the browser's, so it
// returns wherever the reader came from; opened from a link, with nothing
// before it in this tab, it goes to the object's list instead. The drawer has
// its own bar with the kind and a close button, so it shows none.
function DetailBack({ entity }: { entity: Entity }): ReactElement | null {
  const { t } = useTranslation();
  const { text } = useCrmText();
  const navigate = useNavigate();
  const location = useLocation();
  if (useRecordDrawer()?.inDrawer) return null;
  return (
    <div className='mb-2 flex items-center gap-2 text-sm text-muted-foreground @3xl:hidden'>
      <button
        type='button'
        onClick={() =>
          location.key === 'default'
            ? void navigate(`/crm/${toText(entity)}`)
            : void navigate(-1)
        }
        className='inline-flex items-center gap-1 transition-colors hover:text-foreground'
      >
        <ArrowLeft className='size-4' />
        {t('navigation.back')}
      </button>
      <span aria-hidden className='text-muted-foreground/60'>
        ·
      </span>
      <span>{sentence(text(`entity.${toText(entity)}`))}</span>
    </div>
  );
}

// The tabs of a DetailColumns page, marked by a line on the rule under them:
// side by side in the band across both columns, stacked above their content.
// A tab without a count shows none.
export function DetailTabBar({
  tabs,
  active,
  onSelect,
}: {
  tabs: readonly {
    name: string;
    label: string;
    icon: LucideIcon;
    count?: number;
  }[];
  active: string;
  onSelect: (name: string) => void;
}): ReactElement {
  const { text } = useCrmText();
  return (
    <div role='tablist' className='flex flex-wrap gap-x-6'>
      {tabs.map(({ name, label, icon: Icon, count }) => (
        <button
          key={name}
          type='button'
          role='tab'
          aria-selected={name === active}
          onClick={() => onSelect(name)}
          className={`-mb-px flex items-center gap-1.5 rounded-t-sm border-b-2 py-2.5 text-sm font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring/50 ${
            name === active
              ? 'border-foreground text-foreground'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Icon className='size-4' />
          {text(label)}
          {count !== undefined && (
            <span className='text-xs text-muted-foreground tabular-nums'>
              {count}
            </span>
          )}
        </button>
      ))}
    </div>
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
        startOpen={editing}
        onClose={() => setEditing(false)}
      />
    );
  return (
    <div
      role={editable ? 'button' : undefined}
      tabIndex={editable ? 0 : undefined}
      aria-label={editable ? label : undefined}
      className={`group/site relative flex items-center rounded-md px-2 py-1.5 ${toText(
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
      {/* One line, cut with an ellipsis, whole on hover: an address has
          nowhere to break and would otherwise run out of the column. */}
      <a
        className='min-w-0 truncate text-sm text-primary hover:underline'
        href={href}
        target='_blank'
        rel='noopener noreferrer'
        title={url}
        aria-label={`${toText(label)}: ${toText(text('openWebsite'))}`}
        onDoubleClick={(e) => e.stopPropagation()}
      >
        {url}
      </a>
      {/* A long address leaves no row to double-click beside it: the pencil,
          shown on hover over the end of the row (taking no room from the
          address, which fields need), opens the editor in one click. */}
      {editable && (
        <Button
          size='icon-xs'
          variant='ghost'
          className='absolute top-1/2 right-1 -translate-y-1/2 bg-muted opacity-0 group-focus-within/site:opacity-100 group-hover/site:opacity-100 hover:bg-background focus-visible:opacity-100'
          aria-label={`${toText(text('edit'))} ${toText(label)}`}
          onClick={() => setEditing(true)}
          onDoubleClick={(e) => e.stopPropagation()}
        >
          <PencilLine />
        </Button>
      )}
    </div>
  );
}

export function ActivityItem({ activity }: { activity: Data }): ReactElement {
  const { language } = useCrmText();
  const activityLink = useRecordLink('activities', toText(activity.id));
  const { data: meta } = useMetadata();
  const zone = meta?.settings.timeZone ?? 'Asia/Shanghai';
  const status = toText(activity.status);
  return (
    <li className='relative pl-5'>
      <span
        aria-hidden
        className={`absolute top-4 left-0 size-2.5 -translate-x-1/2 rounded-full border-2 border-card ${toText(
          status === 'completed'
            ? 'bg-primary'
            : status === 'cancelled'
              ? 'bg-muted-foreground/40'
              : 'bg-background ring-2 ring-primary/40',
        )}`}
      />
      {/* The activity opens in the page's drawer (its full page on a phone
          or in a new tab); its fields are edited there. The name is the link,
          stretched over the whole entry. */}
      <div className='relative rounded-md px-2 py-2 transition-colors hover:bg-muted'>
        <div className='flex flex-wrap items-center gap-2'>
          <KindTag value={activity.type} />
          <Link
            className='flex min-w-0 flex-1 items-center gap-1 outline-none after:absolute after:inset-0 after:rounded-md focus-visible:after:ring-2 focus-visible:after:ring-ring'
            {...activityLink}
          >
            <span className='truncate text-sm font-medium'>
              {toText(activity.name)}
            </span>
            <ArrowUpRight className='size-3 shrink-0 text-muted-foreground' />
          </Link>
          <Status value={activity.status} />
        </div>
        <div className='mt-1 flex flex-wrap items-center gap-x-3 gap-y-1'>
          {/* Whose it is, then when. */}
          <p className='inline-flex items-center gap-1 text-xs text-muted-foreground'>
            <User className='size-3 shrink-0' />
            {meta?.users.find((u) => u.id === activity.ownerId)?.name ?? '—'}
          </p>
          <p className='inline-flex items-center gap-1 text-xs text-muted-foreground tabular-nums'>
            <Clock className='size-3 shrink-0' />
            {localDate(activity.startAt, language, zone)}
            {/* Its end when it has one: the time alone on the same day. */}
            {activity.endAt
              ? ` – ${
                  localDate(activity.endAt, language, zone, false) ===
                  localDate(activity.startAt, language, zone, false)
                    ? localTime(activity.endAt, zone)
                    : localDate(activity.endAt, language, zone)
                }`
              : null}
          </p>
        </div>
      </div>
    </li>
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
      <p className='text-sm text-muted-foreground'>
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
      className='inline-block max-w-full truncate align-bottom text-muted-foreground hover:text-primary hover:underline'
      title={name}
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
// value it was given, after the value it replaced where the entry kept one
// (entries recorded before earlier values were stored show the new one only).
// A long text shown on one line, as history chips show every value: the
// value renderer otherwise draws it as a collapsible block.
const asLine = (field: Field): Field =>
  field.type === 'textarea' ? { ...field, type: 'text' } : field;

export function HistoryChanges({
  entity = 'leads',
  record,
  changes,
  previous,
  movedField,
  names,
  fileNames,
  part = 'line',
  open = false,
  onToggle,
}: {
  entity?: Entity;
  record: CrmRecord;
  changes: unknown;
  // What the changed fields held before an update, shown as "old → new";
  // absent for a creation and for entries older than this record keeping.
  previous?: unknown;
  movedField?: string;
  names: Record<string, string>;
  fileNames: Record<string, string>;
  // A save of several fields is drawn in two places: on the entry's line
  // its count and the toggle (`line`), and, unfolded, its fields in a box
  // under the whole entry, the time's column included (`rows`). The
  // timeline keeps which entries are open, as it does for the AI's.
  part?: 'line' | 'rows';
  open?: boolean;
  onToggle?: () => void;
}): ReactElement | null {
  const { text, language } = useCrmText();
  const { data: meta } = useMetadata();
  const changed =
    changes && typeof changes === 'object' ? (changes as Data) : {};
  const before =
    previous && typeof previous === 'object' ? (previous as Data) : undefined;
  const fields = meta?.definitions[entity]?.fields ?? [];
  const shown = Object.keys(changed).filter((key) => {
    if (key === movedField || key === 'id') return false;
    // Leaving "invalid" clears the reason in the same save; reporting that as
    // "Invalid reason —" is noise, since the reason only means anything while
    // the lead is actually invalid.
    if (key === 'invalidReason' && !toText(changed[key])) return false;
    return true;
  });
  if (!shown.length) return null;
  // A save of several fields reads "updated 5 fields" on the line, and
  // unfolds into one row per field below it; a single field stays inline.
  const folds = shown.length > 1;
  const show = (values: Data, key: string): ReactNode =>
    key === 'attachments' ? (
      // A count says nothing about which documents changed.
      arrayValues(values.attachments).length ? (
        arrayValues(values.attachments)
          .map((id) => fileNames[toText(id)] ?? toText(id).slice(0, 8))
          .join('、')
      ) : (
        <span className='text-muted-foreground'>{text('noAttachments')}</span>
      )
    ) : (
      (() => {
        const field = fields.find((f) => f.key === key) ?? {
          key,
          type: 'text',
        };
        // A value is cut by its box, where the room ends, not at a fixed
        // length: one field has the rest of the entry's line, several each
        // their own row.
        return (
          <Value
            // Merged so fields the formatter leans on — a currency for an
            // amount — resolve even when this save did not include them.
            // A long text, Markdown, as one line of its plain text.
            record={{
              ...record,
              ...values,
              ...(field.type === 'textarea' && typeof values[key] === 'string'
                ? { [key]: markdownLine(values[key]) }
                : {}),
            }}
            field={asLine(field)}
            lookup={names}
          />
        );
      })()
    );
  // Read like a status move on the timeline: each field's name (muted, as
  // the verb before it), then old → new in the line's own type. Several
  // fields in one save follow one another on the line.
  const separator = (index: number): ReactNode =>
    !folds && index < shown.length - 1 ? (
      <span aria-hidden className='-ml-1.5 text-muted-foreground'>
        {language.startsWith('zh') ? '，' : ','}
      </span>
    ) : null;
  // Files by name: which were added, which removed, rather than the whole
  // list before and after.
  const fileList = (ids: string[]): string =>
    ids.map((id) => fileNames[id] ?? id.slice(0, 8)).join('、');
  const titleOf = (key: string): string =>
    before && key in before
      ? `${toText(before[key] ?? '')} → ${toText(changed[key] ?? '')}`
      : toText(changed[key]);
  // Old → new, clamped so one long value cannot turn an entry into a
  // paragraph; the full text stays available on hover. The old value has
  // up to 45% of the line, the new one the rest. The descendant rule beats
  // the value renderer's own pre-wrap.
  const valuesOf = (key: string): ReactNode => (
    <>
      {before && key in before && (
        <>
          <span className='max-w-[45%] min-w-0 shrink-0 truncate [&_*]:whitespace-nowrap'>
            {show(before, key)}
          </span>
          <span aria-hidden className='shrink-0'>
            →
          </span>
        </>
      )}
      <span className='min-w-0 shrink truncate [&_*]:whitespace-nowrap'>
        {show(changed, key)}
      </span>
    </>
  );
  const rows = shown.map((key, index) => {
    if (key === 'attachments' && before && key in before) {
      const was = arrayValues(before.attachments).map(toText);
      const now = arrayValues(changed.attachments).map(toText);
      const added = now.filter((file) => !was.includes(file));
      const removed = was.filter((file) => !now.includes(file));
      return (
        <span
          key={key}
          className='inline-flex max-w-full min-w-0 flex-wrap items-baseline gap-x-1.5'
        >
          {added.length ? (
            <>
              <span className='text-muted-foreground'>
                {text('feed.addedFiles')}
              </span>
              <span className='min-w-0 truncate'>{fileList(added)}</span>
            </>
          ) : null}
          {removed.length ? (
            <>
              <span className='text-muted-foreground'>
                {text('feed.removedFiles')}
              </span>
              <span className='min-w-0 truncate'>{fileList(removed)}</span>
            </>
          ) : null}
          {separator(index)}
        </span>
      );
    }
    const label = (
      <span className='shrink-0 text-muted-foreground'>
        {/* A lead's introduction by the short name its particulars show
            (the company is implied); every other field by its own. */}
        {text(
          entity === 'leads' && key === 'companyDescription'
            ? 'fields.companyIntro'
            : fieldLabelKey(entity, key),
          { defaultValue: key },
        )}
      </span>
    );
    return (
      <span
        key={key}
        // A lone field takes the rest of the entry's line (basis 0, so it
        // never wraps below the verb), its values cut where it ends.
        className={`flex min-w-0 items-baseline gap-1.5 ${folds ? '' : 'flex-1 basis-0'}`}
        title={titleOf(key)}
      >
        {label}
        {valuesOf(key)}
        {/* A comma between fields, kept on the field's line. */}
        {separator(index)}
      </span>
    );
  });
  if (part === 'rows')
    return folds && open ? (
      <div className='mt-1 grid gap-1 rounded-lg border bg-muted/40 px-3 py-2 text-sm'>
        {rows}
      </div>
    ) : null;
  if (!folds) return <>{rows}</>;
  return (
    <>
      <span className='text-muted-foreground'>
        {text('feed.fieldCount', { count: shown.length })}
      </span>
      {/* The same round toggle an AI entry opens with. */}
      <Button
        size='icon-xs'
        variant='outline'
        className='rounded-full'
        aria-expanded={open}
        aria-label={text(open ? 'collapse' : 'expand')}
        onClick={onToggle}
      >
        <ChevronDown
          className={`transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </Button>
    </>
  );
}

// What an activity's entry says became of it: planned, moved (only its
// time changed), edited, its status changed, or deleted.
const activityState = (event: Data): string => {
  if (event.action === 'created') return 'planned';
  if (event.action === 'activityDeleted') return 'deleted';
  if (event.action === 'updated') {
    const keys = Object.keys(event.changes ?? {});
    return keys.includes('startAt') &&
      keys.every((key) => key === 'startAt' || key === 'endAt')
      ? 'moved'
      : 'edited';
  }
  // Done or called off; a no-show, recorded before that status went,
  // reads as cancelled.
  return toText(event.toValue) === 'noShow'
    ? 'cancelled'
    : toText(event.toValue);
};

// One of the record's activities on its timeline, after who did it: what
// became of it ("planned", "completed", "cancelled", "moved", "edited",
// "deleted"), its type and name (opening it, unless it is gone), and when
// it is, what changed, or, done, what came of it.
function ActivityEvent({
  event,
  open,
  onToggle,
  names,
  fileNames,
}: {
  event: Data;
  open: boolean;
  onToggle: () => void;
  names: Record<string, string>;
  fileNames: Record<string, string>;
}): ReactElement {
  const { text, language } = useCrmText();
  const { data: meta } = useMetadata();
  const changes = (event.changes ?? {}) as Data;
  // A deleted one is known by what its record kept of it.
  const activity = (
    event.action === 'activityDeleted'
      ? { ...changes, id: changes.activityId }
      : (event.activity ?? {})
  ) as Data;
  const zone = meta?.settings.timeZone ?? 'Asia/Shanghai';
  const verb = activityState(event);
  // Short (no year), beside the entry's own time on the right.
  const when = (at: unknown): string => {
    const date = new Date(toText(at));
    return Number.isFinite(+date)
      ? new Intl.DateTimeFormat(language, {
          timeZone: zone,
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        }).format(date)
      : '';
  };
  return (
    <>
      <span className='shrink-0 text-muted-foreground'>
        {text(`feed.activity.${verb}`, { defaultValue: verb })}
      </span>
      {/* "Activity", whatever its type: the name says what it is. */}
      <span className='shrink-0 text-muted-foreground'>
        {text('feed.activity.noun')}
      </span>
      {/* A long name is cut short, whole on hover; one deleted is no
          longer a link. On an edit the change comes first, the name taking
          at most two fifths of the line. */}
      <span
        className={`min-w-0 shrink ${verb === 'edited' ? 'max-w-[40%]' : ''}`}
      >
        {verb === 'deleted' ? (
          <span
            className='block truncate font-medium'
            title={toText(activity.name)}
          >
            {toText(activity.name)}
          </span>
        ) : (
          <RecordLink
            entity='activities'
            record={{ id: toText(activity.id), name: toText(activity.name) }}
          />
        )}
      </span>
      {/* What an edit changed, as a record's own edits read. */}
      {verb === 'edited' ? (
        <HistoryChanges
          entity='activities'
          record={activity as CrmRecord}
          changes={event.changes}
          previous={event.previous}
          names={names}
          fileNames={fileNames}
          open={open}
          onToggle={onToggle}
        />
      ) : null}
      {/* When it is, as planned or moved; for one done, its outcome. */}
      {event.action === 'created' || verb === 'moved' ? (
        changes.startAt ? (
          // Always whole, the tags right after it; the name gives way.
          <span className='shrink-0 text-muted-foreground tabular-nums'>
            {verb === 'moved'
              ? text('feed.activity.to', { time: when(changes.startAt) })
              : `· ${when(changes.startAt)}`}
          </span>
        ) : null
      ) : toText(event.toValue) === 'completed' && activity.feedback ? (
        // Only the room the name leaves (no basis of its own), so a long
        // outcome is what gets cut, never the name.
        <span className='min-w-0 flex-1 basis-0 truncate text-muted-foreground'>
          · {markdownLine(toText(activity.feedback))}
        </span>
      ) : null}
    </>
  );
}

// A note's text, as its entry keeps it.
const noteText = (event: { changes?: unknown }): string =>
  toText((event.changes as Data | undefined)?.text ?? '');

// A merge on the kept lead's timeline: the lead merged in, as it was, and
// what came over with it (server/providers/crm/lead-merge.ts).
function MergedLead({ changes }: { changes?: unknown }): ReactElement {
  const { text } = useCrmText();
  const values = (changes ?? {}) as Data;
  const lead = (values.lead ?? {}) as Data;
  const activities = Number(values.activities ?? 0);
  const notes = Number(values.notes ?? 0);
  return (
    <>
      <span className='min-w-0 truncate'>
        {[lead.name, lead.company].filter(Boolean).map(toText).join(' / ')}
      </span>
      {activities || notes ? (
        <span className='shrink-0 text-xs text-muted-foreground'>
          {text('feed.mergedMoved', { activities, notes })}
        </span>
      ) : null}
    </>
  );
}

// Each kind of entry's icon on the timeline's rail.
const eventIcons: Record<string, LucideIcon> = {
  created: CirclePlus,
  updated: PencilLine,
  converted: ArrowRightLeft,
  deleted: Trash2,
  ai: Sparkles,
  // A note's entries by what they concern, as files' are: added, edited or
  // removed, all under the note.
  note: StickyNote,
  noteEdited: StickyNote,
  noteDeleted: StickyNote,
  // A person asking the AI to redo its card, in their words.
  aiRevise: MessageCircle,
  merged: Merge,
};

// An update that changed the files alone, which the timeline reads as
// files added or removed rather than as an update.
const filesOnly = (event: Data): boolean => {
  const keys = Object.keys((event.changes as Data | undefined) ?? {}).filter(
    (key) => key !== 'id',
  );
  return (
    event.action === 'updated' &&
    keys.length === 1 &&
    keys[0] === 'attachments' &&
    Boolean((event.previous as Data | undefined)?.attachments !== undefined)
  );
};

// Status and stage moves, which the timeline draws as field updates.
const moves = new Set(['status', 'stage']);

// The timeline's entries by month, newest first as they come, each month
// named in the reader's language and the business time zone.
function months(
  events: Data[],
  language: string,
  timeZone: string,
): [string, Data[]][] {
  const format = new Intl.DateTimeFormat(language, {
    year: 'numeric',
    month: 'long',
    timeZone,
  });
  const groups = new Map<string, Data[]>();
  for (const event of events) {
    const month = format.format(new Date(toText(event.createdAt)));
    groups.set(month, [...(groups.get(month) ?? []), event]);
  }
  return [...groups];
}

// A record's activity feed, the tab once called its change history: what
// people changed, what the AI proposed and someone confirmed (marked so), and
// the AI's own work such as a lead's evaluation, newest first, all of it or
// only the people's or the AI's. The first page of everything comes with the
// record; a filter asks the history endpoint for its own.
export function HistoryFeed({
  entity,
  id,
  record,
  initial,
  names,
  statusKey,
  editable = false,
  recordName,
  focusId,
  focusAt,
  onOpenNote,
}: {
  entity: Entity;
  id: string;
  record: CrmRecord;
  initial: { data: Data[]; total: number } | undefined;
  names: Record<string, string>;
  statusKey?: string;
  // Whether the reader may act on a waiting AI verdict here (a lead's).
  editable?: boolean;
  recordName?: string;
  // The entry to scroll to and mark: one the page opened the timeline at,
  // or one the address names (?focus=, from "Waiting on me"). A new
  // `focusAt` asks for it again (the same entry, clicked once more).
  focusId?: string;
  focusAt?: number;
  // Opens a note in the Notes tab, where it is read whole and changed: the
  // timeline only points to it.
  onOpenNote?: (noteId: string) => void;
}): ReactElement {
  const { text, language } = useCrmText();
  const refresh = useRefresh();
  const [searchParams] = useSearchParams();
  const focus = focusId ?? searchParams.get('focus') ?? undefined;
  const { data: meta } = useMetadata();
  // The evaluations opened into their records.
  const [opened, setOpened] = useState<ReadonlySet<string>>(() => new Set());
  // Opens or closes an entry: an AI entry's card, a save's fields.
  const toggle = (key: string): void =>
    setOpened((previous) => {
      const next = new Set(previous);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  const timeZone = meta?.settings.timeZone ?? 'Asia/Shanghai';
  const optionText = (value: unknown): string =>
    text(`options.${toText(value)}`, { defaultValue: toText(value) });
  const base = `${toText(entity)}/${toText(id)}/history`;
  const more = useMore<Data>(base, initial);
  // The records the AI follows up, whose waiting cards are handled here.
  const followed =
    entity === 'leads' || entity === 'opportunities' ? entity : undefined;
  // The newest AI evaluation shown (the feed comes newest first).
  const latestEvaluation = toText(
    more.records.find((event) => event.action === 'ai')?.id ?? '',
  );
  // Entries name attachments by id; one lookup turns them into filenames.
  const fileIds = [
    ...new Set(
      more.records
        .flatMap((event) =>
          arrayValues((event.changes as Data | undefined)?.attachments).map(
            toText,
          ),
        )
        .filter(Boolean),
    ),
  ];
  const { data: files } = useCrmQuery<{ id: string; filename: string }[]>(
    `files?ids=${encodeURIComponent(fileIds.join(','))}`,
    fileIds.length > 0,
  );
  const fileNames = Object.fromEntries(
    (files ?? []).map((file) => [file.id, file.filename]),
  );
  // Bring the entry asked for into view once it has loaded: the pages
  // before it loaded first, and again on each ask.
  const loaded = more.records.some((event) => toText(event.id) === focus);
  useEffect(() => {
    if (focus && loaded)
      document
        .getElementById(`feed-${focus}`)
        ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [focus, loaded, focusAt]);
  useEffect(() => {
    if (focus && !loaded && more.hasMore && !more.loading) void more.loadMore();
  }, [focus, loaded, more]);
  // The note an edit belongs to: named by the entry, or, for edits recorded
  // before they named it, the note that reads as the edit left it.
  const noteOf = (event: Data): string | undefined => {
    const named = toText((event.changes as Data | undefined)?.noteId);
    if (named) return named;
    const edited = noteText(event);
    return edited
      ? toText(
          more.records.find(
            (entry) =>
              entry.action === 'note' &&
              toText(entry.recordId) === toText(event.recordId) &&
              noteText(entry) === edited,
          )?.id ?? '',
        ) || undefined
      : undefined;
  };
  const allNames = { ...names, ...more.titles };
  return (
    <>
      {!more.records.length ? (
        <p className='text-sm text-muted-foreground'>{text('feed.empty')}</p>
      ) : (
        // As record timelines commonly are: entries grouped by month under a
        // light rule, each on a rail of icons, read as a sentence — who,
        // what they did (muted), what changed — with when on the right.
        <div className='grid grid-cols-[minmax(0,1fr)] gap-6'>
          {months(more.records, language, timeZone).map(([month, events]) => (
            <section
              key={month}
              className='grid min-w-0 grid-cols-[minmax(0,1fr)] gap-4'
            >
              <div className='flex items-center gap-4 text-xs font-semibold text-muted-foreground/70'>
                {month}
                <span className='h-px flex-1 bg-border' />
              </div>
              <ol className='relative'>
                {/* The rail behind the icons, slim and borderless. */}
                <span
                  aria-hidden
                  className='absolute inset-y-0 left-0 w-5 rounded-full bg-muted/30'
                />
                {events.map((event, index) => {
                  const key = toText(event.id);
                  const ai = event.action === 'ai';
                  // A note: its text in one line. Its edits and its removal
                  // only say that they happened, so the text shows once, on
                  // the entry that added it (the note as it now reads,
                  // marked edited).
                  const note = event.action === 'note';
                  const pending =
                    ai && followed && event.aiStatus === 'pending';
                  // An approval's AI review for its approver
                  // (approval-review.tsx): open while it waits, as a
                  // follow-up card is.
                  const review = ai && entity === 'approvals';
                  const reviewWaiting = review && event.aiStatus === 'pending';
                  const open =
                    pending ||
                    reviewWaiting ||
                    focus === key ||
                    opened.has(key);
                  // Files added or removed show the attachments' clip.
                  // An entry of one of the record's activities: planned,
                  // done or called off, or moved.
                  // (On an activity's own timeline, its entries are its own.)
                  const activityEvent =
                    (event.entity === 'activities' &&
                      entity !== 'activities') ||
                    event.action === 'activityDeleted';
                  // Every activity entry carries the Activities tab's icon.
                  const Icon = activityEvent
                    ? CalendarDays
                    : filesOnly(event)
                      ? Paperclip
                      : (eventIcons[toText(event.action)] ?? PencilLine);
                  return (
                    <li
                      id={`feed-${key}`}
                      key={key}
                      className='relative flex scroll-mt-24 gap-3'
                    >
                      <div className='flex w-5 shrink-0 flex-col items-center'>
                        <span className='flex h-[26px] items-center justify-center'>
                          <Icon
                            className={`size-3.5 ${ai ? 'text-ai' : 'text-muted-foreground'}`}
                          />
                        </span>
                        {index < events.length - 1 && (
                          <span className='min-h-3 w-px flex-1 bg-border/50' />
                        )}
                      </div>
                      <div
                        className={`min-w-0 flex-1 pb-3 ${
                          focus === key
                            ? 'crm-arrive -mx-2 rounded-lg bg-ai/5 px-2'
                            : ''
                        }`}
                      >
                        <div className='flex min-h-[26px] items-center gap-3 text-sm'>
                          {/* An entry is one line, never wrapped: what is
                              long (a change's values, a note's excerpt, a
                              verdict) gives way instead, cut where the line
                              ends. */}
                          {/* Clipped at its end: on a narrow column (a
                              drawer's) nothing runs into the time. */}
                          <span className='flex min-w-0 flex-1 items-center gap-x-1.5 overflow-hidden whitespace-nowrap'>
                            {/* Who: a person, or "AI" for its own work. */}
                            <span className='shrink-0'>
                              {ai
                                ? text('feed.ai')
                                : meta?.users.find(
                                    (u) => u.id === event.actorId,
                                  )?.name}
                            </span>
                            {/* "Edited a note" leads to the note it changed,
                                whose entry shows the text. */}
                            {activityEvent ? (
                              <ActivityEvent
                                event={event}
                                open={open}
                                onToggle={() => toggle(key)}
                                names={allNames}
                                fileNames={fileNames}
                              />
                            ) : event.action === 'noteEdited' &&
                              onOpenNote &&
                              noteOf(event) ? (
                              <button
                                type='button'
                                className='text-muted-foreground underline-offset-2 hover:text-foreground hover:underline'
                                onClick={() => onOpenNote(noteOf(event)!)}
                              >
                                {text('feed.did.noteEdited')}
                              </button>
                            ) : (
                              // Empty for files alone, whose "added" or
                              // "removed" follows: hidden, so no gap doubles.
                              // The verb gives way last, only once the values
                              // have, so the tags after it stay in view on a
                              // narrow column; clipped, not ellipsed, since a
                              // squeeze of a fraction of a pixel would
                              // otherwise end it in an ellipsis.
                              <span className='min-w-0 shrink-[0.001] overflow-hidden text-clip text-muted-foreground empty:hidden'>
                                {ai
                                  ? // While it runs, and if it never finished,
                                    // the line says so rather than that a
                                    // suggestion was given.
                                    text(
                                      event.aiStatus === 'running'
                                        ? review
                                          ? 'feed.reviewing'
                                          : 'feed.evaluating'
                                        : event.aiStatus === 'failed'
                                          ? review
                                            ? 'feed.reviewFailed'
                                            : 'feed.evaluationFailed'
                                          : review
                                            ? 'feed.reviewed'
                                            : 'feed.evaluated',
                                    )
                                  : filesOnly(event)
                                    ? ''
                                    : // A status or stage move reads as any
                                      // other field's update.
                                      text(
                                        `feed.did.${
                                          moves.has(toText(event.action))
                                            ? 'updated'
                                            : toText(event.action)
                                        }`,
                                        {
                                          defaultValue: text(
                                            `events.${toText(event.action)}`,
                                          ),
                                        },
                                      )}
                              </span>
                            )}
                            {/* A status or stage move, drawn as the
                                field changes below it are. */}
                            {event.fromValue && statusKey && !activityEvent ? (
                              <span className='inline-flex items-baseline gap-1.5'>
                                <span className='text-muted-foreground'>
                                  {text(fieldLabelKey(entity, statusKey))}
                                </span>
                                {optionText(event.fromValue)}
                                <span aria-hidden>→</span>
                                {optionText(event.toValue)}
                              </span>
                            ) : null}
                            {ai && event.aiStatus === 'running' ? (
                              <Spinner className='size-3.5 shrink-0 text-ai' />
                            ) : review && event.aiStatus !== 'failed' ? (
                              <ReviewFeedEntry entry={event} />
                            ) : ai &&
                              !pending &&
                              event.aiStatus !== 'failed' ? (
                              <EvaluationFeedEntry entry={event} />
                            ) : null}
                            {/* A creation says only that it happened: the
                                values it started with are the record's own
                                first state. */}
                            {!ai &&
                              !note &&
                              event.action !== 'created' &&
                              !toText(event.action).startsWith('note') &&
                              event.action !== 'aiRevise' &&
                              event.action !== 'merged' &&
                              !activityEvent && (
                                <HistoryChanges
                                  entity={entity}
                                  record={record}
                                  changes={event.changes}
                                  previous={event.previous}
                                  movedField={
                                    event.fromValue ? statusKey : undefined
                                  }
                                  names={allNames}
                                  fileNames={fileNames}
                                  open={open}
                                  onToggle={() => toggle(key)}
                                />
                              )}
                            {/* A note in one line, as a change is: its text
                                cut where the line ends, opening the note in
                                the Notes tab, where it is read whole and
                                changed. */}
                            {/* What the person asked the AI to change, in
                                their words, cut where the line ends. */}
                            {event.action === 'merged' ? (
                              <MergedLead changes={event.changes} />
                            ) : null}
                            {event.action === 'aiRevise' ? (
                              <span className='min-w-0 truncate'>
                                「{noteText(event).replace(/\s+/g, ' ')}」
                              </span>
                            ) : null}
                            {note ? (
                              onOpenNote ? (
                                <button
                                  type='button'
                                  className='min-w-0 truncate text-left underline-offset-2 hover:underline'
                                  onClick={() => onOpenNote(key)}
                                >
                                  {markdownLine(noteText(event))}
                                </button>
                              ) : (
                                <span className='min-w-0 truncate'>
                                  {markdownLine(noteText(event))}
                                </span>
                              )
                            ) : null}
                            {/* The AI's part in a person's change, last on the
                                line: proposed
                                in the chat or an evaluation, or, for a lead,
                                organised from pasted text. */}
                            {event.source === 'assistant' && (
                              <Badge variant='ai'>
                                {text('feed.aiProposed')}
                              </Badge>
                            )}
                            {event.source === 'capture' && (
                              <Badge variant='ai'>
                                {text('feed.aiCaptured')}
                              </Badge>
                            )}
                            {/* An edited note says so, its edit time on
                                hover. */}
                            {note && event.editedAt ? (
                              <span
                                className='shrink-0 text-xs text-muted-foreground'
                                title={localDate(
                                  event.editedAt,
                                  language,
                                  timeZone,
                                )}
                              >
                                {text('notes.edited')}
                              </span>
                            ) : null}
                            {/* An evaluation opens into its record (not
                                while it runs: there is nothing to open). */}
                            {ai &&
                              !pending &&
                              !reviewWaiting &&
                              event.aiStatus !== 'running' && (
                                <Button
                                  size='icon-xs'
                                  variant='outline'
                                  className='rounded-full'
                                  aria-expanded={open}
                                  aria-label={text(
                                    open ? 'collapse' : 'expand',
                                  )}
                                  onClick={() => toggle(key)}
                                >
                                  <ChevronDown
                                    className={`transition-transform ${open ? 'rotate-180' : ''}`}
                                  />
                                </Button>
                              )}
                          </span>
                          <time
                            dateTime={toText(event.createdAt)}
                            // On the entry's first line, however far the
                            // line unfolds below it.
                            className='shrink-0 self-start text-xs leading-[26px] text-muted-foreground/80 tabular-nums'
                          >
                            {localDate(event.createdAt, language, timeZone)}
                          </time>
                        </div>
                        {/* A waiting verdict is handled here, open; any other
                            evaluation is its record, when opened. */}
                        {review && open && event.aiStatus !== 'running' ? (
                          <div className='mt-1'>
                            <ReviewPanel
                              entry={
                                {
                                  id: key,
                                  recordId: id,
                                  status: toText(event.aiStatus),
                                  createdAt: toText(event.createdAt),
                                  ai: event.ai,
                                } as ReviewEntry
                              }
                              approvalId={id}
                              approvalName={recordName ?? ''}
                              onChanged={refresh}
                            />
                          </div>
                        ) : pending ? (
                          <div className='mt-1'>
                            <VerdictPanel
                              entry={
                                {
                                  id: key,
                                  status: 'pending',
                                  createdAt: toText(event.createdAt),
                                  ai: event.ai,
                                } as EvaluationEntry
                              }
                              entity={followed}
                              recordId={id}
                              recordName={recordName}
                              editable={editable}
                              onChanged={refresh}
                            />
                          </div>
                        ) : ai && open ? (
                          <div className='mt-1'>
                            {/* A decided evaluation opened: its own card,
                                read-only, on a neutral ground. */}
                            <VerdictPanel
                              entry={
                                {
                                  id: key,
                                  status: toText(event.aiStatus),
                                  createdAt: toText(event.createdAt),
                                  ai: event.ai,
                                } as EvaluationEntry
                              }
                              entity={followed}
                              recordId={id}
                              recordName={recordName}
                              // The lead's latest evaluation may be run again;
                              // an earlier one is only its record.
                              editable={editable && key === latestEvaluation}
                              onChanged={refresh}
                              full
                            />
                          </div>
                        ) : null}
                        {/* An activity's edit, unfolded likewise. */}
                        {activityEvent && activityState(event) === 'edited' && (
                          <HistoryChanges
                            part='rows'
                            open={open}
                            entity='activities'
                            record={(event.activity ?? {}) as CrmRecord}
                            changes={event.changes}
                            previous={event.previous}
                            names={allNames}
                            fileNames={fileNames}
                          />
                        )}
                        {/* A save's fields, unfolded under the whole entry. */}
                        {!ai &&
                          !note &&
                          event.action !== 'created' &&
                          !toText(event.action).startsWith('note') &&
                          event.action !== 'aiRevise' &&
                          !activityEvent && (
                            <HistoryChanges
                              part='rows'
                              open={open}
                              entity={entity}
                              record={record}
                              changes={event.changes}
                              previous={event.previous}
                              movedField={
                                event.fromValue ? statusKey : undefined
                              }
                              names={allNames}
                              fileNames={fileNames}
                            />
                          )}
                      </div>
                    </li>
                  );
                })}
              </ol>
            </section>
          ))}
        </div>
      )}
      {more.hasMore && (
        <Button
          className='mt-3'
          variant='ghost'
          size='sm'
          disabled={more.loading}
          onClick={() => void more.loadMore()}
        >
          {text('loadMore')} · {more.total - more.records.length}
        </Button>
      )}
    </>
  );
}

// A record's notes tab: the note box, then every note, newest first, with
// who wrote it and when; its author may change or remove one. The same
// notes show in the timeline among its other entries.
export function NotesPanel({
  entity,
  id,
  focusId,
}: {
  entity: Entity;
  id: string;
  // The note the timeline opened, brought into view and marked.
  focusId?: string;
}): ReactElement {
  const { text, language } = useCrmText();
  const { data: meta } = useMetadata();
  const api = useCrmApi();
  const scopeKey = useCrmScopeKey();
  const base = `${toText(entity)}/${toText(id)}/history?action=note`;
  const first = useQuery({
    queryKey: [...scopeKey, base],
    queryFn: () =>
      api<{ data: Data[]; total: number }>(
        `${base}&pageSize=${toText(PAGE_SIZE)}`,
      ),
  });
  const more = useMore<Data>(
    base,
    first.data ? { data: first.data.data, total: first.data.total } : undefined,
  );
  const timeZone = meta?.settings.timeZone ?? 'Asia/Shanghai';
  // The note asked for: brought into view once loaded, the pages before it
  // loaded first.
  const loaded = more.records.some((note) => toText(note.id) === focusId);
  useEffect(() => {
    if (focusId && loaded)
      document
        .getElementById(`note-${focusId}`)
        ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [focusId, loaded]);
  useEffect(() => {
    if (focusId && !loaded && more.hasMore && !more.loading)
      void more.loadMore();
  }, [focusId, loaded, more]);
  return (
    <div>
      <NoteComposer entity={entity} id={id} />
      {first.isLoading ? (
        <Loading />
      ) : !more.records.length ? (
        <p className='text-sm text-muted-foreground'>{text('notes.empty')}</p>
      ) : (
        <ol className='grid gap-4'>
          {more.records.map((note) => (
            <li
              key={toText(note.id)}
              id={`note-${toText(note.id)}`}
              // Marked as a timeline entry opened from elsewhere is.
              className={
                toText(note.id) === focusId
                  ? 'crm-arrive -mx-2 rounded-lg bg-ai/5 px-2 py-1'
                  : undefined
              }
            >
              <div className='flex items-center justify-between gap-3 text-sm'>
                <span className='flex min-w-0 items-center gap-1.5'>
                  <span className='truncate'>
                    {meta?.users.find((u) => u.id === note.actorId)?.name}
                  </span>
                  {note.source === 'assistant' && (
                    <Badge variant='ai'>{text('feed.aiProposed')}</Badge>
                  )}
                </span>
                <span className='shrink-0 text-xs text-muted-foreground/80 tabular-nums'>
                  {note.editedAt ? `${toText(text('notes.edited'))} · ` : ''}
                  {localDate(note.createdAt, language, timeZone)}
                </span>
              </div>
              <NoteBody note={note} mine={note.actorId === meta?.userId} />
            </li>
          ))}
        </ol>
      )}
      {more.hasMore && (
        <Button
          className='mt-3'
          variant='ghost'
          size='sm'
          disabled={more.loading}
          onClick={() => void more.loadMore()}
        >
          {text('loadMore')} · {more.total - more.records.length}
        </Button>
      )}
    </div>
  );
}

// The note box atop a record's notes. Anyone who may read the record may add
// a note, which everyone who may read it sees; Ctrl/⌘+Enter adds it.
function NoteComposer({
  entity,
  id,
}: {
  entity: Entity;
  id: string;
}): ReactElement {
  const { text } = useCrmText();
  const api = useCrmApi();
  const refresh = useRefresh();
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>();
  const add = async (): Promise<void> => {
    if (!draft.trim() || busy) return;
    setBusy(true);
    setError(undefined);
    try {
      await api(`${toText(entity)}/${toText(id)}/notes`, 'POST', {
        text: draft,
      });
      setDraft('');
      await refresh();
    } catch (cause) {
      setError(cause);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className='mb-5 grid gap-2'>
      <Textarea
        aria-label={text('notes.label')}
        value={draft}
        placeholder={text('notes.placeholder')}
        maxLength={LONG_TEXT_LIMIT}
        rows={2}
        className='min-h-14 resize-y text-sm'
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
            event.preventDefault();
            void add();
          }
        }}
      />
      {draft.trim() ? (
        <div className='flex items-center justify-end gap-3'>
          <span className='text-xs text-muted-foreground'>
            {text('notes.shortcut')}
          </span>
          <Button size='sm' disabled={busy} onClick={() => void add()}>
            {text('notes.add')}
          </Button>
        </div>
      ) : null}
      <ErrorNotice error={error} />
    </div>
  );
}

// A note in the feed: its text, and for its author, edit and delete in the
// corner (delete asks once more).
function NoteBody({ note, mine }: { note: Data; mine: boolean }): ReactElement {
  const { text } = useCrmText();
  const api = useCrmApi();
  const refresh = useRefresh();
  const body = toText((note.changes as Data | undefined)?.text ?? '');
  const [draft, setDraft] = useState<string>();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>();
  const run = async (call: () => Promise<unknown>): Promise<void> => {
    setBusy(true);
    setError(undefined);
    try {
      await call();
      await refresh();
      setDraft(undefined);
      setConfirming(false);
    } catch (cause) {
      setError(cause);
    } finally {
      setBusy(false);
    }
  };
  const path = `notes/${toText(note.id)}`;
  if (draft !== undefined)
    return (
      <div className='mt-1 grid gap-2'>
        <Textarea
          aria-label={text('notes.label')}
          value={draft}
          maxLength={LONG_TEXT_LIMIT}
          className='min-h-20 text-sm'
          onChange={(event) => setDraft(event.target.value)}
        />
        <div className='flex justify-end gap-2'>
          <Button size='sm' variant='ghost' onClick={() => setDraft(undefined)}>
            {text('cancel')}
          </Button>
          <Button
            size='sm'
            disabled={busy || !draft.trim()}
            onClick={() => void run(() => api(path, 'PATCH', { text: draft }))}
          >
            {text('save')}
          </Button>
        </div>
        <ErrorNotice error={error} />
      </div>
    );
  return (
    <div className='group/note relative mt-1 rounded-lg bg-muted/40 px-3 py-2 text-sm'>
      {/* A long note shows its first lines until opened. */}
      <LongText value={body} />
      {mine ? (
        <div
          className={`absolute top-1 right-1 flex gap-0.5 rounded-md bg-background/90 transition-opacity focus-within:opacity-100 group-hover/note:opacity-100 ${
            confirming ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <Button
            size='xs'
            variant='ghost'
            disabled={busy}
            onClick={() => setDraft(body)}
          >
            <PencilLine />
            {text('edit')}
          </Button>
          <Button
            size='xs'
            variant={confirming ? 'destructive' : 'ghost'}
            disabled={busy}
            onClick={() =>
              confirming
                ? void run(() => api(path, 'DELETE'))
                : setConfirming(true)
            }
            onBlur={() => setConfirming(false)}
          >
            <Trash2 />
            {text(confirming ? 'notes.confirmDelete' : 'delete')}
          </Button>
        </div>
      ) : null}
      <ErrorNotice error={error} />
    </div>
  );
}

// A group of a record's particulars (the lead's, the activity's): a heading,
// then its rows, set off from the group before by space alone.
export function InfoGroup({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}): ReactElement {
  return (
    <section className='py-3 first:pt-0 last:pb-0'>
      <h3 className='px-2 pb-1.5 text-sm font-medium'>{title}</h3>
      <dl>{children}</dl>
    </section>
  );
}

// A row of a record's particulars: the label, then the value (an
// inline editor, a status, a time).
export function InfoRow({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}): ReactElement {
  return (
    <div className='grid grid-cols-[6.5rem_minmax(0,1fr)] items-start gap-2'>
      <dt className='flex items-center gap-1.5 px-2 py-1.5 text-sm text-muted-foreground'>
        <span className='min-w-0 leading-snug'>{label}</span>
      </dt>
      <dd className='min-w-0 text-sm'>{children}</dd>
    </div>
  );
}
