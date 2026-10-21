import type { Application } from '@nocobase/app-server/application';
import type { QueryAdapter } from '@nocobase/db';
import type { CrmModelService } from '../../config/ai.js';

/**
 * The model a conversation of the assistant is recorded with when no model
 * service is set up (an external demo runs without one): the first model of
 * the first service the configuration declares, DeepSeek's by default.
 *
 * @temporary(nocobase-official) The Agents plugin refuses to read a
 * conversation's messages, or its configuration, while the conversation
 * names no model ("Select a valid chat model"), though reading asks no
 * model; so a demo conversation imported where none was set up could be
 * listed but never opened. Remove once the plugin reads a conversation
 * without one. Checklist: the demo's conversations open on a deployment
 * without `DEEPSEEK_API_KEY`; sending in one still asks for a model.
 */
export function placeholderModel(
  app: Application,
): { modelService: string; model: string } | null {
  const services =
    app.config?.get<Record<string, CrmModelService>>('ai.llmServices') ?? {};
  for (const [name, service] of Object.entries(services)) {
    const model = service.enabledModels?.[0]?.value;
    if (service.enabled !== false && model)
      return { modelService: name, model };
  }
  return null;
}

/** Records the placeholder on the assistant's conversations that name no model. */
export async function namePlaceholderModel(
  app: Application,
  query: QueryAdapter,
  conversationIds?: readonly string[],
): Promise<void> {
  const placeholder = placeholderModel(app);
  if (!placeholder) return;
  let update = query
    .updateTable('agConversations')
    .set(placeholder)
    .where((eb) =>
      eb.or([eb('model', 'is', null), eb('modelService', 'is', null)]),
    )
    // The assistant's conversations: native chats of an online agent.
    .where('metadata', 'like', '%onlineAgent%');
  if (conversationIds) {
    if (!conversationIds.length) return;
    update = update.where('id', 'in', [...conversationIds]);
  }
  await update.execute();
}
