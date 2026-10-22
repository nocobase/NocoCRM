import { randomUUID } from 'node:crypto';
import {
  createServiceToken,
  type ServiceToken,
} from '@nocobase/service-provider';
import type { MailService } from '@nocobase/app-plugin-mail/server';
import type { QueryAdapter, Row } from '@nocobase/db';
import { readEntry } from '../ai-entries.js';
import type { Actor, ActorOrigin } from '../authorization.js';
import { convertLead } from '../conversion.js';
import {
  afterCreate,
  afterUpdate,
  beforeUpdate,
  type FollowUpWorkers,
} from '../record-hooks.js';
import {
  asEntity,
  CrmError,
  definitions,
  object,
  toText,
  type Entity,
} from '../schema.js';
import type { CrmService } from '../service.js';
import type { TaskPreparer } from '../task-preparation.js';
import { resolveTitles } from '../titles.js';
import { jsonValue } from '../values.js';

/**
 * Plans: changes an agent proposes, which the person who woke it confirms on
 * a decision card, carried out by the CRM as that person (migration step 2).
 *
 * @temporary(nocobase-official) The projects plugin has the same engine with
 * its own operations only. Replace this with the shared one once it lets an
 * application register its operations; keep the statuses, the routes'
 * shapes and the rows' fields as they are so the swap changes no client.
 * Checklist: rehearsal rolls back and names the refused step; execution is
 * one transaction as the decider; a record changed since the proposal makes
 * the plan stale; a pending plan expires after a day; the outcome is
 * delivered to the agent's conversation.
 */

export const PLAN_OPS = [
  'record.create',
  'record.update',
  'lead.convert',
  'comment.create',
  'task.recordOutcome',
  'approval.submit',
  'approval.withdraw',
  'approval.decide',
  'suggestion.decide',
  'mail.send',
] as const;
export type PlanOp = (typeof PLAN_OPS)[number];

export interface PlanStepInput {
  op: PlanOp;
  // How a later step names the record this one creates; `$<position>`
  // names it too.
  ref?: string;
  params: Row;
}

export interface PlanInput {
  title: string;
  summary?: string;
  steps: PlanStepInput[];
}

// Who proposed it: the agent and its run, and the conversation the outcome
// goes back to.
export interface PlanSource {
  agentId: string | null;
  agentName: string | null;
  runId: string | null;
  conversationId: string | null;
}

export const PLAN_STATUSES = [
  'pending',
  'executing',
  'executed',
  'failed',
  'stale',
  'voided',
  'expired',
  // A newer plan of the person's does what this one would (the same
  // suggestion or approval decided, the same fields changed, mail to the
  // same people): it waits no longer, so the two cannot both be carried out.
  'superseded',
] as const;
export type PlanStatus = (typeof PLAN_STATUSES)[number];

// What a step does to a record, as the rehearsal found it.
export interface StepCheck {
  // An email's: the record it concerns, if any (its entity then only a
  // placeholder).
  entity: Entity;
  id: string | null;
  name: string;
  changes: { field: string; from: unknown; to: unknown }[];
  // The record's `updatedAt` when rehearsed: a later one at execution means
  // someone changed it since, and the plan is stale.
  updatedAt?: string | null;
  // An email a step sends, whole, as it goes out: from the person's own
  // mailbox, to whom, what it says.
  mail?: PlanMail;
}

export interface PlanMail {
  from: string;
  to: string[];
  cc: string[];
  subject: string;
  text: string;
}

// What a plan works with besides the CRM: the AI's follow-ups a step
// decides or starts, and the Mail plugin it sends with (each absent
// without its plugin).
export interface PlanWorkers extends FollowUpWorkers {
  tasks?: () => TaskPreparer | undefined;
  mail?: () => MailService | undefined;
  // Brings the person's mail into the timeline once a plan sent some.
  mailSent?: (userId: string) => Promise<unknown>;
}

// The mailbox an email goes from: the person's own, one that sends.
interface Sender {
  accountId: string;
  identityId: string;
  address: string;
}

// What a step runs with: the mailbox each email goes from, found before the
// transaction opens (the Mail plugin reads outside it), and, carrying the
// plan out, the step's row, which an email's delivery is written to.
interface StepContext {
  senders: Map<number, Sender>;
  row?: { planId: string; id: string };
}

export interface PlanStepView {
  id: string;
  position: number;
  op: PlanOp;
  ref: string | null;
  params: Row;
  check: StepCheck | null;
  status: 'pending' | 'done' | 'failed' | 'removed';
  result: Row | null;
}

export interface PlanView {
  id: string;
  title: string;
  summary: string | null;
  status: PlanStatus;
  revision: number;
  proposerUserId: string;
  agentId: string | null;
  agentName: string | null;
  runId: string | null;
  conversationId: string | null;
  deciderUserId: string | null;
  decidedAt: string | null;
  failure: Row | null;
  expiresAt: string;
  createdAt: string;
  steps: PlanStepView[];
  // The records the steps' values name (a task's company, its deal), by id,
  // titled as the record pages title them, as far as the reader may read
  // them; a value naming a record an earlier step creates ($1) is not here.
  titles: Record<string, string>;
}

// The outcome a decision sends back to the agent's conversation.
export interface PlanOutcome {
  plan: PlanView;
  decision: 'executed' | 'voided' | 'failed' | 'stale';
}

const DAY = 24 * 60 * 60 * 1000;
const MAX_STEPS = 50;

class Rehearsed extends Error {
  constructor(readonly checks: StepCheck[]) {
    super('rehearsed');
  }
}
class StepRefused extends Error {
  constructor(
    readonly position: number,
    readonly cause: unknown,
  ) {
    super('step refused');
  }
}

// A value read back from a JSON column.
const json = (value: unknown): Row | null => {
  const parsed = jsonValue(value);
  return parsed && typeof parsed === 'object' ? (parsed as Row) : null;
};
const iso = (value: unknown): string | null =>
  value == null ? null : new Date(toText(value)).toISOString();

export class CrmPlans {
  // Tells the agent's conversation how a decision came out; set by the
  // provider when the Agents plugin is there.
  onDecided?: (outcome: PlanOutcome) => Promise<void>;

  constructor(
    private readonly service: CrmService,
    private readonly workers: PlanWorkers,
  ) {}

  // Rehearses the steps as the person, and keeps the plan when every one of
  // them would go through; otherwise names the step refused and why.
  async create(
    actor: Actor,
    input: PlanInput,
    source: PlanSource,
  ): Promise<PlanView> {
    if (!input.steps.length || input.steps.length > MAX_STEPS)
      throw new CrmError('invalidInput', 400, 'steps');
    // The same plan proposed again in its conversation (a model repeating
    // its command) is the one already waiting, not a second card.
    const same = await this.waitingTwin(actor, input, source);
    if (same) return same;
    const checks = await this.rehearse(actor, input.steps);
    const now = new Date();
    const id = randomUUID();
    await this.service.database.transaction(async ({ query }) => {
      await query
        .insertInto('crmPlans')
        .values({
          id,
          title: input.title.trim().slice(0, 255),
          summary: input.summary?.trim() || null,
          status: 'pending',
          revision: 1,
          proposerUserId: actor.id,
          agentId: source.agentId,
          agentName: source.agentName,
          runId: source.runId,
          conversationId: source.conversationId,
          deciderUserId: null,
          decidedAt: null,
          failure: null,
          expiresAt: new Date(now.getTime() + DAY).toISOString(),
          createdAt: now.toISOString(),
          updatedAt: now.toISOString(),
        })
        .execute();
      for (const [index, step] of input.steps.entries()) {
        const check = checks[index];
        await query
          .insertInto('crmPlanRows')
          .values({
            id: randomUUID(),
            planId: id,
            position: index + 1,
            op: step.op,
            ref: step.ref ?? null,
            params: JSON.stringify(step.params),
            baseline: JSON.stringify(baselineOf(check)),
            check: JSON.stringify(check),
            status: 'pending',
            result: null,
            targets: check?.id ? `${check.entity}:${check.id}` : null,
          })
          .execute();
      }
      await this.supersede(query, actor, id, input.steps, now);
    });
    return this.get(actor, id);
  }

  // The person's other waiting plans that a new one conflicts with, marked
  // replaced by it (`failure.supersededBy`), wherever they were proposed.
  private async supersede(
    query: QueryAdapter,
    actor: Actor,
    id: string,
    steps: PlanStepInput[],
    now: Date,
  ): Promise<void> {
    const keys = new Set(steps.flatMap(conflictKeys));
    if (!keys.size) return;
    const waiting = await query
      .selectFrom('crmPlans')
      .select(['id'])
      .where('proposerUserId', '=', actor.id)
      .where('status', '=', 'pending')
      .where('id', '!=', id)
      .execute();
    for (const plan of waiting) {
      const rows = await query
        .selectFrom('crmPlanRows')
        .select(['op', 'params'])
        .where('planId', '=', plan.id)
        .execute();
      const conflicts = rows.some((row) =>
        conflictKeys({
          op: toText(row.op) as PlanOp,
          params: json(row.params) ?? {},
        }).some((key) => keys.has(key)),
      );
      if (!conflicts) continue;
      await query
        .updateTable('crmPlans')
        .set({
          status: 'superseded',
          failure: JSON.stringify({ code: 'superseded', supersededBy: id }),
          updatedAt: now.toISOString(),
        })
        .where('id', '=', plan.id)
        .where('status', '=', 'pending')
        .execute();
    }
  }

  private async waitingTwin(
    actor: Actor,
    input: PlanInput,
    source: PlanSource,
  ): Promise<PlanView | null> {
    if (!source.conversationId) return null;
    const rows = await this.service.database
      .query()
      .selectFrom('crmPlans')
      .select(['id'])
      .where('proposerUserId', '=', actor.id)
      .where('conversationId', '=', source.conversationId)
      .where('status', '=', 'pending')
      .where('title', '=', input.title.trim().slice(0, 255))
      .execute();
    const steps = JSON.stringify(
      input.steps.map((step) => [step.op, step.ref ?? null, step.params]),
    );
    for (const row of rows) {
      const plan = await this.load(toText(row.id), actor);
      if (
        JSON.stringify(
          plan.steps.map((step) => [step.op, step.ref, step.params]),
        ) === steps
      )
        return plan;
    }
    return null;
  }

  // Runs every step in a transaction that is always rolled back: what each
  // would do, or the first one refused.
  async rehearse(actor: Actor, steps: PlanStepInput[]): Promise<StepCheck[]> {
    try {
      const senders = await this.sendersOf(
        actor,
        steps.map((step, index) => ({ ...step, position: index + 1 })),
      );
      await this.service.mutate(
        { ...actor, via: 'assistant' },
        async (prepared, query) => {
          const refs = new Map<string, string>();
          const checks: StepCheck[] = [];
          for (const [index, step] of steps.entries())
            checks.push(
              await this.runStep(prepared, query, step, index + 1, refs, {
                senders,
              }).catch((error: unknown) => {
                throw new StepRefused(index + 1, error);
              }),
            );
          throw new Rehearsed(checks);
        },
      );
    } catch (error) {
      if (error instanceof Rehearsed) return error.checks;
      if (error instanceof StepRefused) throw refusal(error);
      throw error;
    }
    // mutate always throws above.
    throw new CrmError('invalidInput', 400, 'steps');
  }

  async get(actor: Actor, id: string): Promise<PlanView> {
    const plan = await this.load(id);
    // A plan is its proposer's: the person the agent works for decides it.
    if (plan.proposerUserId !== actor.id) throw new CrmError('notFound', 404);
    return (await this.named(actor, [plan]))[0];
  }

  // The reader's plans, those waiting first; a record's when `target` names
  // it (`leads:<id>`).
  async list(
    actor: Actor,
    options: {
      status?: PlanStatus;
      target?: string;
      conversationId?: string;
      page: number;
      pageSize: number;
    },
  ): Promise<{ data: PlanView[]; total: number }> {
    await this.expireDue();
    let select = this.service.database
      .query()
      .selectFrom('crmPlans')
      .select(['id'])
      .where('proposerUserId', '=', actor.id);
    if (options.status) select = select.where('status', '=', options.status);
    if (options.conversationId)
      select = select.where('conversationId', '=', options.conversationId);
    if (options.target) {
      const planIds = (
        await this.service.database
          .query()
          .selectFrom('crmPlanRows')
          .select('planId')
          .where('targets', '=', options.target)
          .execute()
      ).map((row) => toText(row.planId));
      select = planIds.length
        ? select.where('id', 'in', [...new Set(planIds)])
        : select.where('id', '=', '');
    }
    const ids = await select
      .orderBy('createdAt', 'desc')
      .execute()
      .then((rows) => rows.map((row) => toText(row.id)));
    const plans = await Promise.all(ids.map((id) => this.load(id)));
    // Waiting ones first, then the newest.
    plans.sort(
      (a, b) =>
        Number(b.status === 'pending') - Number(a.status === 'pending') ||
        b.createdAt.localeCompare(a.createdAt),
    );
    const start = (options.page - 1) * options.pageSize;
    return {
      data: await this.named(
        actor,
        plans.slice(start, start + options.pageSize),
      ),
      total: plans.length,
    };
  }

  // Carries the plan out as the person deciding, every step kept in one
  // transaction: one refused rolls them all back. A record changed since the
  // plan was made leaves it stale, carried out by no one.
  async execute(
    actor: Actor,
    id: string,
    input: { revision: number; skip?: number[] },
  ): Promise<PlanView> {
    const plan = await this.decidable(actor, id, input.revision);
    const skipped = new Set(input.skip ?? []);
    const steps = plan.steps.filter((step) => !skipped.has(step.position));
    if (!steps.length) throw new CrmError('invalidInput', 400, 'skip');
    const claimed = await this.service.database
      .query()
      .updateTable('crmPlans')
      .set({ status: 'executing', updatedAt: new Date().toISOString() })
      .where('id', '=', id)
      .where('status', '=', 'pending')
      .where('revision', '=', plan.revision)
      .execute();
    if (Number(claimed.updatedCount ?? 0) !== 1)
      throw new CrmError('conflict', 409);
    const stale = await this.staleStep(actor, steps);
    if (stale) return this.close(actor, plan, 'stale', stale);
    // The mailboxes the emails go from, still the person's and sending.
    let senders: Map<number, Sender>;
    try {
      senders = await this.sendersOf(actor, steps);
    } catch (error) {
      if (!(error instanceof StepRefused)) {
        await this.reopen(id);
        throw error;
      }
      return this.close(actor, plan, 'failed', failureOf(error));
    }
    const origin: ActorOrigin = {
      kind: 'plan',
      planId: plan.id,
      agentId: plan.agentId,
      agentName: plan.agentName,
      runId: plan.runId,
    };
    try {
      await this.service.mutate(
        { ...actor, via: 'assistant', origin },
        async (prepared, query) => {
          const refs = new Map<string, string>();
          for (const step of plan.steps) {
            if (skipped.has(step.position)) {
              await query
                .updateTable('crmPlanRows')
                .set({ status: 'removed' })
                .where('id', '=', step.id)
                .execute();
              continue;
            }
            const done = await this.runStep(
              prepared,
              query,
              { op: step.op, ref: step.ref ?? undefined, params: step.params },
              step.position,
              refs,
              { senders, row: { planId: plan.id, id: step.id } },
            ).catch((error: unknown) => {
              throw new StepRefused(step.position, error);
            });
            await query
              .updateTable('crmPlanRows')
              .set({
                status: 'done',
                result: JSON.stringify({ entity: done.entity, id: done.id }),
              })
              .where('id', '=', step.id)
              .execute();
          }
          const now = new Date().toISOString();
          await query
            .updateTable('crmPlans')
            .set({
              status: 'executed',
              deciderUserId: actor.id,
              decidedAt: now,
              updatedAt: now,
            })
            .where('id', '=', id)
            .execute();
        },
      );
    } catch (error) {
      if (!(error instanceof StepRefused)) {
        await this.reopen(id);
        throw error;
      }
      return this.close(actor, plan, 'failed', failureOf(error));
    }
    const executed = await this.load(id, actor);
    await this.tell({ plan: executed, decision: 'executed' });
    return executed;
  }

  // The person changes what a waiting step writes before deciding (a value
  // on the card): the values of a record it creates or updates. The whole
  // plan is rehearsed again with them, so a value the step would be refused
  // for is refused now, naming the step, and the plan keeps its revision;
  // otherwise every step's check is the new rehearsal's and the revision
  // moves on, so a card still showing the old plan cannot carry it out.
  async revise(
    actor: Actor,
    id: string,
    input: { revision: number; position: number; values: Row },
  ): Promise<PlanView> {
    const plan = await this.decidable(actor, id, input.revision);
    const target = plan.steps.find((step) => step.position === input.position);
    if (
      !target ||
      (target.op !== 'record.create' && target.op !== 'record.update')
    )
      throw new CrmError('invalidInput', 400, 'position');
    const params = {
      ...target.params,
      values: { ...object(target.params.values), ...input.values },
    };
    const steps: PlanStepInput[] = plan.steps.map((step) => ({
      op: step.op,
      ...(step.ref ? { ref: step.ref } : {}),
      params: step.position === input.position ? params : step.params,
    }));
    const checks = await this.rehearse(actor, steps);
    const now = new Date().toISOString();
    await this.service.database.transaction(async ({ query }) => {
      const moved = await query
        .updateTable('crmPlans')
        .set({ revision: plan.revision + 1, updatedAt: now })
        .where('id', '=', id)
        .where('status', '=', 'pending')
        .where('revision', '=', plan.revision)
        .execute();
      if (Number(moved.updatedCount ?? 0) !== 1)
        throw new CrmError('conflict', 409);
      for (const [index, step] of plan.steps.entries()) {
        const check = checks[index];
        await query
          .updateTable('crmPlanRows')
          .set({
            ...(step.position === input.position
              ? { params: JSON.stringify(params) }
              : {}),
            baseline: JSON.stringify(baselineOf(check)),
            check: JSON.stringify(check),
            targets: check?.id ? `${check.entity}:${check.id}` : null,
          })
          .where('id', '=', step.id)
          .execute();
      }
    });
    return this.get(actor, id);
  }

  async void(actor: Actor, id: string, revision: number): Promise<PlanView> {
    const plan = await this.decidable(actor, id, revision);
    return this.close(actor, plan, 'voided', null);
  }

  // Pending plans a day old expire; read before every list.
  async expireDue(): Promise<number> {
    const now = new Date().toISOString();
    const result = await this.service.database
      .query()
      .updateTable('crmPlans')
      .set({ status: 'expired', updatedAt: now })
      .where('status', '=', 'pending')
      .where('expiresAt', '<', now)
      .execute();
    return Number(result.updatedCount ?? 0);
  }

  private async decidable(
    actor: Actor,
    id: string,
    revision: number,
  ): Promise<PlanView> {
    await this.expireDue();
    const plan = await this.get(actor, id);
    if (plan.status !== 'pending')
      throw new CrmError(
        plan.status === 'expired' ? 'planExpired' : 'planDecided',
        409,
      );
    if (plan.revision !== revision) throw new CrmError('conflict', 409);
    return plan;
  }

  // Ends a plan that did not run (voided, stale, failed) and tells the
  // conversation.
  private async close(
    actor: Actor,
    plan: PlanView,
    status: 'voided' | 'stale' | 'failed',
    failure: Row | null,
  ): Promise<PlanView> {
    const now = new Date().toISOString();
    await this.service.database
      .query()
      .updateTable('crmPlans')
      .set({
        status,
        deciderUserId: actor.id,
        decidedAt: now,
        failure: failure ? JSON.stringify(failure) : null,
        updatedAt: now,
      })
      .where('id', '=', plan.id)
      .execute();
    const closed = await this.load(plan.id, actor);
    await this.tell({ plan: closed, decision: status });
    return closed;
  }

  private async reopen(id: string): Promise<void> {
    await this.service.database
      .query()
      .updateTable('crmPlans')
      .set({ status: 'pending', updatedAt: new Date().toISOString() })
      .where('id', '=', id)
      .where('status', '=', 'executing')
      .execute();
  }

  private async tell(outcome: PlanOutcome): Promise<void> {
    await this.onDecided?.(outcome).catch(() => undefined);
  }

  // The first step whose record changed since the plan was made.
  private async staleStep(
    actor: Actor,
    steps: PlanStepView[],
  ): Promise<Row | null> {
    for (const step of steps) {
      const baseline = step.check ? baselineOf(step.check) : null;
      if (!baseline?.updatedAt) continue;
      const current = await this.service
        .get(actor, baseline.entity, baseline.id)
        .catch(() => null);
      if (!current || iso(current.updatedAt) !== baseline.updatedAt)
        return { position: step.position, code: 'stale' };
    }
    return null;
  }

  // The plan as stored; with the reader, the names its steps refer to.
  private async load(id: string, actor?: Actor): Promise<PlanView> {
    const query = this.service.database.query();
    const plan = await query
      .selectFrom('crmPlans')
      .selectAll()
      .where('id', '=', id)
      .executeTakeFirst();
    if (!plan) throw new CrmError('notFound', 404);
    const rows = await query
      .selectFrom('crmPlanRows')
      .selectAll()
      .where('planId', '=', id)
      .orderBy('position', 'asc')
      .execute();
    const view: PlanView = {
      id: toText(plan.id),
      title: toText(plan.title),
      summary: plan.summary == null ? null : toText(plan.summary),
      status: toText(plan.status) as PlanStatus,
      revision: Number(plan.revision),
      proposerUserId: toText(plan.proposerUserId),
      agentId: plan.agentId == null ? null : toText(plan.agentId),
      agentName: plan.agentName == null ? null : toText(plan.agentName),
      runId: plan.runId == null ? null : toText(plan.runId),
      conversationId:
        plan.conversationId == null ? null : toText(plan.conversationId),
      deciderUserId:
        plan.deciderUserId == null ? null : toText(plan.deciderUserId),
      decidedAt: iso(plan.decidedAt),
      failure: json(plan.failure),
      expiresAt: iso(plan.expiresAt) ?? '',
      createdAt: iso(plan.createdAt) ?? '',
      steps: rows.map((row) => ({
        id: toText(row.id),
        position: Number(row.position),
        op: toText(row.op) as PlanOp,
        ref: row.ref == null ? null : toText(row.ref),
        params: json(row.params) ?? {},
        check: json(row.check) as StepCheck | null,
        status: toText(row.status) as PlanStepView['status'],
        result: json(row.result),
      })),
      titles: {},
    };
    return actor ? (await this.named(actor, [view]))[0] : view;
  }

  // The plans with the titles of the records their steps' values name
  // (relation fields, old and new), resolved in one round for them all as
  // the reader may read them, so the card links each by its name.
  private async named(actor: Actor, plans: PlanView[]): Promise<PlanView[]> {
    const named = new Map<PlanView, Set<string>>();
    const extra: Partial<Record<Entity, string[]>> = {};
    for (const plan of plans) {
      const ids = new Set<string>();
      for (const step of plan.steps) {
        const fields = definitions[step.check?.entity as Entity]?.fields ?? [];
        for (const change of step.check?.changes ?? []) {
          const relation = fields.find((f) => f.key === change.field)?.relation;
          if (!relation || relation === 'users') continue;
          for (const value of [change.from, change.to].flat()) {
            const id = typeof value === 'string' ? value : '';
            if (!id || id.startsWith('$')) continue;
            ids.add(id);
            (extra[relation] ??= []).push(id);
          }
        }
      }
      named.set(plan, ids);
    }
    const { titles } = Object.keys(extra).length
      ? await resolveTitles(this.service, actor, {}, extra)
      : { titles: {} as Record<string, string> };
    return plans.map((plan) => ({
      ...plan,
      titles: Object.fromEntries(
        [...(named.get(plan) ?? [])]
          .filter((id) => id in titles)
          .map((id) => [id, titles[id]]),
      ),
    }));
  }

  // The mailbox each email of the steps goes from, as the person: the one
  // the step names, else their first that sends. Read before the
  // transaction opens, the Mail plugin reading with connections of its own.
  private async sendersOf(
    actor: Actor,
    steps: { op: PlanOp; params: Row; position: number }[],
  ): Promise<Map<number, Sender>> {
    const senders = new Map<number, Sender>();
    for (const step of steps) {
      if (step.op !== 'mail.send') continue;
      try {
        senders.set(step.position, await this.senderOf(actor, step.params));
      } catch (error) {
        throw new StepRefused(step.position, error);
      }
    }
    return senders;
  }

  private async senderOf(actor: Actor, params: Row): Promise<Sender> {
    const mail = this.workers.mail?.();
    if (!mail) throw new CrmError('noMailbox', 409);
    const context = { actorId: actor.id, locale: actor.locale };
    const [accounts, providers] = await Promise.all([
      mail.listAccounts(context),
      mail.listProviders(),
    ]);
    // As the mail pages offer them (client mail.tsx, sendable).
    const sending = accounts.filter(
      (account) =>
        account.status === 'active' &&
        providers.some(
          (provider) =>
            provider.type === account.provider.type &&
            provider.name === account.provider.name &&
            provider.capabilities.send === true,
        ),
    );
    const wanted = toText(params.accountId ?? '').trim();
    const account = wanted
      ? sending.find((item) => item.id === wanted)
      : sending[0];
    if (!account)
      throw new CrmError('noMailbox', 409, wanted ? 'accountId' : undefined);
    const identities = await mail.listIdentities(context, account.id);
    const identity =
      identities.find((item) => item.isPrimary && item.canSend) ??
      identities.find((item) => item.canSend);
    if (!identity) throw new CrmError('noMailbox', 409);
    return {
      accountId: account.id,
      identityId: identity.id,
      address: identity.address,
    };
  }

  // Sends a confirmed plan's email once its changes are committed, as the
  // person, and writes how that went on its step: sent (or queued by the
  // provider), or failed, the rest of the plan standing either way.
  private async sendMail(
    actor: Actor,
    sender: Sender,
    mail: PlanMail,
    row: { planId: string; id: string },
  ): Promise<void> {
    let result: Row;
    let status: PlanStepView['status'] = 'done';
    try {
      const service = this.workers.mail?.();
      if (!service) throw new CrmError('noMailbox', 409);
      const submission = await service.sendMessage(
        { actorId: actor.id, locale: actor.locale },
        {
          accountId: sender.accountId,
          identityId: sender.identityId,
          to: mail.to.map((address) => ({ address })),
          cc: mail.cc.map((address) => ({ address })),
          subject: mail.subject,
          text: mail.text,
          // One delivery per step, however often this runs.
          idempotencyKey: `crm-plan:${row.planId}:${row.id}`,
        },
      );
      if (['failed', 'cancelled'].includes(submission.status))
        throw new CrmError('mailFailed', 502);
      result = { submissionId: submission.id, delivery: submission.status };
      await this.workers.mailSent?.(actor.id).catch(() => undefined);
    } catch (error) {
      status = 'failed';
      result = {
        code: error instanceof CrmError ? error.code : 'mailFailed',
      };
    }
    await this.service.database
      .query()
      .updateTable('crmPlanRows')
      .set({ status, result: JSON.stringify(result) })
      .where('id', '=', row.id)
      .execute();
  }

  // One step, inside the transaction `query` belongs to, as `actor`; what
  // it does to its record. What the change starts besides (a follow-up, a
  // notification, an email) waits for the commit through the prepared
  // actor.
  private async runStep(
    actor: Actor,
    query: QueryAdapter,
    step: PlanStepInput,
    position: number,
    refs: Map<string, string>,
    context: StepContext,
  ): Promise<StepCheck> {
    const params = resolveRefs(step.params, refs);
    const remember = (id: string) => {
      refs.set(`$${toText(position)}`, id);
      if (step.ref)
        refs.set(step.ref.startsWith('$') ? step.ref : `$${step.ref}`, id);
    };
    const after = (callback: () => Promise<void> | void) =>
      actor.after?.(async () => {
        await callback();
      });
    switch (step.op) {
      case 'record.create': {
        const entity = asEntity(toText(params.entity));
        const values = object(params.values);
        const record = await this.service.save(
          actor,
          entity,
          values,
          undefined,
          query,
        );
        remember(record.id);
        after(() =>
          afterCreate(
            this.service,
            this.workers,
            actor,
            entity,
            record,
            params.followUp !== false,
          ),
        );
        return {
          entity,
          id: null,
          name: toText(record.name),
          changes: Object.entries(values).map(([field, to]) => ({
            field,
            from: null,
            to,
          })),
        };
      }
      case 'record.update': {
        const entity = asEntity(toText(params.entity));
        const id = toText(params.id);
        const values = object(params.values);
        const before = await this.service.get(
          actor,
          entity,
          id,
          query,
          'update',
        );
        const hooked = await beforeUpdate(
          this.service,
          actor,
          entity,
          id,
          query,
        );
        const record = await this.service.save(
          actor,
          entity,
          values,
          id,
          query,
        );
        after(() =>
          afterUpdate(this.service, actor, entity, id, hooked, record),
        );
        return checkOf(entity, before, values);
      }
      case 'lead.convert': {
        const id = toText(params.leadId);
        const before = await this.service.get(actor, 'leads', id, query);
        const lead = await convertLead(
          this.service,
          actor,
          id,
          object(params.conversion),
          query,
        );
        if (lead.convertedOpportunityId && params.followUp !== false)
          after(() =>
            this.service.opportunityOpened?.(
              actor,
              toText(lead.convertedOpportunityId),
            ),
          );
        return checkOf('leads', before, { status: 'converted' });
      }
      case 'comment.create': {
        const entity = asEntity(toText(params.entity));
        const id = toText(params.id);
        const record = await this.service.get(actor, entity, id, query);
        await this.service.addCommentIn(
          actor,
          query,
          entity,
          id,
          params.text,
          params.mentions,
        );
        return {
          entity,
          id,
          name: toText(record.name),
          changes: [{ field: 'comment', from: null, to: params.text }],
        };
      }
      case 'task.recordOutcome': {
        const id = toText(params.taskId);
        const before = await this.service.get(
          actor,
          'tasks',
          id,
          query,
          'update',
        );
        if (before.status !== 'open') throw new CrmError('taskChanged', 409);
        const values: Row = {
          status: 'completed',
          ...(toText(params.outcome ?? '').trim()
            ? { result: toText(params.outcome).trim() }
            : {}),
        };
        const record = await this.service.save(
          actor,
          'tasks',
          values,
          id,
          query,
        );
        if (params.followUp !== false)
          after(() => this.service.taskCompleted?.(actor, record));
        return checkOf('tasks', before, values);
      }
      case 'approval.submit':
      case 'approval.withdraw': {
        const id = toText(params.approvalId);
        const before = await this.service.get(actor, 'approvals', id, query);
        const record = await this.service.approvalAction(
          actor,
          id,
          step.op === 'approval.submit' ? 'submit' : 'withdraw',
          toText(params.comment ?? ''),
          query,
        );
        return checkOf('approvals', before, { status: record.status });
      }
      // The approver's decision, with the comment the applicant reads; the
      // CRM checks they are its approver, as on the approval's page.
      case 'approval.decide': {
        const id = toText(params.approvalId);
        const decision = toText(params.decision);
        if (decision !== 'approve' && decision !== 'reject')
          throw new CrmError('invalidInput', 400, 'decision');
        const comment = toText(params.comment ?? '').trim();
        const before = await this.service.get(actor, 'approvals', id, query);
        const record = await this.service.approvalAction(
          actor,
          id,
          decision,
          comment,
          query,
        );
        const check = checkOf('approvals', before, { status: record.status });
        if (comment)
          check.changes.push({ field: 'comment', from: null, to: comment });
        return check;
      }
      // A follow-up's or a task preparation's card decided as its own
      // buttons would: accepting takes what the card proposes as it stands.
      case 'suggestion.decide': {
        const entity = toText(params.entity);
        if (!['leads', 'opportunities', 'tasks'].includes(entity))
          throw new CrmError('invalidInput', 400, 'entity');
        const id = toText(params.recordId);
        const decision = params.decision === 'dismiss' ? 'dismiss' : 'accept';
        const before = await this.service.get(
          actor,
          entity as Entity,
          id,
          query,
        );
        const entry = await pendingSuggestion(
          query,
          entity,
          id,
          toText(params.entryId ?? ''),
        );
        const settings = await this.service.settings(query);
        let taskId: unknown;
        if (entity === 'tasks') {
          const preparer = this.workers.tasks?.();
          if (!preparer) throw new CrmError('aiDisabled', 409);
          await preparer.decideIn(actor, query, settings, {
            taskId: id,
            entryId: entry.id,
            decision,
          });
        } else if (entity === 'leads') {
          const evaluator = this.workers.leads();
          if (!evaluator) throw new CrmError('aiDisabled', 409);
          const verdict = object(entry.ai.result);
          taskId = (
            await evaluator.decideIn(actor, query, settings, {
              leadId: id,
              entryId: entry.id,
              decision,
              // The web findings, all ticked as on the card.
              fields: entry.ai.enrichedAt ? [] : fieldsOf(verdict.enrich),
            })
          ).ai.taskId;
        } else {
          const evaluator = this.workers.opportunities();
          if (!evaluator) throw new CrmError('aiDisabled', 409);
          const verdict = object(entry.ai.result);
          taskId = (
            await evaluator.decideIn(actor, query, settings, {
              opportunityId: id,
              entryId: entry.id,
              decision,
              // The card's own: every update and finding ticked, every
              // approval kept with its default approver, every contact.
              fields: [
                ...fieldsOf(verdict.updates),
                ...(entry.ai.enrichedAt ? [] : fieldsOf(verdict.enrich)),
              ],
              approvals: Array.isArray(verdict.approvals)
                ? verdict.approvals.map((_, index) => ({ index }))
                : [],
            })
          ).ai.taskId;
        }
        const after = await this.service.get(
          actor,
          entity as Entity,
          id,
          query,
        );
        const fields = new Set(
          definitions[entity as Entity].fields.map((field) => field.key),
        );
        const check = checkOf(
          entity as Entity,
          before,
          Object.fromEntries(
            Object.entries(after).filter(([field]) => fields.has(field)),
          ),
        );
        const task = taskId
          ? await this.service
              .get(actor, 'tasks', toText(taskId), query)
              .catch(() => null)
          : null;
        check.changes = [
          {
            field: 'suggestion',
            from: null,
            to: toText(object(entry.ai.result).summary ?? ''),
          },
          ...check.changes,
          ...(task
            ? [{ field: 'nextTask', from: null, to: toText(task.name) }]
            : []),
        ];
        return check;
      }
      // An email from the person's own mailbox, sent once the plan is
      // carried out and committed; the record it concerns, if named, must
      // be one they read.
      case 'mail.send': {
        const sender = context.senders.get(position);
        if (!sender) throw new CrmError('noMailbox', 409);
        const mail: PlanMail = {
          from: sender.address,
          to: addressesOf(params.to),
          cc: addressesOf(params.cc),
          subject: toText(params.subject ?? '').trim(),
          text: toText(params.text ?? '').trim(),
        };
        if (!mail.to.length) throw new CrmError('required', 400, 'to');
        if (!mail.subject) throw new CrmError('required', 400, 'subject');
        if (!mail.text) throw new CrmError('required', 400, 'text');
        const entity = params.entity ? asEntity(toText(params.entity)) : null;
        const record =
          entity && params.recordId
            ? await this.service.get(
                actor,
                entity,
                toText(params.recordId),
                query,
              )
            : null;
        const row = context.row;
        if (row) after(() => this.sendMail(actor, sender, mail, row));
        return {
          entity: entity ?? 'contacts',
          id: record ? toText(record.id) : null,
          name: record ? toText(record.name) : '',
          changes: [],
          mail,
        };
      }
    }
  }
}

// The waiting suggestion a step decides: the one it names, else the
// record's newest.
async function pendingSuggestion(
  query: QueryAdapter,
  entity: string,
  recordId: string,
  entryId: string,
) {
  let select = query
    .selectFrom('crmHistory')
    .selectAll()
    .where('entity', '=', entity)
    .where('recordId', '=', recordId)
    .where('action', '=', 'ai');
  select = entryId
    ? select.where('id', '=', entryId)
    : select.where('aiStatus', '=', 'pending');
  const row = await select.orderBy('createdAt', 'desc').executeTakeFirst();
  if (!row) throw new CrmError('evaluationDecided', 409);
  const entry = readEntry<Row>(row);
  if (entry.status !== 'pending' || !entry.ai.result)
    throw new CrmError('evaluationDecided', 409);
  return entry;
}

// The fields a card's list proposes (`{ field }` each).
function fieldsOf(items: unknown): string[] {
  return Array.isArray(items)
    ? items.map((item) => toText(object(item).field)).filter(Boolean)
    : [];
}

// Addresses as a step gives them: a list, or one string split at commas.
function addressesOf(value: unknown): string[] {
  const items = Array.isArray(value)
    ? value
    : toText(value ?? '').split(/[,;]/u);
  return items
    .map((item) =>
      typeof item === 'object' && item
        ? toText(object(item).address ?? '')
        : toText(item),
    )
    .map((item) => item.trim())
    .filter(Boolean);
}

// What a step decides or changes that another plan's step must not do as
// well: a field of a record, a suggestion, an approval's state, mail to an
// address. A record a step creates conflicts with nothing, nor does a
// comment; a value naming a record the plan creates (`$1`) is left out.
function conflictKeys(step: Pick<PlanStepInput, 'op' | 'params'>): string[] {
  const p = step.params;
  const known = (...parts: unknown[]): string | null => {
    const texts = parts.map((part) => toText(part ?? ''));
    return texts.some((text) => !text || text.startsWith('$'))
      ? null
      : texts.join(':');
  };
  const keys: (string | null)[] = [];
  switch (step.op) {
    case 'record.update':
      for (const field of Object.keys(object(p.values)))
        keys.push(known(p.entity, p.id, field));
      break;
    case 'task.recordOutcome':
      keys.push(known('tasks', p.taskId, 'status'));
      break;
    case 'lead.convert':
      keys.push(known('leads', p.leadId, 'status'));
      break;
    case 'approval.submit':
    case 'approval.withdraw':
    case 'approval.decide':
      keys.push(known('approvals', p.approvalId, 'status'));
      break;
    case 'suggestion.decide':
      keys.push(known('suggestion', p.entity, p.recordId));
      break;
    case 'mail.send':
      for (const address of [...addressesOf(p.to), ...addressesOf(p.cc)])
        keys.push(known('mail', address.toLowerCase()));
      break;
    default:
      break;
  }
  return keys.filter((key): key is string => Boolean(key));
}

// A later step names a record an earlier one created by `$<position>` or
// its ref, wherever an id goes.
function resolveRefs(value: Row, refs: Map<string, string>): Row {
  const walk = (item: unknown): unknown => {
    if (typeof item === 'string' && refs.has(item)) return refs.get(item);
    if (Array.isArray(item)) return item.map(walk);
    if (item && typeof item === 'object')
      return Object.fromEntries(
        Object.entries(item).map(([key, inner]) => [key, walk(inner)]),
      );
    return item;
  };
  return walk(value) as Row;
}

// What a change does to an existing record: each field that differs.
function checkOf(entity: Entity, before: Row, values: Row): StepCheck {
  return {
    entity,
    id: toText(before.id),
    name: toText(before.name),
    changes: Object.entries(values)
      .filter(
        ([field, to]) =>
          JSON.stringify(before[field] ?? null) !== JSON.stringify(to ?? null),
      )
      .map(([field, to]) => ({ field, from: before[field] ?? null, to })),
    updatedAt: iso(before.updatedAt),
  };
}

function baselineOf(
  check: StepCheck | undefined,
): { entity: Entity; id: string; updatedAt: string } | null {
  return check?.id && check.updatedAt
    ? { entity: check.entity, id: check.id, updatedAt: check.updatedAt }
    : null;
}

function failureOf(error: StepRefused): Row {
  const cause = error.cause;
  return cause instanceof CrmError
    ? {
        position: error.position,
        code: cause.code,
        ...(cause.field ? { field: cause.field } : {}),
        ...(cause.detail ? { detail: cause.detail } : {}),
      }
    : { position: error.position, code: 'serverError' };
}

// A refused step, as the agent reads it: which step, and the CRM's reason.
function refusal(error: StepRefused): unknown {
  const cause = error.cause;
  if (!(cause instanceof CrmError)) return cause;
  return new CrmError(
    'planStepRefused',
    400,
    `steps.${toText(error.position)}`,
    `${cause.code}${cause.field ? `: ${cause.field}` : ''}`,
  );
}

export const crmPlansToken: ServiceToken<CrmPlans> =
  createServiceToken<CrmPlans>('crm/plans');
