import { useEffect } from 'react';
import { useRefresh } from './api.js';

// Write calls this page has seen before they finished (waiting for the user
// or running). A call that later succeeds changed CRM data, so the pages
// beside the conversation reload theirs; a card read back from history is
// already finished and never enters the set, so reopening a conversation
// refreshes nothing. Kept outside the component so a card that re-renders or
// remounts as the message streams still counts.
const unfinishedCalls = new Set<string>();

// The plugin runs an allowed write on the server; the CRM's cached lists and
// records do not know. Once a call goes from unfinished to written, reload
// them, the way the pages do after their own saves.
export function useRefreshAfterWrite(
  toolCallId: string,
  state: string,
  written: boolean,
): void {
  const refresh = useRefresh();
  if (state !== 'output-available' && state !== 'output-error')
    unfinishedCalls.add(toolCallId);
  useEffect(() => {
    if (state === 'output-error') {
      unfinishedCalls.delete(toolCallId);
      return;
    }
    if (!written || !unfinishedCalls.has(toolCallId)) return;
    unfinishedCalls.delete(toolCallId);
    void refresh();
  }, [written, state, toolCallId, refresh]);
}
