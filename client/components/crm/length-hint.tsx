import type { ReactElement } from 'react';
import { LONG_TEXT_LIMIT } from '../../../server/providers/crm/limits.js';

// A long text's count, shown once it nears the limit the field stops at, so
// the stop does not come as a surprise.
export function LengthHint({
  length,
  language,
}: {
  length: number;
  language: string;
}): ReactElement | null {
  if (length < LONG_TEXT_LIMIT * 0.9) return null;
  const format = new Intl.NumberFormat(language);
  return (
    <p className='mt-1 text-right text-xs text-muted-foreground tabular-nums'>
      {format.format(length)} / {format.format(LONG_TEXT_LIMIT)}
    </p>
  );
}
