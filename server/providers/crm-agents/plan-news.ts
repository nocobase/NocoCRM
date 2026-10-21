import type { Agents } from '@nocobase/app-plugin-agents/server/tokens';
import type { AssistantWake } from './assistant.js';
import type { PlanOutcome } from '../crm/plans/engine.js';
import { toText } from '../crm/schema.js';
import type { CrmService } from '../crm/service.js';

// How a plan's decision reaches the conversation it came from: a notice the
// person sees in the conversation, and what became of the plan told to the
// agent (an input that wakes a runner agent, the CRM's news for the
// assistant, `wake`), so it can carry on or propose again.
export function deliverPlanOutcome(
  agents: Agents,
  service: CrmService,
  wake?: AssistantWake,
): (outcome: PlanOutcome) => Promise<void> {
  return async ({ plan, decision }) => {
    const conversationId = plan.conversationId;
    if (!conversationId) return;
    const decider = plan.deciderUserId ?? plan.proposerUserId;
    const user = await service.database
      .query()
      .selectFrom('user')
      .select(['name'])
      .where('id', '=', decider)
      .executeTakeFirst();
    const done = plan.steps.filter((step) => step.status === 'done').length;
    const failure = plan.failure;
    const text =
      decision === 'executed'
        ? `The person confirmed plan "${plan.title}": ${toText(done)} of ${toText(plan.steps.length)} steps were carried out.`
        : decision === 'voided'
          ? `The person declined plan "${plan.title}"; nothing was changed.`
          : decision === 'stale'
            ? `Plan "${plan.title}" was not carried out: the record of step ${toText(failure?.position)} changed after the plan was made. Look it up again and propose a new plan if the change is still needed.`
            : `Plan "${plan.title}" failed at step ${toText(failure?.position)} (${toText(failure?.code)}${failure?.field ? `: ${toText(failure.field)}` : ''}); nothing was changed.`;
    await agents.tx.run((tx) =>
      agents.conversations.deliver(tx, conversationId, {
        notice: {
          code: 'news',
          type: 'planDecided',
          title: plan.title,
          params: { planId: plan.id, decision },
        },
        input: {
          type: 'planDecided',
          actor: { kind: 'user', id: decider, name: toText(user?.name ?? '') },
          text,
          payload: { planId: plan.id, decision, failure },
        },
      }),
    );
    wake?.(conversationId, text);
  };
}
