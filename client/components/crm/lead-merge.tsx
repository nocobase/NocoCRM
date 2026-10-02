import { useQuery } from '@tanstack/react-query';
import { Sparkles, TriangleAlert } from 'lucide-react';
import { Fragment, useState, type ReactElement } from 'react';
import { Button } from '../ui/button.js';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog.js';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group.js';
import { Spinner } from '../ui/spinner.js';
import { ErrorNotice, RecordLink, Value } from './common.js';
import { FollowUpOption } from './follow-up-option.js';
import {
  fieldLabelKey,
  localDate,
  toText,
  useCrmApi,
  useCrmQuery,
  useCrmScopeKey,
  useCrmText,
  useMetadata,
  type CrmRecord,
  type Data,
  type Field,
} from './api.js';

// Leads that repeat this one (the same email, the same phone, or the same
// person at the same company; server/providers/crm/lead-merge.ts), shown
// on the lead's page above its particulars, each with a merge for whoever
// may make it. The merge keeps one lead and takes, field by field, the
// value the person picks, starting from the AI's proposal (or, with the
// assistant off, the plain one: the lead with more history kept, filled
// values over empty ones).

interface Duplicate {
  id: string;
  name: string;
  company: string;
  status: string;
  ownerId: string;
  createdAt: string;
  matched: ('email' | 'phone' | 'person')[];
  mergeable: boolean;
}
type Side = CrmRecord & { activities: number; notes: number };
// The id a lead not yet saved has in a merge (the server's UNSAVED).
const UNSAVED = 'new';
interface Proposal {
  leads: Side[];
  keepId: string;
  picks: Record<string, string>;
  reason: string;
  reasons: Record<string, string>;
  keepable: string[];
  // The groups whose values differ (an email only in another case or a
  // phone only written otherwise does not), by their first field.
  groups: string[];
  ai: boolean;
}

// The groups the merge compares, as the server has them (MERGE_GROUPS):
// an address is one choice. The long texts may keep both.
const GROUPS: readonly (readonly string[])[] = [
  ['name'],
  ['company'],
  ['phone'],
  ['email'],
  ['jobTitle'],
  ['ownerId'],
  ['source'],
  ['status'],
  ['employees'],
  ['industry'],
  ['website'],
  ['country', 'state', 'city', 'address'],
  ['message'],
  ['companyDescription'],
];
const BOTH = new Set(['message', 'companyDescription']);
const empty = (value: unknown): boolean =>
  value === null || value === undefined || value === '';

export function LeadDuplicates({
  lead,
  onMerged,
}: {
  lead: CrmRecord;
  // The merge is done: the lead kept, which may be the other one.
  onMerged: (keptId: string) => void;
}): ReactElement | null {
  const { text } = useCrmText();
  const { data: meta } = useMetadata();
  const open = ['new', 'working', 'nurturing'].includes(toText(lead.status));
  const { data } = useCrmQuery<Duplicate[]>(
    `leads/${toText(lead.id)}/duplicates`,
    open,
  );
  const [merging, setMerging] = useState<Duplicate>();
  if (!open || !data?.length) return null;
  return (
    <div className='mb-4 space-y-2 rounded-lg border border-warning/40 bg-warning/10 px-3 py-2.5 text-sm'>
      <div className='flex items-center gap-1.5 font-medium'>
        <TriangleAlert className='size-3.5 text-warning' />
        {text('merge.notice')}
      </div>
      <ul className='space-y-1.5'>
        {data.map((duplicate) => (
          <li key={duplicate.id} className='flex items-center gap-2'>
            <div className='min-w-0 flex-1'>
              <RecordLink
                entity='leads'
                record={{
                  id: duplicate.id,
                  name: [duplicate.name, duplicate.company]
                    .filter(Boolean)
                    .join(' / '),
                }}
              />
              <div className='truncate text-xs text-muted-foreground'>
                {[
                  duplicate.matched
                    .map((m) => text(`merge.matched.${m}`))
                    .join('、'),
                  meta?.users.find((u) => u.id === duplicate.ownerId)?.name,
                  localDate(
                    duplicate.createdAt,
                    '',
                    meta?.settings.timeZone ?? 'Asia/Shanghai',
                    false,
                  ),
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </div>
            </div>
            {duplicate.mergeable && (
              <Button
                size='sm'
                variant='outline'
                onClick={() => setMerging(duplicate)}
              >
                {text('merge.action')}
              </Button>
            )}
          </li>
        ))}
      </ul>
      {merging && (
        <MergeDialog
          leadId={toText(lead.id)}
          otherId={merging.id}
          onClose={() => setMerging(undefined)}
          onMerged={(keptId) => {
            setMerging(undefined);
            onMerged(keptId);
          }}
        />
      )}
    </div>
  );
}

// The merge of two leads, on a lead's page, and in the capture review,
// where a lead not yet saved (`input`, what the AI organised and the
// person checked) is merged into one the CRM holds (`leadId`) instead of
// being created; that one is kept.
export function MergeDialog({
  leadId,
  otherId = UNSAVED,
  input,
  onClose,
  onMerged,
}: {
  leadId: string;
  otherId?: string;
  input?: Data;
  onClose: () => void;
  onMerged: (keptId: string) => void;
}): ReactElement {
  const { text, language } = useCrmText();
  const { data: meta } = useMetadata();
  const api = useCrmApi();
  const scopeKey = useCrmScopeKey();
  // A proposal is asked for once per pair; the AI's takes a little while.
  const proposal = useQuery({
    queryKey: [
      ...scopeKey,
      `leads/${leadId}/merge/proposal`,
      otherId,
      input ? JSON.stringify(input) : '',
    ],
    queryFn: () =>
      api<{ data: Proposal }>(
        `leads/${leadId}/merge/proposal`,
        'POST',
        input ? { input } : { with: otherId },
      ).then((r) => r.data),
    staleTime: Infinity,
    gcTime: 0,
    retry: false,
  });
  // The person's own choices, over the proposal's.
  const [keepChoice, setKeepChoice] = useState<string>();
  const [pickChoices, setPickChoices] = useState<Record<string, string>>({});
  const [followUp, setFollowUp] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>();
  const data = proposal.data;
  const fields = meta?.definitions.leads.fields ?? [];
  const field = (key: string): Field =>
    fields.find((f) => f.key === key) ?? { key, type: 'text' };
  const zone = meta?.settings.timeZone ?? 'Asia/Shanghai';

  const body = (() => {
    if (!data) return null;
    const [a, b] = data.leads as [Side, Side];
    const keepId = keepChoice ?? data.keepId;
    const groups = GROUPS.filter((group) => data.groups.includes(group[0]));
    const sameCount = GROUPS.length - groups.length;
    // The owner goes to another person only for whoever may assign leads;
    // anyone may keep the kept lead's owner or take the lead themselves.
    const ownerAllowed = (side: Side): boolean =>
      Boolean(meta?.assign) ||
      toText(side.id) === keepId ||
      side.ownerId === meta?.userId ||
      side.ownerId === (toText(a.id) === keepId ? a : b).ownerId;
    const pickOf = (group: readonly string[]): string => {
      const key = group[0];
      const chosen = pickChoices[key] ?? data.picks[key] ?? keepId;
      if (key !== 'ownerId') return chosen;
      const side =
        chosen === toText(a.id) ? a : chosen === toText(b.id) ? b : undefined;
      return side && !ownerAllowed(side) ? keepId : chosen;
    };
    const cell = (side: Side, group: readonly string[]): ReactElement =>
      group.length > 1 ? (
        <div className='space-y-0.5'>
          <div className='flex flex-wrap items-center gap-x-1'>
            {['country', 'state', 'city'].map((key, index) => (
              <Fragment key={key}>
                {index > 0 && (
                  <span className='text-muted-foreground/60'>/</span>
                )}
                <Value field={field(key)} record={side} />
              </Fragment>
            ))}
          </div>
          {!empty(side.address) && (
            <Value field={field('address')} record={side} />
          )}
        </div>
      ) : (
        <Value field={field(group[0])} record={side} plain />
      );
    return (
      <div className='space-y-3'>
        {data.ai && data.reason ? (
          <p className='flex items-start gap-1.5 rounded-md bg-ai/5 px-3 py-2 text-sm'>
            <Sparkles className='mt-0.5 size-3.5 shrink-0 text-ai' />
            {data.reason}
          </p>
        ) : null}
        <div className='grid grid-cols-[7rem_minmax(0,1fr)_minmax(0,1fr)] text-sm'>
          {/* Which lead is kept, each with how much history it carries. */}
          <RadioGroup
            value={keepId}
            onValueChange={(value) => setKeepChoice(toText(value))}
            className='col-span-3 grid grid-cols-subgrid gap-0 border-b pb-2'
            aria-label={text('merge.keep')}
          >
            <div className='self-center text-muted-foreground'>
              {text('merge.keep')}
            </div>
            {[a, b].map((side) => (
              <label
                key={toText(side.id)}
                className={`flex items-start gap-2 rounded-md px-2 py-1.5 ${
                  toText(side.id) === keepId ? 'bg-muted' : ''
                } ${data.keepable.includes(toText(side.id)) ? 'cursor-pointer' : 'opacity-60'}`}
              >
                <RadioGroupItem
                  value={toText(side.id)}
                  disabled={!data.keepable.includes(toText(side.id))}
                  className='mt-0.5'
                />
                <span className='min-w-0'>
                  <span className='block truncate font-medium'>
                    {toText(side.name)}
                    {(toText(side.id) === leadId && !input) ||
                    toText(side.id) === UNSAVED ? (
                      <span className='ml-1.5 text-xs font-normal text-muted-foreground'>
                        {text(
                          toText(side.id) === UNSAVED
                            ? 'merge.newLabel'
                            : 'merge.thisLead',
                        )}
                      </span>
                    ) : null}
                  </span>
                  <span className='block text-xs text-muted-foreground'>
                    {toText(side.id) === UNSAVED
                      ? text('merge.unsaved')
                      : text('merge.history', {
                          date: localDate(
                            side.createdAt,
                            language,
                            zone,
                            false,
                          ),
                          activities: side.activities,
                          notes: side.notes,
                        })}
                  </span>
                </span>
              </label>
            ))}
          </RadioGroup>
          {groups.map((group) => {
            const key = group[0];
            const pick = pickOf(group);
            const why = data.reasons[key];
            return (
              <RadioGroup
                key={key}
                value={pick}
                onValueChange={(value) =>
                  setPickChoices((v) => ({ ...v, [key]: toText(value) }))
                }
                className='col-span-3 grid grid-cols-subgrid gap-0 border-b py-2 last:border-b-0'
                aria-label={text(
                  group.length > 1 ? 'region' : fieldLabelKey('leads', key),
                )}
              >
                <div className='space-y-1 pt-1.5'>
                  <div className='text-muted-foreground'>
                    {text(
                      group.length > 1 ? 'region' : fieldLabelKey('leads', key),
                    )}
                  </div>
                  {BOTH.has(key) && !empty(a[key]) && !empty(b[key]) && (
                    <label className='flex cursor-pointer items-center gap-1.5 text-xs'>
                      <RadioGroupItem value='both' />
                      {text('merge.both')}
                    </label>
                  )}
                </div>
                {[a, b].map((side) => {
                  const id = toText(side.id);
                  const blank = group.every((k) => empty(side[k]));
                  const allowed = key !== 'ownerId' || ownerAllowed(side);
                  return (
                    <label
                      key={id}
                      className={`flex min-w-0 items-start gap-2 rounded-md px-2 py-1.5 ${
                        pick === id || pick === 'both' ? 'bg-muted' : ''
                      } ${blank || !allowed ? 'opacity-60' : 'cursor-pointer'}`}
                    >
                      <RadioGroupItem
                        value={id}
                        disabled={blank || !allowed}
                        className='mt-0.5'
                      />
                      <div className='min-w-0 flex-1 break-words'>
                        {cell(side, group)}
                      </div>
                    </label>
                  );
                })}
                {why ? (
                  <p className='col-start-2 col-end-4 px-2 pt-1 text-xs text-muted-foreground'>
                    <Sparkles className='mr-1 inline size-3 text-ai' />
                    {why}
                  </p>
                ) : null}
              </RadioGroup>
            );
          })}
        </div>
        <p className='text-xs text-muted-foreground'>
          {text('merge.rest', { count: sameCount })}
        </p>
      </div>
    );
  })();

  const submit = async (): Promise<void> => {
    if (!data) return;
    const [a, b] = data.leads as [Side, Side];
    const keepId = keepChoice ?? data.keepId;
    const fromId = keepId === toText(a.id) ? toText(b.id) : toText(a.id);
    const picks: Record<string, string> = {};
    for (const key of data.groups) {
      picks[key] = pickChoices[key] ?? data.picks[key] ?? keepId;
    }
    setBusy(true);
    setError(undefined);
    try {
      await api(`leads/${keepId}/merge`, 'POST', {
        ...(input ? { input } : { from: fromId }),
        picks,
        followUp,
      });
      onMerged(keepId);
    } catch (e) {
      setError(e);
      setBusy(false);
    }
  };

  return (
    <Dialog
      open
      onOpenChange={(v) => {
        if (!v && !busy) onClose();
      }}
    >
      <DialogContent
        showCloseButton={false}
        className='max-h-[90svh] overflow-y-auto sm:max-w-3xl'
      >
        <DialogHeader>
          <DialogTitle>{text('merge.title')}</DialogTitle>
          <DialogDescription>
            {text(input ? 'merge.hintUnsaved' : 'merge.hint')}
          </DialogDescription>
        </DialogHeader>
        <ErrorNotice error={error ?? proposal.error} />
        {proposal.isLoading ? (
          <div className='flex items-center gap-2 py-8 text-sm text-muted-foreground'>
            <Spinner className='size-4 text-ai' />
            {text(meta?.assistant ? 'merge.thinking' : 'merge.comparing')}
          </div>
        ) : (
          body
        )}
        <DialogFooter>
          <FollowUpOption
            checked={followUp}
            onChange={setFollowUp}
            disabled={busy}
            label='merge.followUp'
          />
          <Button variant='outline' disabled={busy} onClick={onClose}>
            {text('cancel')}
          </Button>
          <Button disabled={busy || !data} onClick={() => void submit()}>
            {busy ? text('saving') : text('merge.confirm')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
