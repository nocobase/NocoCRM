import {
  chatIsRunning,
  useChatStream,
  useConversation,
  useConversationMessages,
} from '@nocobase/app-plugin-agents/client/chat';
import { ArrowLeft, MessageSquarePlus, Sparkles } from 'lucide-react';
import type { ReactElement } from 'react';
import { Button } from '../../ui/button.js';
import { Spinner } from '../../ui/spinner.js';
import { useCrmText } from '../api.js';
import { ErrorNotice } from '../common.js';
import { useAssistantName } from './ask.js';
import { AgentReply, LiveLine } from './conversation.js';
import { liveStep } from './step-text.js';

// A question from the global search answered in its dialog
// (search-dialog.tsx): the question, then the reply as it is written, the
// line saying what the AI is doing while it works; under them the way back
// to the results, which discards it, and going on asking, which keeps it as
// a conversation and opens it in the panel.
export function SearchAnswer({
  conversationId,
  question,
  error,
  onBack,
  onContinue,
}: {
  // Null while the conversation is being created.
  conversationId: string | null;
  question: string;
  // The question could not be asked.
  error: unknown;
  // Back to the results, told whether a reply is still being written.
  onBack: (running: boolean) => void;
  onContinue: () => void;
}): ReactElement {
  const { text } = useCrmText();
  const detail = useConversation(conversationId);
  const conversation = detail.data;
  const stream = useChatStream(conversationId);
  const running =
    chatIsRunning(conversation ?? null) ||
    stream?.status === 'submitted' ||
    stream?.status === 'streaming';
  const messages = useConversationMessages(conversationId);
  const replies = messages.items.flatMap((message) => {
    if (message.role !== 'assistant') return [];
    const content = message.parts
      .flatMap((part) => (part.type === 'text' ? [part.text] : []))
      .join('\n\n');
    return content.trim() ? [{ message, content }] : [];
  });
  const name = useAssistantName();
  return (
    <div className='flex max-h-[min(70svh,40rem)] flex-col'>
      <div className='flex items-start gap-2 border-b border-border px-4 py-3'>
        <Sparkles className='mt-0.5 size-4 shrink-0 text-primary' />
        <p className='min-w-0 flex-1 text-sm font-medium break-words'>
          {question}
        </p>
      </div>
      <div className='min-h-24 flex-1 overflow-y-auto px-4 py-3'>
        {error ? (
          <ErrorNotice error={error} />
        ) : (
          <div className='flex flex-col gap-3'>
            {replies.map(({ message, content }) => (
              <AgentReply
                key={message.id}
                content={content}
                {...(message.metadata?.createdAt
                  ? { at: message.metadata.createdAt }
                  : {})}
              />
            ))}
            {running && replies.length ? (
              <LiveLine
                step={liveStep(messages.items.at(-1))}
                agentName={name}
              />
            ) : !replies.length ? (
              <p
                role='status'
                className='flex items-center gap-2 text-sm text-muted-foreground'
              >
                <Spinner />
                {text('globalSearch.answering')}
              </p>
            ) : null}
          </div>
        )}
      </div>
      <div className='flex items-center justify-between gap-2 border-t border-border px-3 py-2'>
        <Button variant='ghost' size='sm' onClick={() => onBack(running)}>
          <ArrowLeft />
          {text('globalSearch.backToResults')}
        </Button>
        <Button
          size='sm'
          className='bg-primary text-primary-foreground hover:bg-primary/90'
          disabled={!conversationId || Boolean(error)}
          onClick={onContinue}
        >
          <MessageSquarePlus />
          {text('globalSearch.continueAsking')}
        </Button>
      </div>
    </div>
  );
}
