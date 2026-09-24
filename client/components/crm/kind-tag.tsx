import type { ReactElement } from 'react';
import { toText, useCrmText } from './api.js';

// An activity's type and an approval's topic say what kind of thing a row is,
// not where it stands, so they are drawn apart from the status badges: a
// muted square tag, where a status is a coloured pill.
export function KindTag({ value }: { value: unknown }): ReactElement {
  const { text } = useCrmText();
  const kind = toText(value ?? '');
  return (
    <span className='inline-flex h-5 shrink-0 items-center rounded-md bg-muted px-1.5 text-xs font-medium whitespace-nowrap text-muted-foreground'>
      {text(`options.${kind}`, { defaultValue: kind })}
    </span>
  );
}
