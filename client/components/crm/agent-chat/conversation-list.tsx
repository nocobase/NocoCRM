import { Button } from '#components/ui/button';
import { Skeleton } from '#components/ui/skeleton';
import {
  AgentAvatar,
  appUIMessageText,
  type AppUIMessage,
  type ConversationListPages,
} from '@nocobase/app-plugin-agents/client/chat';
import { useQuery, type UseInfiniteQueryResult } from '@tanstack/react-query';
import {
  useEffect,
  useState,
  type ReactElement,
  type ReactNode,
  type Ref,
} from 'react';
import { NavLink } from 'react-router';
import { relativeTime, toText, useCrmApi, useCrmText } from '../api.js';
import { markdownLine } from '../line-breaks.js';
import { AutoLoadMore } from '../auto-load.js';
import { ErrorNotice } from '../common.js';
import { isNews } from './news.js';
import { listedConversations, useAssistantName } from './ask.js';

// The reader's conversations with the agents, last message first: the side
// list of the page (frontend standard §3.5), each row its conversation's
// address, the open one marked. Archived ones are a list of their own. A row
// is the agent's avatar beside the title and the time, the newest message
// under them; the open one on the grey a hovered one takes, a shade deeper.
export function ConversationList({
  ref,
  query,
  openId,
  archived,
  onArchived,
  onOpen,
}: {
  ref?: Ref<HTMLElement>;
  query: UseInfiniteQueryResult<ConversationListPages>;
  openId: string | null;
  archived: boolean;
  // Showing the archived ones instead of the open; left out, the list has
  // no such switch (the assistant panel's history).
  onArchived?: (shown: boolean) => void;
  // Opening a conversation in place (the panel); left out, a row is a link
  // to the conversation's page.
  onOpen?: (id: string) => void;
}): ReactElement {
  const { text, language } = useCrmText();
  const assistantName = useAssistantName();
  // The list stays on the page: its times move on with the clock.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(timer);
  }, []);
  const items = listedConversations(query.data?.pages);
  const suffix = archived ? '?archived=1' : '';
  const toggle = (
    <Button
      variant='ghost'
      size='sm'
      className='text-muted-foreground'
      onClick={() => onArchived?.(!archived)}
    >
      {text(archived ? 'agentChat.hideArchived' : 'agentChat.showArchived')}
    </Button>
  );
  return (
    <nav
      ref={ref}
      tabIndex={-1}
      aria-label={text(archived ? 'agentChat.archivedList' : 'agentChat.list')}
      className='flex min-h-0 flex-1 flex-col outline-none'
    >
      <div className='min-h-0 flex-1 overflow-y-auto'>
        {query.isLoading ? (
          <div className='flex flex-col gap-2 p-1' role='status'>
            <span className='sr-only'>{text('loading')}</span>
            {[0, 1, 2, 3].map((row) => (
              <Skeleton key={row} className='h-14 w-full rounded-lg' />
            ))}
          </div>
        ) : query.error ? (
          <div className='flex flex-col items-start gap-2 p-1'>
            <ErrorNotice error={query.error} />
            <Button
              variant='outline'
              size='sm'
              onClick={() => void query.refetch()}
            >
              {text('agentChat.retry')}
            </Button>
          </div>
        ) : !items.length ? (
          <div className='flex flex-col items-center gap-2 px-4 py-10 text-center'>
            <p className='text-sm text-muted-foreground'>
              {text(archived ? 'agentChat.noArchived' : 'agentChat.empty')}
            </p>
          </div>
        ) : (
          <ul className='flex flex-col gap-0.5 p-2'>
            {items.map((conversation) => {
              const title = conversation.title || text('agentChat.untitled');
              const unread = !conversation.read;
              const current = conversation.id === openId;
              const agent = assistantName;
              return (
                <li key={conversation.id}>
                  <RowTarget
                    to={`/agent-chat/${encodeURIComponent(conversation.id)}${suffix}`}
                    onOpen={onOpen ? () => onOpen(conversation.id) : undefined}
                    current={current}
                    className={`flex w-full items-center gap-3 rounded-lg px-2.5 py-2.5 text-left transition-colors ${
                      current ? 'bg-accent' : 'hover:bg-hover'
                    }`}
                  >
                    <AgentAvatar
                      name={agent}
                      className='shrink-0 rounded-full'
                    />
                    <span className='grid min-w-0 flex-1 gap-0.5'>
                      <span className='flex min-w-0 items-baseline gap-2'>
                        <span
                          className={`min-w-0 flex-1 truncate text-sm ${unread ? 'font-semibold' : 'font-medium'}`}
                          title={title}
                        >
                          {title}
                        </span>
                        <span className='shrink-0 text-xs text-muted-foreground tabular-nums'>
                          {relativeTime(
                            conversation.lastMessageAt,
                            language,
                            now,
                            text('justNow'),
                          )}
                        </span>
                      </span>
                      {/* A reply not yet read: the preview in the body's
                          colour and a dot in the AI's at the row's end, under
                          the time. */}
                      <span
                        className={`flex min-w-0 items-center gap-1.5 text-xs ${unread ? 'text-foreground' : 'text-muted-foreground'}`}
                      >
                        <span className='min-w-0 flex-1 truncate'>
                          <LastMessage
                            id={conversation.id}
                            // Read again when a message arrives, when a run
                            // starts or ends (a reply streamed into its
                            // message keeps the message's time), and when the
                            // conversation changes.
                            at={`${conversation.lastMessageAt}|${conversation.updatedAt}|${conversation.execution?.status ?? ''}`}
                            agent={agent}
                          />
                        </span>
                        {unread ? (
                          <span className='size-2 shrink-0 rounded-full bg-primary'>
                            <span className='sr-only'>
                              {text('agentChat.unread')}
                            </span>
                          </span>
                        ) : null}
                      </span>
                    </span>
                  </RowTarget>
                </li>
              );
            })}
          </ul>
        )}
        <AutoLoadMore
          hasMore={Boolean(query.hasNextPage)}
          loading={query.isFetchingNextPage}
          onLoad={() => void query.fetchNextPage()}
        />
      </div>
      {onArchived ? (
        <div className='shrink-0 border-t border-border px-3 py-2'>
          {toggle}
        </div>
      ) : null}
    </nav>
  );
}

// A row: a link to the conversation's page, or a button opening it in place.
function RowTarget({
  to,
  onOpen,
  current,
  className,
  children,
}: {
  to: string;
  onOpen: (() => void) | undefined;
  current: boolean;
  className: string;
  children: ReactNode;
}): ReactElement {
  return onOpen ? (
    <button
      type='button'
      className={className}
      aria-current={current ? 'true' : undefined}
      onClick={onOpen}
    >
      {children}
    </button>
  ) : (
    <NavLink
      to={to}
      aria-current={current ? 'page' : undefined}
      className={className}
    >
      {children}
    </NavLink>
  );
}

// The newest message of a conversation, as one plain line under its title,
// led by who wrote it ("You:", or the agent's name); `at` is what it is read
// again on: the plugin's list carries no preview, so each row reads its
// conversation's last message, read again when the conversation moves on.
export function LastMessage({
  id,
  at,
  agent,
}: {
  id: string;
  at: string;
  agent: string;
}): ReactElement | null {
  const api = useCrmApi();
  const { data } = useQuery({
    queryKey: ['crm', 'agent-chat', 'last-message', id, at],
    // The newest few: the last may be a notice, or the CRM's news to the
    // assistant (news.ts), neither of which a row previews.
    queryFn: async () =>
      (
        await api<{ data: readonly AppUIMessage[] }>(
          `agents/conversations/${encodeURIComponent(id)}/messages?pageSize=5`,
        )
      ).data.findLast(
        (message) => message.role !== 'system' && !isNews(message),
      ) ?? null,
    staleTime: Infinity,
  });
  const { text } = useCrmText();
  const line = data ? markdownLine(appUIMessageText(data)) : '';
  if (!line) return null;
  // The person's own last message is said to be theirs.
  return (
    <>
      {toText(
        data?.role === 'user'
          ? text('agentChat.lastYours')
          : text('agentChat.lastFrom', { name: agent }),
      )}
      {line}
    </>
  );
}
