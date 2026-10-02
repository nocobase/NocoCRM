import {
  useState,
  type Dispatch,
  type ReactElement,
  type SetStateAction,
} from 'react';
import { Link } from 'react-router';
import { FileText, Sparkles } from 'lucide-react';
import { Badge } from '../ui/badge.js';
import { Button } from '../ui/button.js';
import { Checkbox } from '../ui/checkbox.js';
import { FollowUpOption } from './follow-up-option.js';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog.js';
import { Spinner } from '../ui/spinner.js';
import { Textarea } from '../ui/textarea.js';
import { ErrorNotice } from './common.js';
import { Choice, RecordForm } from './form.js';
import { LengthHint } from './length-hint.js';
import {
  fieldLabelKey,
  toText,
  useCrmApi,
  useCrmText,
  useMetadata,
  useRefresh,
  type Data,
} from './api.js';
import { LONG_TEXT_LIMIT } from '../../../server/providers/crm/limits.js';

// What the server's lead capture returns for one person in the text
// (server/providers/crm/lead-capture.ts). An adjustment returns every field
// the AI writes, null for one it cleared, and the key of the lead it revised.
export interface CapturedLead {
  ref?: string;
  input: Data;
  uncertain: string[];
  duplicates: { entity: string; id: string; name: string }[];
}

// The fields the AI writes, sent back as they stand when the user asks it to
// adjust them.
const AI_FIELDS = [
  'name',
  'company',
  'jobTitle',
  'phone',
  'email',
  'website',
  'country',
  'state',
  'city',
  'address',
  'message',
  'companyDescription',
  'industry',
  'employees',
  'source',
  'ownerId',
];
const SELLER_ROLES = ['sales-representative', 'sales-manager'];

// One lead in the review.
interface ReviewRow {
  // The client's key, also the ref an adjustment returns it under.
  key: string;
  input: Data;
  uncertain: string[];
  duplicates: CapturedLead['duplicates'];
  // Fields the AI's last adjustment changed.
  changed: string[];
  // Who set the owner and the source: the AI, the user on this lead, or the
  // "for all" setting, which fills only what neither of the others set.
  origin: Record<string, 'ai' | 'user' | 'all'>;
  selected: boolean;
  createdId: string;
  error?: unknown;
  // Bumped when the review replaces the values, so the form remounts with
  // them; the form's own edits come back through its onChange.
  revision: number;
}

interface Turn {
  id: string;
  from: 'user' | 'ai';
  text: string;
}

const isEmpty = (value: unknown): boolean =>
  value === undefined || value === null || value === '';

function toRow(lead: CapturedLead, owner: string | undefined): ReviewRow {
  const input = Object.fromEntries(
    Object.entries(lead.input).filter(([, value]) => value !== null),
  );
  return {
    key: crypto.randomUUID(),
    input: { ...(owner ? { ownerId: owner } : {}), ...input },
    uncertain: lead.uncertain,
    duplicates: lead.duplicates,
    changed: [],
    origin: {
      ...(input.source ? { source: 'ai' } : {}),
      ...(input.ownerId ? { ownerId: 'ai' } : {}),
    },
    selected: true,
    createdId: '',
    revision: 0,
  };
}

// The leads after an adjustment: each revised lead takes the AI's values and
// is marked where they changed, one the AI left out is dropped (unless it was
// already created), and one it added joins at the end.
function merge(
  rows: readonly ReviewRow[],
  leads: readonly CapturedLead[],
  owner: string | undefined,
): ReviewRow[] {
  const byRef = new Map(
    leads.flatMap((lead) => (lead.ref ? [[lead.ref, lead] as const] : [])),
  );
  const kept = rows.flatMap((row): ReviewRow[] => {
    if (row.createdId) return [row];
    const lead = byRef.get(row.key);
    if (!lead) return [];
    const input = { ...row.input };
    const changed: string[] = [];
    for (const [key, value] of Object.entries(lead.input)) {
      if ((value ?? null) === (input[key] ?? null)) continue;
      changed.push(key);
      if (value === null) delete input[key];
      else input[key] = value;
    }
    return [
      {
        ...row,
        input,
        uncertain: lead.uncertain,
        duplicates: lead.duplicates,
        changed,
        origin: {
          ...row.origin,
          ...Object.fromEntries(
            changed
              .filter((key) => key === 'ownerId' || key === 'source')
              .map((key) => [key, 'ai' as const]),
          ),
        },
        revision: changed.length ? row.revision + 1 : row.revision,
      },
    ];
  });
  const added = leads
    .filter((lead) => !lead.ref)
    .map((lead) => {
      const row = toRow(lead, owner);
      return {
        ...row,
        changed: Object.keys(row.input).filter((key) => key !== 'ownerId'),
      };
    });
  return [...kept, ...added];
}

// The two ways to enter a new lead, beside the title of both the AI dialog
// and the lead form, so either can switch to the other.
export function CaptureTabs({
  current,
  disabled,
  onSwitch,
}: {
  current: 'ai' | 'form';
  disabled?: boolean;
  onSwitch: () => void;
}): ReactElement {
  const { text } = useCrmText();
  return (
    <div role='tablist' className='flex w-fit gap-1 rounded-lg bg-muted p-1'>
      {(['ai', 'form'] as const).map((tab) => (
        <Button
          key={tab}
          type='button'
          role='tab'
          aria-selected={tab === current}
          size='sm'
          variant={tab === current ? 'secondary' : 'ghost'}
          // The AI tab reads in the AI colour whether or not it is current.
          className={`${tab === current ? 'bg-background shadow-sm' : ''} ${
            tab === 'ai' ? 'text-ai hover:text-ai' : ''
          }`}
          disabled={tab !== current && disabled}
          onClick={() => {
            if (tab !== current) onSwitch();
          }}
        >
          {tab === 'ai' && <Sparkles />}
          {text(tab === 'ai' ? 'leadCapture.aiTab' : 'leadCapture.formTab')}
        </Button>
      ))}
    </div>
  );
}

// "New lead" when the assistant is available: paste what you have and the AI
// organises it into one lead per person, which the review below shows for
// checking, completing, adjusting with the AI and creating. "Fill in a form"
// opens the empty lead form instead.
export function LeadCaptureDialog({
  draft,
  onDraft,
  onClose,
  onForm,
}: {
  // What was pasted, kept by the page while the user switches to the form
  // and back.
  draft: string;
  onDraft: (draft: string) => void;
  onClose: () => void;
  onForm: () => void;
}): ReactElement {
  const { text, language } = useCrmText();
  const api = useCrmApi();
  const { data: meta } = useMetadata();
  const pasted = draft;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>();
  const [rows, setRows] = useState<ReviewRow[]>();
  // The text the current leads were organised from, and how many times it
  // has been organised: the review starts afresh with each round.
  const [organised, setOrganised] = useState('');
  const [round, setRound] = useState(0);
  // A new lead's owner is the reader when they sell, as in the lead form.
  const defaultOwner = meta?.users.some(
    (u) =>
      u.id === meta.userId && u.roles.some((r) => SELLER_ROLES.includes(r)),
  )
    ? meta.userId
    : undefined;

  const organise = async (): Promise<void> => {
    if (!pasted.trim() || busy) return;
    setBusy(true);
    setError(undefined);
    try {
      const { data } = await api<{ data: { leads: CapturedLead[] } }>(
        'leads/capture',
        'POST',
        { text: pasted },
      );
      if (!data.leads.length) setError({ code: 'captureNothing' });
      else {
        // Organising again replaces the leads not yet created; those
        // already created stay listed as such.
        setRows((current) => [
          ...(current ?? []).filter((row) => row.createdId),
          ...data.leads.map((lead) => toRow(lead, defaultOwner)),
        ]);
        setOrganised(pasted);
        setRound((n) => n + 1);
      }
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !busy) onClose();
      }}
    >
      <DialogContent
        showCloseButton={false}
        className={`max-h-[90svh] overflow-y-auto ${
          !rows
            ? 'sm:max-w-4xl'
            : rows.length > 1
              ? 'sm:max-w-7xl'
              : 'sm:max-w-6xl'
        }`}
      >
        <DialogHeader>
          <div className='flex flex-wrap items-center gap-x-4 gap-y-2'>
            <DialogTitle>
              {text('newRecord', { entity: text('entity.leads') })}
            </DialogTitle>
            <CaptureTabs current='ai' disabled={busy} onSwitch={onForm} />
          </div>
        </DialogHeader>
        {rows ? (
          <CaptureReview
            key={round}
            rows={rows}
            setRows={setRows}
            pasted={pasted}
            onDraft={onDraft}
            changedText={pasted.trim() !== '' && pasted !== organised}
            organiseError={error}
            onOrganise={() => void organise()}
            defaultOwner={defaultOwner}
            busy={busy}
            setBusy={setBusy}
            onDone={onClose}
          />
        ) : (
          <div className='grid gap-4'>
            <ErrorNotice error={error} />
            <div>
              <Textarea
                autoFocus
                value={pasted}
                // Sized to its content by the primitive: room for a paste to
                // start with, scrolling once it passes half the screen.
                className='max-h-[50svh] min-h-48'
                maxLength={LONG_TEXT_LIMIT}
                disabled={busy}
                placeholder={text('leadCapture.placeholder')}
                aria-label={text('leadCapture.input')}
                onChange={(e) => onDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                    e.preventDefault();
                    void organise();
                  }
                }}
              />
              <LengthHint length={pasted.length} language={language} />
            </div>
            <DialogFooter>
              <Button variant='outline' disabled={busy} onClick={onClose}>
                {text('cancel')}
              </Button>
              <Button
                className='bg-ai text-ai-foreground hover:bg-ai/90'
                disabled={busy || !pasted.trim()}
                onClick={() => void organise()}
              >
                {busy ? <Spinner /> : <Sparkles />}
                {text(busy ? 'leadCapture.organising' : 'leadCapture.organise')}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// The leads the AI found, one lead form each. With several, a list on the
// left says which are ready, which still lack a required field, which need a
// check or may repeat a record, and the owner and source can be set for all
// at once; each lead keeps its own owner. Below, the user tells the AI what
// to change. Creating takes the checked leads that are complete; the rest
// stay here until they are.
function CaptureReview({
  rows,
  setRows,
  pasted,
  defaultOwner,
  busy,
  setBusy,
  onDraft,
  changedText,
  organiseError,
  onOrganise,
  onDone,
}: {
  rows: ReviewRow[];
  setRows: Dispatch<SetStateAction<ReviewRow[] | undefined>>;
  pasted: string;
  defaultOwner: string | undefined;
  busy: boolean;
  setBusy: (busy: boolean) => void;
  // The text is edited in place; once it differs from what the leads were
  // organised from, it can be organised again.
  onDraft: (draft: string) => void;
  changedText: boolean;
  organiseError: unknown;
  onOrganise: () => void;
  onDone: () => void;
}): ReactElement {
  const { text } = useCrmText();
  const api = useCrmApi();
  const refresh = useRefresh();
  const { data: meta } = useMetadata();
  // Whether the AI follows the created leads up at once.
  const [followUp, setFollowUp] = useState(true);
  const [current, setCurrent] = useState(rows[0]?.key);
  const [working, setWorking] = useState<'adjust' | 'create'>();
  const [turns, setTurns] = useState<Turn[]>([]);
  const [instruction, setInstruction] = useState('');
  const [adjustError, setAdjustError] = useState<unknown>();
  const [forAll, setForAll] = useState({ ownerId: '', source: '' });
  const fields = meta?.definitions.leads.fields ?? [];
  // Required on a new lead; its status is always "new".
  const required = fields
    .filter((f) => f.required && !f.readOnly && f.key !== 'status')
    .map((f) => f.key);
  const missing = (row: ReviewRow): string[] =>
    required.filter((key) => isEmpty(row.input[key]));
  const sellers = (meta?.users ?? []).filter(
    (u) => !u.disabled && u.roles.some((r) => SELLER_ROLES.includes(r)),
  );
  const sources = (meta?.settings.options.source ?? []).map((v) => ({
    value: v,
    label: text(`options.${toText(v)}`, { defaultValue: v }),
  }));
  const update = (key: string, change: (row: ReviewRow) => ReviewRow): void =>
    setRows((all) => all?.map((row) => (row.key === key ? change(row) : row)));
  const active = rows.find((row) => row.key === current) ?? rows[0];
  const open = rows.filter((row) => row.selected && !row.createdId);
  const ready = open.filter((row) => !missing(row).length);
  const pending = open.length - ready.length;
  const many = rows.length > 1;

  const applyToAll = (key: 'ownerId' | 'source', value: string): void => {
    setForAll((all) => ({ ...all, [key]: value }));
    if (!value) return;
    setRows((all) =>
      all?.map((row) =>
        row.createdId ||
        row.origin[key] === 'ai' ||
        row.origin[key] === 'user' ||
        row.input[key] === value
          ? row
          : {
              ...row,
              input: { ...row.input, [key]: value },
              origin: { ...row.origin, [key]: 'all' },
              revision: row.revision + 1,
            },
      ),
    );
  };

  const adjust = async (): Promise<void> => {
    const said = instruction.trim();
    if (!said || busy) return;
    setBusy(true);
    setWorking('adjust');
    setAdjustError(undefined);
    try {
      const { data } = await api<{
        data: { leads: CapturedLead[]; reply?: string };
      }>('leads/capture', 'POST', {
        text: pasted,
        instruction: said,
        leads: rows
          .filter((row) => !row.createdId)
          .map((row) => ({
            ref: row.key,
            ...Object.fromEntries(
              AI_FIELDS.map((key) => [key, toText(row.input[key] ?? '')]),
            ),
          })),
      });
      setRows((all) => merge(all ?? [], data.leads, defaultOwner));
      setTurns((all) => [
        ...all,
        { id: crypto.randomUUID(), from: 'user', text: said },
        ...(data.reply
          ? [{ id: crypto.randomUUID(), from: 'ai' as const, text: data.reply }]
          : []),
      ]);
      setInstruction('');
    } catch (e) {
      setAdjustError(e);
    } finally {
      setBusy(false);
      setWorking(undefined);
    }
  };

  const create = async (): Promise<void> => {
    setBusy(true);
    setWorking('create');
    const keys = new Set(fields.map((f) => f.key));
    let next = rows;
    for (const row of ready) {
      try {
        // Created as the AI's proposal the user checked (the feed marks it).
        const { data } = await api<{ data: { id: string } }>(
          `leads?via=capture${followUp ? '' : '&followUp=0'}`,
          'POST',
          Object.fromEntries(
            Object.entries(row.input).filter(
              ([key, value]) => keys.has(key) && value !== undefined,
            ),
          ),
        );
        next = next.map((r) =>
          r.key === row.key
            ? { ...r, createdId: toText(data.id), error: undefined }
            : r,
        );
      } catch (e) {
        next = next.map((r) => (r.key === row.key ? { ...r, error: e } : r));
      }
      setRows(next);
    }
    await refresh();
    setBusy(false);
    setWorking(undefined);
    if (next.every((row) => !row.selected || row.createdId)) onDone();
    else
      setCurrent(
        next.find((row) => row.selected && !row.createdId)?.key ?? current,
      );
  };

  if (!active)
    return (
      <div className='grid gap-4'>
        <DialogDescription>{text('leadCapture.noneLeft')}</DialogDescription>
        <ErrorNotice error={organiseError} />
        <DialogFooter>
          <Button variant='outline' disabled={busy} onClick={onDone}>
            {text('cancel')}
          </Button>
          <Button
            className='bg-ai text-ai-foreground hover:bg-ai/90'
            disabled={busy}
            onClick={onOrganise}
          >
            {busy ? <Spinner /> : <Sparkles />}
            {text('leadCapture.reorganise')}
          </Button>
        </DialogFooter>
      </div>
    );

  return (
    <div className='grid gap-4'>
      {many && (
        <div className='flex flex-wrap items-center gap-2'>
          <DialogDescription className='mr-auto'>
            {text('leadCapture.found', { count: rows.length })}
          </DialogDescription>
          <span className='text-sm text-muted-foreground'>
            {text('leadCapture.forAll')}
          </span>
          <div className='w-44'>
            <Choice
              label={text('fields.ownerId')}
              emptyLabel={text('fields.ownerId')}
              value={forAll.ownerId}
              onChange={(v) => applyToAll('ownerId', v)}
              disabled={!meta?.assign || busy}
              choices={sellers.map((u) => ({ value: u.id, label: u.name }))}
            />
          </div>
          <div className='w-44'>
            <Choice
              label={text('fields.source')}
              emptyLabel={text('fields.source')}
              value={forAll.source}
              onChange={(v) => applyToAll('source', v)}
              disabled={busy}
              choices={sources}
            />
          </div>
        </div>
      )}
      <div
        className={`grid items-start gap-4 ${
          many
            ? 'md:grid-cols-[14rem_minmax(0,1fr)] lg:grid-cols-[14rem_minmax(0,1fr)_20rem]'
            : 'lg:grid-cols-[minmax(0,1fr)_22rem]'
        }`}
      >
        {many && (
          <ul className='grid gap-2'>
            {rows.map((row) => {
              const lacking = missing(row).length;
              const owner = meta?.users.find(
                (u) => u.id === row.input.ownerId,
              )?.name;
              return (
                <li
                  key={row.key}
                  className={`flex items-start gap-2 rounded-lg border p-2 ${
                    row.key === active.key
                      ? 'border-primary/60 bg-primary/5'
                      : 'hover:bg-muted/50'
                  }`}
                >
                  <Checkbox
                    className='mt-0.5'
                    aria-label={toText(row.input.name ?? row.input.company)}
                    checked={row.selected}
                    disabled={Boolean(row.createdId) || busy}
                    onCheckedChange={(v) =>
                      update(row.key, (r) => ({ ...r, selected: Boolean(v) }))
                    }
                  />
                  <button
                    type='button'
                    className='grid min-w-0 flex-1 gap-1 text-left text-sm'
                    onClick={() => setCurrent(row.key)}
                  >
                    <span className='truncate font-medium'>
                      {toText(row.input.name ?? '') ||
                        toText(row.input.company ?? '')}
                    </span>
                    <span className='truncate text-xs text-muted-foreground'>
                      {[
                        toText(row.input.company ?? ''),
                        owner ?? text('leadCapture.unassigned'),
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                    </span>
                    <span className='flex flex-wrap gap-1'>
                      {row.createdId ? (
                        <Badge variant='success'>
                          {text('leadCapture.created')}
                        </Badge>
                      ) : (
                        <>
                          {Boolean(row.error) && (
                            <Badge variant='destructive'>
                              {text('leadCapture.createFailed')}
                            </Badge>
                          )}
                          {lacking > 0 && (
                            <Badge variant='destructive'>
                              {text('leadCapture.missing', { count: lacking })}
                            </Badge>
                          )}
                          {row.uncertain.length > 0 && (
                            <Badge variant='warning'>
                              {text('leadCapture.checkCount', {
                                count: row.uncertain.length,
                              })}
                            </Badge>
                          )}
                          {row.duplicates.length > 0 && (
                            <Badge variant='warning'>
                              {text('leadCapture.duplicate')}
                            </Badge>
                          )}
                          {row.changed.length > 0 && (
                            <Badge variant='ai'>
                              {text('leadCapture.aiChanged')}
                            </Badge>
                          )}
                        </>
                      )}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
        <div className='min-w-0'>
          {active.createdId ? (
            <div className='grid place-items-center gap-2 rounded-lg border p-8 text-sm'>
              <Badge variant='success'>{text('leadCapture.created')}</Badge>
              <Link
                to={`/crm/leads/${active.createdId}`}
                target='_blank'
                className='text-primary hover:underline'
              >
                {text('leadCapture.openRecord')}
              </Link>
            </div>
          ) : (
            <>
              <ErrorNotice error={active.error} />
              <RecordForm
                key={`${active.key}-${String(active.revision)}`}
                entity='leads'
                initial={active.input}
                review={active.uncertain}
                changed={active.changed}
                notice={(unfilled) => (
                  <CaptureNotice lead={active} unfilled={unfilled} />
                )}
                embedded={{
                  onChange: (next) =>
                    update(active.key, (row) => ({
                      ...row,
                      input: next,
                      origin: {
                        ...row.origin,
                        ...Object.fromEntries(
                          (['ownerId', 'source'] as const)
                            .filter((key) => next[key] !== row.input[key])
                            .map((key) => [key, 'user' as const]),
                        ),
                      },
                    })),
                }}
                onClose={() => undefined}
              />
            </>
          )}
        </div>
        {/* The text beside the leads, so each value can be checked
            against it, and below it the conversation that adjusts them;
            it stays in view while the form scrolls. */}
        <aside
          className={`grid content-start gap-3 rounded-lg border bg-muted/30 p-3 lg:sticky lg:top-0 ${
            many ? 'md:col-span-2 lg:col-span-1' : ''
          }`}
        >
          <div className='grid gap-1.5'>
            <h3 className='flex items-center gap-1.5 text-sm font-medium'>
              <FileText className='size-4 text-muted-foreground' />
              {text('leadCapture.original')}
            </h3>
            <Textarea
              value={pasted}
              disabled={busy}
              maxLength={LONG_TEXT_LIMIT}
              className='max-h-[32svh] min-h-24 bg-background'
              aria-label={text('leadCapture.original')}
              onChange={(e) => onDraft(e.target.value)}
            />
            <ErrorNotice error={organiseError} />
            {changedText && (
              <div className='flex items-center justify-between gap-2'>
                <span className='text-xs text-muted-foreground'>
                  {text('leadCapture.reorganiseHint')}
                </span>
                <Button
                  size='sm'
                  variant='outline'
                  className='shrink-0 text-ai hover:text-ai'
                  disabled={busy}
                  onClick={onOrganise}
                >
                  {busy && !working ? <Spinner /> : <Sparkles />}
                  {text('leadCapture.reorganise')}
                </Button>
              </div>
            )}
          </div>
          <div className='grid gap-2 border-t pt-3'>
            <h3 className='flex items-center gap-1.5 text-sm font-medium'>
              <Sparkles className='size-4 text-ai' />
              {text('leadCapture.adjustTitle')}
            </h3>
            {turns.map((turn) =>
              turn.from === 'user' ? (
                <p
                  key={turn.id}
                  className='ml-auto max-w-[90%] rounded-lg bg-background px-3 py-1.5 text-sm'
                >
                  {turn.text}
                </p>
              ) : (
                <p
                  key={turn.id}
                  className='max-w-[90%] text-sm text-muted-foreground'
                >
                  {turn.text}
                </p>
              ),
            )}
            <ErrorNotice error={adjustError} />
            <Textarea
              value={instruction}
              disabled={busy}
              maxLength={1000}
              className='min-h-16 bg-background'
              placeholder={text('leadCapture.adjustPlaceholder')}
              aria-label={text('leadCapture.adjust')}
              onChange={(e) => setInstruction(e.target.value)}
              onKeyDown={(e) => {
                // Enter sends, Shift+Enter starts a new line.
                if (
                  e.key === 'Enter' &&
                  !e.shiftKey &&
                  !e.nativeEvent.isComposing
                ) {
                  e.preventDefault();
                  void adjust();
                }
              }}
            />
            <Button
              size='sm'
              className='justify-self-end bg-ai text-ai-foreground hover:bg-ai/90'
              disabled={busy || !instruction.trim()}
              onClick={() => void adjust()}
            >
              {working === 'adjust' ? <Spinner /> : <Sparkles />}
              {text(
                working === 'adjust'
                  ? 'leadCapture.adjusting'
                  : 'leadCapture.adjust',
              )}
            </Button>
          </div>
        </aside>
      </div>
      <DialogFooter>
        <FollowUpOption
          checked={followUp}
          onChange={setFollowUp}
          disabled={busy}
        />
        <Button variant='outline' disabled={busy} onClick={onDone}>
          {text('cancel')}
        </Button>
        <Button disabled={busy || !ready.length} onClick={() => void create()}>
          {working === 'create' && <Spinner />}
          {many && !ready.length && pending
            ? text('leadCapture.pendingCount', { count: pending })
            : many
              ? `${text('leadCapture.createCount', { count: ready.length })}${
                  pending
                    ? ` · ${text('leadCapture.pendingCount', { count: pending })}`
                    : ''
                }`
              : text('leadCapture.createOne')}
        </Button>
      </DialogFooter>
    </div>
  );
}

// The notice atop a lead's form: where the values came from, which required
// fields are still empty, and what the CRM may already hold.
export function CaptureNotice({
  lead,
  unfilled,
}: {
  lead: Pick<CapturedLead, 'duplicates'>;
  // Required fields still empty, highlighted in the form below.
  unfilled: readonly string[];
}): ReactElement {
  const { text, language } = useCrmText();
  return (
    <div className='grid gap-1 rounded-lg bg-ai/10 p-3 text-sm'>
      <p className='flex gap-2'>
        <Sparkles className='mt-0.5 size-4 shrink-0 text-ai' />
        <span>
          {text('leadCapture.filledNotice')}
          {/* The fields still required follow on the same line. */}
          {unfilled.length > 0 && (
            <>
              {/* Chinese sentences run on without a space. */}
              {language.startsWith('zh') ? '' : ' '}
              <span className='font-medium text-warning'>
                {text('leadCapture.fillRequired', {
                  fields: unfilled
                    .map((key) => text(fieldLabelKey('leads', key)))
                    .join(language.startsWith('zh') ? '、' : ', '),
                })}
              </span>
            </>
          )}
        </span>
      </p>
      {lead.duplicates.length > 0 && (
        <p className='text-warning'>
          {text('leadCapture.duplicates')}{' '}
          {lead.duplicates.map((d, index) => (
            <span key={`${d.entity}:${d.id}`}>
              {index > 0 && (language.startsWith('zh') ? '、' : ', ')}
              <Link
                to={`/crm/${d.entity}/${d.id}`}
                target='_blank'
                className='underline underline-offset-2'
              >
                {`${text(`entity.${d.entity}`)} ${d.name}`}
              </Link>
            </span>
          ))}
        </p>
      )}
    </div>
  );
}
