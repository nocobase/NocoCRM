import { useToaster } from '@nocobase/app-client';
import {
  buildPageContext,
  chatKeys,
  useChatAgents,
  useChatAttachments,
  useChatController,
  useChatModels,
  useAgentText,
  useChatPanel,
  useConversationActions,
  type ChatContextItem,
} from '@nocobase/app-plugin-agents/client/chat';
import type {
  ChatAgent,
  ConversationDetail,
  MessageAttachment,
  PageContext,
} from '@nocobase/app-plugin-agents/shared/conversations';
import {
  CHAT_ATTACHMENT_SIZE_MAX,
  CHAT_ATTACHMENTS_PER_MESSAGE_MAX,
} from '@nocobase/app-plugin-agents/shared/conversations';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo, useState } from 'react';
import { toText, useCrmApi, useCrmText, type Entity } from '../api.js';

// The CRM's ways into the assistant's chat from outside its panel: whether
// it can answer, the models a new conversation may answer with, the files a
// question carries, asking a question at once (the dock, the overview's
// box, the global search) and opening a conversation to discuss a record or
// an AI card on it (the cards' Discuss). Built on the Agents plugin's
// headless chat; the panel itself is panel.tsx.
//
// The assistant, Sales Expert, is the plugin's native chat (the built-in
// `online` agent) with the CRM's scope (server/providers/crm-agents/
// assistant.ts), which every conversation the CRM starts is created with:
// the scope gives it the CRM's prompt and tools.

// An id for what the browser sends or uploads, matched in the answer.
const newClientId = (): string => crypto.randomUUID();

// Where the CRM's conversations come from (registered by the server's
// CrmAgentsProvider).
export const CRM_SOURCE = 'crm';
// The assistant: the plugin's native chat, and the scope that makes it the
// CRM's.
export const ASSISTANT_AGENT_ID = 'online';
const CRM_SCOPE = 'crm';
// A question asked from the global search, answered in its dialog
// (server/providers/crm-agents/search-answers.ts).
export const SEARCH_SOURCE = 'crm-search';

// The conversations a list shows: every page's, without the search's
// answers still being read in its dialog (or left behind there), which are
// a conversation only once the person goes on asking.
export function listedConversations<T extends { readonly source: string }>(
  pages: readonly { readonly items: readonly T[] }[] | undefined,
): T[] {
  return (pages ?? [])
    .flatMap((page) => page.items)
    .filter((conversation) => conversation.source !== SEARCH_SOURCE);
}

export type AgentReadiness =
  | { state: 'loading'; agent: null; reason?: undefined }
  | { state: 'ready'; agent: ChatAgent; reason?: undefined }
  | { state: 'unavailable'; agent: ChatAgent | null; reason: string };

// The agents a person chats with: the assistant alone, the plugin's native
// chat named as the CRM names it (Sales Expert, in the viewer's language);
// the agents runners report work on the CRM through its CLI, not here.
export function useCrmChatAgents(): ReturnType<typeof useChatAgents> {
  const agents = useChatAgents();
  const data = useMemo(
    () =>
      agents.data
        ?.filter((agent) => agent.id === ASSISTANT_AGENT_ID)
        .map((agent): ChatAgent => ({
          ...agent,
          name: 'Sales Expert',
          nameText: { key: 'crm.agentPreset.agentName', ns: 'crm' },
          description: 'CRM assistant',
          descriptionText: { key: 'crm.agentPreset.description', ns: 'crm' },
        })),
    [agents.data],
  );
  return { ...agents, data } as ReturnType<typeof useChatAgents>;
}

// The assistant's name in the viewer's language (Sales Expert, 销售专家),
// and what it does. The plugin lists the assistant only while a chat model
// is set up, so without one it is still named as the CRM names it.
export function useAssistantName(): string {
  const { text } = useCrmText();
  const agentText = useAgentText();
  const agent = useCrmChatAgents().data?.[0];
  return (
    (agent ? agentText.name(agent) : null) ??
    toText(text('agentPreset.agentName'))
  );
}

export function useAssistantDescription(): string {
  const { text } = useCrmText();
  const agentText = useAgentText();
  const agent = useCrmChatAgents().data?.[0];
  return (
    (agent ? agentText.description(agent) : null) ??
    toText(text('agentPreset.description'))
  );
}

// The assistant, and whether it can answer now.
export function useAgentReadiness(): AgentReadiness {
  const { text } = useCrmText();
  const agents = useCrmChatAgents();
  if (agents.isLoading) return { state: 'loading', agent: null };
  const agent = agents.data?.[0] ?? null;
  if (!agent)
    return {
      state: 'unavailable',
      agent: null,
      reason: toText(text('agentPanel.notSetUp')),
    };
  if (!agent.availability.online)
    return {
      state: 'unavailable',
      agent,
      reason: toText(
        text(
          `agentChat.offline.${agent.availability.reason ?? 'agentMissing'}`,
        ),
      ),
    };
  return { state: 'ready', agent };
}

// A model a conversation may answer with: its service and model, and how
// the picker names it.
export interface ModelChoice {
  modelService: string;
  model: string;
  modelLabel: string;
  serviceTitle: string;
}

// A model choice by a key a select can hold.
export const modelKey = (
  model: Pick<ModelChoice, 'modelService' | 'model'>,
): string => `${model.modelService}/${model.model}`;

const MODEL_KEY = 'nococrm:agent-model';

// Every chat model of the enabled services, in the order the assistant's
// scope lists them (DeepSeek's services first, the first the default).
export function useChatModelChoices(enabled = true): readonly ModelChoice[] {
  const catalog = useChatModels(enabled);
  return useMemo(() => {
    const services = catalog.data ?? [];
    return [
      ...services.filter((service) => service.provider === 'deepseek'),
      ...services.filter((service) => service.provider !== 'deepseek'),
    ].flatMap((service) =>
      service.models
        .filter((model) => model.kind === 'chat')
        .map((model) => ({
          modelService: service.name,
          model: model.value,
          modelLabel: model.label || model.value,
          serviceTitle: service.title || service.name,
        })),
    );
  }, [catalog.data]);
}

// The models a new conversation may answer with (the first the default)
// and the one picked for the next conversation, which this browser
// remembers.
export function useAgentModels(agent: ChatAgent | null): {
  models: readonly ModelChoice[];
  model: ModelChoice | undefined;
  select: (key: string) => void;
} {
  const models = useChatModelChoices(Boolean(agent));
  const [key, setKey] = useState(() => {
    try {
      return localStorage.getItem(MODEL_KEY) ?? '';
    } catch {
      return '';
    }
  });
  const select = useCallback((next: string): void => {
    setKey(next);
    try {
      localStorage.setItem(MODEL_KEY, next);
    } catch {
      // Storage may be unavailable; the choice then lasts for the page.
    }
  }, []);
  return {
    models,
    model: models.find((item) => modelKey(item) === key) ?? models[0],
    select,
  };
}

// Sends a message as the plugin's chat does (its submissions, which show it
// at once in the conversation and reconcile it with what the server saved),
// starting a new conversation with the CRM's scope when `conversationId` is
// null. Answers whether it was taken; `created` is told the new
// conversation, `failed` that it could not be created.
export function useCrmSubmit(): (input: {
  content: string;
  context: PageContext | undefined;
  attachments: readonly MessageAttachment[];
  conversationId: string | null;
  source: string;
  model?: Pick<ModelChoice, 'modelService' | 'model'>;
  created?: (conversation: ConversationDetail) => void;
  failed?: () => void;
}) => boolean {
  const controller = useChatController();
  return useCallback(
    ({
      content,
      context,
      attachments,
      conversationId,
      source,
      model,
      created,
      failed,
    }) => {
      const submissions = controller.submissions;
      // The message's id among the submissions, known once it is taken.
      const submission: { clientId?: string } = {};
      const off = submissions.onUpdated((detail, record, isNew) => {
        if (record.clientId !== submission.clientId || !isNew) return;
        off();
        stop();
        created?.(detail);
      });
      const stop = submissions.subscribe(() => {
        const record = submissions
          .snapshot()
          .find((item) => item.clientId === submission.clientId);
        if (
          record &&
          !record.conversationId &&
          (record.status === 'notSubmitted' ||
            record.status === 'creationUnknown')
        ) {
          off();
          stop();
          failed?.();
        }
      });
      const taken = submissions.submit({
        content,
        context,
        attachments,
        conversationId,
        editorKey: `crm:${source}:${conversationId ?? newClientId()}`,
        create: {
          agentId: ASSISTANT_AGENT_ID,
          source,
          config: { scope: [CRM_SCOPE] },
          ...(model
            ? {
                selectedModel: {
                  modelService: model.modelService,
                  model: model.model,
                },
              }
            : {}),
        },
      });
      if (!taken) {
        off();
        stop();
        return false;
      }
      submission.clientId = submissions.snapshot().at(-1)?.clientId;
      if (conversationId) {
        off();
        stop();
      }
      return true;
    },
    [controller],
  );
}

// A file a question carries: uploading, sent once done, or refused.
export interface AskFile {
  uid: string;
  filename: string;
  size: number;
  mimeType: string;
  status: 'uploading' | 'done' | 'error';
  attachment?: MessageAttachment;
  error?: string;
}

// The files of a question, uploaded through the plugin as soon as they are
// picked, within its limits (size, count); the plugin's own error toasts
// tell why one is refused.
export function useAskFiles(): {
  files: readonly AskFile[];
  uploading: boolean;
  ready: readonly MessageAttachment[];
  upload: (files: readonly File[]) => void;
  remove: (uid: string) => void;
  clear: () => void;
} {
  const { text } = useCrmText();
  const toaster = useToaster();
  const uploads = useChatAttachments();
  const [files, setFiles] = useState<readonly AskFile[]>([]);
  const upload = useCallback(
    (picked: readonly File[]): void => {
      const room = CHAT_ATTACHMENTS_PER_MESSAGE_MAX - files.length;
      if (picked.length > room)
        toaster.show({
          type: 'error',
          title: toText(
            text('agentPanel.tooManyFiles', {
              count: CHAT_ATTACHMENTS_PER_MESSAGE_MAX,
            }),
          ),
        });
      const accepted = picked.slice(0, Math.max(0, room)).filter((file) => {
        if (file.size <= CHAT_ATTACHMENT_SIZE_MAX) return true;
        toaster.show({
          type: 'error',
          title: toText(text('agentPanel.fileTooLarge', { name: file.name })),
        });
        return false;
      });
      const pending = accepted.map((file) => ({
        file,
        entry: {
          uid: newClientId(),
          filename: file.name || `pasted-${String(Date.now())}`,
          size: file.size,
          mimeType: file.type,
          status: 'uploading' as const,
        } satisfies AskFile,
      }));
      setFiles((current) => [...current, ...pending.map(({ entry }) => entry)]);
      const settle = (uid: string, change: Partial<AskFile>): void =>
        setFiles((list) =>
          list.map((item) =>
            item.uid === uid ? { ...item, ...change } : item,
          ),
        );
      for (const { file, entry } of pending)
        uploads.upload(file).then(
          (attachment) => settle(entry.uid, { status: 'done', attachment }),
          (error: unknown) => {
            settle(entry.uid, {
              status: 'error',
              ...(error instanceof Error ? { error: error.message } : {}),
            });
            toaster.show({
              type: 'error',
              title: toText(
                text('agentPanel.uploadFailed', { name: entry.filename }),
              ),
            });
          },
        );
    },
    [files.length, text, toaster, uploads],
  );
  const remove = useCallback(
    (uid: string) => {
      const gone = files.find((item) => item.uid === uid);
      if (gone?.attachment) uploads.discard(gone.attachment);
      setFiles((current) => current.filter((item) => item.uid !== uid));
    },
    [files, uploads],
  );
  const clear = useCallback(() => setFiles([]), []);
  return {
    files,
    uploading: files.some((item) => item.status === 'uploading'),
    ready: files.flatMap((item) =>
      item.status === 'done' && item.attachment ? [item.attachment] : [],
    ),
    upload,
    remove,
    clear,
  };
}

// A record as a pinned context item: the chip's label is the client's own.
export function recordPin(
  entity: Entity,
  id: string,
  label: string,
): ChatContextItem {
  return { kind: entity, id, label };
}

// An AI card on a record (a follow-up, a review, a preparation) as a pinned
// item: the history entry's id, which the server resolves for the agent.
export function cardPin(entryId: string, label: string): ChatContextItem {
  return { kind: 'crm-evaluation', id: entryId, label };
}

// The page context a question is sent with: the given items only, as the
// plugin builds it (no page sources, no selection).
export function contextOf(route: string, items: readonly ChatContextItem[]) {
  return buildPageContext({
    route,
    pinned: items,
    sources: [],
    filter: null,
    selection: null,
    removed: new Set(),
  });
}

// Asking the assistant at once from outside the panel (the dock, the
// overview's box): the conversation is created and the question sent, and
// the panel opens on it, where the question shows at once (sending, or not
// sent with a button to send it again). One not created leaves the text
// with the caller (the promise rejects).
export function useAskAgent(): (question: {
  text: string;
  items?: readonly ChatContextItem[];
  attachments?: readonly MessageAttachment[];
  model?: ModelChoice;
  agent: ChatAgent;
}) => Promise<void> {
  const submit = useCrmSubmit();
  const panel = useChatPanel();
  const toaster = useToaster();
  const { text } = useCrmText();
  return useCallback(
    ({ text: content, items = [], attachments = [], model }) =>
      new Promise<void>((resolve, reject) => {
        // The page it was asked on, as the address bar shows it.
        const context = contextOf(window.location.pathname, items);
        const taken = submit({
          content,
          context,
          attachments,
          conversationId: null,
          source: CRM_SOURCE,
          ...(model ? { model } : {}),
          created: (conversation) => {
            // What a pin brought is sent with this question; nothing stays
            // for the next one.
            panel.clearPinned();
            panel.openChat({ conversationId: conversation.id, view: 'chat' });
            resolve();
          },
          failed: () => {
            toaster.show({
              type: 'error',
              title: toText(text('agentPanel.sendFailed')),
            });
            reject(new Error('The conversation was not created.'));
          },
        });
        if (!taken) reject(new Error('The question was not taken.'));
      }),
    [submit, panel, toaster, text],
  );
}

// Opening a new conversation about a record, or an AI card on it (the
// cards' Discuss), sending nothing: the earlier pins are dropped first, so a
// second Discuss replaces them.
export function useDiscuss(): (pins: readonly ChatContextItem[]) => void {
  const panel = useChatPanel();
  return useCallback(
    (pins) => {
      panel.clearPinned();
      // A new conversation, then each pin into it (one per call).
      panel.openChat({ conversationId: null, view: 'chat' });
      for (const pin of pins) panel.openChat({ pin });
      panel.focusComposer();
    },
    [panel],
  );
}

// A question from the global search, answered in its dialog: the
// conversation is created and the question sent, nothing opened; the
// conversation's id comes back for the dialog to follow. Going on asking
// keeps it (and opens the panel on it); leaving the answer discards it,
// stopping a reply still being written first.
export function useSearchAnswer(): {
  start: (question: string) => Promise<string>;
  keep: (conversationId: string) => Promise<void>;
  discard: (conversationId: string, running: boolean) => void;
} {
  const submit = useCrmSubmit();
  const crm = useCrmApi();
  const panel = useChatPanel();
  const actions = useConversationActions();
  const queryClient = useQueryClient();
  return useMemo(
    () => ({
      start: (question) =>
        new Promise<string>((resolve, reject) => {
          const taken = submit({
            content: question,
            context: undefined,
            attachments: [],
            conversationId: null,
            source: SEARCH_SOURCE,
            created: (conversation) => resolve(conversation.id),
            failed: () =>
              reject(new Error('The conversation was not created.')),
          });
          if (!taken) reject(new Error('The question was not taken.'));
        }),
      keep: async (conversationId) => {
        await crm(
          `searchAnswers/${encodeURIComponent(conversationId)}/keep`,
          'POST',
          {},
        );
        // Now one of the CRM's conversations, which the lists show.
        void queryClient.invalidateQueries({ queryKey: chatKeys.lists });
        panel.openChat({ conversationId, view: 'chat' });
        panel.focusComposer();
      },
      discard: (conversationId, running) => {
        void (async () => {
          if (running)
            await actions.stop
              .mutateAsync(conversationId)
              .catch(() => undefined);
          await crm(
            `searchAnswers/${encodeURIComponent(conversationId)}`,
            'DELETE',
          );
        })().catch(() => undefined);
      },
    }),
    [submit, crm, panel, actions.stop, queryClient],
  );
}
