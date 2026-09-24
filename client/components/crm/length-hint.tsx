import type { ReactElement } from 'react';
import { LONG_TEXT_LIMIT } from '../../../server/providers/crm/limits.js';

// A field's count, shown once it nears the limit the field stops at, and red
// at the limit, so typing that stops there does not stop without a reason.
export function LengthHint({
  length,
  language,
  max = LONG_TEXT_LIMIT,
}: {
  length: number;
  language: string;
  max?: number;
}): ReactElement | null {
  if (length < max * 0.9) return null;
  const format = new Intl.NumberFormat(language);
  return (
    <p
      className={`mt-1 text-right text-xs tabular-nums ${length >= max ? 'text-destructive' : 'text-muted-foreground'}`}
    >
      {format.format(length)} / {format.format(max)}
    </p>
  );
}
