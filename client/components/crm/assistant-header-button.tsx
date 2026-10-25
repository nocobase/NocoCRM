import {
  useChatPanel,
  useConversationList,
} from '@nocobase/app-plugin-agents/client/chat';
import { Sparkles } from 'lucide-react';
import type { ReactElement } from 'react';
import { Button } from '../ui/button.js';
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip.js';
import { toText, useCrmText } from './api.js';
import {
  listedConversations,
  useAgentReadiness,
  useDemoSite,
} from './agent-chat/ask.js';

// The assistant from the header, beside the appearance button, on every
// page, the ones the dock leaves out (assistant-dock.tsx) included. It
// toggles the panel as the plugin's ⌘J does: open where the person left it,
// the last conversation as the dock left it, or closed again; a new
// conversation is the panel's +. Disabled, saying why, while the assistant
// cannot answer; on a demo site it still opens the panel, whose
// conversations can be read though no question is sent, on the first of
// them unless one of them is already open (the one it remembers may be
// gone: the demo is reset daily, and another account has its own).
export function AssistantHeaderButton(): ReactElement | null {
  return useDemoSite() ? <DemoHeaderButton /> : <HeaderButton />;
}

// The demo site's: the conversations listed only there, so the button
// elsewhere asks for no list.
function DemoHeaderButton(): ReactElement | null {
  const panel = useChatPanel();
  const listed = listedConversations(useConversationList({}).data?.pages);
  const first = listed[0];
  const remembered = listed.some(
    (conversation) => conversation.id === panel.conversationId,
  );
  return (
    <HeaderButton
      demo
      onOpen={
        first && !remembered
          ? () => panel.openChat({ conversationId: first.id, view: 'chat' })
          : undefined
      }
    />
  );
}

function HeaderButton({
  demo = false,
  onOpen,
}: {
  demo?: boolean;
  // Opens the panel in place of toggling it, when it is closed.
  onOpen?: () => void;
}): ReactElement | null {
  const { text } = useCrmText();
  const readiness = useAgentReadiness();
  const panel = useChatPanel();
  if (readiness.state === 'loading') return null;
  const unavailable =
    readiness.state === 'unavailable' && !demo ? readiness.reason : undefined;
  const label = unavailable ?? toText(text('dock.open'));
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            aria-label={label}
            aria-expanded={panel.open}
            size='icon'
            variant='outline'
            disabled={Boolean(unavailable)}
            // As the appearance button beside it (theme-settings.tsx).
            className='size-10 rounded-xl border-border bg-background/60 hover:bg-accent/50'
            onClick={() =>
              !panel.open && onOpen ? onOpen() : panel.toggleChat()
            }
          />
        }
      >
        <Sparkles aria-hidden='true' className='size-5 text-primary' />
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}
