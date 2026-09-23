import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
  type ReactElement,
} from 'react';
import { Sparkles, X } from 'lucide-react';
import {
  AIChatProvider,
  AIChatWindow,
  AIPageContextScope,
  NocoBaseAIRootProvider,
  nocobaseAIService,
  useAI,
  useAIChat,
  useAIChatController,
  useAIChatControllerState,
  type AIChatController,
  type AIEmployee,
  type AIService,
  type AIWorkContextItem,
} from '@/extensions/nocobase-ai';
import { AI_DRAFT_CONVERSATION_ID } from '@/extensions/nocobase-ai/providers/types.js';
import { Button } from '../ui/button.js';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '../ui/sheet.js';
import { toText, useCrmText, useMetadata, type Data } from './api.js';
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
// A shortcut used while the panel is closed opens it with the task queued
// for the chat that mounts; that task starts a conversation of its own, so
// the remembered conversation is not restored on that mount (restoring it
// would change the active conversation under the queued task and drop it).
let shortcutOpensPanel = false;

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
  // A new service identity makes the root provider list employees again,
  // so this changes with the language and nothing else.
  const service = useMemo(
    () =>
      localizedService(nocobaseAIService, {
        nickname,
        position,
        bio,
        greeting,
      }),
    [nickname, position, bio, greeting],
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

function CrmAssistantPanel(): ReactElement | null {
  const { text } = useCrmText();
  const { data: meta } = useMetadata();
  const controller = useAIChatController();
  const { open } = useAIChatControllerState(controller);
  const [record, setRecord] = useState<RecordContext>();
  // The panel starts open on a screen wide enough to hold it beside the
  // page: the assistant is the CRM's front door, not a hidden extra. Once
  // the user opens or closes it, that choice survives a reload of the tab.
  useEffect(() => {
    let initial = window.matchMedia('(min-width: 768px)').matches;
    try {
      const stored = sessionStorage.getItem(openKey);
      if (stored !== null) initial = stored === '1';
    } catch {
      /* Storage may be unavailable; fall through to the default. */
    }
    controller.setOpen(initial);
  }, [controller]);
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
      const prompt = toText(data.prompt ?? '');
      const target = recordContextOf(data);
      if (!prompt) {
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
            ...(target ? { workContext: [recordItem(target)] } : {}),
          },
          autoSend: data.send === true,
          ...(data.webSearch === true ? { webSearch: true } : {}),
        },
        auto: true,
        open: true,
        // Continue the conversation already open rather than starting one
        // per shortcut; a new conversation is one click away.
        reuseConversation: true,
      });
    };
    const change = (event: Event): void =>
      setRecord(recordContextOf((event as CustomEvent<Data>).detail ?? {}));
    window.addEventListener('crm-assistant', show);
    window.addEventListener('crm-context', change);
    return () => {
      window.removeEventListener('crm-assistant', show);
      window.removeEventListener('crm-context', change);
    };
  }, [controller]);
  if (!meta?.assistant) return null;
  return (
    // Clicking a nav link counts as an outside press, which would close the panel on every page switch.
    <Sheet
      modal={false}
      disablePointerDismissal
      open={open}
      onOpenChange={(value) => controller.setOpen(value)}
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
            onClick={() => controller.close()}
          >
            <X />
          </Button>
        </SheetHeader>
        <div className='flex min-h-0 flex-1 flex-col'>
          <ConfiguredChat controller={controller} record={record} />
        </div>
      </SheetContent>
    </Sheet>
  );
}

// The chat mounts only once the plugin has found an employee and a usable
// model; a composer mounted earlier would send with an empty configuration.
function ConfiguredChat({
  controller,
  record,
}: {
  controller: AIChatController;
  record: RecordContext | undefined;
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
    <p
      role={alert ? 'alert' : 'status'}
      className='m-4 rounded-xl bg-muted p-4 text-sm text-muted-foreground'
    >
      {message}
    </p>
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
        />
      </AIChatProvider>
    </AIPageContextScope>
  );
}

// Keeps the record on screen attached to the current draft, so a question
// typed on a detail page is about that record without a shortcut; the chip
// in the composer shows it and lets the user drop it.
function RecordContext({
  record,
}: {
  record: RecordContext | undefined;
}): null {
  const { workContext, addWorkContext, removeWorkContext } = useAIChat();
  // Each change to the list runs this again, and the second pass finds
  // nothing to do; the loop settles in one round trip.
  useEffect(() => {
    const current = record ? recordItem(record) : undefined;
    const stale = workContext.find(
      (item) =>
        item.type === 'crm-record' &&
        (!current || item.id !== current.id || item.title !== current.title),
    );
    if (stale) {
      removeWorkContext(stale);
      return;
    }
    if (current && !workContext.some((item) => item.id === current.id))
      addWorkContext(current);
  }, [record, workContext, addWorkContext, removeWorkContext]);
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
