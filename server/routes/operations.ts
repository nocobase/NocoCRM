import type { Application } from '@nocobase/app-server/application';
import {
  apiErrorResponse,
  apiErrorResponses,
  apiValidator,
  dataResponse,
  describeRoute,
  listResponse,
} from '@nocobase/app-server/router';
import type { Row } from '@nocobase/db';
import type { Hono } from 'hono';
import { z } from 'zod';
import { agentOn } from '../providers/crm/agents.js';
import { latestReview } from '../providers/crm/approval-review.js';
import { conversionPreview, convertLead } from '../providers/crm/conversion.js';
import { organiseFeedback, recordOutcome } from '../providers/crm/feedback.js';
import { crmToken } from '../providers/crm/index.js';
import { captureLeads } from '../providers/crm/lead-capture.js';
import { latestEvaluation } from '../providers/crm/lead-evaluation.js';
import {
  leadDuplicates,
  mergeLeads,
  mergeProposal,
} from '../providers/crm/lead-merge.js';
import {
  captureOpportunity,
  matchCompany,
  peopleOf,
} from '../providers/crm/opportunity-capture.js';
import { latestOpportunityEvaluation } from '../providers/crm/opportunity-evaluation.js';
import { CrmError, toText } from '../providers/crm/schema.js';
import { latestPreparation } from '../providers/crm/task-preparation.js';
import { resolveTitles } from '../providers/crm/titles.js';
import { aiWorkers, runCommand, watchRunWork, type CrmEnv } from './context.js';
import {
  AI_WORK_ACTION,
  recordAction,
} from '../providers/crm-agents/actions.js';
import {
  AiEntry,
  ApprovalActionInput,
  CaptureLeadsInput,
  CaptureOpportunityInput,
  CapturedLeads,
  CapturedOpportunity,
  CompanyMatch,
  ConversionPreview,
  ConvertLeadInput,
  DecideLeadEvaluationInput,
  DecideOpportunityEvaluationInput,
  DecidePreparationInput,
  DecideReviewInput,
  EnrichInput,
  EntryParams,
  EvaluateInput,
  LeadDuplicateSchema,
  MatchCompanyInput,
  MergeLeadsInput,
  MergeProposalSchema,
  OrganiseFeedbackInput,
  ProposeMergeInput,
  RecordOutcomeInput,
} from './schemas/operations.js';
import { RecordParams, RecordSchemas } from './schemas/records.js';
import { DEFAULT_TIME_ZONE } from '../providers/crm/zone-time.js';

// The leads', opportunities', tasks' and approvals' own operations, as
// custom methods on the object (`/leads/capture`) or on one record
// (`/leads/{leadId}/convert`). Registered before the standard methods, so
// a fixed segment is never taken for an id.

const unavailable = apiErrorResponse(
  503,
  'The AI cannot take the work now: the assistant is off or its model failed (`ASSISTANT_UNAVAILABLE`, `CAPTURE_FAILED`).',
);
const notFound = (what: string) =>
  apiErrorResponse(
    404,
    `The ${what} does not exist or the reader may not see it.`,
  );
const decided = apiErrorResponse(
  400,
  'The suggestion was already decided or replaced (`EVALUATION_DECIDED`).',
);

export function registerOperationRoutes(
  app: Application,
  router: Hono<CrmEnv>,
): void {
  const service = app.container.resolve(crmToken);
  const ai = aiWorkers(app);
  const timeZone = async () =>
    (await service.settings()).timeZone || DEFAULT_TIME_ZONE;

  // Leads ---------------------------------------------------------------
  const leadTags = ['Leads'];

  // New lead with the AI: pasted text in, prefilled lead forms out
  // (lead-capture.ts). Nothing is saved here; the form is.
  router.post(
    '/leads/capture',
    describeRoute({
      tags: leadTags,
      summary: 'Organise leads from pasted text',
      operationId: 'captureLeads',
      description:
        'The AI reads the text and returns prefilled leads with possible duplicates; nothing is saved. With `instruction` and `leads`, it revises the leads as asked.',
      responses: {
        '200': dataResponse(CapturedLeads),
        ...apiErrorResponses,
        '503': unavailable,
      },
    }),
    apiValidator('json', CaptureLeadsInput),
    async (c) =>
      c.json({
        data: await captureLeads(
          service,
          app.container,
          c.get('actor'),
          c.req.valid('json'),
          await timeZone(),
        ),
      }),
  );

  // Open leads that repeat this one, and their merge (lead-merge.ts): the
  // proposal (the AI's where it is on) and the merge the person confirms,
  // the lead in the path being the one kept.
  router.get(
    '/leads/:leadId/duplicates',
    describeRoute({
      tags: leadTags,
      summary: "List a lead's duplicates",
      operationId: 'listLeadDuplicates',
      ...runCommand(recordAction('leads', 'view'), {
        command: 'leads duplicates',
      }),
      description: 'Open leads the same person or contact details appear on.',
      responses: {
        '200': listResponse(
          LeadDuplicateSchema,
          z.object({ total: z.number().int() }),
        ),
        ...apiErrorResponses,
        '404': notFound('lead'),
      },
    }),
    apiValidator('param', RecordParams.leads),
    async (c) => {
      const data = await leadDuplicates(
        service,
        c.get('actor'),
        toText(c.req.valid('param').leadId),
      );
      return c.json({ data, meta: { total: data.length } });
    },
  );
  router.post(
    '/leads/:leadId/proposeMerge',
    describeRoute({
      tags: leadTags,
      summary: 'Propose a merge of two leads',
      operationId: 'proposeLeadMerge',
      description:
        "Which lead to keep and which value each differing field takes: the AI's proposal where it is on, plain rules otherwise. Changes nothing.",
      responses: {
        '200': dataResponse(MergeProposalSchema),
        ...apiErrorResponses,
        '404': notFound('lead'),
      },
    }),
    apiValidator('param', RecordParams.leads),
    apiValidator('json', ProposeMergeInput),
    async (c) =>
      c.json({
        data: await mergeProposal(
          service,
          app.container,
          c.get('actor'),
          toText(c.req.valid('param').leadId),
          c.req.valid('json'),
        ),
      }),
  );
  router.post(
    '/leads/:leadId/merge',
    describeRoute({
      tags: leadTags,
      summary: 'Merge a lead into this one',
      operationId: 'mergeLeads',
      description:
        "Keeps this lead with the values picked, moves the other's tasks and comments to it and deletes the other. Requires edit access to both.",
      responses: {
        '200': dataResponse(RecordSchemas.leads, 'The kept lead.'),
        ...apiErrorResponses,
        '400': apiErrorResponse(
          400,
          'A lead is converted already (`CONVERTED_READ_ONLY`).',
        ),
        '404': notFound('lead'),
      },
    }),
    apiValidator('param', RecordParams.leads),
    apiValidator('json', MergeLeadsInput),
    async (c) => {
      const actor = c.get('actor');
      const body = c.req.valid('json');
      const lead = await mergeLeads(
        service,
        actor,
        toText(c.req.valid('param').leadId),
        body,
      );
      // The kept lead is followed up anew unless the person unticked that.
      if (
        body.followUp !== false &&
        (await agentOn(service, 'leads', 'merged'))
      )
        await ai
          .leads()
          ?.request(actor, toText(lead.id), undefined, 'merged')
          .catch(() => null);
      return c.json({ data: lead });
    },
  );

  router.get(
    '/leads/:leadId/previewConversion',
    describeRoute({
      tags: leadTags,
      summary: "Preview a lead's conversion",
      operationId: 'previewLeadConversion',
      ...runCommand(recordAction('leads', 'view'), {
        command: 'leads preview-conversion',
      }),
      description:
        'The companies, contacts and open opportunities a conversion may duplicate.',
      responses: {
        '200': dataResponse(ConversionPreview),
        ...apiErrorResponses,
        '404': notFound('lead'),
      },
    }),
    apiValidator('param', RecordParams.leads),
    async (c) => {
      const actor = c.get('actor');
      const data = await conversionPreview(
        service,
        actor,
        toText(c.req.valid('param').leadId),
      );
      // Only the names: the sizes resolveTitles adds under `opportunities`
      // would replace the preview's own list of open opportunities.
      const { titles, names } = await resolveTitles(service, actor, {
        leads: [data.lead as Row],
        companies: data.companies as Row[],
        contacts: data.contacts as Row[],
        opportunities: data.opportunities as Row[],
      });
      return c.json({ data: { ...data, titles, names } });
    },
  );
  router.post(
    '/leads/:leadId/convert',
    describeRoute({
      tags: leadTags,
      summary: 'Convert a lead',
      operationId: 'convertLead',
      ...runCommand(recordAction('leads', 'edit'), {
        command: 'leads convert',
      }),
      description:
        'Creates or links its company and contact, and an opportunity when asked; the lead becomes read-only.',
      responses: {
        '200': dataResponse(RecordSchemas.leads, 'The converted lead.'),
        ...apiErrorResponses,
        '400': apiErrorResponse(
          400,
          'The lead is converted already (`CONVERTED_READ_ONLY`), or the contact is at another company (`COMPANY_MISMATCH`).',
        ),
        '404': notFound('lead'),
      },
    }),
    apiValidator('param', RecordParams.leads),
    apiValidator('json', ConvertLeadInput),
    async (c) => {
      const actor = c.get('actor');
      const body = c.req.valid('json');
      const lead = await convertLead(
        service,
        actor,
        toText(c.req.valid('param').leadId),
        body,
      );
      // The deal it opened is followed up by the AI at once, unless the
      // person converting unticked that.
      if (lead.convertedOpportunityId && body.followUp !== false)
        service.opportunityOpened?.(actor, toText(lead.convertedOpportunityId));
      return c.json({ data: lead });
    },
  );

  // The AI's follow-up of a lead (lead-evaluation.ts): the newest, asking
  // for another (as someone who may edit the lead), the owner's decision on
  // a waiting one, and writing its findings into the lead.
  router.get(
    '/leads/:leadId/evaluations/latest',
    describeRoute({
      tags: leadTags,
      summary: "Get a lead's latest AI follow-up",
      operationId: 'getLatestLeadEvaluation',
      ...runCommand(recordAction('leads', 'view'), {
        command: 'leads follow-up',
      }),
      responses: {
        '200': dataResponse(AiEntry.nullable(), 'Null when there is none.'),
        ...apiErrorResponses,
        '404': notFound('lead'),
      },
    }),
    apiValidator('param', RecordParams.leads),
    async (c) =>
      c.json({
        data: await latestEvaluation(
          service,
          c.get('actor'),
          toText(c.req.valid('param').leadId),
        ),
      }),
  );
  router.post(
    '/leads/:leadId/evaluate',
    describeRoute({
      tags: leadTags,
      summary: 'Have the AI follow a lead up',
      operationId: 'evaluateLead',
      description:
        'Starts a follow-up by the Lead follow-up agent, which runs in the background; or, with `revise`, redoes a waiting one as asked. Requires edit access to the lead. Asked from a conversation, what it suggests is told back to that conversation once it is ready.',
      ...runCommand(AI_WORK_ACTION, { command: 'leads request-follow-up' }),
      responses: {
        '201': dataResponse(AiEntry, 'The follow-up, running.'),
        ...apiErrorResponses,
        '400': decided,
        '404': notFound('lead'),
        '503': unavailable,
      },
    }),
    apiValidator('param', RecordParams.leads),
    apiValidator('json', EvaluateInput),
    async (c) => {
      const actor = c.get('actor');
      const leadId = toText(c.req.valid('param').leadId);
      const body = c.req.valid('json');
      await service.get(actor, 'leads', leadId, undefined, 'update');
      const entry = await ai
        .leads()
        ?.request(
          actor,
          leadId,
          body.revise
            ? { entryId: body.revise, instruction: body.instruction }
            : undefined,
        );
      if (!entry) throw new CrmError('assistantUnavailable', 409);
      await watchRunWork(app, c, 'leads', leadId, entry.id);
      return c.json({ data: entry }, 201);
    },
  );
  router.post(
    '/leads/:leadId/evaluations/:entryId/decide',
    describeRoute({
      tags: leadTags,
      summary: "Decide on a lead's AI follow-up",
      operationId: 'decideLeadEvaluation',
      description:
        'Accepting carries the suggestion out (plans the task, nurtures or invalidates the lead, writes the findings picked); a conversion is accepted once the lead is converted.',
      responses: {
        '200': dataResponse(AiEntry),
        ...apiErrorResponses,
        '400': apiErrorResponse(
          400,
          'The suggestion was already decided (`EVALUATION_DECIDED`), or the lead must be converted first (`CONVERT_FIRST`).',
        ),
        '404': notFound('follow-up'),
        '503': unavailable,
      },
    }),
    apiValidator('param', EntryParams.leads),
    apiValidator('json', DecideLeadEvaluationInput),
    async (c) => {
      const run = ai.leads();
      if (!run) throw new CrmError('assistantUnavailable', 409);
      const { leadId, entryId } = c.req.valid('param');
      const body = c.req.valid('json');
      return c.json({
        data: await run.decide(
          c.get('actor'),
          leadId,
          entryId,
          body.decision,
          body.fields,
          body.task,
        ),
      });
    },
  );
  router.post(
    '/leads/:leadId/evaluations/:entryId/enrich',
    describeRoute({
      tags: leadTags,
      summary: "Write a follow-up's findings into a lead",
      operationId: 'enrichLeadFromEvaluation',
      description:
        'Once per follow-up, as an AI proposal the person confirmed.',
      responses: {
        '200': dataResponse(AiEntry),
        ...apiErrorResponses,
        '400': decided,
        '404': notFound('follow-up'),
        '503': unavailable,
      },
    }),
    apiValidator('param', EntryParams.leads),
    apiValidator('json', EnrichInput),
    async (c) => {
      const run = ai.leads();
      if (!run) throw new CrmError('assistantUnavailable', 409);
      const { leadId, entryId } = c.req.valid('param');
      return c.json({
        data: await run.enrich(
          c.get('actor'),
          leadId,
          entryId,
          c.req.valid('json').fields,
        ),
      });
    },
  );

  // Opportunities -------------------------------------------------------
  const dealTags = ['Opportunities'];

  // New opportunity with the AI (opportunity-capture.ts): pasted text in,
  // a prefilled opportunity out, matched to a company and its contacts;
  // and the matching again when the person picks another company.
  router.post(
    '/opportunities/capture',
    describeRoute({
      tags: dealTags,
      summary: 'Organise an opportunity from pasted text',
      operationId: 'captureOpportunity',
      description:
        'The AI reads the text and returns a prefilled opportunity, its company and people matched to the CRM; nothing is saved. With `instruction` and `deal`, it revises the opportunity as asked.',
      responses: {
        '200': dataResponse(CapturedOpportunity),
        ...apiErrorResponses,
        '503': unavailable,
      },
    }),
    apiValidator('json', CaptureOpportunityInput),
    async (c) =>
      c.json({
        data: await captureOpportunity(
          service,
          app.container,
          c.get('actor'),
          c.req.valid('json'),
          await timeZone(),
        ),
      }),
  );
  router.post(
    '/opportunities/matchCompany',
    describeRoute({
      tags: dealTags,
      summary: "Match an opportunity's people to a company",
      operationId: 'matchOpportunityCompany',
      description:
        "The people matched to the company's contacts, and its open opportunities.",
      responses: {
        '200': dataResponse(CompanyMatch),
        ...apiErrorResponses,
        '404': notFound('company'),
      },
    }),
    apiValidator('json', MatchCompanyInput),
    async (c) => {
      const body = c.req.valid('json');
      return c.json({
        data: await matchCompany(
          service,
          c.get('actor'),
          body.companyId,
          peopleOf(body.people),
        ),
      });
    },
  );

  // The same follow-up for an opportunity (opportunity-evaluation.ts).
  router.get(
    '/opportunities/:opportunityId/evaluations/latest',
    describeRoute({
      tags: dealTags,
      summary: "Get an opportunity's latest AI follow-up",
      operationId: 'getLatestOpportunityEvaluation',
      ...runCommand(recordAction('opportunities', 'view'), {
        command: 'opportunities follow-up',
      }),
      responses: {
        '200': dataResponse(AiEntry.nullable(), 'Null when there is none.'),
        ...apiErrorResponses,
        '404': notFound('opportunity'),
      },
    }),
    apiValidator('param', RecordParams.opportunities),
    async (c) =>
      c.json({
        data: await latestOpportunityEvaluation(
          service,
          c.get('actor'),
          toText(c.req.valid('param').opportunityId),
        ),
      }),
  );
  router.post(
    '/opportunities/:opportunityId/evaluate',
    describeRoute({
      tags: dealTags,
      summary: 'Have the AI follow an opportunity up',
      operationId: 'evaluateOpportunity',
      description:
        'Starts a follow-up by the Opportunity follow-up agent, which runs in the background; or, with `revise`, redoes a waiting one as asked. Requires edit access to the opportunity. Asked from a conversation, what it suggests is told back to that conversation once it is ready.',
      ...runCommand(AI_WORK_ACTION, {
        command: 'opportunities request-follow-up',
      }),
      responses: {
        '201': dataResponse(AiEntry, 'The follow-up, running.'),
        ...apiErrorResponses,
        '400': decided,
        '404': notFound('opportunity'),
        '503': unavailable,
      },
    }),
    apiValidator('param', RecordParams.opportunities),
    apiValidator('json', EvaluateInput),
    async (c) => {
      const actor = c.get('actor');
      const opportunityId = toText(c.req.valid('param').opportunityId);
      const body = c.req.valid('json');
      await service.get(
        actor,
        'opportunities',
        opportunityId,
        undefined,
        'update',
      );
      const entry = await ai
        .opportunities()
        ?.request(
          actor,
          opportunityId,
          body.revise
            ? { entryId: body.revise, instruction: body.instruction }
            : undefined,
        );
      if (!entry) throw new CrmError('assistantUnavailable', 409);
      await watchRunWork(app, c, 'opportunities', opportunityId, entry.id);
      return c.json({ data: entry }, 201);
    },
  );
  router.post(
    '/opportunities/:opportunityId/evaluations/:entryId/decide',
    describeRoute({
      tags: dealTags,
      summary: "Decide on an opportunity's AI follow-up",
      operationId: 'decideOpportunityEvaluation',
      description:
        'Accepting carries the suggestion out: the stage, the fields and people kept, the task, and the approvals picked, submitted to their approvers.',
      responses: {
        '200': dataResponse(AiEntry),
        ...apiErrorResponses,
        '400': decided,
        '404': notFound('follow-up'),
        '503': unavailable,
      },
    }),
    apiValidator('param', EntryParams.opportunities),
    apiValidator('json', DecideOpportunityEvaluationInput),
    async (c) => {
      const run = ai.opportunities();
      if (!run) throw new CrmError('assistantUnavailable', 409);
      const { opportunityId, entryId } = c.req.valid('param');
      const body = c.req.valid('json');
      return c.json({
        data: await run.decide(
          c.get('actor'),
          opportunityId,
          entryId,
          body.decision,
          body.fields,
          body.task,
          body.approvals,
          body.contacts,
        ),
      });
    },
  );
  router.post(
    '/opportunities/:opportunityId/evaluations/:entryId/enrich',
    describeRoute({
      tags: dealTags,
      summary: "Write a follow-up's findings into the opportunity's company",
      operationId: 'enrichCompanyFromEvaluation',
      description:
        'Once per follow-up, as an AI proposal the person confirmed; requires edit access to the company.',
      responses: {
        '200': dataResponse(AiEntry),
        ...apiErrorResponses,
        '400': decided,
        '404': notFound('follow-up'),
        '503': unavailable,
      },
    }),
    apiValidator('param', EntryParams.opportunities),
    apiValidator('json', EnrichInput),
    async (c) => {
      const run = ai.opportunities();
      if (!run) throw new CrmError('assistantUnavailable', 409);
      const { opportunityId, entryId } = c.req.valid('param');
      return c.json({
        data: await run.enrich(
          c.get('actor'),
          opportunityId,
          entryId,
          c.req.valid('json').fields,
        ),
      });
    },
  );

  // Tasks ---------------------------------------------------------------
  const taskTags = ['Tasks'];

  // A task's AI preparation for its owner (task-preparation.ts): the
  // newest, asking for one (or another, or a waiting one redone), and
  // deciding on it.
  router.get(
    '/tasks/:taskId/preparations/latest',
    describeRoute({
      tags: taskTags,
      summary: "Get a task's latest AI preparation",
      operationId: 'getLatestTaskPreparation',
      description: 'For its owner only; null for anyone else.',
      ...runCommand(recordAction('tasks', 'view'), {
        command: 'tasks preparation',
      }),
      responses: {
        '200': dataResponse(AiEntry.nullable(), 'Null when there is none.'),
        ...apiErrorResponses,
        '404': notFound('task'),
      },
    }),
    apiValidator('param', RecordParams.tasks),
    async (c) =>
      c.json({
        data: await latestPreparation(
          service,
          c.get('actor'),
          toText(c.req.valid('param').taskId),
        ),
      }),
  );
  router.post(
    '/tasks/:taskId/prepare',
    describeRoute({
      tags: taskTags,
      summary: 'Have the AI prepare a task',
      operationId: 'prepareTask',
      description:
        'The Task assistant agent prepares it in the background, for its owner only, while it is open; with `revise`, redoes a waiting preparation as asked. Asked from a conversation, what it prepares is told back to that conversation once it is ready.',
      ...runCommand(AI_WORK_ACTION, {
        command: 'tasks request-preparation',
      }),
      responses: {
        '201': dataResponse(AiEntry, 'The preparation, running.'),
        ...apiErrorResponses,
        '400': apiErrorResponse(
          400,
          'The task is no longer open (`TASK_NOT_OPEN`), or the preparation was already decided.',
        ),
        '404': notFound('task'),
        '503': unavailable,
      },
    }),
    apiValidator('param', RecordParams.tasks),
    apiValidator('json', EvaluateInput),
    async (c) => {
      const body = c.req.valid('json');
      const taskId = toText(c.req.valid('param').taskId);
      const entry = await ai
        .tasks()
        ?.request(
          c.get('actor'),
          taskId,
          undefined,
          body.revise
            ? { entryId: body.revise, instruction: body.instruction }
            : undefined,
        );
      if (!entry) throw new CrmError('assistantUnavailable', 409);
      await watchRunWork(app, c, 'tasks', taskId, entry.id);
      return c.json({ data: entry }, 201);
    },
  );
  router.post(
    '/tasks/:taskId/preparations/:entryId/decide',
    describeRoute({
      tags: taskTags,
      summary: "Decide on a task's AI preparation",
      operationId: 'decideTaskPreparation',
      description:
        "Accepting writes its points into the task's description; dismissing sets it aside.",
      responses: {
        '200': dataResponse(AiEntry),
        ...apiErrorResponses,
        '400': decided,
        '404': notFound('preparation'),
        '503': unavailable,
      },
    }),
    apiValidator('param', EntryParams.tasks),
    apiValidator('json', DecidePreparationInput),
    async (c) => {
      const run = ai.tasks();
      if (!run) throw new CrmError('assistantUnavailable', 409);
      const { taskId, entryId } = c.req.valid('param');
      return c.json({
        data: await run.decide(
          c.get('actor'),
          taskId,
          entryId,
          c.req.valid('json').decision,
        ),
      });
    },
  );

  // What came of a task, jotted down, written up by the AI as its feedback
  // for the person to read and record (feedback.ts).
  router.post(
    '/tasks/:taskId/organiseFeedback',
    describeRoute({
      tags: taskTags,
      summary: "Organise a task's feedback",
      operationId: 'organiseTaskFeedback',
      description:
        'The AI writes the notes up as headed feedback; nothing is saved. Requires edit access to the task.',
      responses: {
        '200': dataResponse(z.object({ text: z.string() })),
        ...apiErrorResponses,
        '404': notFound('task'),
        '503': unavailable,
      },
    }),
    apiValidator('param', RecordParams.tasks),
    apiValidator('json', OrganiseFeedbackInput),
    async (c) =>
      c.json({
        data: await organiseFeedback(
          service,
          app.container,
          c.get('actor'),
          toText(c.req.valid('param').taskId),
          c.req.valid('json'),
        ),
      }),
  );
  // A planned task's outcome, recorded, and, as asked, its opportunity or
  // lead followed up anew (feedback.ts).
  router.post(
    '/tasks/:taskId/recordOutcome',
    describeRoute({
      tags: taskTags,
      summary: "Record a task's outcome",
      operationId: 'recordTaskOutcome',
      ...runCommand(recordAction('tasks', 'edit'), {
        command: 'tasks record-outcome',
      }),
      description:
        'Completes the task with what came of it, and has the AI follow its opportunity or lead up anew unless `followUp` is false.',
      responses: {
        '200': dataResponse(
          z.object({
            followUp: z
              .boolean()
              .meta({ description: 'Whether a follow-up started.' }),
          }),
        ),
        ...apiErrorResponses,
        '400': apiErrorResponse(
          400,
          'The task is no longer open (`TASK_CHANGED`).',
        ),
        '404': notFound('task'),
      },
    }),
    apiValidator('param', RecordParams.tasks),
    apiValidator('json', RecordOutcomeInput),
    async (c) => {
      const run = { leads: ai.leads(), opportunities: ai.opportunities() };
      return c.json({
        data: await recordOutcome(
          service,
          run,
          c.get('actor'),
          toText(c.req.valid('param').taskId),
          c.req.valid('json'),
        ),
      });
    },
  );

  // Approvals -----------------------------------------------------------
  const approvalTags = ['Approvals'];
  const actions = [
    {
      action: 'submit',
      summary: 'Submit an approval',
      operationId: 'submitApproval',
      description: 'Sends a draft or withdrawn approval to its approver.',
    },
    {
      action: 'withdraw',
      summary: 'Withdraw an approval',
      operationId: 'withdrawApproval',
      description: 'Takes a pending approval back; its applicant only.',
    },
    {
      action: 'approve',
      summary: 'Approve an approval',
      operationId: 'approveApproval',
      description:
        "Its approver only, with the approve capability; not one's own.",
    },
    {
      action: 'reject',
      summary: 'Reject an approval',
      operationId: 'rejectApproval',
      description:
        "Its approver only, with the approve capability; not one's own.",
    },
  ] as const;
  for (const { action, ...route } of actions)
    router.post(
      `/approvals/:approvalId/${action}`,
      describeRoute({
        tags: approvalTags,
        ...route,
        // Submitting and withdrawing are the applicant's; deciding is the
        // approver's alone and never an agent's.
        ...(action === 'submit' || action === 'withdraw'
          ? runCommand(recordAction('approvals', 'edit'), {
              command: `approvals ${action}`,
            })
          : {}),
        responses: {
          '200': dataResponse(RecordSchemas.approvals),
          ...apiErrorResponses,
          '400': apiErrorResponse(
            400,
            'The approval is not in a state that allows it (`APPROVAL_LOCKED`), or it has no approver.',
          ),
          '404': notFound('approval'),
        },
      }),
      apiValidator('param', RecordParams.approvals),
      apiValidator('json', ApprovalActionInput),
      async (c) =>
        c.json({
          data: await service.approvalAction(
            c.get('actor'),
            toText(c.req.valid('param').approvalId),
            action,
            c.req.valid('json').comment ?? '',
          ),
        }),
    );

  // An approval's AI review for its approver (approval-review.ts): the
  // newest, asking for another while it is pending, and deciding on it.
  router.get(
    '/approvals/:approvalId/reviews/latest',
    describeRoute({
      tags: approvalTags,
      summary: "Get an approval's latest AI review",
      operationId: 'getLatestApprovalReview',
      description: 'For its approver only; null for anyone else.',
      ...runCommand(recordAction('approvals', 'view'), {
        command: 'approvals review',
      }),
      responses: {
        '200': dataResponse(AiEntry.nullable(), 'Null when there is none.'),
        ...apiErrorResponses,
        '404': notFound('approval'),
      },
    }),
    apiValidator('param', RecordParams.approvals),
    async (c) =>
      c.json({
        data: await latestReview(
          service,
          c.get('actor'),
          toText(c.req.valid('param').approvalId),
        ),
      }),
  );
  router.post(
    '/approvals/:approvalId/review',
    describeRoute({
      tags: approvalTags,
      summary: 'Have the AI review an approval',
      operationId: 'reviewApproval',
      description:
        'The Approval review agent reviews it in the background, for its approver only, while it is pending; with `revise`, redoes a waiting review as asked. Asked from a conversation, what it concludes is told back to that conversation once it is ready.',
      ...runCommand(AI_WORK_ACTION, {
        command: 'approvals request-review',
      }),
      responses: {
        '201': dataResponse(AiEntry, 'The review, running.'),
        ...apiErrorResponses,
        '400': apiErrorResponse(
          400,
          'The approval is no longer pending (`APPROVAL_LOCKED`), or the review was already decided.',
        ),
        '404': notFound('approval'),
        '503': unavailable,
      },
    }),
    apiValidator('param', RecordParams.approvals),
    apiValidator('json', EvaluateInput),
    async (c) => {
      const actor = c.get('actor');
      const approvalId = toText(c.req.valid('param').approvalId);
      const body = c.req.valid('json');
      const approval = await service.get(actor, 'approvals', approvalId);
      // The approver's alone, like the review itself (the one submission
      // starts is requested by the service, not through this route).
      if (approval.approverId !== actor.id)
        throw new CrmError('forbidden', 403);
      const entry = await ai
        .approvals()
        ?.request(
          actor,
          approvalId,
          body.revise
            ? { entryId: body.revise, instruction: body.instruction }
            : undefined,
        );
      if (!entry) throw new CrmError('assistantUnavailable', 409);
      await watchRunWork(app, c, 'approvals', approvalId, entry.id);
      return c.json({ data: entry }, 201);
    },
  );
  router.post(
    '/approvals/:approvalId/reviews/:entryId/decide',
    describeRoute({
      tags: approvalTags,
      summary: "Decide on an approval's AI review",
      operationId: 'decideApprovalReview',
      description:
        'Approving or rejecting decides the approval with the comment; dismissing sets the review aside.',
      responses: {
        '200': dataResponse(AiEntry),
        ...apiErrorResponses,
        '400': decided,
        '404': notFound('review'),
        '503': unavailable,
      },
    }),
    apiValidator('param', EntryParams.approvals),
    apiValidator('json', DecideReviewInput),
    async (c) => {
      const run = ai.approvals();
      if (!run) throw new CrmError('assistantUnavailable', 409);
      const { approvalId, entryId } = c.req.valid('param');
      const body = c.req.valid('json');
      return c.json({
        data: await run.decide(
          c.get('actor'),
          approvalId,
          entryId,
          body.decision,
          body.comment,
        ),
      });
    },
  );
}
