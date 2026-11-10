import type { DatabaseManager } from '@nocobase/db';
import { toText } from './schema.js';

// AI work an agent asked for from a conversation, waited on until its run
// finishes (migration 202610160001_crm_ai_watches): the routes that start a
// follow-up, a review or a preparation note the entry when a run asked, and
// the worker's finish hands it to `CrmService.aiFinished`, which tells the
// conversation (crm-agents/ai-work-news.ts).

interface AiWatch {
  id: string;
  entity: string;
  recordId: string;
  userId: string;
  conversationId: string;
}

export async function watchAiWork(
  database: DatabaseManager,
  watch: AiWatch,
): Promise<void> {
  await database
    .query()
    .insertInto('crmAiWatches')
    .values({ ...watch, createdAt: new Date().toISOString() })
    .execute();
}

// The watch of an entry, removed as it is read, so the conversation is told
// once; null when no conversation waits on it.
export async function takeAiWatch(
  database: DatabaseManager,
  id: string,
): Promise<AiWatch | null> {
  const row = await database
    .query()
    .selectFrom('crmAiWatches')
    .selectAll()
    .where('id', '=', id)
    .executeTakeFirst();
  if (!row) return null;
  const removed = await database
    .query()
    .deleteFrom('crmAiWatches')
    .where('id', '=', id)
    .execute();
  if (Number(removed.deletedCount ?? 1) === 0) return null;
  return {
    id: toText(row.id),
    entity: toText(row.entity),
    recordId: toText(row.recordId),
    userId: toText(row.userId),
    conversationId: toText(row.conversationId),
  };
}
