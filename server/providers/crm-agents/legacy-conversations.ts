import type { Agents } from '@nocobase/app-plugin-agents/server/tokens';
import { validateAppUIMessages } from '@nocobase/app-plugin-agents/server/online-agent';
import { toText } from '../crm/schema.js';
import type { CrmService } from '../crm/service.js';
import { jsonValue } from '../crm/values.js';
import { ASSISTANT_SCOPE, assistantActor } from './assistant.js';

// @temporary(nocobase-official): the Agents plugin 1.0 keeps no online
// agents, and its chat reads only conversations bound to its native chat,
// so the conversations people had with the CRM's earlier assistant could no
// longer be opened. Each is turned, once and in place, into a conversation
// of the assistant as it is now (its id kept, so the plans and AI work
// noted against it stay its own): bound to the CRM's scope as resolved for
// its owner, each message kept as the SDK message the plugin stores (its
// text; a notice as the notice it was). Remove once the plugin carries such
// conversations over itself.

const MARKER = 'agents-native-conversations-v1';

type Part = Record<string, unknown>;

// A legacy message's parts: its text, or for a notice the notice.
function partsOf(row: {
  id: unknown;
  role: string;
  content: unknown;
  metadata: unknown;
}): Part[] {
  const content = jsonValue(row.content) as { content?: unknown } | null;
  const text = toText(content?.content ?? '');
  if (row.role !== 'system')
    return text.trim()
      ? [
          row.role === 'assistant'
            ? { type: 'text', text, state: 'done' }
            : { type: 'text', text },
        ]
      : [];
  const notice = (
    jsonValue(row.metadata) as { notice?: Record<string, unknown> } | null
  )?.notice;
  const code = toText(notice?.code ?? '');
  if (code === 'news') {
    const params = (notice?.params ?? {}) as Record<string, unknown>;
    return [
      {
        type: 'data-notice',
        id: `record:${toText(row.id)}`,
        data: {
          type: toText(notice?.type ?? 'news'),
          title: toText(notice?.title ?? text).slice(0, 500),
          params: Object.fromEntries(
            Object.entries(params).map(([key, value]) => [
              key,
              typeof value === 'string' ? value : JSON.stringify(value),
            ]),
          ),
        },
      },
    ];
  }
  return [
    {
      type: 'data-notice',
      id: `record:${toText(row.id)}`,
      data: {
        type: code === 'runFailed' ? 'failed' : code || 'notice',
        title: text.slice(0, 500),
      },
    },
  ];
}

export async function adoptLegacyConversations(
  agents: Agents,
  service: CrmService,
  logger: { warn(details: object, message: string): void },
): Promise<void> {
  const query = service.database.query();
  const done = await query
    .selectFrom('crmSettings')
    .select('id')
    .where('id', '=', MARKER)
    .executeTakeFirst();
  if (done) return;
  const legacy = await query
    .selectFrom('agConversations')
    .select(['id', 'userId', 'modelService', 'model'])
    .where('metadata', 'is', null)
    .where('mode', '=', 'online')
    .execute();
  const configs = new Map<string, unknown>();
  let adopted = 0;
  for (const conversation of legacy) {
    const id = toText(conversation.id);
    const userId = toText(conversation.userId);
    try {
      if (!configs.has(userId))
        configs.set(
          userId,
          await agents.onlineAgent.configurator.resolve(
            assistantActor(service, userId),
            { scope: [ASSISTANT_SCOPE], agentId: 'online' },
          ),
        );
      const rows = await query
        .selectFrom('agConversationMessages')
        .select([
          'id',
          'seq',
          'role',
          'content',
          'metadata',
          'workContext',
          'createdAt',
        ])
        .where('conversationId', '=', id)
        .orderBy('seq')
        .execute();
      await service.database.transaction(async ({ query: tx }) => {
        for (const found of rows) {
          const row = found as Record<string, unknown>;
          const role = toText(row.role);
          const parts = partsOf({
            id: row.id,
            role,
            content: row.content,
            metadata: row.metadata,
          });
          if (!parts.length) continue;
          const createdAt = new Date(toText(row.createdAt)).toISOString();
          const base = {
            id: toText(row.id),
            role,
            metadata: {
              conversationId: id,
              createdAt,
              revision: 1,
              seq: Number(row.seq),
            },
            parts,
          };
          // The page context a question carried, where the plugin's
          // validation takes it as it was stored.
          const context = role === 'user' ? jsonValue(row.workContext) : null;
          let original: unknown = base;
          if (context && typeof context === 'object') {
            const withContext = {
              ...base,
              metadata: { ...base.metadata, context },
            };
            original = await validateAppUIMessages([withContext])
              .then(() => withContext)
              .catch(() => base);
          }
          await validateAppUIMessages([original]);
          const content = jsonValue(row.content) as {
            content?: unknown;
          } | null;
          await tx
            .updateTable('agConversationMessages')
            .set({
              content: JSON.stringify({
                type: 'text',
                content: toText(content?.content ?? ''),
                original,
              }),
            })
            .where('id', '=', toText(row.id))
            .execute();
        }
        // The model it answers with: its own while the scope still offers
        // it, else the scope's first, as a new conversation starts on.
        const offered =
          (configs.get(userId) as { model?: string[] }).model ?? [];
        const own = `${toText(conversation.modelService)}/${toText(conversation.model)}`;
        const [modelService, ...model] = (
          offered.includes(own) ? own : toText(offered[0] ?? '')
        ).split('/');
        await tx
          .updateTable('agConversations')
          .set({
            agentId: '0',
            modelService: modelService || null,
            model: model.join('/') || null,
            metadata: JSON.stringify({
              onlineAgent: {
                version: 1,
                kind: 'realtime',
                config: configs.get(userId),
                call: null,
              },
            }),
          })
          .where('id', '=', id)
          .execute();
      });
      adopted++;
    } catch (error) {
      logger.warn(
        { conversationId: id, error },
        'conversation not carried over to the assistant',
      );
    }
  }
  await query
    .insertInto('crmSettings')
    .values({
      id: MARKER,
      value: JSON.stringify({ version: 1, adopted, of: legacy.length }),
      updatedAt: new Date(),
    })
    .execute();
}
