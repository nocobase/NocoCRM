import { Readable } from 'node:stream';
import { whatsappToken } from '../providers/crm/whatsapp/service.js';
import { serverFileRepositoryManagerToken } from '@nocobase/app-plugin-file/server';
import type { Application } from '@nocobase/app-server/application';
import { driveManagerToken } from '@nocobase/app-server/drive';
import {
  ApiError,
  apiErrorHandler,
  apiErrorResponse,
  apiErrorResponses,
  apiValidator,
  dataResponse,
  describeRoute,
  emptyResponse,
  listResponse,
} from '@nocobase/app-server/router';
import type { Row } from '@nocobase/db';
import type { Hono } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import { z } from 'zod';
import {
  agentOverview,
  agentSwitches,
  runningAgents,
  saveAgentSwitch,
} from '../providers/crm/agents.js';
import {
  capability,
  conditions,
  outputFields,
  requireCapability,
} from '../providers/crm/authorization.js';
import { agenda, dashboard } from '../providers/crm/dashboard.js';
import {
  demoPresent,
  demoStatus,
  populateDemo,
  resetDemo,
} from '../providers/crm/demo.js';
import { searchPlaces, subdivisions } from '../providers/crm/geography.js';
import { companySignalsToken } from '../providers/crm/company-signals.js';
import { crmToken } from '../providers/crm/index.js';
import { jsonValue } from '../providers/crm/values.js';
import {
  chatModels,
  saveWorkAgent,
  workAgentNames,
  workAgentRun,
  workAgentSettings,
  workInstructions,
  type Work,
} from '../providers/crm-agents/work-agents.js';
import { SKILLS_MARKER } from '../providers/crm-agents/library.js';
import { pendingDecisions } from '../providers/crm/lead-evaluation.js';
import { mailTimelineToken } from '../providers/crm/mail-timeline.js';
import { isDemoMode } from '../providers/crm/demo-mode.js';
import { noticesOf } from '../providers/crm/notices.js';
import {
  CrmError,
  definitions,
  entities,
  object,
  probabilities,
  toText,
  type Entity,
} from '../providers/crm/schema.js';
import { searchAll } from '../providers/crm/search.js';
import {
  discardSearchAnswer,
  keepSearchAnswer,
} from '../providers/crm-agents/search-answers.js';
import { array } from '../providers/crm/service.js';
import { resolveTitles } from '../providers/crm/titles.js';
import { runCommand, runConversationOf, type CrmEnv } from './context.js';
import {
  AI_WORK_ACTION,
  COLLEAGUES_ACTION,
  SEARCH_ACTION,
} from '../providers/crm-agents/actions.js';
import { agentsToken } from '@nocobase/app-plugin-agents/server/tokens';
import { showSuggestion } from '../providers/crm-agents/ai-work-news.js';
import { checkDuplicates } from '../providers/crm/duplicate-check.js';
import { demoServices } from './demo-services.js';
import { CRM_ERROR_DOMAIN } from './errors.js';
import { JsonObject, ListMeta } from './schemas/common.js';
import {
  AgendaParams,
  AgendaQuery,
  AgentOverview,
  AgentParams,
  AgentQuery,
  AgentSwitchesSchema,
  AgentSwitchInput,
  WorkAgentSetup,
  WorkAgentSetupInput,
  Attachment,
  AttachmentParams,
  AttachmentsQuery,
  Colleague,
  ColleaguesQuery,
  ContentQuery,
  Dashboard,
  Decision,
  DecisionsMeta,
  DecisionsQuery,
  Notice,
  NoticesQuery,
  DemoDataStatus,
  ImportDemoDataInput,
  Place,
  PlaceQuery,
  ScopeQuery,
  SearchGroup,
  SearchQuery,
  Subdivision,
  SubdivisionQuery,
  SystemSettings,
  ApprovalLifecycleView,
  ApproverRuleView,
  UpdateApproverRuleInput,
  UpdateSystemSettingsInput,
  UploadedAttachment,
  UploadQuery,
  Workspace,
} from './schemas/workspace.js';
import type { DatabaseAuthorizationConditions } from '@nocobase/app-plugin-authorization/server';
import { APPROVAL_LIFECYCLE } from '../lifecycles/approvals.js';

// The paths these routes own, which the guard (context.ts) is installed on.
export const WORKSPACE_PATHS = [
  'workspace',
  'systemSettings',
  'demoData',
  'approvalLifecycle',
  'approverRule',
  'geography',
  'search',
  'dashboard',
  'decisions',
  'notices',
  'aiAgents',
  'attachments',
  'mailTimeline',
  'colleagues',
  'searchAnswers',
  'duplicateCheck',
];

const MAX_FILE = 20 * 1024 * 1024;
const total = z.object({ total: z.number().int() });
const settingsOnly =
  'Requires the CRM settings capability (`settings/crm manage`).';

// The stored type of a file, when it is one the browser may render on its
// own (images, PDF, plain text, Markdown as text). The preview dialog is
// the file plugin's, which decides what it can show from the stored type
// and the extension and fetches the bytes itself for Office documents, so
// the list carries the stored type.
function previewType(file: { mimeType?: unknown }): string | null {
  const type = toText(file.mimeType ?? '').toLowerCase();
  return /^image\/(png|jpeg|gif|webp|svg\+xml|bmp|avif)$/.test(type) ||
    type === 'application/pdf' ||
    type === 'text/plain' ||
    type === 'text/markdown' ||
    type === 'text/x-markdown'
    ? type
    : null;
}

export function registerWorkspaceRoutes(
  app: Application,
  router: Hono<CrmEnv>,
): void {
  const service = app.container.resolve(crmToken);
  const { demoAccounts, demoMailboxes, demoChats, demoInbox } =
    demoServices(app);
  const contentUrl = (id: string) =>
    `${toText(app.publicBasePath)}/api/attachments/${encodeURIComponent(id)}/content`;

  // What every page starts from: the objects' definitions, what the reader
  // may do with each, the settings, the users, and the switches.
  router.get(
    '/workspace',
    describeRoute({
      tags: ['Workspace'],
      summary: 'Get the workspace',
      operationId: 'getWorkspace',
      description:
        "The objects' definitions, what the reader may do with each, the settings, the users they may pick and the AI switches.",
      responses: { '200': dataResponse(Workspace), ...apiErrorResponses },
    }),
    async (c) => {
      const actor = c.get('actor');
      // Reading the workspace must not persist preferences in a read-only demo.
      if (!isDemoMode(app)) await service.rememberLocale(actor);
      const permissions: Record<string, unknown> = {};
      // What the person may read, kept for the page-context resolvers of
      // the Agents plugin (CrmService.rememberReads).
      const reads: Record<string, DatabaseAuthorizationConditions | null> = {};
      for (const entity of entities) {
        const actions: Record<string, unknown> = {};
        for (const action of ['read', 'create', 'update', 'delete']) {
          try {
            const access = await conditions(actor, entity, action);
            if (action === 'read') reads[`${entity}.read`] = access;
            actions[action] = {
              fields:
                action === 'read'
                  ? outputFields(entity, access)
                  : access.fields,
              // Whether the action reaches every record or only a scope
              // (one's own): the pages use it to offer a change on a
              // record the user does not own only to someone who may make
              // it, without a parallel notion of "manager".
              all: access.scope === true,
            };
          } catch {
            actions[action] = false;
            if (action === 'read') reads[`${entity}.read`] = null;
          }
        }
        permissions[entity] = actions;
      }
      service.rememberReads(actor.id, reads);
      await conditions(actor, 'leads', 'read');
      const settingsAccess = await capability(actor, 'manage', 'settings');
      return c.json({
        data: {
          definitions,
          // Stage → win probability, shown beside each stage.
          probabilities,
          permissions,
          settings: await service.settings(),
          userId: actor.id,
          users: await service.users(actor),
          export: await capability(actor, 'export'),
          assign: await capability(actor, 'assign'),
          approve: await capability(actor, 'approve'),
          // Whether the WhatsApp pages offer the reply box.
          sendWhatsApp: await capability(actor, 'sendWhatsApp'),
          settingsAccess,
          // For whoever may import it: whether a demo dataset is imported,
          // so the pages can offer one until it is (DemoBanner).
          ...(settingsAccess
            ? { demoPresent: await demoPresent(service) }
            : {}),
          // Whether the pages offer the assistant at all.
          assistant: await service.assistantEnabled(),
          // A read-only demo site refuses every question before it is sent.
          demoSite: isDemoMode(app),
          // Whether the company's WhatsApp number is connected, or the demo
          // dataset's number holds conversations, so records show their
          // WhatsApp tab (whatsapp/service.ts).
          whatsapp: {
            configured: await app.container.resolve(whatsappToken).available(),
          },
          // Which of the agents' triggers are on, so a form offers "AI
          // follows up at once" only while that would happen (agents.ts).
          agents: await agentSwitches(service),
          // The work agents' names, which the dialogs doing their work
          // show, and the model each asks (work-agents.ts).
          workAgentNames: await workAgentNames(
            app.container.has(agentsToken)
              ? app.container.resolve(agentsToken)
              : null,
            service.database,
          ),
          // The library ids of the CRM's method skills, by name (library.ts),
          // so the agents' pages link to each on the Skills page.
          methodSkills: Object.fromEntries(
            Object.entries(
              (
                jsonValue(
                  (
                    await service.database
                      .query()
                      .selectFrom('crmSettings')
                      .select('value')
                      .where('id', '=', SKILLS_MARKER)
                      .executeTakeFirst()
                  )?.value,
                ) as { skillIds?: Record<string, unknown> } | null
              )?.skillIds ?? {},
            ).filter(
              (entry): entry is [string, string] =>
                typeof entry[1] === 'string' && entry[1] !== '',
            ),
          ),
        },
      });
    },
  );

  // The CRM's settings, for whoever may manage them.
  router.get(
    '/systemSettings',
    describeRoute({
      tags: ['Settings'],
      summary: 'Get the CRM settings',
      operationId: 'getSystemSettings',
      description: settingsOnly,
      responses: { '200': dataResponse(SystemSettings), ...apiErrorResponses },
    }),
    async (c) => {
      if (!(await capability(c.get('actor'), 'manage', 'settings')))
        throw new CrmError('forbidden', 403);
      return c.json({ data: await service.settings() });
    },
  );
  router.put(
    '/systemSettings',
    describeRoute({
      tags: ['Settings'],
      summary: 'Update the CRM settings',
      operationId: 'updateSystemSettings',
      description: `${settingsOnly} A setting left out keeps its value.`,
      responses: {
        '200': dataResponse(SystemSettings, 'The settings as saved.'),
        ...apiErrorResponses,
      },
    }),
    apiValidator('json', UpdateSystemSettingsInput),
    async (c) =>
      c.json({
        data: await service.saveSettings(c.get('actor'), c.req.valid('json')),
      }),
  );

  // The approval process (Settings → Approval process): how an approval
  // moves, and who may approve, for whoever may manage the settings.
  router.get(
    '/approvalLifecycle',
    describeRoute({
      tags: ['Approvals'],
      summary: 'Describe the approval process',
      operationId: 'getApprovalLifecycle',
      description: `The approvals' lifecycle: their states, which of them end a request, and the transitions between them, as the settings' approval process page draws it. ${settingsOnly}`,
      responses: {
        '200': dataResponse(ApprovalLifecycleView),
        ...apiErrorResponses,
      },
    }),
    async (c) => {
      if (!(await capability(c.get('actor'), 'manage', 'settings')))
        throw new CrmError('forbidden', 403);
      return c.json({
        data: service.lifecycles.describe(APPROVAL_LIFECYCLE),
      });
    },
  );
  router.get(
    '/approverRule',
    describeRoute({
      tags: ['Approvals'],
      summary: 'Get who may approve',
      operationId: 'getApproverRule',
      description: `The approver rule: the roles and the people an applicant may choose as approver, any one of them enough, and the users it names now. ${settingsOnly}`,
      responses: {
        '200': dataResponse(ApproverRuleView),
        ...apiErrorResponses,
      },
    }),
    async (c) =>
      c.json({ data: await service.approverRuleView(c.get('actor')) }),
  );
  router.put(
    '/approverRule',
    describeRoute({
      tags: ['Approvals'],
      summary: 'Set who may approve',
      operationId: 'updateApproverRule',
      description: `Saves a new version of the approver rule. Requests already submitted keep their approver. A rule naming nobody active who holds the approve capability is refused (400 noApprovers); a version saved since \`revision\` is a conflict (409). ${settingsOnly}`,
      responses: {
        '200': dataResponse(ApproverRuleView, 'The rule as saved.'),
        ...apiErrorResponses,
      },
    }),
    apiValidator('json', UpdateApproverRuleInput),
    async (c) =>
      c.json({
        data: await service.saveApproverRule(
          c.get('actor'),
          c.req.valid('json'),
        ),
      }),
  );
  // The demo dataset (demo.ts): whether one is imported, importing it and
  // removing it, for whoever may manage the settings.
  const demoResponses = {
    '200': dataResponse(DemoDataStatus),
    ...apiErrorResponses,
  };
  router.get(
    '/demoData',
    describeRoute({
      tags: ['DemoData'],
      summary: 'Get the demo data',
      operationId: 'getDemoData',
      description: `Whether a demo dataset is imported, and the accounts an import makes. ${settingsOnly}`,
      responses: demoResponses,
    }),
    async (c) => {
      if (!(await capability(c.get('actor'), 'manage', 'settings')))
        throw new CrmError('forbidden', 403);
      return c.json({ data: await demoStatus(service, c.get('actor')) });
    },
  );
  router.post(
    '/demoData/import',
    describeRoute({
      tags: ['DemoData'],
      summary: 'Import the demo data',
      operationId: 'importDemoData',
      description: `Creates the demo accounts, records and mailboxes. ${settingsOnly}`,
      responses: {
        ...demoResponses,
        '400': apiErrorResponse(
          400,
          'A demo dataset is imported already (`DEMO_EXISTS`), or the users plugin refused an account (`DEMO_ACCOUNTS`, its explanation in `metadata.detail`).',
        ),
      },
    }),
    apiValidator('json', ImportDemoDataInput),
    async (c) =>
      c.json({
        data: await populateDemo(
          service,
          service.authz,
          c.get('actor'),
          demoAccounts,
          // The language the dataset is written in, Chinese unless asked.
          c.req.valid('json').language ?? 'zh-CN',
          demoMailboxes,
          demoChats,
          app.container.resolve(whatsappToken),
        ),
      }),
  );
  router.post(
    '/demoData/remove',
    describeRoute({
      tags: ['DemoData'],
      summary: 'Remove the demo data',
      operationId: 'removeDemoData',
      description: `Deletes what the import created and disables its accounts. ${settingsOnly}`,
      responses: demoResponses,
    }),
    async (c) =>
      c.json({
        data: await resetDemo(
          service,
          c.get('actor'),
          demoAccounts,
          demoMailboxes,
          demoChats,
          demoInbox,
        ),
      }),
  );

  // A record's region, searched by a province's or a country's name, and
  // a country's provinces.
  router.get(
    '/geography/places',
    describeRoute({
      tags: ['Workspace'],
      summary: 'Search places',
      operationId: 'searchPlaces',
      description:
        'Countries and provinces whose English or Chinese name matches, at most ten.',
      responses: { '200': listResponse(Place, total), ...apiErrorResponses },
    }),
    apiValidator('query', PlaceQuery),
    (c) => {
      const data = searchPlaces(
        c.req.valid('query').q,
        c.get('actor').locale.startsWith('zh'),
      );
      return c.json({ data, meta: { total: data.length } });
    },
  );
  router.get(
    '/geography/subdivisions',
    describeRoute({
      tags: ['Workspace'],
      summary: "List a country's subdivisions",
      operationId: 'listSubdivisions',
      description: "Named in the reader's language.",
      responses: {
        '200': listResponse(Subdivision, total),
        ...apiErrorResponses,
      },
    }),
    apiValidator('query', SubdivisionQuery),
    (c) => {
      const chinese = c.get('actor').locale.startsWith('zh');
      const data = subdivisions(c.req.valid('query').country).map((s) => ({
        value: s.code,
        label: chinese ? (s.chineseName ?? s.name) : s.name,
      }));
      return c.json({ data, meta: { total: data.length } });
    },
  );

  // The global search: the typed text in every kind of record the reader
  // may read, grouped by kind (server/providers/crm/search.ts).
  router.get(
    '/search',
    describeRoute({
      tags: ['Workspace'],
      summary: 'Search the records',
      operationId: 'searchRecords',
      ...runCommand(SEARCH_ACTION, { command: 'search' }),
      description:
        'The first five matches of each kind the reader may read, with the total of each.',
      responses: {
        '200': listResponse(SearchGroup, total),
        ...apiErrorResponses,
      },
    }),
    apiValidator('query', SearchQuery),
    async (c) => {
      const data = await searchAll(
        service,
        c.get('actor'),
        c.req.valid('query').q,
      );
      return c.json({ data, meta: { total: data.length } });
    },
  );

  // The colleagues a record may be given to or an approval sent to: the
  // active users with their CRM roles, for an agent to turn a name into the
  // id ownerId, approverId and internalParticipants take.
  router.get(
    '/colleagues',
    describeRoute({
      tags: ['Workspace'],
      summary: 'List colleagues',
      operationId: 'listColleagues',
      description:
        'The active users, their CRM roles and whether each may decide approvals; `current` marks the caller.',
      ...runCommand(COLLEAGUES_ACTION, {
        command: 'colleagues list',
        columns: ['id', 'name', 'roles', 'canApprove'],
      }),
      responses: {
        '200': listResponse(Colleague, total),
        ...apiErrorResponses,
      },
    }),
    apiValidator('query', ColleaguesQuery),
    async (c) => {
      const actor = c.get('actor');
      const q = (c.req.valid('query').q ?? '').trim().toLowerCase();
      const data = (await service.users(actor))
        .filter((user) => !user.disabled)
        .filter(
          (user) =>
            !q ||
            toText(user.name).toLowerCase().includes(q) ||
            toText(user.username ?? '')
              .toLowerCase()
              .includes(q),
        )
        .map((user) => ({
          id: toText(user.id),
          name: toText(user.name),
          roles: array(user.roles).map(toText),
          canApprove: user.canApprove === true,
          ...(toText(user.id) === actor.id ? { current: true } : {}),
        }));
      return c.json({ data, meta: { total: data.length } });
    },
  );

  // The overview and the reports, and the next page of one of the
  // overview's lists.
  router.get(
    '/dashboard',
    describeRoute({
      tags: ['Dashboard'],
      summary: 'Get the dashboard',
      operationId: 'getDashboard',
      // An agent's one call for what to do today and how the business goes,
      // instead of a dozen lists: it reads only what the reader may read,
      // as the search does, so it asks what the search asks.
      ...runCommand(SEARCH_ACTION, { command: 'dashboard' }),
      description:
        "Today's work, what needs attention, this month's business and the reports, of the reader's own records or the team's.",
      responses: { '200': dataResponse(Dashboard), ...apiErrorResponses },
    }),
    apiValidator('query', ScopeQuery),
    async (c) => {
      const data = await dashboard(
        service,
        c.get('actor'),
        c.req.valid('query'),
      );
      const rows = (list: unknown): Row[] =>
        array(object(list).data).map(object);
      return c.json({
        data: {
          ...data,
          ...(await resolveTitles(service, c.get('actor'), {
            tasks: [...rows(data.today), ...rows(data.overdue)],
            approvals: rows(data.approvals),
          })),
        },
      });
    },
  );
  router.get(
    '/dashboard/:list',
    describeRoute({
      tags: ['Dashboard'],
      summary: "List one of the overview's lists",
      operationId: 'listDashboardItems',
      description:
        "Today's tasks, the overdue ones, or the approvals waiting, a page at a time.",
      responses: {
        '200': listResponse(JsonObject, ListMeta),
        ...apiErrorResponses,
      },
    }),
    apiValidator('param', AgendaParams),
    apiValidator('query', AgendaQuery),
    async (c) => {
      const { list } = c.req.valid('param');
      const result = await agenda(
        service,
        c.get('actor'),
        list,
        c.req.valid('query'),
      );
      const entity: Entity = list === 'approvals' ? 'approvals' : 'tasks';
      return c.json({
        data: result.data,
        meta: {
          page: result.page,
          pageSize: result.pageSize,
          total: result.total,
          ...(await resolveTitles(service, c.get('actor'), {
            [entity]: result.data,
          })),
        },
      });
    },
  );

  // What the CRM knows about the notifications it sent the reader, for the
  // inbox's detail (notices.ts).
  router.get(
    '/notices',
    describeRoute({
      tags: ['Notifications'],
      summary: 'Describe the notifications the CRM sent the reader',
      operationId: 'listCrmNotices',
      description:
        'Each by its notification id: what happened, on which record, who did it and when, and the comment a mention or a reply is about.',
      responses: {
        '200': dataResponse(z.array(Notice)),
        ...apiErrorResponses,
      },
    }),
    apiValidator('query', NoticesQuery),
    async (c) =>
      c.json({
        data: await noticesOf(
          service,
          c.get('actor'),
          c.req.valid('query').ids.split(','),
        ),
      }),
  );

  // The inbox's AI suggestions: how many wait on the reader (and how many
  // are still being worked on, so the badge looks again soon), and the
  // list.
  router.get(
    '/decisions/count',
    describeRoute({
      tags: ['Ai'],
      summary: 'Count the AI suggestions waiting',
      operationId: 'countDecisions',
      responses: {
        '200': dataResponse(
          z.object({
            count: z.number().int(),
            running: z
              .number()
              .int()
              .meta({ description: 'How many are still being worked on.' }),
          }),
        ),
        ...apiErrorResponses,
      },
    }),
    async (c) => {
      const decisions = await pendingDecisions(service, c.get('actor'), {
        pageSize: 100,
      });
      return c.json({
        data: {
          count: decisions.pending,
          running: decisions.data.filter((entry) => entry.status === 'running')
            .length,
        },
      });
    },
  );
  router.get(
    '/decisions',
    describeRoute({
      tags: ['Ai'],
      summary: 'List the AI suggestions',
      operationId: 'listDecisions',
      description:
        'The suggestions waiting on the reader: on the records they own, the approvals they decide and the tasks they own.',
      // An agent reads them to propose deciding them in a plan
      // (`suggestion.decide`, `approval.decide`).
      ...runCommand(SEARCH_ACTION, {
        command: 'suggestions list',
        columns: ['id', 'entity', 'recordId', 'status', 'createdAt'],
      }),
      responses: {
        '200': listResponse(Decision, DecisionsMeta),
        ...apiErrorResponses,
      },
    }),
    apiValidator('query', DecisionsQuery),
    async (c) => {
      const { data, ...meta } = await pendingDecisions(
        service,
        c.get('actor'),
        c.req.valid('query'),
      );
      return c.json({ data, meta });
    },
  );

  // What a record about to be created may repeat (duplicate-check.ts): an
  // agent checks before its plan creates a lead, contact, company or deal.
  router.get(
    '/duplicateCheck',
    describeRoute({
      tags: ['Workspace'],
      summary: 'Check a new record for duplicates',
      operationId: 'checkDuplicates',
      description:
        "The records the reader may see that a lead, contact, company or opportunity about to be created would repeat, as New lead, New opportunity and New company with the AI find them: for a lead, open leads by its person (email, phone, LinkedIn, or name with company) or company, and contacts and companies; for a contact, contacts by email, phone or LinkedIn; for a company, companies by name and their leads; for an opportunity, companies by name and the company's open deals. At most a few of each.",
      ...runCommand(SEARCH_ACTION, { command: 'duplicates check' }),
      responses: {
        '200': dataResponse(
          z.array(
            z.object({
              entity: z.enum([
                'leads',
                'contacts',
                'companies',
                'opportunities',
              ]),
              id: z.string(),
              name: z.string(),
              matched: z.array(z.string()).meta({
                description:
                  'What matched: email, phone, linkedin, person or company.',
              }),
              mergeable: z.boolean().optional(),
              stage: z.string().optional(),
            }),
          ),
        ),
        ...apiErrorResponses,
      },
    }),
    apiValidator(
      'query',
      z.object({
        entity: z.enum(['leads', 'contacts', 'companies', 'opportunities']),
        name: z.string().max(255).optional(),
        company: z.string().max(255).optional(),
        companyId: z.string().max(64).optional(),
        email: z.string().max(320).optional(),
        phone: z.string().max(64).optional(),
        linkedin: z.string().max(500).optional(),
      }),
    ),
    async (c) =>
      c.json({
        data: await checkDuplicates(
          service,
          c.get('actor'),
          c.req.valid('query'),
        ),
      }),
  );

  // A suggestion put into the conversation of the agent that asks, as its
  // card, for the person to decide there (crm-agents/ai-work-news.ts).
  router.post(
    '/decisions/:entryId/show',
    describeRoute({
      tags: ['Ai'],
      summary: 'Show an AI suggestion in the conversation',
      operationId: 'showDecision',
      description:
        "Puts the suggestion's card into the conversation of the agent that calls it, where the person decides it as in the inbox. Only the record's latest suggestion, and only one the reader may see; nothing without a conversation.",
      ...runCommand(AI_WORK_ACTION, { command: 'suggestions show' }),
      responses: {
        '200': dataResponse(
          z.object({ shown: z.boolean() }),
          'Whether a conversation shows it now.',
        ),
        ...apiErrorResponses,
        '404': apiErrorResponse(404),
      },
    }),
    apiValidator('param', z.object({ entryId: z.string().min(1).max(64) })),
    async (c) => {
      const conversationId = await runConversationOf(app, c.get('auth'));
      if (!conversationId || !app.container.has(agentsToken))
        return c.json({ data: { shown: false } });
      await showSuggestion(
        app.container.resolve(agentsToken),
        service,
        c.get('actor'),
        c.req.valid('param').entryId,
        conversationId,
      );
      return c.json({ data: { shown: true } });
    },
  );

  // The Agents section: how many runs each agent has under way, for the
  // menu's badges; one agent's switches, figures and runs; and an
  // administrator's change to its switches.
  router.get(
    '/aiAgents/running',
    describeRoute({
      tags: ['Ai'],
      summary: "Count the AI agents' runs under way",
      operationId: 'countRunningAiAgents',
      responses: {
        '200': dataResponse(
          z.object({
            leads: z.number().int(),
            opportunities: z.number().int(),
            approvals: z.number().int(),
            tasks: z.number().int(),
          }),
        ),
        ...apiErrorResponses,
      },
    }),
    async (c) => c.json({ data: await runningAgents(service, c.get('actor')) }),
  );
  router.get(
    '/aiAgents/:agent',
    describeRoute({
      tags: ['Ai'],
      summary: 'Get an AI agent',
      operationId: 'getAiAgent',
      description:
        'Its switches, how its runs fared over the last 7 and 30 days, and its runs of the last 90 days on the records the reader may read.',
      responses: { '200': dataResponse(AgentOverview), ...apiErrorResponses },
    }),
    apiValidator('param', AgentParams),
    apiValidator('query', AgentQuery),
    async (c) => {
      const { agent } = c.req.valid('param');
      // The company signals' check keeps its runs in a table of its own
      // (company-signals.ts), answered in the same shape.
      return c.json({
        data:
          agent === 'signals'
            ? await app.container
                .resolve(companySignalsToken)
                .overview(c.get('actor'), c.req.valid('query'))
            : await agentOverview(
                service,
                c.get('actor'),
                agent,
                c.req.valid('query'),
              ),
      });
    },
  );
  router.put(
    '/aiAgents/:agent/switches',
    describeRoute({
      tags: ['Ai'],
      summary: "Update an AI agent's switches",
      operationId: 'updateAiAgentSwitches',
      description: `${settingsOnly} What is left out keeps its value.`,
      responses: {
        '200': dataResponse(AgentSwitchesSchema, "Every agent's switches."),
        ...apiErrorResponses,
      },
    }),
    apiValidator('param', AgentParams),
    apiValidator('json', AgentSwitchInput),
    async (c) =>
      c.json({
        data: await saveAgentSwitch(
          service,
          c.get('actor'),
          c.req.valid('param').agent,
          c.req.valid('json'),
        ),
      }),
  );

  // A work agent's setup on the Agent work page: the model it asks and the
  // instructions its runs open with (work-agents.ts), for whoever manages
  // the settings.
  const setupOf = async (agent: Work) => {
    const settings = (await workAgentSettings(service.database))[agent];
    const run = app.container.has(agentsToken)
      ? await workAgentRun(
          app.container.resolve(agentsToken),
          service.database,
          agent,
        ).catch(() => null)
      : null;
    const defaultInstructions = workInstructions(agent);
    return {
      model: settings?.model ?? null,
      effectiveModel: run?.model ?? null,
      instructions: settings?.instructions ?? defaultInstructions,
      defaultInstructions,
      custom: Boolean(settings?.instructions),
    };
  };
  router.get(
    '/aiAgents/:agent/setup',
    describeRoute({
      tags: ['Ai'],
      summary: "Get an AI agent's setup",
      operationId: 'getAiAgentSetup',
      description: settingsOnly,
      responses: {
        '200': dataResponse(WorkAgentSetup),
        ...apiErrorResponses,
      },
    }),
    apiValidator('param', AgentParams),
    async (c) => {
      await requireCapability(c.get('actor'), 'manage', 'settings');
      return c.json({ data: await setupOf(c.req.valid('param').agent) });
    },
  );
  router.put(
    '/aiAgents/:agent/setup',
    describeRoute({
      tags: ['Ai'],
      summary: "Set up an AI agent's model and instructions",
      operationId: 'updateAiAgentSetup',
      description: `${settingsOnly} A model no enabled service offers is refused (\`invalidInput\`, field \`model\`).`,
      responses: {
        '200': dataResponse(WorkAgentSetup),
        ...apiErrorResponses,
      },
    }),
    apiValidator('param', AgentParams),
    apiValidator('json', WorkAgentSetupInput),
    async (c) => {
      await requireCapability(c.get('actor'), 'manage', 'settings');
      const { agent } = c.req.valid('param');
      const input = c.req.valid('json');
      if (input.model) {
        const chosen = input.model;
        const offered = app.container.has(agentsToken)
          ? await chatModels(app.container.resolve(agentsToken))
          : [];
        if (
          !offered.some(
            (model) =>
              model.modelService === chosen.modelService &&
              model.model === chosen.model,
          )
        )
          throw new CrmError('invalidInput', 400, 'model');
      }
      await saveWorkAgent(service.database, agent, input);
      return c.json({ data: await setupOf(agent) });
    },
  );

  // Attachments: uploading them, their names, and their content.
  router.post(
    '/attachments/upload',
    bodyLimit({
      // A file of 20 MiB and the form around it.
      maxSize: 21 * 1024 * 1024,
      onError: (c) =>
        apiErrorHandler(
          new ApiError({
            status: 'INVALID_ARGUMENT',
            reason: 'FILE_TOO_LARGE',
            domain: CRM_ERROR_DOMAIN,
            message: 'The request body exceeds 21 MiB.',
            httpStatus: 413,
          }),
          c,
        ),
    }),
    describeRoute({
      tags: ['Attachments'],
      summary: 'Upload attachments',
      operationId: 'uploadAttachments',
      description:
        "One or more files of at most 20 MiB each, as `file` parts. For a record's own attachments the reader must be able to create such records; for a comment's, read the record.",
      requestBody: {
        required: true,
        content: {
          'multipart/form-data': {
            schema: {
              type: 'object',
              required: ['file'],
              properties: {
                file: {
                  type: 'array',
                  items: { type: 'string', format: 'binary' },
                },
              },
            },
          },
        },
      },
      responses: {
        '201': dataResponse(z.array(UploadedAttachment)),
        ...apiErrorResponses,
        '404': apiErrorResponse(404, 'The record does not exist.'),
        '413': apiErrorResponse(413, 'A file is too large.'),
      },
    }),
    apiValidator('query', UploadQuery),
    async (c) => {
      const actor = c.get('actor');
      const { entity = 'leads', recordId } = c.req.valid('query');
      // A comment's files: whoever may read the record may comment on it,
      // and so attach to what they write.
      if (recordId) await service.get(actor, entity, recordId);
      else await conditions(actor, entity, 'create');
      const body = await c.req.parseBody({ all: true });
      const files = Array.isArray(body.file) ? body.file : [body.file];
      if (
        !files.length ||
        files.some((file) => !(file instanceof File) || file.size > MAX_FILE)
      )
        throw new CrmError('invalidInput', 400, 'file');
      const repository = app.container
        .resolve(serverFileRepositoryManagerToken)
        .repository('crmFiles', {
          connection: 'main',
          disk: 'local',
          accessPath: '/crm/files',
          // Only the upload path binds this; access was already checked
          // above against the CRM's own permissions, and reads go through
          // the CRM's content route rather than the plugin's.
          policy: { read: true, create: true, update: false, delete: false },
        });
      const uploaded = await repository.uploadMany({ files: files as File[] });
      for (const file of uploaded.records)
        await service.database
          .query()
          .insertInto('crmFileUploads')
          .values({ id: file.id, ownerId: actor.id })
          .execute();
      return c.json(
        {
          data: uploaded.records.map((f) => ({
            id: toText(f.id),
            filename: toText(f.filename),
            contentUrl: contentUrl(toText(f.id)),
          })),
        },
        201,
      );
    },
  );
  // Attachments are kept on records as bare ids; a list needs their names
  // in one call rather than a request per file.
  router.get(
    '/attachments',
    describeRoute({
      tags: ['Attachments'],
      summary: 'List attachments',
      operationId: 'listAttachments',
      description: 'The ones named that the reader may open, at most 100.',
      responses: {
        '200': listResponse(Attachment, total),
        ...apiErrorResponses,
      },
    }),
    apiValidator('query', AttachmentsQuery),
    async (c) => {
      const actor = c.get('actor');
      const ids = c.req
        .valid('query')
        .ids.split(',')
        .map((id) => id.trim())
        .filter(Boolean)
        .slice(0, 100);
      const files = ids.length
        ? await service.database
            .query()
            .selectFrom('crmFiles')
            .select(['id', 'filename', 'createdAt', 'mimeType', 'size'])
            .where('id', 'in', ids)
            .execute()
        : [];
      const data = [];
      for (const file of files)
        if (await service.canReadFile(actor, toText(file.id)))
          data.push({
            id: toText(file.id),
            filename: toText(file.filename),
            createdAt: toText(file.createdAt),
            mimeType: file.mimeType == null ? null : toText(file.mimeType),
            size: file.size == null ? null : Number(file.size),
            url: contentUrl(toText(file.id)),
          });
      return c.json({ data, meta: { total: data.length } });
    },
  );
  router.get(
    '/attachments/:attachmentId/content',
    describeRoute({
      tags: ['Attachments'],
      summary: "Get an attachment's content",
      operationId: 'getAttachmentContent',
      description:
        'A download, or with `inline=1` shown in the browser for the types it renders safely itself (images, PDF, plain text).',
      responses: {
        '200': {
          description: 'The file.',
          content: {
            'application/octet-stream': {
              schema: { type: 'string', format: 'binary' },
            },
          },
        },
        ...apiErrorResponses,
        '404': apiErrorResponse(
          404,
          'The attachment does not exist or the reader may not open it.',
        ),
      },
    }),
    apiValidator('param', AttachmentParams),
    apiValidator('query', ContentQuery),
    async (c) => {
      const id = c.req.valid('param').attachmentId;
      if (!(await service.canReadFile(c.get('actor'), id)))
        throw new CrmError('notFound', 404);
      const file = await service.database
        .query()
        .selectFrom('crmFiles')
        .selectAll()
        .where('id', '=', id)
        .executeTakeFirst();
      if (!file) throw new CrmError('notFound', 404);
      const stream = await app.container
        .resolve(driveManagerToken)
        .use(toText(file.disk))
        .getStream(toText(file.key));
      // Inline only for types a browser renders safely on its own;
      // everything else stays a download whatever the stored type says.
      const inline = c.req.valid('query').inline ? previewType(file) : null;
      const name = encodeURIComponent(toText(file.filename));
      return new Response(Readable.toWeb(stream) as ReadableStream, {
        headers: {
          'Content-Type': inline ?? 'application/octet-stream',
          'Content-Disposition': `${inline ? 'inline' : 'attachment'}; filename*=UTF-8''${name}`,
          'X-Content-Type-Options': 'nosniff',
          'Cache-Control': 'private, no-store',
        },
      });
    },
  );

  // The signed-in user's mail brought into the timeline now rather than at
  // the next minute's pass: the browser asks after sending, and on the Mail
  // plugin's `mail.changed` for its user (mail-timeline.ts). Only the
  // user's own mailboxes are read.
  router.post(
    '/mailTimeline/sync',
    describeRoute({
      tags: ['Workspace'],
      summary: "Bring the reader's mail into the timeline",
      operationId: 'syncMailTimeline',
      responses: {
        '200': dataResponse(
          z.object({
            written: z
              .number()
              .int()
              .meta({ description: 'Timeline entries written or updated.' }),
          }),
        ),
        ...apiErrorResponses,
      },
    }),
    async (c) => {
      const timeline = app.container.resolve(mailTimelineToken);
      const written = await timeline.syncUser(c.get('actor').id);
      return c.json({ data: { written } });
    },
  );
  // The global search's AI answers (search-answers.ts): kept when the person
  // goes on asking, deleted when they leave the answer.
  const SearchAnswerParams = z.object({
    conversationId: z.string().min(1).max(64),
  });
  router.post(
    '/searchAnswers/:conversationId/keep',
    describeRoute({
      tags: ['Workspace'],
      summary: "Keep a search's AI answer as a conversation",
      operationId: 'keepSearchAnswer',
      description:
        "The reader's own conversation asked from the global search stays, as one of the CRM's conversations, once they go on asking in it.",
      responses: {
        '204': emptyResponse(),
        '401': apiErrorResponse(401),
        '404': apiErrorResponse(404, 'No such answer of the reader.'),
        '500': apiErrorResponse(500),
      },
    }),
    apiValidator('param', SearchAnswerParams),
    async (c) => {
      const kept = await keepSearchAnswer(
        service,
        c.get('actor').id,
        c.req.valid('param').conversationId,
      );
      if (!kept) throw new CrmError('notFound', 404);
      return c.body(null, 204);
    },
  );
  router.delete(
    '/searchAnswers/:conversationId',
    describeRoute({
      tags: ['Workspace'],
      summary: "Discard a search's AI answer",
      operationId: 'discardSearchAnswer',
      description:
        "Deletes the reader's conversation asked from the global search that they did not go on with.",
      responses: {
        '204': emptyResponse(),
        '401': apiErrorResponse(401),
        '500': apiErrorResponse(500),
      },
    }),
    apiValidator('param', SearchAnswerParams),
    async (c) => {
      await discardSearchAnswer(
        service,
        c.get('actor').id,
        c.req.valid('param').conversationId,
      );
      return c.body(null, 204);
    },
  );
}
