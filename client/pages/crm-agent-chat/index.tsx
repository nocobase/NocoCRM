import { Button } from '#components/ui/button';
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '#components/ui/empty';
import { Skeleton } from '#components/ui/skeleton';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '#components/ui/tooltip';
import {
  useChatPanel,
  useConversationList,
} from '@nocobase/app-plugin-agents/client/chat';
import type { ConversationDetail } from '@nocobase/app-plugin-agents/shared/conversations';
import { Bot, MessagesSquare, Minimize2, Plus } from 'lucide-react';
import { lazy, Suspense, useRef, useState, type ReactElement } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router';
import { BackButton } from '../../components/back-button.js';
import { useCrmText } from '../../components/crm/api.js';
import { ErrorNotice } from '../../components/crm/common.js';
import { PageHeader } from '#components/page-header';
import {
  RecordDrawerContext,
  useRecordDrawerState,
} from '../../components/crm/record-drawer.js';
import { Conversation } from '../../components/crm/agent-chat/conversation.js';
import { ConversationList } from '../../components/crm/agent-chat/conversation-list.js';
import {
  listedConversations,
  useCrmChatAgents,
} from '../../components/crm/agent-chat/ask.js';

// The conversations with the CRM's agents on a page of their own, the
// assistant panel's full-page view (agent-chat/panel.tsx): the reader's
// conversations beside the one open (frontend standard §3.5), a new one at
// /new. The plans an agent proposes are decided here, in the panel, in the
// inbox and on the records they change. A record a plan names opens in the
// drawer over the conversation.

// The records a plan step names open in the detail page's drawer; its code
// loads only when one is first opened.
const RecordDrawer = lazy(() =>
  import('../crm-detail.js').then((module) => ({
    default: module.RecordDrawer,
  })),
);

// Under the application's ChatProvider (agent-chat/panel.tsx), whose panel
// this page is the full-page view of.
export default function AgentChatPage(): ReactElement {
  const { text } = useCrmText();
  const navigate = useNavigate();
  const params = useParams<{ conversationId?: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const isNew = params.conversationId === 'new';
  const openId = isNew ? null : (params.conversationId ?? null);
  const archived = searchParams.get('archived') === '1';
  const chat = useChatPanel();
  // Where the reader came from: the browser history's place when the page
  // opened (the router keeps it as `idx`), so Collapse returns there past
  // the conversations opened since; opened first, or with no place, the
  // overview.
  const [cameAt] = useState<number | null>(() => {
    const idx = (window.history.state as { idx?: unknown } | null)?.idx;
    return typeof idx === 'number' ? idx : null;
  });
  const goBack = () => {
    const idx = (window.history.state as { idx?: unknown } | null)?.idx;
    if (cameAt && typeof idx === 'number' && idx >= cameAt)
      void navigate(-(idx - cameAt + 1));
    else void navigate('/');
  };
  const drawer = useRecordDrawerState();
  const [drawerLoaded, setDrawerLoaded] = useState(false);
  if (drawer.opened && !drawerLoaded) setDrawerLoaded(true);

  const agents = useCrmChatAgents();
  const open = useConversationList({});
  const archivedList = useConversationList({ archived: true });
  const list = archived ? archivedList : open;
  const listRef = useRef<HTMLElement>(null);
  // Archived ones stay in reach from the empty state, once the last open
  // conversation is archived.
  const hasArchived = listedConversations(archivedList.data?.pages).length > 0;
  const showArchived = (shown: boolean): void =>
    setSearchParams((previous) => {
      const next = new URLSearchParams(previous);
      if (shown) next.set('archived', '1');
      else next.delete('archived');
      return next;
    });
  const none =
    !open.isLoading &&
    !open.error &&
    !listedConversations(open.data?.pages).length;

  // A new conversation stays the same view once its first message creates
  // it and the address becomes its own; each arrival at /new starts afresh,
  // while a change of the query (showing the archived ones) keeps the
  // agent picked and the text typed.
  const [fresh, setFresh] = useState<{
    onNew: boolean;
    session: number;
    id: string | null;
  }>(() => ({ onNew: isNew, session: 0, id: null }));
  if (isNew !== fresh.onNew)
    setFresh({
      onNew: isNew,
      session: isNew ? fresh.session + 1 : fresh.session,
      id: isNew ? null : fresh.id,
    });
  const viewKey =
    openId === null || openId === fresh.id ? `new-${fresh.session}` : openId;
  const created = (conversation: ConversationDetail): void => {
    setFresh((current) => ({ ...current, id: conversation.id }));
    void navigate(
      `/agent-chat/${encodeURIComponent(conversation.id)}${archived ? '?archived=1' : ''}`,
      { replace: true },
    );
  };
  const archivedOne = (): void => {
    void navigate('/agent-chat');
    // The open conversation left the view: on to the list.
    requestAnimationFrame(() => listRef.current?.focus());
  };

  const newButton = (
    <Button
      variant='contrast'
      render={<Link to='/agent-chat/new' />}
      nativeButton={false}
    >
      <Plus />
      {text('agentChat.new')}
    </Button>
  );
  const detailOpen = isNew || openId !== null;
  // The reader's first conversation: no list beside it yet.
  const first = none && !archived;
  // While nothing is known yet the header offers nothing; with no
  // conversation at all the empty state holds the only way to start one,
  // and a first conversation being started needs none.
  // Collapse, beside New conversation: back to the page the reader came
  // from, the conversation open (if any) in the side panel, as the panel's
  // Open full page undone; it took the place of a Back of its own row.
  const collapseButton = (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            variant='outline'
            onClick={() => {
              chat.openChat(
                openId ? { conversationId: openId, view: 'chat' } : {},
              );
              goBack();
            }}
          />
        }
      >
        <Minimize2 />
        {text('agentChat.collapse')}
      </TooltipTrigger>
      <TooltipContent>{text('agentChat.collapseHint')}</TooltipContent>
    </Tooltip>
  );
  const headerAction = (
    <div className='flex items-center gap-2'>
      {collapseButton}
      {open.isLoading || first ? null : newButton}
    </div>
  );

  // The conversation, or why none can be held, beside the list.
  const detail =
    isNew && agents.isLoading ? (
      <div className='flex flex-col gap-3 py-4' role='status'>
        <span className='sr-only'>{text('loading')}</span>
        <Skeleton className='h-8 w-48' />
        <Skeleton className='h-24 w-full' />
      </div>
    ) : isNew && agents.error ? (
      <div className='flex flex-col items-start gap-2 py-4'>
        <ErrorNotice error={agents.error} />
        <Button
          variant='outline'
          size='sm'
          onClick={() => void agents.refetch()}
        >
          {text('agentChat.retry')}
        </Button>
      </div>
    ) : isNew && !agents.data?.length ? (
      <div className='flex flex-1 items-center justify-center py-6'>
        <EmptyBlock
          icon={<Bot />}
          title={text('agentChat.noAgent')}
          description={text('agentChat.noAgentDescription')}
          action={
            <Button
              variant='outline'
              render={<Link to='/models' />}
              nativeButton={false}
            >
              {text('agentChat.manageAgents')}
            </Button>
          }
        />
      </div>
    ) : (
      <Conversation
        key={viewKey}
        conversationId={openId}
        agents={agents.data ?? []}
        onCreated={created}
        onArchived={archivedOne}
        // Restored, it is listed with the open ones again.
        onRestored={() => showArchived(false)}
      />
    );

  // Laid out as the inbox is (inbox-page.tsx): the heading over a rule, the
  // conversations in a column on the card's white at the left, the one open
  // beside them; narrow, the list and the conversation take turns.
  let body: ReactElement;
  if (open.isLoading && !detailOpen)
    body = (
      <div className='flex flex-col gap-2 p-4 lg:w-96' role='status'>
        <span className='sr-only'>{text('loading')}</span>
        {[0, 1, 2].map((row) => (
          <Skeleton key={row} className='h-16 w-full rounded-lg' />
        ))}
      </div>
    );
  else if (none && !archived && !isNew)
    body = (
      <div className='flex flex-1 items-center justify-center p-6'>
        <EmptyBlock
          icon={<MessagesSquare />}
          title={text('agentChat.empty')}
          description={text('agentChat.emptyDescription')}
          action={
            <div className='flex flex-wrap justify-center gap-2'>
              {newButton}
              {hasArchived ? (
                <Button variant='ghost' onClick={() => showArchived(true)}>
                  {text('agentChat.showArchived')}
                </Button>
              ) : null}
            </div>
          }
        />
      </div>
    );
  else
    body = (
      <div className='flex min-h-0 flex-1'>
        {first ? null : (
          <div
            className={`flex min-h-0 w-full flex-col border-r bg-card lg:w-96 lg:shrink-0 ${detailOpen ? 'max-lg:hidden' : ''}`}
          >
            <ConversationList
              ref={listRef}
              query={list}
              openId={openId}
              archived={archived}
              onArchived={showArchived}
            />
          </div>
        )}
        <div
          className={`flex min-h-0 min-w-0 flex-1 flex-col px-4 pt-3 pb-4 md:px-6 ${detailOpen ? '' : 'max-lg:hidden'}`}
        >
          {detailOpen ? (
            <>
              {/* Narrow, the list and the conversation take turns. */}
              <div className='mb-2 lg:hidden'>
                <BackButton
                  to={`/agent-chat${archived ? '?archived=1' : ''}`}
                />
              </div>
              {detail}
            </>
          ) : (
            <p className='m-auto text-sm text-muted-foreground'>
              {text('agentChat.nothingOpen')}
            </p>
          )}
        </div>
      </div>
    );

  return (
    <RecordDrawerContext.Provider
      value={{ open: drawer.open, close: drawer.close, inDrawer: false }}
    >
      <div className='flex h-full min-h-0 flex-col'>
        <div className='shrink-0 border-b px-6 py-5 md:px-8'>
          <PageHeader
            title={text('navigation.conversations')}
            actions={headerAction}
          />
        </div>
        {body}
      </div>
      {drawerLoaded && (
        <Suspense fallback={null}>
          <RecordDrawer
            target={drawer.opened}
            open={drawer.open}
            close={drawer.close}
          />
        </Suspense>
      )}
    </RecordDrawerContext.Provider>
  );
}

function EmptyBlock({
  icon,
  title,
  description,
  action,
}: {
  icon: ReactElement;
  title: string;
  description: string;
  action: ReactElement;
}): ReactElement {
  return (
    <Empty className='border border-dashed'>
      <EmptyHeader>
        <EmptyMedia variant='icon'>{icon}</EmptyMedia>
        <EmptyTitle>{title}</EmptyTitle>
        <EmptyDescription>{description}</EmptyDescription>
      </EmptyHeader>
      <EmptyContent>{action}</EmptyContent>
    </Empty>
  );
}
