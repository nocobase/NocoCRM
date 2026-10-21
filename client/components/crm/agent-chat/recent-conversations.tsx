import {
  AgentAvatar,
  useChatPanel,
  useConversationList,
} from '@nocobase/app-plugin-agents/client/chat';
import { useState, type ReactElement } from 'react';
import { Link } from 'react-router';
import { relativeTime, toText, useCrmText } from '../api.js';
import { listedConversations, useAssistantName } from './ask.js';
import { LastMessage } from './conversation-list.js';

// How many conversations the overview shows.
const SHOWN = 4;

// The person's latest conversations with the agents, on the overview under
// its ask box: each row the agent's avatar, the title and its time over the
// newest message, as the conversations page lists them, opening the
// conversation in the panel; "View all" leads to that page. Nothing while
// there is none, or while the list loads.
export function RecentConversations(): ReactElement | null {
  const { text, language } = useCrmText();
  const assistantName = useAssistantName();
  const panel = useChatPanel();
  const list = useConversationList({});
  const [now] = useState(() => Date.now());
  const items = listedConversations(list.data?.pages).slice(0, SHOWN);
  if (!items.length) return null;
  return (
    // Set apart from the ask box above it.
    <section className='space-y-3 pt-10'>
      <div className='flex items-baseline justify-between gap-3'>
        <h2 className='text-sm font-medium text-muted-foreground'>
          {text('recentChats')}
        </h2>
        <Link
          to='/agent-chat'
          className='text-sm text-muted-foreground transition-colors hover:text-foreground'
        >
          {text('viewAllChats')}
        </Link>
      </div>
      <ul className='grid gap-1 rounded-xl border border-border bg-card p-1.5 shadow-xs'>
        {items.map((conversation) => {
          const title = conversation.title || text('agentChat.untitled');
          const unread = !conversation.read;
          const agent = assistantName;
          return (
            <li key={conversation.id}>
              <button
                type='button'
                onClick={() =>
                  panel.openChat({
                    conversationId: conversation.id,
                    view: 'chat',
                  })
                }
                className='flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-hover'
              >
                <AgentAvatar name={agent} className='shrink-0 rounded-full' />
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
                  <span
                    className={`flex min-w-0 items-center gap-1.5 text-xs ${unread ? 'text-foreground' : 'text-muted-foreground'}`}
                  >
                    <span className='min-w-0 flex-1 truncate'>
                      <LastMessage
                        id={conversation.id}
                        at={`${conversation.lastMessageAt}|${conversation.updatedAt}|${conversation.execution?.status ?? ''}`}
                        agent={agent}
                      />
                    </span>
                    {unread ? (
                      <span className='size-2 shrink-0 rounded-full bg-primary'>
                        <span className='sr-only'>
                          {toText(text('agentChat.unread'))}
                        </span>
                      </span>
                    ) : null}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
