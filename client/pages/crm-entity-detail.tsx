import { recordTitle } from '../components/crm/lookups.js';
import { toText, useMore } from '../components/crm/api.js';
import {
  useState,
  type MouseEvent,
  type ReactElement,
  type ReactNode,
} from 'react';
import { Link, useNavigate } from 'react-router';
import {
  resolveTab,
  useDetailTab,
  useRecordDrawer,
  useRecordLink,
} from '../components/crm/record-drawer.js';
import {
  ArrowUpRight,
  ClipboardCheck,
  CalendarCheck,
  CalendarDays,
  Clock,
  ContactRound,
  History,
  Paperclip,
  Plus,
  Sparkles,
  Star,
  StickyNote,
  Target,
  Trash2,
  Ellipsis,
  X,
  type LucideIcon,
} from 'lucide-react';
import { KindTag } from '../components/crm/kind-tag.js';
import { Badge } from '../components/ui/badge.js';
import { Button, buttonVariants } from '../components/ui/button.js';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu.js';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog.js';
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
import { AskAIButton } from '../components/crm/ask-ai.js';
import {
  EvaluateButton,
  EvaluationStatus,
} from '../components/crm/lead-evaluation.js';
import { ReviewStatus } from '../components/crm/approval-review.js';
import { Choice, RecordForm } from '../components/crm/form.js';
import { StageField } from '../components/crm/reasons.js';
import { ApprovalActions } from '../components/crm/approval-actions.js';
import {
  ActivityItem,
  ConfirmDialog,
  DetailColumns,
  DetailTabBar,
  HistoryFeed,
  InfoGroup,
  InfoRow,
  NotesPanel,
  RecordAttachments,
  WebsiteField,
} from './crm-detail.js';
import { UploadZone } from '../components/crm/attachments.js';
import { RecordOutcomeDialog } from '../components/crm/outcome.js';

// Which shortcuts a detail page offers the assistant, per the specification.
// Each is a complete instruction sent as soon as it is clicked.
const shortcuts: Partial<Record<Entity, readonly string[]>> = {
  accounts: ['summarizeAccount', 'researchCompany', 'findOpportunities'],
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
  // The tab the address names (…/contacts), resolved once the page knows
  // which tabs it shows; an address naming another opens the first.
  const [tabSlug, setTab] = useDetailTab();
  // The note the timeline opened in the Notes tab.
  const [noteFocus, setNoteFocus] = useState<string>();
  // The AI entry the timeline was opened at (a deal's latest follow-up).
  const [focus, setFocus] = useState<{ id: string; at: number }>();
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
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState<{ entity: Entity; initial: Data }>();
  const [confirmDelete, setConfirmDelete] = useState(false);
  // A planned activity's outcome being recorded.
  const [recording, setRecording] = useState(false);
  const [error, setError] = useState<unknown>();
  // A deal's account change waiting for the user to confirm it takes the
  // deal's contacts off (see changeAccount below).
  const [accountMove, setAccountMove] = useState<{
    accountId: unknown;
    resolve: () => void;
    reject: (cause: unknown) => void;
  }>();
  const [moving, setMoving] = useState(false);
  const [busy, setBusy] = useState(false);
  // The record's title, for "Ask AI" and the shortcuts, which start the
  // assistant's conversation from it.
  const contextName = detail
    ? recordTitle(entity, detail.record, detail.titles)
    : undefined;
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
  };
  const bareNames = detail.names;
  const title = recordTitle(entity, record, names);
  const field = (key: string): Field =>
    definition.fields.find((f) => f.key === key) ?? { key, type: 'text' };
  const patch = async (values: Data): Promise<void> => {
    await api(`${toText(entity)}/${toText(id)}`, 'PATCH', values);
    await refresh();
  };
  // Moving a deal to another account takes its contacts off it: they are
  // the old account's people. The move is confirmed first, naming them, and
  // saved with the empty list in one request. A deal with activities goes
  // straight to the server, which refuses the move and says why.
  const dealContacts =
    entity === 'opportunities' && Array.isArray(record.contacts)
      ? (record.contacts as { contactId?: unknown }[])
      : [];
  const changeAccount = (accountId: unknown): Promise<void> =>
    dealContacts.length && !moreActivities.total
      ? new Promise((resolve, reject) => {
          setAccountMove({ accountId, resolve, reject });
        })
      : patch({ accountId });
  const confirmAccountMove = async (): Promise<void> => {
    if (!accountMove) return;
    setMoving(true);
    try {
      await patch({ accountId: accountMove.accountId, contacts: [] });
      accountMove.resolve();
    } catch (cause) {
      accountMove.reject(cause);
    } finally {
      setMoving(false);
      setAccountMove(undefined);
    }
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
      onSave={
        entity === 'opportunities' && key === 'accountId'
          ? changeAccount
          : undefined
      }
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
  // A won or lost deal: nothing left for the AI to follow up.
  const closedDeal =
    entity === 'opportunities' &&
    (currentStatus === 'won' || currentStatus === 'lost');
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
  // The timeline first, where the record opens: what happened to it,
  // people's changes and the AI's work alike.
  const tabs: [string, string, number][] = [
    ['historyTab', 'historyTab', detail.historyTotal ?? detail.history.length],
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
    // The notes, last, which also show in the timeline among its entries.
    ['notes', 'notes.tab', detail.notesTotal ?? 0],
  ];
  const activeTab =
    resolveTab(
      tabSlug,
      tabs.map(([name]) => name),
    ) ?? tabs[0][0];
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
          // Each a complete instruction, sent at once.
          send: true,
          // Background research is the one shortcut that looks outside the
          // CRM, so it alone turns on the model's web search.
          webSearch: key === 'researchCompany',
        },
      }),
    );
  };
  // What the active tab shows, in the right column.
  const tabContent = (
    <>
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
            <p className='text-sm text-muted-foreground'>{text('noRecords')}</p>
          ) : (
            <>
              <ol className='relative ml-1.5 border-l border-border'>
                {approvals.map((approval) => (
                  <ApprovalItem key={toText(approval.id)} approval={approval} />
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
                  {text('loadMore')} · {moreApprovals.total - approvals.length}
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
                  <ActivityItem key={toText(activity.id)} activity={activity} />
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
      ) : activeTab === 'notes' ? (
        <NotesPanel entity={entity} id={id} focusId={noteFocus} />
      ) : activeTab === 'historyTab' ? (
        <HistoryFeed
          entity={entity}
          id={id}
          record={record}
          initial={{
            data: detail.history,
            total: detail.historyTotal ?? detail.history.length,
          }}
          names={names}
          statusKey={statusKey}
          // A deal's AI follow-up is decided in its timeline, as a
          // lead's: by whoever may edit it, while it is open.
          editable={entity === 'opportunities' && editable && !closedDeal}
          recordName={contextName}
          focusId={focus?.id}
          focusAt={focus?.at}
          onOpenNote={(noteId) => {
            setNoteFocus(noteId);
            setTab('notes');
          }}
        />
      ) : (
        // A related list: name, status, owner, updated — with a create
        // button where this object can start one of them.
        <RelatedList
          entity={activeTab as Entity}
          records={rows(detail.related[activeTab as Entity]) as CrmRecord[]}
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
    </>
  );
  // The page's dialogs.
  const overlays = (
    <>
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
      {accountMove && (
        <ConfirmDialog
          title={text('changeAccountTitle')}
          description={text('changeAccountContacts', {
            names: dealContacts
              .map((c) => {
                const contactId = toText(c.contactId ?? '');
                return bareNames[contactId] ?? names[contactId] ?? contactId;
              })
              .join('、'),
          })}
          busy={moving}
          onCancel={() => {
            accountMove.resolve();
            setAccountMove(undefined);
          }}
          onConfirm={() => void confirmAccountMove()}
        />
      )}
      {recording && (
        <RecordOutcomeDialog
          activity={record}
          onClose={() => setRecording(false)}
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
                      {/* The leads have no tab of their own (they are listed in
                          the converted-from row), so their rest is a count. */}
                      {n > shownItems.length && child === 'leads' && (
                        <span className='ml-1 text-muted-foreground'>
                          {text('andMore', { count: n - shownItems.length })}
                        </span>
                      )}
                      {n > shownItems.length && child !== 'leads' && (
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
    </>
  );
  // Every object's page is laid out as the lead's (DetailColumns): no
  // header, the record's heading in a band over its particulars in groups,
  // every action under the heading, the tabs alone on the right.
  const row = (key: string): ReactElement => (
    <InfoRow key={key} label={text(fieldLabelKey(entity, key))}>
      {inline(key)}
    </InfoRow>
  );
  const time = (key: string): ReactElement => (
    <InfoRow key={key} label={text(`fields.${key}`)}>
      <div className='px-2 py-1.5'>
        {localDate(record[key], language, meta.settings.timeZone)}
      </div>
    </InfoRow>
  );
  // A long text (an approval's description, its decision comment) takes the
  // whole column, its label above it: beside a label it would have a third
  // of the narrow column.
  const longRow = (key: string, value: ReactNode): ReactElement => (
    <div key={key} className='py-0.5'>
      <dt className='px-2 pt-1.5 text-sm text-muted-foreground'>
        {text(fieldLabelKey(entity, key))}
      </dt>
      <dd className='min-w-0 text-sm'>{value}</dd>
    </div>
  );
  // Country / state / city on one row, each edited by itself.
  const regionRow = (
    <InfoRow key='region' label={text('region')}>
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
    </InfoRow>
  );
  // The leads the record came from, each opening in the drawer: the one
  // place they show on an account, whose deletion they block.
  const convertedRow =
    convertedFrom.length > 0 ? (
      <InfoRow key='convertedFrom' label={text('convertedFrom')}>
        <div className='flex min-w-0 flex-wrap gap-x-3 gap-y-1 px-2 py-1.5'>
          {convertedFrom.map((lead) => (
            <RecordLink
              key={lead.id}
              entity='leads'
              record={{ id: lead.id, name: recordTitle('leads', lead, names) }}
            />
          ))}
        </div>
      </InfoRow>
    ) : null;
  const accountCrumb = record.accountId ? (
    <AccountCrumb
      id={toText(record.accountId)}
      name={names[toText(record.accountId)] ?? text('entities.accounts')}
    />
  ) : null;
  const slash = <span className='text-muted-foreground/60'>/</span>;
  // The name, edited in place, with what goes before or after it (a deal's
  // account, a contact's). A <div> with the heading role, since the editor
  // brings block elements an <h1> may not hold.
  const headingOf = (before?: ReactNode, after?: ReactNode): ReactElement => (
    <div
      role='heading'
      aria-level={1}
      className='-mx-2 flex flex-wrap items-center py-1.5 font-heading text-xl font-semibold tracking-tight'
    >
      {before}
      <InlineField
        entity={entity}
        record={record}
        field={field('name')}
        editable={editable}
        label={text(fieldLabelKey(entity, 'name'))}
        size='heading'
      />
      {after}
    </div>
  );
  const askAI = (
    <AskAIButton entity={entity} recordId={id} name={contextName} />
  );
  // The object's AI shortcuts, each a complete instruction sent at once.
  const aiShortcuts = meta.assistant
    ? (shortcuts[entity] ?? []).map((key) => (
        <Button
          key={key}
          size='sm'
          variant='ghost'
          className='text-ai hover:text-ai'
          onClick={() => shortcut(key)}
        >
          <Sparkles />
          {text(key)}
        </Button>
      ))
    : null;
  // The rarer deleting, last, in a "More" menu.
  const moreMenu = detail.permissions.delete ? (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={text('moreActions')}
        className={buttonVariants({ size: 'icon-sm', variant: 'outline' })}
      >
        <Ellipsis />
      </DropdownMenuTrigger>
      <DropdownMenuContent align='start'>
        <DropdownMenuItem
          variant='destructive'
          onClick={() => setConfirmDelete(true)}
        >
          <Trash2 />
          {text('deleteRecord', { entity: text(`entity.${toText(entity)}`) })}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  ) : null;
  // The buttons on one line, wrapping; under them, where the AI's latest
  // work on the record stands, when it has any.
  const actionsOf = (buttons: ReactNode, status?: ReactNode): ReactElement => (
    <div className='flex flex-col items-start gap-2'>
      <div className='flex flex-wrap items-center gap-2'>{buttons}</div>
      {status}
    </div>
  );
  const tabIcons: Record<string, LucideIcon> = {
    historyTab: History,
    activities: CalendarDays,
    opportunityContacts: ContactRound,
    contacts: ContactRound,
    opportunities: Target,
    approvals: ClipboardCheck,
    attachments: Paperclip,
    notes: StickyNote,
  };
  // The timeline without a count, as on the lead page: its entries only grow.
  const tabBar = (
    <DetailTabBar
      active={activeTab}
      onSelect={setTab}
      tabs={tabs.map(([name, label, count]) => ({
        name,
        label,
        icon: tabIcons[name] ?? History,
        count: name === 'historyTab' ? undefined : count,
      }))}
    />
  );
  const page = (
    heading: ReactNode,
    actions: ReactNode,
    left: ReactNode,
  ): ReactElement => (
    <DetailColumns
      entity={entity}
      heading={heading}
      actions={actions}
      tabBar={tabBar}
      notice={<ErrorNotice error={error ?? loadError} />}
      left={left}
      right={tabContent}
    >
      {overlays}
    </DetailColumns>
  );

  if (entity === 'activities')
    return page(
      headingOf(),
      actionsOf(
        <>
          {/* A planned activity: what came of it, recorded (and its lead
              followed up anew), in one step. */}
          {currentStatus === 'planned' && editable && (
            <Button size='sm' onClick={() => setRecording(true)}>
              <CalendarCheck />
              {text('evaluation.recordOutcome')}
            </Button>
          )}
          {askAI}
          {moreMenu}
        </>,
      ),
      <>
        {/* Who has it and where it stands, then what it is and when. */}
        <InfoGroup title={text('activityGroups.general')}>
          {row('ownerId')}
          {statusKey && (
            <InfoRow label={text(`fields.${statusKey}`)}>
              <StageField
                entity={entity}
                record={record}
                field={statusKey}
                editable={editable}
                title={title}
                onSave={patch}
              />
            </InfoRow>
          )}
          {['type', 'startAt', 'endAt'].map(row)}
        </InfoGroup>
        <InfoGroup title={text('activityGroups.participants')}>
          {['internalParticipants', 'externalParticipants'].map(row)}
        </InfoGroup>
        <InfoGroup title={text('activityGroups.related')}>
          {['leadId', 'accountId', 'opportunityId'].map(row)}
        </InfoGroup>
        <InfoGroup title={text('activityGroups.content')}>
          {['description', 'feedback'].map(row)}
        </InfoGroup>
        <InfoGroup title={text('activityGroups.system')}>
          {time('createdAt')}
          {time('updatedAt')}
          {/* When it was done, under its last update. */}
          {currentStatus === 'completed' && time('completedAt')}
        </InfoGroup>
      </>,
    );

  if (entity === 'opportunities') {
    const stage = toText(record.stage);
    return page(
      headingOf(
        accountCrumb ? (
          <>
            {accountCrumb}
            {slash}
          </>
        ) : null,
      ),
      actionsOf(
        <>
          {askAI}
          {aiShortcuts}
          {editable && !closedDeal && (
            <EvaluateButton
              entity='opportunities'
              recordId={id}
              onError={setError}
            />
          )}
          {moreMenu}
        </>,
        // Where the AI's latest follow-up stands, opening it in the
        // timeline.
        <EvaluationStatus
          entity='opportunities'
          recordId={id}
          onOpen={(entryId) => {
            setFocus({ id: entryId, at: Date.now() });
            setTab('historyTab');
          }}
        />,
      ),
      <>
        {/* Who has it, where it stands and what it is worth. */}
        <InfoGroup title={text('opportunityGroups.general')}>
          {row('ownerId')}
          <InfoRow label={text('fields.stage')}>
            <StageField
              entity={entity}
              record={record}
              field='stage'
              editable={editable}
              title={title}
              // Every move clears both outcomes' fields first, as the
              // stepper did: a deal moved between lost and paused keeps no
              // stale reason or resume date.
              onSave={(values) =>
                patch({
                  lostReason: null,
                  pauseReason: null,
                  resumeAt: null,
                  ...values,
                })
              }
            />
          </InfoRow>
          {/* Currency, then the bare number: both edit in place, and the
              sign is not repeated. */}
          <InfoRow label={text('fields.amount')}>
            <div className='flex items-center'>
              <div className='shrink-0'>{inline('currency')}</div>
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
          </InfoRow>
          {row('expectedCloseAt')}
          {stage === 'paused' && row('resumeAt')}
        </InfoGroup>
        <InfoGroup title={text('opportunityGroups.details')}>
          {['accountId', 'businessType', 'source'].map(row)}
          {convertedRow}
          {row('description')}
        </InfoGroup>
        <InfoGroup title={text('opportunityGroups.system')}>
          {time('createdAt')}
          {time('updatedAt')}
          {/* When it was won or lost, under its last update. */}
          {closedDeal && time('closedAt')}
        </InfoGroup>
      </>,
    );
  }

  if (entity === 'accounts')
    return page(
      headingOf(),
      actionsOf(
        <>
          {askAI}
          {aiShortcuts}
          {moreMenu}
        </>,
      ),
      <>
        {/* Who has it and where it stands (a churned account's reason
            beside its status). */}
        <InfoGroup title={text('accountGroups.general')}>
          {row('ownerId')}
          {statusKey && (
            <InfoRow label={text(`fields.${statusKey}`)}>
              <StageField
                entity={entity}
                record={record}
                field={statusKey}
                editable={editable}
                title={title}
                onSave={patch}
              />
            </InfoRow>
          )}
          {/* The reason stays editable while the account is churned. */}
          {currentStatus === 'churned' && row('churnReason')}
          {['type', 'source', 'notes'].map(row)}
        </InfoGroup>
        <InfoGroup title={text('accountGroups.company')}>
          <InfoRow label={text('fields.website')}>
            <WebsiteField
              entity={entity}
              record={record}
              editable={editable}
              label={text('fields.website')}
            />
          </InfoRow>
          {['industry', 'employees'].map(row)}
          {regionRow}
          {['address', 'description'].map(row)}
          {convertedRow}
        </InfoGroup>
        <InfoGroup title={text('accountGroups.system')}>
          {time('createdAt')}
          {time('updatedAt')}
        </InfoGroup>
      </>,
    );

  if (entity === 'contacts')
    return page(
      headingOf(
        undefined,
        accountCrumb ? (
          <>
            {slash}
            {accountCrumb}
          </>
        ) : null,
      ),
      actionsOf(
        <>
          {askAI}
          {moreMenu}
        </>,
      ),
      <>
        <InfoGroup title={text('contactGroups.general')}>
          {[
            'ownerId',
            'accountId',
            'primary',
            'employed',
            'gender',
            'source',
          ].map(row)}
          {convertedRow}
          {row('notes')}
        </InfoGroup>
        <InfoGroup title={text('contactGroups.reach')}>
          {['jobTitle', 'phone', 'email'].map(row)}
        </InfoGroup>
        <InfoGroup title={text('contactGroups.system')}>
          {time('createdAt')}
          {time('updatedAt')}
        </InfoGroup>
      </>,
    );

  // An approval (leads have LeadDetail). Its status moves only through its
  // actions, so it is shown rather than edited.
  const approver = record.approverId === meta.userId;
  const decided = ['approved', 'rejected'].includes(currentStatus);
  return page(
    headingOf(),
    actionsOf(
      <>
        <ApprovalActions approval={record} names={names} />
        {askAI}
        {moreMenu}
      </>,
      // Under them, the AI's review for the approver (approval-review.tsx),
      // which opens it in the timeline, and asking for another; it replaced
      // the "Help me review" chat shortcut. It advises only — the decision
      // stays with the approver.
      <ReviewStatus
        approvalId={id}
        onOpen={(entryId) => {
          setFocus({ id: entryId, at: Date.now() });
          setTab('historyTab');
        }}
      />,
    ),
    <>
      <InfoGroup title={text('approvalGroups.general')}>
        {row('ownerId')}
        {statusKey && (
          <InfoRow label={text(`fields.${statusKey}`)}>
            {/* The marker says which side of it the approver is on. */}
            <span className='flex flex-wrap items-center gap-2 px-2 py-1.5'>
              <Status value={currentStatus} />
              {approver && (
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
          </InfoRow>
        )}
        {['topic', 'approverId', 'opportunityId'].map(row)}
      </InfoGroup>
      <InfoGroup title={text('approvalGroups.content')}>
        {longRow('description', inline('description'))}
        {/* Written by the decision, so read only, and only once there is
            one. */}
        {record.decisionComment
          ? longRow(
              'decisionComment',
              <span className='block px-2 py-1.5 whitespace-pre-wrap'>
                <Value
                  record={record}
                  field={{ key: 'decisionComment', type: 'textarea' }}
                  lookup={names}
                />
              </span>,
            )
          : null}
      </InfoGroup>
      <InfoGroup title={text('approvalGroups.system')}>
        {/* The approver's timeline starts when the request reached them, so
            for them the creation time is left out. */}
        {!approver && time('createdAt')}
        {record.submittedAt ? time('submittedAt') : null}
        {time(decided ? 'decidedAt' : 'updatedAt')}
      </InfoGroup>
    </>,
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
  const navigate = useNavigate();
  const drawer = useRecordDrawer();
  // A row opens its record like the other tabs' entries: in the page's
  // drawer, or its full page where there is none (a phone). A click on a link
  // in the row keeps its own target, and a click that ends a text selection
  // opens nothing.
  const openRow = (
    event: MouseEvent<HTMLTableRowElement>,
    id: string,
  ): void => {
    if ((event.target as HTMLElement).closest('a,button')) return;
    if (window.getSelection()?.toString()) return;
    if (drawer) drawer.open(entity, id);
    else void navigate(`/crm/${toText(entity)}/${id}`);
  };
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
  // Contacts open in the drawer the way activities do, so a phone number or
  // a job title is corrected without leaving the account.
  function contactList(list: CrmRecord[]): ReactElement {
    return (
      <ul className='divide-y divide-border'>
        {list.map((r) => (
          <ContactItem
            key={r.id}
            contact={r}
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
            <TableRow
              key={r.id}
              className='cursor-pointer'
              onClick={(event) => openRow(event, r.id)}
            >
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

// One contact on a record's contacts tab: a row that opens the contact in
// the page's drawer (its full page on a phone or in a new tab), where its
// fields are edited, the way an activity does in the activities tab. The
// star and the opportunity's role and remove control sit beside the link
// rather than inside it, so using them does not also open the contact.
function ContactItem({
  contact,
  leading,
  trailing,
}: {
  contact: CrmRecord;
  // What sits before the name (the account page's primary star) and at the
  // row's end (the opportunity page's role and remove control).
  leading?: ReactNode;
  trailing?: ReactNode;
}): ReactElement {
  const contactLink = useRecordLink('contacts', toText(contact.id));
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
        <Link
          className='min-w-0 flex-1 rounded-md px-2 py-2 text-left'
          {...contactLink}
        >
          <div className='flex flex-wrap items-baseline gap-x-3 gap-y-0.5'>
            <span className='flex max-w-full min-w-0 items-center gap-1'>
              <span
                className='truncate text-sm font-medium'
                title={toText(contact.name)}
              >
                {toText(contact.name)}
              </span>
              <ArrowUpRight className='size-3 shrink-0 text-muted-foreground' />
            </span>
            {summary.map((value) => (
              <span
                key={value}
                className='truncate text-xs text-muted-foreground'
              >
                {value}
              </span>
            ))}
          </div>
        </Link>
        {trailing ? (
          <span className='mt-1.5 flex shrink-0 items-center justify-center'>
            {trailing}
          </span>
        ) : null}
      </div>
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
                  leading={
                    <PrimaryStar contact={contact} siblings={contactsOf} />
                  }
                  trailing={
                    <span className='flex items-center gap-1'>
                      <span className='flex'>
                        {editable ? (
                          <Choice
                            variant='tag'
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
                        ) : item.role ? (
                          <Badge variant='muted'>
                            {text(`options.${item.role}`)}
                          </Badge>
                        ) : null}
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
// opens the approval in the page's drawer, the way an activity does, where
// it is edited and decided.
function ApprovalItem({ approval }: { approval: Data }): ReactElement {
  const { text, language } = useCrmText();
  const approvalLink = useRecordLink('approvals', toText(approval.id));
  const { data: meta } = useMetadata();
  const status = toText(approval.status);
  const mine = Boolean(meta && approval.approverId === meta.userId);
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
      <Link
        className='block w-full rounded-md px-2 py-2 text-left transition-colors hover:bg-muted'
        {...approvalLink}
      >
        <div className='flex flex-wrap items-center gap-2'>
          <KindTag value={approval.topic} />
          <span className='flex min-w-0 flex-1 items-center gap-1'>
            <span className='truncate text-sm font-medium'>
              {toText(approval.name)}
            </span>
            <ArrowUpRight className='size-3 shrink-0 text-muted-foreground' />
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
        <p className='mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground'>
          <Clock className='size-3 shrink-0' />
          {localDate(
            approval.updatedAt,
            language,
            meta?.settings.timeZone ?? 'Asia/Shanghai',
          )}
        </p>
      </Link>
    </li>
  );
}
