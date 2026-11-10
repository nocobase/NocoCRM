import type { Agents } from '@nocobase/app-plugin-agents/server/tokens';
import type { DatabaseConnection } from '@nocobase/db';
import type { Actor } from '../crm/authorization.js';
import { entities, toText, type Entity } from '../crm/schema.js';
import type { CrmService } from '../crm/service.js';
import { titleOf } from '../crm/titles.js';

// What a message's page context may name on the CRM (the plugin keeps only
// ids; each kind's owner says what they are): a record of each object, and
// an AI card on a record (`crm-evaluation`: a lead's or a deal's follow-up,
// an approval's review, a task's preparation, a history entry the AI wrote),
// which the Discuss buttons pin. A reference the person may not read is
// left out, so a context never tells them a record exists. The plugin calls
// these inside the transaction that saves the message: every read goes
// through its connection.

const EVALUATION_KIND = 'crm-evaluation';

// The person, with what they may read as their last workspace load found it
// (CrmService.readsOf): the authorization service cannot read inside the
// plugin's transaction on SQLite. Without a recent snapshot, nothing.
function actorFor(service: CrmService, userId: string): Actor | null {
  const decisions = service.readsOf(userId);
  if (!decisions) return null;
  return {
    id: userId,
    locale: 'en-US',
    scope: service.authz.for({
      principal: { type: 'user', id: userId },
      subjects: [{ type: 'authenticated', id: '*' }],
    }),
    decisions,
  };
}

async function readable(
  service: CrmService,
  conn: DatabaseConnection,
  actor: Actor,
  entity: Entity,
  id: string,
): Promise<Record<string, unknown> | null> {
  try {
    return await service.get(actor, entity, id, conn.query);
  } catch {
    return null;
  }
}

const CARDS: Partial<Record<Entity, string>> = {
  leads: 'AI follow-up',
  opportunities: 'AI follow-up',
  approvals: 'AI review',
  tasks: 'AI preparation',
};

// `basePath`: the application's public base path (`/main`), so a URL the
// agent quotes as a link opens the record.
export function registerContextKinds(
  agents: Agents,
  service: CrmService,
  basePath: string,
): (() => void)[] {
  const removals = entities.map((entity) =>
    agents.conversations.contextKinds.register(
      entity,
      async (conn, userId, ids) => {
        const actor = actorFor(service, userId);
        const resolved = new Map<
          string,
          { title: string; key: string | null; url: string | null }
        >();
        if (!actor) return resolved;
        for (const id of ids) {
          const row = await readable(service, conn, actor, entity, id);
          if (row)
            resolved.set(id, {
              title: titleOf(entity, row) || id,
              key: null,
              url: `${basePath}/crm/${entity}/${id}`,
            });
        }
        return resolved;
      },
    ),
  );
  removals.push(
    agents.conversations.contextKinds.register(
      EVALUATION_KIND,
      async (conn, userId, ids) => {
        const actor = actorFor(service, userId);
        const resolved = new Map<
          string,
          { title: string; key: string | null; url: string | null }
        >();
        if (!actor || !ids.length) return resolved;
        const entries = await conn.query
          .selectFrom('crmHistory')
          .select(['id', 'entity', 'recordId'])
          .where('id', 'in', [...ids])
          .where('source', '=', 'ai')
          .execute();
        for (const entry of entries) {
          const entity = toText(entry.entity) as Entity;
          const label = CARDS[entity];
          if (!label) continue;
          const recordId = toText(entry.recordId);
          const row = await readable(service, conn, actor, entity, recordId);
          // An approval's review is its approver's alone, as historyOf
          // keeps it.
          if (
            !row ||
            (entity === 'approvals' && toText(row.approverId) !== userId)
          )
            continue;
          resolved.set(toText(entry.id), {
            title: `${label}: ${titleOf(entity, row) || recordId}`,
            key: null,
            url: `${basePath}/crm/${entity}/${recordId}?focus=${toText(entry.id)}`,
          });
        }
        return resolved;
      },
    ),
  );
  return removals;
}
