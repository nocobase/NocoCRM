import {
  CHAT_PANEL_ATTRIBUTE,
  useChatPanel,
} from '@nocobase/app-plugin-agents/client/chat';
import type { ModelChoice } from './agent-chat/ask.js';
import { useEffect, useRef, useState } from 'react';
import {
  recordPin,
  useAgentModels,
  useAgentReadiness,
  useAskAgent,
  useAskFiles,
} from './agent-chat/ask.js';
import type { Entity } from './api.js';
import type { CurrentRecord } from './current-record.js';

// What the assistant's ask boxes share: the dock at the bottom of the pages
// (assistant-dock.tsx) and the box at the top of the overview
// (assistant-ask-box.tsx). They ask the assistant, the CRM's agent on the Agents
// plugin, in its panel (agent-chat/).

// When the panel closes, focus left inside it (or fallen to the page) comes
// back to the box that `target` gives, when the reader was last in the box
// (`area`, the box with its buttons; `target` by default) before the panel
// took them: they asked there. A panel opened from elsewhere (the header's
// button, the conversations page) leaves the box alone when it closes, and
// focus the user has put elsewhere stays.
export function useFocusReturn(
  target: () => HTMLElement | null | undefined,
  area: () => HTMLElement | null | undefined = target,
): void {
  const panelOpen = useChatPanel().open;
  const wasOpenRef = useRef(panelOpen);
  // Whether the reader's last press or focus outside the panel was in the
  // box; a box shown with the panel already open was not where it opened.
  const inBoxRef = useRef(false);
  useEffect(() => {
    const note = (event: Event): void => {
      const node = event.target;
      if (!(node instanceof Element)) return;
      if (node.closest(`[${CHAT_PANEL_ATTRIBUTE}]`)) return;
      inBoxRef.current = Boolean(area()?.contains(node));
    };
    document.addEventListener('pointerdown', note, true);
    document.addEventListener('focusin', note, true);
    return () => {
      document.removeEventListener('pointerdown', note, true);
      document.removeEventListener('focusin', note, true);
    };
  }, [area]);
  // Run again with each render's `target`; it acts only on the render where
  // the panel has just closed.
  useEffect(() => {
    if (wasOpenRef.current && !panelOpen && inBoxRef.current) {
      const active = document.activeElement;
      const stranded =
        !active ||
        active === document.body ||
        !active.isConnected ||
        (typeof active.checkVisibility === 'function' &&
          !active.checkVisibility());
      if (stranded) target()?.focus();
    }
    wasOpenRef.current = panelOpen;
  }, [panelOpen, target]);
}

// Whether the panel shows: the dock hides then.
export function usePanelOpen(): boolean {
  return useChatPanel().open;
}

// A question being written in one of the ask boxes: its text, its files and
// the model picked, and sending it, which starts a conversation with the assistant
// (from the page's record, when given) and opens the panel on it.
export interface AskDraft {
  value: string;
  setValue: (value: string) => void;
  files: ReturnType<typeof useAskFiles>;
  models: readonly ModelChoice[];
  model: ModelChoice | undefined;
  selectModel: (key: string) => void;
  canSend: boolean;
  sending: boolean;
  // Sends the text given (a suggested question) or else the box's own;
  // false when there is nothing to send or the box cannot send yet.
  send: (prompt?: string) => boolean;
}

export function useAskDraft(
  record: CurrentRecord | undefined,
  disabled: boolean,
): AskDraft {
  const readiness = useAgentReadiness();
  const files = useAskFiles();
  const { models, model, select } = useAgentModels(readiness.agent);
  const askAgent = useAskAgent();
  const [value, setValue] = useState('');
  const [sending, setSending] = useState(false);
  const blocked = disabled || sending || files.uploading;
  const send = (prompt?: string): boolean => {
    const question = (prompt ?? value).trim();
    const agent = readiness.agent;
    if (blocked || !agent || (!question && !files.ready.length)) return false;
    const typed = value;
    const attachments = files.ready;
    setValue('');
    files.clear();
    setSending(true);
    askAgent({
      text: question,
      agent,
      attachments,
      ...(model ? { model } : {}),
      items: record
        ? [
            recordPin(
              record.entity as Entity,
              record.recordId,
              record.name ?? '',
            ),
          ]
        : [],
    })
      // Not even created: the question comes back to the box.
      .catch(() => setValue(typed))
      .finally(() => setSending(false));
    return true;
  };
  return {
    value,
    setValue,
    files,
    models,
    model,
    selectModel: select,
    canSend: !blocked && Boolean(value.trim() || files.ready.length),
    sending,
    send,
  };
}
