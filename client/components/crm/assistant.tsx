import { useLookups, lookupTitles } from './lookups.js';
import { toText } from './api.js';
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type PropsWithChildren,
  type ReactElement,
} from 'react';
import { Link } from 'react-router';
import {
  Sparkles,
  X,
  Send,
  Pencil,
  Check,
  Archive,
  Trash2,
  ChevronRight,
  Search,
  FileSearch,
  Globe,
  CircleCheck,
  CircleAlert,
} from 'lucide-react';
import { Button } from '../ui/button.js';
import { Spinner } from '../ui/spinner.js';
import { Textarea } from '../ui/textarea.js';
import { Checkbox } from '../ui/checkbox.js';
import { Card, CardContent } from '../ui/card.js';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '../ui/sheet.js';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../ui/dialog.js';
import {
  useCrmApi,
  useCrmQuery,
  useCrmText,
  useRefresh,
  useMetadata,
  rows,
  fieldLabelKey,
  localDate,
  type CrmRecord,
  type Data,
  type Entity,
  type Field,
} from './api.js';
import { ErrorNotice, RecordLink, Value } from './common.js';
import { InlineField } from './inline.js';
import { RecordForm } from './form.js';
import { inherited, proposalFor } from './conversion-fields.js';

interface AssistantState {
  open: boolean;
  message: string;
  context: Data;
  setOpen: (v: boolean) => void;
  setMessage: (v: string) => void;
}
const AssistantContext = createContext<AssistantState | undefined>(undefined);
const openKey = 'crm-assistant-open';
export function CrmAssistantProvider({
  children,
}: PropsWithChildren): ReactElement {
  // Whether the panel is open survives a reload of this tab: the user keeps
  // working with it beside the page, and a refresh should not shut it.
  const [open, setOpen] = useState(() => {
    try {
      return sessionStorage.getItem(openKey) === '1';
    } catch {
      return false;
    }
  });
  const [message, setMessage] = useState('');
  const [context, setContext] = useState<Data>({});
  useEffect(() => {
    document.body.classList.toggle('crm-assistant-open', open);
    try {
      sessionStorage.setItem(openKey, open ? '1' : '0');
    } catch {
      // Storage may be unavailable; the panel then simply starts closed.
    }
    return () => document.body.classList.remove('crm-assistant-open');
  }, [open]);
  useEffect(() => {
    const show = (event: Event): void => {
      const data = (event as CustomEvent<Data>).detail ?? {};
      // A shortcut with send:true is a complete instruction the panel sends
      // on its own, so it never lands in the box; the others pre-fill it.
      if (data.prompt && data.send !== true) setMessage(toText(data.prompt));
      if (data.entity)
        setContext({ entity: data.entity, recordId: data.recordId });
      setOpen(true);
    };
    const change = (event: Event): void =>
      setContext((event as CustomEvent<Data>).detail ?? {});
    window.addEventListener('crm-assistant', show);
    window.addEventListener('crm-context', change);
    return () => {
      window.removeEventListener('crm-assistant', show);
      window.removeEventListener('crm-context', change);
    };
  }, []);
  return (
    <AssistantContext.Provider
      value={{ open, message, context, setOpen, setMessage }}
    >
      {children}
      <AssistantPanel />
    </AssistantContext.Provider>
  );
}
export function AssistantPanel(): ReactElement | null {
  const state = useContext(AssistantContext);
  const { data: meta } = useMetadata();
  const { text } = useCrmText();
  const api = useCrmApi();
  const refresh = useRefresh();
  const [busy, setBusy] = useState(false);
  // A question the server is still answering (written before the model was
  // asked, so it survives a reload) is polled until the reply lands. Polling
  // also runs while this panel's own send is in flight: that is how the
  // question's progress steps, written on the server, reach the screen
  // before the reply does.
  const history = useCrmQuery<{ messages: Data[]; actions: Data[] }>(
    'ai/history',
    Boolean(state?.open),
    {
      refetchInterval: (data) =>
        busy || data?.messages.some((m) => m.status === 'pending')
          ? 2000
          : false,
    },
  );
  const pendingOnServer = (history.data?.messages ?? []).some(
    (m) => m.status === 'pending',
  );
  // What was just sent, shown at once with a "thinking" bubble: a reply can
  // take half a minute when the model searches the web, and a panel that
  // shows nothing for that long reads as broken and invites repeat clicks.
  const [pendingMessage, setPendingMessage] = useState('');
  const [error, setError] = useState<unknown>();
  const [clearing, setClearing] = useState(false);
  const busyRef = useRef(false);
  // The newest turn is at the bottom: scroll there when the panel opens, a
  // message is sent, or a reply lands. Deferred past the sheet's slide-in,
  // during which the transcript has no height to scroll.
  const endRef = useRef<HTMLDivElement>(null);
  const messageCount = history.data?.messages.length ?? 0;
  // Progress steps grow the pending bubble while the reply is written; the
  // count of them is what keeps the bottom in view during that time.
  const stepCount = (history.data?.messages ?? []).reduce(
    (n, m) => n + (m.status === 'pending' ? rows(m.steps).length : 0),
    0,
  );
  const isOpen = Boolean(state?.open);
  useEffect(() => {
    if (!isOpen) return;
    const timer = window.setTimeout(
      () => endRef.current?.scrollIntoView({ block: 'end' }),
      250,
    );
    return () => window.clearTimeout(timer);
  }, [isOpen, pendingMessage, messageCount, stepCount]);
  const sendMessage = async (message: string, context: Data): Promise<void> => {
    if (!message.trim() || busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setPendingMessage(message);
    setError(undefined);
    try {
      // Returns as soon as the question is written; the reply, its progress
      // and a stop button all come through the polled history.
      await api('ai/chat', 'POST', { message, ...context, background: true });
      state?.setMessage('');
      await refresh();
    } catch (e) {
      setError(e);
      // The question is on the server either way, marked failed or still
      // pending; show it as such rather than only the error.
      void refresh();
    } finally {
      busyRef.current = false;
      setBusy(false);
      setPendingMessage('');
    }
  };
  const cancel = async (id: string): Promise<void> => {
    try {
      await api(`ai/messages/${id}/cancel`, 'POST', {});
    } catch (e) {
      setError(e);
    } finally {
      void refresh();
    }
  };
  const resend = async (id: string): Promise<void> => {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setError(undefined);
    try {
      await api(`ai/messages/${id}/retry`, 'POST', {});
    } catch (e) {
      setError(e);
    } finally {
      busyRef.current = false;
      setBusy(false);
      void refresh();
    }
  };
  // The listener is registered once; the ref keeps it pointed at the current
  // closure so it sees today's api client and state setters.
  const sendRef = useRef(sendMessage);
  useEffect(() => {
    sendRef.current = sendMessage;
  });
  useEffect(() => {
    const shortcut = (event: Event): void => {
      const data = (event as CustomEvent<Data>).detail ?? {};
      if (data.send !== true || !data.prompt) return;
      void sendRef.current(toText(data.prompt), {
        ...(data.entity
          ? { entity: data.entity, recordId: data.recordId }
          : {}),
        ...(data.webSearch === true ? { webSearch: true } : {}),
      });
    };
    window.addEventListener('crm-assistant', shortcut);
    return () => window.removeEventListener('crm-assistant', shortcut);
  }, []);
  if (!state || !meta?.settings.aiEnabled) return null;
  const actions = rows(history.data?.actions);
  return (
    // Clicking a nav link counts as an outside press, which would close the panel on every page switch.
    <Sheet
      modal={false}
      disablePointerDismissal
      open={state.open}
      onOpenChange={state.setOpen}
    >
      <SheetContent
        showCloseButton={false}
        showOverlay={false}
        className='data-[side=right]:w-[min(28rem,calc(100vw-1rem))] data-[side=right]:sm:max-w-md'
      >
        <SheetHeader className='border-b pr-12'>
          <SheetTitle className='flex items-center gap-2'>
            <Sparkles className='size-5' />
            {text('assistant')}
          </SheetTitle>
          <SheetDescription>{text('assistantHint')}</SheetDescription>
          <Button
            className='absolute right-3 top-3'
            variant='ghost'
            size='icon'
            aria-label={text('cancel')}
            onClick={() => state.setOpen(false)}
          >
            <X />
          </Button>
        </SheetHeader>
        <div className='flex-1 space-y-5 overflow-y-auto px-4 pb-4'>
          <ErrorNotice error={error ?? history.error} />
          {!history.data?.messages.length && (
            <p className='rounded-xl bg-muted p-4 text-sm text-muted-foreground'>
              {text('askHint')}
            </p>
          )}
          {history.data?.messages.map((m) => [
            m.role === 'event' ? (
              // A note the system wrote, e.g. "action executed": not a bubble
              // from either side, just the reason the assistant speaks again.
              <p
                key={toText(m.id)}
                className='px-2 text-center text-xs text-muted-foreground'
              >
                {toText(m.content)}
              </p>
            ) : (
              <div
                key={toText(m.id)}
                className={`whitespace-pre-wrap break-words rounded-xl p-4 text-sm leading-relaxed ${toText(m.role === 'user' ? 'ml-8 bg-primary/10' : 'mr-3 border bg-card')}`}
              >
                {toText(m.content)}
              </div>
            ),
            // A question still being answered shows the same "thinking"
            // bubble as one just sent; one whose reply never came (the
            // server stopped meanwhile) offers to send it again.
            m.status === 'pending' ? (
              <div
                key={`${toText(m.id)}-pending`}
                className='mr-3 space-y-2 rounded-xl border bg-card p-4 text-sm text-muted-foreground'
                aria-live='polite'
              >
                <div className='flex items-center gap-2'>
                  <Spinner className='size-4' />
                  {text('thinking')}
                </div>
                <Steps steps={rows(m.steps)} live />
              </div>
            ) : m.status === 'failed' || m.status === 'cancelled' ? (
              <div
                key={`${toText(m.id)}-failed`}
                className={`mr-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border p-3 text-sm ${toText(
                  m.status === 'failed'
                    ? 'border-destructive/30 bg-destructive/5'
                    : 'bg-muted/40',
                )}`}
              >
                <span className='text-muted-foreground'>
                  {text(m.status === 'failed' ? 'noReply' : 'replyStopped')}
                </span>
                <Button
                  size='sm'
                  variant='outline'
                  disabled={busy}
                  onClick={() => void resend(toText(m.id))}
                >
                  {text('resend')}
                </Button>
              </div>
            ) : rows(m.steps).some((step) =>
                // Context and model rounds happen every time; only a trail
                // with lookups or a web search is worth keeping.
                ['search', 'get', 'web'].includes(toText(step.kind)),
              ) ? (
              <Trail key={`${toText(m.id)}-trail`} steps={rows(m.steps)} />
            ) : null,
            // The cards a reply produced sit under that reply, whatever became
            // of them: an executed card stays as the record of what was done,
            // so the conversation still reads as a sequence afterwards.
            ...actions
              .filter((a) => a.messageId === m.id)
              .map((a) => (
                <ActionCard key={toText(a.id)} action={a} continueAfter />
              )),
          ])}
          {/* A pending card whose reply is gone (the chat was cleared) is not
              shown here: without its conversation it reads as leftover. It
              stays in the action center, which the clear dialog says. */}
          {pendingMessage && !pendingOnServer && (
            <>
              <div className='ml-8 whitespace-pre-wrap break-words rounded-xl bg-primary/10 p-4 text-sm leading-relaxed'>
                {pendingMessage}
              </div>
              <div
                className='mr-3 flex items-center gap-2 rounded-xl border bg-card p-4 text-sm text-muted-foreground'
                aria-live='polite'
              >
                <Spinner className='size-4' />
                {text('thinking')}
              </div>
            </>
          )}
          <div ref={endRef} />
        </div>
        <div className='space-y-3 border-t p-4'>
          <div className='flex items-center justify-between'>
            <Link
              className='text-xs text-primary hover:underline'
              to='/crm/actions'
            >
              {text('viewActions')} ↗
            </Link>
            {history.data?.messages.length ? (
              <Button
                variant='ghost'
                size='sm'
                className='h-7 px-2 text-xs text-muted-foreground'
                disabled={busy}
                onClick={() => setClearing(true)}
              >
                <Trash2 />
                {text('clearChat')}
              </Button>
            ) : null}
          </div>
          {clearing && (
            <Dialog open onOpenChange={setClearing}>
              <DialogContent showCloseButton={false}>
                <DialogHeader>
                  <DialogTitle>{text('clearChat')}</DialogTitle>
                  <DialogDescription>
                    {text('clearChatDetail')}
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button variant='outline' onClick={() => setClearing(false)}>
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
                          await api('ai/history', 'DELETE');
                          setClearing(false);
                          await refresh();
                        } catch (e) {
                          setError(e);
                        } finally {
                          setBusy(false);
                        }
                      })();
                    }}
                  >
                    {text('clearChat')}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
          <form
            className='space-y-2'
            onSubmit={(e) => {
              e.preventDefault();
              void sendMessage(state.message, state.context);
            }}
          >
            <Textarea
              aria-label={text('assistant')}
              placeholder={text('askHint')}
              value={state.message}
              onChange={(e) => state.setMessage(e.target.value)}
              // Enter sends; Shift/Ctrl/Cmd/Alt+Enter inserts a line break.
              // Composition (IME) Enter is left alone so Chinese input works.
              onKeyDown={(e) => {
                if (
                  e.key !== 'Enter' ||
                  e.shiftKey ||
                  e.ctrlKey ||
                  e.metaKey ||
                  e.altKey ||
                  e.nativeEvent.isComposing
                )
                  return;
                e.preventDefault();
                if (!busy && !pendingOnServer && state.message.trim())
                  void sendMessage(state.message, state.context);
              }}
              disabled={busy}
              rows={3}
            />
            <div className='flex gap-2'>
              <Button
                className='flex-1 bg-ai text-ai-foreground hover:bg-ai/90'
                type='submit'
                disabled={busy || pendingOnServer || !state.message.trim()}
              >
                <Send />
                {busy || pendingOnServer ? text('thinking') : text('send')}
              </Button>
              {/* Gives up on the reply being written; the question stays,
                  marked stopped, with a resend. */}
              {pendingOnServer && (
                <Button
                  type='button'
                  variant='outline'
                  onClick={() => {
                    const waiting = history.data?.messages.find(
                      (m) => m.status === 'pending',
                    );
                    if (waiting) void cancel(toText(waiting.id));
                  }}
                >
                  <X />
                  {text('stopReply')}
                </Button>
              )}
            </div>
          </form>
        </div>
      </SheetContent>
    </Sheet>
  );
}
const object_ = (value: unknown): Data =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Data)
    : {};

// What a convert action will do, in the same terms as the conversion dialog:
// which account and contact (linked or created, with the fields a new one
// inherits from the lead), the optional opportunity, and the side effects.
function ConversionSummary({
  input,
  lead,
  names,
  editable,
  onEdit,
  onSet,
  lookup,
}: {
  input: Data;
  lead: CrmRecord | undefined;
  names: Record<string, string>;
  editable: boolean;
  // Writes one inherited field into input.account / input.contact, the
  // per-field overrides convertLead() applies over the lead's values.
  onEdit: (
    entity: 'accounts' | 'contacts',
    key: string,
    value: unknown,
  ) => Promise<void>;
  // Writes a top-level request key: accountName, createOpportunity,
  // opportunityName, amount, overwriteAccountFields, overwriteContactFields.
  onSet: (key: string, value: unknown) => Promise<void>;
  lookup: Partial<Record<Entity, CrmRecord[]>>;
}): ReactElement | null {
  const { text } = useCrmText();
  const { data: meta } = useMetadata();
  if (!lead) return null;
  const fieldDef = (entity: Entity, key: string): Field =>
    meta?.definitions[entity].fields.find((f) => f.key === key) ?? {
      key,
      type: 'text',
    };
  const row = (
    label: string,
    entity: Entity,
    field: Field,
    record: Data,
    save: (value: unknown) => Promise<void>,
  ): ReactElement => (
    <div className='flex items-start gap-3'>
      <dt className='w-20 shrink-0 pt-1.5 text-sm text-muted-foreground'>
        {label}
      </dt>
      <dd className='-mx-2 min-w-0 flex-1 text-sm'>
        <InlineField
          entity={entity}
          record={record as CrmRecord}
          field={field}
          label={label}
          lookup={names}
          editable={editable}
          onSave={save}
        />
      </dd>
    </div>
  );
  // Linking an existing record only fills its empty fields; where it and the
  // lead disagree the user picks, per field, whether the lead's value wins.
  // Mirrors the conversion dialog and writes the same overwrite lists.
  const conflictList = (
    entity: 'accounts' | 'contacts',
    id: string,
    proposal: Data,
  ): ReactElement | null => {
    const current = lookup[entity]?.find((r) => r.id === id);
    if (!current) return null;
    const fields = inherited[entity].filter(
      (key) => current[key] && proposal[key] && current[key] !== proposal[key],
    );
    if (!fields.length) return null;
    const listKey =
      entity === 'accounts'
        ? 'overwriteAccountFields'
        : 'overwriteContactFields';
    const chosen = Array.isArray(input[listKey])
      ? (input[listKey] as unknown[]).map(toText)
      : [];
    return (
      <div className='space-y-1.5 pt-1'>
        <p className='text-xs text-muted-foreground'>
          {text('overwriteFields')}
        </p>
        {fields.map((key) => (
          <label key={key} className='flex items-start gap-2 text-sm'>
            <Checkbox
              className='mt-0.5'
              disabled={!editable}
              checked={chosen.includes(key)}
              onCheckedChange={(v) =>
                void onSet(
                  listKey,
                  v ? [...chosen, key] : chosen.filter((x) => x !== key),
                )
              }
            />
            <span className='min-w-0'>
              <span className='text-muted-foreground'>
                {text(`fields.${key}`)}：
              </span>
              <Value
                record={current}
                field={fieldDef(entity, key)}
                lookup={names}
              />
              <span className='mx-1 text-muted-foreground'>→</span>
              <Value
                record={proposal as CrmRecord}
                field={fieldDef(entity, key)}
                lookup={names}
              />
            </span>
          </label>
        ))}
      </div>
    );
  };

  const block = (
    entity: 'accounts' | 'contacts',
    id: unknown,
    nameOverride?: unknown,
  ): ReactElement => {
    const proposal = proposalFor(lead, entity);
    if (nameOverride) proposal.name = nameOverride;
    return (
      <div className='space-y-1 rounded-lg border bg-background/70 p-3'>
        <p className='-mx-3 -mt-3 mb-2 rounded-t-lg border-b bg-muted/60 px-3 py-1.5 text-xs font-medium'>
          {text(`entities.${entity}`)} ·{' '}
          {id
            ? text('linkExisting')
            : text('newRecord', { entity: text(`entity.${entity}`) })}
        </p>
        {id ? (
          <>
            <RecordLink
              entity={entity}
              record={{ id: toText(id), name: names[toText(id)] ?? toText(id) }}
            />
            {conflictList(entity, toText(id), proposal)}
          </>
        ) : (
          // The lead's values with the user's overrides on top: what the new
          // record will actually be written with. A new account's name is the
          // request's accountName; a contact's name is an override like any
          // other field.
          <dl className='space-y-0'>
            {inherited[entity].map((key) => {
              const slot = entity === 'accounts' ? 'account' : 'contact';
              const record = { ...proposal, ...object_(input[slot]) };
              if (key === 'name' && entity === 'accounts')
                return (
                  <div key={key}>
                    {row(
                      text('fields.name'),
                      entity,
                      { key: 'name', type: 'text', required: true },
                      { name: input.accountName ?? proposal.name },
                      (value) => onSet('accountName', value),
                    )}
                  </div>
                );
              return (
                <div key={key}>
                  {row(
                    text('fields.' + key),
                    entity,
                    fieldDef(entity, key),
                    record,
                    (value) => onEdit(entity, key, value),
                  )}
                </div>
              );
            })}
          </dl>
        )}
      </div>
    );
  };
  return (
    <div className='space-y-2'>
      {block('accounts', input.accountId, input.accountName)}
      {block('contacts', input.contactId)}
      <div className='space-y-1 rounded-lg border bg-background/70 p-3'>
        <p className='-mx-3 -mt-3 mb-2 rounded-t-lg border-b bg-muted/60 px-3 py-1.5 text-xs font-medium'>
          {text('entities.opportunities')}
        </p>
        <dl className='space-y-0'>
          {row(
            text('fields.createOpportunity'),
            'opportunities',
            { key: 'createOpportunity', type: 'boolean' },
            { createOpportunity: input.createOpportunity === true },
            (value) => onSet('createOpportunity', value === true),
          )}
          {input.createOpportunity === true && (
            <>
              {row(
                text('fields.name'),
                'opportunities',
                { key: 'opportunityName', type: 'text' },
                {
                  opportunityName:
                    input.opportunityName || input.accountName || lead.company,
                },
                (value) => onSet('opportunityName', value),
              )}
              {row(
                text('fields.amount'),
                'opportunities',
                { key: 'amount', type: 'number' },
                {
                  amount: input.amount ?? 0,
                  currency: meta?.settings.currency,
                },
                (value) => onSet('amount', Number(value) || 0),
              )}
            </>
          )}
        </dl>
      </div>
      <p className='text-xs text-muted-foreground'>
        {text('conversionImpactShort')}
      </p>
    </div>
  );
}

// The shape of a lead conversion request, mirrored from convertLead().
const convertFields: Record<string, Field> = {
  accountId: { key: 'accountId', type: 'relation', relation: 'accounts' },
  accountName: { key: 'accountName', type: 'text' },
  contactId: { key: 'contactId', type: 'relation', relation: 'contacts' },
  createOpportunity: { key: 'createOpportunity', type: 'boolean' },
  opportunityName: { key: 'opportunityName', type: 'text' },
  amount: { key: 'amount', type: 'number' },
};

export function ActionCard({
  action,
  continueAfter = false,
}: {
  action: Data;
  // Ask the assistant to carry on with deferred steps once this executes.
  // Only the chat panel sets it: a confirmation there is mid-conversation.
  continueAfter?: boolean;
}): ReactElement {
  const lookup = useLookups();
  const { data: meta } = useMetadata();
  const { text } = useCrmText();
  const api = useCrmApi();
  const refresh = useRefresh();
  const [editing, setEditing] = useState(false);
  // A settled card starts folded to its title line: the history is for
  // scanning, and the details open on demand. A pending card stays open,
  // since it is asking for a decision on exactly those details.
  const [expanded, setExpanded] = useState(false);
  const open = action.status === 'pending' || expanded;
  const { language } = useCrmText();
  // Executed cards show when they ran; the rest show when they were proposed.
  const when = localDate(
    action.executedAt ?? action.createdAt,
    language,
    meta?.settings.timeZone ?? 'Asia/Shanghai',
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>();
  const entity = action.entity as Entity;
  const input = (action.input ?? {}) as Data;
  // What the model originally proposed. Rows from before this was recorded
  // carry their input as the proposal, so nothing there shows as edited.
  const proposed = (action.proposedInput ?? input) as Data;
  const edited = (key: string): boolean =>
    JSON.stringify(input[key] ?? null) !==
    JSON.stringify(proposed[key] ?? null);
  const update = async (data: Data): Promise<void> => {
    await api(`ai/actions/${toText(action.id)}`, 'PUT', data);
    await refresh();
  };
  const execute = async (): Promise<void> => {
    setBusy(true);
    setError(undefined);
    try {
      await api(`ai/actions/${toText(action.id)}/execute`, 'POST', {
        confirmed: true,
        continue: continueAfter,
      });
      await refresh();
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  };
  // The card is the confirmation: every proposed value is visible and editable
  // right here, so a second dialog only repeats it as raw JSON. A delete has
  // no values to show, so its card says instead what confirming removes and
  // that it cannot be undone — the three things a delete confirmation owes.
  // A key the model proposed may not be in the schema at all; fall back to plain
  // text so an unexpected key still renders instead of throwing. A convert
  // action's input is not a lead at all but the conversion request, so its
  // keys get their own definitions: ids resolve to names, the flag to yes/no.
  const fieldFor = (target: Entity, key: string): Field =>
    (action.operation === 'convert' ? convertFields[key] : undefined) ??
    meta?.definitions[target]?.fields.find((f) => f.key === key) ?? {
      key,
      type: 'text',
    };
  // Value and InlineField want a flat id -> name map, while useLookups returns
  // the records grouped by entity.
  const names = lookupTitles(lookup);
  // The original value the way the row shows the current one: an option's
  // label, a relation's name, yes / no — not the stored code.
  const proposedLabel = (key: string): string => {
    const value = proposed[key];
    if (value === undefined || value === null || value === '') return '—';
    const field = fieldFor(entity, key);
    if (field.type === 'boolean') return text(value ? 'yes' : 'no');
    if (field.relation) return names[toText(value)] ?? toText(value);
    if (field.options)
      return text(`options.${toText(value)}`, { defaultValue: toText(value) });
    return toText(value);
  };
  return (
    // A pending card is the one thing on the page asking for a decision, so it
    // carries a tint; once executed or dismissed it drops back to the neutral
    // card surface and stops competing for attention.
    <Card
      className={`@container shadow-none ${toText(
        action.status === 'pending' ? 'border-ai/30 bg-ai/5' : 'bg-card',
      )}`}
    >
      <CardContent className='space-y-3'>
        <div className='flex items-start justify-between gap-3'>
          {action.status === 'pending' ? (
            <div>
              <p className='font-medium'>{toText(action.title)}</p>
              <p className='mt-1 text-xs text-muted-foreground'>
                {text(`entities.${toText(entity)}`)} ·{' '}
                {text(toText(action.operation), {
                  defaultValue: toText(action.operation),
                })}
                {' · '}
                {when}
              </p>
            </div>
          ) : (
            <button
              type='button'
              className='-m-1 flex min-w-0 flex-1 items-start gap-1.5 rounded-md p-1 text-left hover:bg-muted/60'
              aria-expanded={expanded}
              onClick={() => setExpanded((v) => !v)}
            >
              <ChevronRight
                className={`mt-1 size-4 shrink-0 text-muted-foreground transition-transform ${toText(expanded ? 'rotate-90' : '')}`}
              />
              <span className='min-w-0'>
                <span className='block font-medium'>
                  {toText(action.title)}
                </span>
                <span className='mt-1 block text-xs text-muted-foreground'>
                  {text(`entities.${toText(entity)}`)} ·{' '}
                  {text(toText(action.operation), {
                    defaultValue: toText(action.operation),
                  })}
                  {' · '}
                  {when}
                </span>
              </span>
            </button>
          )}
          {/* Plain text rather than a badge: a tinted tag on the tinted
              pending card was hard to read, and the words carry it. */}
          <span
            className={`shrink-0 text-xs font-medium ${toText(
              action.status === 'pending'
                ? 'text-ai'
                : action.status === 'executed'
                  ? 'text-primary'
                  : 'text-muted-foreground',
            )}`}
          >
            {action.status === 'pending'
              ? text('actionPending')
              : text(`options.${toText(action.status)}`, {
                  defaultValue: toText(action.status),
                })}
          </span>
        </div>
        {open && (
          <>
            <ErrorNotice error={error} />
            {Array.isArray(action.assumptions) &&
              action.assumptions.length > 0 && (
                <div className='rounded-lg bg-background/70 p-3 text-xs'>
                  <p className='mb-1 font-medium'>{text('assumptions')}</p>
                  <ul className='list-inside list-disc space-y-1'>
                    {action.assumptions.map((assumption) => (
                      <li key={toText(assumption)}>{toText(assumption)}</li>
                    ))}
                  </ul>
                </div>
              )}
            {/* The proposed values are shown through the same InlineField the detail
            pages use, so a code stored in the payload ("exhibition", "CN", an
            owner id) reads as its label here too, and a wrong guess can be
            corrected in place before confirming rather than through the JSON
            dialog. */}
            {/* Every proposed field is shown, one per row with the label on the
            left: this card is what the user confirms, and a value they cannot
            see is one they cannot have agreed to. */}
            {/* InlineField pads its value by px-2 py-1.5; the label's top padding
            matches so both read on one baseline, and the value's negative
            margin lets its text start at the column edge. */}
            <dl className='space-y-0'>
              {Object.keys(input)
                // A convert action is rendered whole by the conversion summary.
                .filter(() => action.operation !== 'convert')
                .map((key) => (
                  <div key={key} className='flex items-start gap-3'>
                    <dt className='w-20 shrink-0 pt-1.5 text-sm text-muted-foreground'>
                      {text(fieldLabelKey(entity, key), { defaultValue: key })}
                    </dt>
                    <dd className='-mx-2 flex min-w-0 flex-1 items-start text-sm'>
                      <div className='min-w-0 flex-1'>
                        <InlineField
                          entity={entity}
                          record={input as CrmRecord}
                          field={fieldFor(entity, key)}
                          label={text(fieldLabelKey(entity, key), {
                            defaultValue: key,
                          })}
                          lookup={names}
                          editable={action.status === 'pending'}
                          plain
                          onSave={(value) =>
                            update({ input: { ...input, [key]: value } })
                          }
                        />
                      </div>
                      {/* The assumptions above describe the proposal; once the
                      user has edited a field they no longer describe this
                      value, so say so and keep the original within reach. */}
                      {edited(key) && (
                        <span
                          className='mt-2 mr-2 shrink-0 rounded bg-primary/10 px-1 py-px text-[10px] font-medium text-primary'
                          title={`${text('proposedValue')}: ${proposedLabel(key)}`}
                        >
                          {text('edited')}
                        </span>
                      )}
                    </dd>
                  </div>
                ))}
            </dl>
            {action.operation === 'delete' && action.status === 'pending' && (
              <p className='rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm'>
                {text('actionDeleteNotice', {
                  entity: text(`entity.${toText(entity)}`),
                  name: toText(names[toText(action.recordId)] ?? action.title),
                })}
              </p>
            )}
            {action.operation === 'convert' && (
              <ConversionSummary
                input={input}
                lead={lookup.leads.find((r) => r.id === action.recordId)}
                names={names}
                editable={action.status === 'pending'}
                onEdit={(target, key, value) => {
                  const slot = target === 'accounts' ? 'account' : 'contact';
                  return update({
                    input: {
                      ...input,
                      [slot]: { ...object_(input[slot]), [key]: value },
                    },
                  });
                }}
                onSet={(key, value) =>
                  update({ input: { ...input, [key]: value } })
                }
                lookup={lookup}
              />
            )}
          </>
        )}
        {action.status === 'executed' &&
        action.resultId &&
        action.operation !== 'delete' ? (
          <p className='text-sm'>
            <span className='text-muted-foreground'>
              {text(`entities.${toText(entity)}`)}：
            </span>
            <RecordLink
              entity={entity}
              record={{
                id: toText(action.resultId),
                // An update's input carries only the changed fields, so the
                // record's real name comes from the lookup; a freshly created
                // record may not be in it yet, and then the proposed name is.
                // A record not yet in the lookup (just created) falls back
                // to what the card proposed.
                name: toText(
                  names[toText(action.resultId)] ?? input.name ?? action.title,
                ),
              }}
            />
          </p>
        ) : null}
        {action.status === 'pending' && (
          <div className='flex flex-wrap gap-2'>
            {/* The full record form, for fields the model left out; other
                operations edit what they show in place. */}
            {['create', 'update'].includes(toText(action.operation)) && (
              <Button
                variant='outline'
                size='sm'
                disabled={busy}
                onClick={() => setEditing(true)}
              >
                <Pencil />
                {text('edit')}
              </Button>
            )}
            <Button size='sm' disabled={busy} onClick={() => void execute()}>
              <Check />
              {text('execute')}
            </Button>
            <Button
              size='sm'
              variant='ghost'
              disabled={busy}
              onClick={() => {
                void (async () => {
                  setBusy(true);
                  try {
                    await update({ status: 'dismissed' });
                  } catch (e) {
                    setError(e);
                  } finally {
                    setBusy(false);
                  }
                })();
              }}
            >
              <Archive />
              {text('dismiss')}
            </Button>
          </div>
        )}
      </CardContent>
      {editing && ['create', 'update'].includes(toText(action.operation)) ? (
        <RecordForm
          entity={entity}
          id={
            action.operation === 'update' ? toText(action.recordId) : undefined
          }
          initial={{
            ...(lookup[action.entity as Entity]?.find(
              (r) => r.id === action.recordId,
            ) ?? {}),
            ...input,
          }}
          onClose={() => setEditing(false)}
          onSubmit={(values) => update({ input: values })}
        />
      ) : null}
    </Card>
  );
}

// What the assistant did while answering, one line per tool call: the record
// searched or read, and how it went. Ids in the step resolve to names through
// the lookups so "读取客户「华东智造集团」" reads as such.
function Steps({
  steps,
  live = false,
}: {
  steps: Data[];
  live?: boolean;
}): ReactElement {
  const { text } = useCrmText();
  const { data: meta } = useMetadata();
  const lookup = useLookups();
  const names = lookupTitles(lookup);
  const nameOf = (id: unknown): string =>
    names[toText(id)] ??
    meta?.users.find((u) => u.id === id)?.name ??
    toText(id).slice(0, 8);
  const describe = (step: Data): string => {
    const entity = text(`entities.${toText(step.entity)}`, {
      defaultValue: toText(step.entity),
    });
    if (step.kind === 'web') return text('aiSteps.web');
    if (step.kind === 'context')
      return step.entity
        ? text('aiSteps.contextRecord', {
            entity,
            name: toText(step.name ?? ''),
          })
        : text('aiSteps.context');
    if (step.kind === 'model')
      return text(
        Number(step.round) > 1 ? 'aiSteps.modelAgain' : 'aiSteps.model',
      );
    if (step.kind === 'get')
      return text('aiSteps.get', {
        entity,
        name: step.name ? toText(step.name) : nameOf(step.id),
      });
    const filters = [
      step.search ? `“${toText(step.search)}”` : '',
      step.status
        ? text(`options.${toText(step.status)}`, {
            defaultValue: toText(step.status),
          })
        : '',
      ...['accountId', 'leadId', 'opportunityId', 'ownerId']
        .filter((key) => step[key])
        .map((key) => nameOf(step[key])),
    ].filter(Boolean);
    return text('aiSteps.search', {
      entity,
      filters: filters.length ? `（${filters.join('，')}）` : '',
    });
  };
  const outcome = (step: Data): string =>
    step.error
      ? text('aiSteps.failed')
      : step.kind === 'search' && step.total !== undefined
        ? text('aiSteps.found', { count: Number(step.total ?? 0) })
        : '';
  return (
    <ol className='space-y-1 text-xs'>
      {steps.map((step, index) => {
        // Steps are append-only and never reordered, so the position is a
        // stable identity for them.
        const key = `${index}-${toText(step.kind)}`;
        // A model round or a web search ends when something follows it or
        // the reply lands; a tool call ends when its outcome is written.
        const done =
          step.kind === 'web' || step.kind === 'model'
            ? !live || index < steps.length - 1
            : step.kind === 'context'
              ? true
              : step.error !== undefined ||
                step.total !== undefined ||
                step.name !== undefined;
        const Icon =
          step.kind === 'web'
            ? Globe
            : step.kind === 'model'
              ? Sparkles
              : step.kind === 'get' || step.kind === 'context'
                ? FileSearch
                : Search;
        return (
          <li key={key} className='flex items-start gap-2'>
            <span className='mt-0.5 shrink-0'>
              {!done && live ? (
                <Spinner className='size-3.5' />
              ) : step.error ? (
                <CircleAlert className='size-3.5 text-destructive' />
              ) : done ? (
                <CircleCheck className='size-3.5 text-primary' />
              ) : (
                <Icon className='size-3.5' />
              )}
            </span>
            <span className='min-w-0'>
              <Icon className='mr-1 inline size-3 align-[-2px] text-muted-foreground/70' />
              {describe(step)}
              {outcome(step) ? (
                <span className='ml-1 text-muted-foreground/70'>
                  · {outcome(step)}
                </span>
              ) : null}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

// The trail an answered question keeps, folded to one line under it.
function Trail({ steps }: { steps: Data[] }): ReactElement {
  const { text } = useCrmText();
  const [open, setOpen] = useState(false);
  return (
    <div className='mr-3 -mt-1 px-1'>
      <button
        type='button'
        className='inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground'
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <ChevronRight
          className={`size-3 transition-transform ${toText(open ? 'rotate-90' : '')}`}
        />
        {text(open ? 'aiSteps.hide' : 'aiSteps.show', { count: steps.length })}
      </button>
      {open && (
        <div className='mt-1 rounded-lg bg-muted/40 p-2 text-muted-foreground'>
          <Steps steps={steps} />
        </div>
      )}
    </div>
  );
}
