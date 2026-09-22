import { recordTitle } from '../components/crm/lookups.js';
import { editsAll, sentence, toText, useMore } from '../components/crm/api.js';
import { useEffect, useState, type ReactElement, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router';
import {
  useRecordDrawer,
  useRecordLink,
} from '../components/crm/record-drawer.js';
import {
  ArrowUpRight,
  Banknote,
  ClipboardCheck,
  Briefcase,
  Building2,
  CalendarCheck,
  CalendarClock,
  CalendarDays,
  CalendarPlus,
  CircleDot,
  Clock,
  Coins,
  ContactRound,
  Factory,
  FileText,
  Globe,
  History,
  Mail,
  MapPin,
  MapPinned,
  Megaphone,
  MessageSquare,
  Phone,
  Plus,
  Radar,
  Sparkles,
  Star,
  Send,
  ShieldCheck,
  StickyNote,
  Tag,
  Target,
  Trash2,
  User,
  UserCheck,
  Users,
  X,
  type LucideIcon,
} from 'lucide-react';
import { Badge } from '../components/ui/badge.js';
import { Button } from '../components/ui/button.js';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog.js';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '../components/ui/card.js';
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
  useCrmQuery,
  useCrmText,
  useMetadata,
  useRefresh,
  fieldLabelKey,
  localDate,
  rows,
  type CrmRecord,
  type Data,
  type Detail,
  type Entity,
  type Field,
} from '../components/crm/api.js';
import {
  CrmFrame,
  ErrorNotice,
  Loading,
  RecordLink,
  Status,
  Value,
} from '../components/crm/common.js';
import { InlineField } from '../components/crm/inline.js';
import { Choice, RecordForm } from '../components/crm/form.js';
import { StageField } from '../components/crm/reasons.js';
import { StageStepper } from '../components/crm/stage-stepper.js';
import { ApprovalActions } from '../components/crm/approval-actions.js';
import {
  ActivityItem,
  Attachments,
  ConfirmDialog,
  HistoryChanges,
  LeadRow,
  RecordAttachments,
  WebsiteField,
} from './crm-detail.js';
import { UploadZone } from '../components/crm/attachments.js';

// Which shortcuts a detail page offers the assistant, per the specification.
// Each is a complete instruction sent as soon as it is clicked.
const shortcuts: Partial<Record<Entity, readonly string[]>> = {
  accounts: ['summarizeAccount', 'researchCompany', 'findOpportunities'],
  opportunities: ['analyzeOpportunity'],
  activities: ['prepareActivity', 'reportActivity', 'nextActivity'],
};

// The details card, per object: the order the specification lists the fields
// in, with an icon each, the way the lead page does it. "region" is the
// country / state / city trio on one row. Objects without an entry fall back
// to the schema's field order.
const detailLayout: Partial<Record<Entity, readonly string[]>> = {
  opportunities: [
    'accountId',
    'businessType',
    'money',
    'expectedCloseAt',
    'source',
    'description',
    // Lost / pause reasons and the resume date live on the stage strip.
  ],
  activities: [
    'type',
    'startAt',
    'endAt',
    'internalParticipants',
    'externalParticipants',
    'leadId',
    'accountId',
    'opportunityId',
    'description',
    'feedback',
  ],
  // The decision fields are read-only rows: written by the approval actions.
  approvals: [
    'opportunityId',
    'topic',
    'approverId',
    'description',
    'decisionComment',
  ],
  contacts: [
    'accountId',
    'primary',
    'phone',
    'email',
    'jobTitle',
    'gender',
    'employed',
    'source',
    'notes',
  ],
  accounts: [
    'website',
    'type',
    'employees',
    'industry',
    'region',
    'address',
    'source',
    'description',
    'notes',
  ],
};
const nameIcons: Partial<Record<Entity, LucideIcon>> = {
  accounts: Building2,
  contacts: User,
  opportunities: Target,
  activities: CalendarDays,
  approvals: ClipboardCheck,
};
const fieldIcons: Record<string, LucideIcon> = {
  name: Building2,
  website: Globe,
  type: Tag,
  employees: Users,
  industry: Factory,
  region: MapPin,
  money: Banknote,
  address: MapPinned,
  source: Megaphone,
  description: FileText,
  notes: StickyNote,
  phone: Phone,
  email: Mail,
  jobTitle: Briefcase,
  accountId: Building2,
  amount: Banknote,
  currency: Coins,
  expectedCloseAt: CalendarClock,
  businessType: Tag,
  startAt: Clock,
  endAt: Clock,
  leadId: Radar,
  opportunityId: Target,
  feedback: MessageSquare,
  gender: User,
  employed: UserCheck,
  primary: Star,
  internalParticipants: Users,
  externalParticipants: ContactRound,
  topic: Tag,
  approverId: ShieldCheck,
  decisionComment: MessageSquare,
};
// Rows the page shows but never edits in place: the approval's decision trail.
const readOnlyKeys: Record<string, Field> = {
  decisionComment: { key: 'decisionComment', type: 'textarea' },
};

// Fields shown in the summary row rather than the details card.
const summaryKeys = new Set(['ownerId', 'status', 'stage']);
// Reason fields only mean something while their status is current.
const reasonKeys: Record<string, string[]> = {
  lostReason: ['lost'],
  churnReason: ['churned'],
  pauseReason: ['paused'],
  resumeAt: ['paused'],
};

// The account a contact or a deal belongs to, in the title line.
function AccountCrumb({
  id,
  name,
}: {
  id: string;
  name: string;
}): ReactElement {
  const link = useRecordLink('accounts', id);
  return (
    <Link className='px-2 hover:text-primary hover:underline' {...link}>
      {name}
    </Link>
  );
}

export default function EntityDetail({
  entity,
  id,
}: {
  entity: Entity;
  id: string;
}): ReactElement {
  const {
    data: detail,
    error: loadError,
    isLoading,
  } = useCrmQuery<Detail>(`${toText(entity)}/${toText(id)}`);
  const { data: meta } = useMetadata();
  const api = useCrmApi();
  const refresh = useRefresh();
  const navigate = useNavigate();
  const drawer = useRecordDrawer();
  const { text, language } = useCrmText();
  const [tab, setTab] = useState<string>();
  // The related lists and the history arrive one page each with the
  // record; these grow them from the list and history endpoints.
  const linkParam =
    entity === 'leads'
      ? `leadId=${toText(id)}`
      : entity === 'accounts'
        ? `accountId=${toText(id)}`
        : entity === 'contacts'
          ? `contactId=${toText(id)}`
          : entity === 'opportunities'
            ? `opportunityId=${toText(id)}`
            : '';
  const firstPage = (name: Entity) =>
    detail?.related[name]
      ? {
          data: rows(detail.related[name]) as CrmRecord[],
          total:
            detail.relatedTotals?.[name] ?? rows(detail.related[name]).length,
        }
      : undefined;
  const moreActivities = useMore(
    `activities?${linkParam}&sort=-startAt`,
    firstPage('activities'),
  );
  const moreApprovals = useMore(
    `approvals?opportunityId=${toText(id)}`,
    firstPage('approvals'),
  );
  const moreHistory = useMore<Data>(
    `${toText(entity)}/${toText(id)}/history`,
    detail
      ? {
          data: detail.history,
          total: detail.historyTotal ?? detail.history.length,
        }
      : undefined,
  );
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState<{ entity: Entity; initial: Data }>();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<unknown>();
  const [busy, setBusy] = useState(false);
  // History entries name attachments by id; this resolves the ones on this
  // record (and its activities) to filenames for display.
  const historyFileIds = [
    ...new Set(
      moreHistory.records.flatMap((event) => {
        const changes = event.changes as Data | undefined;
        return Array.isArray(changes?.attachments)
          ? changes.attachments.map(toText)
          : [];
      }),
    ),
  ];
  const historyFiles = useCrmQuery<{ id: string; filename: string }[]>(
    `files?ids=${historyFileIds.join(',')}`,
    historyFileIds.length > 0,
  );
  const fileNames = Object.fromEntries(
    (historyFiles.data ?? []).map((f) => [f.id, f.filename]),
  );
  // The assistant panel attaches the record on screen to the conversation;
  // its title follows once the record has loaded.
  const contextName = detail
    ? recordTitle(entity, detail.record, detail.titles)
    : undefined;
  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent('crm-context', {
        detail: { entity, recordId: id, name: contextName },
      }),
    );
    return () => {
      window.dispatchEvent(new CustomEvent('crm-context', { detail: {} }));
    };
  }, [entity, id, contextName]);
  if (isLoading || !meta) return <Loading />;
  if (!detail)
    return (
      <CrmFrame title={text(`entities.${toText(entity)}`)}>
        <ErrorNotice error={loadError} />
      </CrmFrame>
    );
  const record = detail.record;
  const definition = meta.definitions[entity];
  const editable = detail.permissions.edit;
  // Names for everything this page links to, resolved by the server with
  // the record: composed titles for links, bare names for people listed
  // under their own account.
  const names = {
    ...detail.titles,
    ...moreActivities.titles,
    ...moreApprovals.titles,
    ...moreHistory.titles,
  };
  const bareNames = detail.names;
  const title = recordTitle(entity, record, names);
  const field = (key: string): Field =>
    definition.fields.find((f) => f.key === key) ?? { key, type: 'text' };
  const patch = async (values: Data): Promise<void> => {
    await api(`${toText(entity)}/${toText(id)}`, 'PATCH', values);
    await refresh();
  };
  // An activity's external participants come from its account, shown by bare
  // name: the account is already on the page.
  const inline = (key: string): ReactElement => (
    <InlineField
      entity={entity}
      record={record}
      field={field(key)}
      editable={editable}
      lookup={key === 'externalParticipants' ? bareNames : names}
      relationFilter={
        record.accountId ? { accountId: toText(record.accountId) } : undefined
      }
      label={text(fieldLabelKey(entity, key))}
    />
  );
  const convertedFrom = rows(detail.related.leads) as CrmRecord[];
  // Newest first, in the server's order, so pages join up.
  const approvals = moreApprovals.records;
  const activities = moreActivities.records;
  const linkedOpportunities = rows(detail.related.opportunities);
  // A contact has no attachments field of its own: its tab only gathers the
  // files on the activities and opportunities it takes part in.
  const hasOwnFiles = definition.fields.some((f) => f.key === 'attachments');
  const attachmentCount = new Set([
    ...rows(record.attachments as unknown[]).map(toText),
    ...activities.flatMap((a) => rows(a.attachments as unknown[]).map(toText)),
    ...linkedOpportunities.flatMap((o) =>
      rows(o.attachments as unknown[]).map(toText),
    ),
    ...approvals.flatMap((a) => rows(a.attachments as unknown[]).map(toText)),
  ]).size;
  const statusKey = definition.statusField;
  const currentStatus = statusKey ? toText(record[statusKey]) : '';
  // The details card: every writable field except those in the summary row,
  // arrays the inline editor does not handle, and reasons for a status that
  // is not current.
  const inSummary = new Set([...summaryKeys]);
  const detailFields = definition.fields.filter(
    (f) =>
      !f.readOnly &&
      // The name is the page heading, edited there.
      f.key !== 'name' &&
      !inSummary.has(f.key) &&
      !['contacts', 'files'].includes(f.type) &&
      (!reasonKeys[f.key] || reasonKeys[f.key].includes(currentStatus)),
  );
  // The card's row keys: the object's layout when it has one (the trio
  // country/state/city folds into "region"), else the schema's field order.
  const allowed = new Set(detailFields.map((f) => f.key));
  const detailKeys = (
    detailLayout[entity] ??
    detailFields
      .map((f) => f.key)
      .filter((k) => !['state', 'city'].includes(k))
      .map((k) => (k === 'country' ? 'region' : k))
  ).filter((key) =>
    key === 'region'
      ? ['country', 'state', 'city'].some((k) => allowed.has(k))
      : key === 'money'
        ? allowed.has('amount')
        : allowed.has(key) ||
          (reasonKeys[key] && reasonKeys[key].includes(currentStatus)) ||
          // The decision trail shows once there is one.
          (key in readOnlyKeys && Boolean(record[key])),
  );
  // Which related lists this object has, beyond activities.
  const relatedTabs = (
    entity === 'accounts'
      ? (['contacts', 'opportunities'] as const)
      : entity === 'contacts'
        ? (['opportunities'] as const)
        : entity === 'opportunities'
          ? (['approvals'] as const)
          : ([] as const)
  ).filter((name) => detail.related[name] !== undefined);
  const tabs: [string, string, number][] = [
    ...(entity !== 'activities' && entity !== 'approvals'
      ? [
          ['activities', 'entities.activities', moreActivities.total] as [
            string,
            string,
            number,
          ],
        ]
      : []),
    // The opportunity's own contact list with roles, a tab like its others.
    ...(entity === 'opportunities'
      ? [
          [
            'opportunityContacts',
            'entities.contacts',
            rows(record.contacts).length,
          ] as [string, string, number],
        ]
      : []),
    ...relatedTabs.map(
      (name) =>
        [
          name,
          `entities.${name}`,
          detail.relatedTotals?.[name] ?? rows(detail.related[name]).length,
        ] as [string, string, number],
    ),
    // A contact keeps no files of its own; the ones it appears in are read
    // from the activity or opportunity that holds them.
    ...(hasOwnFiles
      ? [
          ['attachments', 'fields.attachments', attachmentCount] as [
            string,
            string,
            number,
          ],
        ]
      : []),
    ['historyTab', 'historyTab', moreHistory.total],
  ];
  const activeTab = tab ?? tabs[0][0];
  const blockerEntries = Object.entries(detail.blockers ?? {}).filter(
    ([, n]) => Number(n) > 0,
  ) as [Entity, number][];
  // An account's activities go the way a lead's do: those anchored only here
  // are deleted with it, those also on a lead or opportunity are kept and
  // unlinked. The dialog states both counts so nothing is a surprise.
  const cascades = entity === 'accounts' || entity === 'opportunities';
  const otherAnchors = (a: Data): boolean =>
    entity === 'accounts'
      ? Boolean(a.leadId || a.opportunityId)
      : Boolean(a.leadId || a.accountId);
  const cascadedActivities = cascades
    ? activities.filter((a) => !otherAnchors(a))
    : [];
  const keptActivities = cascades ? activities.filter(otherAnchors) : [];
  const relatedInput: Data =
    entity === 'accounts'
      ? { accountId: id }
      : entity === 'contacts'
        ? {
            accountId: record.accountId,
            externalParticipants: [id],
            contacts: [{ contactId: id, role: 'other' }],
          }
        : entity === 'opportunities'
          ? { accountId: record.accountId, opportunityId: id }
          : {};
  const shortcut = (key: string): void => {
    window.dispatchEvent(
      new CustomEvent('crm-assistant', {
        detail: {
          prompt: text(`prompts.${key}`),
          entity,
          recordId: id,
          name: contextName,
          // "Report back" is an opening the user completes; the rest are
          // complete instructions.
          send: key !== 'reportActivity',
          // Background research is the one shortcut that looks outside the
          // CRM, so it alone turns on the model's web search.
          webSearch: key === 'researchCompany',
        },
      }),
    );
  };
  const closedAtKey =
    entity === 'opportunities' && ['won', 'lost'].includes(currentStatus)
      ? 'closedAt'
      : entity === 'activities' && currentStatus === 'completed'
        ? 'completedAt'
        : entity === 'approvals' &&
            ['approved', 'rejected'].includes(currentStatus)
          ? 'decidedAt'
          : undefined;
  // The heading is the name field itself, editable in place; a contact's
  // heading adds its account after a slash, as a link.
  // Editable fields pad their value by px-2; the negative margin puts the
  // text itself flush with the description below.
  const heading = (
    <span className='-mx-2 flex flex-wrap items-center'>
      {entity === 'opportunities' && record.accountId ? (
        <>
          <AccountCrumb
            id={toText(record.accountId)}
            name={names[toText(record.accountId)] ?? text('entities.accounts')}
          />
          <span className='text-muted-foreground/60'>/</span>
        </>
      ) : null}
      <InlineField
        entity={entity}
        record={record}
        field={field('name')}
        editable={editable}
        label={text(fieldLabelKey(entity, 'name'))}
        size='title'
      />
      {entity === 'contacts' && record.accountId ? (
        <>
          <span className='text-muted-foreground/60'>/</span>
          <AccountCrumb
            id={toText(record.accountId)}
            name={names[toText(record.accountId)] ?? text('entities.accounts')}
          />
        </>
      ) : null}
    </span>
  );
  return (
    <CrmFrame
      title={heading}
      description={`${toText(text(`entities.${toText(entity)}`))} ID: ${toText(record.id)}`}
      // Pages with shortcuts have their own entries; the contact and
      // approval pages have none and no generic button either — the global
      // entry serves them.
      assistant={
        !shortcuts[entity] && !['contacts', 'approvals'].includes(entity)
      }
      actions={
        <>
          {detail.permissions.delete && (
            <Button variant='outline' onClick={() => setConfirmDelete(true)}>
              <Trash2 />
              {text('deleteRecord', {
                entity: text(`entity.${toText(entity)}`),
              })}
            </Button>
          )}
          {entity === 'approvals' && (
            <ApprovalActions approval={record} names={names} />
          )}
          {shortcuts[entity] && (
            <div className='flex items-center'>
              {shortcuts[entity].map((key) => (
                <Button
                  key={key}
                  variant='ghost'
                  className='text-ai hover:text-ai'
                  onClick={() => shortcut(key)}
                >
                  <Sparkles />
                  {text(key)}
                </Button>
              ))}
            </div>
          )}
          {/* The approver's one entry: a briefing before deciding. It
              analyses only — the decision stays with the buttons above. */}
          {detail.permissions.approve && (
            <Button
              variant='ghost'
              className='text-ai hover:text-ai'
              onClick={() => shortcut('assistApproval')}
            >
              <Sparkles />
              {text('assistApproval')}
            </Button>
          )}
        </>
      }
    >
      <ErrorNotice error={error ?? loadError} />
      <div className='flex flex-wrap items-center gap-x-8 gap-y-2 rounded-xl border bg-card p-4'>
        <LeadRow label={text(fieldLabelKey(entity, 'ownerId'))} icon={User}>
          {inline('ownerId')}
        </LeadRow>
        {entity === 'approvals' && statusKey && (
          // Moved only by the actions above, so shown rather than edited;
          // the marker says which side of it the reader is on.
          <LeadRow label={text(`fields.${statusKey}`)} icon={CircleDot}>
            <span className='flex items-center gap-2 px-2 py-1.5'>
              <Status value={currentStatus} />
              {record.approverId === meta.userId && (
                <Badge
                  variant={
                    currentStatus === 'pending' ? 'default' : 'secondary'
                  }
                >
                  {text(
                    currentStatus === 'pending' ? 'yourDecision' : 'youApprove',
                  )}
                </Badge>
              )}
            </span>
          </LeadRow>
        )}
        {statusKey && entity !== 'opportunities' && entity !== 'approvals' && (
          <LeadRow label={text(`fields.${statusKey}`)} icon={CircleDot}>
            <StageField
              entity={entity}
              record={record}
              field={statusKey}
              editable={editable}
              title={title}
              onSave={patch}
            />
          </LeadRow>
        )}
        {/* The approver's timeline starts when the request reached them, so
            for them the creation time is left out. */}
        {!(entity === 'approvals' && record.approverId === meta.userId) && (
          <LeadRow label={text('fields.createdAt')} icon={CalendarPlus}>
            <span className='px-2 py-1.5 text-sm'>
              {localDate(record.createdAt, language, meta.settings.timeZone)}
            </span>
          </LeadRow>
        )}
        {entity === 'approvals' && record.submittedAt ? (
          <LeadRow label={text('fields.submittedAt')} icon={Send}>
            <span className='px-2 py-1.5 text-sm'>
              {localDate(record.submittedAt, language, meta.settings.timeZone)}
            </span>
          </LeadRow>
        ) : null}
        <LeadRow
          label={text(`fields.${closedAtKey ?? 'updatedAt'}`)}
          icon={closedAtKey ? CalendarCheck : History}
        >
          <span className='px-2 py-1.5 text-sm'>
            {localDate(
              record[closedAtKey ?? 'updatedAt'],
              language,
              meta.settings.timeZone,
            )}
          </span>
        </LeadRow>
      </div>
      {/* Same container query and 5:7 split as the lead page, so the two
          columns hold together with the AI panel open and stack only when
          the area itself is narrow. */}
      {entity === 'opportunities' && (
        // The stage is the page's main state, so it gets the room a stepper
        // needs instead of a slot in the summary row.
        <StageStepper
          record={record}
          editable={editable}
          title={title}
          onSave={patch}
        />
      )}
      <div className='@container'>
        {/* An activity or an approval is mostly its own fields — long
            description, feedback, a decision — with little on the right, so
            those two give the left column the larger share. */}
        <div
          className={`grid items-start gap-6 ${toText(
            ['activities', 'approvals'].includes(entity)
              ? '@3xl:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]'
              : '@3xl:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]',
          )}`}
        >
          <div className='space-y-6'>
            <Card className='shadow-none'>
              <CardHeader>
                <CardTitle>
                  {sentence(
                    text('basicInfo', {
                      entity: text(`entity.${toText(entity)}`),
                    }),
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <dl className='divide-y'>
                  {detailKeys.map((key) => {
                    // Only origin and not a working relation, so it is the last
                    // line of the card rather than a tab of its own.
                    const convertedRow =
                      key === detailKeys[detailKeys.length - 1] &&
                      convertedFrom.length > 0 ? (
                        <div
                          key='convertedFrom'
                          className='grid grid-cols-[8rem_minmax(0,1fr)] items-start gap-2 py-2'
                        >
                          <dt className='flex items-center gap-1.5 px-2 py-1.5 text-xs font-medium text-muted-foreground'>
                            <Radar className='size-3.5 shrink-0' />
                            <span className='min-w-0 leading-snug'>
                              {text('convertedFrom')}
                            </span>
                          </dt>
                          <dd className='flex min-w-0 flex-wrap gap-x-3 gap-y-1 px-2 py-1.5 text-sm'>
                            {convertedFrom.map((lead) => (
                              <RecordLink
                                key={lead.id}
                                entity='leads'
                                record={{
                                  id: lead.id,
                                  name: recordTitle('leads', lead, names),
                                }}
                              />
                            ))}
                          </dd>
                        </div>
                      ) : null;
                    // "name" is a company on an account, a person on a
                    // contact, a deal on an opportunity, an event on an activity.
                    const Icon =
                      key === 'name'
                        ? (nameIcons[entity] ?? fieldIcons.name)
                        : fieldIcons[key];
                    const row = (
                      <div
                        key={key}
                        className='grid grid-cols-[8rem_minmax(0,1fr)] items-start gap-2 py-2'
                      >
                        <dt className='flex items-center gap-1.5 px-2 py-1.5 text-xs font-medium text-muted-foreground'>
                          {Icon ? <Icon className='size-3.5 shrink-0' /> : null}
                          <span className='min-w-0 leading-snug'>
                            {text(
                              key === 'region'
                                ? 'region'
                                : key === 'money'
                                  ? 'fields.amount'
                                  : fieldLabelKey(entity, key),
                            )}
                          </span>
                        </dt>
                        <dd className='min-w-0 text-sm'>
                          {key === 'region' ? (
                            <div className='flex flex-wrap items-center'>
                              {['country', 'state', 'city'].map(
                                (part, index) => (
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
                                ),
                              )}
                            </div>
                          ) : key === 'money' ? (
                            // Currency, then the bare number: both edit in
                            // place, and the sign is not repeated.
                            <div className='flex items-center'>
                              <div className='w-24 shrink-0'>
                                {inline('currency')}
                              </div>
                              <div className='min-w-0 flex-1'>
                                <InlineField
                                  entity={entity}
                                  record={record}
                                  field={field('amount')}
                                  editable={editable}
                                  lookup={names}
                                  label={text('fields.amount')}
                                  bare
                                />
                              </div>
                            </div>
                          ) : key === 'website' ? (
                            <WebsiteField
                              entity={entity}
                              record={record}
                              editable={editable}
                              label={text('fields.website')}
                            />
                          ) : key in readOnlyKeys ? (
                            <span className='block px-2 py-1.5 whitespace-pre-wrap'>
                              <Value
                                record={record}
                                field={readOnlyKeys[key]}
                                lookup={names}
                              />
                            </span>
                          ) : (
                            inline(key)
                          )}
                        </dd>
                      </div>
                    );
                    return convertedRow ? [row, convertedRow] : row;
                  })}
                </dl>
              </CardContent>
            </Card>
          </div>
          <Card className='shadow-none'>
            <CardHeader className='gap-3'>
              <div className='flex flex-wrap items-center justify-between gap-2'>
                <div className='-ml-2.5 flex flex-wrap gap-1'>
                  {tabs.map(([name, label, count]) => (
                    <Button
                      key={name}
                      size='sm'
                      variant={name === activeTab ? 'secondary' : 'ghost'}
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
              {activeTab === 'opportunityContacts' ? (
                <OpportunityContacts
                  record={record}
                  editable={editable}
                  contacts={rows(detail.related.contacts) as CrmRecord[]}
                  contactsTotal={detail.relatedTotals?.contacts}
                  names={bareNames}
                  onSave={patch}
                  // A new person is created at the account, not on the deal:
                  // they then appear under "other contacts" to be added.
                  onCreate={
                    meta.permissions.contacts.create
                      ? () =>
                          setForm({
                            entity: 'contacts',
                            initial: { accountId: record.accountId },
                          })
                      : undefined
                  }
                />
              ) : activeTab === 'approvals' ? (
                <div className='space-y-3'>
                  {editable && Boolean(meta.permissions.approvals.create) && (
                    <Button
                      size='sm'
                      variant='outline'
                      onClick={() =>
                        setForm({
                          entity: 'approvals',
                          initial: { opportunityId: id },
                        })
                      }
                    >
                      <Plus />
                      {text('newApproval')}
                    </Button>
                  )}
                  {!approvals.length ? (
                    <p className='text-sm text-muted-foreground'>
                      {text('noRecords')}
                    </p>
                  ) : (
                    <>
                      <ol className='relative ml-1.5 border-l border-border'>
                        {approvals.map((approval) => (
                          <ApprovalItem
                            key={toText(approval.id)}
                            approval={approval}
                            names={names}
                          />
                        ))}
                      </ol>
                      {moreApprovals.hasMore && (
                        <Button
                          className='mt-3'
                          variant='ghost'
                          size='sm'
                          disabled={moreApprovals.loading}
                          onClick={() => void moreApprovals.loadMore()}
                        >
                          {text('loadMore')} ·{' '}
                          {moreApprovals.total - approvals.length}
                        </Button>
                      )}
                    </>
                  )}
                </div>
              ) : activeTab === 'activities' ? (
                <div className='space-y-3'>
                  {entity !== 'activities' &&
                    Boolean(meta.permissions.activities.create) && (
                      <Button
                        size='sm'
                        variant='outline'
                        onClick={() =>
                          setForm({
                            entity: 'activities',
                            initial: relatedInput,
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
                      <ol className='relative ml-1.5 border-l border-border'>
                        {activities.map((activity) => (
                          <ActivityItem
                            key={toText(activity.id)}
                            activity={activity}
                            titles={names}
                            names={bareNames}
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
              ) : activeTab === 'attachments' ? (
                <RecordAttachments
                  entity={entity}
                  record={record}
                  activities={activities}
                  opportunities={linkedOpportunities}
                  approvals={approvals}
                  editable={editable}
                  onError={setError}
                  uploader={
                    editable && hasOwnFiles ? (
                      <UploadZone
                        entity={entity}
                        record={record}
                        busy={uploading}
                        setBusy={setUploading}
                        onError={setError}
                      />
                    ) : undefined
                  }
                />
              ) : activeTab === 'historyTab' ? (
                <>
                  <ol>
                    {moreHistory.records.map((event) => (
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
                            movedField={event.fromValue ? statusKey : undefined}
                            names={names}
                            fileNames={fileNames}
                          />
                        </span>
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
              ) : (
                // A related list: name, status, owner, updated — with a create
                // button where this object can start one of them.
                <RelatedList
                  entity={activeTab as Entity}
                  records={
                    rows(detail.related[activeTab as Entity]) as CrmRecord[]
                  }
                  total={detail.relatedTotals?.[activeTab as Entity]}
                  base={`${activeTab}?${linkParam}`}
                  titles={names}
                  onCreate={
                    activeTab !== 'leads' &&
                    meta.permissions[activeTab as Entity]?.create
                      ? () =>
                          setForm({
                            entity: activeTab as Entity,
                            initial: relatedInput,
                          })
                      : undefined
                  }
                />
              )}
            </CardContent>
          </Card>
        </div>
      </div>
      {form && (
        <RecordForm
          {...form}
          onClose={() => setForm(undefined)}
          // An approval raised here shows up in this page's approvals tab;
          // an activity in its activities tab. Other new records are opened.
          onSaved={(r) => {
            if (
              !['activities', 'approvals'].includes(form.entity) &&
              form.entity !== entity
            ) {
              if (drawer) drawer.open(form.entity, toText(r.id));
              else void navigate(`/crm/${toText(form.entity)}/${toText(r.id)}`);
            }
          }}
          andThen={
            form.entity === 'approvals'
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
      {confirmDelete && (
        <ConfirmDialog
          title={text('deleteRecordTitle', {
            entity: text(`entity.${toText(entity)}`),
            name: title,
          })}
          description={
            blockerEntries.length ? (
              // Blocked: say what is in the way, each linking to its tab,
              // instead of a generic hint and a failed request.
              <span className='block space-y-2'>
                <span className='block'>
                  {text(
                    entity === 'opportunities'
                      ? 'deleteOpportunityBlocked'
                      : 'deleteBlocked',
                  )}
                </span>
                {blockerEntries.map(([child, n]) => {
                  // Name the records where the page already has them; fall
                  // back to the count alone when it does not.
                  const items = rows(detail.related[child]) as CrmRecord[];
                  const shownItems = items.slice(0, 5);
                  return (
                    <span key={child} className='block text-sm'>
                      <span className='text-foreground'>
                        {text(`entities.${child}`)}（{n}）：
                      </span>
                      {shownItems.length
                        ? shownItems.map((r, i) => (
                            <span key={r.id}>
                              {i > 0 && '、'}
                              <RecordLink
                                entity={child}
                                record={{
                                  id: r.id,
                                  name: recordTitle(child, r, names),
                                }}
                              />
                            </span>
                          ))
                        : null}
                      {n > shownItems.length && (
                        <button
                          type='button'
                          className='ml-1 text-primary hover:underline'
                          onClick={() => {
                            setConfirmDelete(false);
                            setTab(child);
                          }}
                        >
                          {text('andMore', { count: n - shownItems.length })}
                        </button>
                      )}
                    </span>
                  );
                })}
              </span>
            ) : (
              <span className='block space-y-1'>
                <span className='block'>
                  {text(
                    entity === 'contacts'
                      ? 'deleteContactHint'
                      : entity === 'approvals'
                        ? ['draft', 'withdrawn'].includes(toText(record.status))
                          ? 'deleteApprovalHint'
                          : 'deleteDecidedApprovalHint'
                        : entity === 'activities'
                          ? 'deleteActivityHint'
                          : 'deleteHint',
                  )}
                </span>
                {cascadedActivities.length > 0 && (
                  <span className='block text-destructive'>
                    {text('deleteAccountActivities', {
                      count: cascadedActivities.length,
                      entity: text(`entity.${toText(entity)}`),
                    })}
                  </span>
                )}
                {Object.entries(detail.unlinks ?? {})
                  .filter(([, n]) => Number(n) > 0)
                  .map(([child, n]) => (
                    <span key={child} className='block'>
                      {text('deleteContactUnlinks', {
                        count: n,
                        entity: text(`entities.${child}`),
                      })}
                    </span>
                  ))}
                {keptActivities.length > 0 && (
                  <span className='block'>
                    {text('deleteAccountKeptActivities', {
                      count: keptActivities.length,
                      entity: text(`entity.${toText(entity)}`),
                    })}
                  </span>
                )}
              </span>
            )
          }
          busy={busy}
          confirmDisabled={blockerEntries.length > 0}
          onCancel={() => setConfirmDelete(false)}
          onConfirm={() => {
            void (async () => {
              setBusy(true);
              setError(undefined);
              try {
                await api(`${toText(entity)}/${toText(id)}`, 'DELETE');
                // Leave first: refreshing while still on the page refetches
                // the record that no longer exists.
                if (drawer?.inDrawer) drawer.close();
                else void navigate(`/crm/${toText(entity)}`);
                void refresh();
              } catch (e) {
                setError(e);
                setConfirmDelete(false);
              } finally {
                setBusy(false);
              }
            })();
          }}
        />
      )}
    </CrmFrame>
  );
}

function RelatedList({
  entity,
  records: firstPage,
  total,
  base,
  titles,
  onCreate,
}: {
  entity: Entity;
  // The first page, with the server's total and the path for the rest.
  records: CrmRecord[];
  total?: number;
  base: string;
  titles: Record<string, string>;
  onCreate?: () => void;
}): ReactElement {
  const { text } = useCrmText();
  const { data: meta } = useMetadata();
  const more = useMore(base, {
    data: firstPage,
    total: total ?? firstPage.length,
  });
  const records = more.records;
  const names = { ...titles, ...more.titles };
  // Each related object shows the columns that say something about it: a
  // contact has no status, an opportunity has a stage and an amount.
  const columns: readonly string[] =
    entity === 'contacts'
      ? ['name', 'jobTitle', 'phone', 'email']
      : entity === 'opportunities'
        ? ['name', 'stage', 'amount', 'expectedCloseAt', 'ownerId']
        : entity === 'approvals'
          ? ['name', 'topic', 'status', 'ownerId', 'updatedAt']
          : ['name', 'status', 'ownerId', 'updatedAt'];
  const fieldDef = (key: string): Field =>
    meta?.definitions[entity].fields.find((f) => f.key === key) ?? {
      key,
      type: 'text',
    };
  // Contacts read in the order one would call them: the primary contact
  // first, people who have left last, marked inline rather than as columns.
  // Booleans arrive as 0/1 from SQLite, so both are read by truthiness.
  const left = (r: CrmRecord): boolean =>
    r.employed === false || r.employed === 0;
  // Contacts split in two: current people (primary first) in the main list,
  // people who have left in a second, dimmer list beneath it.
  const ordered =
    entity === 'contacts'
      ? records
          .filter((r) => !left(r))
          .sort(
            (a, b) => Number(Boolean(b.primary)) - Number(Boolean(a.primary)),
          )
      : records;
  const departed = entity === 'contacts' ? records.filter(left) : [];
  return (
    <div className='space-y-3'>
      {onCreate && (
        <Button size='sm' variant='outline' onClick={onCreate}>
          <Plus />
          {text('newRecord', { entity: text(`entity.${toText(entity)}`) })}
        </Button>
      )}
      {!records.length ? (
        <p className='text-sm text-muted-foreground'>{text('noRecords')}</p>
      ) : (
        <>
          {entity === 'contacts' ? contactList(ordered) : table(ordered)}
          {more.hasMore && (
            <Button
              variant='ghost'
              size='sm'
              disabled={more.loading}
              onClick={() => void more.loadMore()}
            >
              {text('loadMore')} · {more.total - records.length}
            </Button>
          )}
          {departed.length > 0 && (
            <div className='space-y-2 pt-2'>
              <h4 className='text-xs font-medium text-muted-foreground'>
                {text('leftCompany')}
                <span className='ml-1 tabular-nums'>{departed.length}</span>
              </h4>
              <div className='text-muted-foreground'>
                {contactList(departed)}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
  // Contacts expand in place the way activities do, so a phone number or a
  // job title is corrected without leaving the account.
  function contactList(list: CrmRecord[]): ReactElement {
    return (
      <ul className='divide-y divide-border'>
        {list.map((r) => (
          <ContactItem
            key={r.id}
            contact={r}
            names={names}
            leading={!left(r) && <PrimaryStar contact={r} siblings={records} />}
          />
        ))}
      </ul>
    );
  }
  function table(list: CrmRecord[]): ReactElement {
    return (
      <Table>
        <TableHeader>
          <TableRow>
            {columns.map((key) => (
              <TableHead key={key}>
                {text(fieldLabelKey(entity, key))}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {list.map((r) => (
            <TableRow key={r.id}>
              {columns.map((key) => (
                <TableCell key={key}>
                  {key === 'name' ? (
                    <span className='inline-flex flex-wrap items-center gap-2'>
                      <RecordLink
                        entity={entity}
                        record={{
                          id: r.id,
                          name: recordTitle(entity, r, names),
                        }}
                      />
                    </span>
                  ) : (
                    <Value record={r} field={fieldDef(key)} lookup={names} />
                  )}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  }
}

// One contact in an account's contacts tab: a row that opens in place with
// the fields editable, the way an activity does in the activities tab. The
// star sits beside the row rather than inside it, so toggling the primary
// contact does not also expand the row.
function ContactItem({
  contact,
  names,
  leading,
  trailing,
}: {
  contact: CrmRecord;
  names: Record<string, string>;
  // What sits before the name (the account page's primary star) and at the
  // row's end (the opportunity page's role and remove control).
  leading?: ReactNode;
  trailing?: ReactNode;
}): ReactElement {
  const { text } = useCrmText();
  const contactLink = useRecordLink('contacts', toText(contact.id));
  const { data: meta } = useMetadata();
  const [open, setOpen] = useState(false);
  // Mirrors the server rule: the owner edits their own; a user whose edit
  // scope covers every contact edits any.
  const editable = Boolean(
    meta && (editsAll(meta, 'contacts') || contact.ownerId === meta.userId),
  );
  const field = (key: string): Field =>
    meta?.definitions.contacts.fields.find((f) => f.key === key) ?? {
      key,
      type: 'text',
    };
  const editableField = (key: string): ReactElement => (
    <InlineField
      entity='contacts'
      record={contact}
      field={field(key)}
      editable={editable}
      lookup={names}
      label={text(fieldLabelKey('contacts', key))}
    />
  );
  const cell = (key: string): ReactElement => (
    <div key={key}>
      <dt className='px-2 text-xs text-muted-foreground'>
        {text(fieldLabelKey('contacts', key))}
      </dt>
      <dd>{editableField(key)}</dd>
    </div>
  );
  const summary = ['jobTitle', 'phone', 'email']
    .map((key) => toText(contact[key]))
    .filter(Boolean);
  return (
    <li className='py-0.5'>
      {/* The shading covers the star too, so the row reads as one unit. */}
      <div className='flex items-start gap-1 rounded-md transition-colors hover:bg-muted'>
        {leading ? (
          <span className='ml-1 mt-1.5 flex shrink-0 items-center'>
            {leading}
          </span>
        ) : null}
        <button
          type='button'
          className='min-w-0 flex-1 rounded-md px-2 py-2 text-left'
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          <div className='flex flex-wrap items-baseline gap-x-3 gap-y-0.5'>
            <span className='text-sm font-medium'>{toText(contact.name)}</span>
            {summary.map((value) => (
              <span
                key={value}
                className='truncate text-xs text-muted-foreground'
              >
                {value}
              </span>
            ))}
          </div>
        </button>
        {trailing ? (
          <span className='mt-1.5 flex shrink-0 items-center justify-center'>
            {trailing}
          </span>
        ) : null}
      </div>
      {open && (
        <div className='mt-1 mb-4 divide-y divide-border rounded-md bg-muted/40 px-3 py-0.5 text-sm [&>*]:py-1.5'>
          <dl className='grid gap-x-3 gap-y-1 sm:grid-cols-3'>
            {['name', 'jobTitle', 'gender'].map(cell)}
          </dl>
          {/* Email gets two thirds: addresses run long, phone numbers do not. */}
          <dl className='grid gap-x-3 gap-y-1 sm:grid-cols-[1fr_2fr]'>
            {['phone', 'email'].map(cell)}
          </dl>
          <dl className='grid gap-x-3 gap-y-1 sm:grid-cols-3'>
            {['employed', 'source', 'ownerId'].map(cell)}
          </dl>
          <div>
            <p className='px-2 text-xs text-muted-foreground'>
              {text('fields.notes')}
            </p>
            {editableField('notes')}
          </div>
          <Link
            className='mx-2 inline-flex items-center gap-1 font-medium hover:text-primary hover:underline'
            {...contactLink}
          >
            {text('viewDetails')}
            <ArrowUpRight className='size-3 text-muted-foreground' />
          </Link>
        </div>
      )}
    </li>
  );
}

// The people on an opportunity and their roles. Rows edit in place — the
// role is a dropdown, a row can be removed after confirming — and a new row
// is added from the account's contacts not yet listed.
const contactRoles = [
  'decisionMaker',
  'champion',
  'evaluator',
  'influencer',
  'user',
  'blocker',
  'other',
];
function OpportunityContacts({
  record,
  editable,
  contacts: firstPage,
  contactsTotal,
  names,
  onSave,
  onCreate,
}: {
  record: CrmRecord;
  editable: boolean;
  // The account's contacts, the first page read with the deal: who can be
  // on it. The rest come on request.
  contacts: CrmRecord[];
  contactsTotal?: number;
  names: Record<string, string>;
  onSave: (values: Data) => Promise<void>;
  onCreate?: () => void;
}): ReactElement {
  const { text } = useCrmText();
  const more = useMore(
    record.accountId
      ? `contacts?accountId=${toText(record.accountId)}`
      : undefined,
    { data: firstPage, total: contactsTotal ?? firstPage.length },
  );
  const contacts = more.records;
  const [removing, setRemoving] = useState<string>();
  // Joining asks for the role first: a person on a deal without one is a
  // record that says nothing.
  const [joining, setJoining] = useState<CrmRecord>();
  const [joinRole, setJoinRole] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>();
  const list = rows(record.contacts as unknown[]).map((c) => ({
    contactId: toText(c.contactId),
    role: toText(c.role || 'other'),
  }));
  const contactsOf = contacts.filter((c) => c.accountId === record.accountId);
  const nameOf = (id: string): string =>
    toText(contactsOf.find((c) => c.id === id)?.name) ||
    names[id] ||
    text('entities.contacts');
  const candidates = contactsOf.filter(
    (c) =>
      !list.some((item) => item.contactId === c.id) &&
      c.employed !== false &&
      c.employed !== 0,
  );
  const roleChoices = contactRoles.map((v) => ({
    value: v,
    label: text(`options.${v}`),
  }));
  const commit = async (next: typeof list): Promise<void> => {
    setBusy(true);
    setError(undefined);
    try {
      await onSave({ contacts: next });
      setRemoving(undefined);
      setJoining(undefined);
      setJoinRole('');
    } catch (cause) {
      setError(cause);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className='space-y-4'>
      <ErrorNotice error={error} />
      {onCreate && (
        <Button size='sm' variant='outline' onClick={onCreate}>
          <Plus />
          {text('newRecord', { entity: text('entity.contacts') })}
        </Button>
      )}
      <div className='space-y-2'>
        <h4 className='text-xs font-medium text-muted-foreground'>
          {text('onThisOpportunity')}
          <span className='ml-1 tabular-nums'>{list.length}</span>
        </h4>
        {!list.length ? (
          <p className='text-sm text-muted-foreground'>{text('noContacts')}</p>
        ) : (
          // The same expandable rows as the account's contacts tab, with the
          // role (and a remove control) where that tab has its star.
          <ul className='divide-y divide-border'>
            {list.map((item) => {
              // A contact the lookup lacks (not readable) still gets a row,
              // with only its name.
              const contact: CrmRecord = contactsOf.find(
                (c) => c.id === item.contactId,
              ) ?? {
                id: item.contactId,
                name: nameOf(item.contactId),
                ownerId: '',
                createdById: '',
                createdAt: '',
                updatedAt: '',
              };
              return (
                <ContactItem
                  key={item.contactId}
                  contact={contact}
                  names={names}
                  leading={
                    <PrimaryStar contact={contact} siblings={contactsOf} />
                  }
                  trailing={
                    <span className='flex items-center gap-1'>
                      <span className='w-32'>
                        {editable ? (
                          <Choice
                            variant='inline'
                            label={text('fields.role')}
                            value={item.role}
                            disabled={busy}
                            choices={roleChoices}
                            onChange={(v) =>
                              void commit(
                                list.map((c) =>
                                  c.contactId === item.contactId
                                    ? { ...c, role: v }
                                    : c,
                                ),
                              )
                            }
                          />
                        ) : (
                          <span className='text-sm text-muted-foreground'>
                            {text(`options.${item.role}`)}
                          </span>
                        )}
                      </span>
                      {editable && (
                        <Button
                          size='icon-sm'
                          variant='ghost'
                          className='text-muted-foreground hover:text-destructive'
                          aria-label={`${toText(text('remove'))} ${nameOf(item.contactId)}`}
                          disabled={busy}
                          onClick={() => setRemoving(item.contactId)}
                        >
                          <X />
                        </Button>
                      )}
                    </span>
                  }
                />
              );
            })}
          </ul>
        )}
      </div>
      {/* The account's other people: one click brings any of them onto the
          deal, with a role to set afterwards. Those who have left are not
          offered. */}
      <div className='space-y-2 pt-2'>
        <h4 className='text-xs font-medium text-muted-foreground'>
          {text('otherAccountContacts')}
          <span className='ml-1 tabular-nums'>
            {candidates.length + (more.total - contacts.length)}
          </span>
        </h4>
        {!candidates.length && !more.hasMore ? (
          <p className='text-sm text-muted-foreground'>{text('noContacts')}</p>
        ) : (
          <ul className='divide-y divide-border'>
            {candidates.map((c) => (
              <ContactItem
                key={c.id}
                contact={c}
                names={names}
                leading={<PrimaryStar contact={c} siblings={contactsOf} />}
                trailing={
                  editable ? (
                    <Button
                      size='sm'
                      variant='outline'
                      disabled={busy}
                      onClick={() => setJoining(c)}
                    >
                      <Plus />
                      {text('addToOpportunity')}
                    </Button>
                  ) : null
                }
              />
            ))}
          </ul>
        )}
        {more.hasMore && (
          <Button
            variant='ghost'
            size='sm'
            disabled={more.loading}
            onClick={() => void more.loadMore()}
          >
            {text('loadMore')} · {more.total - contacts.length}
          </Button>
        )}
      </div>
      {joining && (
        <Dialog
          open
          onOpenChange={(open) => {
            if (!open && !busy) setJoining(undefined);
          }}
        >
          <DialogContent showCloseButton={false} className='sm:max-w-sm'>
            <DialogHeader>
              <DialogTitle>
                {text('joinOpportunityTitle', { name: toText(joining.name) })}
              </DialogTitle>
              <DialogDescription>
                {text('joinOpportunityHint')}
              </DialogDescription>
            </DialogHeader>
            <div className='grid gap-1.5 text-sm'>
              {text('fields.role')}
              <Choice
                label={text('fields.role')}
                value={joinRole}
                choices={roleChoices}
                onChange={setJoinRole}
              />
            </div>
            <DialogFooter>
              <Button
                variant='outline'
                disabled={busy}
                onClick={() => setJoining(undefined)}
              >
                {text('cancel')}
              </Button>
              <Button
                disabled={busy || !joinRole}
                onClick={() =>
                  void commit([
                    ...list,
                    { contactId: toText(joining.id), role: joinRole },
                  ])
                }
              >
                {busy ? text('saving') : text('confirm')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
      {removing && (
        <ConfirmDialog
          title={text('removeContactTitle', { name: nameOf(removing) })}
          description={text('removeContactHint')}
          busy={busy}
          onCancel={() => setRemoving(undefined)}
          onConfirm={() =>
            void commit(list.filter((c) => c.contactId !== removing))
          }
        />
      )}
    </div>
  );
}

// The primary-contact star beside a contact's name: filled on the primary,
// outlined on the others, a click (with confirmation) moves it. The server
// clears the previous primary, so only one is ever lit. Read-only, and only
// shown when lit, for users who cannot edit contacts.
function PrimaryStar({
  contact,
  siblings,
}: {
  contact: CrmRecord;
  // The account's contacts, to name the primary being replaced.
  siblings: CrmRecord[];
}): ReactElement | null {
  const { text } = useCrmText();
  const { data: meta } = useMetadata();
  const api = useCrmApi();
  const refresh = useRefresh();
  const [asking, setAsking] = useState(false);
  const [busy, setBusy] = useState(false);
  const canStar = Boolean(meta?.permissions.contacts.update);
  const currentPrimary = siblings.find((r) => r.primary && r.id !== contact.id);
  const toggle = async (): Promise<void> => {
    setBusy(true);
    try {
      await api(`contacts/${toText(contact.id)}`, 'PATCH', {
        primary: !contact.primary,
      });
      await refresh();
      setAsking(false);
    } finally {
      setBusy(false);
    }
  };
  if (!canStar)
    return contact.primary ? (
      <Star
        className='m-1 size-3.5 fill-ai text-ai'
        aria-label={text('accountPrimary')}
      >
        <title>{text('accountPrimary')}</title>
      </Star>
    ) : null;
  return (
    <>
      <button
        type='button'
        title={text(contact.primary ? 'accountPrimary' : 'setPrimary')}
        aria-label={text(contact.primary ? 'unsetPrimary' : 'setPrimary')}
        aria-pressed={Boolean(contact.primary)}
        className='rounded-sm p-1 text-muted-foreground/50 transition-colors hover:text-ai'
        onClick={() => setAsking(true)}
      >
        <Star
          className={contact.primary ? 'size-3.5 fill-ai text-ai' : 'size-3.5'}
        />
      </button>
      {asking && (
        <ConfirmDialog
          title={text(
            contact.primary ? 'unsetPrimaryTitle' : 'setPrimaryTitle',
          )}
          description={
            contact.primary
              ? text('unsetPrimaryDetail', { name: toText(contact.name) })
              : currentPrimary
                ? text('replacePrimaryDetail', {
                    name: toText(contact.name),
                    previous: toText(currentPrimary.name),
                  })
                : text('setPrimaryDetail', { name: toText(contact.name) })
          }
          busy={busy}
          onCancel={() => setAsking(false)}
          onConfirm={() => void toggle()}
        />
      )}
    </>
  );
}

// One approval on an opportunity's approvals tab: a timeline entry that
// opens in place, the way an activity does. The applicant edits their own
// draft or withdrawn request; anything submitted or decided is read here.
function ApprovalItem({
  approval,
  names,
}: {
  approval: Data;
  names: Record<string, string>;
}): ReactElement {
  const { text, language } = useCrmText();
  const approvalLink = useRecordLink('approvals', toText(approval.id));
  const { data: meta } = useMetadata();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<unknown>();
  const status = toText(approval.status);
  const mine = Boolean(meta && approval.approverId === meta.userId);
  // The server's rule: the applicant, while the request is theirs to change.
  const editable = Boolean(
    meta &&
    approval.ownerId === meta.userId &&
    ['draft', 'withdrawn'].includes(status),
  );
  const approvalField = (key: string): Field =>
    meta?.definitions.approvals.fields.find((f) => f.key === key) ?? {
      key,
      type: 'text',
    };
  const cell = (key: string, readOnly = false): ReactElement => (
    <div key={key}>
      <dt className='px-2 text-xs text-muted-foreground'>
        {text(fieldLabelKey('approvals', key))}
      </dt>
      <dd>
        <InlineField
          entity='approvals'
          record={approval as CrmRecord}
          field={approvalField(key)}
          editable={editable && !readOnly}
          lookup={names}
          label={text(fieldLabelKey('approvals', key))}
        />
      </dd>
    </div>
  );
  return (
    <li className='relative pl-5'>
      <span
        aria-hidden
        className={`absolute top-4 left-0 size-2.5 -translate-x-1/2 rounded-full border-2 border-card ${toText(
          status === 'approved'
            ? 'bg-primary'
            : status === 'rejected' || status === 'withdrawn'
              ? 'bg-muted-foreground/40'
              : 'bg-background ring-2 ring-primary/40',
        )}`}
      />
      <button
        type='button'
        className='w-full rounded-md px-2 py-2 text-left transition-colors hover:bg-muted'
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <div className='flex flex-wrap items-center gap-2'>
          <Badge variant='outline'>
            {text(`options.${toText(approval.topic)}`, {
              defaultValue: toText(approval.topic),
            })}
          </Badge>
          <span className='min-w-0 flex-1 truncate text-sm font-medium'>
            {toText(approval.name)}
          </span>
          {/* Which side of the request the reader is on: it is theirs to
              decide, or theirs to wait for. */}
          {mine && (
            <Badge variant={status === 'pending' ? 'default' : 'secondary'}>
              {text(status === 'pending' ? 'yourDecision' : 'youApprove')}
            </Badge>
          )}
          <Status value={approval.status} />
        </div>
        <p className='mt-1 text-xs text-muted-foreground'>
          {localDate(
            approval.updatedAt,
            language,
            meta?.settings.timeZone ?? 'Asia/Shanghai',
          )}
        </p>
      </button>
      {open && (
        <div className='mt-1 mb-4 divide-y divide-border rounded-md bg-muted/40 px-3 py-0.5 text-sm [&>*]:py-1.5'>
          <dl className='grid gap-x-3 gap-y-1 sm:grid-cols-[7rem_minmax(0,1fr)]'>
            {cell('topic')}
            {cell('name')}
          </dl>
          <dl className='grid gap-x-3 gap-y-1'>
            {/* The opportunity is the page itself; shown, never re-pointed. */}
            {cell('opportunityId', true)}
          </dl>
          <div>
            <p className='px-2 text-xs text-muted-foreground'>
              {text('fields.description')}
            </p>
            <InlineField
              entity='approvals'
              record={approval as CrmRecord}
              field={approvalField('description')}
              editable={editable}
              lookup={names}
              label={text('fields.description')}
            />
          </div>
          <Attachments
            entity='approvals'
            record={approval}
            editable={editable}
            onError={setError}
          />
          <dl className='grid gap-x-3 gap-y-1 sm:grid-cols-2'>
            {cell('ownerId', true)}
            {cell('approverId')}
          </dl>
          <div>
            <p className='px-2 text-xs text-muted-foreground'>
              {text('fields.decisionComment')}
            </p>
            <p className='px-2 py-1.5 whitespace-pre-wrap'>
              {toText(approval.decisionComment) || (
                <span className='text-muted-foreground'>—</span>
              )}
            </p>
          </div>
          <ErrorNotice error={error} />
          <div className='px-2'>
            <ApprovalActions approval={approval} names={names} withDelete />
          </div>
          <Link
            className='mx-2 inline-flex items-center gap-1 font-medium hover:text-primary hover:underline'
            {...approvalLink}
          >
            {text('viewDetails')}
            <ArrowUpRight className='size-3 text-muted-foreground' />
          </Link>
        </div>
      )}
    </li>
  );
}
