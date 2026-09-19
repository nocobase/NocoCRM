import type { WorkflowRunOptions } from '@nocobase/app-plugin-workflow';
import { databaseManagerToken } from '@nocobase/db';

// Queues one CRM message by inserting the outbox row the CRM's delivery
// scan sends, keyed so the same message is never queued twice. A deployed
// workflow runs from the artifact directory, not the application tree, so
// this file reaches the database through the installed package's token
// rather than importing the CRM service; each workflow package carries
// its own copy for the same reason. Keep the copies identical.
const tables: Record<string, string> = {
  leads: 'crmLeads',
  accounts: 'crmAccounts',
  contacts: 'crmContacts',
  opportunities: 'crmOpportunities',
  activities: 'crmActivities',
  approvals: 'crmApprovals',
};

export interface QueuedMessage {
  entity: string;
  recordId: string;
  recipientId: string;
  actorId: string;
  event: string;
  key: string;
}

// Reads the run arguments as strings and checks the ones every message
// needs, so a wrong template fails loudly rather than queueing nonsense.
export function messageArgs(
  rawArgs: unknown,
  events: readonly string[],
  key: (args: Record<string, string>) => string,
  entity?: string,
): QueuedMessage {
  const args = Object.fromEntries(
    Object.entries((rawArgs ?? {}) as Record<string, unknown>).map(([k, v]) => [
      k,
      typeof v === 'string' ? v : '',
    ]),
  );
  for (const name of ['recordId', 'recipientId', 'actorId', 'at'])
    if (!args[name]) throw new Error(`${name} is required.`);
  if (!events.includes(args.event))
    throw new Error(`event must be one of ${events.join(', ')}.`);
  const target = entity ?? args.entity;
  if (!tables[target]) throw new Error('entity is required.');
  return {
    entity: target,
    recordId: args.recordId,
    recipientId: args.recipientId,
    actorId: args.actorId,
    event: args.event,
    key: key(args),
  };
}

// Returns whether a message was queued now: nothing for the person who
// made the change, for a record that is gone, or for a key already queued.
export async function queueMessage(
  options: WorkflowRunOptions,
  message: QueuedMessage,
): Promise<boolean> {
  if (message.recipientId === message.actorId) return false;
  const query = options.services.resolve(databaseManagerToken).query();
  const record = await query
    .selectFrom(tables[message.entity])
    .select(['id', 'name'])
    .where('id', '=', message.recordId)
    .executeTakeFirst();
  if (!record) return false;
  if (
    await query
      .selectFrom('crmOutbox')
      .select('id')
      .where('id', '=', message.key)
      .executeTakeFirst()
  )
    return false;
  try {
    await query
      .insertInto('crmOutbox')
      .values({
        id: message.key,
        recipientId: message.recipientId,
        entity: message.entity,
        recordId: message.recordId,
        name: record.name,
        event: message.event,
        status: 'pending',
        createdAt: new Date().toISOString(),
      })
      .execute();
  } catch (error) {
    // Another run of the same message won the race: queued already.
    if (!/UNIQUE|PRIMARYKEY|duplicate/i.test(String(error))) throw error;
    return false;
  }
  options.logger.info('Notification queued', {
    entity: message.entity,
    recordId: message.recordId,
    event: message.event,
  });
  return true;
}
