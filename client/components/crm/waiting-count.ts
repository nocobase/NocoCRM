import { useEffect, useRef } from 'react';
import { useCrmQuery, useMetadata } from './api.js';

// How many AI suggestions wait on the reader ("Waiting on me",
// pages/crm-decisions.tsx), for the menu's badge and the browser tab: the
// tab's title leads with the count, "(3) NocoCRM", while there is one. Read
// again every half minute, every few seconds while a follow-up is still
// being worked on (so its card is counted as soon as it is ready, wherever
// the reader is), and at once whenever the CRM's data refreshes (a decision
// taken, an evaluation finished).
export function useWaitingCount(): number {
  const { data: meta } = useMetadata();
  const { data } = useCrmQuery<{ count: number; running?: number }>(
    'decisions/count',
    meta?.assistant === true,
    { refetchInterval: (latest) => (latest?.running ? 4000 : 30000) },
  );
  const count = meta?.assistant ? (data?.count ?? 0) : 0;
  const baseRef = useRef<string | null>(null);
  useEffect(() => {
    baseRef.current ??= document.title.replace(/^\(\d+\+?\) /, '');
    const base = baseRef.current;
    document.title =
      count > 0 ? `(${count > 99 ? '99+' : String(count)}) ${base}` : base;
  }, [count]);
  useEffect(
    () => () => {
      if (baseRef.current !== null) document.title = baseRef.current;
    },
    [],
  );
  return count;
}
