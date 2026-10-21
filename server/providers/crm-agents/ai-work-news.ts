import type { Agents } from '@nocobase/app-plugin-agents/server/tokens';
import type { AssistantWake } from './assistant.js';
import { readEntry } from '../crm/ai-entries.js';
import { takeAiWatch } from '../crm/ai-watches.js';
import { latestReview } from '../crm/approval-review.js';
import type { Actor } from '../crm/authorization.js';
import { latestEvaluation } from '../crm/lead-evaluation.js';
import { latestOpportunityEvaluation } from '../crm/opportunity-evaluation.js';
import { CrmError, definitions, toText, type Entity } from '../crm/schema.js';
import { latestPreparation } from '../crm/task-preparation.js';
import { titleOf } from '../crm/titles.js';
import { jsonValue } from '../crm/values.js';
import type { CrmService } from '../crm/service.js';

// How AI work an agent asked for from a conversation (`crm leads
// request-follow-up` and its kin) reaches that conversation once its run
// finishes: a notice the person sees, and what the work came to told to the
// agent (an input that wakes a runner agent, the CRM's news for the
// assistant, `wake`), so it tells the person and proposes acting on it. Work nobody asked for from a conversation has no watch and tells no
// one here.

const WORK: Record<string, { agent: string; read: string }> = {
  leads: { agent: 'Lead follow-up', read: 'crm leads follow-up' },
  opportunities: {
    agent: 'Opportunity follow-up',
    read: 'crm opportunities follow-up',
  },
  approvals: { agent: 'Approval review', read: 'crm approvals review' },
  tasks: { agent: 'Task assistant', read: 'crm tasks preparation' },
};

// What the agent reads of the result, inline, so it need not look it up.
const RESULT_LIMIT = 6000;

export function deliverAiWork(
  agents: Agents,
  service: CrmService,
  wake?: AssistantWake,
): (entryId: string) => Promise<void> {
  return async (entryId) => {
    const watch = await takeAiWatch(service.database, entryId);
    const work = watch ? WORK[watch.entity] : undefined;
    if (!watch || !work) return;
    const query = service.database.query();
    const row = await query
      .selectFrom('crmHistory')
      .selectAll()
      .where('id', '=', entryId)
      .executeTakeFirst();
    if (!row) return;
    const entry = readEntry<Record<string, unknown>>(row);
    const name = await titleFor(
      service,
      watch.entity as Entity,
      watch.recordId,
    );
    const ready = entry.status === 'pending' && Boolean(entry.ai.result);
    const about = `${watch.entity.replace(/s$/u, '').replace(/ie$/u, 'y')} "${name}" (${watch.recordId})`;
    const text = ready
      ? `The ${work.agent} agent finished the work you asked for on ${about}. Its card (entry ${entryId}) is now shown in this conversation, where the person decides it as in their inbox: do not show it again. What it suggests:\n${JSON.stringify(entry.ai.result).slice(0, RESULT_LIMIT)}\nTell the person in a few lines, in their language, what matters in it and anything the card leaves out (what you read in the mail, a risk); do not restate the card or wrap it in a plan. Propose no plan beside it: the card is the one card of this answer; name anything else worth doing in words, and propose it only if the person asks. If they want it different, have it redone with their words (\`--revise ${entryId} --instruction "…"\`). \`${work.read} ${watch.recordId}\` reads it again.`
      : `The ${work.agent} agent could not finish the work you asked for on ${about}${entry.ai.error ? ` (${toText((entry.ai.error as { code?: unknown }).code ?? 'failed')})` : ''}. Nothing changed; tell the person briefly.`;
    await agents.tx.run((tx) =>
      agents.conversations.deliver(tx, watch.conversationId, {
        notice: {
          code: 'news',
          type: 'aiWork',
          title: name,
          params: {
            entity: watch.entity,
            recordId: watch.recordId,
            entryId,
            outcome: ready ? 'ready' : 'failed',
          },
        },
        input: {
          type: 'signal',
          actor: { kind: 'system', id: 'crm-ai-work', name: work.agent },
          text,
          payload: {
            entity: watch.entity,
            recordId: watch.recordId,
            entryId,
            outcome: ready ? 'ready' : 'failed',
          },
        },
      }),
    );
    wake?.(watch.conversationId, text);
  };
}

// A company's signals check an agent asked for (`crm companies
// check-signals`), told to its conversation once the web search is done:
// what it found, or that it failed.
export async function deliverSignalCheck(
  agents: Agents,
  service: CrmService,
  wake: AssistantWake | undefined,
  watch: { conversationId: string; companyId: string },
  outcome:
    | {
        found: readonly {
          title: string;
          summary: string;
          type: string;
          occurredOn: string;
          sources?: unknown;
        }[];
      }
    | { error: unknown },
): Promise<void> {
  const company = await service.database
    .query()
    .selectFrom(definitions.companies.table)
    .select(['name'])
    .where('id', '=', watch.companyId)
    .executeTakeFirst();
  const name = toText(company?.name ?? '');
  const about = `company "${name}" (${watch.companyId})`;
  const ok = 'found' in outcome;
  const text = ok
    ? outcome.found.length
      ? `The Company research agent searched the web for ${about} and found ${toText(outcome.found.length)} new signal(s), now on the company's Signals tab:\n${JSON.stringify(outcome.found).slice(0, RESULT_LIMIT)}\nTell the person in a few lines what they mean for the business, in their language, and propose what to do about them in a plan if anything should be done.`
      : `The Company research agent searched the web for ${about} and found nothing new. Tell the person briefly.`
    : `The Company research agent could not search the web for ${about} (${outcome.error instanceof Error ? outcome.error.message : 'failed'}). Nothing changed; tell the person briefly.`;
  await agents.tx.run((tx) =>
    agents.conversations.deliver(tx, watch.conversationId, {
      notice: {
        code: 'news',
        type: 'aiWork',
        title: name,
        params: {
          entity: 'companies',
          recordId: watch.companyId,
          outcome: ok ? 'ready' : 'failed',
        },
      },
      input: {
        type: 'signal',
        actor: {
          kind: 'system',
          id: 'crm-ai-work',
          name: 'Company research',
        },
        text,
        payload: {
          entity: 'companies',
          recordId: watch.companyId,
          outcome: ok ? 'ready' : 'failed',
        },
      },
    }),
  );
  wake?.(watch.conversationId, text);
}

// A suggestion already made, put into the conversation that asks for it
// (`crm suggestions show`): its card, as the person may read it (a review
// for its approver, a preparation for the task's people), and only the
// record's latest; the agent is not woken, having asked.
export async function showSuggestion(
  agents: Agents,
  service: CrmService,
  actor: Actor,
  entryId: string,
  conversationId: string,
): Promise<{ entity: string; recordId: string }> {
  const row = await service.database
    .query()
    .selectFrom('crmHistory')
    .select(['entity', 'recordId'])
    .where('id', '=', entryId)
    .where('action', '=', 'ai')
    .executeTakeFirst();
  const entity = toText(row?.entity ?? '');
  const recordId = toText(row?.recordId ?? '');
  const latest = {
    leads: latestEvaluation,
    opportunities: latestOpportunityEvaluation,
    approvals: latestReview,
    tasks: latestPreparation,
  }[entity];
  if (!row || !latest) throw new CrmError('notFound', 404);
  const entry = await latest(service, actor, recordId);
  if (!entry) throw new CrmError('notFound', 404);
  // Redone or followed up since: the latest card is the one to show.
  if (entry.id !== entryId) throw new CrmError('evaluationDecided', 409);
  // Already in this conversation (its agent's work told it, or shown
  // before): one card per suggestion.
  if (await inConversation(service, conversationId, entryId))
    return { entity, recordId };
  const title = await titleFor(service, entity as Entity, recordId);
  await agents.tx.run((tx) =>
    agents.conversations.deliver(tx, conversationId, {
      notice: {
        code: 'news',
        type: 'aiWork',
        title,
        params: { entity, recordId, entryId, outcome: 'shown' },
      },
    }),
  );
  return { entity, recordId };
}

// Whether a conversation already shows a suggestion's card: a notice of the
// Agents plugin's naming its entry (the plugin keeps notices as system
// messages, in their `metadata.notice`). Read in code rather than matched in
// SQL, the column being JSON on some databases.
async function inConversation(
  service: CrmService,
  conversationId: string,
  entryId: string,
): Promise<boolean> {
  const rows = await service.database
    .query()
    .selectFrom('agConversationMessages')
    .select(['metadata', 'content'])
    .where('conversationId', '=', conversationId)
    .where('role', '=', 'system')
    .execute();
  type Notice = { type?: unknown; params?: { entryId?: unknown } };
  const names = (notice: Notice | undefined) =>
    notice?.type === 'aiWork' && notice.params?.entryId === entryId;
  return rows.some((row) => {
    const metadata = jsonValue(row.metadata) as { notice?: Notice } | null;
    // A native chat keeps it as a data part of the message it saves.
    const original = (
      jsonValue(row.content) as {
        original?: { parts?: { type?: unknown; data?: Notice }[] };
      } | null
    )?.original;
    return (
      names(metadata?.notice) ||
      (original?.parts ?? []).some(
        (part) => part.type === 'data-notice' && names(part.data),
      )
    );
  });
}

// A record named as the CRM links it (titles.ts): a lead "name / company",
// a deal "company / deal", a contact "name / company".
async function titleFor(
  service: CrmService,
  entity: Entity,
  recordId: string,
): Promise<string> {
  const query = service.database.query();
  const record = await query
    .selectFrom(definitions[entity].table)
    .selectAll()
    .where('id', '=', recordId)
    .executeTakeFirst();
  if (!record) return '';
  const companyId = toText(record.companyId ?? '');
  const company = companyId
    ? await query
        .selectFrom(definitions.companies.table)
        .select(['name'])
        .where('id', '=', companyId)
        .executeTakeFirst()
    : undefined;
  return titleOf(
    entity,
    record,
    company ? { [companyId]: toText(company.name) } : {},
  );
}

// A company looked up on the web for a plan that creates it (`crm
// companies look-up`), told to the conversation that asked once the search
// is done: the form's values found, those unsure, the pages read and the
// companies by that name already in the CRM, for the agent to propose the
// company with them.
export async function deliverCompanyProfile(
  agents: Agents,
  wake: AssistantWake | undefined,
  conversationId: string,
  name: string,
  outcome:
    | {
        input: Record<string, unknown>;
        uncertain: readonly string[];
        sources: readonly { title: string; url: string }[];
        duplicates: readonly { id: string; name: string }[];
      }
    | { error: unknown },
): Promise<void> {
  const ok = 'input' in outcome;
  const text = ok
    ? `The Company research agent looked "${name}" up on the web for the company you are to create. The company form's values it found: ${JSON.stringify(outcome.input)}. Fields it was unsure of: ${JSON.stringify(outcome.uncertain)}. Pages it read: ${JSON.stringify(outcome.sources.slice(0, 5))}. Companies by that name the person can already see: ${JSON.stringify(outcome.duplicates)}.\nIf one of those is the company, say so and do not create another; otherwise propose the plan that creates it with these values (with what the person asked for besides), saying in its summary which fields were unsure and that they come from the web.`
    : `The Company research agent could not look "${name}" up on the web (${outcome.error instanceof Error ? outcome.error.message : 'failed'}). Propose the company with what you know instead, saying the web found nothing.`;
  await agents.tx.run((tx) =>
    agents.conversations.deliver(tx, conversationId, {
      notice: {
        code: 'news',
        type: 'aiWork',
        title: name,
        params: { entity: 'companies', outcome: ok ? 'ready' : 'failed' },
      },
      input: {
        type: 'signal',
        actor: {
          kind: 'system',
          id: 'crm-ai-work',
          name: 'Company research',
        },
        text,
        payload: {
          entity: 'companies',
          lookup: name,
          outcome: ok ? 'ready' : 'failed',
        },
      },
    }),
  );
  wake?.(conversationId, text);
}
