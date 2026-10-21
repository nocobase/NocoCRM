import {
  agentsToken,
  runIdentityOf,
} from '@nocobase/app-plugin-agents/server/tokens';
import {
  ASSISTANT_ID,
  ASSISTANT_NAME,
  assistantIdentityOf,
} from '../providers/crm-agents/assistant.js';
import type { Application } from '@nocobase/app-server/application';
import {
  apiErrorResponse,
  apiErrorResponses,
  apiValidator,
  dataResponse,
  describeRoute,
  listResponse,
} from '@nocobase/app-server/router';
import type { Hono } from 'hono';
import { z } from 'zod';
import { PLAN_ACTION } from '../providers/crm-agents/actions.js';
import {
  crmPlansToken,
  type PlanSource,
} from '../providers/crm/plans/engine.js';
import { runCommand, type CrmEnv } from './context.js';
import {
  CreatePlanInput,
  DecidePlanInput,
  PlanParams,
  PlanSchema,
  PlansQuery,
  RevisePlanStepInput,
  RevisePlanStepParams,
  VoidPlanInput,
} from './schemas/plans.js';

// Plans (plans/engine.ts): an agent proposes one with `crm plan create`
// after a write command answered PLAN_REQUIRED; the person it works for
// carries it out or voids it on its decision card.

const tags = ['Plans'];
const decided = apiErrorResponse(
  400,
  'The plan was already decided or has expired (`PLAN_DECIDED`, `PLAN_EXPIRED`).',
);
const notFound = apiErrorResponse(404, 'No such plan of the reader’s.');

export function registerPlanRoutes(
  app: Application,
  router: Hono<CrmEnv>,
): void {
  const plans = () => app.container.resolve(crmPlansToken);

  router.post(
    '/plans',
    describeRoute({
      tags,
      summary: 'Propose a plan',
      operationId: 'createPlan',
      description:
        'Rehearses every step as the person and keeps the plan for them to confirm; nothing changes until they do. A step that would be refused is named in the error (`PLAN_STEP_REFUSED`, the step in its field, the reason in `metadata.detail`).',
      ...runCommand(PLAN_ACTION, { command: 'plan create', bodyFile: 'file' }),
      responses: {
        '201': dataResponse(PlanSchema, 'The plan, waiting for the person.'),
        ...apiErrorResponses,
      },
    }),
    apiValidator('json', CreatePlanInput),
    async (c) => {
      const actor = c.get('actor');
      const run = runIdentityOf(c.get('auth'));
      const assistant = assistantIdentityOf(c.get('auth'));
      let source: PlanSource = {
        agentId: null,
        agentName: null,
        runId: null,
        conversationId: null,
      };
      if (assistant)
        source = {
          agentId: ASSISTANT_ID,
          agentName: ASSISTANT_NAME,
          runId: null,
          conversationId: assistant.conversationId || null,
        };
      else if (run?.run && app.container.has(agentsToken)) {
        const agents = app.container.resolve(agentsToken);
        const record = run.run.run;
        // A consulted agent's plan is confirmed where the asking run works.
        const home = await agents.conversations.homeOf(agents.tx.read(), {
          subject: {
            kind: record.subjectKind,
            id: record.subjectId,
          },
          actorUserId: record.actorUserId,
          parentRunId: record.parentRunId,
        });
        source = {
          agentId: run.agent?.id ?? null,
          agentName: run.agent?.name ?? null,
          runId: record.id,
          conversationId: home?.id ?? null,
        };
      }
      const plan = await plans().create(actor, c.req.valid('json'), source);
      return c.json({ data: plan }, 201);
    },
  );

  router.get(
    '/plans',
    describeRoute({
      tags,
      summary: 'List plans',
      operationId: 'listPlans',
      description:
        'The plans proposed to the reader, those waiting first; a record’s with `target`.',
      ...runCommand(PLAN_ACTION, {
        command: 'plan list',
        columns: ['id', 'title', 'status', 'createdAt'],
      }),
      responses: {
        '200': listResponse(
          PlanSchema,
          z.object({
            page: z.number().int(),
            pageSize: z.number().int(),
            total: z.number().int(),
          }),
        ),
        ...apiErrorResponses,
      },
    }),
    apiValidator('query', PlansQuery),
    async (c) => {
      const query = c.req.valid('query');
      const result = await plans().list(c.get('actor'), query);
      return c.json({
        data: result.data,
        meta: {
          page: query.page,
          pageSize: query.pageSize,
          total: result.total,
        },
      });
    },
  );

  router.get(
    '/plans/:planId',
    describeRoute({
      tags,
      summary: 'Get a plan',
      operationId: 'getPlan',
      ...runCommand(PLAN_ACTION, { command: 'plan get' }),
      responses: {
        '200': dataResponse(PlanSchema),
        ...apiErrorResponses,
        '404': notFound,
      },
    }),
    apiValidator('param', PlanParams),
    async (c) =>
      c.json({
        data: await plans().get(c.get('actor'), c.req.valid('param').planId),
      }),
  );

  // Deciding is the person's alone: these accept no run token.
  router.post(
    '/plans/:planId/execute',
    describeRoute({
      tags,
      summary: 'Carry a plan out',
      operationId: 'executePlan',
      description:
        'As the person, every step in one transaction: a step refused rolls them all back (`failed`), a record changed since the plan was made leaves it `stale`. The outcome goes back to the agent’s conversation.',
      responses: {
        '200': dataResponse(PlanSchema, 'The plan as it ended.'),
        ...apiErrorResponses,
        '400': decided,
        '404': notFound,
        '409': apiErrorResponse(
          409,
          'The plan changed or is being carried out (`CONFLICT`).',
        ),
      },
    }),
    apiValidator('param', PlanParams),
    apiValidator('json', DecidePlanInput),
    async (c) =>
      c.json({
        data: await plans().execute(
          c.get('actor'),
          c.req.valid('param').planId,
          c.req.valid('json'),
        ),
      }),
  );

  // The person changes a waiting step's values on the card; no run token.
  router.patch(
    '/plans/:planId/steps/:position',
    describeRoute({
      tags,
      summary: 'Change a step of a plan',
      operationId: 'revisePlanStep',
      description:
        'Lays the values over those of a waiting step that creates or updates a record, rehearses the whole plan again and moves its revision on; a value the step would be refused for is refused now (`PLAN_STEP_REFUSED`, the step in `metadata.field`).',
      responses: {
        '200': dataResponse(PlanSchema, 'The plan as revised.'),
        ...apiErrorResponses,
        '400': decided,
        '404': notFound,
        '409': apiErrorResponse(409, 'The plan changed (`CONFLICT`).'),
      },
    }),
    apiValidator('param', RevisePlanStepParams),
    apiValidator('json', RevisePlanStepInput),
    async (c) => {
      const { planId, position } = c.req.valid('param');
      const { revision, values } = c.req.valid('json');
      return c.json({
        data: await plans().revise(c.get('actor'), planId, {
          revision,
          position,
          values,
        }),
      });
    },
  );

  router.post(
    '/plans/:planId/void',
    describeRoute({
      tags,
      summary: 'Void a plan',
      operationId: 'voidPlan',
      description: 'Nothing is changed; the agent’s conversation is told.',
      responses: {
        '200': dataResponse(PlanSchema),
        ...apiErrorResponses,
        '400': decided,
        '404': notFound,
        '409': apiErrorResponse(409, 'The plan changed (`CONFLICT`).'),
      },
    }),
    apiValidator('param', PlanParams),
    apiValidator('json', VoidPlanInput),
    async (c) =>
      c.json({
        data: await plans().void(
          c.get('actor'),
          c.req.valid('param').planId,
          c.req.valid('json').revision,
        ),
      }),
  );
}
