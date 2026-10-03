import type { Row } from '@nocobase/db';
import { crmActor } from '../../ai/tools/crm-records.js';
import { readEntry } from './ai-entries.js';
import type { FollowUpTrigger, LeadEvaluator } from './lead-evaluation.js';
import { toText } from './schema.js';
import type { CrmService } from './service.js';

// The daily look over the open leads for what should have happened and has
// not (the plan's signals): a new lead nobody has contacted in two days, a
// lead being worked with no activity in fourteen, and a nurtured lead whose
// review is due. Each starts the lead's follow-up as its owner, the card
// saying what started it, so it lands in the owner's Waiting on me; a
// nurtured lead's review also looks the company up again. A lead with a
// card already waiting or being worked on is left alone (its reminder is
// there), the same signal does not start again within a week, and a pass
// starts at most `limit` follow-ups, oldest leads first, so the first pass
// over a full CRM does not run the model for every lead at once. The
// scheduler plugin runs it once a day (CrmProvider), where administrators
// see each pass and may switch it off.

const DAY = 86_400_000;
// The thresholds, in days, from the CRM's settings (uncontactedDays,
// leadStaleDays), the dashboard's stalled leads counting by the same.
export interface LeadSignalDays {
  uncontacted: number;
  stale: number;
}
const DEFAULT_DAYS: LeadSignalDays = { uncontacted: 2, stale: 14 };
const SAME_SIGNAL_WITHIN = 7 * DAY;

export interface LeadSignalPass {
  checked: number;
  started: Partial<Record<FollowUpTrigger, number>>;
}

// The signal a lead gives at `now`, if any, from its status, its age and
// its activities.
export function leadSignal(
  lead: Row,
  activities: readonly Row[],
  now: number,
  days: LeadSignalDays = DEFAULT_DAYS,
): FollowUpTrigger | undefined {
  const at = (value: unknown): number => Date.parse(toText(value));
  const UNCONTACTED_AFTER = days.uncontacted * DAY;
  const SILENT_AFTER = days.stale * DAY;
  const planned = activities.filter((a) => a.status === 'planned');
  const ahead = planned.some((a) => at(a.startAt) >= now);
  if (lead.status === 'new')
    return now - at(lead.createdAt) > UNCONTACTED_AFTER &&
      !activities.some((a) => a.status === 'completed') &&
      !ahead
      ? 'uncontacted'
      : undefined;
  if (lead.status === 'working')
    return now - at(lead.createdAt) > SILENT_AFTER &&
      !ahead &&
      !activities.some(
        (a) => a.status !== 'cancelled' && now - at(a.startAt) <= SILENT_AFTER,
      )
      ? 'silent'
      : undefined;
  if (lead.status === 'nurturing')
    return planned.some((a) => at(a.startAt) <= now) ? 'nurtureDue' : undefined;
  return undefined;
}

export async function scanLeadSignals(
  service: CrmService,
  evaluator: LeadEvaluator,
  now = new Date(),
  limit = 20,
): Promise<LeadSignalPass> {
  const pass: LeadSignalPass = { checked: 0, started: {} };
  if (!(await evaluator.available())) return pass;
  const settings = await service.settings();
  const days = {
    uncontacted: settings.uncontactedDays,
    stale: settings.leadStaleDays,
  };
  const query = service.database.query();
  const leads = await query
    .selectFrom('crmLeads')
    .select(['id', 'status', 'ownerId', 'createdAt'])
    .where('status', 'in', ['new', 'working', 'nurturing'])
    .orderBy('createdAt', 'asc')
    .execute();
  pass.checked = leads.length;
  if (!leads.length) return pass;
  const ids = leads.map((lead) => toText(lead.id));
  const activities = new Map<string, Row[]>();
  const entries = new Map<string, ReturnType<typeof readEntry>[]>();
  // In chunks, as SQLite caps the parameters of one statement.
  for (let i = 0; i < ids.length; i += 500) {
    const chunk = ids.slice(i, i + 500);
    for (const activity of await query
      .selectFrom('crmActivities')
      .select(['leadId', 'status', 'startAt'])
      .where('leadId', 'in', chunk)
      .execute()) {
      const key = toText(activity.leadId);
      activities.set(key, [...(activities.get(key) ?? []), activity]);
    }
    for (const row of await query
      .selectFrom('crmHistory')
      .selectAll()
      .where('entity', '=', 'leads')
      .where('action', '=', 'ai')
      .where('recordId', 'in', chunk)
      .execute()) {
      const key = toText(row.recordId);
      entries.set(key, [...(entries.get(key) ?? []), readEntry(row)]);
    }
  }
  let started = 0;
  for (const lead of leads) {
    if (started >= limit) break;
    const id = toText(lead.id);
    const own = entries.get(id) ?? [];
    // A card waiting on the owner or being worked on: its reminder is
    // there, nothing to add.
    if (own.some((e) => e.status === 'pending' || e.status === 'running'))
      continue;
    const signal = leadSignal(
      lead,
      activities.get(id) ?? [],
      now.getTime(),
      days,
    );
    if (!signal || !lead.ownerId) continue;
    // Once a week per signal, counting only follow-ups that came to
    // something: one that failed (a model error, a task lost with a killed
    // process) is tried again on the next pass.
    if (
      own.some(
        (e) =>
          e.ai.trigger === signal &&
          e.status !== 'failed' &&
          now.getTime() - Date.parse(e.createdAt) < SAME_SIGNAL_WITHIN,
      )
    )
      continue;
    // As the owner, who decides on the card, in the language they use.
    const ownerId = toText(lead.ownerId);
    const owner = crmActor(service.authz, {
      id: ownerId,
      locale: await service.localeOf(ownerId),
    });
    try {
      if (await evaluator.request(owner, id, undefined, signal)) {
        started += 1;
        pass.started[signal] = (pass.started[signal] ?? 0) + 1;
      }
    } catch {
      // A lead the owner can no longer read, or that changed meanwhile:
      // the next pass looks again.
    }
  }
  return pass;
}
