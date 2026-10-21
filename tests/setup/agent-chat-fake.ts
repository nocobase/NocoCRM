/* eslint-disable @eslint-react/no-unnecessary-use-prefix -- stand-ins for
   the plugin's hooks, named as the hooks they replace */
// A stand-in for the Agents plugin's headless chat
// (`@nocobase/app-plugin-agents/client/chat`) in component tests: the agents
// on offer (the native chat the CRM's assistant is), the chat models, the
// panel's state, and what the CRM asked of the chat (conversations created,
// messages sent through its submissions, the panel opened, pins). A test
// mocks the module with a factory returning `fakeChatModule` of the
// original module, and reads and resets `chatFake`.

type Row = Record<string, unknown>;

// The chat models the enabled services offer, as the picker lists them.
export const MODELS = [
  {
    modelService: 'qwen',
    model: 'qwen-max',
    serviceTitle: 'Qwen',
    modelLabel: 'Qwen Max',
  },
  {
    modelService: 'openai',
    model: 'gpt-5',
    serviceTitle: 'OpenAI',
    modelLabel: 'GPT 5',
  },
];

// The same, as the plugin's catalog has them.
const CATALOG = MODELS.map((model) => ({
  name: model.modelService,
  title: model.serviceTitle,
  provider: model.modelService,
  models: [
    {
      value: model.model,
      label: model.modelLabel,
      kind: 'chat',
      dimensions: null,
    },
  ],
}));

// The plugin's native chat, which the CRM names its assistant.
export const AI_AGENT = {
  id: 'online',
  name: 'Online agent',
  description: 'Chat with a configured model and registered tools.',
  nameText: null,
  descriptionText: null,
  avatar: null,
  runnerNames: [],
  personalOnly: false,
  isSystemDefault: true,
  isMyDefault: false,
  availability: { online: true, reason: null, onlineRunners: 0 },
};

export const chatFake = {
  loading: false,
  agents: [AI_AGENT] as Row[],
  open: false,
  conversationId: null as string | null,
  view: 'chat' as 'chat' | 'history',
  pinned: [] as Row[],
  draft: null as { text: string; nonce: number } | null,
  created: [] as Row[],
  sent: [] as Row[],
  opened: [] as Row[],
  cleared: 0,
  focused: 0,
  sendFails: false,
  // The person's conversations, newest first, and those archived.
  conversations: [] as { id: string; title: string | null; read: boolean }[],
  listFails: false,
  archived: [] as string[],
  // The messages a conversation shows (the search's answer), and the runs
  // stopped.
  messages: [] as Row[],
  stopped: [] as string[],
  reset(): void {
    this.loading = false;
    this.agents = [AI_AGENT];
    this.open = false;
    this.conversationId = null;
    this.view = 'chat';
    this.pinned = [];
    this.draft = null;
    this.created = [];
    this.sent = [];
    this.opened = [];
    this.cleared = 0;
    this.focused = 0;
    this.sendFails = false;
    this.conversations = [];
    this.listFails = false;
    this.archived = [];
    this.messages = [];
    this.stopped = [];
    submissions.records = [];
    submissions.listeners.clear();
    submissions.updated.clear();
  },
};

// The plugin's submissions: a message sent, in a new conversation created
// first when it has none, told to whoever listens as the plugin does.
type Listener = () => void;
type Updated = (detail: Row, record: Row, created: boolean) => void;
const submissions = {
  records: [] as Row[],
  listeners: new Set<Listener>(),
  updated: new Set<Updated>(),
  subscribe(listener: Listener) {
    submissions.listeners.add(listener);
    return () => submissions.listeners.delete(listener);
  },
  onUpdated(callback: Updated) {
    submissions.updated.add(callback);
    return () => submissions.updated.delete(callback);
  },
  snapshot: () => submissions.records,
  submit(input: Row): boolean {
    const record: Row = {
      ...input,
      clientId: `m${String(submissions.records.length + 1)}`,
      status: input.conversationId ? 'sending' : 'creating',
    };
    submissions.records = [...submissions.records, record];
    queueMicrotask(() => {
      if (chatFake.sendFails && !input.conversationId) {
        record.status = 'notSubmitted';
        for (const listener of submissions.listeners) listener();
        return;
      }
      let id = input.conversationId as string | null;
      if (!id) {
        chatFake.created.push(input.create as Row);
        id = `c${String(chatFake.created.length)}`;
        record.conversationId = id;
        for (const callback of submissions.updated)
          callback({ id }, record, true);
      }
      const attachments = (input.attachments ?? []) as { id: string }[];
      chatFake.sent.push({
        conversationId: id,
        content: input.content,
        ...(input.context ? { context: input.context } : {}),
        ...(attachments.length
          ? { attachmentIds: attachments.map((file) => file.id) }
          : {}),
      });
      record.status = 'confirmed';
      for (const listener of submissions.listeners) listener();
    });
    return true;
  },
};
const controller = { submissions };

const api = {
  configuration: () =>
    Promise.resolve({
      model: MODELS.map((model) => `${model.modelService}/${model.model}`),
      selectedModel: null,
    }),
  configure: () => Promise.resolve({}),
};

const attachments = {
  upload: (file: File) =>
    Promise.resolve({
      id: `f-${file.name}`,
      filename: file.name,
      ext: '',
      mimeType: file.type,
      size: file.size,
      contentUrl: '',
      downloadUrl: '',
      previewable: false,
    }),
  discard: () => undefined,
};

const sources = {
  items: [],
  filter: null,
  selection: null,
  removed: new Set<string>(),
  registerItem: () => () => undefined,
  registerFilter: () => () => undefined,
  remove: () => undefined,
};

function panel() {
  return {
    available: true,
    open: chatFake.open,
    mode: 'docked',
    view: chatFake.view,
    conversationId: chatFake.conversationId,
    newAgentId: null,
    pinned: chatFake.pinned,
    draft: chatFake.draft,
    source: 'panel',
    openChat: (options: Row = {}) => {
      chatFake.opened.push(options);
      if (options.pin)
        chatFake.pinned = [...chatFake.pinned, options.pin as Row];
    },
    closeChat: () => undefined,
    toggleChat: () => undefined,
    setMode: () => undefined,
    setView: () => undefined,
    selectConversation: (id: string | null) =>
      chatFake.opened.push({ conversationId: id }),
    clearPinned: () => {
      chatFake.cleared += 1;
      chatFake.pinned = [];
    },
    resetSource: () => undefined,
    registerComposer: () => () => undefined,
    focusComposer: () => {
      chatFake.focused += 1;
    },
    openPage: null,
    conversationPath: null,
  };
}

export function fakeChatModule(actual: Row): Row {
  return {
    ...actual,
    useChatAgents: () => ({
      data: chatFake.loading ? undefined : chatFake.agents,
      isLoading: chatFake.loading,
      error: null,
    }),
    useChatApi: () => api,
    useChatController: () => controller,
    useChatModels: () => ({ data: CATALOG, isLoading: false, error: null }),
    useChatStream: () => undefined,
    useSendMessage:
      ({ conversationId }: { conversationId: string | null }) =>
      (input: Row) =>
        submissions.submit({
          ...input,
          attachments: input.attachments ?? [],
          conversationId,
          editorKey: 'test',
          create: {},
        }),
    useChatAttachments: () => attachments,
    useChatSources: () => sources,
    useChatPanel: panel,
    useConversationList: () => ({
      data: chatFake.listFails
        ? undefined
        : {
            pages: [{ items: chatFake.conversations, nextCursor: null }],
            pageParams: [null],
          },
      isLoading: false,
      isError: chatFake.listFails,
      isFetching: false,
      hasNextPage: false,
      isFetchingNextPage: false,
      fetchNextPage: () => undefined,
      refetch: () => Promise.resolve(),
    }),
    useConversation: (id: string | null) => ({
      data: id
        ? { id, agent: AI_AGENT, run: null, execution: { status: 'idle' } }
        : undefined,
    }),
    useConversationMessages: () => ({
      items: chatFake.messages,
      pending: [],
      loaded: true,
      hasMore: false,
      lastSeq: chatFake.messages.length,
      loadOlder: () => undefined,
      fetchNewer: () => undefined,
      dispatch: () => undefined,
    }),
    useAgentText: () => ({
      name: (agent: { name?: string }) => agent.name,
      description: (agent: { description?: string | null }) =>
        agent.description ?? null,
    }),
    useConversationActions: () => ({
      stop: {
        mutateAsync: (id: string) => {
          chatFake.stopped.push(id);
          return Promise.resolve({});
        },
      },
      archive: {
        isPending: false,
        mutate: (
          input: { id: string; archived: boolean },
          options?: { onSuccess?: () => void },
        ) => {
          chatFake.archived.push(input.id);
          chatFake.conversations = chatFake.conversations.filter(
            (item) => item.id !== input.id,
          );
          options?.onSuccess?.();
        },
      },
      markRead: () => undefined,
    }),
  };
}
