import type { DatabaseManager } from '@nocobase/db';
import { Job, type JobClass, type JobExecutionContext } from '@nocobase/jobs';
import { jsonValue } from './values.js';

// The AI's follow-ups of leads and deals (lead-evaluation.ts,
// opportunity-evaluation.ts) run as tasks of the application's jobs
// service: a follow-up asked for is recorded as a running card and its task
// queued, so a restart picks it up again (the memory adapter writes pending
// tasks to storage on shutdown; Redis keeps them outright) and the tasks of
// leads and deals together run as many at a time as the `crmFollowUps`
// jobs configuration allows (server/config/jobs.ts). A task carries only the
// card it fills; it does nothing when the card is no longer running, so a
// task replayed after recovery cannot run a follow-up twice.

// The jobs configuration the follow-ups run on.
export const FOLLOW_UP_JOBS = 'crmFollowUps';

export interface FollowUpPayload {
  [key: string]: string | null;
  // An approval's: its review for the approver (approval-review.ts).
  entity: 'leads' | 'opportunities' | 'approvals';
  // The card (crmHistory, action `ai`) the run fills.
  entryId: string;
  // The language the follow-up is written in, when the person asking was
  // the owner; null for the owner's own.
  language: string | null;
}

// The task class, around the function that runs a card: created by the
// provider with the evaluators in scope, since a job gets nothing but its
// payload.
export function createFollowUpJob(
  run: (payload: FollowUpPayload, signal: AbortSignal) => Promise<void>,
): JobClass<FollowUpPayload, Job<FollowUpPayload>> {
  return class FollowUpJob extends Job<FollowUpPayload> {
    public static readonly jobName: string = 'crm.follow-up';
    public async execute({ signal }: JobExecutionContext): Promise<void> {
      await run(this.payload, signal);
    }
  };
}

// A model call's limit, ended early by the task's own signal (the
// application shutting down) when there is one.
export function within(ms: number, signal?: AbortSignal): AbortSignal {
  return signal
    ? AbortSignal.any([AbortSignal.timeout(ms), signal])
    : AbortSignal.timeout(ms);
}

// When a card's run began (`ai.startedAt`), which tells one being worked on
// from one waiting its turn; cleared again when shutdown hands the task
// back to wait for the next start.
export async function markStarted(
  database: DatabaseManager,
  entryId: string,
  started: boolean,
): Promise<void> {
  const row = await database
    .query()
    .selectFrom('crmHistory')
    .select('ai')
    .where('id', '=', entryId)
    .executeTakeFirst();
  if (!row) return;
  const { startedAt: _startedAt, ...ai } = (jsonValue(row.ai) ?? {}) as Record<
    string,
    unknown
  >;
  await database
    .query()
    .updateTable('crmHistory')
    .set({
      ai: JSON.stringify(
        started ? { ...ai, startedAt: new Date().toISOString() } : ai,
      ),
    })
    .where('id', '=', entryId)
    .execute();
}
