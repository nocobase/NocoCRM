import type { ReactElement } from 'react';
import { Sparkles } from 'lucide-react';
import { Badge } from '../ui/badge.js';
import { Spinner } from '../ui/spinner.js';
import { useCrmText } from './api.js';
import { aiStateWords, type AiWork } from './ai-state-words.js';

// What the AI is doing on a record, as a tag: at work on it, or its
// suggestion waiting. One look wherever it shows (a list's row, a board's
// card, the chip atop the record's own page), so the same state reads the
// same: in the AI's tint, a spinner while it works, its spark once done.
function AiStateIcon({
  state,
}: {
  state: 'running' | 'pending';
}): ReactElement {
  return state === 'running' ? (
    <Spinner className='size-3' />
  ) : (
    <Sparkles className='size-3' />
  );
}

export function AiStateTag({
  state,
  work,
  className = '',
}: {
  state: 'running' | 'pending' | undefined;
  work: AiWork;
  className?: string;
}): ReactElement | null {
  const { text } = useCrmText();
  if (!state) return null;
  return (
    <Badge variant='ai' className={`gap-1 ${className}`}>
      <AiStateIcon state={state} />
      {text(aiStateWords[work][state])}
    </Badge>
  );
}
