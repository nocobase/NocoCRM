import { Button } from '#components/ui/button';
import { Skeleton } from '#components/ui/skeleton';
import { Spinner } from '#components/ui/spinner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '#components/ui/dropdown-menu';
import {
  AgentAvatar,
  appUIMessageText,
  chatIsRunning,
  timelineOrder,
  useAgentText,
  useChatApi,
  useChatStream,
  useConversation,
  useConversationActions,
  useConversationMessages,
  useSendMessage,
  type AppUIMessage,
  type NewsNotice,
  type StepLine,
} from '@nocobase/app-plugin-agents/client/chat';
import type {
  ChatAgent,
  ChatAvailability,
  ConversationDetail,
} from '@nocobase/app-plugin-agents/shared/conversations';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Archive,
  ArchiveRestore,
  ArrowDown,
  Check,
  Copy,
  Ellipsis,
  Info,
} from 'lucide-react';
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
} from 'react';
import { Link } from 'react-router';
import {
  errorCode,
  localDate,
  toText,
  useCrmText,
  useMetadata,
} from '../api.js';
import { AutoLoadMore } from '../auto-load.js';
import { ErrorNotice } from '../common.js';
import { Markdown } from '../markdown.js';
import { PlanCard } from '../plan-card.js';
import { SuggestionCard } from './suggestion-card.js';
import { usePlans } from '../plans.js';
import {
  ASSISTANT_AGENT_ID,
  CRM_SOURCE,
  modelKey,
  useAgentModels,
  useAgentReadiness,
  useAssistantDescription,
  useAssistantName,
  useChatModelChoices,
  useCrmSubmit,
} from './ask.js';
import { Composer } from './composer.js';
import { isNews } from './news.js';
import { StartingPoint } from './starting-point.js';
import { liveStep, stepWords } from './step-text.js';
import { DEFAULT_TIME_ZONE } from '../../../../server/providers/crm/zone-time.js';

// One conversation with the assistant, or a new one (`conversationId`
// null): its messages, the notices of what happened meanwhile, the plans it
// proposed in it, placed by time, the line of what it is doing, and the
// composer. The data are the Agents plugin's headless chat: SDK UI messages
// whose ordered parts are the reply's text, its tool calls (the `crm` tool's
// command lines, which only the live line words) and notices. A message the
// CRM sent it as news (news.ts) is not shown; the notice beside it is.

export function Conversation({
  conversationId,
  agents,
  onCreated,
  onArchived,
  onRestored,
  onBack,
  inPanel = false,
}: {
  conversationId: string | null;
  agents: readonly ChatAgent[];
  onCreated: (conversation: ConversationDetail) => void;
  onArchived: () => void;
  onRestored: () => void;
  // Back to the conversations from one that is gone: in the panel its own
  // list; left out, the full page's.
  onBack?: () => void;
  // In the assistant's panel, whose own header names the conversation and
  // holds its actions: no header of its own for one under way, nor for a
  // new one.
  inPanel?: boolean;
}): ReactElement {
  const { text } = useCrmText();
  const agentText = useAgentText();
  const assistantName = useAssistantName();
  const assistantDescription = useAssistantDescription();
  const detail = useConversation(conversationId);
  // The assistant itself unavailable (no model set up, an external demo's
  // case) says so in every conversation, as the ask boxes do: a
  // conversation's own availability does not tell.
  const readiness = useAgentReadiness();
  const conversation = detail.data;
  const messages = useConversationMessages(conversationId);
  const stream = useChatStream(conversationId);
  const actions = useConversationActions();
  // The assistant a new conversation goes to.
  const agent = conversationId ? null : (agents[0] ?? null);
  // A new conversation answers with the model picked for it.
  const models = useAgentModels(agent);
  const sendInConversation = useSendMessage({
    conversationId,
    agentId: ASSISTANT_AGENT_ID,
    source: CRM_SOURCE,
    dispatch: messages.dispatch,
    onCreated,
  });
  const submit = useCrmSubmit();
  // A new conversation's first question, shown while the conversation is
  // created; it then opens (onCreated), the question in it.
  const [starting, setStarting] = useState<{
    content: string;
    failed: boolean;
  } | null>(null);
  const plans = usePlans(
    conversationId ? { conversationId } : {},
    Boolean(conversationId),
  );
  // A new conversation has none: the disabled query would still answer
  // with whatever the cache holds under the unfiltered key.
  const shownPlans = conversationId ? (plans.data ?? []) : [];
  // The assistant's messages may follow a plan it proposed: look again as
  // they arrive.
  const refetchPlans = plans.refetch;
  useEffect(() => {
    if (conversationId && messages.lastSeq) void refetchPlans();
  }, [conversationId, messages.lastSeq, refetchPlans]);
  // Opening a conversation reads it.
  const markRead = actions.markRead;
  useEffect(() => {
    if (conversationId && conversation && !conversation.read)
      markRead(conversationId);
  }, [conversationId, conversation, markRead]);

  const running =
    chatIsRunning(conversation ?? null) ||
    stream?.status === 'submitted' ||
    stream?.status === 'streaming';

  // The view stays at the latest message as new ones arrive, unless the
  // reader scrolled up, who is offered the way back.
  const scrollRef = useRef<HTMLDivElement>(null);
  const [atBottom, setAtBottom] = useState(true);
  const last = messages.items.at(-1);
  const growth = `${String(messages.items.length)}:${String(
    messages.pending.length,
  )}:${last ? appUIMessageText(last).length : 0}:${String(
    last?.parts.length ?? 0,
  )}`;
  const planCount = shownPlans.length;
  useLayoutEffect(() => {
    const box = scrollRef.current;
    if (box && atBottom) box.scrollTop = box.scrollHeight;
  }, [growth, planCount, atBottom, running, starting]);
  // What grows after it is drawn (a plan's card, a table, a reply being
  // written) keeps the view at the latest while the reader is there.
  const contentRef = useRef<HTMLDivElement>(null);
  const atBottomRef = useRef(atBottom);
  useEffect(() => {
    atBottomRef.current = atBottom;
  }, [atBottom]);
  useEffect(() => {
    const box = scrollRef.current;
    const content = contentRef.current;
    if (!box || !content || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(() => {
      if (atBottomRef.current) box.scrollTop = box.scrollHeight;
    });
    observer.observe(content);
    return () => observer.disconnect();
  }, [detail.isLoading, messages.loaded]);
  const toLatest = (): void => {
    const box = scrollRef.current;
    if (box) box.scrollTo({ top: box.scrollHeight, behavior: 'smooth' });
  };

  if (conversationId && detail.error) {
    const missing = errorCode(detail.error).code === 'notFound';
    return (
      <div className='flex flex-col items-start gap-3 p-6'>
        {missing ? (
          <p className='text-sm text-muted-foreground'>
            {text('agentChat.notFound')}
          </p>
        ) : (
          <>
            <ErrorNotice error={detail.error} />
            <Button
              variant='outline'
              size='sm'
              onClick={() => void detail.refetch()}
            >
              {text('agentChat.retry')}
            </Button>
          </>
        )}
        <Button
          variant='ghost'
          size='sm'
          {...(onBack
            ? { onClick: onBack }
            : {
                render: <Link to='/agent-chat' />,
                nativeButton: false,
              })}
        >
          {text('agentChat.backToList')}
        </Button>
      </div>
    );
  }

  const newsText = (notice: NewsNotice): string | null =>
    notice.type === 'planDecided'
      ? toText(
          text(`plans.news.${toText(notice.params?.decision)}`, {
            title: notice.title,
          }),
        )
      : notice.type === 'aiWork'
        ? toText(
            text(`aiWork.news.${toText(notice.params?.outcome)}`, {
              title: notice.title,
              agent: text(
                `agentWork.names.${
                  notice.params?.entity === 'companies'
                    ? 'signals'
                    : toText(notice.params?.entity)
                }`,
              ),
            }),
          )
        : null;
  // How a notice reads: the CRM's news in its words, an answer that did not
  // finish as such, anything else by its title.
  const noticeLine = (notice: NewsNotice): string | null => {
    const news = newsText(notice);
    if (news) return news;
    if (notice.type === 'completed') return null;
    if (['failed', 'cancelled', 'interrupted'].includes(notice.type))
      return toText(text(`agentChat.outcome.${notice.type}`));
    return notice.title || null;
  };
  const listed = agents[0];
  const name = listed
    ? (agentText.name(listed) ?? assistantName)
    : assistantName;
  // What the assistant does, under the title, as its own list describes it.
  const description = listed
    ? agentText.description(listed)
    : assistantDescription;
  const availability: ChatAvailability | null =
    conversation?.availability ?? agent?.availability ?? null;
  const offline =
    availability && !availability.online && availability.reason
      ? toText(text(`agentChat.offline.${availability.reason}`))
      : // The readiness above, when the assistant itself is unavailable.
        readiness.state === 'unavailable'
        ? readiness.reason
        : null;
  const archived = Boolean(conversation?.archivedAt);
  const loading = conversationId ? detail.isLoading : false;

  // A suggestion's card once, under the first notice naming it.
  const firstCards = new Set<string>();
  const seenEntries = new Set<string>();
  for (const message of messages.items) {
    const card = suggestionOf(message);
    if (!card || seenEntries.has(card.entryId)) continue;
    seenEntries.add(card.entryId);
    firstCards.add(message.id);
  }
  const shown = messages.items.filter((message) => !isNews(message));
  const timeline = timelineOrder([
    ...shown.map((message) => ({
      key: message.id,
      at: message.metadata?.createdAt ?? new Date().toISOString(),
      rank: 0,
      ...(message.metadata?.seq === undefined
        ? {}
        : { seq: message.metadata.seq }),
      node: (
        <>
          <MessageRow message={message} notice={noticeLine} />
          {/* An AI agent's suggestion, as its card: decided here as in
              the inbox. */}
          {firstCards.has(message.id) ? (
            <div className='mt-2'>
              <SuggestionCard {...suggestionOf(message)!} />
            </div>
          ) : null}
        </>
      ),
    })),
    ...shownPlans.map((plan) => ({
      key: `plan-${plan.id}`,
      at: plan.createdAt,
      rank: 1,
      node: <PlanCard plan={plan} />,
    })),
    ...messages.pending.map((message) => ({
      key: message.clientId,
      at: message.createdAt,
      rank: 2,
      node: (
        <UserBubble
          content={message.content}
          footer={
            message.status === 'failed' ? (
              <span className='flex items-center gap-2 text-xs text-destructive'>
                {text('agentChat.notSent')}
                <Button
                  variant='link'
                  size='xs'
                  className='h-auto p-0'
                  onClick={() =>
                    void sendInConversation({
                      content: message.content,
                      context: message.context,
                      clientId: message.clientId,
                      ...(message.attachments
                        ? { attachments: message.attachments }
                        : {}),
                    })
                  }
                >
                  {text('agentChat.sendAgain')}
                </Button>
              </span>
            ) : (
              <span className='text-xs text-muted-foreground'>
                {text('agentChat.sending')}
              </span>
            )
          }
        />
      ),
    })),
  ]);
  // The first question's page context: what the conversation started from.
  const firstQuestion = messages.items.find(
    (message) => message.role === 'user' && !isNews(message),
  );

  return (
    <section
      aria-label={conversation?.title ?? toText(text('agentChat.new'))}
      className='flex min-h-0 flex-1 flex-col'
    >
      {/* Who answers and what the conversation is: its avatar, its title
          over the assistant's name and description, and its actions behind
          the "…" menu. */}
      {inPanel ? null : (
        <div className='flex min-h-14 items-center gap-3 border-b border-border pb-3'>
          {conversationId ? (
            loading ? (
              <Skeleton className='h-9 w-64' />
            ) : (
              <>
                <AgentAvatar name={name} className='shrink-0 rounded-full' />
                <div className='grid min-w-0 flex-1'>
                  <span className='truncate text-base font-semibold'>
                    {conversation?.title || name}
                  </span>
                  <span className='truncate text-xs text-muted-foreground'>
                    {[name, description].filter(Boolean).join(' · ')}
                  </span>
                </div>
                {!archived ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      render={
                        <Button
                          variant='ghost'
                          size='icon-sm'
                          className='shrink-0'
                          aria-label={toText(text('agentChat.actions'))}
                        />
                      }
                    >
                      <Ellipsis />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align='end'>
                      <DropdownMenuItem
                        disabled={actions.archive.isPending}
                        onClick={() =>
                          actions.archive.mutate(
                            { id: conversationId, archived: true },
                            { onSuccess: onArchived },
                          )
                        }
                      >
                        <Archive />
                        {text('agentChat.archive')}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : null}
              </>
            )
          ) : (
            <span className='flex items-center gap-2 text-sm font-medium'>
              <AgentAvatar name={name} size='sm' className='rounded-full' />
              {name}
            </span>
          )}
        </div>
      )}

      <div className='relative min-h-0 flex-1'>
        <div
          ref={scrollRef}
          onScroll={(event) => {
            const box = event.currentTarget;
            setAtBottom(
              box.scrollHeight - box.scrollTop - box.clientHeight < 48,
            );
          }}
          // Positioned, so what is placed absolutely inside it (a message's
          // screen-reader label) scrolls with it rather than hanging below
          // it and scrolling the whole page.
          // Up and down only: a fraction of a pixel of rounding in the
          // content must not bring a sideways scrollbar under the pointer.
          // It reaches into the side padding of the panel and the page around
          // it, so its scrollbar stands clear of the messages.
          className='relative -mr-3 h-full overflow-x-hidden overflow-y-auto py-4 pr-3'
        >
          {loading ||
          (conversationId && !messages.loaded && !messages.error) ? (
            <div className='flex flex-col gap-4' role='status'>
              <span className='sr-only'>{text('loading')}</span>
              <Skeleton className='ml-auto h-10 w-2/3 rounded-xl' />
              <Skeleton className='h-20 w-3/4 rounded-xl' />
              <Skeleton className='ml-auto h-10 w-1/2 rounded-xl' />
            </div>
          ) : (
            <div ref={contentRef} className='flex flex-col gap-4'>
              <AutoLoadMore
                hasMore={messages.hasMore}
                loading={messages.loadingOlder}
                onLoad={messages.loadOlder}
              />
              {/* What it started from, atop the thread once its first
                  message is read. */}
              <StartingPoint context={firstQuestion?.metadata?.context} />
              {messages.error ? (
                <div className='flex flex-col items-start gap-2'>
                  <ErrorNotice error={messages.error} />
                  <Button
                    variant='outline'
                    size='sm'
                    onClick={messages.fetchNewer}
                  >
                    {text('agentChat.retry')}
                  </Button>
                </div>
              ) : null}
              {timeline.map((entry) => (
                <div key={entry.key}>{entry.node}</div>
              ))}
              {starting ? (
                <UserBubble
                  content={starting.content}
                  footer={
                    <span
                      className={`text-xs ${
                        starting.failed
                          ? 'text-destructive'
                          : 'text-muted-foreground'
                      }`}
                    >
                      {text(
                        starting.failed
                          ? 'agentChat.notSent'
                          : 'agentChat.sending',
                      )}
                    </span>
                  }
                />
              ) : null}
              {running ? (
                <LiveLine step={liveStep(last)} agentName={name} />
              ) : null}
            </div>
          )}
        </div>
        {!atBottom ? (
          <Button
            variant='outline'
            size='sm'
            className='absolute bottom-3 left-1/2 -translate-x-1/2 shadow-sm'
            onClick={toLatest}
          >
            <ArrowDown />
            {text('agentChat.jumpToLatest')}
          </Button>
        ) : null}
      </div>

      {archived && conversationId ? (
        <div className='flex flex-wrap items-center gap-3 pt-3 pb-4'>
          <Info className='size-4 text-muted-foreground' aria-hidden />
          <span className='text-sm text-muted-foreground'>
            {text('agentChat.archivedNote')}
          </span>
          <Button
            variant='outline'
            size='sm'
            className='ml-auto'
            disabled={actions.archive.isPending}
            onClick={() =>
              actions.archive.mutate(
                { id: conversationId, archived: false },
                { onSuccess: onRestored },
              )
            }
          >
            <ArchiveRestore />
            {text('agentChat.restore')}
          </Button>
        </div>
      ) : conversationId ? (
        <ConversationComposer
          conversationId={conversationId}
          disabled={loading}
          reason={offline}
          onSend={(message) => void sendInConversation(message)}
        />
      ) : (
        <Composer
          disabled={!agent || Boolean(starting && !starting.failed)}
          reason={offline}
          // A new conversation picks the model it starts on.
          models={models.models}
          {...(models.model ? { model: models.model } : {})}
          onModel={models.select}
          onSend={({ content, context, attachments }) => {
            setStarting({ content, failed: false });
            const taken = submit({
              content,
              context,
              attachments,
              conversationId: null,
              source: CRM_SOURCE,
              ...(models.model ? { model: models.model } : {}),
              created: (created) => {
                setStarting(null);
                onCreated(created);
              },
              failed: () => setStarting({ content, failed: true }),
            });
            if (!taken) setStarting({ content, failed: true });
          }}
        />
      )}
    </section>
  );
}

// The composer of a conversation under way, whose model picker switches
// the model it answers with from its next reply, among those the
// conversation was created with.
function ConversationComposer({
  conversationId,
  disabled,
  reason,
  onSend,
}: {
  conversationId: string;
  disabled: boolean;
  reason: string | null;
  onSend: Parameters<typeof Composer>[0]['onSend'];
}): ReactElement {
  const api = useChatApi();
  const queryClient = useQueryClient();
  const choices = useChatModelChoices();
  const key = ['crm', 'agent-chat', 'config', conversationId];
  const config = useQuery({
    queryKey: key,
    queryFn: () => api.configuration(conversationId),
    staleTime: 30_000,
  });
  const offered = new Set(config.data?.model ?? []);
  const models = choices.filter((choice) => offered.has(modelKey(choice)));
  const selected = config.data?.selectedModel;
  const model =
    (selected &&
      models.find((choice) => modelKey(choice) === modelKey(selected))) ||
    models[0];
  return (
    <Composer
      disabled={disabled}
      reason={reason}
      {...(models.length > 1 && model
        ? {
            models,
            model,
            onModel: (next: string) => {
              const picked = models.find((choice) => modelKey(choice) === next);
              if (!picked) return;
              void api
                .configure(
                  conversationId,
                  {},
                  { modelService: picked.modelService, model: picked.model },
                )
                .then((snapshot) => queryClient.setQueryData(key, snapshot))
                .catch(() => undefined);
            },
          }
        : {})}
      onSend={onSend}
    />
  );
}

function MessageRow({
  message,
  notice,
}: {
  message: AppUIMessage;
  notice: (notice: NewsNotice) => string | null;
}): ReactElement | null {
  const at = message.metadata?.createdAt;
  const lines = message.parts.flatMap((part) => {
    if (part.type !== 'data-notice') return [];
    const line = notice(part.data);
    return line ? [{ key: part.id ?? line, line }] : [];
  });
  const notices = lines.map(({ key, line }) => (
    <p
      key={key}
      className='flex items-center justify-center gap-1.5 text-center text-xs text-muted-foreground'
    >
      <Info className='size-3.5 shrink-0' aria-hidden />
      {line}
    </p>
  ));
  if (message.role === 'user')
    return <UserBubble content={appUIMessageText(message)} at={at} />;
  if (message.role === 'system') return notices.length ? <>{notices}</> : null;
  const content = message.parts
    .flatMap((part) => (part.type === 'text' ? [part.text] : []))
    .join('\n\n');
  return (
    <>
      {content.trim() ? <AgentReply content={content} at={at} /> : null}
      {notices}
    </>
  );
}

// An agent's reply: the text across the conversation's width, with no
// bubble or avatar, its headings and lists given room to read; the
// person's own messages are the bubbles, on the right.
export function AgentReply({
  content,
  at,
}: {
  content: string;
  at?: string;
}): ReactElement {
  return (
    <div className='group/message grid min-w-0 gap-0.5'>
      <div className='min-w-0 text-sm leading-6 [&_li]:my-1 [&_ol]:my-2 [&_p]:my-2 [&_ul]:my-2'>
        <Markdown>{content}</Markdown>
      </div>
      {at ? <SentAt at={at} content={content} /> : null}
    </div>
  );
}

// Under a message while it is hovered (or a control in it focused): when
// it was sent, in the CRM's own date format, and a button copying its text,
// which says so a moment once it has.
function SentAt({
  at,
  content,
}: {
  at: string;
  content: string;
}): ReactElement {
  const { text, language } = useCrmText();
  const { data: meta } = useMetadata();
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), 1500);
    return () => window.clearTimeout(timer);
  }, [copied]);
  const label = toText(text(copied ? 'agentChat.copied' : 'agentChat.copy'));
  return (
    <span className='flex items-center gap-1 text-xs text-muted-foreground opacity-0 transition-opacity group-focus-within/message:opacity-100 group-hover/message:opacity-100'>
      <time dateTime={at} className='tabular-nums'>
        {localDate(at, language, meta?.settings.timeZone ?? DEFAULT_TIME_ZONE)}
      </time>
      <Button
        variant='ghost'
        size='icon-xs'
        aria-label={label}
        title={label}
        onClick={() =>
          void navigator.clipboard
            ?.writeText(content)
            .then(() => setCopied(true))
            .catch(() => undefined)
        }
      >
        {copied ? <Check /> : <Copy />}
      </Button>
    </span>
  );
}

function UserBubble({
  content,
  at,
  footer,
}: {
  content: string;
  // When it was sent; a message still being sent has none yet.
  at?: string | undefined;
  footer?: ReactNode;
}): ReactElement {
  const { text } = useCrmText();
  return (
    <div className='group/message ml-auto flex max-w-[85%] flex-col items-end gap-1'>
      <span className='sr-only'>{text('agentChat.you')}</span>
      <div className='rounded-xl bg-muted px-3 py-2 text-sm break-words whitespace-pre-wrap'>
        {content}
      </div>
      {footer ?? (at ? <SentAt at={at} content={content} /> : null)}
    </div>
  );
}

// What the assistant is doing now, summed up in one line.
export function LiveLine({
  step,
  agentName,
}: {
  step: StepLine;
  agentName: string;
}): ReactElement {
  const { text } = useCrmText();
  // In the person's words (step-text.ts), never the command line.
  const words = stepWords(step);
  const line = toText(
    text(`agentChat.step.${words.key}`, {
      ...words.values,
      ...(words.values?.object
        ? { object: toText(text(`entity.${words.values.object}`)) }
        : {}),
    }),
  );
  return (
    <p
      role='status'
      className='flex items-center gap-2 text-sm text-muted-foreground'
    >
      <Spinner />
      {text('agentChat.working', { agent: agentName, step: line })}
    </p>
  );
}

// The suggestion an AI agent's notice names (server/providers/crm-agents/
// ai-work-news.ts), when it is a card to show: a lead's, a deal's, an
// approval's or a task's, ready or shown; a failure or a company's signals
// are their line alone.
function suggestionOf(message: AppUIMessage): {
  entity: 'leads' | 'opportunities' | 'approvals' | 'tasks';
  recordId: string;
  entryId: string;
} | null {
  if (message.role !== 'system') return null;
  for (const part of message.parts) {
    if (part.type !== 'data-notice' || part.data.type !== 'aiWork') continue;
    const params = part.data.params ?? {};
    const entity = toText(params.entity);
    const recordId = toText(params.recordId);
    const entryId = toText(params.entryId);
    if (
      !['leads', 'opportunities', 'approvals', 'tasks'].includes(entity) ||
      !recordId ||
      !entryId ||
      params.outcome === 'failed'
    )
      continue;
    return {
      entity: entity as 'leads' | 'opportunities' | 'approvals' | 'tasks',
      recordId,
      entryId,
    };
  }
  return null;
}
