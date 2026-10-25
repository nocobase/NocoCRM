import { Sparkles } from 'lucide-react';
import { useRef, type ReactElement } from 'react';
import { Button } from '../ui/button.js';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '../ui/tooltip.js';
import { toText, useCrmText } from './api.js';
import { useAskDraft, useFocusReturn } from './assistant-ask.js';
import { AskComposer } from './assistant-ask-composer.js';
import { useAgentReadiness, useDemoSite } from './agent-chat/ask.js';

// The overview's ask box: the first thing on the page, in its flow rather
// than floating like the dock (which the overview does not show), always
// expanded (assistant-ask-composer.tsx), with the questions the overview's
// figures suggest under it (`questions`: none, rather than the same three
// for everyone there were until 2026-10-16). Sending starts a conversation with the assistant that
// sends the question with its files on the model picked, and opens the
// panel on it. While the agents are still loading it is drawn disabled, so
// nothing below it moves once the assistant is ready; while the assistant cannot answer the
// reason is its placeholder and tooltip.
export function AssistantAskBox({
  questions = [],
}: {
  // Each a question in words, sent as it reads.
  questions?: readonly { key: string; text: string }[];
} = {}): ReactElement | null {
  const { text } = useCrmText();
  const readiness = useAgentReadiness();
  // A demo site takes no question, but the box still opens the panel on
  // one (useAskDraft), as the dock does.
  const demo = useDemoSite();
  const disabled = readiness.state !== 'ready' && !demo;
  const draft = useAskDraft(undefined, disabled);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  useFocusReturn(
    () => inputRef.current,
    () => boxRef.current,
  );

  const unavailable =
    readiness.state === 'unavailable' && !demo ? readiness.reason : undefined;
  const placeholder = unavailable ?? toText(text('dock.placeholder'));

  const box = (
    <AskComposer
      draft={draft}
      placeholder={placeholder}
      disabled={disabled}
      expanded
      inputRef={inputRef}
      className='rounded-3xl'
      inputClassName='px-5 pt-4 pb-1 text-base md:text-base'
    />
  );

  return (
    <TooltipProvider>
      <div ref={boxRef} className='flex flex-col'>
        {unavailable ? (
          // Disabled controls take no pointer events, so the reason's
          // tooltip hangs on a wrapper around the box.
          <Tooltip>
            <TooltipTrigger render={<div className='w-full' />}>
              {box}
            </TooltipTrigger>
            <TooltipContent>{unavailable}</TooltipContent>
          </Tooltip>
        ) : (
          box
        )}
        {/* The reason, when there is one, shows in the box right above, so
            the chips carry no tooltip of their own. A chip sends its
            question with the files attached, on the model picked. */}
        {questions.length ? (
          <ul
            aria-label={toText(text('dock.suggestions'))}
            className='mt-4 flex flex-wrap justify-center gap-2'
          >
            {questions.map((question) => (
              <li key={question.key}>
                <Button
                  variant='outline'
                  size='sm'
                  disabled={disabled || draft.files.uploading}
                  className='rounded-full font-normal'
                  onClick={() => draft.send(question.text)}
                >
                  <Sparkles className='text-primary' />
                  {question.text}
                </Button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </TooltipProvider>
  );
}
