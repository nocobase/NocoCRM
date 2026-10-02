import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type PropsWithChildren,
  type ReactElement,
  type ReactNode,
} from 'react';
import { useApiClient } from '@nocobase/app-client';
import {
  Flag,
  Maximize2,
  Menu,
  PanelLeftClose,
  PanelRight,
  PlusCircle,
  Sparkles,
  X,
} from 'lucide-react';
import {
  AIChatProvider,
  AIChatWindow,
  AIPageContextScope,
  ChatSurface,
  NocoBaseAIRootProvider,
  NocoBaseAIService,
  useAI,
  getAIEmployeeAvatar,
  useAIChat,
  useAIChatBase,
  useAIChatMessages,
  useAIChatController,
  useAIChatControllerState,
  type AIChatController,
  type AIEmployee,
  type AIService,
  type AIWorkContextItem,
} from '@/extensions/nocobase-ai';
import { AI_DRAFT_CONVERSATION_ID } from '@/extensions/nocobase-ai/providers/types.js';
import { UserPromptEditor } from '@/extensions/nocobase-ai/components/chat/user-prompt-editor.js';
import { Button } from '../ui/button.js';
import { cn } from '@/lib/utils';
import { sentence, toText, useCrmText, useMetadata, type Data } from './api.js';
import { crmToolRenderers } from './ai-tool-renderers.js';

// The CRM assistant: the AI Employee plugin's chat, mounted in the side
// panel the header's sparkle opens, talking to the CRM employee defined in
// server/ai, which reads the CRM and proposes writes the user confirms on
// cards in the conversation. The page shortcuts ("Help me prepare", ...)
// still dispatch `crm-assistant` events with a prompt; detail pages report
// the record on screen through `crm-context`, and that record travels with
// the conversation as work context the employee reads with get_record.

const CRM_ASSISTANT = 'crm-assistant';
const openKey = 'crm-assistant-open';
// The panel opened to start afresh: by a shortcut used while it was closed,
// whose task is queued for the chat that mounts and starts a conversation of
// its own (restoring the remembered one would change the active
// conversation under the queued task and drop it), or by the header's
// button, which opens a new conversation about the page's record. Either
// way the remembered conversation is not restored on that mount; it is still
// in the conversation list. Only a reload brings it back.
let shortcutOpensPanel = false;

// Whether the panel is open, for the header's button, which is not the
// panel's: the chat controller belongs to the panel alone (the plugin's
// useAIChatController makes one per component), so the panel publishes its
// state here and the button asks it to open or close through an event.
const panelListeners = new Set<() => void>();
let panelOpen = false;
function publishPanelOpen(open: boolean): void {
  if (panelOpen === open) return;
  panelOpen = open;
  for (const listener of panelListeners) listener();
}
function subscribePanel(listener: () => void): () => void {
  panelListeners.add(listener);
  return () => panelListeners.delete(listener);
}

interface RecordContext {
  entity: string;
  recordId: string;
  // The record's title as its page shows it, once the page has loaded it.
  name?: string;
}

function recordItem(context: RecordContext): AIWorkContextItem {
  return {
    type: 'crm-record',
    id: `${context.entity}/${context.recordId}`,
    title: context.name ?? `${context.entity} ${context.recordId}`,
    content: {
      note: 'The user is viewing this CRM record. Read it with get_record before answering about it.',
      entity: context.entity,
      recordId: context.recordId,
    },
  };
}

// A work context item a shortcut brings along, as given: the plugin passes
// its content to the model as page context.
function extraContextOf(value: unknown): AIWorkContextItem | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const item = value as Data;
  const type = toText(item.type ?? '');
  const id = toText(item.id ?? '');
  return type && id && item.content
    ? {
        type,
        id,
        title: toText(item.title ?? type),
        content: item.content,
      }
    : undefined;
}

function recordContextOf(data: Data): RecordContext | undefined {
  const entity = toText(data.entity ?? '');
  const recordId = toText(data.recordId ?? '');
  const name = toText(data.name ?? '');
  return entity && recordId
    ? { entity, recordId, ...(name ? { name } : {}) }
    : undefined;
}

// The employee's name, role, bio and greeting in the interface language.
// The plugin keeps a code-registered employee's texts in one language (its
// settings page shows the English definition); the CRM's own panel shows
// them translated by wrapping the service that lists employees.
function localizedService(
  base: AIService,
  texts: Pick<AIEmployee, 'nickname' | 'position' | 'bio' | 'greeting'>,
): AIService {
  const listEmployees = async (): Promise<AIEmployee[]> =>
    (await base.listEmployees()).map((employee) =>
      employee.username === CRM_ASSISTANT
        ? { ...employee, ...texts }
        : employee,
    );
  return new Proxy(base, {
    get(target, property, receiver) {
      if (property === 'listEmployees') return listEmployees;
      const value = Reflect.get(target, property, receiver) as unknown;
      return typeof value === 'function'
        ? (value as (...args: unknown[]) => unknown).bind(target)
        : value;
    },
  });
}

export function CrmAssistantProvider({
  children,
}: PropsWithChildren): ReactElement {
  const { text } = useCrmText();
  const nickname = toText(text('assistantEmployeeName'));
  const position = toText(text('assistantEmployeeRole'));
  const bio = toText(text('assistantEmployeeBio'));
  const greeting = toText(text('assistantEmployeeGreeting'));
  // The plugin's service over the application's API client, as the root
  // provider builds it when given none. A new service identity makes the
  // root provider list employees again, so this changes with the language
  // (and the client) and nothing else.
  const api = useApiClient();
  const service = useMemo(
    () =>
      localizedService(new NocoBaseAIService(api), {
        nickname,
        position,
        bio,
        greeting,
      }),
    [api, nickname, position, bio, greeting],
  );
  return (
    // The registry's root provider discovers employees and models once for
    // the whole application; the panel below mounts the chat when both are
    // usable. A page context that fails to resolve is left out rather than
    // blocking the send: the employee can still read the record itself. The
    // CRM's write tools render as confirmation cards (ai-tool-cards).
    <NocoBaseAIRootProvider
      service={service}
      contextFailurePolicy='omit'
      toolRenderers={crmToolRenderers}
    >
      {children}
      <CrmAssistantPanel />
    </NocoBaseAIRootProvider>
  );
}

// The assistant's one entry, in the header just left of the account menu on
// every surface: it opens the panel on a new conversation, whose starting
// point is the record on screen (attached to the draft as a detail page
// announces it, see RecordContext), and closes it again; marked while the
// panel is open. Earlier conversations stay in the list. A title rather than
// a tooltip, whose popup lingered when the panel closed under the pointer.
export function AssistantButton({
  className,
}: {
  className: string;
}): ReactElement | null {
  const { text } = useCrmText();
  const { data: meta } = useMetadata();
  const open = useSyncExternalStore(
    subscribePanel,
    () => panelOpen,
    () => false,
  );
  if (!meta?.assistant) return null;
  const label = toText(text(open ? 'assistantClose' : 'assistant'));
  return (
    <button
      type='button'
      aria-label={label}
      aria-pressed={open}
      title={label}
      // In the AI's colour, as every AI entry is; deeper while the panel is
      // open. Merged over the header's shared look, whose ground it replaces.
      className={cn(
        className,
        'border-ai bg-ai text-ai-foreground hover:bg-ai/90',
        open && 'bg-ai/80 shadow-inner',
      )}
      onClick={() =>
        window.dispatchEvent(new CustomEvent('crm-assistant-toggle'))
      }
    >
      <Sparkles className='size-5' />
    </button>
  );
}

function CrmAssistantPanel(): ReactElement | null {
  const { text } = useCrmText();
  const { data: meta } = useMetadata();
  const controller = useAIChatController();
  const { open } = useAIChatControllerState(controller);
  const [record, setRecord] = useState<RecordContext>();
  // The panel expands into a centred dialog for a longer conversation; the
  // same chat window stays mounted, so nothing is lost either way.
  const [expanded, setExpanded] = useState(false);
  const setPanelOpen = (next: boolean): void => {
    if (!next) setExpanded(false);
    controller.setOpen(next);
  };
  // However it was closed (here, or by the header's button), it opens
  // again as the side panel: adjusted as it renders closed.
  const [wasOpen, setWasOpen] = useState(open);
  if (wasOpen !== open) {
    setWasOpen(open);
    if (!open) setExpanded(false);
  }
  // The panel starts open on a screen wide enough to hold it beside the
  // page (1280px, where styles.css pushes the page aside by the panel's
  // width): the assistant is the CRM's front door, not a hidden extra.
  // Narrower screens start with it closed, since it would cover the page.
  // Once the user opens or closes it, that choice survives a reload.
  useEffect(() => {
    let initial = window.matchMedia('(min-width: 1280px)').matches;
    try {
      const stored = sessionStorage.getItem(openKey);
      if (stored !== null) initial = stored === '1';
    } catch {
      /* Storage may be unavailable; fall through to the default. */
    }
    controller.setOpen(initial);
  }, [controller]);
  useEffect(() => {
    // The page makes room only for the side panel; the expanded dialog lies
    // over it.
    document.body.classList.toggle('crm-assistant-open', open && !expanded);
    publishPanelOpen(open);
    try {
      sessionStorage.setItem(openKey, open ? '1' : '0');
    } catch {
      // Storage may be unavailable; the panel then simply starts closed.
    }
    return () => document.body.classList.remove('crm-assistant-open');
  }, [open, expanded]);
  useEffect(() => {
    const show = (event: Event): void => {
      const data = (event as CustomEvent<Data>).detail ?? {};
      const prompt = toText(data.prompt ?? '');
      const target = recordContextOf(data);
      // What the shortcut adds beyond the record: the lead's AI evaluation
      // for "Ask about it", passed to the model whole.
      const extra = extraContextOf(data.context);
      const workContext = [
        ...(target ? [recordItem(target)] : []),
        ...(extra ? [extra] : []),
      ];
      // No prompt and nothing to attach: just open the panel. A shortcut
      // bringing context of its own ("Ask about it") starts its
      // conversation with that context and an empty composer.
      if (!prompt && !extra) {
        controller.open();
        return;
      }
      // A shortcut with send:true is a complete instruction the chat sends
      // on its own; the others land in the composer for the user to finish.
      // The chat provider that runs tasks mounts only while the panel is
      // open, so open it first: the controller queues the task until the
      // provider binds, and a closed panel would otherwise swallow it.
      if (!controller.getSnapshot().open) shortcutOpensPanel = true;
      controller.open();
      controller.triggerTask({
        aiEmployee: CRM_ASSISTANT,
        task: {
          message: {
            user: prompt,
            ...(workContext.length ? { workContext } : {}),
          },
          autoSend: data.send === true,
          ...(data.webSearch === true ? { webSearch: true } : {}),
        },
        auto: true,
        open: true,
        // Continue the conversation already open rather than starting one
        // per shortcut; a new conversation is one click away. A shortcut
        // about one thing of its own (an evaluation) asks for a fresh one,
        // so it does not land in an unrelated thread.
        reuseConversation: data.newConversation !== true,
      });
    };
    const change = (event: Event): void =>
      setRecord(recordContextOf((event as CustomEvent<Data>).detail ?? {}));
    // The header's button: closes the panel, or opens it on a new
    // conversation about the record on screen.
    const toggle = (): void => {
      if (controller.getSnapshot().open) {
        controller.setOpen(false);
        return;
      }
      shortcutOpensPanel = true;
      controller.open();
    };
    window.addEventListener('crm-assistant', show);
    window.addEventListener('crm-context', change);
    window.addEventListener('crm-assistant-toggle', toggle);
    return () => {
      window.removeEventListener('crm-assistant', show);
      window.removeEventListener('crm-context', change);
      window.removeEventListener('crm-assistant-toggle', toggle);
    };
  }, [controller]);
  // Expand and close, as the plugin's ChatSurfaceActions offers them but
  // without its tooltips, in the chat window's toolbar row as the plugin's
  // floating demo places them. In the top-right corner they sat exactly
  // where the account avatar lands once the page widens again, so closing
  // left the pointer on it and its hover menu opened.
  const actions = (
    <>
      <Button
        variant='ghost'
        size='icon-sm'
        aria-label={text(expanded ? 'assistantCollapse' : 'assistantExpand')}
        title={text(expanded ? 'assistantCollapse' : 'assistantExpand')}
        onClick={() => setExpanded(!expanded)}
      >
        {expanded ? <PanelRight /> : <Maximize2 />}
      </Button>
      <Button
        variant='ghost'
        size='icon-sm'
        aria-label={text('assistantClose')}
        title={text('assistantClose')}
        onClick={() => setPanelOpen(false)}
      >
        <X />
      </Button>
    </>
  );
  if (!meta?.assistant) return null;
  return (
    <>
      {/* The plugin's surface: a side panel that stays open across pages and
          lets the page be used beside it (non-modal, no outside dismissal),
          or, expanded, a dialog. The panel is the width styles.css pushes the
          page aside by. Escape closes only the dialog: in the panel it would
          also fire while cancelling an edit on the page. */}
      <ChatSurface
        open={open}
        variant={expanded ? 'dialog' : 'side-panel'}
        onOpenChange={setPanelOpen}
        width='28rem'
        closeOnEscape={expanded}
      >
        {/* No title of the panel's own: the chat's header says who the
            user talks to (NocoHeader). */}
        <div className='flex h-full min-h-0 flex-col'>
          <div className='flex min-h-0 flex-1 flex-col'>
            <ConfiguredChat
              controller={controller}
              record={record}
              actions={actions}
            />
          </div>
        </div>
      </ChatSurface>
    </>
  );
}

// The chat mounts only once the plugin has found an employee and a usable
// model; a composer mounted earlier would send with an empty configuration.
function ConfiguredChat({
  controller,
  record,
  actions,
}: {
  controller: AIChatController;
  record: RecordContext | undefined;
  // The panel's expand and close buttons, in the chat's toolbar; above a
  // notice while the chat cannot start.
  actions: ReactNode;
}): ReactElement {
  const { text } = useCrmText();
  const {
    configurationStatus,
    configurationError,
    modelConfigurationError,
    employees,
    hasEnabledModels,
  } = useAI();
  const notice = (message: string, alert = true): ReactElement => (
    <>
      <div className='flex justify-end gap-1 border-b px-3 py-2'>{actions}</div>
      <p
        role={alert ? 'alert' : 'status'}
        className='m-4 rounded-xl bg-muted p-4 text-sm text-muted-foreground'
      >
        {message}
      </p>
    </>
  );
  if (configurationStatus === 'loading')
    return notice(toText(text('assistantLoading')), false);
  if (configurationStatus === 'error')
    return notice(
      configurationError?.message ?? toText(text('assistantConfigError')),
    );
  if (!employees.some((employee) => employee.username === CRM_ASSISTANT))
    return notice(toText(text('assistantNoEmployee')));
  if (modelConfigurationError || !hasEnabledModels)
    return notice(
      modelConfigurationError?.message ?? toText(text('assistantNoModel')),
    );
  return (
    <AIPageContextScope context={record ? [recordItem(record)] : []}>
      <AIChatProvider
        id='crm-assistant'
        controller={controller}
        defaultEmployee={CRM_ASSISTANT}
      >
        <RecordContext record={record} />
        <RememberConversation />
        <AIChatWindow
          className='h-full'
          showEmployeeSelector={false}
          disclaimer={false}
          placeholder={toText(text('askHint'))}
          header={<NocoHeader actions={actions} />}
          // Files picked, dropped or pasted go to the plugin's storage and
          // reach the model with the message: documents (PDF, Word, Excel,
          // PowerPoint, text, CSV, JSON) as extracted text; images only for
          // a model that reads them (DeepSeek does not).
          enableAttachments
        />
      </AIChatProvider>
    </AIPageContextScope>
  );
}

// The chat's header, drawn by the CRM in place of the plugin's: whom the
// user talks to (the employee's avatar, name and role, in the interface
// language), with the conversation list's toggle before it and a new
// conversation, the user's own instructions, expand and close after it.
// Below, once a conversation is under way, what it started from: the
// context its first message carried (the lead and its evaluation
// for "Ask about it", the record a question was typed on), fixed for the
// conversation whatever the page shows later; the composer's chip is the
// page's record for the next message.
function NocoHeader({ actions }: { actions: ReactNode }): ReactElement {
  const { text, language } = useCrmText();
  const {
    currentEmployee,
    conversations,
    conversationListOpen,
    setConversationListOpen,
    startNewConversation,
  } = useAIChatBase();
  const { messages } = useAIChatMessages();
  const unread = conversations.filter(
    (conversation) => conversation.unread,
  ).length;
  const first = messages.find((message) => message.role === 'user');
  // Each item as its title, a record's led by its type ("线索 张伟一").
  const startItems = (first?.metadata?.workContext ?? []).map((item) => {
    const entity =
      item.type === 'crm-record'
        ? toText((item.content as Data | undefined)?.entity ?? '')
        : '';
    return {
      key: item.id,
      kind: entity ? sentence(text(`entity.${entity}`)) : '',
      title: toText(item.title),
    };
  });
  const start = startItems
    .map((item) => [item.kind, item.title].filter(Boolean).join(' '))
    .join(' · ');
  const avatar = getAIEmployeeAvatar(currentEmployee?.avatar);
  const listLabel = toText(
    text(
      conversationListOpen
        ? 'assistantHideConversations'
        : 'assistantConversations',
    ),
  );
  const newLabel = toText(text('assistantNewConversation'));
  return (
    <div className='shrink-0 border-b bg-card'>
      <header className='flex h-14 items-center gap-2 px-2.5'>
        <Button
          variant='ghost'
          size='icon-sm'
          aria-label={listLabel}
          title={listLabel}
          onClick={() => setConversationListOpen(!conversationListOpen)}
        >
          <span className='relative'>
            {conversationListOpen ? <PanelLeftClose /> : <Menu />}
            {!conversationListOpen && unread > 0 ? (
              <span className='absolute -top-1 -right-1 size-2 rounded-full bg-destructive ring-2 ring-card' />
            ) : null}
          </span>
        </Button>
        {avatar ? (
          <img
            src={avatar}
            alt=''
            className='size-8 shrink-0 rounded-full border bg-background'
          />
        ) : null}
        <div className='min-w-0 flex-1 leading-tight'>
          <p className='truncate text-sm font-medium'>
            {currentEmployee?.nickname}
          </p>
          <p className='truncate text-xs text-muted-foreground'>
            {currentEmployee?.position}
          </p>
        </div>
        <div className='flex shrink-0 items-center gap-0.5'>
          <UserPromptEditor />
          <Button
            variant='ghost'
            size='icon-sm'
            aria-label={newLabel}
            title={newLabel}
            onClick={startNewConversation}
          >
            <PlusCircle />
          </Button>
          {actions}
        </div>
      </header>
      {/* What the conversation started from, once it is under way; its
          title is the conversation list's. */}
      {startItems.length ? (
        <p
          className='flex items-center gap-1.5 border-t bg-muted px-4 py-1.5 text-xs text-muted-foreground'
          title={start}
        >
          <Flag aria-hidden className='size-3.5 shrink-0' />
          <span className='min-w-0 truncate'>
            {text('assistantStart')}
            {language.startsWith('zh') ? '：' : ': '}
            {startItems.map((item, index) => (
              <span key={item.key}>
                {index > 0 ? ' · ' : ''}
                {item.kind ? `${item.kind} ` : ''}
                <span className='text-foreground'>{item.title}</span>
              </span>
            ))}
          </span>
        </p>
      ) : null}
    </div>
  );
}

// Keeps the record on screen attached to the current draft, so a question
// typed on a detail page is about that record without a shortcut; the chip
// in the composer shows it and lets the user drop it. Not the record the
// conversation started from, which it already carries.
function RecordContext({
  record,
}: {
  record: RecordContext | undefined;
}): null {
  const { workContext, addWorkContext, removeWorkContext } = useAIChat();
  const { messages } = useAIChatMessages();
  // The records the conversation started from, which the model already has
  // with its first message: the page's record is not attached again when it
  // is one of them, so the composer shows only what adds to the start.
  const startIds = (
    messages.find((message) => message.role === 'user')?.metadata
      ?.workContext ?? []
  )
    .map((item) => item.id)
    .join('\n');
  // The item this keeps in step with the page, and only that one: a record a
  // shortcut attached stays when the page shows none (the lead of an
  // evaluation asked about from "Waiting on me").
  const addedRef = useRef<AIWorkContextItem | undefined>(undefined);
  // Each change to the list runs this again, and the second pass finds
  // nothing to do; the loop settles in one round trip.
  useEffect(() => {
    const onScreen = record ? recordItem(record) : undefined;
    const current =
      onScreen && !startIds.split('\n').includes(onScreen.id ?? '')
        ? onScreen
        : undefined;
    const mine = addedRef.current;
    if (
      mine &&
      (!current || mine.id !== current.id || mine.title !== current.title)
    ) {
      addedRef.current = undefined;
      const stale = workContext.find((item) => item.id === mine.id);
      if (stale) {
        removeWorkContext(stale);
        return;
      }
    }
    if (current && !workContext.some((item) => item.id === current.id)) {
      addedRef.current = current;
      addWorkContext(current);
    }
  }, [record, startIds, workContext, addWorkContext, removeWorkContext]);
  return null;
}

// Reopens the conversation the user had open before the page was reloaded
// or left: the plugin starts every mount on a fresh draft, so the last
// real conversation's id is kept in this browser and selected once the
// catalog has loaded it. Starting a new conversation forgets it, so a
// reload after that starts fresh as the user asked.
const conversationKey = 'crm-assistant-conversation';

function RememberConversation(): null {
  const {
    activeConversationId,
    conversations,
    conversationsLoading,
    selectConversation,
  } = useAIChat();
  // Once per mount: a ref, since nothing renders from it.
  const restoredRef = useRef(false);
  useEffect(() => {
    try {
      if (activeConversationId !== AI_DRAFT_CONVERSATION_ID)
        localStorage.setItem(conversationKey, activeConversationId);
      // The mount starts on the draft before the restore below has run;
      // only a draft chosen after that (a new conversation) forgets.
      else if (restoredRef.current) localStorage.removeItem(conversationKey);
    } catch {
      // Storage may be unavailable; the conversation is then not remembered.
    }
  }, [activeConversationId]);
  // The catalog loads once the configuration is ready, so wait for a load
  // to have run (or for a catalog that is already there) before choosing.
  const loadedRef = useRef(false);
  useEffect(() => {
    if (restoredRef.current) return;
    if (conversationsLoading) {
      loadedRef.current = true;
      return;
    }
    if (!loadedRef.current && !conversations.length) return;
    restoredRef.current = true;
    if (shortcutOpensPanel) {
      shortcutOpensPanel = false;
      return;
    }
    if (activeConversationId !== AI_DRAFT_CONVERSATION_ID) return;
    let remembered: string | null = null;
    try {
      remembered = localStorage.getItem(conversationKey);
    } catch {
      return;
    }
    // Only a conversation of this user's, as the catalog lists them; a
    // stale id from another account or a deleted conversation is dropped.
    if (remembered && conversations.some((item) => item.id === remembered))
      selectConversation(remembered);
  }, [
    activeConversationId,
    conversations,
    conversationsLoading,
    selectConversation,
  ]);
  return null;
}
