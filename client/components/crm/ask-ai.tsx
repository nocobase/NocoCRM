import { Sparkles } from 'lucide-react';
import type { ReactElement } from 'react';
import { Button } from '../ui/button.js';
import { toText, useAssistantAvailable, useCrmText } from './api.js';

// "Ask AI" on a record, on its page and in the record drawer alike: opens the
// assistant on a new conversation whose starting point is this record, shown
// atop the chat (ai-chat.tsx), with an empty composer for the question. The
// one way a record becomes the conversation's subject; being on its page
// attaches nothing. Hidden while the assistant is off.
export function AskAIButton({
  entity,
  recordId,
  name,
}: {
  entity: string;
  recordId: string;
  // The record's title as its page shows it.
  name?: string;
}): ReactElement | null {
  const { text } = useCrmText();
  if (!useAssistantAvailable()) return null;
  return (
    <Button
      variant='ghost'
      className='text-ai hover:text-ai'
      onClick={() =>
        window.dispatchEvent(
          new CustomEvent('crm-assistant', {
            detail: {
              prompt: '',
              entity,
              recordId,
              ...(name ? { name } : {}),
              send: false,
              newConversation: true,
            },
          }),
        )
      }
    >
      <Sparkles />
      {toText(text('evaluation.ask'))}
    </Button>
  );
}
