import type { AgentActionOption } from '@nocobase/app-plugin-agents/shared/agents';
import { entities, type Entity } from '../crm/schema.js';

// The CRM's business actions as the Agents plugin knows them: what an agent
// may be configured with, what a person or a run holds (gate.ts), and what
// each command a run may call needs (`cliRoute({ action })` on the routes).
// They are named after the CRM's composite resources (resources.ts) and
// titled with the Permission Sets page's own words, so the agent editor and
// that page read alike.

type Verb = 'view' | 'create' | 'edit' | 'delete';

// The collection action each verb is decided by (conditions() in
// authorization.ts).
export const COLLECTION_ACTION: Record<Verb, string> = {
  view: 'read',
  create: 'create',
  edit: 'update',
  delete: 'delete',
};
export const VERBS = Object.keys(COLLECTION_ACTION) as Verb[];

export const recordAction = (entity: Entity, verb: Verb): string =>
  `crm.${entity}/${verb}`;

// Proposing a plan, which a person confirms (plans).
export const PLAN_ACTION = 'crm.plans/create';
// Commenting on a record one may read: a write, so a run proposes it.
export const COMMENT_ACTION = 'crm.comments/create';
// Setting the CRM's own AI agents to work on a record (a follow-up, a
// review, a preparation, a company's signals): it changes no record, its
// result being a suggestion the person still decides, so a run calls it
// directly rather than in a plan.
export const AI_WORK_ACTION = 'crm.aiWork/request';
// Searching every kind of record one may read at once.
export const SEARCH_ACTION = 'crm.search/view';
// The colleagues a record may be given to or an approval sent to.
export const COLLEAGUES_ACTION = 'crm.colleagues/view';
// The sales capabilities, by the CRM's own resource type.
export const SALES_ACTIONS = {
  assign: 'crm.sales/assign',
  approve: 'crm.sales/approve',
  export: 'crm.sales/export',
} as const;

const text = (key: string) => ({ key: `crm.${key}`, ns: 'crm' });

// What the agent editor offers. Deleting a record and deciding an approval
// are never an agent's: a person does them (guideline 3.1, terminal states
// and decisions are a person's), so they are listed only to show the
// boundary.
export function agentActionOptions(): AgentActionOption[] {
  const options: AgentActionOption[] = [];
  for (const entity of entities)
    for (const verb of VERBS)
      options.push({
        key: recordAction(entity, verb),
        group: `crm.${entity}`,
        groupTitle: text(`entities.${entity}`),
        title: text(`authz.actions.${verb}`),
        ...(verb === 'delete'
          ? { grantable: false, reason: text('agentActions.deleteReason') }
          : {
              defaultOn: true,
              ...(verb === 'view'
                ? {}
                : {
                    description: text('agentActions.throughPlan'),
                  }),
            }),
      });
  options.push(
    {
      key: SEARCH_ACTION,
      group: 'crm.workspace',
      groupTitle: text('agentActions.workspace'),
      title: text('agentActions.search'),
      defaultOn: true,
    },
    {
      key: COLLEAGUES_ACTION,
      group: 'crm.workspace',
      groupTitle: text('agentActions.workspace'),
      title: text('agentActions.colleagues'),
      defaultOn: true,
    },
    {
      key: COMMENT_ACTION,
      group: 'crm.workspace',
      groupTitle: text('agentActions.workspace'),
      title: text('agentActions.comment'),
      description: text('agentActions.throughPlan'),
      defaultOn: true,
    },
    {
      key: AI_WORK_ACTION,
      group: 'crm.workspace',
      groupTitle: text('agentActions.workspace'),
      title: text('agentActions.aiWork'),
      description: text('agentActions.aiWorkDescription'),
      defaultOn: true,
    },
    {
      key: PLAN_ACTION,
      group: 'crm.plans',
      groupTitle: text('agentActions.plans'),
      title: text('agentActions.planCreate'),
      description: text('agentActions.planCreateDescription'),
      defaultOn: true,
    },
    {
      key: SALES_ACTIONS.assign,
      group: 'crm.sales',
      groupTitle: text('authz.sales'),
      title: text('authz.actions.assign'),
      description: text('agentActions.throughPlan'),
    },
    {
      key: SALES_ACTIONS.approve,
      group: 'crm.sales',
      groupTitle: text('authz.sales'),
      title: text('authz.actions.approve'),
      grantable: false,
      reason: text('agentActions.approveReason'),
    },
    {
      key: SALES_ACTIONS.export,
      group: 'crm.sales',
      groupTitle: text('authz.sales'),
      title: text('authz.actions.export'),
      grantable: false,
      reason: text('agentActions.exportReason'),
    },
  );
  return options;
}

// The actions an agent may be given at all.
export const GRANTABLE = new Set(
  agentActionOptions()
    .filter((option) => option.grantable !== false)
    .map((option) => option.key),
);

// The actions the CRM's agents start from, the assistant people talk to
// (assistant.ts) and every agent discovered from runners (index.ts): view,
// create and edit on each object, search, colleagues, comments, plans and
// setting the AI agents to work on a record (deleting and deciding
// approvals are never granted). What a call may do is these within what the
// person who asked holds (gate.ts).
export const AGENT_ACTIONS: readonly string[] = [
  ...entities.flatMap((entity) => [
    recordAction(entity, 'view'),
    recordAction(entity, 'create'),
    recordAction(entity, 'edit'),
  ]),
  SEARCH_ACTION,
  COLLEAGUES_ACTION,
  COMMENT_ACTION,
  PLAN_ACTION,
  AI_WORK_ACTION,
];
