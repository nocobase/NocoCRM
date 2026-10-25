import { Button } from '#components/ui/button';
import { Dialog, DialogContent, DialogTitle } from '#components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '#components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '#components/ui/tooltip';
import {
  AgentAvatar,
  CHAT_PANEL_ATTRIBUTE,
  ChatProvider,
  useChatPanel,
  useConversation,
  useConversationActions,
  useConversationList,
} from '@nocobase/app-plugin-agents/client/chat';
import type { ConversationDetail } from '@nocobase/app-plugin-agents/shared/conversations';
import { Archive, Ellipsis, Expand, History, Plus, X } from 'lucide-react';
import {
  lazy,
  Suspense,
  useEffect,
  useState,
  type ReactElement,
  type ReactNode,
} from 'react';
import { useIsMobile } from '../../../hooks/use-mobile.js';
import { toText, useCrmText, useLiveSessionUserId } from '../api.js';
import {
  RecordDrawerContext,
  useRecordDrawerHosted,
  useRecordDrawerState,
} from '../record-drawer.js';
import {
  listedConversations,
  useAgentReadiness,
  useDemoSite,
  useAssistantDescription,
  useAssistantName,
  useCrmChatAgents,
} from './ask.js';
import { Conversation } from './conversation.js';
import { settlePanelOwner } from './panel-owner.js';
import { ConversationList } from './conversation-list.js';

// The CRM assistant's panel on the Agents plugin: the assistant's conversations
// beside every page (28rem, pushing the page from 1280px, floating
// narrower, full screen on a phone). Its state is the plugin's
// (`useChatPanel`: open, the conversation or a new one, the history view,
// pins, drafts, ⌘J); the conversation and its list are the ones the full
// page (/agent-chat) shows.

// The record drawer's code loads only when a plan step's record is first
// opened from the panel on a page that hosts no drawer of its own.
const RecordDrawer = lazy(() =>
  import('../../../pages/crm-detail.js').then((module) => ({
    default: module.RecordDrawer,
  })),
);

export function CrmAgentChatProvider({
  children,
}: {
  children?: ReactNode;
}): ReactElement {
  // The chat exists only for a signed-in person: signed out, its shortcut,
  // links and queries do nothing.
  const userId = useLiveSessionUserId();
  const signedIn = Boolean(userId);
  // One chat for each person who signs in (the plugin leaves it to the
  // application): what the panel kept for the one before (its open
  // conversation, in the tab's session storage) and the chat's cache go
  // before the next mounts, so the next person never lands on a
  // conversation that is not theirs. Idempotent, so it may run in render,
  // which it must: the provider reads the stored state as it mounts.
  settlePanelOwner(userId ?? null);
  return (
    <ChatProvider
      key={userId ?? 'signed-out'}
      available={signedIn}
      conversationPath={(id) => `/agent-chat/${encodeURIComponent(id)}`}
    >
      {children}
      {signedIn ? <AgentPanel /> : null}
    </ChatProvider>
  );
}

function AgentPanel(): ReactElement | null {
  const { text } = useCrmText();
  const panel = useChatPanel();
  const isMobile = useIsMobile();
  const { open, closeChat } = panel;
  // The page makes room for the docked panel (client/styles.css).
  useEffect(() => {
    document.body.classList.toggle('crm-agent-panel-open', open && !isMobile);
    return () => document.body.classList.remove('crm-agent-panel-open');
  }, [open, isMobile]);
  if (!open) return null;
  if (isMobile)
    return (
      <Dialog
        open
        onOpenChange={(next) => {
          if (!next) closeChat();
        }}
      >
        <DialogContent
          // The plugin's marker: focus inside is "in the panel" (⌘J closes
          // it, its focus return applies).
          {...{ [CHAT_PANEL_ATTRIBUTE]: '' }}
          showCloseButton={false}
          className='flex h-dvh max-h-dvh w-screen max-w-none flex-col gap-0 rounded-none p-0 sm:max-w-none'
        >
          <PanelBody modal />
        </DialogContent>
      </Dialog>
    );
  return (
    <aside
      data-crm-agent-panel=''
      {...{ [CHAT_PANEL_ATTRIBUTE]: '' }}
      aria-label={toText(text('agentPanel.title'))}
      // Over the layout's sticky header (z-40), which it follows in the
      // document: below 1280px the panel floats over the page, and the
      // header's actions would cover its own (close, new, history). Dialogs
      // and menus (z-50) stay above it.
      className='fixed inset-y-0 right-0 z-40 flex w-[28rem] max-w-full flex-col border-l border-border bg-background shadow-lg'
      onKeyDown={(event) => {
        // Escape closes the topmost layer: a menu or a drawer inside the
        // panel takes it first.
        if (event.key === 'Escape' && !event.defaultPrevented) closeChat();
      }}
    >
      <PanelBody />
    </aside>
  );
}

function PanelBody({ modal = false }: { modal?: boolean }): ReactElement {
  const { text } = useCrmText();
  const panel = useChatPanel();
  const agents = useCrmChatAgents();
  const readiness = useAgentReadiness();
  const demo = useDemoSite();
  const list = useConversationList({});
  // The page's drawer when it draws one, else the panel's own (one
  // `?open=` never opens two).
  const pageHosts = useRecordDrawerHosted();
  const drawer = useRecordDrawerState({ host: false });
  const [drawerLoaded, setDrawerLoaded] = useState(false);
  if (!pageHosts && drawer.opened && !drawerLoaded) setDrawerLoaded(true);
  const conversationId = panel.conversationId;
  // A new conversation stays the same view once its first message creates
  // it; each New conversation starts afresh.
  const isNew = conversationId === null;
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
    isNew || conversationId === fresh.id
      ? `new-${String(fresh.session)}`
      : conversationId;
  const created = (conversation: ConversationDetail): void => {
    setFresh((current) => ({ ...current, id: conversation.id }));
    panel.selectConversation(conversation.id);
  };
  const name = useAssistantName();
  const role = useAssistantDescription();
  // A conversation under way is named in the panel's header, its title over
  // the agent and what it does, with its actions behind the "…" menu; the
  // conversation draws no header of its own here (`inPanel`).
  const open = useConversation(
    panel.view === 'history' ? null : conversationId,
  ).data;
  const actions = useConversationActions();
  const title = open ? open.title || name : name;
  const subtitle = open ? [name, role].filter(Boolean).join(' · ') : role;
  const iconButton = (
    label: string,
    icon: ReactElement,
    onClick: () => void,
    pressed?: boolean,
  ): ReactElement => (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            variant='ghost'
            size='icon-sm'
            aria-label={label}
            aria-pressed={pressed}
            onClick={onClick}
          />
        }
      >
        {icon}
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
  const history = panel.view === 'history';
  const body = (
    <div className='flex min-h-0 flex-1 flex-col px-4'>
      {!history &&
      !conversationId &&
      readiness.state === 'unavailable' &&
      !demo ? (
        // No agent to start a conversation with: why, not an empty picker.
        // A demo site's new conversation shows still, with the question an
        // ask box put in its composer and why it goes no further.
        <p className='m-auto max-w-xs py-10 text-center text-sm text-muted-foreground'>
          {readiness.reason}
        </p>
      ) : history ? (
        <div className='flex min-h-0 flex-1 flex-col pt-3'>
          <ConversationList
            query={list}
            openId={conversationId}
            archived={false}
            onOpen={(id) => panel.selectConversation(id)}
          />
        </div>
      ) : (
        <Conversation
          key={viewKey}
          conversationId={conversationId}
          agents={agents.data ?? []}
          onCreated={created}
          onArchived={() => panel.selectConversation(null)}
          onRestored={() => undefined}
          onBack={() => panel.setView('history')}
          // The remembered conversation gone (the demo data imported
          // again, say): a new one, as on opening the panel afresh; on a
          // demo site, where a new one takes no question, the latest of
          // the demo's own instead (reset daily, or another account's).
          onMissing={() =>
            panel.selectConversation(
              demo
                ? (listedConversations(list.data?.pages).find(
                    (conversation) => conversation.id !== conversationId,
                  )?.id ?? null)
                : null,
            )
          }
          inPanel
        />
      )}
    </div>
  );
  return (
    <RecordDrawerContext.Provider
      value={{ open: drawer.open, close: drawer.close, inDrawer: false }}
    >
      <header className='flex items-center gap-1 border-b border-border px-3 py-2'>
        {iconButton(
          toText(text('agentPanel.history')),
          <History />,
          () => panel.setView(history ? 'chat' : 'history'),
          history,
        )}
        <AgentAvatar
          name={name}
          size='sm'
          className='ml-1 shrink-0 rounded-full'
        />
        <div className='mx-1.5 min-w-0 flex-1'>
          {modal ? (
            <DialogTitle className='truncate text-sm font-medium'>
              {title}
            </DialogTitle>
          ) : (
            <p className='truncate text-sm font-medium'>{title}</p>
          )}
          {subtitle ? (
            <p className='truncate text-xs text-muted-foreground'>{subtitle}</p>
          ) : null}
        </div>
        {open && !open.archivedAt ? (
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant='ghost'
                  size='icon-sm'
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
                    { id: open.id, archived: true },
                    { onSuccess: () => panel.selectConversation(null) },
                  )
                }
              >
                <Archive />
                {text('agentChat.archive')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
        {iconButton(toText(text('agentPanel.newConversation')), <Plus />, () =>
          panel.selectConversation(null),
        )}
        {conversationId && panel.openPage && !modal
          ? iconButton(
              toText(text('agentPanel.openFullPage')),
              <Expand />,
              () => panel.openPage?.(conversationId),
            )
          : null}
        {iconButton(toText(text('agentPanel.close')), <X />, () =>
          panel.closeChat(),
        )}
      </header>
      {body}
      {!pageHosts && drawerLoaded ? (
        <Suspense fallback={null}>
          <RecordDrawer
            target={drawer.opened}
            open={drawer.open}
            close={drawer.close}
          />
        </Suspense>
      ) : null}
    </RecordDrawerContext.Provider>
  );
}
