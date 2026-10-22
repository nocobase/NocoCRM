import { randomUUID } from 'node:crypto';
import CrmProvider from '../../server/providers/crm/index.js';
import { i18nToken } from '@nocobase/app-server/i18n';
import { I18nRuntime } from '@nocobase/i18n';
import { notificationServiceToken } from '@nocobase/app-plugin-notification/server';
import { notificationLocales } from '../../server/locales/crm-notifications/index.js';
import { statistics } from '../../server/providers/crm/statistics.js';
import { dashboard } from '../../server/providers/crm/dashboard.js';
import { reports } from '../../server/providers/crm/reports.js';
import {
  agentOn,
  agentOverview,
  agentSwitches,
  saveAgentSwitch,
} from '../../server/providers/crm/agents.js';
import {
  definitions,
  fieldsFor,
  lostReasons,
  object,
  toText,
  entities,
  type CrmRecord,
  type Entity,
} from '../../server/providers/crm/schema.js';
import { lifecycleParameterStore } from '../../server/providers/lifecycles.js';
import {
  CompanySignals,
  companySignalsToken,
} from '../../server/providers/crm/company-signals.js';
import geographyMigration from '../../database/main/migrations/202609100001_crm_geography_codes.js';
import phoneMigration from '../../database/main/migrations/202610030001_crm_phone_numbers.js';
import { normalizePhone } from '../../server/providers/crm/phone.js';
import legacyTimestampsMigration from '../../database/main/migrations/202609200001_legacy_epoch_timestamps.js';
import salesSetsSeed from '../../database/main/seeds/202610040001_crm_sales_permission_sets.js';
// @vitest-environment node
import sqlite from '@nocobase/db-sqlite';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import {
  createDatabaseManager,
  defineDatabase,
  type DatabaseManager,
} from '@nocobase/db';
import {
  createAppAuthorization,
  authorizationToken,
  type AppAuthorization,
} from '@nocobase/app-plugin-authorization/server';
import { authenticationToken } from '@nocobase/app-plugin-authentication';
import { createAppPaths } from '@nocobase/app-server/config';
import {
  ServiceContainer,
  type ServiceResolver,
} from '@nocobase/service-provider';
import { mailServiceToken } from '@nocobase/app-plugin-mail/server';
import { inAppNotificationStoreToken } from '@nocobase/app-plugin-notification-in-app/server';
import { DEMO_MAIL_SECRET } from '../../server/providers/crm/demo-mail.js';
import {
  MailTimeline,
  mailTimelineToken,
} from '../../server/providers/crm/mail-timeline.js';
import { endOfDay, isEndOfDay } from '../../server/providers/crm/zone-time.js';
import {
  lastExchanges,
  upcomingTasks,
} from '../../server/providers/crm/exchanges.js';
import { Hono, type MiddlewareHandler } from 'hono';
import {
  capability,
  conditions,
  registerCrmResources,
  provisionCrm,
  roleKey,
  taskGrants,
  withoutSkillGrants,
  translateLegacyGrants,
  type Actor,
} from '../../server/providers/crm/authorization.js';
import {
  crmPages,
  crmPermissionSet,
  MAIL_WORKSPACE_PAGE,
  entityGrant,
  pageGrant,
  salesGrant,
} from '../../server/providers/crm/resources.js';
import { CrmService } from '../../server/providers/crm/service.js';
import { createCrmUserRoleScope } from '../../server/providers/crm/user-roles.js';
import {
  conversionPreview,
  convertLead,
} from '../../server/providers/crm/conversion.js';
import {
  CRM_INBOX_CHANNEL,
  crmToken,
} from '../../server/providers/crm/index.js';
import { crmRoutes } from '../../server/routes/crm.js';
import { whatsappWebhookRoutes } from '../../server/routes/whatsapp.js';
import {
  QUIET_MS,
  WhatsAppService,
  whatsappToken,
} from '../../server/providers/crm/whatsapp/service.js';
import { secretsServiceToken } from '@nocobase/app-server/secrets';
import { serverFileRepositoryManagerToken } from '@nocobase/app-plugin-file/server';
import { createHmac } from 'node:crypto';
import { watchAiWork } from '../../server/providers/crm/ai-watches.js';
import { deliverAiWork } from '../../server/providers/crm-agents/ai-work-news.js';
import {
  agentsToken,
  type Agents,
  type CallerIdentity,
} from '@nocobase/app-plugin-agents/server/tokens';
import {
  CrmPlans,
  crmPlansToken,
  type PlanOutcome,
} from '../../server/providers/crm/plans/engine.js';
import {
  crmActionGate,
  heldActions,
} from '../../server/providers/crm-agents/gate.js';
import { registerContextKinds } from '../../server/providers/crm-agents/context.js';
import { defaultSettings } from '../../server/providers/crm/schema.js';
import { crmConversationRules } from '../../server/providers/crm-agents/rules.js';
import {
  ASSISTANT_SCOPE,
  configureAssistant,
} from '../../server/providers/crm-agents/assistant.js';
import { adoptLegacyConversations } from '../../server/providers/crm-agents/legacy-conversations.js';
import { namePlaceholderModel } from '../../server/providers/crm-agents/placeholder-model.js';
import { provisionSkills } from '../../server/providers/crm-agents/library.js';
import {
  adoptLegacyWorkAgents,
  workAgentNames,
  workAgentSettings,
  workInstructions,
} from '../../server/providers/crm-agents/work-agents.js';
import {
  findApiDocumentSchemaProblems,
  findUndeclaredApiRoutes,
  generateApiDocument,
} from '@nocobase/app-server/router';
import { captureLeads } from '../../server/providers/crm/lead-capture.js';
import {
  captureOpportunity,
  matchCompany,
} from '../../server/providers/crm/opportunity-capture.js';
import {
  findDuplicates,
  matchReasons,
  mergeProposal,
} from '../../server/providers/crm/lead-merge.js';
import {
  approvalsSettled,
  followUpAfterTask,
  followUpLead,
  organiseFeedback,
  recordOutcome,
} from '../../server/providers/crm/feedback.js';
import {
  LeadEvaluator,
  tasksOf,
  carried,
  cleanEnrich,
  contactTime,
  aiStates,
  latestEvaluation,
  pendingDecisions,
  unwrittenFindings,
  stringValues,
  type FollowUpTrigger,
} from '../../server/providers/crm/lead-evaluation.js';
import {
  ApprovalReviewer,
  latestReview,
} from '../../server/providers/crm/approval-review.js';
import {
  OpportunityEvaluator,
  checkTerms,
  latestOpportunityEvaluation,
} from '../../server/providers/crm/opportunity-evaluation.js';
import {
  leadSignal,
  scanLeadSignals,
} from '../../server/providers/crm/lead-signals.js';
import {
  dealSignal,
  scanDealSignals,
} from '../../server/providers/crm/deal-signals.js';
import {
  crmGuidance,
  settingsGuidance,
} from '../../server/providers/crm/guidance.js';
import { fakeModel } from '../setup/model-fake.js';
import { JobInterruptedError } from '@nocobase/jobs';
import { readEntry } from '../../server/providers/crm/ai-entries.js';
import type { FollowUpPayload } from '../../server/providers/crm/follow-up-jobs.js';
import { userManagementServiceToken } from '@nocobase/app-plugin-users/server/tokens';
import {
  DEMO_MARKER,
  demoAccounts,
  demoAccountsIn,
  demoStatus,
} from '../../server/providers/crm/demo.js';
import type { Application } from '@nocobase/app-server/application';
import { noticesOf } from '../../server/providers/crm/notices.js';
import { GRACE_MS, sweepFiles } from '../../server/providers/crm/file-sweep.js';
import {
  discardSearchAnswer,
  keepSearchAnswer,
  sweepSearchAnswers,
} from '../../server/providers/crm-agents/search-answers.js';
import {
  latestPreparation,
  scanTaskPreparation,
  TaskPreparer,
} from '../../server/providers/crm/task-preparation.js';

let database: DatabaseManager;
let authorization: AppAuthorization;
// A plain collection grant as a permission set may store it, with the record
// access and fields each action keeps.
const collectionGrant = (
  table: string,
  actions: Record<
    string,
    { fields?: '*' | readonly string[]; recordAccess?: readonly string[] }
  >,
) => ({
  resource: { type: 'database.collection', id: table },
  actions: Object.entries(actions).map(([action, policy]) => ({
    action,
    policy: { type: 'database', ...policy },
  })),
});
let service: CrmService;
// Users whose password the demo import set back through the users plugin.
const passwordResets: string[] = [];
let folder: string;
let router: Hono;
let signals: CompanySignals;
let whatsapp: WhatsAppService;
let webhooks: Hono;
// What the WhatsApp channel's fake fetched: a media file per id.
const waMedia = new Map<string, string>();
// What the CRM sent to Meta (the fake Graph API below), and a refusal to
// answer the next send with: Meta's error code.
const waSent: { url: string; body: unknown }[] = [];
let waRefuse: number | undefined;
// What the faked web search answers, and how it was asked.
const web = {
  on: true,
  answers: [] as { text: string; pages: Record<string, unknown>[] }[],
  calls: [] as { search: boolean }[],
};
let plans: CrmPlans;
const planOutcomes: PlanOutcome[] = [];
// What reached a conversation as news (a plan's outcome, the AI's work).
const delivered: { conversationId: string; news: Record<string, unknown> }[] =
  [];
let fakeAgents: Agents;
// The Mail plugin as the mail timeline sees it: each user's connected
// mailboxes and the messages they hold, set by a test.
type FakeMessage = {
  id: string;
  companyId: string;
  conversationId?: string;
  from: { address: string; name?: string };
  to: { address: string }[];
  cc?: { address: string }[];
  subject: string;
  receivedAt: string;
  draft?: boolean;
};
const mailbox: {
  accounts: Record<string, string>;
  messages: FakeMessage[];
  // The accounts whose synchronization has completed, by user; absent, the
  // plugin reports none (as before it was asked).
  synced?: Record<string, string[]>;
} = {
  accounts: {},
  messages: [],
};
const fakeMail = {
  has: (token: unknown) => token === mailServiceToken,
  resolve: (token: unknown) => {
    if (token !== mailServiceToken) throw new Error('not registered');
    return {
      listAccounts: async ({ actorId }: { actorId: string }) =>
        mailbox.accounts[actorId]
          ? [{ id: `mailbox-${actorId}`, address: mailbox.accounts[actorId] }]
          : [],
      listSyncRuns: async ({ actorId }: { actorId: string }) => {
        if (!mailbox.synced) throw new Error('not asked');
        return (mailbox.synced[actorId] ?? []).map((accountId) => ({
          accountId,
          status: 'completed',
        }));
      },
      listMessages: async ({ actorId }: { actorId: string }) => ({
        items: mailbox.messages
          .filter((m) => m.accountId === `mailbox-${actorId}`)
          .map((m) => ({ cc: [], bcc: [], read: true, ...m }))
          .sort((a, b) => b.receivedAt.localeCompare(a.receivedAt)),
      }),
    };
  },
} as unknown as ServiceResolver;
let timeline: MailTimeline;
const demoMail: {
  connected: {
    userId: string;
    address: string;
    password: string;
    provider: unknown;
  }[];
  removed: { userId: string; accountId: string }[];
} = { connected: [], removed: [] };
// The in-app notifications the demo's removal deletes, by item id.
const deletedNotices: { id: string; userId: string }[] = [];
const actor = (id: string): Actor => ({
  id,
  locale: 'en-US',
  scope: authorization.for({
    principal: { type: 'user', id },
    subjects: [{ type: 'authenticated', id: '*' }],
  }),
});
beforeAll(async () => {
  folder = await mkdtemp(resolve(tmpdir(), 'crm-test-'));
  database = createDatabaseManager(
    defineDatabase({
      drivers: { sqlite },
      default: 'main',
      connections: {
        main: {
          dialect: 'sqlite',
          filename: resolve(folder, 'test.sqlite'),
          schemaManagement: 'managed',
        },
      },
    }),
  );
  await database.connect();
  // The in-app notification plugin's items, as the demo's removal reads them.
  await database.builder().createCollection('notificationInAppItems', (c) => {
    c.string('id');
    c.primary('id');
    c.string('userId');
    c.string('deliveryId').nullable();
    c.string('notificationId');
    c.string('title').nullable();
    c.text('body').nullable();
    c.string('actionUrl').nullable();
    c.text('target').nullable();
    c.datetimeTz('readAt').nullable();
    c.datetimeTz('createdAt').nullable();
    c.datetimeTz('updatedAt').nullable();
  });
  // The Agents plugin's conversations, as the search's answers write them.
  await database.builder().createCollection('agConversations', (c) => {
    c.string('id');
    c.primary('id');
    c.string('userId');
    c.string('source');
    // Its binding to the plugin's chat, and the model it answers with.
    c.string('agentId').nullable();
    c.string('mode').nullable();
    c.string('modelService').nullable();
    c.string('model').nullable();
    c.json('metadata').nullable();
    c.datetimeTz('createdAt').nullable();
  });
  await database.builder().createCollection('agConversationMessages', (c) => {
    c.string('id');
    c.primary('id');
    c.string('conversationId');
    c.integer('seq').nullable();
    // The notices a conversation shows (the AI's work told into it).
    c.string('role').nullable();
    c.json('content').nullable();
    c.json('workContext').nullable();
    c.json('metadata').nullable();
    c.datetimeTz('createdAt').nullable();
  });
  // The agents an earlier release of the Agents plugin kept, which the
  // CRM's work agents were.
  await database.builder().createCollection('agAgents', (c) => {
    c.string('id');
    c.primary('id');
    c.text('instructions').nullable();
    c.json('modelEntries').nullable();
    c.datetimeTz('archivedAt').nullable();
    c.datetimeTz('deletedAt').nullable();
  });
  await database.builder().createCollection('user', (c) => {
    c.string('id');
    c.primary('id');
    c.string('name');
    c.string('username');
    c.string('email');
    // The authentication plugin's company-level switch and deletion record,
    // both read by the CRM.
    c.datetimeTz('disabledAt').nullable();
    c.datetimeTz('deletedAt').nullable();
    c.datetimeTz('createdAt').nullable();
  });
  await database
    .query()
    .insertInto('user')
    .values(
      ['admin', 'manager', 'rep', 'other', 'outsider', 'restricted'].map(
        (id) => ({
          id,
          name: id,
          username: id,
          email: `${id}@example.test`,
        }),
      ),
    )
    .execute();
  const pluginRoot = resolve('node_modules/@nocobase/app-plugin-authorization');
  await database
    .createMigrator({
      sources: [
        {
          packageName: 'authorization',
          directory: resolve(pluginRoot, 'dist/database/migrations'),
        },
        { packageName: 'crm', directory: resolve('database/main/migrations') },
      ],
    })
    .latest();
  authorization = createAppAuthorization({
    connection: database.connection(),
  });
  registerCrmResources(authorization);
  // The plugin's seed creates the root set on installation; the tests run
  // only the migrations, so the set is created here as the seed does. The
  // CRM's administrator is that set.
  await authorization.permissionSets.create({
    key: 'root',
    title: 'System administrator',
    grants: [],
  });
  // The sales sets come from the CRM's installation seed, then boot's
  // one-time changes run, as on a new installation.
  await runSalesSetsSeed();
  await provisionCrm(authorization, database);
  for (const [id, role] of [
    ['admin', 'system-administrator'],
    ['manager', 'sales-manager'],
    ['rep', 'sales-representative'],
    ['other', 'sales-representative'],
  ] as const)
    await authorization.permissionSets.assign({
      permissionSet: roleKey(role),
      subject: { type: 'user', id },
    });
  service = new CrmService(database, authorization);
  // The daily passes are off until an administrator switches them on; the
  // tests of those passes find them on.
  for (const agent of ['leads', 'opportunities', 'tasks', 'signals'] as const)
    await saveAgentSwitch(service, actor('admin'), agent, {
      triggers: { daily: true },
    });
  const container = new ServiceContainer();
  const required = (): MiddlewareHandler => async (c, next) => {
    const id = c.req.header('x-test-user');
    if (!id) return c.json({ code: 'unauthorized' }, 401);
    // An agent's run acting for the user, configured with the actions the
    // header lists (as the Agents plugin's run credential carries it).
    const runActions = c.req.header('x-test-run-actions');
    // The credential of a command the assistant runs in a conversation.
    const assistant = c.req.header('x-test-assistant');
    c.set(
      'auth',
      assistant !== undefined
        ? {
            user: { id },
            credential: {
              type: 'crm-assistant',
              id: assistant,
              userId: id,
              scheme: 'crmAssistantToken',
              data: { conversationId: assistant },
            },
          }
        : runActions === undefined
          ? { user: { id } }
          : {
              user: { id },
              credential: {
                type: 'run',
                data: {
                  run: {
                    run: {
                      id: 'run-1',
                      actorUserId: id,
                      subjectKind: 'conversation',
                      subjectId: 'conversation-1',
                      threadScope: 'main',
                      parentRunId: null,
                    },
                  },
                  agent: {
                    id: 'agent-1',
                    name: 'AI',
                    actions: runActions.split(',').filter(Boolean),
                  },
                },
              },
            },
    );
    await next();
  };
  container.instance(authenticationToken, { required } as unknown as ReturnType<
    typeof container.resolve<typeof authenticationToken>
  >);
  container.instance(authorizationToken, authorization);
  container.instance(crmToken, service);
  // The Agents plugin as the CRM's routes use it: the gate, and where a
  // run's plan goes back to.
  const gate = crmActionGate(service);
  fakeAgents = {
    gate: { allowed: (identity: CallerIdentity) => gate.allowed(identity) },
    tx: { read: () => null, run: (fn: (tx: null) => unknown) => fn(null) },
    conversations: {
      homeOf: () => Promise.resolve({ id: 'conversation-1' }),
      deliver: (
        _tx: unknown,
        conversationId: string,
        news: Record<string, unknown>,
      ) => {
        delivered.push({ conversationId, news });
        return Promise.resolve(null);
      },
    },
  } as unknown as Agents;
  container.instance(agentsToken, fakeAgents);
  plans = new CrmPlans(service, {
    leads: () => undefined,
    opportunities: () => undefined,
  });
  plans.onDecided = (outcome) => {
    planOutcomes.push(outcome);
    return Promise.resolve();
  };
  container.instance(crmPlansToken, plans);
  timeline = new MailTimeline(service, fakeMail);
  container.instance(mailTimelineToken, timeline);
  // What the demo import needs from the users plugin: an account with a role.
  container.instance(userManagementServiceToken, {
    async create(input: {
      name: string;
      username: string;
      email: string;
      password: string;
      roleScopes: Record<string, string | readonly string[]>;
    }) {
      // The users plugin's rules, which the demo accounts must satisfy.
      if (input.password.length < 8)
        throw new Error('Password must be at least 8 characters');
      const roles = input.roleScopes.app;
      if (!Array.isArray(roles))
        throw new Error('Role scope "app" requires a multiple selection');
      const id = `demo-${input.username}`;
      await database
        .query()
        .insertInto('user')
        .values({
          id,
          name: input.name,
          username: input.username,
          email: input.email,
        })
        .execute();
      for (const permissionSet of roles)
        await authorization.permissionSets.assign({
          permissionSet,
          subject: { type: 'user', id },
        });
      return { id };
    },
    // A reused account gets the demo password back; the import relies on it.
    async resetPassword(userId: string, password: string) {
      if (password.length < 8)
        throw new Error('Password must be at least 8 characters');
      passwordResets.push(userId);
    },
    // Removing the demo data disables its accounts; importing enables them.
    async enable(userId: string) {
      await database
        .query()
        .updateTable('user')
        .set({ disabledAt: null })
        .where('id', '=', userId)
        .execute();
      return { id: userId };
    },
    async disable(userId: string) {
      await database
        .query()
        .updateTable('user')
        .set({ disabledAt: new Date().toISOString() })
        .where('id', '=', userId)
        .execute();
      return { id: userId };
    },
    // A reused account gets its demo name back.
    async update(userId: string, input: { name?: string }) {
      if (input.name !== undefined)
        await database
          .query()
          .updateTable('user')
          .set({ name: input.name })
          .where('id', '=', userId)
          .execute();
      return { id: userId };
    },
  } as unknown as ReturnType<
    typeof container.resolve<typeof userManagementServiceToken>
  >);
  // The Mail plugin as the demo import sees it: mailboxes connected and
  // removed as the user they belong to.
  container.instance(mailServiceToken, {
    listAccounts: async () => [],
    listMessages: async () => ({ items: [] }),
    async connectAccount(
      context: { actorId: string },
      input: { address: string; password: string; provider: unknown },
    ) {
      demoMail.connected.push({ userId: context.actorId, ...input });
      return { id: `demo-mailbox-${context.actorId}` };
    },
    async removeAccount(context: { actorId: string }, accountId: string) {
      demoMail.removed.push({ userId: context.actorId, accountId });
      return undefined;
    },
  } as unknown as ReturnType<
    typeof container.resolve<typeof mailServiceToken>
  >);
  container.instance(inAppNotificationStoreToken, {
    async update(input: { id: string; userId: string; action: string }) {
      if (input.action === 'delete')
        deletedNotices.push({ id: input.id, userId: input.userId });
      return undefined;
    },
  } as unknown as ReturnType<
    typeof container.resolve<typeof inAppNotificationStoreToken>
  >);
  // The company signals with DashScope's search faked: each call answers
  // the next of `web.answers`, in the native API's shape.
  signals = new CompanySignals(
    service,
    () =>
      web.on
        ? {
            kind: 'dashscope' as const,
            service: 'qwen',
            model: 'qwen3.8-flash',
            apiKey: 'key',
          }
        : null,
    {
      fetch: (async (_url: string, init: { body: string }) => {
        const body = JSON.parse(init.body) as {
          parameters: { enable_search: boolean };
        };
        web.calls.push({ search: body.parameters.enable_search });
        const next = web.answers.shift() ?? {
          text: '{"events":[]}',
          pages: [],
        };
        return new Response(
          JSON.stringify({
            output: {
              choices: [{ message: { content: [{ text: next.text }] } }],
              search_info: { search_results: next.pages },
            },
            usage: { input_tokens: 3000, output_tokens: 300 },
          }),
          { status: 200 },
        );
      }) as unknown as typeof fetch,
    },
  );
  container.instance(companySignalsToken, signals);
  // WhatsApp: credentials sealed by a stand-in for the secrets service, media
  // stored as CRM files, Meta's Cloud API faked for media.
  container.instance(secretsServiceToken, {
    ready: true,
    seal: (plain: string) => `sealed:${plain}`,
    open: (sealed: string) => sealed.replace(/^sealed:/, ''),
  } as unknown as ReturnType<
    typeof container.resolve<typeof secretsServiceToken>
  >);
  container.instance(serverFileRepositoryManagerToken, {
    repository: () => ({
      async uploadOne({ file }: { file: File }) {
        const id = randomUUID();
        const now = new Date().toISOString();
        await database
          .query()
          .insertInto('crmFiles')
          .values({
            id,
            disk: 'local',
            key: `wa/${id}`,
            filename: file.name,
            mimeType: file.type,
            size: file.size,
            createdAt: now,
            updatedAt: now,
          })
          .execute();
        return { record: { id } };
      },
    }),
  } as unknown as ReturnType<
    typeof container.resolve<typeof serverFileRepositoryManagerToken>
  >);
  whatsapp = new WhatsAppService(service, container);
  whatsapp.channelFactory = async () => {
    const { cloudApiChannel } =
      await import('../../server/providers/crm/whatsapp/channel.js');
    return cloudApiChannel({
      appSecret: 'app-secret',
      accessToken: 'token',
      fetch: (async (url: string, init?: RequestInit) => {
        if (init?.method === 'POST') {
          if (url.endsWith('/media')) {
            waSent.push({ url, body: 'file' });
            return new Response(JSON.stringify({ id: 'meta-media-1' }));
          }
          const body = JSON.parse(String(init.body)) as unknown;
          waSent.push({ url, body });
          if (waRefuse !== undefined) {
            const code = waRefuse;
            waRefuse = undefined;
            return new Response(JSON.stringify({ error: { code } }), {
              status: 400,
            });
          }
          return new Response(
            JSON.stringify({
              messages: [{ id: `wamid.sent-${String(waSent.length)}` }],
            }),
          );
        }
        const id = url.split('/').pop() ?? '';
        if (url.startsWith('https://media.test/'))
          return new Response(waMedia.get(id) ?? '', {
            headers: { 'content-type': 'image/jpeg' },
          });
        if (!waMedia.has(id)) return new Response('{}', { status: 404 });
        return new Response(
          JSON.stringify({
            url: `https://media.test/${id}`,
            mime_type: 'image/jpeg',
          }),
        );
      }) as unknown as typeof fetch,
    });
  };
  container.instance(whatsappToken, whatsapp);
  service.whatsappRecords = {
    converted: (query, leadId, contactId) =>
      whatsapp.leadConverted(query, leadId, contactId),
    merged: (query, keptId, otherId) =>
      whatsapp.leadsMerged(query, keptId, otherId),
    removed: (query, entity, id) => whatsapp.recordRemoved(query, entity, id),
  };
  service.whatsappFileReadable = (reader, messageId) =>
    whatsapp
      .mediaFile(reader, messageId)
      .then(() => true)
      .catch(() => false);
  webhooks = await whatsappWebhookRoutes.createRouter({
    container,
  } as unknown as Application);
  router = await crmRoutes.createRouter({
    container,
    publicBasePath: '/test',
    paths: createAppPaths({ rootDir: folder }),
  } as Application);
}, 30000);
afterAll(async () => {
  await database?.destroy();
  if (folder) await rm(folder, { recursive: true, force: true });
});
const request = (
  path: string,
  user?: string,
  method = 'GET',
  body?: unknown,
): Promise<Response> =>
  router.request(path, {
    method,
    headers: {
      ...(user ? { 'x-test-user': user } : {}),
      'Content-Type': 'application/json',
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });

// The CRM's installation seed for its sales permission sets, run against the
// test database as the seeder runs it: with the default connection's query
// adapter and nothing else it needs.
async function runSalesSetsSeed(): Promise<void> {
  await salesSetsSeed.run({
    query: database.query(),
  } as unknown as Parameters<typeof salesSetsSeed.run>[0]);
}

describe('CRM API document', () => {
  it('declares every route, each with its own operation and valid schemas', async () => {
    expect(findUndeclaredApiRoutes(router)).toEqual([]);
    const document = await generateApiDocument(router, {
      info: { title: 'CRM', version: 'test' },
    });
    expect(findApiDocumentSchemaProblems(document)).toEqual([]);
    const operations = Object.values(document.paths ?? {}).flatMap((item) =>
      Object.values(item ?? {}).flatMap((op) =>
        op && typeof op === 'object' && 'operationId' in op
          ? [String(op.operationId)]
          : [],
      ),
    );
    expect(new Set(operations).size).toBe(operations.length);
    const leads = document.paths?.['/api/leads/{leadId}'];
    expect(leads?.get?.operationId).toBe('getLead');
    expect(Object.keys(leads?.delete?.responses ?? {}).sort()).toEqual([
      '204',
      '400',
      '401',
      '403',
      '404',
      '500',
    ]);
    expect(
      document.paths?.['/api/leads/{leadId}/convert']?.post?.operationId,
    ).toBe('convertLead');
    // Tasks are neither exported nor imported.
    expect(document.paths?.['/api/tasks/export']).toBeUndefined();
  });
});

describe('CRM API security and domain rules', () => {
  it('rejects anonymous and unpermitted requests and serves permitted users', async () => {
    expect((await request('/leads')).status).toBe(401);
    expect((await request('/leads', 'outsider')).status).toBe(403);
    expect((await request('/leads', 'rep')).status).toBe(200);
    expect((await request('/systemSettings', 'rep')).status).toBe(403);
    expect((await request('/systemSettings', 'manager')).status).toBe(403);
    expect((await request('/workspace', 'admin')).status).toBe(200);
    expect(
      await actor('admin').scope.can({
        resource: { type: 'settings', id: 'crm' },
        action: 'manage',
      }),
    ).toBe(true);
    expect(
      await actor('rep').scope.can({
        resource: { type: 'settings', id: 'crm' },
        action: 'manage',
      }),
    ).toBe(false);
    // A write needs no header of the CRM's own (the session cookie is
    // SameSite=Lax): a lead without a name is refused for the name, in the
    // standard error body.
    const unnamed = await router.request('/leads', {
      method: 'POST',
      headers: { 'x-test-user': 'rep' },
      body: '{}',
    });
    expect(unnamed.status).toBe(400);
    expect(await unnamed.json()).toMatchObject({
      error: {
        status: 'INVALID_ARGUMENT',
        domain: 'crm',
        fieldViolations: [{ field: 'name' }],
      },
    });
    expect((await router.request('/unrelated')).status).toBe(404);
  });
  it('offers the assistant only as the enabled AI employee and drops the retired AI switch', async () => {
    // Without the AI Employee plugin's table there is no employee to answer,
    // so the pages offer no assistant entry.
    const meta = (await (await request('/workspace', 'admin')).json()) as {
      data: { assistant: boolean; settings: Record<string, unknown> };
    };
    expect(meta.data.assistant).toBe(false);
    expect(meta.data.settings).not.toHaveProperty('aiEnabled');
    // The settings as they are, without the option lists, which are not
    // sent back; a retired setting such as the old AI switch is refused.
    const { data: current } = (await (
      await request('/systemSettings', 'admin')
    ).json()) as { data: Record<string, unknown> };
    const { options: _options, ...settings } = current;
    const retired = await request('/systemSettings', 'admin', 'PUT', {
      ...settings,
      aiEnabled: false,
    });
    expect(retired.status).toBe(400);
    expect(await retired.json()).toMatchObject({
      error: { reason: 'INVALID_INPUT' },
    });
    expect(
      (await request('/systemSettings', 'admin', 'PUT', settings)).status,
    ).toBe(200);
    const after = (await (await request('/workspace', 'admin')).json()) as {
      data: { settings: Record<string, unknown> };
    };
    expect(after.data.settings).not.toHaveProperty('aiEnabled');
    // The AI's language is one of two, English by default, and a save
    // tells the provider (which registers the assistant's prompt again).
    expect(after.data.settings.aiLanguage).toBe('en-US');
    expect(
      (
        await request('/systemSettings', 'admin', 'PUT', {
          aiLanguage: 'fr-FR',
        })
      ).status,
    ).toBe(400);
    const announced: string[] = [];
    service.settingsSaved = (saved) => announced.push(saved.aiLanguage);
    try {
      await request('/systemSettings', 'admin', 'PUT', {
        aiLanguage: 'zh-CN',
      });
      expect(announced).toEqual(['zh-CN']);
    } finally {
      service.settingsSaved = undefined;
      await request('/systemSettings', 'admin', 'PUT', {
        aiLanguage: 'zh-CN',
      });
    }
  });
  it("starts with the currency of the application's language", () => {
    const at = (defaultLocale: string) =>
      new CrmService(database, authorization, undefined, { defaultLocale })
        .defaults.currency;
    expect(at('zh-CN')).toBe('CNY');
    expect(at('ja-JP')).toBe('JPY');
    expect(at('de-DE')).toBe('EUR');
    expect(at('fr-FR')).toBe('EUR');
    expect(at('es-ES')).toBe('EUR');
    // Where the language's own currency is not offered, and in English.
    expect(at('zh-TW')).toBe('USD');
    expect(at('pt-BR')).toBe('USD');
    expect(at('en-US')).toBe('USD');
    expect(at('')).toBe('USD');
  });
  it("writes the AI's work in the application's language until a language is chosen", async () => {
    const chinese = new CrmService(database, authorization, undefined, {
      defaultLocale: 'zh-CN',
    });
    const english = new CrmService(database, authorization, undefined, {
      defaultLocale: 'en-US',
    });
    // A company's own choice stands whatever the application's language.
    expect(
      (
        await request('/systemSettings', 'admin', 'PUT', {
          aiLanguage: 'zh-CN',
        })
      ).status,
    ).toBe(200);
    const chosen = (await service.settings()).aiLanguage;
    expect(chosen).toBe('zh-CN');
    expect((await english.settings()).aiLanguage).toBe(chosen);
    // Before anyone chose, the application's language decides; the row is
    // removed inside a transaction rolled back after.
    const rollback = new Error('rollback');
    await database
      .transaction(async ({ query }) => {
        await query
          .deleteFrom('crmSettings')
          .where('id', '=', 'business')
          .execute();
        expect((await chinese.settings(query)).aiLanguage).toBe('zh-CN');
        expect((await english.settings(query)).aiLanguage).toBe('en-US');
        expect((await service.settings(query)).aiLanguage).toBe('en-US');
        expect(chinese.defaults.aiLanguage).toBe('zh-CN');
        throw rollback;
      })
      .catch((error: unknown) => {
        if (error !== rollback) throw error;
      });
    expect((await service.settings()).aiLanguage).toBe(chosen);
  });
  it("switches the assistant's ask box at the bottom of pages for everyone", async () => {
    const settings = async (id: string) =>
      (
        (await (await request('/workspace', id)).json()) as {
          data: { settings: { assistantDock: unknown } };
        }
      ).data.settings;
    expect((await settings('rep')).assistantDock).toBe(true);
    try {
      expect(
        (
          await request('/systemSettings', 'admin', 'PUT', {
            assistantDock: false,
          })
        ).status,
      ).toBe(200);
      // Every reader of the workspace sees it off.
      expect((await settings('rep')).assistantDock).toBe(false);
      expect(
        (
          await request('/systemSettings', 'admin', 'PUT', {
            assistantDock: 'no',
          })
        ).status,
      ).toBe(400);
      expect(
        (
          await request('/systemSettings', 'rep', 'PUT', {
            assistantDock: true,
          })
        ).status,
      ).toBe(403);
    } finally {
      await request('/systemSettings', 'admin', 'PUT', { assistantDock: true });
    }
  });
  it('allows shared reads, own updates, creator-only manager deletes and admin deletes', async () => {
    const lead = await service.save(actor('rep'), 'leads', {
      name: 'Permission test',
    });
    expect((await request(`/leads/${lead.id}`, 'other')).status).toBe(200);
    expect(
      (
        await request(`/leads/${lead.id}`, 'other', 'PATCH', {
          name: 'Wrong owner',
        })
      ).status,
    ).toBe(404);
    expect((await request(`/leads/${lead.id}`, 'rep', 'DELETE')).status).toBe(
      403,
    );
    expect(
      (
        await request(`/leads/${lead.id}`, 'rep', 'PATCH', {
          name: 'Updated by owner',
        })
      ).status,
    ).toBe(200);
    // A manager deletes only what they created; this lead is the rep's, so
    // for deletion it is out of their scope. An administrator may delete it.
    expect(
      (await request(`/leads/${lead.id}`, 'manager', 'DELETE')).status,
    ).toBe(404);
    expect((await request(`/leads/${lead.id}`, 'admin', 'DELETE')).status).toBe(
      204,
    );
    await expect(
      service.save(actor('rep'), 'leads', {
        name: 'Cannot assign',
        ownerId: 'other',
      }),
    ).rejects.toMatchObject({ code: 'forbidden' });
  });
  it('takes lead-only tasks when a lead is deleted and keeps anchored ones', async () => {
    const lead = await service.save(actor('manager'), 'leads', {
      name: 'Lead with tasks',
    });
    const company = await service.save(actor('manager'), 'companies', {
      name: 'Anchor for kept task',
    });
    const leadOnly = await service.save(actor('manager'), 'tasks', {
      name: 'Lead only',
      dueAt: '2026-09-01T09:00:00.000Z',
      leadId: lead.id,
    });
    // Linked both ways, as a task could be before a task concerned either a
    // lead or a company.
    const anchored = await service.save(actor('manager'), 'tasks', {
      name: 'Also on the company',
      dueAt: '2026-09-01T09:00:00.000Z',
      leadId: lead.id,
    });
    await database
      .query()
      .updateTable('crmTasks')
      .set({ companyId: company.id })
      .where('id', '=', anchored.id)
      .execute();
    await service.remove(actor('manager'), 'leads', toText(lead.id));
    await expect(
      service.get(actor('manager'), 'tasks', toText(leadOnly.id)),
    ).rejects.toMatchObject({ code: 'notFound' });
    // The survivor keeps every other link, so it still satisfies the rule that an
    // task must reference a lead, company or opportunity.
    const kept = await service.get(
      actor('manager'),
      'tasks',
      toText(anchored.id),
    );
    expect(kept.leadId).toBeNull();
    expect(kept.companyId).toBe(company.id);
    await expect(
      service.get(actor('manager'), 'leads', toText(lead.id)),
    ).rejects.toMatchObject({ code: 'notFound' });
  });
  it('deletes a company with only tasks, cascading like a lead, and reports blockers', async () => {
    const company = await service.save(actor('manager'), 'companies', {
      name: 'Company with tasks',
    });
    const lead = await service.save(actor('manager'), 'leads', {
      name: 'Anchor lead',
    });
    const companyOnly = await service.save(actor('manager'), 'tasks', {
      name: 'Company only',
      dueAt: '2026-09-01T09:00:00.000Z',
      companyId: company.id,
    });
    // Linked both ways, as a task could be before a task concerned either a
    // lead or a company.
    const anchored = await service.save(actor('manager'), 'tasks', {
      name: 'Also on a lead',
      dueAt: '2026-09-01T09:00:00.000Z',
      companyId: company.id,
    });
    await database
      .query()
      .updateTable('crmTasks')
      .set({ leadId: lead.id })
      .where('id', '=', anchored.id)
      .execute();
    // Tasks alone do not block, so the detail reports nothing in the way.
    const before = await service.detail(
      actor('manager'),
      'companies',
      toText(company.id),
    );
    expect(before.blockers).toEqual({});
    // A contact does block, and is named in the count.
    const contact = await service.save(actor('manager'), 'contacts', {
      name: 'Blocking contact',
      companyId: company.id,
    });
    const blocked = await service.detail(
      actor('manager'),
      'companies',
      toText(company.id),
    );
    expect(blocked.blockers).toEqual({ contacts: 1 });
    await expect(
      service.remove(actor('manager'), 'companies', toText(company.id)),
    ).rejects.toMatchObject({ code: 'relatedRecords' });
    // A contact deletes directly: it is taken out of the opportunities that
    // list it, and those survive.
    const deal = await service.save(actor('manager'), 'opportunities', {
      name: 'Deal with contact',
      companyId: company.id,
      contacts: [{ contactId: contact.id, role: 'other' }],
    });
    const contactDetail = await service.detail(
      actor('manager'),
      'contacts',
      toText(contact.id),
    );
    expect(contactDetail.blockers).toEqual({});
    expect(contactDetail.unlinks).toEqual({ opportunities: 1 });
    await service.remove(actor('manager'), 'contacts', toText(contact.id));
    expect(
      (await service.get(actor('manager'), 'opportunities', toText(deal.id)))
        .contacts,
    ).toEqual([]);
    // An opportunity's tasks are unlinked, not deleted: a task on
    // a deal always carries the deal's company too, so it keeps an anchor.
    const dealOnly = await service.save(actor('manager'), 'tasks', {
      name: 'Deal only',
      dueAt: '2026-09-02T09:00:00.000Z',
      opportunityId: deal.id,
    });
    await database
      .query()
      .updateTable('crmTasks')
      .set({ opportunityId: deal.id })
      .where('id', '=', anchored.id)
      .execute();
    expect(
      (await service.detail(actor('manager'), 'opportunities', toText(deal.id)))
        .blockers,
    ).toEqual({});
    await service.remove(actor('manager'), 'opportunities', toText(deal.id));
    const unlinked = await service.get(
      actor('manager'),
      'tasks',
      toText(dealOnly.id),
    );
    expect(unlinked.opportunityId).toBeNull();
    expect(unlinked.companyId).toBe(company.id);
    expect(
      (await service.get(actor('manager'), 'tasks', toText(anchored.id)))
        .opportunityId,
    ).toBeNull();
    await service.remove(actor('manager'), 'companies', toText(company.id));
    await expect(
      service.get(actor('manager'), 'tasks', toText(companyOnly.id)),
    ).rejects.toMatchObject({ code: 'notFound' });
    const kept = await service.get(
      actor('manager'),
      'tasks',
      toText(anchored.id),
    );
    expect(kept.companyId).toBeNull();
    expect(kept.leadId).toBe(lead.id);
  });
  it("carries a lead's gender to its contact and keeps a company's annual revenue", async () => {
    const lead = await service.save(actor('rep'), 'leads', {
      name: 'Gendered Person',
      company: 'Revenue Works',
      gender: 'female',
      source: 'exhibition',
    });
    const converted = await convertLead(service, actor('rep'), lead.id, {});
    const contact = await service.get(
      actor('rep'),
      'contacts',
      toText(converted.convertedContactId),
    );
    expect(contact.gender).toBe('female');
    const company = await service.save(
      actor('rep'),
      'companies',
      { annualRevenue: 120000000, currency: 'CNY' },
      toText(converted.convertedCompanyId),
    );
    expect(Number(company.annualRevenue)).toBe(120000000);
    expect(company.currency).toBe('CNY');
  });
  it("carries a lead's annual revenue and its currency to the company", async () => {
    const lead = await service.save(actor('rep'), 'leads', {
      name: 'Revenue Person',
      company: 'Turnover Works',
      annualRevenue: 8500000,
      currency: 'USD',
      source: 'exhibition',
    });
    const converted = await convertLead(service, actor('rep'), lead.id, {});
    const company = await service.get(
      actor('rep'),
      'companies',
      toText(converted.convertedCompanyId),
    );
    expect(Number(company.annualRevenue)).toBe(8500000);
    expect(company.currency).toBe('USD');
  });
  it('saves the values the person changed in the conversion dialog', async () => {
    const lead = await service.save(actor('rep'), 'leads', {
      name: 'Edited Person',
      company: 'Edited Works',
      jobTitle: 'Buyer',
      source: 'exhibition',
    });
    const converted = await convertLead(service, actor('rep'), lead.id, {
      company: { industry: 'manufacturing', website: 'https://edited.test' },
      contact: { jobTitle: 'Purchasing director', phone: '13800000000' },
      createOpportunity: true,
      opportunityName: 'Edited deal',
      amount: 50000,
      opportunity: {
        currency: 'EUR',
        expectedCloseAt: '2026-12-31',
        // Only the currency and the close date are taken from here.
        stage: 'won',
      },
    });
    expect(
      await service.get(
        actor('rep'),
        'companies',
        toText(converted.convertedCompanyId),
      ),
    ).toMatchObject({
      name: 'Edited Works',
      industry: 'manufacturing',
      website: 'https://edited.test',
      source: 'exhibition',
    });
    expect(
      await service.get(
        actor('rep'),
        'contacts',
        toText(converted.convertedContactId),
      ),
    ).toMatchObject({
      name: 'Edited Person',
      jobTitle: 'Purchasing director',
      phone: '13800000000',
    });
    const deal = await service.get(
      actor('rep'),
      'opportunities',
      toText(converted.convertedOpportunityId),
    );
    // A converted lead's deal starts at qualification.
    expect(deal).toMatchObject({ currency: 'EUR', stage: 'qualification' });
    expect(toText(deal.expectedCloseAt).slice(0, 10)).toBe('2026-12-31');
  });
  it('converts atomically, links historical tasks and makes the lead immutable', async () => {
    const lead = await service.save(actor('rep'), 'leads', {
      name: 'Contact A',
      company: 'Company A',
      email: 'a@example.test',
      linkedin: 'linkedin.com/in/contact-a',
    });
    const task = await service.save(actor('rep'), 'tasks', {
      name: 'Intro',
      leadId: lead.id,
      dueAt: '2026-09-09T01:00:00Z',
    });
    // A task still to do is no contact yet; a comment on one made is.
    expect((await service.get(actor('rep'), 'leads', lead.id)).status).toBe(
      'new',
    );
    await service.addComment(actor('rep'), 'leads', lead.id, 'Called them.');
    expect((await service.get(actor('rep'), 'leads', lead.id)).status).toBe(
      'working',
    );
    const before = (await service.list(actor('rep'), 'companies')).total;
    await expect(
      convertLead(service, actor('rep'), lead.id, {
        createOpportunity: true,
        amount: -1,
      }),
    ).rejects.toMatchObject({ code: 'invalidInput' });
    expect((await service.list(actor('rep'), 'companies')).total).toBe(before);
    expect((await service.get(actor('rep'), 'leads', lead.id)).status).toBe(
      'working',
    );
    const converted = await convertLead(service, actor('rep'), lead.id, {
      createOpportunity: true,
      amount: 1200,
    });
    expect(converted.status).toBe('converted');
    // The person's LinkedIn profile goes to the contact the conversion made.
    expect(
      (
        await service.get(
          actor('rep'),
          'contacts',
          toText(converted.convertedContactId),
        )
      ).linkedin,
    ).toBe('linkedin.com/in/contact-a');
    const linked = await service.get(actor('rep'), 'tasks', task.id);
    expect(linked.companyId).toBe(converted.convertedCompanyId);
    expect(linked.opportunityId).toBe(converted.convertedOpportunityId);
    await expect(
      service.save(actor('rep'), 'leads', { name: 'No' }, lead.id),
    ).rejects.toMatchObject({ code: 'convertedReadOnly' });
    await expect(
      service.remove(actor('admin'), 'leads', lead.id),
    ).rejects.toMatchObject({ code: 'convertedReadOnly' });
  });
  it('finds the company, the contact and the open deals a conversion may duplicate', async () => {
    const company = await service.save(actor('rep'), 'companies', {
      name: 'Duplicate Optics',
    });
    // The lead gave no phone or e-mail: its person is found by name at the
    // matching company, not by name alone elsewhere.
    const same = await service.save(actor('rep'), 'contacts', {
      name: 'Wei Zhang',
      companyId: company.id,
    });
    const elsewhere = await service.save(actor('rep'), 'companies', {
      name: 'Unrelated Works',
    });
    await service.save(actor('rep'), 'contacts', {
      name: 'Wei Zhang',
      companyId: elsewhere.id,
    });
    const open = await service.save(actor('rep'), 'opportunities', {
      name: 'Optics rollout',
      companyId: company.id,
      amount: 100,
    });
    await service.save(actor('rep'), 'opportunities', {
      name: 'Optics pilot',
      companyId: company.id,
      amount: 100,
      stage: 'lost',
      lostReason: lostReasons[0],
    });
    const lead = await service.save(actor('rep'), 'leads', {
      name: 'Wei Zhang',
      company: 'Duplicate Optics',
    });
    const preview = await conversionPreview(service, actor('rep'), lead.id);
    expect((preview.companies as CrmRecord[]).map((r) => r.id)).toEqual([
      company.id,
    ]);
    expect((preview.contacts as CrmRecord[]).map((r) => r.id)).toEqual([
      same.id,
    ]);
    expect((preview.opportunities as CrmRecord[]).map((r) => r.id)).toEqual([
      open.id,
    ]);
    // A company the CRM does not know: nothing to link, no deals.
    const fresh = await service.save(actor('rep'), 'leads', {
      name: 'Wei Zhang',
      company: 'Brand New Glass',
    });
    expect(
      await conversionPreview(service, actor('rep'), fresh.id),
    ).toMatchObject({ companies: [], contacts: [], opportunities: [] });
  });
  it('validates opportunity contacts and preserves customer status after reopening', async () => {
    const company = await service.save(actor('rep'), 'companies', {
      name: 'Deal company',
    });
    const other = await service.save(actor('rep'), 'companies', {
      name: 'Other company',
    });
    const contact = await service.save(actor('rep'), 'contacts', {
      name: 'Wrong company',
      companyId: other.id,
    });
    await expect(
      service.save(actor('rep'), 'opportunities', {
        name: 'Bad deal',
        companyId: company.id,
        contacts: [{ contactId: contact.id, role: 'other', primary: true }],
      }),
    ).rejects.toMatchObject({ code: 'companyMismatch' });
    const opportunity = await service.save(actor('rep'), 'opportunities', {
      name: 'Deal',
      companyId: company.id,
      amount: 100,
    });
    await expect(
      service.save(
        actor('rep'),
        'opportunities',
        { stage: 'lost' },
        opportunity.id,
      ),
    ).rejects.toMatchObject({ field: 'lostReason' });
    const won = await service.save(
      actor('rep'),
      'opportunities',
      { stage: 'won' },
      opportunity.id,
    );
    expect(won.closedAt).toBeTruthy();
    expect(
      (await service.get(actor('rep'), 'companies', company.id)).status,
    ).toBe('customer');
    const reopened = await service.save(
      actor('rep'),
      'opportunities',
      { stage: 'negotiation' },
      opportunity.id,
    );
    expect(reopened.closedAt).toBeNull();
    expect(
      (await service.get(actor('rep'), 'companies', company.id)).status,
    ).toBe('customer');
  });
  it('moves a deal to another company without its contacts, and never with tasks', async () => {
    const [from, to] = await Promise.all(
      ['Move from', 'Move to'].map((name) =>
        service.save(actor('rep'), 'companies', { name, source: 'website' }),
      ),
    );
    const contact = await service.save(actor('rep'), 'contacts', {
      name: 'Old company person',
      companyId: from.id,
      gender: 'unknown',
    });
    const deal = await service.save(actor('rep'), 'opportunities', {
      name: 'Moving deal',
      companyId: from.id,
      contacts: [{ contactId: contact.id, role: 'other' }],
    });
    // Its contacts are the old company's people: moving it alone is refused.
    await expect(
      service.save(
        actor('rep'),
        'opportunities',
        { companyId: to.id },
        deal.id,
      ),
    ).rejects.toMatchObject({ code: 'companyMismatch' });
    // Moved together with the contacts taken off, as the page confirms it.
    const moved = await service.save(
      actor('rep'),
      'opportunities',
      { companyId: to.id, contacts: [] },
      deal.id,
    );
    expect(moved.companyId).toBe(to.id);
    expect(moved.contacts).toEqual([]);
    // Once it has tasks it stays with its company, and says so first.
    await service.save(actor('rep'), 'tasks', {
      name: 'Deal call',
      opportunityId: deal.id,
      dueAt: '2026-09-01T02:00:00.000Z',
    });
    await expect(
      service.save(
        actor('rep'),
        'opportunities',
        { companyId: from.id, contacts: [] },
        deal.id,
      ),
    ).rejects.toMatchObject({ code: 'opportunityHasTasks' });
  });
  it('enforces approval ownership, lock states, assigned approver and no self approval', async () => {
    const company = await service.save(actor('rep'), 'companies', {
      name: 'Approval company',
    });
    const opportunity = await service.save(actor('rep'), 'opportunities', {
      name: 'Approval deal',
      companyId: company.id,
    });
    const approval = await service.save(actor('rep'), 'approvals', {
      name: 'Discount request',
      opportunityId: opportunity.id,
      topic: 'discount',
      description: 'Terms',
      approverId: 'manager',
    });
    await service.approvalAction(actor('rep'), approval.id, 'submit');
    // Mine is the approvals I asked for or decide.
    const involving = async (involvedId: string) =>
      (
        await service.list(actor('admin'), 'approvals', {
          involvedId,
          pageSize: 500,
        })
      ).data.map((r) => r.id);
    expect(await involving('rep')).toContain(approval.id);
    expect(await involving('manager')).toContain(approval.id);
    expect(await involving('admin')).not.toContain(approval.id);
    await expect(
      service.save(
        actor('rep'),
        'approvals',
        { description: 'Changed' },
        approval.id,
      ),
    ).rejects.toMatchObject({ code: 'approvalLocked' });
    await expect(
      service.approvalAction(actor('admin'), approval.id, 'approve'),
    ).rejects.toMatchObject({ code: 'forbidden' });
    expect(
      (
        await service.approvalAction(
          actor('manager'),
          approval.id,
          'approve',
          'Approved',
        )
      ).status,
    ).toBe('approved');
    // The decision's comment is told on its entry in the approval's
    // timeline.
    const decision = (
      await service.historyOf(actor('manager'), 'approvals', approval.id)
    ).data.find((entry) => entry.toValue === 'approved');
    expect(decision?.changes).toEqual({ decisionComment: 'Approved' });
    await expect(
      service.approvalAction(actor('manager'), approval.id, 'reject'),
    ).rejects.toMatchObject({ code: 'forbidden' });
    await expect(
      service.save(actor('manager'), 'approvals', {
        name: 'Self',
        opportunityId: opportunity.id,
        topic: 'discount',
        description: 'Terms',
        approverId: 'manager',
      }),
    ).rejects.toMatchObject({ code: 'selfApproval' });
    // Each step's message was queued once it committed.
    const outbox = await database
      .query()
      .selectFrom('crmOutbox')
      .selectAll()
      .where('recordId', '=', approval.id)
      .execute();
    expect(outbox.map((row) => toText(row.event))).toContain('approved');
  });

  // An approval moves by its lifecycle (server/lifecycles/approvals.ts):
  // created and moved through the runtime, each step logged with the
  // version it left the approval at, and an edit leaving its state alone.
  it('moves an approval by its lifecycle, withdrawn and submitted again', async () => {
    const company = await service.save(actor('rep'), 'companies', {
      name: 'Lifecycle company',
    });
    const opportunity = await service.save(actor('rep'), 'opportunities', {
      name: 'Lifecycle deal',
      companyId: company.id,
    });
    const approval = await service.save(actor('rep'), 'approvals', {
      name: 'Payment terms',
      opportunityId: opportunity.id,
      topic: 'paymentTerms',
      approverId: 'manager',
    });
    const id = toText(approval.id);
    const stored = () =>
      database
        .query()
        .selectFrom('crmApprovals')
        .select(['status', 'lifecycleVersion', 'statusChangedAt'])
        .where('id', '=', id)
        .executeTakeFirstOrThrow();
    expect(await stored()).toMatchObject({
      status: 'draft',
      lifecycleVersion: 1,
    });
    expect((await stored()).statusChangedAt).toBeTruthy();
    // An edit of the draft changes no state and moves no version.
    await service.save(actor('rep'), 'approvals', { name: 'Net 60' }, id);
    expect(await stored()).toMatchObject({
      status: 'draft',
      lifecycleVersion: 1,
    });
    await service.approvalAction(actor('rep'), id, 'submit');
    await service.approvalAction(actor('rep'), id, 'withdraw');
    // Withdrawn, it is the applicant's to change and submit again.
    await service.save(actor('rep'), 'approvals', { name: 'Net 45' }, id);
    const again = await service.approvalAction(actor('rep'), id, 'submit');
    expect(again).toMatchObject({ status: 'pending', name: 'Net 45' });
    await service.approvalAction(actor('manager'), id, 'reject', 'Too long');
    expect(await stored()).toMatchObject({
      status: 'rejected',
      lifecycleVersion: 5,
    });
    const log = await database
      .query()
      .selectFrom('lifecycleTransitions')
      .select(['transition', 'from', 'to', 'actorId', 'version'])
      .where('lifecycle', '=', 'approvals')
      .where('recordId', '=', id)
      .orderBy('version')
      .execute();
    expect(log.map((entry) => entry.transition)).toEqual([
      '$create',
      'submit',
      'withdraw',
      'submit',
      'reject',
    ]);
    expect(log.at(-1)).toMatchObject({
      from: 'pending',
      to: 'rejected',
      actorId: 'manager',
      version: 5,
    });
    // An approval from before the lifecycle (version 0, no creation in the
    // log, as the migration leaves it) moves on like any other.
    const older = await service.save(actor('rep'), 'approvals', {
      name: 'Raised before',
      opportunityId: opportunity.id,
      topic: 'discount',
      approverId: 'manager',
    });
    await database
      .query()
      .updateTable('crmApprovals')
      .set({ lifecycleVersion: 0 })
      .where('id', '=', toText(older.id))
      .execute();
    await database
      .query()
      .deleteFrom('lifecycleTransitions')
      .where('recordId', '=', toText(older.id))
      .execute();
    expect(
      (await service.approvalAction(actor('rep'), toText(older.id), 'submit'))
        .status,
    ).toBe('pending');
    // The runtime refuses what the CRM's own checks would have caught, in
    // the CRM's terms, had a caller gone around them.
    await expect(
      service.lifecycles.fire('approvals', id, 'submit', {
        actor: { id: 'rep' },
      }),
    ).rejects.toMatchObject({ code: 'INVALID_STATE' });
  });

  // Who may approve is the approvals lifecycle's approver rule, which an
  // administrator sets (Settings → Approval process): versioned by the
  // runtime's parameter store, read live, and resolved into the users
  // offered as approvers, each active and holding the approve capability.
  // Company signals (company-signals.ts): a company's news found on the
  // web, kept with the search's own pages, put on its timeline and told to
  // the people selling to it; read by who reads the company, decided by who
  // edits it.
  it("lists a company's signals a page at a time, those dismissed last, and reaches one asked for", async () => {
    const company = await service.save(actor('rep'), 'companies', {
      name: 'Paged Signals Co',
    });
    const companyId = toText(company.id);
    const now = Date.now();
    // Five, one a day back from today, the newest dismissed; the oldest
    // found nine days ago, no longer new.
    const ids: string[] = [];
    for (let i = 0; i < 5; i++) {
      const id = randomUUID();
      ids.push(id);
      const at = new Date(now - i * 86_400_000).toISOString();
      await database
        .query()
        .insertInto('crmSignals')
        .values({
          id,
          companyId,
          type: 'business',
          title: `Event ${String(i)}`,
          summary: '',
          occurredOn: at.slice(0, 10),
          sources: JSON.stringify([]),
          eventKey: `paged:${String(i)}`,
          status: i === 0 ? 'dismissed' : 'new',
          runId: null,
          decidedById: null,
          decidedAt: null,
          createdAt:
            i === 4 ? new Date(now - 9 * 86_400_000).toISOString() : at,
          updatedAt: at,
        })
        .execute();
    }
    const first = await signals.of(actor('rep'), companyId, { pageSize: 2 });
    expect(first).toMatchObject({ total: 5, open: 4, fresh: 3, page: 1 });
    // Those not dismissed first, the newest events first.
    expect(first.signals.map((s) => s.title)).toEqual(['Event 1', 'Event 2']);
    const third = await signals.of(actor('rep'), companyId, {
      page: 3,
      pageSize: 2,
    });
    expect(third.signals.map((s) => s.title)).toEqual(['Event 0']);
    // Opened at one further down: the first page reaches it.
    const reaching = await signals.of(actor('rep'), companyId, {
      pageSize: 2,
      until: ids[4],
    });
    expect(reaching.pageSize).toBe(4);
    expect(reaching.signals.at(-1)?.title).toBe('Event 4');
    expect(
      (
        await request(
          `/companies/${companyId}/signals?pageSize=2&page=2`,
          'rep',
        )
      ).status,
    ).toBe(200);
    expect(
      (await request(`/companies/${companyId}/signals?pageSize=500`, 'rep'))
        .status,
    ).toBe(400);
  });

  it("finds a company's signals on the web, keeping only what its search pages back, once", async () => {
    const company = await service.save(actor('rep'), 'companies', {
      name: 'Signal Co',
      website: 'https://signal.example.cn',
    });
    const companyId = toText(company.id);
    const day = (ago: number) =>
      new Date(Date.now() - ago * 86_400_000).toISOString().slice(0, 10);
    const pages = [
      {
        index: 1,
        title: 'Signal Co raises B',
        url: 'https://n.example.cn/b',
        site: 'News',
      },
      {
        index: 2,
        title: 'Signal Co new CTO',
        url: 'https://n.example.cn/cto',
        site: 'News',
      },
    ];
    const events = [
      {
        type: 'funding',
        title: 'Signal Co raised a Series B.',
        summary: 'Led by Example.',
        date: day(3),
        refs: [1],
      },
      // No page behind it: dropped.
      { type: 'hiring', title: 'Hiring 50 people.', date: day(2), refs: [] },
    ];
    // Without a deal or the switch, it is not in the daily check.
    let view = await signals.of(actor('rep'), companyId);
    expect(view).toMatchObject({
      available: true,
      watched: false,
      inDailyCheck: false,
      signals: [],
    });
    expect(
      (await signals.due(new Date(), 100)).map((r) => toText(r.id)),
    ).not.toContain(companyId);
    view = await signals.watch(actor('rep'), companyId, true);
    expect(view).toMatchObject({ watched: true, inDailyCheck: true });
    expect(
      (await signals.due(new Date(), 100)).map((r) => toText(r.id)),
    ).toContain(companyId);

    // Checked now: the answer came back as prose, so it is reshaped without
    // searching, its refs still naming the first answer's pages.
    web.calls = [];
    web.answers.push(
      { text: 'Signal Co raised a Series B [ref_1].', pages },
      { text: JSON.stringify({ events }), pages: [] },
    );
    const { found } = await signals.checkNow(actor('rep'), companyId);
    expect(web.calls).toEqual([{ search: true }, { search: false }]);
    expect(found.map((f) => [f.type, f.sources.map((p) => p.url)])).toEqual([
      ['funding', ['https://n.example.cn/b']],
    ]);
    view = await signals.of(actor('other'), companyId).catch(() => view);
    view = await signals.of(actor('rep'), companyId);
    expect(view.checkedAt).toBeTruthy();
    expect(view.signals.map((s) => s.status)).toEqual(['new']);
    // A line on the company's timeline, from the AI.
    const line = await database
      .query()
      .selectFrom('crmHistory')
      .selectAll()
      .where('recordId', '=', companyId)
      .where('action', '=', 'signal')
      .executeTakeFirstOrThrow();
    expect(toText(line.source)).toBe('ai');
    // Read back whole on the timeline: what was found and where, which are
    // not the company's fields.
    const feed = await service.historyOf(actor('rep'), 'companies', companyId);
    expect(
      feed.data.find((entry) => entry.action === 'signal')?.changes,
    ).toMatchObject({
      type: 'funding',
      title: 'Signal Co raised a Series B.',
      source: { url: 'https://n.example.cn/b' },
    });
    // Checked daily now, so not due again within the week.
    expect(
      (await signals.due(new Date(), 100)).map((r) => toText(r.id)),
    ).not.toContain(companyId);

    // Found again, worded the same: not kept twice; the known one is named
    // to the search.
    web.calls = [];
    web.answers.push({ text: JSON.stringify({ events }), pages });
    expect((await signals.checkNow(actor('rep'), companyId)).found).toEqual([]);
    expect(web.calls).toEqual([{ search: true }]);

    // Dismissed by its editor; a reader who may not edit cannot decide.
    const signalId = view.signals[0]!.id;
    expect(
      (
        await request(`/signals/${signalId}`, 'rep', 'PATCH', {
          status: 'dismissed',
        })
      ).status,
    ).toBe(200);
    expect((await signals.of(actor('rep'), companyId)).signals[0]!.status).toBe(
      'dismissed',
    );
    // Dismissing is the one decision, which can be undone; marking one
    // seen is no longer offered.
    expect(
      (
        await request(`/signals/${signalId}`, 'rep', 'PATCH', {
          status: 'seen',
        })
      ).status,
    ).toBe(400);
    expect(
      (await request(`/signals/${signalId}`, 'rep', 'PATCH', { status: 'new' }))
        .status,
    ).toBe(200);
    expect(
      (await signals.of(actor('rep'), companyId)).signals[0],
    ).toMatchObject({ status: 'new', decidedById: null });
    await request(`/signals/${signalId}`, 'rep', 'PATCH', {
      status: 'dismissed',
    });
    expect((await request(`/signals/${signalId}`)).status).toBe(401);
    expect((await request(`/companies/${companyId}/signals`)).status).toBe(401);
    expect(
      (await request(`/companies/${companyId}/signals`, 'rep')).status,
    ).toBe(200);

    // Without a searching service, checking is refused and the daily pass
    // does nothing.
    web.on = false;
    try {
      expect(
        (await request(`/companies/${companyId}/signals/check`, 'rep', 'POST'))
          .status,
      ).toBe(400);
      expect(await signals.scan()).toMatchObject({
        available: false,
        checked: 0,
      });
    } finally {
      web.on = true;
    }
  });

  it("tells a company's signal to its owner and its open deals' owners", async () => {
    const company = await service.save(actor('manager'), 'companies', {
      name: 'Told Co',
    });
    const companyId = toText(company.id);
    await service
      .save(actor('rep'), 'opportunities', {
        name: 'Told deal',
        companyId,
      })
      .catch(async () =>
        service.save(actor('manager'), 'opportunities', {
          name: 'Told deal',
          companyId,
          ownerId: 'rep',
        }),
      );
    const day = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
    web.answers.push({
      text: JSON.stringify({
        events: [
          {
            type: 'leadership',
            title: 'Told Co named a CIO.',
            date: day,
            refs: [1],
          },
        ],
      }),
      pages: [
        {
          index: 1,
          title: 'CIO',
          url: 'https://n.example.cn/cio',
          site: 'News',
        },
      ],
    });
    // In the daily check by its open deal.
    const due = await signals.due(new Date(), 1000);
    expect(due.map((r) => toText(r.id))).toContain(companyId);
    await signals.checkNow(actor('manager'), companyId);
    const told = await database
      .query()
      .selectFrom('crmOutbox')
      .select(['recipientId', 'event'])
      .where('recordId', '=', companyId)
      .execute();
    expect(told.map((r) => toText(r.event))).toEqual(told.map(() => 'signal'));
    expect(new Set(told.map((r) => toText(r.recipientId)))).toEqual(
      new Set(['manager', 'rep']),
    );
  });

  // A check starts no deal follow-up of its own: the deals' daily pass takes
  // the news (deal-signals.ts). Each check is logged and listed on the Auto
  // follow-up page's Company signals tab.
  it('looks a new company up on the web for its form, saving nothing', async () => {
    const existing = await service.save(actor('rep'), 'companies', {
      name: 'Profile Co',
    });
    const before = (
      await service.list(actor('admin'), 'companies', { pageSize: 1 })
    ).total;
    web.calls = [];
    web.answers.push({
      text: JSON.stringify({
        name: 'Profile Co Ltd',
        website: 'https://profile.example.cn',
        linkedin: 'not a link',
        industry: 'technology',
        employees: '201-500',
        annualRevenue: 50000000,
        currency: 'CNY',
        country: 'CN',
        state: '浙江省',
        city: '杭州',
        description: 'Makes office software for hotel chains.',
        uncertain: ['employees', 'bogus'],
        sources: [2],
      }),
      pages: [
        {
          index: 1,
          title: 'Unrelated',
          url: 'https://n.example.cn/x',
          site: 'News',
        },
        {
          index: 2,
          title: 'About Profile Co',
          url: 'https://profile.example.cn/about',
          site: 'Profile',
        },
      ],
    });
    const response = await request('/companies/capture', 'rep', 'POST', {
      name: 'Profile Co',
      note: 'In Hangzhou',
    });
    expect(response.status).toBe(200);
    const { data } = (await response.json()) as { data: Row };
    expect(web.calls).toEqual([{ search: true }]);
    // Each value of its field's kind; what is not, left out.
    expect(data.input).toEqual({
      name: 'Profile Co Ltd',
      website: 'https://profile.example.cn',
      industry: 'technology',
      employees: '201-500',
      annualRevenue: 50000000,
      currency: 'CNY',
      country: 'CN',
      state: 'CN-33',
      city: '杭州',
      description: 'Makes office software for hotel chains.',
    });
    expect(data.uncertain).toEqual(['employees']);
    expect((data.sources as Row[]).map((p) => p.url)).toEqual([
      'https://profile.example.cn/about',
    ]);
    expect(data.duplicates).toContainEqual({
      id: existing.id,
      name: 'Profile Co',
    });
    // Nothing saved.
    expect(
      (await service.list(actor('admin'), 'companies', { pageSize: 1 })).total,
    ).toBe(before);
    expect(
      (await request('/companies/capture', undefined, 'POST', { name: 'X' }))
        .status,
    ).toBe(401);
    expect(
      (await request('/companies/capture', 'outsider', 'POST', { name: 'X' }))
        .status,
    ).toBe(403);
    // Without a model to search with, it says so.
    web.on = false;
    try {
      await expect(
        signals.profile(actor('rep'), { name: 'Profile Co' }),
      ).rejects.toMatchObject({ code: 'signalsUnavailable' });
    } finally {
      web.on = true;
    }
  });

  it('logs each check and lists them, leaving the deals to their daily pass', async () => {
    const company = await service.save(actor('rep'), 'companies', {
      name: 'Acting Co',
    });
    const companyId = toText(company.id);
    await service.save(actor('rep'), 'opportunities', {
      name: 'Acting deal',
      companyId,
    });
    const day = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
    const answer = (type: string, title: string) => ({
      text: JSON.stringify({
        events: [{ type, title, date: day, refs: [1] }],
      }),
      pages: [
        { index: 1, title, url: `https://n.example.cn/${type}`, site: 'News' },
      ],
    });
    web.answers.push(answer('hiring', 'Acting Co hires 200.'));
    await signals.checkNow(actor('rep'), companyId);
    web.answers.push(answer('leadership', 'Acting Co names a CIO.'));
    await signals.checkNow(actor('rep'), companyId);
    web.answers.push(answer('funding', 'Acting Co raises a Series C.'));
    await signals.checkNow(actor('rep'), companyId);
    // A failed search is logged, its reason kept.
    web.answers.push({ text: '', pages: [] });
    web.calls = [];
    await signals.checkNow(actor('rep'), companyId);
    const checks = await database
      .query()
      .selectFrom('crmSignalChecks')
      .select(['trigger', 'actorId', 'status', 'found', 'followUps'])
      .where('companyId', '=', companyId)
      .orderBy('createdAt')
      .execute();
    expect(
      checks.map((c) => [c.status, Number(c.found), Number(c.followUps)]),
    ).toEqual([
      ['found', 1, 0],
      ['found', 1, 0],
      ['found', 1, 0],
      ['nothing', 0, 0],
    ]);
    expect(
      checks.every((c) => c.trigger === 'asked' && c.actorId === 'rep'),
    ).toBe(true);
    // No follow-up was asked for the deal.
    expect(
      await database
        .query()
        .selectFrom('crmHistory')
        .select('id')
        .where('entity', '=', 'opportunities')
        .where('action', '=', 'ai')
        .where('createdAt', '>=', new Date(Date.now() - 60_000).toISOString())
        .execute()
        .then((rows) => rows.length),
    ).toBe(0);

    // The Auto follow-up page's tab: the checks on the companies the reader
    // reads, the signals found, dismissed and worth acting on as its
    // outcomes.
    const overview = (
      await (await request('/aiAgents/signals?status=found', 'rep')).json()
    ).data as {
      triggers: string[];
      week: Record<string, number>;
      runs: { recordId: string; status: string; summary: string | null }[];
    };
    expect(overview.triggers).toEqual(['daily']);
    expect(overview.week.runs).toBeGreaterThanOrEqual(4);
    expect(overview.week.accepted).toBeGreaterThanOrEqual(3);
    // Hiring is only told: two of the three are worth acting on.
    expect(overview.week.pending).toBeGreaterThanOrEqual(2);
    const mine = overview.runs.filter((r) => r.recordId === companyId);
    expect(mine.map((r) => r.status)).toEqual(['found', 'found', 'found']);
    expect(mine[0]!.summary).toBe('Acting Co raises a Series C.');
    expect((await request('/aiAgents/signals')).status).toBe(401);

    // Switched off by an administrator: the daily pass does nothing.
    expect(
      (
        await request('/aiAgents/signals/switches', 'rep', 'PUT', {
          enabled: false,
        })
      ).status,
    ).toBe(403);
    expect(
      (
        await request('/aiAgents/signals/switches', 'admin', 'PUT', {
          enabled: false,
        })
      ).status,
    ).toBe(200);
    expect(await signals.scan()).toMatchObject({ available: true, checked: 0 });
    await request('/aiAgents/signals/switches', 'admin', 'PUT', {
      enabled: true,
    });

    // Out of its time budget, the pass starts no further company: those
    // left keep their last check's time, so tomorrow's pass takes them
    // first.
    await signals.watch(actor('rep'), companyId, true);
    await database
      .query()
      .updateTable('crmCompanies')
      .set({ signalsCheckedAt: null })
      .where('id', '=', companyId)
      .execute();
    let tick = 0;
    const late = await signals.scan(new Date(), 100, 1000, () => {
      tick += 5000;
      return tick;
    });
    expect(late).toMatchObject({ checked: 0, stopped: true });
    expect(
      (await signals.due(new Date(), 1000)).map((r) => toText(r.id)),
    ).toContain(companyId);
  });

  it('lets an administrator set who may approve, offering and accepting only whom it names', async () => {
    const approverIds = async () =>
      (await service.users(actor('rep')))
        .filter((u) => u.canApprove)
        .map((u) => toText(u.id));
    // The default: the sales managers.
    expect(await approverIds()).toEqual(['manager']);
    expect(await service.approverRuleView(actor('admin'))).toMatchObject({
      roles: ['sales-manager'],
      users: [],
      revision: 0,
      updatedById: null,
      approvers: ['manager'],
    });
    // Settings, so the settings capability: not a sales role's, and not
    // without a session.
    expect((await request('/approverRule')).status).toBe(401);
    expect((await request('/approverRule', 'manager')).status).toBe(403);
    expect(
      (
        await request('/approverRule', 'rep', 'PUT', {
          roles: ['sales-representative'],
          users: [],
          revision: 0,
          requestId: 'rep-try',
        })
      ).status,
    ).toBe(403);
    // What is not a role or a user is refused before anything is saved.
    expect(
      (
        await request('/approverRule', 'admin', 'PUT', {
          roles: ['owner'],
          users: [],
          revision: 0,
          requestId: 'bad-role',
        })
      ).status,
    ).toBe(400);
    await expect(
      service.saveApproverRule(actor('admin'), {
        roles: [],
        users: ['nobody'],
        revision: 0,
        requestId: 'bad-user',
      }),
    ).rejects.toMatchObject({ code: 'invalidInput' });
    // A rule naming only people who may not approve (a salesperson lacks
    // the capability) would leave no request submittable.
    await expect(
      service.saveApproverRule(actor('admin'), {
        roles: ['sales-representative'],
        users: ['rep'],
        revision: 0,
        requestId: 'reps-only',
      }),
    ).rejects.toMatchObject({ code: 'noApprovers', status: 400 });

    const company = await service.save(actor('rep'), 'companies', {
      name: 'Approver rule company',
    });
    const opportunity = await service.save(actor('rep'), 'opportunities', {
      name: 'Approver rule deal',
      companyId: company.id,
    });
    // Submitted to the manager under the default rule.
    const earlier = await service.save(actor('rep'), 'approvals', {
      name: 'Under the default',
      opportunityId: opportunity.id,
      topic: 'discount',
      approverId: 'manager',
    });
    await service.approvalAction(actor('rep'), toText(earlier.id), 'submit');
    try {
      const response = await request('/approverRule', 'admin', 'PUT', {
        roles: [],
        users: ['admin'],
        revision: 0,
        requestId: 'admin-only',
      });
      expect(response.status).toBe(200);
      expect((await response.json()).data).toMatchObject({
        roles: [],
        users: ['admin'],
        revision: 1,
        updatedById: 'admin',
        approvers: ['admin'],
      });
      expect(await approverIds()).toEqual(['admin']);
      // Saved again from the version it was made from: a conflict.
      await expect(
        service.saveApproverRule(actor('admin'), {
          roles: ['sales-manager'],
          users: [],
          revision: 0,
          requestId: 'stale',
        }),
      ).rejects.toMatchObject({ code: 'conflict', status: 409 });
      // The manager is no longer offered nor accepted ...
      await expect(
        service.save(actor('rep'), 'approvals', {
          name: 'To the manager',
          opportunityId: opportunity.id,
          topic: 'discount',
          approverId: 'manager',
        }),
      ).rejects.toMatchObject({ code: 'invalidApprover' });
      // ... but a request already submitted to them keeps its approver.
      expect(
        (
          await service.approvalAction(
            actor('manager'),
            toText(earlier.id),
            'approve',
          )
        ).status,
      ).toBe('approved');
      // A submission under the new rule is logged with the version it ran
      // under.
      const later = await service.save(actor('rep'), 'approvals', {
        name: 'To the administrator',
        opportunityId: opportunity.id,
        topic: 'discount',
        approverId: 'admin',
      });
      await service.approvalAction(actor('rep'), toText(later.id), 'submit');
      const usages = await lifecycleParameterStore(database).listUsage(
        'crm',
        'approvals',
        toText(later.id),
      );
      expect(
        usages.map((usage) => usage.sources.approverRule?.revision),
      ).toContain(1);
    } finally {
      // Back to the default for the tests after this one.
      const { revision } = await service.approverRuleView(actor('admin'));
      await service.saveApproverRule(actor('admin'), {
        roles: ['sales-manager'],
        users: [],
        revision,
        requestId: 'restore',
      });
    }
    expect(await approverIds()).toEqual(['manager']);
  });

  it('refuses an approval for an opportunity the applicant may not edit', async () => {
    const company = await service.save(actor('manager'), 'companies', {
      name: 'Manager company',
    });
    const opportunity = await service.save(actor('manager'), 'opportunities', {
      name: 'Manager deal',
      companyId: company.id,
    });
    await expect(
      service.save(actor('rep'), 'approvals', {
        name: 'Not mine',
        opportunityId: opportunity.id,
        topic: 'discount',
        description: 'Terms',
        approverId: 'manager',
      }),
    ).rejects.toMatchObject({ code: 'approvalOpportunity', status: 403 });
    await expect(
      service.save(actor('rep'), 'approvals', {
        name: 'Missing deal',
        opportunityId: 'no-such-deal',
        topic: 'discount',
        description: 'Terms',
        approverId: 'manager',
      }),
    ).rejects.toMatchObject({ code: 'notFound' });
  });

  it('lets applicants delete their own drafts but never submitted approvals', async () => {
    const opportunity = (
      await service.list(actor('rep'), 'opportunities')
    ).data.find((r) => r.ownerId === 'rep')!;
    const draft = await service.save(actor('rep'), 'approvals', {
      name: 'Delete draft',
      opportunityId: opportunity.id,
      topic: 'discount',
      description: 'Pending discussion',
      approverId: 'manager',
    });
    expect(
      (await request('/approvals/' + draft.id, 'other', 'DELETE')).status,
    ).toBe(404);
    expect(
      (await request('/approvals/' + draft.id, 'rep', 'DELETE')).status,
    ).toBe(204);
    const pending = await service.save(actor('rep'), 'approvals', {
      name: 'Keep pending',
      opportunityId: opportunity.id,
      topic: 'discount',
      description: 'Discussion',
      approverId: 'manager',
    });
    await service.approvalAction(actor('rep'), pending.id, 'submit');
    // A state the request may not change: 400 FAILED_PRECONDITION.
    expect(
      (await request('/approvals/' + pending.id, 'rep', 'DELETE')).status,
    ).toBe(400);
    await service.approvalAction(actor('rep'), pending.id, 'withdraw');
    expect(
      (await request('/approvals/' + pending.id, 'rep', 'DELETE')).status,
    ).toBe(204);
  });
  it('lets only an administrator delete a decided approval', async () => {
    const opportunity = (
      await service.list(actor('rep'), 'opportunities')
    ).data.find((r) => r.ownerId === 'rep')!;
    const rejected = await service.save(actor('rep'), 'approvals', {
      name: 'Mistaken request',
      opportunityId: opportunity.id,
      topic: 'discount',
      description: 'Filed by mistake',
      approverId: 'manager',
    });
    await service.approvalAction(actor('rep'), rejected.id, 'submit');
    await service.approvalAction(actor('manager'), rejected.id, 'reject');
    expect(
      (await service.detail(actor('rep'), 'approvals', rejected.id)).permissions
        .delete,
    ).toBe(false);
    expect(
      (await service.detail(actor('manager'), 'approvals', rejected.id))
        .permissions.delete,
    ).toBe(false);
    expect(
      (await request('/approvals/' + rejected.id, 'rep', 'DELETE')).status,
    ).toBe(400);
    // A manager deletes only what they created, so the record is not theirs.
    expect(
      (await request('/approvals/' + rejected.id, 'manager', 'DELETE')).status,
    ).toBe(404);
    const detail = await service.detail(
      actor('admin'),
      'approvals',
      rejected.id,
    );
    expect(detail.permissions.delete).toBe(true);
    expect(detail.permissions.edit).toBe(false);
    expect(
      (await request('/approvals/' + rejected.id, 'admin', 'DELETE')).status,
    ).toBe(204);
    await expect(
      service.get(actor('admin'), 'approvals', rejected.id),
    ).rejects.toMatchObject({ code: 'notFound' });
  });
  it('does not let a guessed private file ID become a readable attachment', async () => {
    const query = database.query();
    await query
      .insertInto('crmFiles')
      .values({
        id: 'private-file',
        disk: 'local',
        key: 'test',
        filename: 'private.txt',
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .execute();
    await query
      .insertInto('crmFileUploads')
      .values({ id: 'private-file', ownerId: 'other' })
      .execute();
    expect(await service.canReadFile(actor('rep'), 'private-file')).toBe(false);
    expect(
      (await request('/attachments/private-file/content', 'rep')).status,
    ).toBe(404);
    await expect(
      service.save(actor('rep'), 'leads', {
        name: 'Guessed attachment',
        attachments: ['private-file'],
      }),
    ).rejects.toMatchObject({ code: 'notFound' });
    const shared = await service.save(actor('other'), 'leads', {
      name: 'Shared file',
      attachments: ['private-file'],
    });
    expect(await service.canReadFile(actor('rep'), 'private-file')).toBe(true);
    await service.save(actor('rep'), 'leads', {
      name: 'Allowed attachment',
      attachments: ['private-file'],
    });
    expect(shared.attachments).toEqual(['private-file']);
  });
  it('declares the CRM permissions as business operations the permission sets reference', async () => {
    // Every object is a composite with the four operations, listed in the
    // CRM's subsection; the capabilities are a composite of their own.
    const defined = authorization.compositeResources.list();
    for (const entity of entities) {
      const resource = defined.find((d) => d.name === `crm.${entity}`);
      expect(
        authorization.ui.placementOf({
          type: 'composite',
          id: `crm.${entity}`,
        })?.section,
      ).toBe('crm');
      expect(resource?.actions.map((a) => a.name)).toEqual([
        'view',
        'create',
        'edit',
        'delete',
      ]);
      // View, edit and delete offer record scopes; create has none.
      expect(resource!.actions[0]!.dataScopes?.map((d) => d.key)).toEqual([
        'records',
      ]);
      expect(resource!.actions[1]!.dataScopes ?? []).toEqual([]);
    }
    expect(
      defined.find((d) => d.name === 'crm.sales')?.actions.map((a) => a.name),
    ).toEqual(['assign', 'approve', 'export', 'sendWhatsApp']);
    // The provisioned sets grant the operations and the pages, nothing raw.
    const rep = await authorization.permissionSets.get(
      roleKey('sales-representative'),
    );
    const types = new Set(rep!.grants.map((g) => g.resource.type));
    expect([...types].sort()).toEqual(['composite', 'page']);
    expect(
      rep!.grants
        .filter((g) => g.resource.type === 'page')
        .map((g) => g.resource.id)
        .sort(),
    ).toEqual([...crmPages.map((p) => p.name), MAIL_WORKSPACE_PAGE].sort());
    // A salesperson's only capability: replying on WhatsApp.
    expect(
      rep!.grants
        .find((g) => g.resource.id === 'crm.sales')
        ?.actions.map((a) => a.action),
    ).toEqual(['sendWhatsApp']);
    const leads = rep!.grants.find((g) => g.resource.id === 'crm.leads');
    expect(leads?.actions.map((a) => a.action)).toEqual([
      'view',
      'create',
      'edit',
    ]);
    expect(
      (
        leads?.actions.find((a) => a.action === 'edit')?.policy as {
          scopes?: Record<string, unknown>;
        }
      )?.scopes?.records,
    ).toBe('recordsIOwn');
    const manager = await authorization.permissionSets.get(
      roleKey('sales-manager'),
    );
    expect(
      manager!.grants
        .find((g) => g.resource.id === 'crm.sales')
        ?.actions.map((a) => a.action),
    ).toEqual(['assign', 'approve', 'export', 'sendWhatsApp']);
    // The administrator is the plugin's root set: unrestricted by
    // declaration, so it carries no CRM grants and is offered as the role.
    expect((await authorization.permissionSets.get('root'))?.grants).toEqual(
      [],
    );
    expect(authorization.permissionSets.protection('root')?.unrestricted).toBe(
      true,
    );
    expect(
      (await service.users(actor('admin'))).find((u) => u.id === 'admin')
        ?.roles,
    ).toEqual(['system-administrator']);
    // An installation from before, with the administrator as a set of the
    // CRM's own, moves its holders to root once and drops the set.
    await authorization.permissionSets.create({
      key: 'crm-system-administrator',
      title: 'Administrator / 管理员',
      grants: [],
    });
    await authorization.permissionSets.assign({
      permissionSet: 'crm-system-administrator',
      subject: { type: 'user', id: 'legacy-admin' },
    });
    await database
      .query()
      .deleteFrom('crmSettings')
      .where('id', '=', 'authz-root-v1')
      .execute();
    await provisionCrm(authorization, database);
    expect(
      await authorization.permissionSets.get('crm-system-administrator'),
    ).toBeUndefined();
    const moved = (
      await authorization.permissionSets.listAssignments('root')
    ).find((a) => a.subject.id === 'legacy-admin');
    expect(moved).toBeDefined();
    // Leave "admin" the only administrator for the tests that rely on it.
    await authorization.permissionSets.revoke(moved!.id);
    // A set that still grants the former "manage" capability on the
    // operations is renamed to export once.
    const managerSet = (await authorization.permissionSets.get(
      roleKey('sales-manager'),
    ))!;
    await authorization.permissionSets.update(managerSet.key, {
      ...managerSet,
      grants: managerSet.grants.map((g) =>
        g.resource.id === 'crm.sales'
          ? {
              ...g,
              actions: g.actions.map((a) =>
                a.action === 'export' ? { ...a, action: 'manage' } : a,
              ),
            }
          : g,
      ),
    });
    await database
      .query()
      .deleteFrom('crmSettings')
      .where('id', '=', 'authz-export-v1')
      .execute();
    await provisionCrm(authorization, database);
    expect(
      (await authorization.permissionSets.get(roleKey('sales-manager')))!.grants
        .find((g) => g.resource.id === 'crm.sales')
        ?.actions.map((a) => a.action),
    ).toEqual(['assign', 'approve', 'export', 'sendWhatsApp']);
    // Sets provisioned before replying on WhatsApp get the capability once:
    // added to a manager's operations grant, and a salesperson's own.
    for (const role of ['sales-manager', 'sales-representative']) {
      const set = (await authorization.permissionSets.get(roleKey(role)))!;
      await authorization.permissionSets.update(set.key, {
        ...set,
        grants: set.grants.flatMap((g) => {
          if (g.resource.id !== 'crm.sales') return [g];
          const kept = g.actions.filter((a) => a.action !== 'sendWhatsApp');
          return kept.length ? [{ ...g, actions: kept }] : [];
        }),
      });
    }
    await database
      .query()
      .deleteFrom('crmSettings')
      .where('id', '=', 'crm-whatsapp-send-v1')
      .execute();
    await provisionCrm(authorization, database);
    for (const [role, actions] of [
      ['sales-manager', ['assign', 'approve', 'export', 'sendWhatsApp']],
      ['sales-representative', ['sendWhatsApp']],
    ] as const)
      expect(
        (await authorization.permissionSets.get(roleKey(role)))!.grants
          .find((g) => g.resource.id === 'crm.sales')
          ?.actions.map((a) => a.action),
      ).toEqual(actions);
    // A set provisioned before the operations existed is translated into
    // them once, keeping its scopes; grants the CRM does not own stay.
    const legacy = translateLegacyGrants([
      collectionGrant('crmLeads', {
        read: { fields: '*', recordAccess: ['allRecords'] },
        create: { fields: '*' },
        update: { fields: '*', recordAccess: ['recordsIOwn'] },
      }),
      collectionGrant('crmApprovals', {
        read: { fields: '*', recordAccess: ['allRecords'] },
        delete: { recordAccess: ['recordsICreated'] },
      }),
      { resource: { type: 'page', id: '*' }, actions: [{ action: 'access' }] },
      {
        resource: { type: 'crm', id: 'sales' },
        actions: [
          { action: 'assign' },
          { action: 'approve' },
          { action: 'manage' },
        ],
      },
      {
        resource: { type: 'settings', id: '*' },
        actions: [{ action: 'read' }],
      },
    ]);
    expect(legacy).toEqual([
      ...crmPages.map((p) => pageGrant(p.name)),
      entityGrant('leads', {
        view: { records: 'allRecords' },
        create: {},
        edit: { records: 'recordsIOwn' },
      }),
      entityGrant('approvals', {
        view: { records: 'allRecords' },
        delete: { records: 'recordsICreated' },
      }),
      salesGrant('assign', 'approve', 'export'),
      {
        resource: { type: 'settings', id: '*' },
        actions: [{ action: 'read' }],
      },
    ]);
    // Already translated grants are left alone.
    expect(translateLegacyGrants(legacy!)).toBeUndefined();
    // A set stored while business operations were the type `resource` is
    // rewritten once into `composite` grants with the same ids, actions and
    // record scopes, which the new core reads again.
    const current = (await authorization.permissionSets.get(
      roleKey('sales-representative'),
    ))!;
    await authorization.permissionSets.update(current.key, {
      ...current,
      grants: current.grants.map((g) =>
        g.resource.type === 'composite'
          ? {
              resource: { type: 'resource', id: g.resource.id },
              actions: g.actions.map(({ action, policy }) => ({
                action,
                policy: {
                  type: 'resource',
                  ...(policy as { scopes?: Record<string, unknown> })?.scopes,
                },
              })),
            }
          : g,
      ),
    });
    await database
      .query()
      .deleteFrom('crmSettings')
      .where('id', '=', 'authz-composite-v1')
      .execute();
    await provisionCrm(authorization, database);
    expect(
      (await authorization.permissionSets.get(roleKey('sales-representative')))!
        .grants,
    ).toEqual(current.grants);
    expect(
      await actor('rep').scope.can({
        resource: { type: 'composite', id: 'crm.leads' },
        action: 'create',
      }),
    ).toBe(true);
  });
  it('creates the sales sets once at installation and never restores one at boot', async () => {
    // The seed wrote both sets as the declarations build them, titles and
    // grants included.
    for (const role of ['sales-representative', 'sales-manager']) {
      const set = (await authorization.permissionSets.get(roleKey(role)))!;
      const declared = crmPermissionSet(role);
      expect(set.title).toEqual(declared.title);
      expect(set.grants).toEqual(declared.grants);
    }
    // Run again over existing sets, it leaves an administrator's edit alone.
    const rep = (await authorization.permissionSets.get(
      roleKey('sales-representative'),
    ))!;
    const edited = rep.grants.filter(
      (g) => !(g.resource.type === 'page' && g.resource.id === 'crm-decisions'),
    );
    await authorization.permissionSets.update(rep.key, {
      ...rep,
      grants: edited,
    });
    await runSalesSetsSeed();
    expect((await authorization.permissionSets.get(rep.key))!.grants).toEqual(
      edited,
    );
    // A set an administrator deleted is not brought back by boot.
    const manager = (await authorization.permissionSets.get(
      roleKey('sales-manager'),
    ))!;
    const holders = await authorization.permissionSets.listAssignments(
      manager.key,
    );
    for (const holder of holders)
      await authorization.permissionSets.revoke(holder.id);
    await authorization.permissionSets.delete(manager.key);
    await provisionCrm(authorization, database);
    expect(await authorization.permissionSets.get(manager.key)).toBeUndefined();
    // Put both back as they were for the tests that follow.
    await authorization.permissionSets.update(rep.key, rep);
    await runSalesSetsSeed();
    for (const holder of holders)
      await authorization.permissionSets.assign({
        permissionSet: manager.key,
        subject: holder.subject,
      });
  });

  it('searches every kind the reader may read, word by word, in the global search', async () => {
    const lead = await service.save(actor('rep'), 'leads', {
      name: 'Zhou Searchable',
      company: 'Orbit Kitchen Supplies',
      email: 'zhou@orbit-kitchen.test',
    });
    const company = await service.save(actor('rep'), 'companies', {
      name: 'Orbit Kitchen Group',
      ownerId: 'rep',
    });
    expect((await request('/search?q=orbit')).status).toBe(401);
    expect((await request('/search?q=', 'rep')).status).toBe(400);
    const body = (await (
      await request('/search?q=kitchen%20orbit', 'rep')
    ).json()) as {
      data: { entity: string; total: number; rows: { id: string }[] }[];
    };
    // Words in any order; grouped by kind in the search's order.
    expect(body.data.map((group) => group.entity)).toEqual([
      'leads',
      'companies',
    ]);
    expect(body.data[0]?.rows.map((row) => row.id)).toEqual([lead.id]);
    expect(body.data[1]?.rows.map((row) => row.id)).toEqual([company.id]);
    // A word must match: one that matches nothing empties the result.
    expect(
      (
        (await (await request('/search?q=orbit%20nowhere', 'rep')).json()) as {
          data: unknown[];
        }
      ).data,
    ).toEqual([]);
    // The LIKE wildcards are no wildcards: "%" matches nothing by itself.
    expect(
      (
        (await (await request('/search?q=%25', 'rep')).json()) as {
          data: unknown[];
        }
      ).data,
    ).toEqual([]);
    // A reader without the CRM's lists is refused nothing and finds nothing.
    const outsider = await request('/search?q=orbit', 'outsider');
    if (outsider.status === 200)
      expect(((await outsider.json()) as { data: unknown[] }).data).toEqual([]);
    else expect(outsider.status).toBe(403);
  });

  it('enforces field permissions in records, history, export, search and updates', async () => {
    const readable = fieldsFor('leads').filter(
      (field) => !['email', 'message', 'attachments'].includes(field),
    );
    await authorization.permissionSets.create({
      key: 'limited',
      grants: [
        collectionGrant('crmLeads', {
          read: { fields: readable, recordAccess: ['allRecords'] },
          update: { fields: ['name'], recordAccess: ['allRecords'] },
        }),
      ],
    });
    await authorization.permissionSets.assign({
      permissionSet: 'limited',
      subject: { type: 'user', id: 'restricted' },
    });
    const record = await service.save(actor('rep'), 'leads', {
      name: 'Restricted sample',
      email: 'secret-canary@example.test',
      message: 'Hidden comment',
    });
    const read = await service.get(actor('restricted'), 'leads', record.id);
    expect(read.email).toBeUndefined();
    expect(read.message).toBeUndefined();
    expect(
      (
        await service.list(actor('restricted'), 'leads', {
          search: 'secret-canary',
        })
      ).total,
    ).toBe(0);
    expect(
      JSON.stringify(
        await request('/leads?search=secret-canary', 'restricted').then((r) =>
          r.json(),
        ),
      ),
    ).not.toContain('secret-canary');
    // Export is for managers and administrators only.
    expect((await request('/leads/export', 'rep')).status).toBe(403);
    expect((await request('/leads/export', 'manager')).status).toBe(200);
    await expect(
      service.save(
        actor('restricted'),
        'leads',
        { email: 'leak@example.test' },
        record.id,
      ),
    ).rejects.toMatchObject({ code: 'forbidden' });
    expect(
      (
        await service.save(
          actor('restricted'),
          'leads',
          { name: 'Permitted change' },
          record.id,
        )
      ).name,
    ).toBe('Permitted change');
    expect((await service.get(actor('rep'), 'leads', record.id)).email).toBe(
      'secret-canary@example.test',
    );
    expect(await service.canReadFile(actor('restricted'), 'private-file')).toBe(
      false,
    );
  });
  it('keeps a field within what its column holds', async () => {
    const save = (input: Record<string, unknown>) =>
      service.save(actor('rep'), 'leads', {
        name: 'Limit lead',
        source: 'website',
        ...input,
      });
    // A single-line value fits the 255-character column on any database.
    expect((await save({ company: 'x'.repeat(255) })).company).toHaveLength(
      255,
    );
    await expect(save({ company: 'x'.repeat(256) })).rejects.toMatchObject({
      code: 'invalidInput',
      field: 'company',
    });
    // A long text takes up to 30,000 characters.
    expect((await save({ message: 'x'.repeat(30000) })).message).toHaveLength(
      30000,
    );
    await expect(save({ message: 'x'.repeat(30001) })).rejects.toMatchObject({
      code: 'invalidInput',
      field: 'message',
    });
  });
  it('sorts a list by a column the reader may read, by what the page shows', async () => {
    const leads = (sort: string, page = 1, pageSize = 10) =>
      service
        .list(actor('rep'), 'leads', {
          search: 'Sortcase',
          sort,
          page,
          pageSize,
        })
        .then((result) => result.data.map((lead) => lead.name));
    for (const [name, source, company] of [
      ['Sortcase b', 'partner', 'Beta'],
      ['Sortcase A', 'outbound', ''],
      ['Sortcase c', 'website', 'alpha'],
      ['Sortcase 10', 'exhibition', 'Gamma'],
    ])
      await service.save(actor('rep'), 'leads', { name, source, company });
    // Text by the reader's language, numbers within it numerically.
    expect(await leads('name')).toEqual([
      'Sortcase 10',
      'Sortcase A',
      'Sortcase b',
      'Sortcase c',
    ]);
    expect(await leads('-name')).toEqual([
      'Sortcase c',
      'Sortcase b',
      'Sortcase A',
      'Sortcase 10',
    ]);
    // An option field in the order its options are defined, and pages cut
    // from that order.
    expect(await leads('source')).toEqual([
      'Sortcase c',
      'Sortcase 10',
      'Sortcase b',
      'Sortcase A',
    ]);
    expect(await leads('-source', 2, 2)).toEqual(['Sortcase 10', 'Sortcase c']);
    // A blank sorts last in either direction.
    expect(await leads('company')).toEqual([
      'Sortcase c',
      'Sortcase b',
      'Sortcase 10',
      'Sortcase A',
    ]);
    expect(await leads('-company')).toEqual([
      'Sortcase 10',
      'Sortcase b',
      'Sortcase c',
      'Sortcase A',
    ]);
    // A relation by the name it shows rather than its id.
    const zeta = await service.save(actor('rep'), 'companies', {
      name: 'Sortcase Zeta',
      source: 'website',
    });
    const alpha = await service.save(actor('rep'), 'companies', {
      name: 'Sortcase Alpha',
      source: 'website',
    });
    for (const [name, companyId] of [
      ['Sortcase at Zeta', zeta.id],
      ['Sortcase at Alpha', alpha.id],
    ])
      await service.save(actor('rep'), 'contacts', {
        name,
        companyId,
        gender: 'unknown',
      });
    expect(
      (
        await service.list(actor('rep'), 'contacts', {
          search: 'Sortcase',
          sort: 'companyId',
        })
      ).data.map((contact) => contact.name),
    ).toEqual(['Sortcase at Alpha', 'Sortcase at Zeta']);
    // A column the reader may not read, or no column at all, is refused:
    // its order would reveal its values.
    for (const [user, sort] of [
      ['restricted', 'email'],
      ['rep', 'password'],
    ])
      await expect(
        service.list(actor(user), 'leads', { sort }),
      ).rejects.toMatchObject({ code: 'invalidInput' });
    expect((await request('/leads?orderBy=-email', 'restricted')).status).toBe(
      400,
    );
  });
  it('lists tasks starting at the same time with the one created later first', async () => {
    const lead = await service.save(actor('rep'), 'leads', {
      name: 'Tie lead',
      source: 'website',
    });
    const save = (name: string, dueAt: string) =>
      service.save(actor('rep'), 'tasks', {
        name,
        leadId: lead.id,
        dueAt,
      });
    const earlier = await save('Tie earlier', '2026-11-02T02:00:00Z');
    const first = await save('Tie first created', '2026-11-03T02:00:00Z');
    const second = await save('Tie second created', '2026-11-03T02:00:00Z');
    // Created a minute apart, whatever the clock's resolution.
    for (const [record, minutesAgo] of [
      [earlier, 3],
      [first, 2],
      [second, 1],
    ] as const)
      await database
        .query()
        .updateTable('crmTasks')
        .set({
          createdAt: new Date(Date.now() - minutesAgo * 60_000).toISOString(),
        })
        .where('id', '=', record.id)
        .execute();
    expect(
      (
        await service.list(actor('rep'), 'tasks', {
          leadId: lead.id,
          sort: '-dueAt',
        })
      ).data.map((task) => task.name),
    ).toEqual(['Tie second created', 'Tie first created', 'Tie earlier']);
  });
  it('computes statistics with real money, dates, status history, pagination and contact links', async () => {
    const company = await service.save(actor('rep'), 'companies', {
      name: 'Statistics company',
    });
    const contact = await service.save(actor('rep'), 'contacts', {
      name: 'Statistics contact',
      companyId: company.id,
    });
    const opportunity = await service.save(actor('rep'), 'opportunities', {
      name: 'Statistics opportunity',
      companyId: company.id,
      amount: 1000,
      currency: 'CNY',
      contacts: [{ contactId: contact.id, role: 'other', primary: true }],
    });
    const planned = await service.save(actor('other'), 'tasks', {
      name: 'Colleague next meeting',
      companyId: company.id,
      opportunityId: opportunity.id,
      dueAt: new Date(Date.now() + 86400000).toISOString(),
      internalParticipants: ['rep'],
    });
    // "The ones I take part in" finds it as the column stores it; a
    // colleague who does not take part does not.
    const taking = async (participantId: string) =>
      (
        await service.list(actor('manager'), 'tasks', {
          participantId,
          pageSize: 500,
        })
      ).data.map((r) => r.id);
    expect(await taking('rep')).toContain(planned.id);
    expect(await taking('manager')).not.toContain(planned.id);
    expect(
      (
        await service.list(actor('rep'), 'tasks', {
          involvedId: 'rep',
          pageSize: 500,
        })
      ).data.map((r) => r.id),
    ).toContain(planned.id);
    expect(
      (
        await service.list(actor('rep'), 'opportunities', {
          contactId: contact.id,
        })
      ).data.map((r) => r.id),
    ).toContain(opportunity.id);
    // The workspace counts risks with the list pages' rules and lists the
    // reader's own planned tasks.
    const board = await dashboard(service, actor('rep'), {});
    expect(board.attention).toMatchObject({ overdueOpportunities: 0 });
    expect(board.business).toMatchObject({ pipeline: { CNY: 1000 } });
    expect((board.today as { total: number }).total).toBe(0);
    expect(
      (board.funnel as { stage: string; count: number }[])[0],
    ).toMatchObject({ stage: 'contact' });
    // Each source's conversion rate follows the overall one: converted over
    // that source's leads that are not invalid; in the reader's own scope,
    // of the reader's own leads.
    for (const row of board.sources as {
      source: string;
      converted: number;
      conversionRate: number | null;
    }[]) {
      const { data: fromSource } = await service.list(actor('rep'), 'leads', {
        source: row.source,
        ownerId: 'rep',
        pageSize: 500,
      });
      const eligible = fromSource.filter((r) => r.status !== 'invalid').length;
      expect(row.conversionRate).toBe(
        eligible ? row.converted / eligible : null,
      );
    }
    const stats = await statistics(service, actor('rep'), 'opportunities', {
      search: 'Statistics opportunity',
    });
    expect(stats.metrics).toMatchObject({
      pipeline: { CNY: 1000 },
      weighted: { CNY: 100 },
      open: 1,
    });
    // Stalled as a lead is: a deal with something planned ahead is not;
    // once nothing is planned and it has gone without contact for the
    // leads' stale days, it is, and the overview counts it.
    expect(stats.metrics).toMatchObject({ stale: 0 });
    await service.save(
      actor('other'),
      'tasks',
      { status: 'cancelled' },
      planned.id,
    );
    await service.database
      .query()
      .updateTable('crmOpportunities')
      .set({ createdAt: new Date(Date.now() - 60 * 86400000).toISOString() })
      .where('id', '=', opportunity.id)
      .execute();
    const stalled = await statistics(service, actor('rep'), 'opportunities', {
      search: 'Statistics opportunity',
    });
    expect(stalled.metrics).toMatchObject({ stale: 1 });
    expect(stalled.members?.stale).toEqual([opportunity.id]);
    expect(
      (await dashboard(service, actor('rep'), {})).attention,
    ).toMatchObject({ staleOpportunities: 1 });
    await service.save(
      actor('rep'),
      'opportunities',
      { stage: 'won' },
      opportunity.id,
    );
    const companies = await statistics(service, actor('rep'), 'companies', {
      search: 'Statistics company',
    });
    expect(companies.metrics).toMatchObject({
      customers: 1,
      churnedThisMonth: 0,
    });
    await service.save(
      actor('rep'),
      'companies',
      { status: 'churned', churnReason: 'price' },
      company.id,
    );
    expect(
      (
        await statistics(service, actor('rep'), 'companies', {
          search: 'Statistics company',
        })
      ).metrics,
    ).toMatchObject({ customers: 0, churnedThisMonth: 1 });
    const contacts = await statistics(service, actor('rep'), 'contacts', {
      companyId: company.id,
    });
    expect(contacts.metrics).toMatchObject({
      inactiveContacts: 0,
      missingContact: 1,
    });
    expect(contacts.members).toMatchObject({ inactiveContacts: [] });
    const first = await service.list(actor('rep'), 'leads', { pageSize: 1 });
    const second = await service.list(actor('rep'), 'leads', {
      pageSize: 1,
      page: 2,
    });
    expect(first.total).toBeGreaterThan(1);
    expect(first.data[0].id).not.toBe(second.data[0].id);
    expect(planned.status).toBe('open');
  });

  it('delivers deduplicated reminders in the recipient language and checks current visibility', async () => {
    await service.rememberLocale(actor('rep'));
    await service.rememberLocale({ ...actor('rep'), locale: 'zh-CN' });
    const lead = await service.save(actor('rep'), 'leads', {
      name: '提醒测试',
      company: '提醒公司',
    });
    const meeting = await service.save(actor('rep'), 'tasks', {
      name: '即将开始的会议',
      leadId: lead.id,
      dueAt: new Date(Date.now() + 60000).toISOString(),
    });
    const send = vi.fn().mockResolvedValue({ notificationId: 'test-delivery' });
    const container = new ServiceContainer();
    // The scan queues a reminder per recipient through this service.
    const reminding = new CrmService(database, authorization);
    container.instance(crmToken, reminding);
    container.instance(notificationServiceToken, {
      send,
    } as unknown as ReturnType<
      typeof container.resolve<typeof notificationServiceToken>
    >);
    const runtime = new I18nRuntime({
      defaultLocale: 'en-US',
      locales: ['en-US', 'zh-CN'],
    });
    runtime.registry.register('crm-notifications', notificationLocales);
    await runtime.init();
    container.instance(i18nToken, runtime);
    const provider = new CrmProvider({
      container,
      publicBasePath: '/test',
    } as Application);
    const scan = Reflect.get(provider, 'scan') as () => Promise<void>;
    await scan.call(provider);
    // One complete message per send, keyed by the in-app Channel's name.
    type Sent = {
      messages: Record<
        string,
        {
          to: string;
          title: string;
          body: string;
          target: { type: string; path: string };
        }
      >;
    };
    const inbox = (call: unknown[]) =>
      (call[0] as Sent).messages[CRM_INBOX_CHANNEL]!;
    const delivered = send.mock.calls
      .map(inbox)
      .filter((message) => message.target.path.endsWith(meeting.id));
    expect(delivered).toHaveLength(1);
    expect(delivered[0]).toMatchObject({
      to: 'rep',
      title: '任务时间快到了',
      body: expect.stringContaining('即将开始的会议'),
      // A route without the deployment prefix, which the router adds.
      target: { type: 'route', path: `/tasks/${meeting.id}` },
    });
    // A lead is named by person and company, as the pages name it.
    await service.enqueue(
      database.query(),
      actor('rep'),
      'leads',
      lead,
      'manager',
      'assigned',
      'lead-title-check',
    );
    await scan.call(provider);
    const leadMessage = send.mock.calls
      .map(inbox)
      .find((message) => message.body.includes('提醒测试'));
    expect(leadMessage?.body).toContain('提醒测试 / 提醒公司');
    const count = send.mock.calls.length;
    await scan.call(provider);
    expect(send).toHaveBeenCalledTimes(count);
    // Every scan asked for the same reminder by the same key, which was
    // queued once.
    expect(
      (
        await database
          .query()
          .selectFrom('crmOutbox')
          .select('id')
          .where('recordId', '=', meeting.id)
          .where('event', '=', 'starting')
          .execute()
      ).map((row) => toText(row.id)),
    ).toEqual([`task:${toText(meeting.id)}:${toText(meeting.dueAt)}:rep`]);
    await service.enqueue(
      database.query(),
      actor('rep'),
      'leads',
      lead,
      'outsider',
      'updated',
      'unpermitted-recipient',
    );
    await scan.call(provider);
    expect(send).toHaveBeenCalledTimes(count);
  });
  it('rolls back every row in a failed CSV import', async () => {
    const response = await request('/leads/import', 'rep', 'POST', {
      rows: [{ name: 'Rollback sentinel' }, { name: '' }],
    });
    expect(response.status).toBe(400);
    expect(
      (
        await service.list(actor('rep'), 'leads', {
          search: 'Rollback sentinel',
        })
      ).total,
    ).toBe(0);
  });
  it('records what an update changed with the values it replaced', async () => {
    const lead = await service.save(actor('rep'), 'leads', {
      name: 'History lead',
      company: 'Before company',
      jobTitle: 'Buyer',
    });
    const id = toText(lead.id);
    // The form resends unchanged fields; only real changes are recorded.
    await service.save(
      actor('rep'),
      'leads',
      { name: 'History lead', company: 'After company', jobTitle: 'Buyer' },
      id,
    );
    const { data } = await service.historyOf(actor('rep'), 'leads', id);
    const update = data.find((e) => e.action === 'updated')!;
    expect(update.changes).toEqual({ company: 'After company' });
    expect(update.previous).toEqual({ company: 'Before company' });
    // A creation has nothing before it.
    expect(data.find((e) => e.action === 'created')?.previous).toBeNull();
    // A save that changes nothing adds no entry.
    await service.save(
      actor('rep'),
      'leads',
      { name: 'History lead', company: 'After company' },
      id,
    );
    expect(
      (await service.historyOf(actor('rep'), 'leads', id)).data,
    ).toHaveLength(data.length);
  });
  it('folds the mail from before a record existed into one entry at the end of its timeline', async () => {
    const lead = await service.save(actor('rep'), 'leads', {
      name: 'Mail history lead',
    });
    const id = toText(lead.id);
    const born = Date.parse(toText(lead.createdAt));
    const mail = (key: string, offsetMs: number): Record<string, unknown> => {
      const at = new Date(born + offsetMs).toISOString();
      return {
        id: `mail-${key}`,
        entity: 'leads',
        recordId: id,
        actorId: 'rep',
        action: 'mail',
        source: 'mail',
        changes: JSON.stringify({ subject: key, count: 1 }),
        sourceKey: `box:${key}`,
        occurredAt: at,
        createdAt: at,
      };
    };
    await database
      .query()
      .insertInto('crmHistory')
      .values([
        mail('older', -7 * 86_400_000),
        mail('old', -3_600_000),
        mail('after', 60_000),
      ])
      .execute();
    const { data, total } = await service.historyOf(actor('rep'), 'leads', id);
    // The mail after the record reads as its own entry; the two before it
    // are one entry, last, newest first inside.
    expect(data.map((entry) => entry.action)).toEqual([
      'mail',
      'created',
      'mailBefore',
    ]);
    expect(total).toBe(3);
    // It says how many, the Mail tab listing them; its time is the latest's.
    expect(data[2].changes).toEqual({ count: 2 });
    expect(data[2].createdAt).toBe(
      new Date(Date.parse(toText(lead.createdAt)) - 3_600_000).toISOString(),
    );
    // Paged, it comes on the page where the list ends, and only there.
    const first = await service.historyOf(actor('rep'), 'leads', id, {
      pageSize: 2,
    });
    expect(first.data.map((entry) => entry.action)).toEqual([
      'mail',
      'created',
    ]);
    const second = await service.historyOf(actor('rep'), 'leads', id, {
      page: 2,
      pageSize: 2,
    });
    expect(second.data.map((entry) => entry.action)).toEqual(['mailBefore']);
    // The comments alone carry none of it.
    expect(
      (
        await service.historyOf(actor('rep'), 'leads', id, {
          action: 'comment',
        })
      ).data,
    ).toEqual([]);
    // Its mail goes, so the mail timeline's tests read only their own.
    await database
      .query()
      .deleteFrom('crmHistory')
      .where('id', 'in', ['mail-older', 'mail-old', 'mail-after'])
      .execute();
  });
  it("summarizes records by field and period within the reader's scope, per currency", async () => {
    const company = await service.save(actor('rep'), 'companies', {
      name: 'Summary company',
    });
    for (const [name, stage, amount, currency, expectedCloseAt] of [
      ['Summary A', 'contact', 100, 'CNY', '2026-07-15'],
      ['Summary B', 'contact', 50, 'CNY', '2026-08-01'],
      ['Summary C', 'qualification', 30, 'USD', '2026-08-20'],
    ] as const)
      await service.save(actor('rep'), 'opportunities', {
        name,
        companyId: company.id,
        stage,
        amount,
        currency,
        expectedCloseAt,
      });
    const byStage = await service.summarize(
      actor('rep'),
      'opportunities',
      { companyId: toText(company.id) },
      { groupBy: 'stage', measures: ['amount'] },
    );
    expect(byStage.total).toBe(3);
    expect(byStage.truncated).toBe(false);
    // Largest group first; amounts are never added across currencies.
    expect(byStage.groups).toEqual([
      {
        key: 'contact',
        count: 2,
        measures: [
          {
            field: 'amount',
            currency: 'CNY',
            sum: 150,
            average: 75,
            min: 50,
            max: 100,
            counted: 2,
          },
        ],
      },
      {
        key: 'qualification',
        count: 1,
        measures: [
          {
            field: 'amount',
            currency: 'USD',
            sum: 30,
            average: 30,
            min: 30,
            max: 30,
            counted: 1,
          },
        ],
      },
    ]);
    expect(byStage.overall.map((m) => [m.currency, m.sum])).toEqual([
      ['CNY', 150],
      ['USD', 30],
    ]);
    // A date groups by period, in time order.
    const byMonth = await service.summarize(
      actor('rep'),
      'opportunities',
      { companyId: toText(company.id) },
      { groupBy: 'expectedCloseAt', period: 'month' },
    );
    expect(byMonth.groups.map((g) => [g.key, g.count])).toEqual([
      ['2026-07', 1],
      ['2026-08', 2],
    ]);
    expect(
      (
        await service.summarize(
          actor('rep'),
          'opportunities',
          { companyId: toText(company.id) },
          { groupBy: 'expectedCloseAt', period: 'quarter' },
        )
      ).groups.map((g) => g.key),
    ).toEqual(['2026-Q3']);
    // Free text cannot be a group, and only numbers add up.
    await expect(
      service.summarize(actor('rep'), 'opportunities', {}, { groupBy: 'name' }),
    ).rejects.toMatchObject({ code: 'invalidInput', field: 'groupBy' });
    await expect(
      service.summarize(
        actor('rep'),
        'opportunities',
        {},
        { measures: ['stage'] },
      ),
    ).rejects.toMatchObject({ code: 'invalidInput', field: 'measures' });
    // Someone without read access gets no numbers either.
    await expect(
      service.summarize(actor('outsider'), 'opportunities', {}, {}),
    ).rejects.toMatchObject({ code: 'forbidden' });
  });
  it('exposes the CRM roles per user to the Users page and keeps the last administrator', async () => {
    const scope = createCrmUserRoleScope(authorization);
    const connection = database.connection();
    expect((await scope.options()).map((o) => o.value)).toEqual([
      'crm-sales-representative',
      'crm-sales-manager',
      'root',
    ]);
    expect(await scope.get('rep', connection)).toEqual([
      'crm-sales-representative',
    ]);
    expect(await scope.findUserIds('crm-sales-manager', connection)).toEqual([
      'manager',
    ]);
    // The chosen roles replace the held ones; a user may hold several, and
    // their grants add up.
    await scope.replace('other', 'crm-sales-manager', connection);
    expect(await scope.get('other', connection)).toEqual(['crm-sales-manager']);
    await scope.replace(
      'other',
      ['crm-sales-manager', 'crm-sales-representative'],
      connection,
    );
    expect(await scope.get('other', connection)).toEqual([
      'crm-sales-representative',
      'crm-sales-manager',
    ]);
    expect(
      (await service.users(actor('admin'))).find((u) => u.id === 'other')
        ?.roles,
    ).toEqual(['sales-representative', 'sales-manager']);
    expect(await capability(actor('other'), 'assign')).toBe(true);
    await scope.replace('other', ['crm-sales-representative'], connection);
    expect(await scope.get('other', connection)).toEqual([
      'crm-sales-representative',
    ]);
    await expect(
      scope.replace('other', 'editor', connection),
    ).rejects.toMatchObject({ code: 'INVALID_ROLE_SCOPE_VALUE' });
    await expect(scope.replace('other', [], connection)).rejects.toMatchObject({
      code: 'INVALID_ROLE_SCOPE_VALUE',
    });
    // The only administrator stays one, and stays enabled.
    await expect(
      scope.replace('admin', 'crm-sales-manager', connection),
    ).rejects.toMatchObject({ code: 'LAST_ADMINISTRATOR' });
    await expect(
      scope.assertCanDisable?.('admin', connection),
    ).rejects.toMatchObject({ code: 'LAST_ADMINISTRATOR' });
    // Deleting: never the last administrator, nor someone a CRM record still
    // names; someone else loses their CRM roles with the company.
    await expect(
      scope.assertCanDelete?.('admin', 'admin', connection),
    ).rejects.toMatchObject({ code: 'LAST_ADMINISTRATOR' });
    await service.save(actor('rep'), 'leads', {
      name: 'Held by rep',
      source: 'website',
    });
    await expect(
      scope.assertCanDelete?.('rep', 'admin', connection),
    ).rejects.toMatchObject({ code: 'USER_HAS_CRM_RECORDS' });
    await expect(
      scope.assertCanDelete?.('outsider', 'admin', connection),
    ).resolves.toBeUndefined();
    await expect(
      scope.assertCanDisable?.('rep', connection),
    ).resolves.toBeUndefined();
  });
});

describe('CRM skills', () => {
  it('gives existing sales roles the waiting-on-me page once', async () => {
    for (const role of ['sales-representative', 'sales-manager']) {
      const set = (await authorization.permissionSets.get(roleKey(role)))!;
      await authorization.permissionSets.update(set.key, {
        ...set,
        grants: set.grants.filter(
          (g) =>
            !(g.resource.type === 'page' && g.resource.id === 'crm-decisions'),
        ),
      });
    }
    await database
      .query()
      .deleteFrom('crmSettings')
      .where('id', '=', 'crm-decisions-v1')
      .execute();
    await provisionCrm(authorization, database);
    for (const role of ['sales-representative', 'sales-manager'])
      expect(
        (await authorization.permissionSets.get(roleKey(role)))!.grants.some(
          (g) =>
            g.resource.type === 'page' && g.resource.id === 'crm-decisions',
        ),
      ).toBe(true);
  });

  it('gives existing sales roles mail once, and drops the removed notification page', async () => {
    for (const role of ['sales-representative', 'sales-manager']) {
      const set = (await authorization.permissionSets.get(roleKey(role)))!;
      await authorization.permissionSets.update(set.key, {
        ...set,
        grants: [
          ...set.grants.filter(
            (g) =>
              !(
                g.resource.type === 'page' && g.resource.id === 'mail.workspace'
              ),
          ),
          {
            resource: { type: 'page', id: 'crm-notifications' },
            actions: [{ action: 'access' }],
          },
        ],
      });
    }
    await database
      .query()
      .deleteFrom('crmSettings')
      .where('id', '=', 'crm-mail-v1')
      .execute();
    await provisionCrm(authorization, database);
    for (const role of ['sales-representative', 'sales-manager']) {
      const ids = (await authorization.permissionSets.get(
        roleKey(role),
      ))!.grants.flatMap((g) =>
        g.resource.type === 'page' ? [g.resource.id] : [],
      );
      expect(ids).toContain('mail.workspace');
      expect(ids).not.toContain('crm-notifications');
    }
    // A new installation's sets carry it from the start.
    expect(
      crmPermissionSet('sales-representative').grants.some(
        (g) => g.resource.type === 'page' && g.resource.id === 'mail.workspace',
      ),
    ).toBe(true);
  });

  it('takes the removed sales skills page and its editing out of every set', () => {
    const page = pageGrant('crm-skills');
    const kept = pageGrant('crm-decisions');
    const sales = salesGrant('assign', 'export');
    expect(
      withoutSkillGrants([
        page,
        kept,
        {
          ...sales,
          actions: [...sales.actions, { action: 'manageSkills' }],
        },
        {
          resource: { type: 'composite', id: 'crm.sales' },
          actions: [{ action: 'manageSkills' }],
        },
      ]),
    ).toEqual([kept, sales]);
    // A set with neither is left as it is.
    expect(withoutSkillGrants([kept, sales])).toBeUndefined();
  });
});

describe("a task's outcome, written up by the AI", () => {
  it('turns the notes into feedback as the person who may record it', async () => {
    const container = new ServiceContainer();
    const { prompts } = fakeModel(container, {
      asText: '**对方反馈**\n- 下周看演示\n',
    });
    const enabled = vi
      .spyOn(service, 'assistantEnabled')
      .mockResolvedValue(true);
    try {
      const lead = await service.save(actor('rep'), 'leads', {
        name: '反馈线索',
        company: '反馈科技',
        source: 'website',
      });
      const call = await service.save(actor('rep'), 'tasks', {
        name: '需求电话',
        status: 'open',
        dueAt: '2026-10-05T02:00:00.000Z',
        leadId: lead.id,
      });
      const { text } = await organiseFeedback(
        service,
        container,
        actor('rep'),
        toText(call.id),
        { text: '张总说下周看演示，预算30万' },
      );
      // The reply, trimmed, for the card; nothing saved.
      expect(text).toBe('**对方反馈**\n- 下周看演示');
      expect(prompts[0]).toContain('张总说下周看演示，预算30万');
      expect(prompts[0]).toContain('需求电话');
      expect(prompts[0]).toContain('反馈线索 / 反馈科技');
      expect(
        (await service.get(actor('rep'), 'tasks', toText(call.id))).result,
      ).toBeFalsy();
      // Notes are needed, and someone who may not edit the task gets
      // nothing.
      await expect(
        organiseFeedback(service, container, actor('rep'), toText(call.id), {
          text: '  ',
        }),
      ).rejects.toMatchObject({ code: 'required' });
      await expect(
        organiseFeedback(
          service,
          container,
          actor('outsider'),
          toText(call.id),
          { text: '随便' },
        ),
      ).rejects.toBeInstanceOf(Error);
    } finally {
      enabled.mockRestore();
    }
  });
});

describe('CRM lead capture', () => {
  // The model gateway as captureLeads asks it (tests/setup/model-fake.ts):
  // each turn answers `result` as JSON, or `{ asText }` as that text.
  const capturing = (result: unknown) => {
    const container = new ServiceContainer();
    const { prompts: runs, warnings } = fakeModel(container, result);
    return { container, runs, warnings };
  };
  const blank = {
    ref: null,
    name: null,
    company: null,
    jobTitle: null,
    phone: null,
    email: null,
    website: null,
    country: null,
    state: null,
    city: null,
    address: null,
    message: null,
    companyDescription: null,
    industry: null,
    employees: null,
    source: null,
    uncertain: [],
  };
  const pasted = '展会上加了华锐精工的周立和陈芳，周立想私有化部署。';

  it('turns pasted text into prefilled leads, marking doubts and possible duplicates', async () => {
    const enabled = vi
      .spyOn(service, 'assistantEnabled')
      .mockResolvedValue(true);
    try {
      await service.save(actor('rep'), 'companies', { name: '华锐精工' });
      const { container, runs } = capturing({
        leads: [
          {
            ...blank,
            name: ' 周立 ',
            company: '华锐精工',
            jobTitle: 'IT 经理',
            // A province named the way people do is taken for its code.
            country: 'cn',
            state: '浙江省',
            city: '杭州',
            // The region is in its own fields; the address keeps the rest.
            address: '中国浙江省杭州市西湖区文三路 90 号',
            message: '想私有化部署',
            // A field the text did not give is not reported as a doubt,
            // nor is one the lead has no such field for.
            uncertain: ['jobTitle', 'jobTitle', 'email', 'nonsense'],
          },
          // A region that does not resolve is left out.
          {
            ...blank,
            name: '陈芳',
            company: '华锐精工',
            source: 'website',
            country: 'Atlantis',
            state: '浙江省',
            linkedin: ' linkedin.com/in/chen-fang ',
          },
          // Nothing the form could use: dropped.
          { ...blank, uncertain: ['name'] },
        ],
        reply: null,
      });
      const { leads } = await captureLeads(
        service,
        container,
        actor('rep'),
        { text: pasted },
        'Asia/Shanghai',
      );
      expect(runs).toHaveLength(1);
      expect(runs[0]).toContain(pasted);
      expect(leads).toHaveLength(2);
      expect(leads[0].input).toEqual({
        name: '周立',
        company: '华锐精工',
        jobTitle: 'IT 经理',
        country: 'CN',
        state: 'CN-33',
        city: '杭州',
        address: '西湖区文三路 90 号',
        message: '想私有化部署',
      });
      expect(leads[0].uncertain).toEqual(['jobTitle']);
      expect(leads[0].duplicates).toContainEqual(
        expect.objectContaining({ entity: 'companies', name: '华锐精工' }),
      );
      // A source is filled only when the text states one; otherwise the
      // form or the batch review asks for it.
      expect(leads[1].input.source).toBe('website');
      // A LinkedIn profile the text gives is kept as written.
      expect(leads[1].input.linkedin).toBe('linkedin.com/in/chen-fang');
      expect(leads[0].input).not.toHaveProperty('linkedin');
      expect(leads[1].input).not.toHaveProperty('country');
      expect(leads[1].input).not.toHaveProperty('state');
      // The pasted text is not kept with the lead; what the review shows is
      // what the form saves.
      const lead = await service.save(actor('rep'), 'leads', leads[0].input);
      expect(lead).not.toHaveProperty('rawContent');
    } finally {
      enabled.mockRestore();
    }
  });

  it('reads the leads from the reply when the model writes them as text', async () => {
    const enabled = vi
      .spyOn(service, 'assistantEnabled')
      .mockResolvedValue(true);
    try {
      const lead = { ...blank, name: '王磊', company: '丰禾物流' };
      const { container } = capturing({
        asText: `整理如下：\n\n\`\`\`json\n${JSON.stringify({ leads: [lead], reply: null })}\n\`\`\`\n\n说明：来源看不出。`,
      });
      const { leads } = await captureLeads(
        service,
        container,
        actor('rep'),
        { text: pasted },
        'UTC',
      );
      expect(leads.map((l) => l.input.name)).toEqual(['王磊']);
    } finally {
      enabled.mockRestore();
    }
  });

  it('revises the leads as told, keeping each under its key', async () => {
    const enabled = vi
      .spyOn(service, 'assistantEnabled')
      .mockResolvedValue(true);
    try {
      const { container, runs } = capturing({
        leads: [
          { ...blank, ref: 'r1', name: '周立', jobTitle: 'IT 总监' },
          // A key the client never sent is a new lead, not a revision.
          { ...blank, ref: 'unknown', name: '刘洋' },
          // The salesperson may not assign: an owner is not kept.
          { ...blank, ref: null, name: '陈芳', ownerId: 'other' },
        ],
        reply: '已把周立的职位改为 IT 总监，并加上了刘洋和陈芳。',
      });
      const result = await captureLeads(
        service,
        container,
        actor('rep'),
        {
          text: pasted,
          instruction: '周立的职位是 IT 总监',
          leads: [{ ref: 'r1', name: '周立', jobTitle: 'IT 经理' }],
        },
        'UTC',
      );
      expect(runs[0]).toContain('周立的职位是 IT 总监');
      expect(runs[0]).toContain('"ref": "r1"');
      expect(runs[0]).not.toContain("ownerId is the lead's owner");
      expect(result.reply).toContain('IT 总监');
      const [revised, added, third] = result.leads;
      // A revision carries every field the AI writes, null where empty, so
      // the client can tell a cleared value from an untouched one.
      expect(revised).toMatchObject({
        ref: 'r1',
        input: { name: '周立', jobTitle: 'IT 总监', phone: null },
      });
      expect(added).not.toHaveProperty('ref');
      expect(added.input.name).toBe('刘洋');
      expect(third.input).not.toHaveProperty('ownerId');

      // A manager may assign: the AI is offered the salespeople, and an
      // owner outside them is dropped.
      const assigning = capturing({
        leads: [
          { ...blank, name: '王磊', ownerId: 'rep' },
          { ...blank, name: '张总', ownerId: 'outsider' },
        ],
        reply: null,
      });
      const assigned = await captureLeads(
        service,
        assigning.container,
        actor('manager'),
        { text: pasted },
        'UTC',
      );
      expect(assigning.runs[0]).toContain("ownerId is the lead's owner");
      expect(assigned.leads[0].input.ownerId).toBe('rep');
      expect(assigned.leads[1].input).not.toHaveProperty('ownerId');

      // An instruction needs the leads it is about, each under a key.
      await expect(
        captureLeads(
          service,
          container,
          actor('rep'),
          { text: pasted, instruction: '去掉陈芳' },
          'UTC',
        ),
      ).rejects.toMatchObject({ code: 'required', field: 'leads' });
      await expect(
        captureLeads(
          service,
          container,
          actor('rep'),
          { text: pasted, instruction: '去掉陈芳', leads: [{ name: '陈芳' }] },
          'UTC',
        ),
      ).rejects.toMatchObject({ code: 'invalidInput', field: 'leads' });
    } finally {
      enabled.mockRestore();
    }
  });

  it('refuses without permission, text or an available assistant', async () => {
    const { container, runs, warnings } = capturing({ leads: 'not a list' });
    await expect(
      captureLeads(
        service,
        container,
        actor('outsider'),
        { text: pasted },
        'UTC',
      ),
    ).rejects.toMatchObject({ code: 'forbidden' });
    await expect(
      captureLeads(service, container, actor('rep'), { text: '  ' }, 'UTC'),
    ).rejects.toMatchObject({ code: 'required', status: 400 });
    // No model to ask (the AI is off in these tests).
    await expect(
      captureLeads(service, container, actor('rep'), { text: pasted }, 'UTC'),
    ).rejects.toMatchObject({ code: 'assistantUnavailable', status: 409 });
    // The AI on, but no Agents plugin to ask.
    const enabled = vi
      .spyOn(service, 'assistantEnabled')
      .mockResolvedValue(true);
    try {
      await expect(
        captureLeads(
          service,
          new ServiceContainer(),
          actor('rep'),
          { text: pasted },
          'UTC',
        ),
      ).rejects.toMatchObject({ code: 'assistantUnavailable' });
      expect(runs).toHaveLength(0);
      // A reply that is not the requested shape is a failure, logged.
      await expect(
        captureLeads(service, container, actor('rep'), { text: pasted }, 'UTC'),
      ).rejects.toMatchObject({ code: 'captureFailed', status: 502 });
      expect(warnings).toHaveLength(1);
    } finally {
      enabled.mockRestore();
    }
  });

  it('is an endpoint only signed-in users who may create leads reach', async () => {
    expect(
      (await request('/leads/capture', undefined, 'POST', {})).status,
    ).toBe(401);
    expect(
      (await request('/leads/capture', 'outsider', 'POST', { text: pasted }))
        .status,
    ).toBe(403);
    // The routes' container has no AI employee plugin: unavailable.
    expect(
      (await request('/leads/capture', 'rep', 'POST', { text: pasted })).status,
    ).toBe(503);
  });
});

describe('CRM lead evaluation', () => {
  // The model gateway as the evaluator asks it (tests/setup/model-fake.ts):
  // each turn answers `verdict`. `abortable`: kept for the tests that stop
  // the application mid-run; every fake call gives up on a signal already
  // aborted, as a model call does.
  const evaluating = (
    verdict: unknown,
    _options: { abortable?: boolean } = {},
  ) => {
    const container = new ServiceContainer();
    const { prompts } = fakeModel(container, verdict);
    return { evaluator: new LeadEvaluator(service, container), prompts };
  };
  const follow = {
    recommendation: 'follow',
    grade: 'A',
    summary: '三个厂区要私有化部署，问了企业版集群。',
    reasons: ['线索原文：三个厂区用 Excel 做设备点检'],
    edition: '企业版',
    invalidReason: null,
    nextStep: { type: 'task', subject: '电话了解部署规模', inDays: 0 },
    questions: ['有几个厂区要上线？'],
    enrich: [],
  };

  // A follow-up suggests the lead's own fields from its material as well as
  // the company's from the web: each cleaned to what the field takes, with
  // where it came from.
  it("cleans the values it suggests for a lead's fields", () => {
    const found = cleanEnrich(
      [
        {
          field: 'jobTitle',
          value: '信息管理部经理',
          source: '老板电器 工单系统沟通',
        },
        { field: 'phone', value: '138 0571 2233', source: '原始信息' },
        { field: 'email', value: 'Zhou.Xiao@Robam.example', source: '备注' },
        { field: 'email', value: 'not an address', source: '备注' },
        { field: 'source', value: 'exhibition', source: '原始信息' },
        { field: 'source', value: '展会', source: '原始信息' },
        {
          field: 'website',
          value: 'https://www.robam.com',
          source: 'https://www.robam.com/about',
        },
        // Already held: left out.
        { field: 'company', value: '杭州老板电器', source: '原始信息' },
        // A model's word for nothing.
        { field: 'city', value: '无', source: '无' },
      ],
      { id: 'l1', company: '杭州老板电器', email: null },
    );
    expect(found).toEqual([
      {
        field: 'jobTitle',
        value: '信息管理部经理',
        source: null,
        basis: '老板电器 工单系统沟通',
        current: null,
      },
      {
        field: 'phone',
        value: '13805712233',
        source: null,
        basis: '原始信息',
        current: null,
      },
      {
        field: 'email',
        value: 'zhou.xiao@robam.example',
        source: null,
        basis: '备注',
        current: null,
      },
      {
        field: 'source',
        value: 'exhibition',
        source: null,
        basis: '原始信息',
        current: null,
      },
      {
        field: 'website',
        value: 'https://www.robam.com',
        source: 'https://www.robam.com/about',
        current: null,
      },
    ]);
  });

  // The company looked up on the web before the follow-up when due
  // (lead-research.ts), with the Company research agent's search: what it
  // found goes to the follow-up and stays on the card, a value from it is
  // offered only with a page it read, and a later follow-up reads it
  // rather than searching again until the company changes.
  it('takes only an address as a website', () => {
    expect(
      cleanEnrich(
        [
          { field: 'website', value: '官网未知', source: '原始信息' },
          { field: 'website', value: 'robam.com', source: '备注' },
        ],
        { id: 'l2' },
      ),
    ).toEqual([
      {
        field: 'website',
        value: 'robam.com',
        source: null,
        basis: '备注',
        current: null,
      },
    ]);
  });

  it("looks the lead's company up on the web when due", async () => {
    const enabled = vi
      .spyOn(service, 'assistantEnabled')
      .mockResolvedValue(true);
    try {
      const container = new ServiceContainer();
      const { prompts } = fakeModel(container, {
        ...follow,
        enrich: [
          {
            field: 'website',
            value: 'https://www.research.example',
            source: 'ref_1',
          },
          // A page the look-up never read: left out.
          { field: 'employees', value: '201-500', source: 'https://made.up' },
        ],
      });
      const searches: string[] = [];
      let searching: 'answer' | 'fail' | 'none' = 'answer';
      container.instance(
        companySignalsToken,
        new CompanySignals(
          service,
          () =>
            searching === 'none'
              ? null
              : {
                  kind: 'dashscope' as const,
                  service: 'qwen',
                  model: 'qwen3.8-flash',
                  apiKey: 'key',
                },
          {
            fetch: (async (_url: string, init: { body: string }) => {
              const body = JSON.parse(init.body) as {
                input: { messages: { content: { text: string }[] }[] };
              };
              searches.push(body.input.messages.at(-1)?.content[0]?.text ?? '');
              if (searching === 'fail')
                return new Response('{}', { status: 500 });
              return new Response(
                JSON.stringify({
                  output: {
                    choices: [
                      {
                        message: {
                          content: [
                            {
                              text: '1. 调研精工做精密零件 [ref_1]\n2. 最近招聘数字化经理 [ref_2]\n3. 没有找到使用 NocoBase 的记录',
                            },
                          ],
                        },
                      },
                    ],
                    search_info: {
                      search_results: [
                        {
                          index: 1,
                          title: '调研精工官网',
                          url: 'https://www.research.example/about',
                          site_name: '调研精工',
                        },
                        {
                          index: 2,
                          title: '数字化经理招聘',
                          url: 'https://jobs.example/1',
                          site_name: 'Jobs',
                        },
                      ],
                    },
                  },
                  usage: { input_tokens: 10, output_tokens: 5 },
                }),
                { status: 200 },
              );
            }) as unknown as typeof fetch,
          },
        ),
      );
      const evaluator = new LeadEvaluator(service, container);
      const lead = await service.save(actor('rep'), 'leads', {
        name: '吴调研',
        company: '调研精工',
        email: 'wu@research.example',
        source: 'exhibition',
        message: '想做设备点检系统',
      });
      const run = async (trigger: FollowUpTrigger) => {
        await evaluator.request(actor('rep'), lead.id, undefined, trigger);
        await evaluator.idle();
        return (await latestEvaluation(service, actor('rep'), lead.id))!;
      };

      // A new lead: looked up, the answer given to the follow-up.
      const first = await run('created');
      expect(searches).toHaveLength(1);
      expect(searches[0]).toContain(
        'Look up this company on the web: 调研精工',
      );
      expect(searches[0]).toContain('research.example');
      expect(prompts[0]).toContain('# Web research');
      expect(prompts[0]).toContain('made for this follow-up');
      expect(prompts[0]).toContain('最近招聘数字化经理 [ref_2]');
      expect(prompts[0]).toContain(
        '[ref_1] 调研精工官网 (调研精工): https://www.research.example/about',
      );
      expect(first.status).toBe('pending');
      expect(first.ai.research?.pages.map((p) => p.url)).toEqual([
        'https://www.research.example/about',
        'https://jobs.example/1',
      ]);
      expect(first.ai.researchedAt).toBe(first.ai.research?.at);
      expect(first.ai.researchMiss).toBeUndefined();
      expect(first.ai.result?.enrich).toEqual([
        {
          field: 'website',
          value: 'https://www.research.example',
          source: 'https://www.research.example/about',
          current: null,
        },
      ]);

      // The customer writing soon after: no search, the earlier look-up
      // read, and its finding not yet written still offered.
      const second = await run('customerReplied');
      expect(searches).toHaveLength(1);
      expect(prompts.at(-1)).toContain('for an earlier follow-up');
      expect(prompts.at(-1)).toContain('Put nothing from a web look-up');
      expect(second.ai.research).toBeUndefined();
      expect(second.ai.researchMiss).toBeUndefined();
      expect(second.ai.result?.enrich.map((item) => item.source)).toEqual([
        'https://www.research.example/about',
      ]);

      // Its company changed: looked up again.
      await run('companyChanged');
      expect(searches).toHaveLength(2);

      // The search failing: the follow-up goes on, the card saying so.
      searching = 'fail';
      const failed = await run('companyChanged');
      expect(searches).toHaveLength(3);
      expect(failed.status).toBe('pending');
      expect(failed.ai.research).toBeUndefined();
      expect(failed.ai.researchMiss).toBe('failed');

      // No model searching: the same, for that reason.
      searching = 'none';
      const unavailable = await run('nurtureDue');
      expect(searches).toHaveLength(3);
      expect(unavailable.ai.researchMiss).toBe('unavailable');
      expect(prompts.at(-1)).toContain('for an earlier follow-up');
    } finally {
      enabled.mockRestore();
    }
  });

  it('evaluates a new lead as its owner and records the verdict for a decision', async () => {
    const enabled = vi
      .spyOn(service, 'assistantEnabled')
      .mockResolvedValue(true);
    try {
      const lead = await service.save(actor('rep'), 'leads', {
        name: '周立',
        company: '评估精工',
        source: 'exhibition',
        message: '三个厂区用 Excel 做设备点检，想看私有化部署',
      });
      const { evaluator, prompts } = evaluating(follow);
      const entry = await evaluator.request(actor('rep'), lead.id);
      expect(entry).toMatchObject({ status: 'running' });
      await evaluator.idle();
      // The skill and the lead are in what the AI was given, in one turn.
      expect(prompts).toHaveLength(1);
      expect(prompts[0]).toContain('# Lead follow-up');
      expect(prompts[0]).not.toContain('name: lead-follow-up');
      expect(prompts[0]).toContain('评估精工');
      const pending = await latestEvaluation(service, actor('rep'), lead.id);
      expect(pending).toMatchObject({
        status: 'pending',
        ai: { result: { recommendation: 'follow', grade: 'A' } },
      });
      // The feed shows it among the AI's entries, not the people's.
      const ai = await service.historyOf(actor('rep'), 'leads', lead.id, {
        source: 'ai',
      });
      expect(ai.data.map((e) => e.action)).toEqual(['ai']);
      const people = await service.historyOf(actor('rep'), 'leads', lead.id, {
        source: 'user',
      });
      expect(people.data.map((e) => e.action)).toEqual(['created']);
      // Waiting on the owner alone: a manager handles it from the lead.
      const mine = await pendingDecisions(service, actor('rep'));
      expect(mine.data).toContainEqual(
        expect.objectContaining({
          id: pending!.id,
          lead: expect.objectContaining({ id: lead.id, name: '周立' }),
        }),
      );
      expect(
        (await pendingDecisions(service, actor('manager'))).data.map(
          (e) => e.id,
        ),
      ).not.toContain(pending!.id);

      // Someone who may not edit the lead may not decide.
      await expect(
        evaluator.decide(actor('outsider'), lead.id, pending!.id, 'accept'),
      ).rejects.toMatchObject({ code: 'forbidden' });
      // Accepting plans the first contact, recorded as the AI's proposal
      // the rep confirmed; the lead turns working only once contact is made.
      const accepted = await evaluator.decide(
        actor('rep'),
        lead.id,
        pending!.id,
        'accept',
      );
      expect(accepted).toMatchObject({
        status: 'accepted',
        ai: { decidedById: 'rep' },
      });
      const task = await service.get(
        actor('rep'),
        'tasks',
        accepted.ai.taskId!,
      );
      expect(task).toMatchObject({
        name: '电话了解部署规模',
        leadId: lead.id,
        status: 'open',
      });
      expect((await service.get(actor('rep'), 'leads', lead.id)).status).toBe(
        'new',
      );
      // Decided, it stays on the page among the handled ones, and no longer
      // counts as waiting.
      const listed = await pendingDecisions(service, actor('rep'), {
        state: 'all',
      });
      expect(listed.data).toContainEqual(
        expect.objectContaining({ id: pending!.id, status: 'accepted' }),
      );
      expect(
        (await pendingDecisions(service, actor('rep'))).data.map((e) => e.id),
      ).not.toContain(pending!.id);
      expect(listed.pending).toBe(
        listed.data.filter((e) => e.status === 'pending').length,
      );
      // Following the lead up again keeps the decided one there, beside
      // the new one waiting.
      const again = evaluating(follow).evaluator;
      await again.request(actor('rep'), lead.id);
      await again.idle();
      const both = (
        await pendingDecisions(service, actor('rep'), { state: 'all' })
      ).data.filter((e) => e.recordId === lead.id);
      expect(both.map((e) => e.status)).toEqual(['pending', 'accepted']);
      const rows = await database
        .query()
        .selectFrom('crmHistory')
        .select(['action', 'source'])
        .where('recordId', 'in', [lead.id, toText(task.id)])
        .execute();
      expect(rows).toContainEqual({ action: 'created', source: 'assistant' });
      // A verdict is decided once.
      await expect(
        evaluator.decide(actor('rep'), lead.id, pending!.id, 'dismiss'),
      ).rejects.toMatchObject({ code: 'evaluationDecided', status: 409 });
    } finally {
      enabled.mockRestore();
    }
  });

  it('nurtures, invalidates or sets aside a lead as decided', async () => {
    const enabled = vi
      .spyOn(service, 'assistantEnabled')
      .mockResolvedValue(true);
    try {
      const verdicts = {
        nurture: {
          ...follow,
          recommendation: 'nurture',
          grade: 'C',
          nextStep: null,
        },
        invalid: {
          ...follow,
          recommendation: 'invalid',
          grade: null,
          invalidReason: 'student',
          nextStep: null,
        },
      };
      for (const [kind, verdict] of Object.entries(verdicts)) {
        const lead = await service.save(actor('rep'), 'leads', {
          name: kind,
          source: 'website',
        });
        const { evaluator } = evaluating(verdict);
        await evaluator.request(actor('rep'), lead.id);
        await evaluator.idle();
        const entry = await latestEvaluation(service, actor('rep'), lead.id);
        await evaluator.decide(actor('rep'), lead.id, entry!.id, 'accept');
        expect(await service.get(actor('rep'), 'leads', lead.id)).toMatchObject(
          kind === 'nurture'
            ? { status: 'nurturing' }
            : { status: 'invalid', invalidReason: 'student' },
        );
      }
      // Evaluating again replaces a verdict still waiting.
      const twice = await service.save(actor('rep'), 'leads', {
        name: 'twice',
        source: 'website',
      });
      const repeat = evaluating(verdicts.nurture).evaluator;
      await repeat.request(actor('rep'), twice.id);
      await repeat.idle();
      const first = await latestEvaluation(service, actor('rep'), twice.id);
      await repeat.request(actor('rep'), twice.id);
      await repeat.idle();
      const statuses = await database
        .query()
        .selectFrom('crmHistory')
        .select(['id', 'aiStatus'])
        .where('recordId', '=', twice.id)
        .where('action', '=', 'ai')
        .execute();
      expect(statuses).toContainEqual({
        id: first!.id,
        aiStatus: 'superseded',
      });
      expect(statuses.filter((e) => e.aiStatus === 'pending')).toHaveLength(1);
      // Dismissing changes nothing but the verdict's standing.
      const lead = await service.save(actor('rep'), 'leads', {
        name: 'dismissed',
        source: 'website',
      });
      const { evaluator } = evaluating(verdicts.nurture);
      await evaluator.request(actor('rep'), lead.id);
      await evaluator.idle();
      const entry = await latestEvaluation(service, actor('rep'), lead.id);
      expect(
        await evaluator.decide(actor('rep'), lead.id, entry!.id, 'dismiss'),
      ).toMatchObject({ status: 'dismissed' });
      expect((await service.get(actor('rep'), 'leads', lead.id)).status).toBe(
        'new',
      );
    } finally {
      enabled.mockRestore();
    }
  });

  it('tells a follow-up the previous one, and converts or reviews as accepted', async () => {
    const enabled = vi
      .spyOn(service, 'assistantEnabled')
      .mockResolvedValue(true);
    try {
      const lead = await service.save(actor('rep'), 'leads', {
        name: '钱多',
        company: '复查科技',
        source: 'website',
        website: 'https://fucha.example',
      });
      const first = evaluating(follow);
      await first.evaluator.request(actor('rep'), lead.id);
      await first.evaluator.idle();
      // A follow-up is one turn: the verdict, with no web research.
      expect(first.prompts).toHaveLength(1);
      expect(
        (await latestEvaluation(service, actor('rep'), lead.id))?.ai
          .researchedAt,
      ).toBeFalsy();
      // The next one is told the previous recommendation.
      const again = evaluating({ ...follow, changes: ['没有变化'] });
      await again.evaluator.request(actor('rep'), lead.id);
      await again.evaluator.idle();
      expect(again.prompts).toHaveLength(1);
      expect(again.prompts[0]).toContain('# Previous follow-up recommendation');
      expect(again.prompts[0]).toContain(follow.summary);
      // Accepting a conversion waits for the person's own conversion.
      const convert = evaluating({
        ...follow,
        recommendation: 'convert',
        nextStep: null,
        opportunity: {
          name: '设备点检系统（企业版）',
          amount: 50000,
          currency: 'cny',
        },
      });
      await convert.evaluator.request(actor('rep'), lead.id);
      await convert.evaluator.idle();
      const proposal = await latestEvaluation(service, actor('rep'), lead.id);
      // The deal's currency as the AI named it, in the CRM's form.
      expect(proposal?.ai.result).toMatchObject({
        recommendation: 'convert',
        opportunity: { name: '设备点检系统（企业版）', currency: 'CNY' },
      });
      expect(convert.prompts.at(-1)).toContain('opportunity.currency');
      // A currency the CRM does not price in is left out.
      const unknown = evaluating({
        ...follow,
        recommendation: 'convert',
        nextStep: null,
        opportunity: { name: '另一个', amount: 1, currency: 'XYZ' },
      });
      await unknown.evaluator.request(actor('rep'), lead.id);
      await unknown.evaluator.idle();
      expect(
        (await latestEvaluation(service, actor('rep'), lead.id))?.ai.result
          ?.opportunity,
      ).toMatchObject({ name: '另一个', currency: null });
      await convert.evaluator.request(actor('rep'), lead.id);
      await convert.evaluator.idle();
      const proposal2 = await latestEvaluation(service, actor('rep'), lead.id);
      await expect(
        convert.evaluator.decide(
          actor('rep'),
          lead.id,
          proposal2!.id,
          'accept',
        ),
      ).rejects.toMatchObject({ code: 'convertFirst', status: 409 });
      // Nurturing plans a review task the given days ahead.
      const nurtured = await service.save(actor('rep'), 'leads', {
        name: '培育',
        source: 'website',
      });
      const nurture = evaluating({
        ...follow,
        recommendation: 'nurture',
        grade: 'C',
        nextStep: null,
        reviewInDays: 30,
      });
      await nurture.evaluator.request(actor('rep'), nurtured.id);
      await nurture.evaluator.idle();
      const waiting = await latestEvaluation(
        service,
        actor('rep'),
        nurtured.id,
      );
      const decided = await nurture.evaluator.decide(
        actor('rep'),
        nurtured.id,
        waiting!.id,
        'accept',
      );
      const review = await service.get(
        actor('rep'),
        'tasks',
        toText(decided.ai.taskId),
      );
      expect(review).toMatchObject({
        status: 'open',
        leadId: nurtured.id,
      });
      const days = (Date.parse(toText(review.dueAt)) - Date.now()) / 86_400_000;
      expect(days).toBeGreaterThan(28);
      expect(days).toBeLessThan(33);
      // No time named: the CRM's nurture review interval, set in its
      // settings, shown on the card and planned on accept.
      await expect(
        service.saveSettings(actor('admin'), { nurtureReviewDays: 0 }),
      ).rejects.toMatchObject({ code: 'invalidInput' });
      await service.saveSettings(actor('admin'), { nurtureReviewDays: 60 });
      try {
        const later = await service.save(actor('rep'), 'leads', {
          name: '培育没说时间',
          source: 'website',
        });
        const unsaid = evaluating({
          ...follow,
          recommendation: 'nurture',
          grade: 'C',
          nextStep: null,
          reviewInDays: null,
        });
        await unsaid.evaluator.request(actor('rep'), later.id);
        await unsaid.evaluator.idle();
        const card = await latestEvaluation(service, actor('rep'), later.id);
        expect(card?.ai.result?.reviewInDays).toBe(60);
      } finally {
        await service.saveSettings(actor('admin'), { nurtureReviewDays: 90 });
      }
    } finally {
      enabled.mockRestore();
    }
  });

  it('redoes a waiting card as the person asks, by email this time', async () => {
    const enabled = vi
      .spyOn(service, 'assistantEnabled')
      .mockResolvedValue(true);
    try {
      const lead = await service.save(actor('rep'), 'leads', {
        name: '改邮件',
        company: '改邮件科技',
        source: 'website',
      });
      const first = evaluating({
        ...follow,
        enrich: [
          {
            field: 'website',
            value: 'https://gaiyoujian.example',
            source: null,
          },
        ],
      });
      await first.evaluator.request(actor('rep'), lead.id);
      await first.evaluator.idle();
      const card = await latestEvaluation(service, actor('rep'), lead.id);
      expect(card?.ai.result?.enrich).toHaveLength(1);
      // Only a waiting card, and only with words.
      await expect(
        first.evaluator.request(actor('rep'), lead.id, {
          entryId: card!.id,
          instruction: '  ',
        }),
      ).rejects.toMatchObject({ code: 'invalidInput' });
      const byEmail = {
        ...follow,
        nextStep: { type: 'email', subject: '发送方案资料', inDays: 0 },
        changes: ['按意见改为邮件联系'],
        email: { subject: '改邮件科技 供应链方案', body: '您好，感谢关注。' },
      };
      const second = evaluating(byEmail);
      const redone = await second.evaluator.request(actor('rep'), lead.id, {
        entryId: card!.id,
        instruction: '要不马上发个邮件吧',
      });
      expect(redone?.ai).toMatchObject({
        revises: card!.id,
        instruction: '要不马上发个邮件吧',
        instructedById: 'rep',
      });
      await second.evaluator.idle();
      // One turn, no web search; the card and the words in the prompt.
      expect(second.prompts).toHaveLength(1);
      expect(second.prompts[0]).toContain('# Recommendation to revise');
      expect(second.prompts[0]).toContain('要不马上发个邮件吧');
      const feed = (await service.historyOf(actor('rep'), 'leads', lead.id))
        .data;
      // The person's words in the feed, the old card replaced.
      expect(feed).toContainEqual(
        expect.objectContaining({
          action: 'aiRevise',
          actorId: 'rep',
          changes: { text: '要不马上发个邮件吧', entryId: card!.id },
        }),
      );
      expect(feed.find((entry) => entry.id === card!.id)?.aiStatus).toBe(
        'superseded',
      );
      const now = await latestEvaluation(service, actor('rep'), lead.id);
      expect(now).toMatchObject({
        status: 'pending',
        ai: {
          instruction: '要不马上发个邮件吧',
          result: {
            nextStep: { type: 'email' },
            email: { subject: '改邮件科技 供应链方案' },
          },
        },
      });
      // The web findings not yet written carry over.
      expect(now?.ai.result?.enrich).toEqual(card!.ai.result!.enrich);
      // A decided card is not redone.
      // Accepting writes the findings still ticked with it. An email is
      // written in the composer and lands in the timeline as mail, so the
      // step plans no task.
      const accepted = await second.evaluator.decide(
        actor('rep'),
        lead.id,
        now!.id,
        'accept',
        ['website'],
      );
      expect(accepted.ai).toMatchObject({
        enrichedFields: ['website'],
        enrichedById: 'rep',
      });
      expect((await service.get(actor('rep'), 'leads', lead.id)).website).toBe(
        'https://gaiyoujian.example',
      );
      expect(accepted.ai.taskId).toBeFalsy();
      await expect(
        second.evaluator.request(actor('rep'), lead.id, {
          entryId: now!.id,
          instruction: '再改一下',
        }),
      ).rejects.toMatchObject({ code: 'evaluationDecided' });
    } finally {
      enabled.mockRestore();
    }
  });

  it('carries on a planned task rather than planning another', async () => {
    const enabled = vi
      .spyOn(service, 'assistantEnabled')
      .mockResolvedValue(true);
    try {
      const lead = await service.save(actor('rep'), 'leads', {
        name: '已有活动',
        company: '已有活动科技',
        source: 'website',
      });
      const soon = new Date(Date.now() + 2 * 86_400_000);
      const planned = await service.save(actor('rep'), 'tasks', {
        name: '首次电话',
        status: 'open',
        dueAt: soon.toISOString(),
        leadId: lead.id,
        description: '已经准备的内容',
      });
      const reuse = {
        ...follow,
        nextStep: {
          type: 'task',
          subject: '首次电话',
          inDays: 2,
          task: 'A1',
        },
        prep: ['带上制造业案例'],
        questions: ['谁来拍板？'],
      };
      const run = evaluating(reuse);
      await run.evaluator.request(actor('rep'), lead.id);
      await run.evaluator.idle();
      // The model reads the task by its reference and the rules.
      const asked = run.prompts.at(-1)!;
      expect(asked).toContain('"ref": "A1"');
      expect(asked).toContain('"overdue": false');
      expect(asked).toContain("How to treat the lead's tasks");
      const card = await latestEvaluation(service, actor('rep'), lead.id);
      expect(card?.ai.result?.nextStep).toMatchObject({
        taskId: planned.id,
      });
      // Accepting updates it: what to prepare is added, its time stays,
      // and no other task is planned.
      await run.evaluator.decide(actor('rep'), lead.id, card!.id, 'accept');
      const after = await service.get(
        actor('rep'),
        'tasks',
        toText(planned.id),
      );
      expect(after.dueAt).toBe(planned.dueAt);
      expect(toText(after.description)).toContain('已经准备的内容');
      expect(toText(after.description)).toContain('带上制造业案例');
      expect(
        (await service.list(actor('rep'), 'tasks', { leadId: lead.id })).total,
      ).toBe(1);
      // Overdue: done, with what came of it ...
      const past = new Date(Date.now() - 86_400_000);
      const missed = await service.save(actor('rep'), 'tasks', {
        name: '逾期电话',
        status: 'open',
        dueAt: past.toISOString(),
        leadId: lead.id,
      });
      const ask = async (): Promise<string> => {
        const again = evaluating({
          ...reuse,
          nextStep: { ...reuse.nextStep, inDays: 1, task: 'A2' },
        });
        await again.evaluator.request(actor('rep'), lead.id);
        await again.evaluator.idle();
        expect(again.prompts.at(-1)).toContain('"overdue": true');
        return (await latestEvaluation(service, actor('rep'), lead.id))!.id;
      };
      // (A2: the tasks come latest first, the upcoming one being A1.)
      let id = await ask();
      await expect(
        run.evaluator.decide(actor('rep'), lead.id, id, 'accept', [], {
          mode: 'report',
        }),
      ).rejects.toMatchObject({ code: 'invalidInput' });
      await run.evaluator.decide(actor('rep'), lead.id, id, 'accept', [], {
        mode: 'report',
        outcome: '对方确认下周看演示',
      });
      expect(
        await service.get(actor('rep'), 'tasks', toText(missed.id)),
      ).toMatchObject({ status: 'completed', result: '对方确认下周看演示' });
      // A card already decided is not decided again.
      await expect(
        run.evaluator.decide(actor('rep'), lead.id, card!.id, 'accept'),
      ).rejects.toMatchObject({ code: 'evaluationDecided' });
      // Overdue and not done: moved to the day proposed.
      const late = await service.save(actor('rep'), 'tasks', {
        name: '逾期会议',
        status: 'open',
        dueAt: new Date(+past - 3600_000).toISOString(),
        leadId: lead.id,
      });
      const moveRun = evaluating({
        ...reuse,
        nextStep: { ...reuse.nextStep, inDays: 1, task: 'A3' },
      });
      await moveRun.evaluator.request(actor('rep'), lead.id);
      await moveRun.evaluator.idle();
      id = (await latestEvaluation(service, actor('rep'), lead.id))!.id;
      expect(
        (await latestEvaluation(service, actor('rep'), lead.id))?.ai.result
          ?.nextStep?.taskId,
      ).toBe(late.id);
      await moveRun.evaluator.decide(actor('rep'), lead.id, id, 'accept', [], {
        mode: 'reschedule',
      });
      const moved = await service.get(actor('rep'), 'tasks', toText(late.id));
      expect(new Date(toText(moved.dueAt)).getTime()).toBeGreaterThan(
        Date.now(),
      );
      expect(moved.status).toBe('open');
      // A task done meanwhile: the card about it asks to follow up
      // again rather than plan on it.
      const stale = evaluating(reuse);
      await stale.evaluator.request(actor('rep'), lead.id);
      await stale.evaluator.idle();
      const waiting = await latestEvaluation(service, actor('rep'), lead.id);
      await service.save(
        actor('rep'),
        'tasks',
        { status: 'completed', result: '已经打过' },
        toText(planned.id),
      );
      await expect(
        stale.evaluator.decide(actor('rep'), lead.id, waiting!.id, 'accept'),
      ).rejects.toMatchObject({ code: 'taskChanged' });
      // One not yet due may be told as done too.
      const early = await service.save(actor('rep'), 'leads', {
        name: '提前完成',
        source: 'website',
      });
      const ahead = new Date(Date.now() + 86_400_000);
      const upcoming = await service.save(actor('rep'), 'tasks', {
        name: '明天的电话',
        status: 'open',
        dueAt: ahead.toISOString(),
        leadId: early.id,
      });
      const doneRun = evaluating(reuse);
      await doneRun.evaluator.request(actor('rep'), early.id);
      await doneRun.evaluator.idle();
      const doneCard = await latestEvaluation(service, actor('rep'), early.id);
      await doneRun.evaluator.decide(
        actor('rep'),
        early.id,
        doneCard!.id,
        'accept',
        [],
        { mode: 'report', outcome: '提前打了，对方要报价' },
      );
      expect(
        await service.get(actor('rep'), 'tasks', toText(upcoming.id)),
      ).toMatchObject({
        status: 'completed',
        result: '提前打了，对方要报价',
      });
      // Its outcome recorded, the lead is followed up anew, reading it.
      await doneRun.evaluator.idle();
      const next = await latestEvaluation(service, actor('rep'), early.id);
      expect(next?.id).not.toBe(doneCard!.id);
      expect(next?.status).toBe('pending');
      expect(doneRun.prompts.at(-1)).toContain('提前打了，对方要报价');
      // From the task's own page too; unticked, nothing more runs.
      const second = await service.save(actor('rep'), 'tasks', {
        name: '演示会',
        status: 'open',
        dueAt: ahead.toISOString(),
        leadId: early.id,
      });
      expect(
        await recordOutcome(
          service,
          { leads: doneRun.evaluator },
          actor('rep'),
          toText(second.id),
          { outcome: '演示顺利', followUp: false },
        ),
      ).toEqual({ followUp: false });
      expect(
        (await latestEvaluation(service, actor('rep'), early.id))?.id,
      ).toBe(next?.id);
      const third = await service.save(actor('rep'), 'tasks', {
        name: '回访',
        status: 'open',
        dueAt: ahead.toISOString(),
        leadId: early.id,
      });
      expect(
        await recordOutcome(
          service,
          { leads: doneRun.evaluator },
          actor('rep'),
          toText(third.id),
          { outcome: '确认下周签约' },
        ),
      ).toEqual({ followUp: true });
      await doneRun.evaluator.idle();
      expect(
        await service.get(actor('rep'), 'tasks', toText(third.id)),
      ).toMatchObject({ status: 'completed', result: '确认下周签约' });
      expect(
        (await latestEvaluation(service, actor('rep'), early.id))?.id,
      ).not.toBe(next?.id);
      // Only a planned one: done already, it is refused.
      await expect(
        recordOutcome(
          service,
          { leads: doneRun.evaluator },
          actor('rep'),
          toText(third.id),
          { outcome: '再记一次' },
        ),
      ).rejects.toMatchObject({ code: 'taskChanged' });
      // A cancelled one may be done after all.
      const dropped = await service.save(actor('rep'), 'tasks', {
        name: 'Cancelled then done',
        leadId: early.id,
        status: 'cancelled',
      });
      await recordOutcome(
        service,
        { leads: doneRun.evaluator },
        actor('rep'),
        toText(dropped.id),
        { outcome: '还是做了', followUp: false },
      );
      expect(
        await service.get(actor('rep'), 'tasks', toText(dropped.id)),
      ).toMatchObject({ status: 'completed', result: '还是做了' });
    } finally {
      enabled.mockRestore();
    }
  });

  it('records an unreadable reply as failed, and runs nothing without the AI', async () => {
    const lead = await service.save(actor('rep'), 'leads', {
      name: 'unreadable',
      source: 'website',
    });
    // The employee switched off: nothing is queued.
    expect(
      await evaluating(follow).evaluator.request(actor('rep'), lead.id),
    ).toBe(null);
    const enabled = vi
      .spyOn(service, 'assistantEnabled')
      .mockResolvedValue(true);
    try {
      const { evaluator, prompts } = evaluating({ recommendation: 'maybe' });
      await evaluator.request(actor('rep'), lead.id);
      await evaluator.idle();
      // Asked once more for the structure before giving up.
      expect(prompts).toHaveLength(2);
      expect(prompts[1]).toContain('return only the required JSON object');
      expect(
        await latestEvaluation(service, actor('rep'), lead.id),
      ).toMatchObject({ status: 'failed', ai: { error: 'unreadable' } });
    } finally {
      enabled.mockRestore();
    }
  });

  it('writes the verdict in the AI language, shows it on the board and counts what waits', async () => {
    const enabled = vi
      .spyOn(service, 'assistantEnabled')
      .mockResolvedValue(true);
    try {
      const lead = await service.save(actor('rep'), 'leads', {
        name: 'language',
        source: 'website',
      });
      // The rep works in English; the CRM's AI language is Chinese.
      const { evaluator, prompts } = evaluating(follow);
      const running = await evaluator.request(
        { ...actor('rep'), locale: 'en-US' },
        lead.id,
      );
      expect(await aiStates(service, [lead.id])).toEqual({
        [lead.id]: 'running',
      });
      await evaluator.idle();
      expect(prompts[0]).toContain('email in Chinese.');
      expect(await aiStates(service, [lead.id])).toEqual({
        [lead.id]: 'pending',
      });
      const count = await (await request('/decisions/count', 'rep')).json();
      expect(count.data.count).toBeGreaterThan(0);
      // The list says so for the board's cards.
      const list = await (await request(`/leads?ids=${lead.id}`, 'rep')).json();
      expect(list.meta.ai).toEqual({ [lead.id]: 'pending' });
      expect(running).not.toBeNull();
    } finally {
      enabled.mockRestore();
    }
  });

  it("offers the lead's fields its material states and writes the picked ones", async () => {
    const enabled = vi
      .spyOn(service, 'assistantEnabled')
      .mockResolvedValue(true);
    try {
      const lead = await service.save(actor('rep'), 'leads', {
        name: '网查',
        company: '沃格光电',
        city: '新余',
        source: 'website',
      });
      const { evaluator, prompts } = evaluating({
        ...follow,
        enrich: [
          {
            field: 'website',
            value: 'https://www.wgtech.example',
            source: '首次电话',
          },
          // A web address is no material of the CRM's: there is no web
          // research, so the finding is not kept.
          {
            field: 'jobTitle',
            value: 'CTO',
            source: 'https://www.wgtech.example/about',
          },
          { field: 'industry', value: 'manufacturing', source: null },
          // Not an option: dropped.
          { field: 'employees', value: 'about 2000', source: null },
          { field: 'country', value: 'cn', source: 'javascript:alert(1)' },
          { field: 'state', value: '江西省', source: null },
          // What the lead already holds: dropped; a different city stays,
          // with the lead's own beside it.
          { field: 'city', value: '南昌', source: null },
          {
            field: 'address',
            value: '江西省南昌市红谷滩区丰和大道 1 号',
            source: null,
          },
        ],
      });
      // What the team learned since, from a call and in the feed, goes
      // with it.
      await service.addComment(
        actor('rep'),
        'leads',
        toText(lead.id),
        '已在用 SAP，只做对接',
      );
      await service.save(actor('rep'), 'tasks', {
        name: '首次电话',
        status: 'completed',
        dueAt: '2026-09-30T02:00:00.000Z',
        leadId: lead.id,
        result: '30 万预算只含软件，实施另算',
      });
      await evaluator.request(actor('rep'), lead.id);
      await evaluator.idle();
      // No web research; the comments and tasks go with the lead.
      expect(prompts).toHaveLength(1);
      expect(prompts[0]).toContain('There is no web research');
      expect(prompts[0]).toContain("# The team's comments");
      expect(prompts[0]).toContain('已在用 SAP，只做对接');
      expect(prompts[0]).toContain("# The lead's tasks");
      expect(prompts[0]).toContain('30 万预算只含软件，实施另算');
      const entry = await latestEvaluation(service, actor('rep'), lead.id);
      expect(entry!.ai.result!.enrich).toEqual([
        {
          field: 'website',
          value: 'https://www.wgtech.example',
          source: null,
          basis: '首次电话',
          current: null,
        },
        {
          field: 'industry',
          value: 'manufacturing',
          source: null,
          current: null,
        },
        // A source that is not a web address is not kept.
        { field: 'country', value: 'CN', source: null, current: null },
        { field: 'state', value: 'CN-36', source: null, current: null },
        { field: 'city', value: '南昌', source: null, current: '新余' },
        {
          field: 'address',
          value: '红谷滩区丰和大道 1 号',
          source: null,
          current: null,
        },
      ]);
      // Another rep, who reads the lead but may not edit it, may not fill
      // it: outside their edit scope the lead is not found.
      await expect(
        evaluator.enrich(actor('other'), lead.id, entry!.id, ['website']),
      ).rejects.toMatchObject({ code: 'notFound' });
      await expect(
        evaluator.enrich(actor('rep'), lead.id, entry!.id, ['employees']),
      ).rejects.toMatchObject({ code: 'invalidInput' });
      // The rep keeps their city: only what they picked is written, the
      // province with its country.
      const written = await evaluator.enrich(actor('rep'), lead.id, entry!.id, [
        'website',
        'industry',
        'state',
      ]);
      expect(written.ai.enrichedFields?.sort()).toEqual([
        'country',
        'industry',
        'state',
        'website',
      ]);
      expect(await service.get(actor('rep'), 'leads', lead.id)).toMatchObject({
        website: 'https://www.wgtech.example',
        industry: 'manufacturing',
        country: 'CN',
        state: 'CN-36',
        city: '新余',
      });
      const [update] = (
        await service.historyOf(actor('rep'), 'leads', lead.id, {
          source: 'ai',
        })
      ).data.filter((e) => e.action === 'updated');
      expect(update).toMatchObject({ source: 'assistant' });
      await expect(
        evaluator.enrich(actor('rep'), lead.id, entry!.id, ['city']),
      ).rejects.toMatchObject({ code: 'evaluationDecided' });
    } finally {
      enabled.mockRestore();
    }
  });

  it('plans the first contact on the business day asked, at ten', () => {
    const now = new Date('2026-09-30T08:20:00Z');
    // Today: the next full hour.
    expect(contactTime(0, 'Asia/Shanghai', now).toISOString()).toBe(
      '2026-09-30T09:00:00.000Z',
    );
    // In two days: ten in the morning, Shanghai time.
    expect(contactTime(2, 'Asia/Shanghai', now).toISOString()).toBe(
      '2026-10-02T02:00:00.000Z',
    );
  });

  it('asks for an evaluation and a decision through the routes, as someone who may edit the lead', async () => {
    const lead = await service.save(actor('rep'), 'leads', {
      name: 'route',
      source: 'website',
    });
    const latest = `/leads/${lead.id}/evaluations/latest`;
    expect((await request(latest)).status).toBe(401);
    expect((await request(latest, 'outsider')).status).toBe(403);
    expect(await (await request(latest, 'rep')).json()).toEqual({
      data: null,
    });
    // The routes' container has no AI employee plugin: unavailable.
    expect(
      (await request(`/leads/${lead.id}/evaluate`, 'rep', 'POST', {})).status,
    ).toBe(503);
    expect((await request('/decisions')).status).toBe(401);
    expect((await request('/decisions', 'rep')).status).toBe(200);
    // A lead created from the AI's organising is recorded as such, and
    // counts among the AI's entries.
    const proposed = await (
      await request('/leads?via=capture', 'rep', 'POST', {
        name: 'organised',
        source: 'website',
      })
    ).json();
    const [created] = (
      await service.historyOf(actor('rep'), 'leads', proposed.data.id)
    ).data;
    expect(created).toMatchObject({ action: 'created', source: 'capture' });
    expect(
      (
        await service.historyOf(actor('rep'), 'leads', proposed.data.id, {
          source: 'ai',
        })
      ).data.map((entry) => entry.action),
    ).toContain('created');
  });
  it('keeps what started a follow-up', async () => {
    const enabled = vi
      .spyOn(service, 'assistantEnabled')
      .mockResolvedValue(true);
    try {
      const lead = await service.save(actor('rep'), 'leads', {
        name: '触发',
        company: '触发精工',
        source: 'website',
      });
      for (const trigger of ['taskDone', 'companyChanged'] as const) {
        const run = evaluating(follow);
        await run.evaluator.request(actor('rep'), lead.id, undefined, trigger);
        await run.evaluator.idle();
        // One turn, with no web research, whatever started it.
        expect(run.prompts).toHaveLength(1);
        expect(
          (await latestEvaluation(service, actor('rep'), lead.id))?.ai,
        ).toMatchObject({ trigger, result: { grade: 'A' } });
      }
    } finally {
      enabled.mockRestore();
    }
  });
  it('runs a queued follow-up once, as its task, and hands it back on shutdown', async () => {
    const enabled = vi
      .spyOn(service, 'assistantEnabled')
      .mockResolvedValue(true);
    try {
      const lead = await service.save(actor('rep'), 'leads', {
        name: '排队',
        company: '排队精工',
        source: 'website',
      });
      const { evaluator, prompts } = evaluating(follow);
      const queued: FollowUpPayload[] = [];
      evaluator.useJobs(async (payload) => {
        queued.push(payload);
      });
      const entry = await evaluator.request(actor('rep'), lead.id);
      await evaluator.idle();
      // Queued as a task, nothing run in this process; waiting its turn.
      expect(queued).toEqual([
        { entity: 'leads', entryId: entry!.id, language: 'en-US' },
      ]);
      expect(prompts).toHaveLength(0);
      const waiting = await latestEvaluation(service, actor('rep'), lead.id);
      expect(waiting).toMatchObject({ status: 'running' });
      expect(waiting?.ai.startedAt).toBeUndefined();
      // Shutting down mid-run hands it back, still running, not begun.
      const stopped = new AbortController();
      stopped.abort();
      const stopping = evaluating(follow, { abortable: true });
      await expect(
        stopping.evaluator.runEntry(entry!.id, 'en-US', stopped.signal),
      ).rejects.toBeInstanceOf(JobInterruptedError);
      const handedBack = await latestEvaluation(service, actor('rep'), lead.id);
      expect(handedBack).toMatchObject({ status: 'running' });
      expect(handedBack?.ai.startedAt).toBeUndefined();
      // The task runs it to a card.
      await evaluator.runEntry(
        entry!.id,
        'en-US',
        new AbortController().signal,
      );
      expect(
        await latestEvaluation(service, actor('rep'), lead.id),
      ).toMatchObject({ status: 'pending', ai: { result: { grade: 'A' } } });
      // Replayed after recovery, it does nothing.
      const before = prompts.length;
      await evaluator.runEntry(
        entry!.id,
        'en-US',
        new AbortController().signal,
      );
      expect(prompts).toHaveLength(before);
    } finally {
      enabled.mockRestore();
    }
  });

  it('tells a follow-up waiting its turn from one that died', () => {
    const row = (minutesAgo: number, ai: Record<string, unknown> = {}) => ({
      id: 'e',
      recordId: 'r',
      aiStatus: 'running',
      createdAt: new Date(Date.now() - minutesAgo * 60_000).toISOString(),
      ai: JSON.stringify({ kind: 'evaluation', ...ai }),
    });
    // Waiting an hour behind others: still running.
    expect(readEntry(row(60)).status).toBe('running');
    // Waiting a day: its task was lost.
    expect(readEntry(row(25 * 60)).status).toBe('failed');
    // Begun eleven minutes ago and still going: died with its process.
    expect(
      readEntry(
        row(60, {
          startedAt: new Date(Date.now() - 11 * 60_000).toISOString(),
        }),
      ).status,
    ).toBe('failed');
    expect(
      readEntry(
        row(60, { startedAt: new Date(Date.now() - 60_000).toISOString() }),
      ).status,
    ).toBe('running');
  });
  it('gives the next step to the owner the AI names and keeps its references out of the text', async () => {
    const enabled = vi
      .spyOn(service, 'assistantEnabled')
      .mockResolvedValue(true);
    try {
      const lead = await service.save(actor('rep'), 'leads', {
        name: '换人',
        company: '换人精工',
        source: 'website',
        website: 'https://huanren.test',
        industry: 'manufacturing',
      });
      await service.save(actor('rep'), 'tasks', {
        name: '需求确认电话',
        status: 'completed',
        dueAt: '2026-09-20T02:00:00Z',
        leadId: lead.id,
        result: '客户要先做收购到配送的跟踪',
      });
      const named = evaluating({
        ...follow,
        reasons: ['收购到配送跟踪是主要需求（A1反馈）'],
        nextStep: {
          type: 'task',
          subject: '预算沟通',
          inDays: 2,
          task: null,
          owner: 'manager',
        },
      });
      await named.evaluator.request(actor('rep'), lead.id);
      await named.evaluator.idle();
      // Offered the people it may give the step to, by name.
      expect(named.prompts.at(-1)).toContain('# Available owners');
      const card = await latestEvaluation(service, actor('rep'), lead.id);
      expect(card?.ai.result).toMatchObject({
        reasons: ['收购到配送跟踪是主要需求（「需求确认电话」反馈）'],
        nextStep: { ownerId: 'manager' },
      });
      const decided = await named.evaluator.decide(
        actor('manager'),
        lead.id,
        card!.id,
        'accept',
      );
      expect(
        await service.get(actor('manager'), 'tasks', toText(decided.ai.taskId)),
      ).toMatchObject({ name: '预算沟通', ownerId: 'manager' });
      // A name it may not give it to is left out: the lead's owner keeps it.
      const stranger = evaluating({
        ...follow,
        nextStep: {
          type: 'task',
          subject: '回访',
          inDays: 2,
          task: null,
          owner: '不认识的人',
        },
      });
      await stranger.evaluator.request(actor('rep'), lead.id);
      await stranger.evaluator.idle();
      expect(
        (await latestEvaluation(service, actor('rep'), lead.id))?.ai.result
          ?.nextStep,
      ).toMatchObject({ ownerId: null });
    } finally {
      enabled.mockRestore();
    }
  });
});

describe('CRM opportunity follow-up', () => {
  // The model gateway as the follow-up asks it (tests/setup/model-fake.ts):
  // each turn answers `verdict`.
  const following = (verdict: unknown) => {
    const container = new ServiceContainer();
    const { prompts } = fakeModel(container, verdict);
    return { evaluator: new OpportunityEvaluator(service, container), prompts };
  };
  const deal = async (name: string) => {
    const company = await service.save(actor('rep'), 'companies', {
      name: `${name} 客户`,
    });
    const contact = await service.save(actor('rep'), 'contacts', {
      name: `${name} 王总`,
      companyId: company.id,
    });
    const opportunity = await service.save(actor('rep'), 'opportunities', {
      name,
      companyId: company.id,
      amount: 50000,
      stage: 'qualification',
      contacts: [{ contactId: contact.id, role: 'decisionMaker' }],
    });
    return { company, opportunity };
  };
  const advance = {
    recommendation: 'advance',
    confidence: 'medium',
    stage: 'validation',
    summary: '演示做过，客户在社区版上试用并反馈良好。',
    reasons: ['上周演示后客户试用了两个场景（活动）'],
    risks: ['还没见过拍板人'],
    nextStep: { type: 'task', subject: '技术评估会', inDays: 2 },
    prep: ['带上部署方案'],
    questions: ['数据库用什么？'],
    email: null,
    updates: [
      {
        field: 'expectedCloseAt',
        value: '2026-12-31',
        reason: '客户说年底上线',
      },
      { field: 'amount', value: '60000', reason: '加了实施服务' },
    ],
    changes: [],
  };

  it('follows a deal up as its owner and applies an accepted advance', async () => {
    const enabled = vi
      .spyOn(service, 'assistantEnabled')
      .mockResolvedValue(true);
    try {
      const { company, opportunity } = await deal('跟进报工系统');
      await service.save(actor('rep'), 'tasks', {
        name: '产品演示',
        status: 'completed',
        dueAt: '2026-09-20T02:00:00Z',
        opportunityId: opportunity.id,
        companyId: company.id,
        result: '客户在社区版上试了两个场景，反馈良好',
      });
      const { evaluator, prompts } = following(advance);
      const entry = await evaluator.request(actor('rep'), opportunity.id);
      expect(entry).toMatchObject({ status: 'running' });
      await evaluator.idle();
      // The skill, the deal, its people and what came of its tasks, in one
      // turn: there is no web research.
      expect(prompts).toHaveLength(1);
      expect(prompts.at(-1)).toContain('there is no web research');
      expect(prompts.at(-1)).toContain('# Opportunity follow-up');
      expect(prompts.at(-1)).toContain('跟进报工系统');
      expect(prompts.at(-1)).toContain('决策');
      expect(prompts.at(-1)).toContain('客户在社区版上试了两个场景');
      const pending = await latestOpportunityEvaluation(
        service,
        actor('rep'),
        opportunity.id,
      );
      expect(pending).toMatchObject({
        status: 'pending',
        ai: {
          result: {
            recommendation: 'advance',
            stage: 'validation',
            updates: [
              { field: 'expectedCloseAt', value: '2026-12-31', current: null },
              { field: 'amount', value: '60000', current: '50000' },
            ],
          },
        },
      });
      // Waiting on its owner, beside the leads.
      const waiting = await pendingDecisions(service, actor('rep'));
      expect(waiting.data.find((row) => row.id === pending!.id)).toMatchObject({
        entity: 'opportunities',
        opportunity: { name: '跟进报工系统', company: '跟进报工系统 客户' },
      });
      // Accepted with only the date picked: the stage moves, the date is
      // set, the amount stays, and the meeting is planned on the deal.
      const decided = await evaluator.decide(
        actor('rep'),
        opportunity.id,
        pending!.id,
        'accept',
        ['expectedCloseAt'],
        { name: '技术评估会（含部署）' },
      );
      expect(decided).toMatchObject({
        status: 'accepted',
        ai: { updatedFields: ['expectedCloseAt'] },
      });
      const after = await service.get(
        actor('rep'),
        'opportunities',
        opportunity.id,
      );
      expect(after.stage).toBe('validation');
      expect(Number(after.amount)).toBe(50000);
      expect(toText(after.expectedCloseAt).slice(0, 10)).toBe('2026-12-31');
      const planned = await service.get(
        actor('rep'),
        'tasks',
        toText(decided.ai.taskId),
      );
      expect(planned).toMatchObject({
        name: '技术评估会（含部署）',
        status: 'open',
        opportunityId: opportunity.id,
        companyId: company.id,
      });
      expect(toText(planned.description)).toContain('带上部署方案');
      // Recorded as the AI's proposal the person confirmed.
      const changes = await service.historyOf(
        actor('rep'),
        'opportunities',
        opportunity.id,
        { pageSize: 50 },
      );
      expect(
        changes.data
          .filter((event) => event.entity === 'opportunities')
          .map((event) => [event.action, event.source]),
      ).toContainEqual(['stage', 'assistant']);
      await expect(
        evaluator.decide(actor('rep'), opportunity.id, pending!.id, 'dismiss'),
      ).rejects.toMatchObject({ code: 'evaluationDecided' });
    } finally {
      enabled.mockRestore();
    }
  });

  it('pauses or loses a deal with its reason and plans the task to come back', async () => {
    const enabled = vi
      .spyOn(service, 'assistantEnabled')
      .mockResolvedValue(true);
    try {
      const { opportunity: paused } = await deal('暂停的商机');
      const pause = following({
        ...advance,
        recommendation: 'pause',
        stage: null,
        nextStep: null,
        pauseReason: 'budgetDeferred',
        resumeInDays: 60,
      });
      await pause.evaluator.request(actor('rep'), paused.id);
      await pause.evaluator.idle();
      const card = await latestOpportunityEvaluation(
        service,
        actor('rep'),
        paused.id,
      );
      // Pausing changes neither amount nor date, nor plans a next step.
      expect(card?.ai.result).toMatchObject({
        recommendation: 'pause',
        nextStep: null,
        pauseReason: 'budgetDeferred',
        resumeInDays: 60,
      });
      const decided = await pause.evaluator.decide(
        actor('rep'),
        paused.id,
        card!.id,
        'accept',
        ['amount'],
      );
      const pausedNow = await service.get(
        actor('rep'),
        'opportunities',
        paused.id,
      );
      expect(pausedNow).toMatchObject({
        stage: 'paused',
        pauseReason: 'budgetDeferred',
      });
      expect(Number(pausedNow.amount)).toBe(60000);
      expect(toText(pausedNow.resumeAt)).not.toBe('');
      expect(
        await service.get(actor('rep'), 'tasks', toText(decided.ai.taskId)),
      ).toMatchObject({ name: 'resume' });

      const { opportunity: lost } = await deal('输掉的商机');
      const lose = following({
        ...advance,
        recommendation: 'lose',
        confidence: 'low',
        lostReason: 'toCompetitor',
        revisitInDays: 180,
      });
      await lose.evaluator.request(actor('rep'), lost.id);
      await lose.evaluator.idle();
      const lostCard = await latestOpportunityEvaluation(
        service,
        actor('rep'),
        lost.id,
      );
      // Losing keeps no stage, next step or updates of its own.
      expect(lostCard?.ai.result).toMatchObject({
        recommendation: 'lose',
        confidence: null,
        stage: null,
        nextStep: null,
        updates: [],
        lostReason: 'toCompetitor',
        revisitInDays: 180,
      });
      const lostDecision = await lose.evaluator.decide(
        actor('rep'),
        lost.id,
        lostCard!.id,
        'accept',
      );
      expect(
        await service.get(actor('rep'), 'opportunities', lost.id),
      ).toMatchObject({ stage: 'lost', lostReason: 'toCompetitor' });
      expect(
        await service.get(
          actor('rep'),
          'tasks',
          toText(lostDecision.ai.taskId),
        ),
      ).toMatchObject({ name: 'revisit' });
      // A closed deal has nothing to follow up.
      await expect(
        lose.evaluator.request(actor('rep'), lost.id),
      ).rejects.toMatchObject({ code: 'opportunityClosed' });
    } finally {
      enabled.mockRestore();
    }
  });

  it('follows a deal up again after an outcome on one of its tasks', async () => {
    const enabled = vi
      .spyOn(service, 'assistantEnabled')
      .mockResolvedValue(true);
    try {
      const { company, opportunity } = await deal('结果后跟进');
      const { evaluator } = following({ ...advance, stage: null });
      const task = await service.save(actor('rep'), 'tasks', {
        name: '电话确认',
        status: 'open',
        dueAt: new Date(Date.now() + 86_400_000).toISOString(),
        opportunityId: opportunity.id,
        companyId: company.id,
      });
      expect(
        await recordOutcome(
          service,
          { opportunities: evaluator },
          actor('rep'),
          toText(task.id),
          { outcome: '客户确认下周做概念验证' },
        ),
      ).toEqual({ followUp: true });
      await evaluator.idle();
      // Advancing without a stage to move to is keeping at it.
      expect(
        (
          await latestOpportunityEvaluation(
            service,
            actor('rep'),
            opportunity.id,
          )
        )?.ai.result,
      ).toMatchObject({ recommendation: 'continue', stage: null });
    } finally {
      enabled.mockRestore();
    }
  });

  it('follows up the deal a conversion opens unless the person unticks it', async () => {
    const opened = vi.fn();
    service.opportunityOpened = opened;
    try {
      const first = await service.save(actor('rep'), 'leads', {
        name: '转化跟进',
        company: '转化跟进精工',
      });
      const converted = await request(
        `/leads/${toText(first.id)}/convert`,
        'rep',
        'POST',
        { createOpportunity: true, opportunityName: '转化跟进系统', amount: 0 },
      );
      expect(converted.status).toBe(200);
      const lead = ((await converted.json()) as { data: CrmRecord }).data;
      expect(opened).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'rep' }),
        lead.convertedOpportunityId,
      );
      opened.mockClear();
      const second = await service.save(actor('rep'), 'leads', {
        name: '不跟进',
        company: '不跟进精工',
      });
      expect(
        (
          await request(`/leads/${toText(second.id)}/convert`, 'rep', 'POST', {
            createOpportunity: true,
            opportunityName: '不跟进系统',
            amount: 0,
            followUp: false,
          })
        ).status,
      ).toBe(200);
      expect(opened).not.toHaveBeenCalled();
    } finally {
      service.opportunityOpened = undefined;
    }
  });
  it('reads a value the model wrote as a number', () => {
    expect(
      stringValues({
        recommendation: 'continue',
        updates: [{ field: 'amount', value: 50000, reason: '按专业版' }],
        enrich: [{ field: 'website', value: 'https://a.test', source: null }],
      }),
    ).toMatchObject({
      updates: [{ field: 'amount', value: '50000' }],
      enrich: [{ field: 'website', value: 'https://a.test' }],
    });
  });
  it("offers no company findings: the company's particulars come from the web, which is not searched", async () => {
    const enabled = vi
      .spyOn(service, 'assistantEnabled')
      .mockResolvedValue(true);
    try {
      const { opportunity } = await deal('联网补全');
      const { evaluator } = following({
        ...advance,
        updates: [],
        enrich: [
          {
            field: 'website',
            value: 'https://lianwang.test',
            source: 'https://lianwang.test/about',
          },
        ],
      });
      await evaluator.request(actor('rep'), opportunity.id);
      await evaluator.idle();
      const pending = await latestOpportunityEvaluation(
        service,
        actor('rep'),
        opportunity.id,
      );
      expect(pending?.ai.researchedAt).toBeUndefined();
      expect(pending?.ai.result?.enrich).toEqual([]);
    } finally {
      enabled.mockRestore();
    }
  });
  // A follow-up fills or corrects the deal's own fields from its material:
  // each checked against what the field takes.
  it("suggests the deal's other fields too, each as the field takes it", async () => {
    const enabled = vi
      .spyOn(service, 'assistantEnabled')
      .mockResolvedValue(true);
    try {
      const { opportunity } = await deal('补字段商机');
      const run = following({
        ...advance,
        stage: null,
        recommendation: 'continue',
        approvals: [],
        updates: [
          { field: 'businessType', value: 'renewal', reason: '续约（活动）' },
          { field: 'businessType', value: '续约', reason: '重复的一条' },
          { field: 'source', value: 'exhibition', reason: '展会（线索）' },
          { field: 'currency', value: 'eur', reason: '客户按欧元报价（备注）' },
          {
            field: 'description',
            value: '售后工单与备件管理，一期华东 120 个网点',
            reason: '商务谈判反馈',
          },
        ],
      });
      await run.evaluator.request(actor('rep'), opportunity.id);
      await run.evaluator.idle();
      const card = await latestOpportunityEvaluation(
        service,
        actor('rep'),
        opportunity.id,
      );
      expect(
        card?.ai.result?.updates.map((u) => [u.field, u.value, u.current]),
      ).toEqual([
        ['businessType', 'renewal', null],
        ['source', 'exhibition', 'other'],
        ['currency', 'EUR', 'USD'],
        ['description', '售后工单与备件管理，一期华东 120 个网点', null],
      ]);
      // Accepting writes the ticked ones.
      await run.evaluator.decide(
        actor('rep'),
        opportunity.id,
        card!.id,
        'accept',
        ['businessType', 'description'],
      );
      expect(
        await service.get(actor('rep'), 'opportunities', opportunity.id),
      ).toMatchObject({
        businessType: 'renewal',
        description: '售后工单与备件管理，一期华东 120 个网点',
      });
    } finally {
      enabled.mockRestore();
    }
  });

  // An email card writes what it ticked before its message goes, so a
  // refused send keeps it; the accept after the send leaves it be.
  it("writes a deal's ticked updates ahead of the accept, which then leaves them be", async () => {
    const enabled = vi
      .spyOn(service, 'assistantEnabled')
      .mockResolvedValue(true);
    try {
      const { opportunity } = await deal('先写字段');
      const run = following({
        ...advance,
        stage: null,
        recommendation: 'continue',
        approvals: [],
        updates: [
          { field: 'businessType', value: 'renewal', reason: '续约（活动）' },
          { field: 'source', value: 'exhibition', reason: '展会（线索）' },
        ],
      });
      await run.evaluator.request(actor('rep'), opportunity.id);
      await run.evaluator.idle();
      const card = await latestOpportunityEvaluation(
        service,
        actor('rep'),
        opportunity.id,
      );
      const written = await run.evaluator.enrich(
        actor('rep'),
        opportunity.id,
        card!.id,
        ['businessType'],
      );
      expect(written.status).toBe('pending');
      expect(written.ai.updatedFields).toEqual(['businessType']);
      expect(
        await service.get(actor('rep'), 'opportunities', opportunity.id),
      ).toMatchObject({ businessType: 'renewal' });
      // Changed by a person meanwhile, it is not put back by the accept.
      await service.save(
        actor('rep'),
        'opportunities',
        { businessType: 'expansion' },
        opportunity.id,
      );
      const accepted = await run.evaluator.decide(
        actor('rep'),
        opportunity.id,
        card!.id,
        'accept',
        ['businessType', 'source'],
      );
      expect(accepted.ai.updatedFields).toEqual(['businessType', 'source']);
      expect(
        await service.get(actor('rep'), 'opportunities', opportunity.id),
      ).toMatchObject({ businessType: 'expansion', source: 'exhibition' });
      // Nothing ticked that is left to write is refused.
      await expect(
        run.evaluator.enrich(actor('rep'), opportunity.id, card!.id, [
          'businessType',
        ]),
      ).rejects.toMatchObject({ code: 'invalidInput' });
    } finally {
      enabled.mockRestore();
    }
  });

  // The customer's people with a part in the deal: a role changed, a
  // contact of the company added, a person created; written as ticked.
  it("proposes the customer's people and their parts, and sets the ones kept", async () => {
    const enabled = vi
      .spyOn(service, 'assistantEnabled')
      .mockResolvedValue(true);
    try {
      const { company, opportunity } = await deal('联系人角色');
      // On the company but not on the deal.
      const liu = await service.save(actor('rep'), 'contacts', {
        name: '刘总',
        companyId: company.id,
      });
      const run = following({
        ...advance,
        stage: null,
        recommendation: 'continue',
        updates: [],
        approvals: [],
        people: [
          // On the deal as decision maker already: left out.
          {
            name: '联系人角色 王总',
            role: 'decisionMaker',
            jobTitle: null,
            phone: null,
            email: null,
            reason: '拍板（会议）',
          },
          {
            name: '刘总',
            role: 'decisionMaker',
            jobTitle: '信息管理部总监',
            phone: null,
            email: null,
            reason: '最终签字人（商务谈判）',
          },
          {
            name: '老陈',
            role: 'evaluator',
            jobTitle: 'SAP 负责人',
            phone: '138 0000 1111',
            email: null,
            reason: '负责接口评估（演示）',
          },
        ],
      });
      await run.evaluator.request(actor('rep'), opportunity.id);
      await run.evaluator.idle();
      const card = await latestOpportunityEvaluation(
        service,
        actor('rep'),
        opportunity.id,
      );
      expect(card?.ai.result?.contacts).toMatchObject([
        {
          name: '刘总',
          role: 'decisionMaker',
          contactId: liu.id,
          currentRole: null,
        },
        {
          name: '老陈',
          role: 'evaluator',
          contactId: null,
          phone: '13800001111',
          currentRole: null,
        },
      ]);
      // Both kept: 刘总 added, 老陈 created and added.
      const decided = await run.evaluator.decide(
        actor('rep'),
        opportunity.id,
        card!.id,
        'accept',
        [],
        {},
        [],
        [0, 1],
      );
      expect(decided.ai.keptContacts).toHaveLength(2);
      const after = await service.get(
        actor('rep'),
        'opportunities',
        opportunity.id,
      );
      const roles = Object.fromEntries(
        (after.contacts as { contactId: string; role: string }[]).map((c) => [
          c.contactId,
          c.role,
        ]),
      );
      expect(roles[toText(liu.id)]).toBe('decisionMaker');
      const chen = (
        await service.list(actor('rep'), 'contacts', {
          companyId: toText(company.id),
          pageSize: 50,
        })
      ).data.find((c) => c.name === '老陈');
      expect(chen).toMatchObject({
        jobTitle: 'SAP 负责人',
        phone: '13800001111',
      });
      expect(roles[toText(chen!.id)]).toBe('evaluator');
    } finally {
      enabled.mockRestore();
    }
  });

  // An approval rejected is proposed again only once something has happened
  // since: what was missing supplied (a comment, a task done).
  it('proposes a rejected kind again only after something new', async () => {
    const enabled = vi
      .spyOn(service, 'assistantEnabled')
      .mockResolvedValue(true);
    try {
      const { opportunity } = await deal('驳回后重提');
      const rejected = await service.save(actor('rep'), 'approvals', {
        name: '3 月底上线',
        opportunityId: opportunity.id,
        topic: 'commitment',
        approverId: 'manager',
      });
      await service.approvalAction(actor('rep'), rejected.id, 'submit');
      await service.approvalAction(
        actor('manager'),
        toText(rejected.id),
        'reject',
        '请补充实施里程碑',
      );
      const proposed = async () => {
        const run = following({
          ...advance,
          stage: null,
          recommendation: 'continue',
          updates: [],
          terms: [
            {
              topic: 'commitment',
              term: '3 月底上线',
              beyondStandard: true,
              approval: null,
              why: '补充里程碑后重新提交',
            },
          ],
        });
        await run.evaluator.request(actor('rep'), opportunity.id);
        await run.evaluator.idle();
        return (
          await latestOpportunityEvaluation(
            service,
            actor('rep'),
            opportunity.id,
          )
        )?.ai.result;
      };
      // Nothing since the rejection: not proposed, the term rejected.
      expect(await proposed()).toMatchObject({
        approvals: [],
        terms: [{ status: 'rejected', approval: '3 月底上线' }],
      });
      // The milestones written down since: proposed.
      await service.addComment(
        actor('rep'),
        'opportunities',
        toText(opportunity.id),
        '实施里程碑：11 月需求、1 月上线测试、3 月底华东上线',
      );
      expect((await proposed())?.approvals).toEqual([
        {
          topic: 'commitment',
          name: '3 月底上线',
          description: '补充里程碑后重新提交',
        },
      ]);
    } finally {
      enabled.mockRestore();
    }
  });

  // An amount a person accepted stands: the next follow-up suggesting
  // another with nothing new since is not offered, and is once there is.
  it('keeps an accepted amount unless something has happened since', async () => {
    const enabled = vi
      .spyOn(service, 'assistantEnabled')
      .mockResolvedValue(true);
    try {
      const { opportunity } = await deal('采纳过的金额');
      const verdict = (value: string) => ({
        ...advance,
        stage: null,
        recommendation: 'continue',
        updates: [{ field: 'amount', value, reason: '85 折已批' }],
        approvals: [],
      });
      const first = following(verdict('42500'));
      await first.evaluator.request(actor('rep'), opportunity.id);
      await first.evaluator.idle();
      const card = await latestOpportunityEvaluation(
        service,
        actor('rep'),
        opportunity.id,
      );
      await first.evaluator.decide(
        actor('rep'),
        opportunity.id,
        card!.id,
        'accept',
        ['amount'],
      );
      expect(
        Number(
          (await service.get(actor('rep'), 'opportunities', opportunity.id))
            .amount,
        ),
      ).toBe(42500);
      const again = async () => {
        const run = following(verdict('35700'));
        await run.evaluator.request(actor('rep'), opportunity.id);
        await run.evaluator.idle();
        return (
          await latestOpportunityEvaluation(
            service,
            actor('rep'),
            opportunity.id,
          )
        )?.ai.result?.updates;
      };
      // The same facts read again: not offered.
      expect(await again()).toEqual([]);
      // A comment since: offered.
      await service.addComment(
        actor('rep'),
        'opportunities',
        toText(opportunity.id),
        '客户确认一期金额按 35.7 万签',
      );
      expect((await again())?.map((u) => u.value)).toEqual(['35700']);
    } finally {
      enabled.mockRestore();
    }
  });

  // The terms the model lists are checked by the code: an approval it names
  // covers a term only when that approval is approved (or pending); one it
  // names that was rejected marks the term rejected, which holds the deal
  // back without a resubmission on the spot; a term never asked for (or
  // named after a withdrawn one) needs approval, and one is proposed for it
  // when the model proposed none of its kind.
  it("checks every term against the deal's approvals itself", () => {
    const dealApprovals = [
      { name: '一期8折优惠申请', topic: 'discount', status: 'approved' },
      { name: '3-3-4付款账期申请', topic: 'paymentTerms', status: 'rejected' },
      { name: '源码交付条款申请', topic: 'contractTerms', status: 'withdrawn' },
    ];
    const { terms, approvals, holdsBack } = checkTerms(
      [
        {
          topic: 'discount',
          term: '85 折',
          beyondStandard: true,
          approval: '一期8折优惠申请',
        },
        // The model's word that the rejected one covers it is not taken.
        {
          topic: 'paymentTerms',
          term: '4-3-3，尾款验收后 60 天',
          beyondStandard: true,
          approval: '3-3-4付款账期申请',
        },
        {
          topic: 'contractTerms',
          term: '源码托管，违约金上限 5%',
          beyondStandard: true,
          approval: null,
          why: '客户接受源码托管',
        },
        {
          topic: 'commitment',
          term: '3 月底上线',
          beyondStandard: true,
          approval: null,
        },
        {
          topic: 'other',
          term: '合同用我方模板',
          beyondStandard: false,
          approval: null,
        },
      ],
      dealApprovals,
      '。超出审批标准。',
    );
    expect(terms.map((t) => t.status)).toEqual([
      'approved',
      'rejected',
      'needed',
      'needed',
      'standard',
    ]);
    expect(terms[0].approval).toBe('一期8折优惠申请');
    expect(terms[1].approval).toBe('3-3-4付款账期申请');
    // One for each term needing approval, under the term's words and the
    // model's why (or the standard wording), none for the rejected payment
    // terms with nothing new since.
    expect(approvals).toEqual([
      {
        topic: 'contractTerms',
        name: '源码托管，违约金上限 5%',
        description: '客户接受源码托管',
      },
      {
        topic: 'commitment',
        name: '3 月底上线',
        description: '3 月底上线。超出审批标准。',
      },
    ]);
    // Something new since the payment terms were rejected: asked again.
    expect(
      checkTerms(
        [
          {
            topic: 'paymentTerms',
            term: '4-3-3，尾款验收后 60 天',
            beyondStandard: true,
            approval: '3-3-4付款账期申请',
          },
        ],
        dealApprovals,
        '',
        new Set(['paymentTerms']),
      ).approvals.map((a) => a.name),
    ).toEqual(['4-3-3，尾款验收后 60 天']);
    expect(holdsBack).toBe(true);
    // Left unlinked, a term of a kind whose latest approval was rejected
    // reads as rejected, not as never asked for.
    expect(
      checkTerms(
        [
          {
            topic: 'commitment',
            term: '3 月底上线',
            beyondStandard: true,
            approval: null,
          },
        ],
        [
          {
            name: '3月底上线交付承诺申请',
            topic: 'commitment',
            status: 'rejected',
            submittedAt: '2026-10-03T07:46:00.000Z',
          },
        ],
        '',
      ).terms,
    ).toEqual([
      {
        topic: 'commitment',
        term: '3 月底上线',
        status: 'rejected',
        approval: '3月底上线交付承诺申请',
      },
    ]);
    // Submitted again under the same name and approved: the latest one
    // stands, not the one rejected before it.
    expect(
      checkTerms(
        [
          {
            topic: 'commitment',
            term: '3 月底上线',
            beyondStandard: true,
            approval: '3月底上线交付承诺申请',
          },
        ],
        [
          {
            name: '3月底上线交付承诺申请',
            topic: 'commitment',
            status: 'rejected',
            submittedAt: '2026-10-03T07:46:00.000Z',
          },
          {
            name: '3月底上线交付承诺申请',
            topic: 'commitment',
            status: 'approved',
            submittedAt: '2026-10-03T08:04:00.000Z',
          },
        ],
        '',
      ),
    ).toMatchObject({ terms: [{ status: 'approved' }], holdsBack: false });
    // All covered: nothing holds the deal back.
    expect(
      checkTerms(
        [
          {
            topic: 'discount',
            term: '85 折',
            beyondStandard: true,
            approval: '一期8折优惠申请',
          },
        ],
        dealApprovals,
        '',
      ).holdsBack,
    ).toBe(false);
  });

  // Terms still to be approved keep a deal short of the contract, whatever
  // the model concluded.
  it('keeps at it rather than advance to the contract while approvals are to be requested', async () => {
    const enabled = vi
      .spyOn(service, 'assistantEnabled')
      .mockResolvedValue(true);
    try {
      const { opportunity } = await deal('待审批不进合同');
      const { evaluator } = following({
        ...advance,
        stage: 'contract',
        updates: [],
        terms: [
          {
            topic: 'paymentTerms',
            term: '尾款验收后 60 天',
            beyondStandard: true,
            approval: null,
            why: '标准账期 30 天',
          },
        ],
      });
      await evaluator.request(actor('rep'), opportunity.id);
      await evaluator.idle();
      const card = await latestOpportunityEvaluation(
        service,
        actor('rep'),
        opportunity.id,
      );
      expect(card?.ai.result).toMatchObject({
        recommendation: 'continue',
        stage: null,
        approvals: [expect.objectContaining({ topic: 'paymentTerms' })],
      });
      // As on 老板电器: the model lists no approval and names a rejected
      // one as covering the payment terms; the code does not take it as
      // covered, and still keeps the deal short of the contract.
      const rejected = await service.save(actor('rep'), 'approvals', {
        name: '尾款 90 天',
        opportunityId: opportunity.id,
        topic: 'paymentTerms',
        approverId: 'manager',
      });
      await service.approvalAction(actor('rep'), rejected.id, 'submit');
      await service.approvalAction(
        actor('manager'),
        toText(rejected.id),
        'reject',
      );
      const { evaluator: again } = following({
        ...advance,
        stage: 'contract',
        updates: [],
        approvals: [],
        terms: [
          {
            topic: 'paymentTerms',
            term: '尾款验收后 60 天',
            beyondStandard: true,
            approval: '尾款 90 天',
          },
        ],
      });
      await again.request(actor('rep'), opportunity.id);
      await again.idle();
      const checked = await latestOpportunityEvaluation(
        service,
        actor('rep'),
        opportunity.id,
      );
      expect(checked?.ai.result).toMatchObject({
        recommendation: 'continue',
        stage: null,
        terms: [
          {
            term: '尾款验收后 60 天',
            status: 'rejected',
            approval: '尾款 90 天',
          },
        ],
        approvals: [],
      });
    } finally {
      enabled.mockRestore();
    }
  });
  it('proposes the approvals a deal needs, submits those kept with the accept, and follows up on the decision', async () => {
    const enabled = vi
      .spyOn(service, 'assistantEnabled')
      .mockResolvedValue(true);
    try {
      const { opportunity } = await deal('审批协助');
      // A payment-terms approval already waiting: not proposed again.
      const waiting = await service.save(actor('rep'), 'approvals', {
        name: '尾款 90 天',
        opportunityId: opportunity.id,
        topic: 'paymentTerms',
        approverId: 'manager',
      });
      await service.approvalAction(actor('rep'), waiting.id, 'submit');
      const { evaluator } = following({
        ...advance,
        stage: 'negotiation',
        updates: [],
        terms: [
          {
            topic: 'discount',
            term: '一期 8 折',
            beyondStandard: true,
            approval: null,
            why: '客户要 8 折，标准折扣不超过 10%（A1）',
          },
          {
            topic: 'paymentTerms',
            term: '尾款验收后 90 天',
            beyondStandard: true,
            approval: '尾款 90 天',
            why: '标准账期 30 天',
          },
          {
            topic: 'commitment',
            term: '3 月 15 日前上线',
            beyondStandard: true,
            approval: null,
            why: '要写进合同，延期按天扣款',
          },
        ],
      });
      await evaluator.request(actor('rep'), opportunity.id);
      await evaluator.idle();
      const pending = await latestOpportunityEvaluation(
        service,
        actor('rep'),
        opportunity.id,
      );
      expect(pending?.ai.result?.approvals?.map((a) => a.topic)).toEqual([
        'discount',
        'commitment',
      ]);
      // The discount kept, sent to the default approver; the commitment
      // left out.
      const accepted = await evaluator.decide(
        actor('rep'),
        opportunity.id,
        pending!.id,
        'accept',
        [],
        {},
        [{ index: 0 }],
      );
      expect(accepted.ai.submittedApprovals).toHaveLength(1);
      const approvalId = accepted.ai.submittedApprovals![0].id;
      const approval = await service.get(actor('rep'), 'approvals', approvalId);
      expect(approval).toMatchObject({
        name: '一期 8 折',
        topic: 'discount',
        status: 'pending',
        ownerId: 'rep',
      });
      expect(approval.approverId).toBeTruthy();
      expect(approval.approverId).not.toBe('rep');
      // The decision asks for the deal to be followed up again.
      const decided = vi.fn();
      service.approvalDecided = decided;
      try {
        await service.approvalAction(
          actor(toText(approval.approverId)),
          approvalId,
          'approve',
        );
        expect(decided).toHaveBeenCalledWith(
          expect.anything(),
          expect.objectContaining({ id: approvalId, status: 'approved' }),
        );
      } finally {
        service.approvalDecided = undefined;
      }
    } finally {
      enabled.mockRestore();
    }
  });
  it('reviews a submitted approval for its approver, who decides on the review', async () => {
    const enabled = vi
      .spyOn(service, 'assistantEnabled')
      .mockResolvedValue(true);
    try {
      const review = {
        recommendation: 'conditional',
        summary: '值得争取，但 8 折太宽。',
        asked: '一期 42 万打 8 折，比 9 折上限多让 4.2 万。',
        reasons: ['对手低 20%（A1）'],
        together: null,
        precedents: '没有先例。',
        risks: ['回款'],
        missing: [],
        conditions: '最多 85 折',
        comment: '同意 85 折，请按此和客户谈。',
      };
      const container = new ServiceContainer();
      const { prompts } = fakeModel(container, review);
      const reviewer = new ApprovalReviewer(service, container);
      const { opportunity } = await deal('审批辅助评审');
      const submit = async (name: string) => {
        const approval = await service.save(actor('rep'), 'approvals', {
          name,
          opportunityId: opportunity.id,
          topic: 'discount',
          approverId: 'manager',
        });
        await service.approvalAction(actor('rep'), approval.id, 'submit');
        await reviewer.request(actor('rep'), approval.id);
        await reviewer.idle();
        return approval.id;
      };
      const first = await submit('一期 8 折');
      const pending = await latestReview(service, actor('manager'), first);
      expect(pending).toMatchObject({
        status: 'pending',
        ai: {
          result: { recommendation: 'conditional', conditions: '最多 85 折' },
        },
      });
      expect(prompts.at(-1)).toContain('# Approval review');
      expect(prompts.at(-1)).toContain('一期 8 折');
      // The approver's alone: the applicant reads no review, neither as the
      // latest nor in the approval's history, and may not ask for one.
      expect(await latestReview(service, actor('rep'), first)).toBeNull();
      const told = async (who: string) =>
        (await service.historyOf(actor(who), 'approvals', first)).data.some(
          (event) => event.action === 'ai',
        );
      expect(await told('rep')).toBe(false);
      expect(await told('manager')).toBe(true);
      expect(
        (await request(`/approvals/${first}/review`, 'rep', 'POST', {})).status,
      ).toBe(403);
      // The approver's to decide: in their Waiting on me, not the applicant's.
      expect(
        (await pendingDecisions(service, actor('manager'))).data.some(
          (entry) => entry.id === pending!.id,
        ),
      ).toBe(true);
      expect(
        (await pendingDecisions(service, actor('rep'))).data.some(
          (entry) => entry.id === pending!.id,
        ),
      ).toBe(false);
      const decided = await reviewer.decide(
        actor('manager'),
        first,
        pending!.id,
        'approve',
        '同意 85 折，请按此和客户谈。',
      );
      expect(decided).toMatchObject({
        status: 'accepted',
        ai: { decision: 'approve' },
      });
      expect(
        await service.get(actor('manager'), 'approvals', first),
      ).toMatchObject({
        status: 'approved',
        decisionComment: '同意 85 折，请按此和客户谈。',
      });
      // Dismissed, the review leaves Waiting on me and the approval waits.
      const third = await submit('二期 85 折');
      // Redone in the approver's words; the applicant may not.
      const first3 = await latestReview(service, actor('manager'), third);
      await expect(
        reviewer.request(actor('rep'), third, {
          entryId: first3!.id,
          instruction: '改成驳回',
        }),
      ).rejects.toMatchObject({ code: 'forbidden' });
      await reviewer.request(actor('manager'), third, {
        entryId: first3!.id,
        instruction: '按 9 折有条件批准',
      });
      await reviewer.idle();
      expect(prompts.at(-1)).toContain("The approver's revision instructions");
      expect(prompts.at(-1)).toContain('按 9 折有条件批准');
      const set = await latestReview(service, actor('manager'), third);
      expect(set).toMatchObject({
        status: 'pending',
        ai: { revises: first3!.id, instruction: '按 9 折有条件批准' },
      });
      await expect(
        reviewer.decide(actor('rep'), third, set!.id, 'dismiss', ''),
      ).rejects.toMatchObject({ code: 'forbidden' });
      expect(
        await reviewer.decide(actor('manager'), third, set!.id, 'dismiss', ''),
      ).toMatchObject({ status: 'dismissed' });
      expect(
        (await service.get(actor('manager'), 'approvals', third)).status,
      ).toBe('pending');
      // Decided on the approval itself, a review still waiting is retired.
      const second = await submit('全国推广 8 折');
      await service.approvalAction(actor('manager'), second, 'reject', '不批');
      expect(
        await latestReview(service, actor('manager'), second),
      ).toMatchObject({
        status: 'superseded',
        ai: { approvalOutcome: 'rejected', retiredById: 'manager' },
      });
      // Withdrawn by the applicant, its review is voided too, says so, and
      // stays in the approver's Waiting on me among those handled.
      const fourth = await submit('三期 8 折');
      await service.approvalAction(actor('rep'), fourth, 'withdraw');
      const voided = await latestReview(service, actor('manager'), fourth);
      expect(voided).toMatchObject({
        status: 'superseded',
        ai: { approvalOutcome: 'withdrawn', retiredById: 'rep' },
      });
      expect(
        (await pendingDecisions(service, actor('manager'))).data.some(
          (entry) => entry.id === voided!.id,
        ),
      ).toBe(false);
      expect(
        (
          await pendingDecisions(service, actor('manager'), { state: 'all' })
        ).data.some((entry) => entry.id === voided!.id),
      ).toBe(true);
    } finally {
      enabled.mockRestore();
    }
  });

  // Approvals submitted together follow the deal up once, when the last of
  // them leaves the queue, carrying each one's outcome; a withdrawal may be
  // that last, and all withdrawn follows nothing up.
  it('follows a deal up once the approvals submitted together are settled', async () => {
    const { opportunity } = await deal('一起提交的审批');
    const submit = async (name: string) => {
      const approval = await service.save(actor('rep'), 'approvals', {
        name,
        opportunityId: opportunity.id,
        topic: 'discount',
        approverId: 'manager',
      });
      return service.approvalAction(actor('rep'), approval.id, 'submit');
    };
    const decided = vi.fn();
    service.approvalDecided = decided;
    try {
      const a = await submit('折扣');
      const b = await submit('账期');
      const c = await submit('交付承诺');
      const first = await service.approvalAction(
        actor('manager'),
        toText(a.id),
        'approve',
      );
      // Two still wait: not yet.
      expect(await approvalsSettled(service, first)).toBeNull();
      await service.approvalAction(actor('manager'), toText(b.id), 'reject');
      const last = await service.approvalAction(
        actor('rep'),
        toText(c.id),
        'withdraw',
      );
      // The withdrawal is the last to leave: now, with every outcome.
      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(decided).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ id: c.id, status: 'withdrawn' }),
      );
      expect(
        (await approvalsSettled(service, last))
          ?.map((x) => [x.name, x.status])
          .sort(),
      ).toEqual(
        [
          ['交付承诺', 'withdrawn'],
          ['折扣', 'approved'],
          ['账期', 'rejected'],
        ].sort(),
      );
      // The deal's history tells of each: submitted, decided, withdrawn,
      // with the approval as it reads now.
      const told = (
        await service.historyOf(actor('rep'), 'opportunities', opportunity.id, {
          pageSize: 100,
        })
      ).data.filter((event) => event.entity === 'approvals');
      expect(
        told
          .map((event) => [
            (event.approval as { name: string }).name,
            toText(event.toValue),
          ])
          .sort(),
      ).toEqual(
        [
          ['交付承诺', 'pending'],
          ['交付承诺', 'withdrawn'],
          ['折扣', 'approved'],
          ['折扣', 'pending'],
          ['账期', 'pending'],
          ['账期', 'rejected'],
        ].sort(),
      );
      expect(told.every((event) => event.action === 'status')).toBe(true);
      // The card keeps them through its run, as it keeps what started it.
      const outcomes = await approvalsSettled(service, last);
      expect(
        carried({ trigger: 'approvalDecided', decidedApprovals: outcomes! }),
      ).toEqual({ trigger: 'approvalDecided', decidedApprovals: outcomes });
      // Submitted on its own later, an approval is a batch of its own.
      const later = await submit('源码托管');
      await service.database
        .query()
        .updateTable('crmApprovals')
        .set({ submittedAt: new Date(Date.now() + 60_000).toISOString() })
        .where('id', '=', toText(later.id))
        .execute();
      const alone = await service.approvalAction(
        actor('rep'),
        toText(later.id),
        'withdraw',
      );
      // All of it withdrawn: nothing to follow up.
      expect(await approvalsSettled(service, alone)).toBeNull();
    } finally {
      service.approvalDecided = undefined;
    }
  });
});

describe('lead signals', () => {
  const now = Date.parse('2026-10-10T01:00:00Z');
  const daysAgo = (days: number) =>
    new Date(now - days * 86_400_000).toISOString();

  it('tells what should have happened on a lead and has not', () => {
    // A new lead three days old, nothing done: not contacted.
    expect(leadSignal({ status: 'new', createdAt: daysAgo(3) }, [], now)).toBe(
      'uncontacted',
    );
    // A day old, or with a call planned ahead, or one done: nothing yet.
    expect(leadSignal({ status: 'new', createdAt: daysAgo(1) }, [], now)).toBe(
      undefined,
    );
    expect(
      leadSignal(
        { status: 'new', createdAt: daysAgo(3) },
        [{ status: 'open', dueAt: daysAgo(-1) }],
        now,
      ),
    ).toBe(undefined);
    // Contact made two days ago (a comment, a task done, mail): nothing yet.
    expect(
      leadSignal(
        { status: 'new', createdAt: daysAgo(3) },
        [],
        now,
        undefined,
        Date.parse(daysAgo(2)),
      ),
    ).toBe(undefined);
    // Worked, no contact for fifteen days: silent; a cancelled task does
    // not count as something happening.
    expect(
      leadSignal(
        { status: 'working', createdAt: daysAgo(40) },
        [{ status: 'cancelled', dueAt: daysAgo(3) }],
        now,
        undefined,
        Date.parse(daysAgo(15)),
      ),
    ).toBe('silent');
    expect(
      leadSignal(
        { status: 'working', createdAt: daysAgo(40) },
        [],
        now,
        undefined,
        Date.parse(daysAgo(10)),
      ),
    ).toBe(undefined);
    // Nurtured, its review task due: due.
    expect(
      leadSignal(
        { status: 'nurturing', createdAt: daysAgo(90) },
        [{ status: 'open', dueAt: daysAgo(1) }],
        now,
      ),
    ).toBe('nurtureDue');
    expect(
      leadSignal(
        { status: 'nurturing', createdAt: daysAgo(90) },
        [{ status: 'open', dueAt: daysAgo(-5) }],
        now,
      ),
    ).toBe(undefined);
    expect(
      leadSignal({ status: 'converted', createdAt: daysAgo(90) }, [], now),
    ).toBe(undefined);
  });

  it('starts a follow-up per signal as the owner, once a week, never over a waiting card', async () => {
    const quiet = await service.save(actor('rep'), 'leads', {
      name: '没人联系',
      company: '信号精工',
      source: 'website',
    });
    const waiting = await service.save(actor('rep'), 'leads', {
      name: '有卡片等着',
      source: 'website',
    });
    for (const id of [quiet.id, waiting.id])
      await database
        .query()
        .updateTable('crmLeads')
        .set({ createdAt: new Date(Date.now() - 3 * 86_400_000).toISOString() })
        .where('id', '=', id)
        .execute();
    await database
      .query()
      .insertInto('crmHistory')
      .values({
        id: 'signal-waiting-card',
        entity: 'leads',
        recordId: waiting.id,
        actorId: 'rep',
        action: 'ai',
        source: 'ai',
        aiStatus: 'pending',
        ai: JSON.stringify({ kind: 'evaluation' }),
        changes: JSON.stringify({}),
        createdAt: new Date().toISOString(),
      })
      .execute();
    const requests: { by: string; lead: string; trigger: unknown }[] = [];
    const evaluator = {
      available: async () => true,
      request: async (
        by: Actor,
        lead: string,
        _revise: unknown,
        trigger: unknown,
      ) => {
        requests.push({ by: by.id, lead, trigger });
        await database
          .query()
          .insertInto('crmHistory')
          .values({
            id: requests.length > 1 ? `signal-${lead}-again` : `signal-${lead}`,
            entity: 'leads',
            recordId: lead,
            actorId: by.id,
            action: 'ai',
            source: 'ai',
            aiStatus: 'dismissed',
            ai: JSON.stringify({ kind: 'evaluation', trigger }),
            changes: JSON.stringify({}),
            createdAt: new Date().toISOString(),
          })
          .execute();
        return { id: `signal-${lead}` };
      },
    } as unknown as LeadEvaluator;
    await scanLeadSignals(service, evaluator, new Date(), 1000);
    expect(requests).toContainEqual({
      by: 'rep',
      lead: quiet.id,
      trigger: 'uncontacted',
    });
    expect(requests.some((r) => r.lead === waiting.id)).toBe(false);
    // The same signal does not start again within the week.
    requests.length = 0;
    await scanLeadSignals(service, evaluator, new Date(), 1000);
    expect(requests.some((r) => r.lead === quiet.id)).toBe(false);
    // Unless that follow-up failed: the next pass tries again.
    await database
      .query()
      .updateTable('crmHistory')
      .set({ aiStatus: 'failed' })
      .where('id', '=', `signal-${toText(quiet.id)}`)
      .execute();
    await database
      .query()
      .deleteFrom('crmHistory')
      .where('id', '=', `signal-${toText(quiet.id)}-again`)
      .execute();
    requests.length = 0;
    await scanLeadSignals(service, evaluator, new Date(), 1000);
    expect(requests).toContainEqual({
      by: 'rep',
      lead: quiet.id,
      trigger: 'uncontacted',
    });
  });

  it('follows up what a task marked done belongs to, through the update route', async () => {
    const completed = vi.fn();
    const companyChanged = vi.fn();
    service.taskCompleted = completed;
    service.leadCompanyChanged = companyChanged;
    try {
      const lead = await service.save(actor('rep'), 'leads', {
        name: '路由信号',
        company: '旧公司',
        source: 'website',
      });
      const task = await service.save(actor('rep'), 'tasks', {
        name: '电话',
        status: 'open',
        dueAt: new Date().toISOString(),
        leadId: lead.id,
      });
      expect(
        (
          await request(`/tasks/${toText(task.id)}`, 'rep', 'PATCH', {
            status: 'completed',
          })
        ).status,
      ).toBe(200);
      expect(completed).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'rep' }),
        expect.objectContaining({ id: task.id, leadId: lead.id }),
      );
      // Its company changed by a person: looked up again; another field, not.
      await request(`/leads/${toText(lead.id)}`, 'rep', 'PATCH', {
        jobTitle: '经理',
      });
      expect(companyChanged).not.toHaveBeenCalled();
      await request(`/leads/${toText(lead.id)}`, 'rep', 'PATCH', {
        company: '新公司',
      });
      expect(companyChanged).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'rep' }),
        lead.id,
      );
    } finally {
      service.taskCompleted = undefined;
      service.leadCompanyChanged = undefined;
    }
  });

  it('follows up the deal a task belongs to, else its open lead', async () => {
    const leads = {
      request: vi.fn(async () => ({ id: 'l' })),
      available: async () => true,
    };
    const deals = {
      request: vi.fn(async () => ({ id: 'd' })),
      available: async () => true,
    };
    const company = await service.save(actor('rep'), 'companies', {
      name: '活动归属客户',
    });
    const deal = await service.save(actor('rep'), 'opportunities', {
      name: '活动归属商机',
      companyId: company.id,
    });
    const lead = await service.save(actor('rep'), 'leads', {
      name: '活动归属线索',
      source: 'website',
    });
    const evaluators = {
      leads: leads as unknown as LeadEvaluator,
      opportunities: deals as unknown as OpportunityEvaluator,
    };
    expect(
      await followUpAfterTask(service, evaluators, actor('rep'), {
        opportunityId: deal.id,
        leadId: lead.id,
      }),
    ).toBe(true);
    expect(deals.request).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'rep' }),
      deal.id,
      undefined,
      'taskDone',
      undefined,
    );
    expect(leads.request).not.toHaveBeenCalled();
    expect(
      await followUpAfterTask(service, evaluators, actor('rep'), {
        leadId: lead.id,
      }),
    ).toBe(true);
    expect(leads.request).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'rep' }),
      lead.id,
      undefined,
      'taskDone',
    );
  });
});

describe('demo dataset', () => {
  let chineseRecords = 0;
  // The import sets business settings (demoSettings); the tests after these
  // find them as they were.
  let settingsBefore: Awaited<ReturnType<CrmService['settings']>>;
  beforeAll(async () => {
    settingsBefore = await service.settings();
  });
  afterAll(async () => {
    await service.saveSettings(actor('admin'), {
      currency: settingsBefore.currency,
      timeZone: settingsBefore.timeZone,
      aiLanguage: settingsBefore.aiLanguage,
    });
  });
  const count = async (entity: string): Promise<number> =>
    (await service.list(actor('admin'), entity as never, { pageSize: 1 }))
      .total;
  it('imports once for an administrator, creating the demo accounts', async () => {
    expect(
      (await request('/demoData/import', 'manager', 'POST', {})).status,
    ).toBe(403);
    const before = Object.fromEntries(
      await Promise.all(
        [
          'leads',
          'companies',
          'contacts',
          'opportunities',
          'tasks',
          'approvals',
        ].map(async (entity) => [entity, await count(entity)]),
      ),
    );
    expect(await demoStatus(service, actor('admin'))).toMatchObject({
      present: false,
      records: 0,
    });
    // Signals other tests left, which are not the demo's.
    const signalsBefore = new Set(
      (
        await database.query().selectFrom('crmSignals').select('id').execute()
      ).map((row) => toText(row.id)),
    );
    // The metadata tells whoever may import it that none is imported (the
    // pages offer it in a banner), and tells no one else anything.
    const meta = async (id: string) =>
      (await (await request('/workspace', id)).json()).data as Record<
        string,
        unknown
      >;
    expect((await meta('admin')).demoPresent).toBe(false);
    expect(await meta('rep')).not.toHaveProperty('demoPresent');
    // An administrator's own currency stands; the time zone and the AI's
    // language, still at their defaults, are set for the Chinese dataset.
    await service.saveSettings(actor('admin'), {
      currency: 'EUR',
      timeZone: defaultSettings.timeZone,
      aiLanguage: defaultSettings.aiLanguage,
    });
    // Its approvals, submitted and decided, start no AI run.
    const submitted = vi.fn();
    const decided = vi.fn();
    service.approvalSubmitted = submitted;
    service.approvalDecided = decided;
    let populated: Response;
    try {
      populated = await request('/demoData/import', 'admin', 'POST', {});
      await new Promise((resolve) => setTimeout(resolve, 0));
    } finally {
      service.approvalSubmitted = undefined;
      service.approvalDecided = undefined;
    }
    expect(submitted).not.toHaveBeenCalled();
    expect(decided).not.toHaveBeenCalled();
    expect(populated.status).toBe(200);
    const status = (await populated.json()).data;
    expect(status.present).toBe(true);
    chineseRecords = status.records as number;
    expect((await meta('admin')).demoPresent).toBe(true);
    expect(status.language).toBe('zh-CN');
    expect(status.records).toBeGreaterThan(100);
    expect(status.settings).toEqual(['timeZone', 'aiLanguage']);
    expect(await service.settings()).toMatchObject({
      currency: 'EUR',
      timeZone: 'Asia/Shanghai',
      aiLanguage: 'zh-CN',
    });
    // The team's eight companies and the importer's three projects' (SF
    // Express is a lead alone).
    expect(await count('companies')).toBe(before.companies + 11);
    expect(await count('opportunities')).toBe(before.opportunities + 34);
    expect(await count('leads')).toBe(before.leads + 18);
    expect(await count('approvals')).toBe(before.approvals + 6);
    // The administrator importing it sells too: they own something of every
    // kind, so signing in as them shows work of their own.
    const ownedByImporter = async (entity: Entity) =>
      (
        await service.list(actor('admin'), entity, {
          ownerId: 'admin',
          pageSize: 500,
        })
      ).total;
    expect(await ownedByImporter('companies')).toBe(5);
    expect(await ownedByImporter('leads')).toBe(6);
    expect(await ownedByImporter('contacts')).toBeGreaterThan(0);
    expect(await ownedByImporter('opportunities')).toBeGreaterThan(0);
    expect(await ownedByImporter('tasks')).toBeGreaterThan(0);
    expect(await ownedByImporter('approvals')).toBe(3);
    // The AI's work waits on the importer, written by the import with no
    // model run: a new lead's follow-up, a deal's, a task's preparation and
    // two approvals' reviews; four more are handled.
    const suggestions = await pendingDecisions(service, actor('admin'), {
      state: 'all',
    });
    expect(suggestions.pending).toBe(5);
    expect(
      suggestions.data
        .map((entry) => `${toText(entry.entity)}:${toText(entry.status)}`)
        .sort(),
    ).toEqual(
      [
        'approvals:accepted',
        'approvals:pending',
        'approvals:pending',
        'leads:accepted',
        'leads:pending',
        'opportunities:accepted',
        'opportunities:dismissed',
        'opportunities:pending',
        'tasks:pending',
      ].sort(),
    );
    // Every demo company and lead carries its whole region: the province
    // of its city as well as the country and the city.
    for (const entity of ['companies', 'leads'] as const) {
      const { data } = await service.list(actor('admin'), entity, {
        pageSize: 500,
      });
      const demo = data.filter((r) => r.city);
      expect(demo.length).toBeGreaterThan(0);
      expect(demo.filter((r) => !r.state)).toEqual([]);
    }
    const shenzhen = (
      await service.list(actor('admin'), 'companies', { pageSize: 500 })
    ).data.find((r) => r.city === '深圳');
    expect(shenzhen?.state).toBe('CN-44');
    // Tasks cover a month back and three months ahead on every
    // working day, so the calendar and the agenda are never empty
    // whichever day the demo is opened on.
    const day = 86400000;
    const now = Date.now();
    const spread = await service.list(actor('admin'), 'tasks', {
      pageSize: 500,
    });
    const starts = spread.data.map((a) => Date.parse(toText(a.dueAt)));
    // Weekdays between thirty and twenty days back, whatever today is; most
    // of what took place there with a customer is a comment, not a task, so a
    // few tasks are all the window is sure to hold.
    expect(
      starts.filter((t) => t < now - 20 * day).length,
    ).toBeGreaterThanOrEqual(2);
    expect(starts.filter((t) => t > now + 60 * day).length).toBeGreaterThan(15);
    for (let ahead = 8; ahead <= 88; ahead += 7) {
      const from = now + ahead * day;
      expect(
        starts.some((t) => t >= from && t < from + 7 * day),
        `week ${String(ahead)} days ahead has tasks`,
      ).toBe(true);
    }
    const users = await service.users(actor('admin'));
    for (const account of demoAccounts) {
      const user = users.find((u) => u.username === account.username);
      expect(user).toBeDefined();
      expect(user?.roles).toEqual([account.role]);
    }
    // The administrator who imported sells too: a sales manager besides,
    // owning a share of the companies, deals and leads.
    const adminRoles = (await service.users(actor('admin'))).find(
      (u) => u.id === 'admin',
    )?.roles;
    expect(adminRoles).toContain('sales-manager');
    expect(adminRoles).toContain('system-administrator');
    for (const entity of ['companies', 'opportunities', 'leads'] as const) {
      const owned = await service.list(actor('admin'), entity, {
        pageSize: 1,
        ownerId: 'admin',
      });
      expect([entity, owned.total > 0]).toEqual([entity, true]);
    }
    const again = await request('/demoData/import', 'admin', 'POST', {});
    expect(again.status).toBe(400);
    expect((await again.json()).error).toMatchObject({
      status: 'FAILED_PRECONDITION',
      reason: 'DEMO_EXISTS',
    });
    // A demo mailbox for each demo account and the importer, connected as
    // each with the provider's secret, holding the import's conversations.
    expect(demoMail.connected).toHaveLength(5);
    expect(demoMail.connected.map((c) => c.userId)).toContain('admin');
    expect(
      demoMail.connected.every(
        (c) =>
          c.password === DEMO_MAIL_SECRET &&
          JSON.stringify(c.provider) ===
            JSON.stringify({ type: 'crm-demo', name: 'crm-demo' }),
      ),
    ).toBe(true);
    const stored = await database
      .query()
      .selectFrom('crmSettings')
      .select('value')
      .where('id', '=', 'demo-mail')
      .executeTakeFirst();
    const store = (
      typeof stored?.value === 'string'
        ? JSON.parse(stored.value)
        : stored?.value
    ) as Record<string, { from?: { address: string }; receivedAt: string }[]>;
    const addresses = demoMail.connected.map((c) => c.address);
    expect(Object.keys(store).every((a) => addresses.includes(a))).toBe(true);
    const messages = Object.values(store).flat();
    expect(messages.length).toBeGreaterThan(20);
    // Nothing reads as a reply just received, which would start a follow-up.
    expect(
      messages.every(
        (m) =>
          addresses.includes(m.from?.address ?? '') ||
          Date.now() - Date.parse(m.receivedAt) > 24 * 3_600_000,
      ),
    ).toBe(true);
    // No new lead has mail, which would turn it working.
    const newLeads = await service.list(actor('admin'), 'leads', {
      status: 'new',
      pageSize: 100,
    });
    const newAddresses = new Set(
      newLeads.data.map((lead) => String(lead.email ?? '').toLowerCase()),
    );
    expect(messages.some((m) => newAddresses.has(m.from?.address ?? ''))).toBe(
      false,
    );
    // The assignment notifications the import produced do not reach anyone.
    const queued = await database
      .query()
      .selectFrom('crmOutbox')
      .select('id')
      .where('recipientId', '=', 'demo-liming')
      .execute();
    expect(queued).toEqual([]);
    // The importer is told of what the manager does as the import ends: a
    // comment that @-mentions them, a reply to theirs, a task given them.
    const told = await database
      .query()
      .selectFrom('crmOutbox')
      .select('event')
      .where('recipientId', '=', 'admin')
      .execute();
    expect(told.map((row) => toText(row.event)).sort()).toEqual(
      expect.arrayContaining(['mentioned', 'replied']),
    );
    expect(told.length).toBeGreaterThanOrEqual(3);
    // The demo's companies carry signals, with their timeline lines,
    // written straight in (company-signals.ts): nine across seven
    // companies, two of them with two.
    const demoSignals = (
      await database
        .query()
        .selectFrom('crmSignals')
        .select(['id', 'companyId', 'status', 'runId'])
        .execute()
    ).filter((row) => !signalsBefore.has(toText(row.id)));
    expect(demoSignals).toHaveLength(9);
    const perCompany = new Map<string, number>();
    for (const row of demoSignals)
      perCompany.set(
        toText(row.companyId),
        (perCompany.get(toText(row.companyId)) ?? 0) + 1,
      );
    expect(perCompany.size).toBe(7);
    expect([...perCompany.values()].filter((n) => n === 2)).toHaveLength(2);
    expect(
      await database
        .query()
        .selectFrom('crmHistory')
        .select('id')
        .where('action', '=', 'signal')
        .where(
          'id',
          'in',
          demoSignals.map((row) => toText(row.runId)),
        )
        .execute(),
    ).toHaveLength(demoSignals.length);
    // The company's WhatsApp numbers, the demo's own (demo-whatsapp.ts),
    // with their conversations: five with demo records, which carry their
    // lines (H World's two people both on its company and deal), three
    // with people nobody linked, one of them set aside. They
    // are never the connection's, and the records offer their WhatsApp tab.
    const waNumbers = await database
      .query()
      .selectFrom('crmWaNumbers')
      .selectAll()
      .where('mode', '=', 'demo')
      .execute();
    expect(waNumbers).toHaveLength(2);
    expect(
      (await whatsapp.numbers()).some((n) => toText(n.mode) === 'demo'),
    ).toBe(false);
    // The connection page shows them apart, read-only, with what they hold.
    const view = await whatsapp.connection();
    expect(view.numbers.some((n) => n.mode === 'demo')).toBe(false);
    expect(view.demoNumbers.map((n) => n.displayPhone)).toEqual([
      '+1 555 010 0199',
      '+44 7700 900123',
    ]);
    expect(view.demoNumbers.map((n) => n.conversations)).toEqual([6, 2]);
    await expect(
      whatsapp.updateNumber(view.demoNumbers[0].id, {}),
    ).rejects.toMatchObject({ code: 'notFound' });
    expect((await meta('admin')).whatsapp).toEqual({ configured: true });
    // Two photos and two files among them, stored with the CRM's files,
    // each message's text their caption (demo-whatsapp.ts `media`).
    const waMedia = await database
      .query()
      .selectFrom('crmWaMessages')
      .select(['type', 'text', 'caption', 'mediaStatus', 'mediaFileId'])
      .where(
        'numberId',
        'in',
        waNumbers.map((n) => toText(n.id)),
      )
      .where('type', '!=', 'text')
      .execute();
    expect(waMedia.map((m) => toText(m.type)).sort()).toEqual([
      'document',
      'document',
      'image',
      'image',
    ]);
    for (const m of waMedia) {
      expect(m).toMatchObject({ text: null, mediaStatus: 'stored' });
      expect(toText(m.caption).length).toBeGreaterThan(0);
      const stored = await database
        .query()
        .selectFrom('crmFiles')
        .select(['size', 'mimeType'])
        .where('id', '=', toText(m.mediaFileId))
        .executeTakeFirstOrThrow();
      expect(Number(stored.size)).toBeGreaterThan(1000);
    }
    // A reply on a demo number is kept and sends nothing, whenever the
    // customer last wrote.
    // The job seeker's, set aside and answered already, so the counts
    // below stand.
    const demoConversation = await database
      .query()
      .selectFrom('crmWaConversations as c')
      .innerJoin('crmWaContacts as w', 'w.id', 'c.waContactId')
      .select('c.id as id')
      .where(
        'c.numberId',
        'in',
        waNumbers.map((n) => toText(n.id)),
      )
      .where('w.state', '=', 'dismissed')
      .executeTakeFirstOrThrow();
    const sentBefore = waSent.length;
    const demoReply = new FormData();
    demoReply.append('text', 'Thanks, noted.');
    const replied = await router.request(
      `/whatsapp/conversations/${toText(demoConversation.id)}/messages`,
      { method: 'POST', headers: { 'x-test-user': 'admin' }, body: demoReply },
    );
    expect(replied.status).toBe(200);
    expect(
      (
        (await replied.json()) as { data: { messages: Row[] } }
      ).data.messages.at(-1),
    ).toMatchObject({ origin: 'crm', text: 'Thanks, noted.', status: 'sent' });
    expect(waSent.length).toBe(sentBefore);
    const waConversations = await database
      .query()
      .selectFrom('crmWaConversations as c')
      .innerJoin('crmWaContacts as w', 'w.id', 'c.waContactId')
      .select(['c.waContactId', 'c.unreadCount', 'w.state'])
      .where(
        'c.numberId',
        'in',
        waNumbers.map((n) => toText(n.id)),
      )
      .execute();
    expect(waConversations.map((row) => toText(row.state)).sort()).toEqual([
      'dismissed',
      'linked',
      'linked',
      'linked',
      'linked',
      'linked',
      'unlinked',
      'unlinked',
    ]);
    expect(
      waConversations.reduce((sum, row) => sum + Number(row.unreadCount), 0),
    ).toBe(9);
    const waCustomers = waConversations.map((row) => toText(row.waContactId));
    const waLines = async () =>
      (
        await database
          .query()
          .selectFrom('crmHistory')
          .select('sourceKey')
          .where('action', '=', 'whatsapp')
          .execute()
      ).filter((row) =>
        waCustomers.includes(toText(row.sourceKey).split(':')[0]),
      );
    expect((await waLines()).length).toBeGreaterThan(4);
    // A company and a deal with two people's messages (H World's).
    const peopleOn = new Map<string, Set<string>>();
    for (const line of await database
      .query()
      .selectFrom('crmHistory')
      .select(['entity', 'recordId', 'sourceKey'])
      .where('action', '=', 'whatsapp')
      .execute()) {
      const customer = toText(line.sourceKey).split(':')[0];
      if (!waCustomers.includes(customer)) continue;
      const key = `${toText(line.entity)}:${toText(line.recordId)}`;
      peopleOn.set(key, (peopleOn.get(key) ?? new Set()).add(customer));
    }
    for (const entity of ['companies', 'opportunities'])
      expect(
        [...peopleOn].some(
          ([key, people]) => key.startsWith(`${entity}:`) && people.size === 2,
        ),
      ).toBe(true);
    // Its WhatsApp tab: one person's conversation at a time, the latest to
    // write first, the other asked for by name.
    const [dealKey] = [...peopleOn].find(
      ([key, people]) => key.startsWith('opportunities:') && people.size === 2,
    ) ?? [''];
    const tab = async (person = '') =>
      (
        (await (
          await request(
            `/opportunities/${dealKey.split(':')[1]}/whatsappMessages${person ? `?person=${person}` : ''}`,
            'admin',
          )
        ).json()) as {
          data: { people: Row[]; person: string; messages: Row[] };
        }
      ).data;
    const latest = await tab();
    expect(latest.people).toHaveLength(2);
    expect(latest.person).toBe(latest.people[0].id);
    expect(latest.messages.every((m) => m.waContactId === latest.person)).toBe(
      true,
    );
    const other = toText(latest.people[1].id);
    const theirs = await tab(other);
    expect(theirs.person).toBe(other);
    expect(theirs.messages.length).toBe(Number(latest.people[1].messageCount));
    expect((await request('/demoData/remove', 'rep', 'POST', {})).status).toBe(
      403,
    );
    // Notifications in someone's inbox: about one of its records, about a
    // record deleted long ago, and about a record that stays.
    const [demoLead] = (
      await service.list(actor('admin'), 'leads', {
        pageSize: 1,
        ownerId: 'admin',
      })
    ).data;
    // Made after the demo's lead is picked, which lists newest first.
    const kept = await service.save(actor('admin'), 'leads', {
      name: 'Kept lead',
    });
    await database
      .query()
      .insertInto('notificationInAppItems')
      .values([
        {
          id: 'item-demo',
          userId: 'admin',
          notificationId: 'n-demo',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          target: JSON.stringify({
            type: 'route',
            path: `/leads/${toText(demoLead?.id)}`,
          }),
        },
        {
          id: 'item-own',
          userId: 'admin',
          notificationId: 'n-own',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          target: JSON.stringify({
            type: 'route',
            path: `/leads/${toText(kept.id)}`,
          }),
        },
        {
          id: 'item-gone',
          userId: 'rep',
          notificationId: 'n-gone',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          target: JSON.stringify({
            type: 'route',
            path: '/accounts/gone-company',
          }),
        },
      ])
      .execute();
    // Every converted and invalid lead of the demo shows what was done on
    // it before.
    const demoManifest = await database
      .query()
      .selectFrom('crmSettings')
      .select('value')
      .where('id', '=', DEMO_MARKER)
      .executeTakeFirstOrThrow();
    const demoIds = (
      JSON.parse(toText(demoManifest.value)) as {
        records: { id: string }[];
      }
    ).records.map((record) => record.id);
    const settledLeads = await database
      .query()
      .selectFrom('crmLeads')
      .select(['id', 'status'])
      .where('status', 'in', ['converted', 'invalid'])
      .where('id', 'in', demoIds)
      .execute();
    expect(settledLeads.length).toBeGreaterThan(0);
    for (const lead of settledLeads) {
      const tasks = await database
        .query()
        .selectFrom('crmTasks')
        .select('id')
        .where('leadId', '=', toText(lead.id))
        .execute();
      expect([toText(lead.status), tasks.length > 0]).toEqual([
        toText(lead.status),
        true,
      ]);
    }
    // A lead converted with its deal gives its tasks the lead, the company
    // and the deal at once (H World's).
    const fullyLinked = await database
      .query()
      .selectFrom('crmTasks')
      .select('id')
      .where('leadId', 'is not', null)
      .where('companyId', 'is not', null)
      .where('opportunityId', 'is not', null)
      .where('id', 'in', demoIds)
      .execute();
    expect(fullyLinked.length).toBeGreaterThan(0);
    // The importer takes part in some of the colleagues' tasks.
    const joined = await service.list(actor('admin'), 'tasks', {
      pageSize: 100,
      participantId: 'admin',
    });
    expect(joined.total).toBeGreaterThan(0);
    // A task done reads as one a person kept: created, then completed
    // with its result on the entry that closed it, later than its creation.
    const doneTask = await database
      .query()
      .selectFrom('crmTasks')
      .select('id')
      .where('status', '=', 'completed')
      .where('result', 'is not', null)
      .where('id', 'in', demoIds)
      .executeTakeFirstOrThrow();
    const steps = await database
      .query()
      .selectFrom('crmHistory')
      .select(['action', 'toValue', 'changes', 'createdAt'])
      .where('recordId', '=', toText(doneTask.id))
      .orderBy('createdAt', 'asc')
      .execute();
    expect(steps.map((step) => toText(step.action))).toEqual([
      'created',
      'status',
    ]);
    expect(toText(steps[1]?.toValue)).toBe('completed');
    expect(toText(steps[1]?.changes)).toContain('result');
    expect(
      Date.parse(toText(steps[1]?.createdAt)) >
        Date.parse(toText(steps[0]?.createdAt)),
    ).toBe(true);
    // Done: present, nothing under way.
    expect(
      (await (await request('/demoData', 'admin')).json()).data,
    ).toMatchObject({ present: true, importing: null });
    const reset = await request('/demoData/remove', 'admin', 'POST', {});
    expect(reset.status).toBe(200);
    // Those about records gone leave the inbox; the other stays.
    expect(deletedNotices).toEqual([
      { id: 'item-demo', userId: 'admin' },
      { id: 'item-gone', userId: 'rep' },
    ]);
    await service.remove(actor('admin'), 'leads', toText(kept.id));
    expect((await reset.json()).data.present).toBe(false);
    // The demo companies' signals go with them.
    expect(
      await database
        .query()
        .selectFrom('crmSignals')
        .select('id')
        .where(
          'companyId',
          'in',
          demoSignals.map((row) => toText(row.companyId)),
        )
        .execute(),
    ).toEqual([]);
    // Its WhatsApp number goes with it, with its conversations, customers
    // and their lines.
    expect(
      await database
        .query()
        .selectFrom('crmWaNumbers')
        .select('id')
        .where('mode', '=', 'demo')
        .execute(),
    ).toEqual([]);
    expect(
      await database
        .query()
        .selectFrom('crmWaContacts')
        .select('id')
        .where('id', 'in', waCustomers)
        .execute(),
    ).toEqual([]);
    expect(await waLines()).toEqual([]);
    // Its mailboxes go with it, removed as their owners; so do their messages.
    expect(demoMail.removed.map((r) => r.accountId).sort()).toEqual(
      demoMail.connected.map((c) => `demo-mailbox-${c.userId}`).sort(),
    );
    expect(
      await database
        .query()
        .selectFrom('crmSettings')
        .select('id')
        .where('id', '=', 'demo-mail')
        .executeTakeFirst(),
    ).toBeUndefined();
    expect(
      await database
        .query()
        .selectFrom('crmSettings')
        .select('id')
        .where('id', '=', DEMO_MARKER)
        .executeTakeFirst(),
    ).toBeUndefined();
    // And so does the sales manager role it gave the administrator.
    expect(
      (await service.users(actor('admin'))).find((u) => u.id === 'admin')
        ?.roles,
    ).not.toContain('sales-manager');
    // The demo's accounts go with it: disabled, so they neither sign in nor
    // are offered as owners.
    expect(
      (await service.users(actor('admin'))).find(
        (u) => u.username === 'liming',
      ),
    ).toMatchObject({ disabled: true });
    for (const [entity, total] of Object.entries(before))
      expect([entity, await count(entity)]).toEqual([entity, total]);
    const missing = await request('/demoData/remove', 'admin', 'POST', {});
    expect(missing.status).toBe(404);
    // A claim left by an import the server never finished (stopped
    // mid-import) counts as none once it is ten minutes old: nothing shows
    // under way, and the banner offers the dataset again.
    await database
      .query()
      .insertInto('crmSettings')
      .values({
        id: DEMO_MARKER,
        value: JSON.stringify({ version: 7, importing: true, records: [] }),
        updatedAt: new Date(Date.now() - 11 * 60 * 1000).toISOString(),
      })
      .execute();
    const stale = await request('/demoData', 'admin');
    expect((await stale.json()).data).toMatchObject({
      present: false,
      importing: null,
    });
    await database
      .query()
      .deleteFrom('crmSettings')
      .where('id', '=', DEMO_MARKER)
      .execute();
  }, 120000);

  it('enables the accounts a removal disabled, and leaves an existing account with a demo username as it was', async () => {
    // Someone's real account that happens to have a demo username.
    await database
      .query()
      .updateTable('user')
      .set({ username: 'zhaomin-old' })
      .where('username', '=', 'zhaomin')
      .execute();
    await database
      .query()
      .insertInto('user')
      .values({
        id: 'real-zhaomin',
        name: '赵敏',
        username: 'zhaomin',
        email: 'zhaomin@company.example',
      })
      .execute();
    passwordResets.length = 0;
    const again = await request('/demoData/import', 'admin', 'POST', {});
    expect(again.status).toBe(200);
    // The disabled demo accounts are the demo's again, the real one reused.
    const users = await service.users(actor('admin'));
    expect(users.find((u) => u.username === 'liming')).toMatchObject({
      disabled: false,
    });
    expect(passwordResets).toContain('real-zhaomin');
    expect(
      (await request('/demoData/remove', 'admin', 'POST', {})).status,
    ).toBe(200);
    // Not one the import created, so removing the demo leaves it enabled.
    const after = await service.users(actor('admin'));
    expect(after.find((u) => u.id === 'real-zhaomin')).toMatchObject({
      disabled: false,
    });
    expect(after.find((u) => u.username === 'liming')).toMatchObject({
      disabled: true,
    });
  }, 120000);

  it('imports the same story in English, with English demo accounts', async () => {
    const refused = await request('/demoData/import', 'admin', 'POST', {
      language: 'fr-FR',
    });
    expect(refused.status).toBe(400);
    expect(await refused.json()).toMatchObject({
      error: {
        status: 'INVALID_ARGUMENT',
        reason: 'INVALID_INPUT',
        fieldViolations: [{ field: 'language' }],
      },
    });
    // The currency back at its default is set; the Shanghai time zone and
    // the Chinese AI language an earlier import left are no longer defaults
    // and stay.
    await service.saveSettings(actor('admin'), {
      currency: defaultSettings.currency,
    });
    const populated = await request('/demoData/import', 'admin', 'POST', {
      language: 'en-US',
    });
    expect(populated.status).toBe(200);
    const status = (await populated.json()).data;
    expect(status.language).toBe('en-US');
    expect(status.settings).toEqual(['currency']);
    expect(await service.settings()).toMatchObject({
      currency: 'CNY',
      timeZone: 'Asia/Shanghai',
      aiLanguage: 'zh-CN',
    });
    // The same records as the Chinese dataset, none of them in Chinese.
    expect(status.records).toBe(chineseRecords);
    const marker = await database
      .query()
      .selectFrom('crmSettings')
      .select('value')
      .where('id', '=', DEMO_MARKER)
      .executeTakeFirstOrThrow();
    const manifest = (
      typeof marker.value === 'string' ? JSON.parse(marker.value) : marker.value
    ) as { records: { entity: string; id: string }[] };
    const ids = manifest.records.map((r) => r.id);
    const tables = [
      ...new Set(
        manifest.records.map(
          (r) => definitions[r.entity as keyof typeof definitions].table,
        ),
      ),
      'crmHistory',
    ];
    for (const table of tables) {
      const rows = await database
        .query()
        .selectFrom(table)
        .selectAll()
        .where(table === 'crmHistory' ? 'recordId' : 'id', 'in', ids)
        .execute();
      expect(rows.length).toBeGreaterThan(0);
      expect(`${table}: ${JSON.stringify(rows)}`).not.toMatch(
        /\p{Script=Han}/u,
      );
    }
    // Its companies' nine signals too, their titles, summaries and sources
    // in English.
    const signalRows = await database
      .query()
      .selectFrom('crmSignals')
      .selectAll()
      .where('companyId', 'in', ids)
      .execute();
    expect(signalRows).toHaveLength(9);
    expect(JSON.stringify(signalRows)).not.toMatch(/\p{Script=Han}/u);
    // The English companies are its own, created by the import, and the
    // Chinese ones keep their names.
    const users = await service.users(actor('admin'));
    const daniel = users.find((u) => u.username === 'daniel');
    expect(daniel?.name).toBe('Daniel Brooks');
    expect(daniel?.roles).toEqual(['sales-manager']);
    expect(users.find((u) => u.username === 'liming')?.name).toBe('李明');
    expect(
      status.accounts.map((a: { username: string }) => a.username),
    ).toEqual(demoAccountsIn('en-US').map((a) => a.username));
    expect(
      (await request('/demoData/remove', 'admin', 'POST', {})).status,
    ).toBe(200);
  }, 120000);
});

describe("a record's timeline and its tasks", () => {
  it('refuses an import started beside another, leaving one dataset', async () => {
    const count = async (entity: string): Promise<number> =>
      (await service.list(actor('admin'), entity as never, { pageSize: 1 }))
        .total;
    const companies = await count('companies');
    // A double click on the confirmation: both requests at once.
    const [first, second] = await Promise.all([
      request('/demoData/import', 'admin', 'POST', {}),
      request('/demoData/import', 'admin', 'POST', {}),
    ]);
    expect([first.status, second.status].sort()).toEqual([200, 400]);
    expect(await count('companies')).toBe(companies + 11);
    expect(
      (await request('/demoData/remove', 'admin', 'POST', {})).status,
    ).toBe(200);
    expect(await count('companies')).toBe(companies);
  });
  it('takes back an import cut off mid-way before importing again, from what its claim recorded', async () => {
    const count = async (entity: string): Promise<number> =>
      (await service.list(actor('admin'), entity as never, { pageSize: 1 }))
        .total;
    const companies = await count('companies');
    // What an import stopped mid-way leaves: a company it wrote, recorded in
    // its claim, last moved on long ago.
    const left = await service.save(actor('manager'), 'companies', {
      name: 'Left Behind Ltd',
    });
    const longAgo = new Date(Date.now() - 11 * 60 * 1000);
    await database
      .query()
      .insertInto('crmSettings')
      .values({
        id: DEMO_MARKER,
        value: JSON.stringify({
          version: 8,
          importing: true,
          records: [
            { entity: 'companies', id: left.id, name: 'Left Behind Ltd' },
          ],
        }),
        updatedAt: longAgo,
      })
      .execute();
    // Under way no more: the page offers an import, which takes it back.
    const status = (await (await request('/demoData', 'admin')).json()) as {
      data: Row;
    };
    expect(status.data).toMatchObject({ present: false, importing: null });
    expect(
      (await request('/demoData/import', 'admin', 'POST', {})).status,
    ).toBe(200);
    expect(await count('companies')).toBe(companies + 11);
    await expect(
      service.get(actor('manager'), 'companies', toText(left.id)),
    ).rejects.toMatchObject({ code: 'notFound' });
    expect(
      (await request('/demoData/remove', 'admin', 'POST', {})).status,
    ).toBe(200);
    expect(await count('companies')).toBe(companies);
  });
  it('tells when a task is planned, done or moved, to who may see it', async () => {
    const lead = await service.save(actor('rep'), 'leads', {
      name: '动态里的活动',
      source: 'website',
    });
    const start = '2026-10-05T02:00:00.000Z';
    const call = await service.save(actor('rep'), 'tasks', {
      name: '需求摸底电话',
      status: 'open',
      dueAt: start,
      leadId: lead.id,
    });
    // Moved, described and renamed (which the lead does not hear of), then
    // done.
    await service.save(
      actor('rep'),
      'tasks',
      {
        dueAt: '2026-10-06T02:00:00.000Z',
      },
      toText(call.id),
    );
    await service.save(
      actor('rep'),
      'tasks',
      { description: '准备案例' },
      toText(call.id),
    );
    await service.save(
      actor('rep'),
      'tasks',
      { name: '需求摸底电话（二）', description: '准备两个案例' },
      toText(call.id),
    );
    await service.save(
      actor('rep'),
      'tasks',
      { status: 'completed', result: '下周给方案' },
      toText(call.id),
    );
    const feed = (await service.historyOf(actor('rep'), 'leads', lead.id)).data;
    const told = feed
      .filter((entry) => entry.entity === 'tasks')
      .map((entry) => [entry.action, entry.toValue ?? null]);
    expect(told).toEqual([
      ['status', 'completed'],
      ['updated', null],
      ['created', null],
    ]);
    const moved = feed.find(
      (entry) =>
        entry.entity === 'tasks' &&
        entry.action === 'updated' &&
        'dueAt' in (entry.changes as object),
    );
    expect(moved).toMatchObject({
      changes: { dueAt: '2026-10-06T02:00:00.000Z' },
      previous: { dueAt: start },
      task: {
        name: '需求摸底电话（二）',
        status: 'completed',
        result: '下周给方案',
      },
    });
    // The lead's own entries stay, and the count covers both.
    expect(feed.some((entry) => entry.entity === 'leads')).toBe(true);
    // Someone who may read the lead but not the task hears nothing of
    // it.
    const hidden = await service.save(actor('manager'), 'tasks', {
      name: '经理自己的会议',
      status: 'open',
      ownerId: 'manager',
      dueAt: start,
      leadId: lead.id,
    });
    const reps = (await service.historyOf(actor('rep'), 'leads', lead.id)).data;
    const managers = (
      await service.historyOf(actor('manager'), 'leads', lead.id)
    ).data;
    expect(managers.some((e) => e.recordId === hidden.id)).toBe(true);
    const repSees = (
      await service.list(actor('rep'), 'tasks', { leadId: lead.id })
    ).data.some((a) => a.id === hidden.id);
    expect(reps.some((e) => e.recordId === hidden.id)).toBe(repSees);
    // The task's own history is its own entries, as before.
    const own = (
      await service.historyOf(actor('rep'), 'tasks', toText(call.id))
    ).data;
    expect(own.map((entry) => entry.action)).toEqual([
      'status',
      'updated',
      'updated',
      'updated',
      'created',
    ]);
    expect(own.every((entry) => !('task' in entry))).toBe(true);
    // Handed to another owner, it is told with the owner alone.
    await service.save(
      actor('admin'),
      'tasks',
      { ownerId: 'manager', description: '经理接手' },
      toText(call.id),
    );
    expect(
      (await service.historyOf(actor('admin'), 'leads', lead.id)).data[0],
    ).toMatchObject({
      entity: 'tasks',
      action: 'updated',
      changes: { ownerId: 'manager' },
      previous: { ownerId: 'rep' },
    });
    // Deleted, it is told on the lead by name.
    await service.remove(actor('admin'), 'tasks', toText(call.id));
    expect(
      (await service.historyOf(actor('rep'), 'leads', lead.id)).data[0],
    ).toMatchObject({
      entity: 'leads',
      action: 'taskDeleted',
      actorId: 'admin',
      changes: {
        taskId: call.id,
        name: '需求摸底电话（二）',
      },
    });
    // The comments tab stays the comments alone.
    expect(
      (
        await service.historyOf(actor('rep'), 'leads', lead.id, {
          action: 'comment',
        })
      ).data,
    ).toEqual([]);
  });
});

describe('resolved titles and paged filters', () => {
  it('names every record a page refers to and filters tasks by date', async () => {
    const company = await service.save(actor('rep'), 'companies', {
      name: 'Titled company',
    });
    const contact = await service.save(actor('rep'), 'contacts', {
      name: 'Titled person',
      companyId: company.id,
    });
    const deal = await service.save(actor('rep'), 'opportunities', {
      name: 'Titled deal',
      companyId: company.id,
      amount: 12345,
      currency: 'CNY',
      contacts: [{ contactId: contact.id, role: 'other' }],
    });
    const task = await service.save(actor('rep'), 'tasks', {
      name: 'Titled call',
      companyId: company.id,
      opportunityId: deal.id,
      dueAt: '2031-03-10T09:00:00.000Z',
    });
    const approval = await service.save(actor('rep'), 'approvals', {
      name: 'Titled approval',
      opportunityId: deal.id,
      topic: 'discount',
      approverId: 'manager',
    });
    const page = async (path: string): Promise<Record<string, any>> =>
      (await request(path, 'rep').then((r) => r.json())) as Record<string, any>;
    // A contact and a deal carry their company in the title; the bare name
    // stays available for lists already scoped to that company.
    const contacts = await page(`/contacts?ids=${toText(contact.id)}`);
    expect(contacts.meta.titles[toText(contact.id)]).toBe(
      'Titled person / Titled company',
    );
    expect(contacts.meta.names[toText(contact.id)]).toBe('Titled person');
    const deals = await page(`/opportunities?ids=${toText(deal.id)}`);
    expect(deals.meta.titles[toText(deal.id)]).toBe(
      'Titled company / Titled deal',
    );
    expect(deals.meta.titles[toText(company.id)]).toBe('Titled company');
    expect(deals.meta.titles[toText(contact.id)]).toBe(
      'Titled person / Titled company',
    );
    // The approval list names the deal and carries its size for the column.
    const approvals = await page(`/approvals?ids=${toText(approval.id)}`);
    expect(approvals.meta.titles[toText(deal.id)]).toBe(
      'Titled company / Titled deal',
    );
    expect(approvals.meta.opportunities[toText(deal.id)]).toEqual({
      amount: 12345,
      currency: 'CNY',
    });
    // A detail page gets the names of what it links to and, for a deal, the
    // company's contacts to offer.
    const detail = await page(`/opportunities/${toText(deal.id)}`);
    expect(detail.data.titles[toText(company.id)]).toBe('Titled company');
    expect(
      detail.data.related.contacts.map((c: { id: string }) => c.id),
    ).toContain(contact.id);
    // Tasks by when they happen, for the calendar's month.
    const inMarch = await page(
      '/tasks?dueFrom=2031-03-01T00:00:00.000Z&dueTo=2031-03-31T23:59:59.999Z',
    );
    expect(inMarch.data.map((r: { id: string }) => r.id)).toContain(task.id);
    expect(inMarch.meta.titles[toText(deal.id)]).toBe(
      'Titled company / Titled deal',
    );
    const inApril = await page(
      '/tasks?dueFrom=2031-04-01T00:00:00.000Z&dueTo=2031-04-30T23:59:59.999Z',
    );
    expect(inApril.data.map((r: { id: string }) => r.id)).not.toContain(
      task.id,
    );
    // A picker leaves out one status, and the whole-table lookup is gone.
    const leads = await page('/leads?excludeStatus=new&pageSize=100');
    expect(
      leads.data.every((r: { status: string }) => r.status !== 'new'),
    ).toBe(true);
    expect((await request('/leads/lookup', 'rep')).status).toBe(404);
  });
  it("pages a detail page's related lists, its history and the AI actions", async () => {
    const company = await service.save(actor('rep'), 'companies', {
      name: 'Busy company',
    });
    for (let i = 0; i < 23; i++)
      await service.save(actor('rep'), 'contacts', {
        name: `Person ${toText(i)}`,
        companyId: company.id,
      });
    // Twenty-two history entries: the creation and twenty-one renames.
    for (let i = 0; i < 21; i++)
      await service.save(
        actor('rep'),
        'companies',
        { name: `Busy company ${toText(i)}` },
        toText(company.id),
      );
    const detail = (await request(
      `/companies/${toText(company.id)}`,
      'rep',
    ).then((r) => r.json())) as {
      data: {
        related: { contacts: unknown[] };
        relatedTotals: { contacts: number };
        history: unknown[];
        historyTotal: number;
      };
    };
    expect(detail.data.related.contacts).toHaveLength(20);
    expect(detail.data.relatedTotals.contacts).toBe(23);
    expect(detail.data.history).toHaveLength(20);
    expect(detail.data.historyTotal).toBe(22);
    const contacts = (await request(
      `/contacts?companyId=${toText(company.id)}&page=2&pageSize=20`,
      'rep',
    ).then((r) => r.json())) as { data: unknown[]; meta: { total: number } };
    expect(contacts.data).toHaveLength(3);
    expect(contacts.meta.total).toBe(23);
    const history = (await request(
      `/companies/${toText(company.id)}/history?page=2&pageSize=20`,
      'rep',
    ).then((r) => r.json())) as {
      data: unknown[];
      meta: { total: number; page: number };
    };
    expect(history.meta.page).toBe(2);
    expect(history.data).toHaveLength(2);
    expect(history.meta.total).toBe(22);
    // History is read within the reader's access, like the record.
    expect(
      (await request(`/companies/${toText(company.id)}/history`, 'outsider'))
        .status,
    ).toBe(403);
  });
  it('pages the workspace lists in fives and only for the reader', async () => {
    // Seven overdue tasks of the reader's own, one of somebody else's.
    const late = await service.save(actor('rep'), 'companies', {
      name: 'Late company',
    });
    for (let i = 0; i < 7; i++)
      await service.save(actor('rep'), 'tasks', {
        name: `Overdue ${toText(i)}`,
        companyId: late.id,
        dueAt: `2020-01-0${toText(i + 1)}T09:00:00.000Z`,
      });
    await service.save(actor('other'), 'tasks', {
      name: 'Someone else is late',
      companyId: late.id,
      dueAt: '2020-02-01T09:00:00.000Z',
    });
    // The reader's overdue tasks as the task list counts them. A task an
    // earlier test left due about now may fall due while the board is
    // read, so the board's count is between the counts before and after.
    const overdueNow = async () =>
      (
        await service.list(actor('rep'), 'tasks', {
          status: 'open',
          involvedId: 'rep',
          dueTo: new Date().toISOString(),
          pageSize: 1,
        })
      ).total;
    const before = await overdueNow();
    const board = (await request('/dashboard?scope=mine', 'rep').then((r) =>
      r.json(),
    )) as { data: { overdue: { data: { name: string }[]; total: number } } };
    const after = await overdueNow();
    expect(board.data.overdue.data).toHaveLength(5);
    expect(board.data.overdue.total).toBeGreaterThanOrEqual(before);
    expect(board.data.overdue.total).toBeLessThanOrEqual(after);
    expect(
      board.data.overdue.data.some((r) => r.name === 'Someone else is late'),
    ).toBe(false);
    const second = (await request(
      '/dashboard/overdue?scope=mine&page=2&pageSize=5',
      'rep',
    ).then((r) => r.json())) as {
      data: { name: string }[];
      meta: { page: number };
    };
    expect(second.meta.page).toBe(2);
    expect(second.data.length).toBeGreaterThan(0);
    expect(second.data.length).toBeLessThanOrEqual(5);
    expect((await request('/dashboard/nothing', 'rep')).status).toBe(400);
    // The team scope sees everyone's.
    const team = (await request(
      '/dashboard/overdue?scope=team&pageSize=100',
      'rep',
    ).then((r) => r.json())) as { data: { name: string }[] };
    expect(team.data.some((r) => r.name === 'Someone else is late')).toBe(true);
  });
});

it('maps legacy industry and country text to codes and back', async () => {
  const isolated = createDatabaseManager(
    defineDatabase({
      drivers: { sqlite },
      default: 'main',
      connections: {
        main: {
          dialect: 'sqlite',
          filename: ':memory:',
          schemaManagement: 'managed',
        },
      },
    }),
  );
  try {
    await isolated.connect();
    const migrator = isolated.createMigrator({
      directory: resolve('database/main/migrations'),
      packageName: 'crm',
    });
    // Before accounts became companies, the table the migration remaps.
    await migrator.upTo('202610080003_crm_record_notes_to_timeline');
    const query = isolated.query();
    await query
      .insertInto('crmAccounts')
      .values({
        id: 'legacy',
        name: 'Legacy Co',
        ownerId: 'rep',
        createdById: 'rep',
        source: 'website',
        status: 'prospect',
        industry: 'Software',
        country: 'China',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      .execute();
    const read = async (): Promise<Row | undefined> =>
      query
        .selectFrom('crmAccounts')
        .select(['industry', 'country'])
        .where('id', '=', 'legacy')
        .executeTakeFirst();
    const context = { query, builder: isolated.builder() };
    await geographyMigration.up(context as never);
    expect(await read()).toMatchObject({
      industry: 'technology',
      country: 'CN',
    });
    await geographyMigration.down?.(context as never);
    expect(await read()).toMatchObject({
      industry: 'Software',
      country: 'China',
    });
  } finally {
    await isolated.destroy();
  }
});

it('rejects country and subdivision values outside ISO 3166', async () => {
  await expect(
    service.save(actor('rep'), 'leads', {
      name: 'Bad country',
      country: 'Neverland',
    }),
  ).rejects.toMatchObject({ code: 'invalidInput', field: 'country' });
  // A real subdivision, but not one of this country's.
  await expect(
    service.save(actor('rep'), 'leads', {
      name: 'Mismatched subdivision',
      country: 'CN',
      state: 'US-NY',
    }),
  ).rejects.toMatchObject({ code: 'invalidInput', field: 'state' });
  await expect(
    service.save(actor('rep'), 'leads', {
      name: 'Subdivision without country',
      state: 'CN-11',
    }),
  ).rejects.toMatchObject({ code: 'invalidInput', field: 'state' });
  const lead = await service.save(actor('rep'), 'leads', {
    name: 'Valid geography',
    country: 'CN',
    state: 'CN-11',
    city: 'Beijing',
    industry: 'technology',
  });
  // City is free text and deliberately unconstrained.
  expect(lead).toMatchObject({
    country: 'CN',
    state: 'CN-11',
    city: 'Beijing',
  });
});

it('reverses the CRM migration on a real SQLite database', async () => {
  const isolated = createDatabaseManager(
    defineDatabase({
      drivers: { sqlite },
      default: 'main',
      connections: {
        main: {
          dialect: 'sqlite',
          filename: ':memory:',
          schemaManagement: 'managed',
        },
      },
    }),
  );
  try {
    await isolated.connect();
    const migrator = isolated.createMigrator({
      directory: resolve('database/main/migrations'),
      packageName: 'crm',
    });
    expect(
      (await migrator.upTo('202609300002_crm_history_note_edits')).executed,
    ).toHaveLength(30);
    // An activity saved as a no-show before that status went.
    const at = new Date().toISOString();
    const activity = (values: Record<string, unknown>) =>
      isolated
        .query()
        .insertInto('crmActivities')
        .values({
          ownerId: 'rep',
          startAt: at,
          endAt: at,
          createdById: 'rep',
          createdAt: at,
          updatedAt: at,
          ...values,
        })
        .execute();
    await activity({
      id: 'no-show',
      type: 'call',
      name: 'Missed call',
      status: 'noShow',
    });
    expect(
      (await migrator.upTo('202610060001_create_device_code')).executed,
    ).toEqual([
      '202610020001_crm_activities_no_show_cancelled',
      '202610020002_crm_activities_end_optional',
      '202610030001_crm_phone_numbers',
      // The template's device authorization table (template 1.0.0-beta.56).
      '202610060001_create_device_code',
    ]);
    // An activity may now have no end ...
    await activity({
      id: 'no-end',
      type: 'email',
      name: 'Quick email',
      status: 'planned',
      endAt: null,
    });
    // ... and a no-show is cancelled now.
    expect(
      await isolated
        .query()
        .selectFrom('crmActivities')
        .select('status')
        .where('id', '=', 'no-show')
        .executeTakeFirst(),
    ).toEqual({ status: 'cancelled' });
    expect(await isolated.builder().hasCollection('crmLeads')).toBe(true);
    // A note's edit time, from 202609300002_crm_history_note_edits.
    expect(
      await isolated
        .query()
        .selectFrom('crmHistory')
        .select('editedAt')
        .execute(),
    ).toEqual([]);
    // Activities give way to tasks, starting empty, and the timeline takes
    // entries brought in from mail.
    expect(
      (await migrator.upTo('202610080002_crm_history_sources')).executed,
    ).toEqual(['202610080001_crm_tasks', '202610080002_crm_history_sources']);
    expect(await isolated.builder().hasCollection('crmActivities')).toBe(false);
    expect(
      await isolated.query().selectFrom('crmTasks').select('id').execute(),
    ).toEqual([]);
    // A task needs no due time.
    await isolated
      .query()
      .insertInto('crmTasks')
      .values({
        id: 'undated',
        name: 'Send the case study',
        status: 'open',
        ownerId: 'rep',
        createdById: 'rep',
        createdAt: at,
        updatedAt: at,
      })
      .execute();
    await isolated
      .query()
      .insertInto('crmHistory')
      .values({
        id: 'mail-entry',
        entity: 'leads',
        recordId: 'lead',
        actorId: 'rep',
        action: 'mail',
        changes: '{}',
        sourceKey: 'account:conversation',
        occurredAt: at,
        createdAt: at,
      })
      .execute();
    // An account's and a contact's Notes field becomes a note in their
    // timelines, written by the owner at the record's last change, and the
    // column goes; down puts it back.
    await isolated
      .query()
      .insertInto('crmAccounts')
      .values({
        id: 'account',
        name: 'Noted account',
        ownerId: 'rep',
        createdById: 'manager',
        createdAt: at,
        updatedAt: at,
        status: 'customer',
        source: 'website',
        notes: 'Moved to a competitor.',
      })
      .execute();
    await isolated
      .query()
      .insertInto('crmContacts')
      .values({
        id: 'contact',
        name: 'Noted contact',
        accountId: 'account',
        ownerId: 'rep',
        createdById: 'rep',
        createdAt: at,
        updatedAt: at,
        notes: '  ',
      })
      .execute();
    expect(
      (await migrator.upTo('202610080003_crm_record_notes_to_timeline'))
        .executed,
    ).toEqual(['202610080003_crm_record_notes_to_timeline']);
    const moved = await isolated
      .query()
      .selectFrom('crmHistory')
      .select(['entity', 'recordId', 'actorId', 'action', 'changes'])
      .where('action', '=', 'note')
      .execute();
    expect(moved).toHaveLength(1);
    expect(moved[0]).toMatchObject({
      entity: 'accounts',
      recordId: 'account',
      actorId: 'rep',
    });
    expect(JSON.stringify(moved[0].changes)).toContain(
      'Moved to a competitor.',
    );
    expect(
      Object.keys(
        (await isolated
          .query()
          .selectFrom('crmAccounts')
          .selectAll()
          .executeTakeFirstOrThrow()) as object,
      ),
    ).not.toContain('notes');
    // Accounts become companies on the whole schema, and back.
    expect(
      (await migrator.upTo('202610100001_crm_companies')).executed,
    ).toEqual(['202610100001_crm_companies']);
    expect(
      await isolated
        .query()
        .selectFrom('crmContacts')
        .select(['companyId'])
        .executeTakeFirstOrThrow(),
    ).toEqual({ companyId: 'account' });
    expect(
      await isolated
        .query()
        .selectFrom('crmHistory')
        .select(['entity'])
        .where('action', '=', 'note')
        .execute(),
    ).toEqual([{ entity: 'companies' }]);
    // A note may reply to another: the replies go with the column, back.
    expect(
      (await migrator.upTo('202610100002_crm_history_reply_to')).executed,
    ).toEqual(['202610100002_crm_history_reply_to']);
    const [kept] = await isolated
      .query()
      .selectFrom('crmHistory')
      .select(['id', 'entity', 'recordId'])
      .where('action', '=', 'note')
      .execute();
    await isolated
      .query()
      .insertInto('crmHistory')
      .values({
        id: 'reply',
        entity: kept.entity,
        recordId: kept.recordId,
        actorId: 'rep',
        action: 'note',
        changes: JSON.stringify({ text: 'Agreed.' }),
        replyToId: kept.id,
        createdAt: at,
      })
      .execute();
    // Notes become comments, their edits and merges' counts with them, and
    // back.
    await isolated
      .query()
      .insertInto('crmHistory')
      .values([
        {
          id: 'note-edit',
          entity: kept.entity,
          recordId: kept.recordId,
          actorId: 'rep',
          action: 'noteEdited',
          changes: JSON.stringify({ text: 'Agreed.', noteId: 'reply' }),
          createdAt: at,
        },
        {
          id: 'merge',
          entity: kept.entity,
          recordId: kept.recordId,
          actorId: 'rep',
          action: 'merged',
          changes: JSON.stringify({ lead: {}, tasks: 1, notes: 2 }),
          createdAt: at,
        },
      ])
      .execute();
    const actions = async () =>
      (
        await isolated
          .query()
          .selectFrom('crmHistory')
          .select(['id', 'action', 'changes'])
          .where('id', 'in', ['reply', 'note-edit', 'merge'])
          .orderBy('id')
          .execute()
      ).map((row) => [row.id, row.action, JSON.parse(toText(row.changes))]);
    expect((await migrator.upTo('202610100003_crm_comments')).executed).toEqual(
      ['202610100003_crm_comments'],
    );
    expect(await actions()).toEqual([
      ['merge', 'merged', { lead: {}, tasks: 1, comments: 2 }],
      ['note-edit', 'commentEdited', { text: 'Agreed.', commentId: 'reply' }],
      ['reply', 'comment', { text: 'Agreed.' }],
    ]);
    expect((await migrator.rollback()).rolledBack).toEqual([
      '202610100003_crm_comments',
    ]);
    expect(await actions()).toEqual([
      ['merge', 'merged', { lead: {}, tasks: 1, notes: 2 }],
      ['note-edit', 'noteEdited', { text: 'Agreed.', noteId: 'reply' }],
      ['reply', 'note', { text: 'Agreed.' }],
    ]);
    await isolated
      .query()
      .deleteFrom('crmHistory')
      .where('id', 'in', ['note-edit', 'merge'])
      .execute();
    expect((await migrator.rollback()).rolledBack).toEqual([
      '202610100002_crm_history_reply_to',
    ]);
    expect(
      await isolated
        .query()
        .selectFrom('crmHistory')
        .select('id')
        .where('id', '=', 'reply')
        .execute(),
    ).toEqual([]);
    expect((await migrator.rollback()).rolledBack).toEqual([
      '202610100001_crm_companies',
    ]);
    expect(await isolated.builder().hasCollection('crmCompanies')).toBe(false);
    expect(
      await isolated
        .query()
        .selectFrom('crmContacts')
        .select(['accountId'])
        .executeTakeFirstOrThrow(),
    ).toEqual({ accountId: 'account' });
    expect((await migrator.rollback()).rolledBack).toEqual([
      '202610080003_crm_record_notes_to_timeline',
    ]);
    expect(
      await isolated
        .query()
        .selectFrom('crmAccounts')
        .select('notes')
        .executeTakeFirstOrThrow(),
    ).toEqual({ notes: 'Moved to a competitor.' });
    await isolated
      .query()
      .deleteFrom('crmContacts')
      .where('id', '=', 'contact')
      .execute();
    await isolated
      .query()
      .deleteFrom('crmAccounts')
      .where('id', '=', 'account')
      .execute();
    // Each run is a batch, rolled back the last one first: tasks give way
    // to an empty activities table again, without the mail entries ...
    expect((await migrator.rollback()).rolledBack).toEqual([
      '202610080002_crm_history_sources',
      '202610080001_crm_tasks',
    ]);
    expect(await isolated.builder().hasCollection('crmTasks')).toBe(false);
    expect(
      await isolated.query().selectFrom('crmHistory').select('id').execute(),
    ).toEqual([]);
    // ... where an activity without an end takes its start once the next
    // batch is rolled back.
    await activity({
      id: 'no-end',
      type: 'email',
      name: 'Quick email',
      status: 'planned',
      endAt: null,
    });
    expect((await migrator.rollback()).rolledBack).toEqual([
      '202610060001_create_device_code',
      '202610030001_crm_phone_numbers',
      '202610020002_crm_activities_end_optional',
      '202610020001_crm_activities_no_show_cancelled',
    ]);
    const filled = await isolated
      .query()
      .selectFrom('crmActivities')
      .select(['startAt', 'endAt'])
      .where('id', '=', 'no-end')
      .executeTakeFirstOrThrow();
    expect(filled.endAt).toEqual(filled.startAt);
    expect((await migrator.rollback()).rolledBack).toHaveLength(30);
    expect(await isolated.builder().hasCollection('crmLeads')).toBe(false);
    expect(await isolated.builder().hasCollection('crmAccounts')).toBe(false);
  } finally {
    await isolated.destroy();
  }
});

it('rewrites legacy epoch timestamps so repository reads succeed', async () => {
  const isolated = createDatabaseManager(
    defineDatabase({
      drivers: { sqlite },
      default: 'main',
      connections: {
        main: {
          dialect: 'sqlite',
          filename: ':memory:',
          schemaManagement: 'managed',
        },
      },
    }),
  );
  try {
    await isolated.connect();
    const schedulerRoot = resolve(
      'node_modules/@nocobase/app-plugin-scheduler',
    );
    await isolated
      .createMigrator({
        sources: [
          {
            packageName: 'scheduler',
            directory: resolve(schedulerRoot, 'dist/database/migrations'),
          },
          {
            packageName: 'crm',
            directory: resolve('database/main/migrations'),
          },
        ],
      })
      .latest();
    const query = isolated.query();
    const started = Date.UTC(2026, 8, 13, 1, 30, 28, 587);
    // What the scheduler's first release and the CRM's first provisioning
    // wrote: a Date through the raw query builder, stored as a number.
    await query
      .insertInto('scheduleSyncLocks')
      .values({ appName: 'main', createdAt: started, updatedAt: started })
      .execute();
    await query
      .insertInto('crmSettings')
      .values({ id: 'legacy', value: '{}', updatedAt: started })
      .execute();
    await legacyTimestampsMigration.up({
      builder: isolated.builder(),
      query,
      connection: isolated.connection(),
    });
    const lock = await query
      .selectFrom('scheduleSyncLocks')
      .selectAll()
      .where('appName', '=', 'main')
      .executeTakeFirstOrThrow();
    expect(lock.createdAt).toBe('2026-09-13T01:30:28.587Z');
    expect(lock.updatedAt).toBe('2026-09-13T01:30:28.587Z');
    const setting = await query
      .selectFrom('crmSettings')
      .selectAll()
      .where('id', '=', 'legacy')
      .executeTakeFirstOrThrow();
    expect(setting.updatedAt).toBe('2026-09-13T01:30:28.587Z');
    // The scheduler now reads its lock through the repository at startup.
    const read = await isolated
      .connection()
      .repository('scheduleSyncLocks')
      .findOne({ filter: { appName: 'main' } });
    expect(read?.createdAt).toBeTruthy();
    // Already an instant: left alone on a second run.
    await legacyTimestampsMigration.up({
      builder: isolated.builder(),
      query,
      connection: isolated.connection(),
    });
    expect(
      (
        await query
          .selectFrom('crmSettings')
          .select('updatedAt')
          .where('id', '=', 'legacy')
          .executeTakeFirstOrThrow()
      ).updatedAt,
    ).toBe('2026-09-13T01:30:28.587Z');
  } finally {
    await isolated.destroy();
  }
});

describe('approval notifications', () => {
  const approvalFor = async (crm: CrmService, name: string) => {
    const company = await crm.save(actor('rep'), 'companies', { name });
    const opportunity = await crm.save(actor('rep'), 'opportunities', {
      name: `${name} deal`,
      companyId: company.id,
    });
    return crm.save(actor('rep'), 'approvals', {
      name: `${name} request`,
      opportunityId: opportunity.id,
      topic: 'discount',
      description: 'Terms',
      approverId: 'manager',
    });
  };
  const outboxEvents = async (recordId: unknown) =>
    (
      await database
        .query()
        .selectFrom('crmOutbox')
        .select(['id', 'event', 'recipientId', 'createdAt'])
        .where('recordId', '=', recordId)
        .orderBy('createdAt')
        .execute()
    ).map((r) => [toText(r.event), toText(r.recipientId), toText(r.id)]);

  it('queues a message for every approval event once it is committed', async () => {
    const approval = await approvalFor(service, 'Notified company');
    const submitted = await service.approvalAction(
      actor('rep'),
      approval.id,
      'submit',
    );
    const withdrawn = await service.approvalAction(
      actor('rep'),
      approval.id,
      'withdraw',
    );
    await service.approvalAction(actor('rep'), approval.id, 'submit');
    const decided = await service.approvalAction(
      actor('manager'),
      approval.id,
      'reject',
      'No',
    );
    const events = await outboxEvents(approval.id);
    expect(events.map(([event, recipient]) => [event, recipient])).toEqual([
      ['pending', 'manager'],
      ['withdrawn', 'manager'],
      ['pending', 'manager'],
      ['rejected', 'rep'],
    ]);
    expect(events.map(([, , id]) => id)).toEqual(
      expect.arrayContaining([
        `approval-notification:${toText(approval.id)}:pending:${toText(submitted.updatedAt)}`,
        `approval-notification:${toText(approval.id)}:withdrawn:${toText(withdrawn.updatedAt)}`,
        `approval-notification:${toText(approval.id)}:rejected:${toText(decided.updatedAt)}`,
      ]),
    );
    // Asked again for the same event, nothing more is queued.
    expect(await service.notifyApproval(actor('manager'), decided)).toBe(false);
    expect(await outboxEvents(approval.id)).toHaveLength(4);
  });

  it('queues nothing while the settings switch approval messages off', async () => {
    await service.saveSettings(actor('admin'), { notifyApprovals: false });
    try {
      const approval = await approvalFor(service, 'Quiet company');
      await service.approvalAction(actor('rep'), approval.id, 'submit');
      const decided = await service.approvalAction(
        actor('manager'),
        approval.id,
        'approve',
      );
      expect(decided.status).toBe('approved');
      expect(await outboxEvents(approval.id)).toEqual([]);
      await expect(
        service.saveSettings(actor('admin'), { notifyApprovals: 'no' }),
      ).rejects.toMatchObject({ code: 'invalidInput' });
    } finally {
      await service.saveSettings(actor('admin'), { notifyApprovals: true });
    }
  });
});

describe('record notifications', () => {
  const queued = async (recordId: unknown) =>
    (
      await database
        .query()
        .selectFrom('crmOutbox')
        .select(['id', 'event', 'recipientId', 'createdAt'])
        .where('recordId', '=', recordId)
        .orderBy('createdAt')
        .execute()
    ).map((r) => [toText(r.event), toText(r.recipientId), toText(r.id)]);

  it('tells the colleagues a comment mentions, each once', async () => {
    const lead = await service.save(actor('rep'), 'leads', {
      name: 'Mentioned lead',
      ownerId: 'rep',
    });
    // The writer and an unknown account are dropped; the manager is kept.
    const comment = await service.addComment(
      actor('rep'),
      'leads',
      toText(lead.id),
      '@Manager please look',
      ['manager', 'rep', 'nobody', 'manager'],
    );
    expect(comment.changes).toEqual({
      text: '@Manager please look',
      mentions: ['manager'],
    });
    await vi.waitFor(async () =>
      expect(await queued(lead.id)).toEqual([
        [
          'mentioned',
          'manager',
          `record-notification:leads:${toText(lead.id)}:mentioned:manager:${toText(comment.id)}`,
        ],
      ]),
    );
    // An edit tells only whom it adds.
    const edited = await service.editComment(
      actor('rep'),
      toText(comment.id),
      '@Manager @Other please look',
      ['manager', 'other'],
    );
    expect(edited.changes).toEqual({
      text: '@Manager @Other please look',
      mentions: ['manager', 'other'],
    });
    await vi.waitFor(async () =>
      expect(
        (await queued(lead.id)).map(([event, recipient]) => [event, recipient]),
      ).toEqual([
        ['mentioned', 'manager'],
        ['mentioned', 'other'],
      ]),
    );
  });

  it('tells of mentions under their own switch, not the record changes one', async () => {
    const lead = await service.save(actor('rep'), 'leads', {
      name: 'Quietly mentioned lead',
      ownerId: 'rep',
    });
    // Record changes off: a mention is still told.
    await service.saveSettings(actor('admin'), { notifyRecordChanges: false });
    try {
      await service.addComment(
        actor('rep'),
        'leads',
        toText(lead.id),
        '@Manager a look',
        ['manager'],
      );
      await vi.waitFor(async () =>
        expect(
          (await queued(lead.id)).map(([event, recipient]) => [
            event,
            recipient,
          ]),
        ).toEqual([['mentioned', 'manager']]),
      );
    } finally {
      await service.saveSettings(actor('admin'), {
        notifyRecordChanges: true,
      });
    }
    // Comments off: the next mention is not.
    await service.saveSettings(actor('admin'), { notifyComments: false });
    try {
      await service.addComment(
        actor('rep'),
        'leads',
        toText(lead.id),
        '@Other another look',
        ['other'],
      );
      await new Promise((resolve) => setTimeout(resolve, 50));
      expect(
        (await queued(lead.id)).map(([event, recipient]) => [event, recipient]),
      ).toEqual([['mentioned', 'manager']]);
    } finally {
      await service.saveSettings(actor('admin'), { notifyComments: true });
    }
  });

  it('attaches files to a comment, which the readers of its record may then open', async () => {
    const lead = await service.save(actor('rep'), 'leads', {
      name: 'Comment file lead',
      ownerId: 'rep',
    });
    const id = toText(lead.id);
    const query = database.query();
    for (const [file, owner] of [
      ['comment-file', 'rep'],
      ['someone-elses-file', 'other'],
    ]) {
      await query
        .insertInto('crmFiles')
        .values({
          id: file,
          disk: 'local',
          key: file,
          filename: `${file}.pdf`,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .execute();
      await query
        .insertInto('crmFileUploads')
        .values({ id: file, ownerId: owner })
        .execute();
    }
    expect(await service.canReadFile(actor('manager'), 'comment-file')).toBe(
      false,
    );
    // Files alone say something; a file the writer may not read is refused.
    await expect(
      service.addComment(actor('rep'), 'leads', id, '', [], undefined, [
        'someone-elses-file',
      ]),
    ).rejects.toMatchObject({ code: 'notFound' });
    const comment = await service.addComment(
      actor('rep'),
      'leads',
      id,
      '',
      [],
      undefined,
      ['comment-file', 'comment-file'],
    );
    expect(comment.changes).toEqual({
      text: '',
      attachments: ['comment-file'],
    });
    expect(await service.canReadFile(actor('manager'), 'comment-file')).toBe(
      true,
    );
    expect(await service.commentFiles(actor('manager'), 'leads', id)).toEqual([
      { fileId: 'comment-file', commentId: comment.id, actorId: 'rep' },
    ]);
    // An edit that leaves the files out keeps them; one that takes them
    // away leaves the file to its uploader again, and with no text either
    // says nothing.
    await service.editComment(actor('rep'), toText(comment.id), 'The quote');
    expect(await service.commentFiles(actor('rep'), 'leads', id)).toHaveLength(
      1,
    );
    await expect(
      service.editComment(actor('rep'), toText(comment.id), ' ', [], []),
    ).rejects.toMatchObject({ code: 'invalidInput' });
    await service.editComment(
      actor('rep'),
      toText(comment.id),
      'The quote',
      [],
      [],
    );
    expect(await service.canReadFile(actor('manager'), 'comment-file')).toBe(
      false,
    );
    expect(await service.canReadFile(actor('rep'), 'comment-file')).toBe(true);
  });

  it('threads replies under a comment, tells the thread, and keeps it when the comment goes', async () => {
    const lead = await service.save(actor('rep'), 'leads', {
      name: 'Thread lead',
      ownerId: 'rep',
    });
    const id = toText(lead.id);
    const comment = await service.addComment(
      actor('rep'),
      'leads',
      id,
      'Called.',
    );
    const first = await service.addComment(
      actor('manager'),
      'leads',
      id,
      'What did they say?',
      [],
      comment.id,
    );
    // A reply to a reply hangs under that reply, in the same thread.
    const second = await service.addComment(
      actor('other'),
      'leads',
      id,
      '@Rep they want a demo',
      ['rep'],
      first.id,
    );
    expect(second.replyToId).toBe(first.id);
    // The author was told of the first reply; the second tells the earlier
    // replier, and the author through the mention only.
    await vi.waitFor(async () =>
      expect(
        (await queued(lead.id)).map(([event, recipient]) => [event, recipient]),
      ).toEqual([
        ['replied', 'rep'],
        ['mentioned', 'rep'],
        ['replied', 'manager'],
      ]),
    );
    // The timeline reads the thread as one entry, its replies oldest first.
    const timeline = (await service.historyOf(actor('rep'), 'leads', id)).data;
    const entry = timeline.find((row) => row.id === comment.id);
    expect(timeline.filter((row) => row.action === 'comment')).toHaveLength(1);
    expect(
      (entry?.replies as { id: string }[]).map((reply) => reply.id),
    ).toEqual([first.id, second.id]);
    // A comment of another record is no thread to join.
    const elsewhere = await service.save(actor('rep'), 'leads', {
      name: 'Other lead',
      ownerId: 'rep',
    });
    await expect(
      service.addComment(
        actor('rep'),
        'leads',
        toText(elsewhere.id),
        'x',
        [],
        comment.id,
      ),
    ).rejects.toMatchObject({ code: 'notFound' });
    // The comment goes, the thread stays under its empty place; a reply with
    // one under it does the same; the last reply going takes every empty
    // place above it with it.
    await service.removeComment(actor('rep'), toText(comment.id));
    const kept = (await service.historyOf(actor('rep'), 'leads', id)).data.find(
      (row) => row.id === comment.id,
    );
    expect(kept?.changes).toEqual({ text: '', deleted: true });
    expect(kept?.replies).toHaveLength(2);
    await expect(
      service.editComment(actor('rep'), toText(comment.id), 'Back', []),
    ).rejects.toMatchObject({ code: 'notFound' });
    await service.removeComment(actor('manager'), toText(first.id));
    await service.removeComment(actor('other'), toText(second.id));
    expect(
      (await service.historyOf(actor('rep'), 'leads', id)).data.some(
        (row) => row.action === 'comment' || row.action === 'commentDeleted',
      ),
    ).toBe(false);
  });

  it('queues a message for a change of hands and for participant changes, once committed', async () => {
    const lead = await service.save(actor('manager'), 'leads', {
      name: 'Handoff lead',
      ownerId: 'rep',
    });
    // The new owner is told; the manager who did it is not.
    expect(await queued(lead.id)).toEqual([
      [
        'assigned',
        'rep',
        `record-notification:leads:${toText(lead.id)}:assigned:rep:${toText(lead.updatedAt)}`,
      ],
    ]);
    const meeting = await service.save(actor('rep'), 'tasks', {
      name: 'Handoff meeting',
      leadId: lead.id,
      dueAt: '2026-10-01T02:00:00.000Z',
      internalParticipants: ['other'],
    });
    await service.save(
      actor('rep'),
      'tasks',
      { dueAt: '2026-10-01T04:00:00.000Z' },
      meeting.id,
    );
    await service.save(
      actor('rep'),
      'tasks',
      { internalParticipants: [] },
      meeting.id,
    );
    expect(
      (await queued(meeting.id)).map(([event, recipient]) => [
        event,
        recipient,
      ]),
    ).toEqual([
      ['invited', 'other'],
      ['rescheduled', 'other'],
      ['removed', 'other'],
    ]);
  });

  it('queues nothing when the change is rolled back, or while switched off', async () => {
    const before = (
      await database.query().selectFrom('crmOutbox').select('id').execute()
    ).length;
    await expect(
      service.save(actor('manager'), 'leads', {
        name: 'Rolled back',
        ownerId: 'no-such-user',
      }),
    ).rejects.toBeDefined();
    expect(
      (await database.query().selectFrom('crmOutbox').select('id').execute())
        .length,
    ).toBe(before);
    await service.saveSettings(actor('admin'), { notifyRecordChanges: false });
    try {
      const lead = await service.save(actor('manager'), 'leads', {
        name: 'Quiet handoff',
        ownerId: 'rep',
      });
      expect(await queued(lead.id)).toEqual([]);
    } finally {
      await service.saveSettings(actor('admin'), {
        notifyRecordChanges: true,
      });
    }
  });
});

describe('comments in the activity feed', () => {
  it('lets anyone who may read a record add a comment, and only its author change or remove it', async () => {
    const lead = await service.save(actor('rep'), 'leads', {
      name: 'Noted',
      source: 'website',
    });
    const id = toText(lead.id);
    // Unauthenticated, empty, or for someone who may not read the lead.
    expect(
      (await request(`/leads/${id}/comments`, undefined, 'POST', { text: 'x' }))
        .status,
    ).toBe(401);
    expect(
      (await request(`/leads/${id}/comments`, 'rep', 'POST', { text: '  ' }))
        .status,
    ).toBe(400);
    expect(
      (
        await request(`/leads/${id}/comments`, 'outsider', 'POST', {
          text: 'x',
        })
      ).status,
    ).toBe(403);
    // The owner, and another rep who may read but not edit the lead.
    const own = await (
      await request(`/leads/${id}/comments`, 'rep', 'POST', {
        text: 'Already runs SAP; wants an integration only.',
      })
    ).json();
    expect(
      (
        await request(`/leads/${id}/comments`, 'other', 'POST', {
          text: 'Seen',
        })
      ).status,
    ).toBe(201);
    const feed = await service.historyOf(actor('rep'), 'leads', id);
    const comments = feed.data.filter((entry) => entry.action === 'comment');
    expect(
      comments.map((comment) => object(comment.changes).text).sort(),
    ).toEqual(['Already runs SAP; wants an integration only.', 'Seen']);
    // Comments can be read alone (the AI follow-ups read them so).
    expect(
      (
        await service.historyOf(actor('rep'), 'leads', id, {
          action: 'comment',
        })
      ).data.every((entry) => entry.action === 'comment'),
    ).toBe(true);
    // A person's comment counts among the people's entries.
    expect(
      (
        await service.historyOf(actor('rep'), 'leads', id, { source: 'user' })
      ).data.filter((entry) => entry.action === 'comment'),
    ).toHaveLength(2);
    // Only the author changes or removes it.
    const commentId = toText(own.data.id);
    expect(
      (
        await request(`/comments/${commentId}`, 'other', 'PATCH', {
          text: 'Not mine',
        })
      ).status,
    ).toBe(403);
    expect(
      (await request(`/comments/${commentId}`, 'other', 'DELETE')).status,
    ).toBe(403);
    const edited = await (
      await request(`/comments/${commentId}`, 'rep', 'PATCH', {
        text: 'Runs SAP ECC; integration only.',
      })
    ).json();
    expect(object(edited.data.changes).text).toBe(
      'Runs SAP ECC; integration only.',
    );
    const [after] = (
      await service.historyOf(actor('rep'), 'leads', id)
    ).data.filter((entry) => entry.id === commentId);
    expect(after?.editedAt).toBeTruthy();
    expect(object(after?.previous).text).toBe(
      'Already runs SAP; wants an integration only.',
    );
    // The feed says, at the time of the edit, who changed which comment (the
    // timeline leads there) and to what; the comments tab lists the comment alone.
    expect(
      (await service.historyOf(actor('rep'), 'leads', id)).data,
    ).toContainEqual(
      expect.objectContaining({
        action: 'commentEdited',
        actorId: 'rep',
        changes: { text: 'Runs SAP ECC; integration only.', commentId },
      }),
    );
    expect(
      (
        await service.historyOf(actor('rep'), 'leads', id, {
          action: 'comment',
        })
      ).data.some((entry) => entry.action === 'commentEdited'),
    ).toBe(false);
    // Other entries are not comments and stay as they are.
    const created = feed.data.find((entry) => entry.action === 'created');
    expect(
      (
        await request(`/comments/${toText(created?.id)}`, 'rep', 'PATCH', {
          text: 'x',
        })
      ).status,
    ).toBe(404);
    expect(
      (await request(`/comments/${commentId}`, 'rep', 'DELETE')).status,
    ).toBe(204);
    const after2 = (await service.historyOf(actor('rep'), 'leads', id)).data;
    expect(after2.some((entry) => entry.id === commentId)).toBe(false);
    // The feed says a comment was removed, and by whom, without its text.
    expect(after2).toContainEqual(
      expect.objectContaining({
        action: 'commentDeleted',
        actorId: 'rep',
        changes: {},
      }),
    );
  });
});

describe('duplicate leads and their merge', () => {
  it('matches the same email, phone or person whatever their formatting', () => {
    expect(
      matchReasons(
        {
          email: 'Li@Example.test',
          phone: '138 0143 3591',
          name: '李雷',
          company: '远航物流',
        },
        {
          email: 'li@example.test',
          phone: '+86 13801433591',
          name: '李 雷',
          company: '远航物流有限公司',
        },
      ),
    ).toEqual(['email', 'phone', 'person']);
    expect(
      matchReasons(
        { name: '李雷', company: '远航物流', phone: '3591' },
        { name: '李雷', company: '远洋物流', phone: '+86 3591' },
      ),
    ).toEqual([]);
    // The same LinkedIn profile, written with or without the scheme, on a
    // country's subdomain or with a query.
    expect(
      matchReasons(
        { linkedin: 'https://www.linkedin.com/in/Li-Lei/?trk=x' },
        { linkedin: 'cn.linkedin.com/in/li-lei' },
      ),
    ).toEqual(['linkedin']);
    expect(
      matchReasons(
        { linkedin: 'linkedin.com/in/li-lei' },
        { linkedin: 'linkedin.com/company/li-lei' },
      ),
    ).toEqual([]);
  });
  it('finds a contact with the same LinkedIn profile as a lead not yet created', async () => {
    const company = await service.save(actor('rep'), 'companies', {
      name: 'LinkedIn Match Works',
    });
    const contact = await service.save(actor('rep'), 'contacts', {
      name: 'Ada Park',
      companyId: company.id,
      linkedin: 'https://www.linkedin.com/in/ada-park-match/',
    });
    const found = await findDuplicates(service, actor('rep'), {
      name: 'A. Park',
      linkedin: 'linkedin.com/in/Ada-Park-Match',
    });
    expect(found).toContainEqual(
      expect.objectContaining({
        entity: 'contacts',
        id: contact.id,
        matched: ['linkedin'],
      }),
    );
  });
  it('lists an open lead that repeats this one, and only to those who may read it', async () => {
    const first = await service.save(actor('rep'), 'leads', {
      name: '韩梅',
      company: '合并测试甲',
      email: 'han.mei@merge-a.test',
      source: 'website',
    });
    const second = await service.save(actor('rep'), 'leads', {
      name: '韩梅梅',
      company: '合并测试甲公司',
      email: 'HAN.MEI@merge-a.test',
      source: 'exhibition',
    });
    expect((await request(`/leads/${first.id}/duplicates`)).status).toBe(401);
    expect(
      (await request(`/leads/${first.id}/duplicates`, 'outsider')).status,
    ).toBe(403);
    const response = await request(`/leads/${first.id}/duplicates`, 'rep');
    expect(response.status).toBe(200);
    expect(((await response.json()) as { data: unknown[] }).data).toEqual([
      expect.objectContaining({
        id: second.id,
        matched: ['email'],
        mergeable: true,
      }),
    ]);
    // Without the assistant the proposal keeps the lead with more history.
    await service.save(actor('rep'), 'tasks', {
      name: '首次电话',
      status: 'open',
      dueAt: '2026-10-20T02:00:00Z',
      leadId: second.id,
    });
    const proposal = await mergeProposal(
      service,
      new ServiceContainer(),
      actor('rep'),
      first.id,
      { with: second.id },
    );
    expect(proposal).toMatchObject({ keepId: second.id, ai: false });
    expect(proposal.keepable.sort()).toEqual([first.id, second.id].sort());
  });
  it('merges one lead into another: picked values, tasks and comments moved, the merge on the timeline', async () => {
    const kept = await service.save(actor('rep'), 'leads', {
      name: '林涛',
      company: '合并测试乙',
      phone: '139 0000 1234',
      source: 'website',
      message: '想看演示',
    });
    const merged = await service.save(actor('rep'), 'leads', {
      name: '林涛',
      company: '合并测试乙有限公司',
      phone: '+86 13900001234',
      jobTitle: '技术总监',
      source: 'exhibition',
      message: '询问私有化报价',
    });
    const task = await service.save(actor('rep'), 'tasks', {
      name: '报价沟通',
      status: 'open',
      dueAt: '2026-10-21T02:00:00Z',
      leadId: merged.id,
    });
    await service.addComment(actor('rep'), 'leads', merged.id, '预算已批');
    const response = await request(`/leads/${kept.id}/merge`, 'rep', 'POST', {
      from: merged.id,
      picks: { company: merged.id, message: 'both' },
      followUp: false,
    });
    expect(response.status).toBe(200);
    const lead = await service.get(actor('rep'), 'leads', kept.id);
    expect(lead).toMatchObject({
      name: '林涛',
      company: '合并测试乙有限公司',
      // Empty on the kept lead, so the other's value, unasked.
      jobTitle: null,
      source: 'website',
      message: '想看演示\n\n---\n\n询问私有化报价',
    });
    await expect(
      service.get(actor('rep'), 'leads', merged.id),
    ).rejects.toMatchObject({ code: 'notFound' });
    expect(await service.get(actor('rep'), 'tasks', task.id)).toMatchObject({
      leadId: kept.id,
    });
    const history = (await service.historyOf(actor('rep'), 'leads', kept.id))
      .data;
    expect(history.find((e) => e.action === 'comment')).toMatchObject({
      changes: { text: '预算已批' },
    });
    expect(history.find((e) => e.action === 'merged')).toMatchObject({
      changes: {
        lead: { id: merged.id, company: '合并测试乙有限公司' },
        tasks: 1,
        comments: 1,
      },
    });
  });
  it('finds what a lead not yet created repeats, however it is written', async () => {
    const lead = await service.save(actor('rep'), 'leads', {
      name: '郑朗',
      company: '丰润食品集团',
      phone: '138 0245 3665',
      source: 'website',
    });
    const colleague = await service.save(actor('other'), 'leads', {
      name: '王五',
      company: '丰润食品',
      source: 'website',
    });
    const found = await findDuplicates(service, actor('rep'), {
      name: '郑朗',
      company: '丰润食品集团有限公司',
      phone: '+86 138-0245-3665',
    });
    expect(found.slice(0, 2)).toEqual([
      expect.objectContaining({
        entity: 'leads',
        id: lead.id,
        matched: ['phone', 'person'],
        mergeable: true,
      }),
      // The same company, another person: worth knowing, not to merge.
      expect.objectContaining({
        entity: 'leads',
        id: colleague.id,
        matched: ['company'],
        mergeable: false,
      }),
    ]);
  });
  it('merges a lead not yet saved into the one the CRM holds, creating nothing', async () => {
    const held = await service.save(actor('rep'), 'leads', {
      name: '罗雨萱',
      company: '合并测试丁',
      email: 'luo@merge-d.test',
      source: 'marketing',
      message: '下载了白皮书',
    });
    const input = {
      name: '罗雨轩',
      company: '合并测试丁',
      email: 'LUO@merge-d.test',
      jobTitle: '运营主管',
      source: 'exhibition',
      message: '想做巡店应用',
    };
    const proposal = await mergeProposal(
      service,
      new ServiceContainer(),
      actor('rep'),
      held.id,
      { input },
    );
    // The lead the CRM holds is kept; an email only in another case is
    // no choice to make.
    expect(proposal).toMatchObject({ keepId: held.id, keepable: [held.id] });
    expect(proposal.groups).not.toContain('email');
    expect(proposal.groups).toEqual(
      expect.arrayContaining(['name', 'jobTitle', 'source', 'message']),
    );
    const before = (await service.list(actor('rep'), 'leads', { pageSize: 1 }))
      .total;
    const response = await request(`/leads/${held.id}/merge`, 'rep', 'POST', {
      input,
      picks: { jobTitle: 'new', message: 'both' },
      followUp: false,
    });
    expect(response.status).toBe(200);
    expect(
      (await service.list(actor('rep'), 'leads', { pageSize: 1 })).total,
    ).toBe(before);
    expect(await service.get(actor('rep'), 'leads', held.id)).toMatchObject({
      name: '罗雨萱',
      jobTitle: '运营主管',
      source: 'marketing',
      message: '下载了白皮书\n\n---\n\n想做巡店应用',
    });
    const history = (await service.historyOf(actor('rep'), 'leads', held.id))
      .data;
    expect(history.find((e) => e.action === 'merged')).toMatchObject({
      source: 'capture',
      changes: { captured: true, lead: { name: '罗雨轩' } },
    });
    // A status is never taken from a lead that does not exist.
    expect(
      (
        await request(`/leads/${held.id}/merge`, 'rep', 'POST', {
          input,
          picks: { status: 'new' },
          followUp: false,
        })
      ).status,
    ).toBe(400);
  });
  it('refuses a merge the person may not make, or of leads that do not repeat each other', async () => {
    const mine = await service.save(actor('rep'), 'leads', {
      name: '周岚',
      company: '合并测试丙',
      email: 'zhou.lan@merge-c.test',
      source: 'website',
    });
    const theirs = await service.save(actor('other'), 'leads', {
      name: '周岚',
      company: '合并测试丙',
      email: 'zhou.lan@merge-c.test',
      source: 'website',
    });
    const unrelated = await service.save(actor('rep'), 'leads', {
      name: '吴迪',
      company: '无关公司',
      source: 'website',
    });
    expect(
      (
        await request(`/leads/${mine.id}/merge`, 'rep', 'POST', {
          from: theirs.id,
          followUp: false,
        })
      ).status,
    ).toBe(404);
    expect(
      (
        await request(`/leads/${mine.id}/merge`, 'rep', 'POST', {
          from: unrelated.id,
          followUp: false,
        })
      ).status,
    ).toBe(400);
    expect(await service.get(actor('other'), 'leads', theirs.id)).toBeTruthy();
  });
});

describe('phone numbers', () => {
  it('keeps a number one way however it was written', () => {
    for (const [written, kept] of [
      ['138 0000 5217', '13800005217'],
      ['+86 138-0145-3665', '13801453665'],
      ['008613801433591', '13801433591'],
      ['0571 8888 8888', '0571-88888888'],
      ['(010) 1234-5678', '010-12345678'],
      ['+86 571 8888 8888', '0571-88888888'],
      ['+1 415 555 0134', '+14155550134'],
      ['0571-88888888转8021', '0571-88888888-8021'],
      ['400-800-1234', '4008001234'],
      ['见名片', '见名片'],
    ])
      expect(normalizePhone(written)).toBe(kept);
    // Kept as kept: normalising again changes nothing.
    for (const kept of ['13800005217', '0571-88888888-8021', '+14155550134'])
      expect(normalizePhone(kept)).toBe(kept);
  });

  it("saves a lead's number so, and finds it however it is typed", async () => {
    const lead = await service.save(actor('rep'), 'leads', {
      name: '号码规范',
      company: '号码规范公司',
      phone: '+86 139-1234-0099',
      source: 'website',
    });
    expect(lead.phone).toBe('13912340099');
    const found = await service.list(actor('rep'), 'leads', {
      search: '139 1234 0099',
    });
    expect(found.data.map((l) => l.id)).toContain(lead.id);
  });

  it('migrates the numbers already kept', async () => {
    const query = service.database.query();
    await query
      .updateTable('crmContacts')
      .set({ phone: '138 0000 7788' })
      .where(
        'id',
        '=',
        (
          await service.save(actor('rep'), 'contacts', {
            name: '迁移号码',
            companyId: (
              await service.save(actor('rep'), 'companies', {
                name: '迁移号码客户',
              })
            ).id,
          })
        ).id,
      )
      .execute();
    await phoneMigration.up({
      query,
      builder: service.database.builder(),
    } as never);
    const row = await query
      .selectFrom('crmContacts')
      .select('phone')
      .where('name', '=', '迁移号码')
      .executeTakeFirst();
    expect(row?.phone).toBe('13800007788');
  });
});

describe('CRM opportunity capture', () => {
  it('organises a text into one opportunity on its company, matching its people and open deals', async () => {
    const enabled = vi
      .spyOn(service, 'assistantEnabled')
      .mockResolvedValue(true);
    try {
      const company = await service.save(actor('rep'), 'companies', {
        name: '商机整理精工有限公司',
      });
      const known = await service.save(actor('rep'), 'contacts', {
        name: '陈整理',
        companyId: company.id,
        phone: '13801119999',
      });
      const open = await service.save(actor('rep'), 'opportunities', {
        name: '在谈的生产平台',
        companyId: company.id,
        stage: 'proposal',
        source: 'website',
      });
      const container = new ServiceContainer();
      const { prompts } = fakeModel(container, {
        deal: {
          name: '仓库系统（专业版）',
          company: '商机整理精工',
          businessType: 'expansion',
          amount: '300000',
          currency: 'CNY',
          expectedCloseAt: '2026-11-30',
          stage: 'qualification',
          source: null,
          description: '想把仓库搬上来',
          people: [
            {
              name: '陈整理',
              jobTitle: null,
              phone: '138 0111 9999',
              email: null,
              role: 'champion',
            },
            {
              name: '孙新人',
              jobTitle: 'IT 负责人',
              phone: '139 2222 3456',
              email: null,
              role: 'evaluator',
            },
          ],
          uncertain: ['expectedCloseAt'],
        },
        reply: null,
      });
      const { deal } = await captureOpportunity(
        service,
        container,
        actor('rep'),
        { text: '商机整理精工的陈整理来信……' },
        'Asia/Shanghai',
      );
      expect(prompts[0]).toContain(
        'Organise the text below into one sales opportunity',
      );
      expect(deal.companies).toEqual([{ id: company.id, name: company.name }]);
      expect(deal.input).toMatchObject({
        companyId: company.id,
        name: '仓库系统（专业版）',
        amount: 300000,
        stage: 'qualification',
        // One list: the contact it matched, and the person new to the CRM,
        // created with the opportunity.
        contacts: [
          { contactId: known.id, role: 'champion' },
          {
            contactId: '',
            role: 'evaluator',
            person: {
              name: '孙新人',
              jobTitle: 'IT 负责人',
              phone: '13922223456',
              email: null,
            },
          },
        ],
      });
      // Not given by the text: left for the person.
      expect(deal.input).not.toHaveProperty('source');
      expect(deal.people[1]).toMatchObject({
        name: '孙新人',
        phone: '13922223456',
        contactId: null,
      });
      expect(deal.duplicates).toEqual([
        { id: open.id, name: '在谈的生产平台', stage: 'proposal' },
      ]);
      expect(deal.uncertain).toEqual(['expectedCloseAt']);
      // An adjustment shows the model everyone on the deal by name, a
      // contact by its record, and returns them in the same list.
      const adjusted = await captureOpportunity(
        service,
        container,
        actor('rep'),
        {
          text: '商机整理精工的陈整理来信……',
          instruction: '业务类型改成增购',
          companyId: company.id,
          deal: {
            ...deal.input,
            contacts: [
              { contactId: known.id, role: 'champion' },
              (deal.input.contacts as unknown[])[1],
            ],
          },
        },
        'Asia/Shanghai',
      );
      expect(prompts[1]).toContain('"name": "陈整理"');
      expect(prompts[1]).toContain('"name": "孙新人"');
      expect(prompts[1]).not.toContain('"contacts"');
      expect(adjusted.deal.input.contacts).toEqual(deal.input.contacts);
      // Another company picked: nobody matches there.
      const other = await service.save(actor('rep'), 'companies', {
        name: '另一家整理客户',
      });
      const again = await matchCompany(service, actor('rep'), other.id, [
        deal.people[0],
      ]);
      expect(again).toEqual({
        people: [expect.objectContaining({ contactId: null })],
        contacts: [
          expect.objectContaining({
            contactId: '',
            person: expect.objectContaining({ name: '陈整理' }),
          }),
        ],
        duplicates: [],
      });
    } finally {
      enabled.mockRestore();
    }
  });
});

describe('the tasks a follow-up reads', () => {
  // A next step carries on a planned task by its reference; one done or
  // called off has no id to carry on, so pointing at it plans a new one.
  it('lets only a planned task be carried on', async () => {
    const company = await service.save(actor('rep'), 'companies', {
      name: '沿用活动客户',
    });
    const opportunity = await service.save(actor('rep'), 'opportunities', {
      name: '沿用活动商机',
      companyId: company.id,
      stage: 'negotiation',
    });
    const at = (days: number) =>
      new Date(Date.now() + days * 86_400_000).toISOString();
    const done = await service.save(actor('rep'), 'tasks', {
      name: '商务谈判',
      status: 'completed',
      dueAt: at(-1),
      opportunityId: opportunity.id,
      result: '条款谈定',
    });
    const planned = await service.save(actor('rep'), 'tasks', {
      name: '跟进法务审核',
      status: 'open',
      dueAt: at(3),
      opportunityId: opportunity.id,
    });
    const { rows, ids, names } = await tasksOf(
      service,
      actor('rep'),
      { opportunityId: toText(opportunity.id) },
      'Asia/Shanghai',
    );
    const refOf = (name: string) =>
      toText(rows.find((row) => row.subject === name)?.ref);
    expect(ids[refOf('跟进法务审核')]).toBe(planned.id);
    expect(ids[refOf('商务谈判')]).toBeUndefined();
    // Both still named, for a reference left in text.
    expect(names[refOf('商务谈判')]).toBe('商务谈判');
    expect(done.id).toBeTruthy();
  });
});

describe('opportunity signals', () => {
  const now = Date.parse('2026-10-10T01:00:00Z');
  const daysAgo = (days: number) =>
    new Date(now - days * 86_400_000).toISOString();

  it('tells what should have happened on a deal and has not', () => {
    const open = { stage: 'proposal', createdAt: daysAgo(30) };
    // No contact for fourteen days and nothing planned: gone quiet.
    expect(dealSignal(open, [], now, undefined, Date.parse(daysAgo(20)))).toBe(
      'silent',
    );
    // Something recent, or something planned ahead: nothing.
    expect(dealSignal(open, [], now, undefined, Date.parse(daysAgo(3)))).toBe(
      undefined,
    );
    expect(
      dealSignal(open, [{ status: 'open', dueAt: daysAgo(-2) }], now),
    ).toBe(undefined);
    // A close date within the week, or past: said before going quiet.
    expect(dealSignal({ ...open, expectedCloseAt: daysAgo(-5) }, [], now)).toBe(
      'closeDue',
    );
    expect(dealSignal({ ...open, expectedCloseAt: daysAgo(2) }, [], now)).toBe(
      'closeDue',
    );
    expect(
      dealSignal(
        { ...open, expectedCloseAt: daysAgo(-30) },
        [],
        now,
        undefined,
        Date.parse(daysAgo(3)),
      ),
    ).toBe(undefined);
    // Paused: only its resume date counts.
    expect(
      dealSignal(
        { stage: 'paused', createdAt: daysAgo(90), resumeAt: daysAgo(1) },
        [],
        now,
      ),
    ).toBe('resumeDue');
    expect(
      dealSignal(
        { stage: 'paused', createdAt: daysAgo(90), resumeAt: daysAgo(-10) },
        [],
        now,
      ),
    ).toBe(undefined);
    // Closed: nothing.
    expect(dealSignal({ stage: 'won', createdAt: daysAgo(90) }, [], now)).toBe(
      undefined,
    );
    // The days come from the settings: a shorter stall, a nearer close.
    expect(
      dealSignal(
        open,
        [],
        now,
        { stale: 7, closing: 3 },
        Date.parse(daysAgo(8)),
      ),
    ).toBe('silent');
    expect(
      dealSignal(
        { ...open, expectedCloseAt: daysAgo(-5) },
        [],
        now,
        { stale: 14, closing: 3 },
        Date.parse(daysAgo(2)),
      ),
    ).toBe(undefined);
  });

  it("puts the settings' days into the business guidance, in the AI language", () => {
    const days = { uncontacted: 3, stale: 10, closing: 5 };
    const chinese = crmGuidance(days, 'zh-CN');
    expect(chinese).toContain('新线索超过 3 天未首次联系');
    expect(chinese).toContain('线索或商机超过 10 天没有联系');
    expect(chinese).toContain('预计成交日期 5 天内到达');
    const english = crmGuidance(days, 'en-US');
    expect(english).toContain('not contacted for more than 3 days');
    expect(english).toContain('comment or mail) for more than 10 days');
    expect(english).toContain('expected close date within 5 days');
    expect(english).not.toMatch(/[\u4e00-\u9fff]/);
    // English is the default, as the setting's.
    expect(crmGuidance(days)).toBe(english);
  });

  it('starts a follow-up per signal as the owner, never over a waiting card', async () => {
    const company = await service.save(actor('rep'), 'companies', {
      name: '巡检客户',
    });
    const closing = await service.save(actor('rep'), 'opportunities', {
      name: '快到成交日',
      companyId: company.id,
      stage: 'proposal',
      expectedCloseAt: new Date(Date.now() + 3 * 86_400_000)
        .toISOString()
        .slice(0, 10),
    });
    const waiting = await service.save(actor('rep'), 'opportunities', {
      name: '有卡片等着的商机',
      companyId: company.id,
      stage: 'proposal',
      expectedCloseAt: new Date(Date.now() + 3 * 86_400_000)
        .toISOString()
        .slice(0, 10),
    });
    await database
      .query()
      .insertInto('crmHistory')
      .values({
        id: 'deal-signal-waiting-card',
        entity: 'opportunities',
        recordId: waiting.id,
        actorId: 'rep',
        action: 'ai',
        source: 'ai',
        aiStatus: 'pending',
        ai: JSON.stringify({ kind: 'evaluation' }),
        changes: JSON.stringify({}),
        createdAt: new Date().toISOString(),
      })
      .execute();
    const requests: { by: string; deal: string; trigger: unknown }[] = [];
    const evaluator = {
      available: async () => true,
      request: async (
        by: Actor,
        deal: string,
        _revise: unknown,
        trigger: unknown,
      ) => {
        requests.push({ by: by.id, deal, trigger });
        await database
          .query()
          .insertInto('crmHistory')
          .values({
            id: `deal-signal-${deal}-${requests.length}`,
            entity: 'opportunities',
            recordId: deal,
            actorId: by.id,
            action: 'ai',
            source: 'ai',
            aiStatus: 'dismissed',
            ai: JSON.stringify({ kind: 'evaluation', trigger }),
            changes: JSON.stringify({}),
            createdAt: new Date().toISOString(),
          })
          .execute();
        return { id: `deal-signal-${deal}` };
      },
    } as unknown as OpportunityEvaluator;
    await scanDealSignals(service, evaluator, new Date(), 1000);
    expect(requests).toContainEqual({
      by: 'rep',
      deal: closing.id,
      trigger: 'closeDue',
    });
    expect(requests.some((r) => r.deal === waiting.id)).toBe(false);
    // The same signal does not start again within the week.
    requests.length = 0;
    await scanDealSignals(service, evaluator, new Date(), 1000);
    expect(requests.some((r) => r.deal === closing.id)).toBe(false);
  });

  it('follows up an open deal whose company has news since its last follow-up, once', async () => {
    const company = await service.save(actor('rep'), 'companies', {
      name: 'News Co',
    });
    // Nothing else to say about it: recent, its close date far off.
    const deal = await service.save(actor('rep'), 'opportunities', {
      name: 'News deal',
      companyId: company.id,
      stage: 'proposal',
      expectedCloseAt: new Date(Date.now() + 60 * 86_400_000)
        .toISOString()
        .slice(0, 10),
    });
    const paused = await service.save(actor('rep'), 'opportunities', {
      name: 'Paused news deal',
      companyId: company.id,
      stage: 'paused',
      pauseReason: 'budgetDeferred',
      resumeAt: new Date(Date.now() + 30 * 86_400_000)
        .toISOString()
        .slice(0, 10),
    });
    const signal = async (type: string, status = 'new') =>
      database
        .query()
        .insertInto('crmSignals')
        .values({
          id: randomUUID(),
          companyId: toText(company.id),
          type,
          title: `${type} news`,
          summary: '',
          occurredOn: new Date().toISOString().slice(0, 10),
          sources: JSON.stringify([]),
          eventKey: `news:${type}:${randomUUID()}`,
          status,
          runId: null,
          decidedById: null,
          decidedAt: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })
        .execute();
    const requests: { deal: string; trigger: unknown }[] = [];
    const evaluator = {
      available: async () => true,
      request: async (
        by: Actor,
        dealId: string,
        _revise: unknown,
        trigger: unknown,
      ) => {
        requests.push({ deal: dealId, trigger });
        await database
          .query()
          .insertInto('crmHistory')
          .values({
            id: randomUUID(),
            entity: 'opportunities',
            recordId: dealId,
            actorId: by.id,
            action: 'ai',
            source: 'ai',
            aiStatus: 'dismissed',
            ai: JSON.stringify({ kind: 'evaluation', trigger }),
            changes: JSON.stringify({}),
            createdAt: new Date().toISOString(),
          })
          .execute();
        return { id: dealId };
      },
    } as unknown as OpportunityEvaluator;
    const mine = () =>
      requests.filter((r) => r.deal === deal.id || r.deal === paused.id);
    // Hiring, or news dismissed: not worth a follow-up.
    await signal('hiring');
    await signal('risk', 'dismissed');
    await scanDealSignals(service, evaluator, new Date(), 1000);
    expect(mine()).toEqual([]);
    // Funding: the open deal is followed up, the paused one waits.
    await new Promise((resolve) => setTimeout(resolve, 5));
    await signal('funding');
    await scanDealSignals(service, evaluator, new Date(), 1000);
    expect(mine()).toEqual([{ deal: deal.id, trigger: 'companySignal' }]);
    // Not again for the same news.
    await scanDealSignals(service, evaluator, new Date(), 1000);
    expect(mine()).toHaveLength(1);
    // New news since that follow-up: followed up again, no week to wait.
    await new Promise((resolve) => setTimeout(resolve, 5));
    await signal('leadership');
    await scanDealSignals(service, evaluator, new Date(), 1000);
    expect(mine()).toHaveLength(2);
  });
});

describe('mail in the timeline', () => {
  // A record's mail entries: those its timeline shows, and those from
  // before it existed, which the timeline only counts (`mailBefore`), as
  // stored.
  const mailIn = async (
    entries: readonly Row[],
    recordId: unknown,
  ): Promise<Row[]> => {
    const shown = entries.filter((entry) => entry.action === 'mail');
    if (!entries.some((entry) => entry.action === 'mailBefore')) return shown;
    const stored = await database
      .query()
      .selectFrom('crmHistory')
      .selectAll()
      .where('recordId', '=', toText(recordId))
      .where('action', '=', 'mail')
      .execute();
    return [
      ...shown,
      ...stored
        .filter((row) => !shown.some((entry) => entry.id === row.id))
        .map((row) => ({
          ...row,
          changes: JSON.parse(toText(row.changes)) as Row,
        })),
    ];
  };
  it("reads back a mailbox's history once its first synchronization completes, after a pass that saw none of it", async () => {
    const now = new Date();
    const lead = await service.save(actor('rep'), 'leads', {
      name: '补读线索',
      email: 'late@history-mail.test',
      source: 'website',
    });
    mailbox.accounts = { other: 'other@example.test' };
    mailbox.messages = [];
    mailbox.synced = { other: [] };
    try {
      // A pass while the mailbox's first synchronization runs: nothing yet.
      expect(await timeline.syncUser('other', now)).toBe(0);
      // It completes, with a conversation from two weeks before.
      mailbox.messages = [
        {
          id: 'h1',
          accountId: 'mailbox-other',
          conversationId: 'history-thread',
          from: { address: 'late@history-mail.test' },
          to: [{ address: 'other@example.test' }],
          subject: '两周前的邮件',
          receivedAt: new Date(now.getTime() - 14 * 86_400_000).toISOString(),
        },
      ];
      mailbox.synced = { other: ['mailbox-other'] };
      const later = new Date(now.getTime() + 60_000);
      expect(await timeline.syncUser('other', later)).toBe(1);
      expect(
        (
          await mailIn(
            (await service.historyOf(actor('other'), 'leads', lead.id)).data,
            lead.id,
          )
        ).length,
      ).toBeGreaterThan(0);
      // And only once: the next pass reads from where this one stopped.
      expect(
        await timeline.syncUser('other', new Date(later.getTime() + 60_000)),
      ).toBe(0);
    } finally {
      mailbox.accounts = {};
      mailbox.messages = [];
      mailbox.synced = undefined;
      await database
        .query()
        .deleteFrom('crmHistory')
        .where('recordId', '=', lead.id)
        .where('action', '=', 'mail')
        .execute();
    }
  });

  it('brings each mail conversation into the timeline of the records whose people are in it', async () => {
    const now = new Date();
    const ago = (minutes: number) =>
      new Date(now.getTime() - minutes * 60_000).toISOString();
    const lead = await service.save(actor('rep'), 'leads', {
      name: '邮件线索',
      company: '邮件线索科技',
      email: 'buyer@lead-mail.test',
      source: 'website',
    });
    const company = await service.save(actor('rep'), 'companies', {
      name: '邮件客户',
      website: 'https://www.acme-mail.test',
    });
    const contact = await service.save(actor('rep'), 'contacts', {
      name: '采购',
      email: 'cto@acme-mail.test',
      companyId: company.id,
    });
    const deal = await service.save(actor('rep'), 'opportunities', {
      name: '邮件商机',
      companyId: company.id,
      contacts: [{ contactId: contact.id, role: 'other' }],
    });
    mailbox.accounts = { rep: 'rep@example.test' };
    mailbox.messages = [
      // The lead wrote, the rep answered.
      {
        id: 'l1',
        accountId: 'mailbox-rep',
        conversationId: 'lead-thread',
        from: { address: 'buyer@lead-mail.test', name: 'Buyer' },
        to: [{ address: 'rep@example.test' }],
        subject: '询价',
        receivedAt: ago(30),
      },
      // The contact's colleague at the company's domain: the company.
      {
        id: 'a1',
        accountId: 'mailbox-rep',
        conversationId: 'deal-thread',
        from: { address: 'rep@example.test' },
        to: [{ address: 'cto@acme-mail.test' }],
        cc: [{ address: 'it@acme-mail.test' }],
        subject: '方案',
        receivedAt: ago(20),
      },
      // A colleague's mail, and a draft: neither is the customer's.
      {
        id: 'x1',
        accountId: 'mailbox-rep',
        conversationId: 'internal',
        from: { address: 'other@example.test' },
        to: [{ address: 'rep@example.test' }],
        subject: '内部',
        receivedAt: ago(10),
      },
      {
        id: 'd1',
        accountId: 'mailbox-rep',
        conversationId: 'draft',
        from: { address: 'rep@example.test' },
        to: [{ address: 'buyer@lead-mail.test' }],
        subject: '草稿',
        receivedAt: ago(5),
        draft: true,
      },
    ];
    const replied = vi.fn();
    timeline.customerReplied = replied;
    try {
      // The lead; the contact, its company and its deal.
      expect(await timeline.syncUser('rep', now)).toBe(4);
      const entries = await database
        .query()
        .selectFrom('crmHistory')
        .select(['entity', 'recordId', 'actorId', 'sourceKey', 'changes'])
        .where('action', '=', 'mail')
        .execute();
      expect(entries.map((e) => `${e.entity}:${e.sourceKey}`).sort()).toEqual([
        'companies:mailbox-rep:deal-thread',
        'contacts:mailbox-rep:deal-thread',
        'leads:mailbox-rep:lead-thread',
        'opportunities:mailbox-rep:deal-thread',
      ]);
      const leadEntry = entries.find((e) => e.entity === 'leads')!;
      expect(leadEntry.recordId).toBe(lead.id);
      expect(leadEntry.actorId).toBe('rep');
      expect(JSON.parse(toText(leadEntry.changes))).toMatchObject({
        subject: '询价',
        count: 1,
        fromCustomer: true,
        lastFrom: 'buyer@lead-mail.test',
        participants: ['buyer@lead-mail.test'],
        ownerId: 'rep',
      });
      expect(
        JSON.parse(
          toText(entries.find((e) => e.entity === 'companies')!.changes),
        ).participants.sort(),
      ).toEqual(['cto@acme-mail.test', 'it@acme-mail.test']);
      // Mail with the customer is contact: the new lead is being worked.
      expect((await service.get(actor('rep'), 'leads', lead.id)).status).toBe(
        'working',
      );
      // The customer wrote on the lead; on the deal only the rep did.
      expect(replied.mock.calls.map(([, target]) => target)).toEqual([
        { entity: 'leads', id: lead.id },
      ]);
      // A colleague who may read the lead sees the conversation on its
      // timeline, as a summary.
      const feed = await service.historyOf(actor('manager'), 'leads', lead.id);
      expect((await mailIn(feed.data, lead.id))[0]).toMatchObject({
        sourceKey: 'mailbox-rep:lead-thread',
        changes: { subject: '询价', count: 1 },
      });
      // The deal's last contact is that mail.
      expect(
        (await lastExchanges(database.query(), 'opportunities')).get(deal.id),
      ).toBe(Date.parse(ago(20)));
      // The next message of the conversation updates its entry, not a new one.
      mailbox.messages.push({
        id: 'a2',
        accountId: 'mailbox-rep',
        conversationId: 'deal-thread',
        from: { address: 'cto@acme-mail.test', name: 'CTO' },
        to: [{ address: 'rep@example.test' }],
        subject: 'Re: 方案',
        receivedAt: ago(1),
      });
      replied.mockClear();
      expect(await timeline.syncUser('rep', new Date())).toBe(3);
      const deals = await database
        .query()
        .selectFrom('crmHistory')
        .select(['changes'])
        .where('action', '=', 'mail')
        .where('entity', '=', 'opportunities')
        .where('recordId', '=', deal.id)
        .execute();
      expect(deals).toHaveLength(1);
      expect(JSON.parse(toText(deals[0].changes))).toMatchObject({
        subject: 'Re: 方案',
        count: 2,
        fromCustomer: true,
        lastFromName: 'CTO',
      });
      expect(replied.mock.calls.map(([, target]) => target)).toEqual([
        { entity: 'opportunities', id: deal.id },
      ]);
      // Nothing new, nothing written.
      expect(await timeline.syncUser('rep', new Date())).toBe(0);
      // A user without a mailbox has nothing to read.
      expect(await timeline.syncUser('other', new Date())).toBe(0);
    } finally {
      timeline.customerReplied = undefined;
      mailbox.accounts = {};
      mailbox.messages = [];
    }
  });

  it('reads the signed-in user’s mailbox on request, and only when signed in', async () => {
    expect(
      (await request('/mailTimeline/sync', undefined, 'POST', {})).status,
    ).toBe(401);
    const response = await request('/mailTimeline/sync', 'rep', 'POST', {});
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ data: { written: 0 } });
  });
});

describe('tasks', () => {
  it("renames a set's grants on activities to tasks, keeping actions and scopes", () => {
    const scoped = {
      action: 'edit',
      policy: { type: 'composite', scopes: { records: 'recordsIOwn' } },
    };
    expect(
      taskGrants([
        {
          resource: { type: 'composite', id: 'crm.activities' },
          actions: [scoped],
        },
        {
          resource: { type: 'page', id: 'crm-activities' },
          actions: [{ action: 'access' }],
        },
        {
          resource: { type: 'collection', id: 'crmActivities' },
          actions: [{ action: 'read' }],
        },
        {
          resource: { type: 'page', id: 'crm-leads' },
          actions: [{ action: 'access' }],
        },
      ] as never),
    ).toEqual([
      { resource: { type: 'composite', id: 'crm.tasks' }, actions: [scoped] },
      {
        resource: { type: 'page', id: 'crm-tasks' },
        actions: [{ action: 'access' }],
      },
      {
        resource: { type: 'collection', id: 'crmTasks' },
        actions: [{ action: 'read' }],
      },
      {
        resource: { type: 'page', id: 'crm-leads' },
        actions: [{ action: 'access' }],
      },
    ]);
    expect(
      taskGrants([
        { resource: { type: 'page', id: 'crm-leads' }, actions: [] },
      ] as never),
    ).toBeUndefined();
  });
  it('needs only a title; a date-only task is kept as the end of its day', async () => {
    const plain = await service.save(actor('rep'), 'tasks', {
      name: 'Send the case study',
    });
    expect(plain).toMatchObject({ status: 'open', ownerId: 'rep' });
    expect(plain.dueAt ?? null).toBeNull();
    await expect(
      service.save(actor('rep'), 'tasks', { name: '  ' }),
    ).rejects.toMatchObject({ code: 'required' });
    // A date alone is the last instant of its business day, which a time
    // picked to the minute never is.
    const zone = (await service.settings()).timeZone;
    const dayEnd = endOfDay(new Date('2026-11-03T14:00:00.000Z'), zone);
    const dated = await service.save(actor('rep'), 'tasks', {
      name: 'Renewal reminder',
      dueAt: dayEnd.toISOString(),
    });
    const due = new Date(toText(dated.dueAt));
    expect(isEndOfDay(due, zone)).toBe(true);
    expect(
      new Intl.DateTimeFormat('sv-SE', {
        timeZone: zone,
        dateStyle: 'short',
        timeStyle: 'medium',
      }).format(due),
    ).toBe('2026-11-03 23:59:59');
    expect(isEndOfDay(new Date('2026-11-03T06:30:00.000Z'), zone)).toBe(false);
  });

  it('links a task to a lead, or to a company and its deal, not both', async () => {
    const lead = await service.save(actor('rep'), 'leads', {
      name: 'Either lead',
      source: 'website',
    });
    const company = await service.save(actor('rep'), 'companies', {
      name: 'Either company',
    });
    await expect(
      service.save(actor('rep'), 'tasks', {
        name: 'Both',
        leadId: lead.id,
        companyId: company.id,
      }),
    ).rejects.toMatchObject({ code: 'leadOrCompany' });
    expect(
      await service.save(actor('rep'), 'tasks', {
        name: 'Lead only',
        leadId: lead.id,
      }),
    ).toMatchObject({ leadId: lead.id });
    expect(
      await service.save(actor('rep'), 'tasks', {
        name: 'Company only',
        companyId: company.id,
      }),
    ).toMatchObject({ companyId: company.id });
  });
  it('counts a completed task, a comment or mail as contact, and an open task due ahead as planned', async () => {
    const lead = await service.save(actor('rep'), 'leads', {
      name: 'Exchanges',
      source: 'website',
    });
    const id = toText(lead.id);
    expect((await lastExchanges(database.query(), 'leads')).has(id)).toBe(
      false,
    );
    const ahead = new Date(Date.now() + 86_400_000).toISOString();
    await service.save(actor('rep'), 'tasks', {
      name: 'Call back',
      leadId: id,
      dueAt: ahead,
    });
    expect((await upcomingTasks(database.query(), 'leads')).has(id)).toBe(true);
    // Planned is not contact.
    expect((await lastExchanges(database.query(), 'leads')).has(id)).toBe(
      false,
    );
    await service.addComment(actor('rep'), 'leads', id, 'Spoke on the phone.');
    expect(
      (await lastExchanges(database.query(), 'leads')).get(id),
    ).toBeGreaterThan(Date.now() - 60_000);
  });
});

// The overview's reports beyond its counts (reports.ts), on deals laid out
// around a fixed day: what was won, what is likely to close, why deals
// were lost, how long they stay in each stage, and the team's work.
describe('overview reports', () => {
  it('reads won amounts, the forecast, loss reasons and stage stays', async () => {
    const now = new Date('2026-08-20T04:00:00.000Z');
    const deal = (values: Record<string, unknown>) =>
      ({
        id: `report-${String(values.name)}`,
        currency: 'CNY',
        ownerId: 'rep',
        createdAt: '2026-08-01T04:00:00.000Z',
        ...values,
      }) as unknown as CrmRecord;
    const deals = [
      // Won this month and two months ago.
      deal({
        name: 'won-aug',
        stage: 'won',
        amount: 300,
        closedAt: '2026-08-05T04:00:00.000Z',
        createdAt: '2026-07-06T04:00:00.000Z',
      }),
      deal({
        name: 'won-jun',
        stage: 'won',
        amount: 100,
        closedAt: '2026-06-10T04:00:00.000Z',
        createdAt: '2026-05-31T04:00:00.000Z',
      }),
      // Expected this month: one likely (proposal), one early.
      deal({
        name: 'likely',
        stage: 'proposal',
        amount: 1000,
        expectedCloseAt: '2026-08-28',
      }),
      deal({
        name: 'early',
        stage: 'contact',
        amount: 500,
        expectedCloseAt: '2026-08-30',
      }),
      // Expected next month, in the quarter but not the month.
      deal({
        name: 'september',
        stage: 'negotiation',
        amount: 2000,
        expectedCloseAt: '2026-09-15',
      }),
      deal({
        name: 'lost',
        stage: 'lost',
        amount: 50,
        lostReason: 'price',
        closedAt: '2026-08-10T04:00:00.000Z',
      }),
      deal({
        name: 'paused',
        stage: 'paused',
        amount: 70,
        pauseReason: 'budgetDeferred',
      }),
    ];
    // The likely deal entered proposal on 8 August after six days in
    // contact.
    await database
      .query()
      .insertInto('crmHistory')
      .values({
        id: 'report-stage-1',
        entity: 'opportunities',
        recordId: 'report-likely',
        actorId: 'rep',
        action: 'stage',
        fromValue: 'contact',
        toValue: 'proposal',
        createdAt: '2026-08-07T04:00:00.000Z',
      })
      .execute();
    const result = await reports(service, actor('manager'), {
      team: false,
      timeZone: 'Asia/Shanghai',
      deals,
      sellers: [],
      now,
    });
    const revenue = result.revenue as {
      months: { month: string; won: Record<string, number> }[];
      forecast: Record<string, Record<string, unknown>>;
    };
    expect(revenue.months.map((m) => m.month)).toEqual([
      '2026-03',
      '2026-04',
      '2026-05',
      '2026-06',
      '2026-07',
      '2026-08',
    ]);
    expect(revenue.months.at(-1)?.won).toEqual({ CNY: 300 });
    expect(revenue.months[3].won).toEqual({ CNY: 100 });
    expect(revenue.forecast.month).toMatchObject({
      won: { CNY: 300 },
      commit: { CNY: 1000 },
      commitCount: 1,
      bestCase: { CNY: 1500 },
      bestCaseCount: 2,
      weighted: { CNY: 1000 * 0.6 + 500 * 0.1 },
    });
    // The quarter (July to September) adds September's deal.
    expect(revenue.forecast.quarter).toMatchObject({
      from: '2026-07',
      to: '2026-09',
      commit: { CNY: 3000 },
      bestCase: { CNY: 3500 },
    });
    expect(result.reasons).toMatchObject({
      lost: [{ reason: 'price', count: 1, amount: { CNY: 50 } }],
      paused: [{ reason: 'budgetDeferred', count: 1 }],
    });
    const cycle = result.cycle as {
      wonDays: number;
      wonCount: number;
      stages: { stage: string; averageDays: number | null; open: number }[];
    };
    // Won after 30 and 10 days.
    expect(cycle.wonCount).toBe(2);
    expect(cycle.wonDays).toBeCloseTo(20);
    expect(cycle.stages.find((s) => s.stage === 'contact')).toMatchObject({
      averageDays: 6,
      open: 1,
    });
    expect(result).not.toHaveProperty('activity');
  });

  it("counts each seller's completed tasks and comments by week, for the team", async () => {
    const lead = await service.save(actor('rep'), 'leads', {
      name: 'Activity lead',
      company: 'Activity Co',
      source: 'website',
    });
    await service.addComment(actor('rep'), 'leads', toText(lead.id), 'Called');
    await service.save(actor('rep'), 'tasks', {
      name: 'Done this week',
      leadId: lead.id,
      status: 'completed',
    });
    const result = await reports(service, actor('manager'), {
      team: true,
      timeZone: 'Asia/Shanghai',
      deals: [],
      sellers: [{ id: 'rep', name: 'Rep' }],
    });
    const activity = result.activity as {
      weeks: string[];
      rows: {
        id: string;
        weeks: { tasks: number; comments: number }[];
        total: { tasks: number; comments: number };
      }[];
    };
    expect(activity.weeks).toHaveLength(4);
    const rep = activity.rows[0];
    expect(rep.id).toBe('rep');
    expect(rep.weeks.at(-1)?.tasks).toBeGreaterThanOrEqual(1);
    expect(rep.weeks.at(-1)?.comments).toBeGreaterThanOrEqual(1);
    expect(rep.total.comments).toBeGreaterThanOrEqual(1);
  });
});

// The Agents section (agents.ts): an administrator switches an agent or one
// of its triggers off, an automatic start then does nothing while a person
// asking still does, and an agent's page lists its runs on the records the
// reader may read.
describe('agents', () => {
  it('switches agents and their triggers, for administrators only', async () => {
    // Nothing switched yet: every agent and trigger on but the daily passes.
    const stored = await database
      .query()
      .selectFrom('crmSettings')
      .select('value')
      .where('id', '=', 'agents')
      .executeTakeFirstOrThrow();
    await database
      .query()
      .deleteFrom('crmSettings')
      .where('id', '=', 'agents')
      .execute();
    const defaults = await agentSwitches(service);
    await database
      .query()
      .insertInto('crmSettings')
      .values({ id: 'agents', value: stored.value, updatedAt: new Date() })
      .execute();
    for (const agent of ['leads', 'opportunities', 'tasks', 'signals'] as const)
      expect(defaults[agent]).toMatchObject({
        enabled: true,
        triggers: { daily: false },
      });
    expect(defaults.leads.triggers.created).toBe(true);
    expect(defaults.approvals.triggers.submitted).toBe(true);
    expect(
      (
        await request('/aiAgents/leads/switches', 'rep', 'PUT', {
          triggers: { daily: false },
        })
      ).status,
    ).toBe(403);
    expect(
      (
        await request('/aiAgents/leads/switches', 'admin', 'PUT', {
          triggers: { nonsense: false },
        })
      ).status,
    ).toBe(400);
    expect((await request('/aiAgents/robots', 'admin', 'GET')).status).toBe(
      400,
    );
    const saved = await request('/aiAgents/leads/switches', 'admin', 'PUT', {
      triggers: { taskDone: false },
    });
    expect(saved.status).toBe(200);
    expect(await agentOn(service, 'leads', 'taskDone')).toBe(false);
    expect(await agentOn(service, 'leads', 'created')).toBe(true);
    // The daily check's signals fall under its daily switch.
    expect(await agentOn(service, 'leads', 'uncontacted')).toBe(true);
    await saveAgentSwitch(service, actor('admin'), 'leads', { enabled: false });
    expect(await agentOn(service, 'leads', 'created')).toBe(false);
    // The metadata tells the forms, which then offer no follow-up.
    const meta = (await (await request('/workspace', 'rep')).json()).data as {
      agents: Record<string, { enabled: boolean }>;
    };
    expect(meta.agents.leads.enabled).toBe(false);
    expect(meta.agents.opportunities.enabled).toBe(true);
    // A follow-up something started on its own does not run; the evaluator
    // is never asked.
    const lead = await service.save(actor('rep'), 'leads', {
      name: 'Switched off',
      source: 'website',
    });
    const request_ = vi.fn();
    expect(
      await followUpLead(
        service,
        { request: request_ } as unknown as LeadEvaluator,
        actor('rep'),
        toText(lead.id),
        'customerReplied',
      ),
    ).toBe(false);
    expect(request_).not.toHaveBeenCalled();
    await saveAgentSwitch(service, actor('admin'), 'leads', {
      enabled: true,
      triggers: { taskDone: true },
    });
    expect(await agentOn(service, 'leads', 'taskDone')).toBe(true);
  });

  it("lists an agent's runs on readable records, with how they fared", async () => {
    const lead = await service.save(actor('rep'), 'leads', {
      name: 'Agent run lead',
      source: 'website',
    });
    const entry = (id: string, status: string, ai: Record<string, unknown>) =>
      database
        .query()
        .insertInto('crmHistory')
        .values({
          id,
          entity: 'leads',
          recordId: lead.id,
          actorId: 'rep',
          action: 'ai',
          changes: '{}',
          source: 'ai',
          aiStatus: status,
          ai: JSON.stringify({
            kind: 'evaluation',
            result: { recommendation: 'follow', grade: 'B', summary: 'Go' },
            ...ai,
          }),
          createdAt: new Date().toISOString(),
        })
        .execute();
    await entry('agent-run-1', 'accepted', { trigger: 'silent' });
    await entry('agent-run-2', 'dismissed', {});
    const overview = await agentOverview(service, actor('rep'), 'leads', {});
    const runs = overview.runs as {
      id: string;
      trigger: string;
      status: string;
    }[];
    expect(runs.find((r) => r.id === 'agent-run-1')).toMatchObject({
      trigger: 'daily',
      status: 'accepted',
    });
    expect(runs.find((r) => r.id === 'agent-run-2')).toMatchObject({
      trigger: 'asked',
      status: 'dismissed',
    });
    expect((overview.week as { runs: number }).runs).toBeGreaterThanOrEqual(2);
    const filtered = await agentOverview(service, actor('rep'), 'leads', {
      status: 'accepted',
    });
    expect(
      (filtered.runs as { status: string }[]).every(
        (r) => r.status === 'accepted',
      ),
    ).toBe(true);
    // An outsider who may read no lead sees none of its runs.
    const outsider = await agentOverview(
      service,
      actor('outsider'),
      'leads',
      {},
    ).catch(() => ({ runs: [] }));
    expect(
      (outsider.runs as { id: string }[]).some((r) => r.id === 'agent-run-1'),
    ).toBe(false);
  });
});

// A follow-up that does not look the company up again keeps the findings
// of the last look-up nobody wrote, so asking again soon after loses none.
describe('unwritten web findings', () => {
  it('carries those of the last look-up until they are written', async () => {
    const lead = await service.save(actor('rep'), 'leads', {
      name: 'Carry lead',
      company: 'Carry Co',
      source: 'website',
    });
    const entry = (
      id: string,
      createdAt: string,
      ai: Record<string, unknown>,
    ) =>
      database
        .query()
        .insertInto('crmHistory')
        .values({
          id,
          entity: 'leads',
          recordId: lead.id,
          actorId: 'rep',
          action: 'ai',
          changes: '{}',
          source: 'ai',
          aiStatus: 'superseded',
          ai: JSON.stringify({ kind: 'evaluation', ...ai }),
          createdAt,
        })
        .execute();
    await entry('carry-1', '2026-10-09T07:00:00.000Z', {
      researchedAt: '2026-10-09T07:00:30.000Z',
      result: {
        enrich: [
          {
            field: 'website',
            value: 'https://carry.example',
            source: 'https://carry.example/about',
            current: null,
          },
          // From the CRM's material, not the web: not carried.
          { field: 'jobTitle', value: 'CTO', source: null, current: null },
        ],
      },
    });
    // A later run that did not search.
    await entry('carry-2', '2026-10-09T07:05:00.000Z', {});
    const found = await unwrittenFindings(service, lead, 'carry-3');
    expect(found.researchedAt).toBe('2026-10-09T07:00:30.000Z');
    expect(found.items.map((item) => item.field)).toEqual(['website']);
    // Written: nothing is carried any more.
    await database
      .query()
      .updateTable('crmHistory')
      .set({
        ai: JSON.stringify({
          kind: 'evaluation',
          researchedAt: '2026-10-09T07:00:30.000Z',
          enrichedAt: '2026-10-09T07:01:00.000Z',
          result: { enrich: [] },
        }),
      })
      .where('id', '=', 'carry-1')
      .execute();
    expect((await unwrittenFindings(service, lead, 'carry-3')).items).toEqual(
      [],
    );
  });
});

// Migration step 2: the CRM's actions on the Agents plugin, a run's requests
// bounded by them, and the plans a run proposes instead of writing.
describe('agents and plans', () => {
  const asRun = (
    path: string,
    actions: string[],
    method = 'GET',
    body?: unknown,
    user = 'rep',
  ): Promise<Response> =>
    router.request(path, {
      method,
      headers: {
        'x-test-user': user,
        'x-test-run-actions': actions.join(','),
        'Content-Type': 'application/json',
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });

  it('gives a person their own actions and a run only its agent’s within them', async () => {
    const rep = await heldActions(service, 'rep');
    expect(rep.has('crm.leads/view')).toBe(true);
    expect(rep.has('crm.leads/create')).toBe(true);
    expect(rep.has('crm.plans/create')).toBe(true);
    expect(rep.has('crm.comments/create')).toBe(true);
    expect(rep.has('crm.sales/approve')).toBe(false);
    expect(
      (await heldActions(service, 'manager')).has('crm.sales/approve'),
    ).toBe(true);
    expect((await heldActions(service, 'outsider')).has('crm.leads/view')).toBe(
      false,
    );
    const gate = crmActionGate(service);
    const run = (actions: string[], userId = 'rep') =>
      gate.allowed({
        kind: 'run',
        userId,
        displayName: 'AI',
        agent: { actions } as never,
      });
    expect([...(await run(['crm.leads/view', 'crm.sales/approve']))]).toEqual([
      'crm.leads/view',
    ]);
    // Never deletion, even when the agent was configured with it.
    expect((await run(['crm.leads/delete'], 'admin')).size).toBe(0);
  });

  it('lets a run read what its agent holds and turns every write into a plan', async () => {
    expect((await asRun('/leads', ['crm.leads/view'])).status).toBe(200);
    const refused = await asRun('/leads', []);
    expect(refused.status).toBe(403);
    expect(await refused.json()).toMatchObject({
      error: { reason: 'ACTION_NOT_ALLOWED' },
    });
    const before = (await service.list(actor('rep'), 'leads', { q: undefined }))
      .total;
    const write = await asRun(
      '/leads',
      ['crm.leads/view', 'crm.leads/create'],
      'POST',
      { name: 'Written by a run', source: 'website' },
    );
    expect(write.status).toBe(400);
    expect(await write.json()).toMatchObject({
      error: {
        reason: 'PLAN_REQUIRED',
        metadata: { reason: 'alwaysConfirm' },
      },
    });
    expect((await service.list(actor('rep'), 'leads', {})).total).toBe(before);
  });

  it('rehearses a plan, keeps it for the person and carries it out as them', async () => {
    const refused = await asRun('/plans', ['crm.plans/create'], 'POST', {
      title: 'A lead without a name',
      steps: [{ op: 'record.create', params: { entity: 'leads', values: {} } }],
    });
    expect(refused.status).toBe(400);
    expect(await refused.json()).toMatchObject({
      error: {
        reason: 'PLAN_STEP_REFUSED',
        fieldViolations: [{ field: 'steps.1' }],
        metadata: { detail: 'required: name' },
      },
    });

    const proposed = await asRun('/plans', ['crm.plans/create'], 'POST', {
      title: 'Add Planned Works and its buyer',
      summary: 'Met at the fair.',
      steps: [
        {
          op: 'record.create',
          ref: 'company',
          params: {
            entity: 'companies',
            values: { name: 'Planned Works', source: 'exhibition' },
          },
        },
        {
          op: 'record.create',
          params: {
            entity: 'contacts',
            values: { name: 'Pat Planner', companyId: '$company' },
          },
        },
      ],
    });
    expect(proposed.status).toBe(201);
    const plan = (await proposed.json()).data as PlanOutcome['plan'];
    expect(plan).toMatchObject({
      status: 'pending',
      agentName: 'AI',
      runId: 'run-1',
      conversationId: 'conversation-1',
      proposerUserId: 'rep',
    });
    expect(plan.steps.map((step) => step.check?.name)).toEqual([
      'Planned Works',
      'Pat Planner',
    ]);
    // Proposed again word for word in its conversation: the same card.
    const twin = await asRun('/plans', ['crm.plans/create'], 'POST', {
      title: 'Add Planned Works and its buyer',
      summary: 'Met at the fair.',
      steps: plan.steps.map((step) => ({
        op: step.op,
        ...(step.ref ? { ref: step.ref } : {}),
        params: step.params,
      })),
    });
    expect((await twin.json()).data.id).toBe(plan.id);
    // Rehearsed and rolled back: nothing exists yet.
    expect(
      (
        await service.list(actor('rep'), 'companies', {
          search: 'Planned Works',
        })
      ).total,
    ).toBe(0);
    // Only the person it was proposed to sees it, and a run never decides.
    expect((await request(`/plans/${plan.id}`, 'other')).status).toBe(404);
    expect(
      (
        await asRun(`/plans/${plan.id}/execute`, ['crm.plans/create'], 'POST', {
          revision: plan.revision,
        })
      ).status,
    ).toBe(403);

    const executed = await request(`/plans/${plan.id}/execute`, 'rep', 'POST', {
      revision: plan.revision,
    });
    expect(executed.status).toBe(200);
    expect((await executed.json()).data.status).toBe('executed');
    const [company] = (
      await service.list(actor('rep'), 'companies', { search: 'Planned Works' })
    ).data;
    const [contact] = (
      await service.list(actor('rep'), 'contacts', { search: 'Pat Planner' })
    ).data;
    expect(contact.companyId).toBe(company.id);
    // The history says the change came from the agent's plan.
    const created = await database
      .query()
      .selectFrom('crmHistory')
      .select(['origin', 'source'])
      .where('recordId', '=', company.id)
      .executeTakeFirst();
    expect(created?.source).toBe('assistant');
    expect(JSON.parse(toText(created?.origin))).toMatchObject({
      kind: 'plan',
      planId: plan.id,
      agentName: 'AI',
      runId: 'run-1',
    });
    expect(planOutcomes.at(-1)).toMatchObject({
      decision: 'executed',
      plan: { id: plan.id },
    });
    // Decided once.
    const again = await request(`/plans/${plan.id}/execute`, 'rep', 'POST', {
      revision: plan.revision,
    });
    expect(again.status).toBe(400);
    expect(await again.json()).toMatchObject({
      error: { reason: 'PLAN_DECIDED' },
    });
  });

  it('leaves a plan stale when its record changed since, and voids one on request', async () => {
    const lead = await service.save(actor('rep'), 'leads', {
      name: 'Stale target',
      source: 'website',
    });
    const propose = async () =>
      (
        await (
          await asRun('/plans', ['crm.plans/create'], 'POST', {
            title: 'Rename the lead',
            steps: [
              {
                op: 'record.update',
                params: {
                  entity: 'leads',
                  id: lead.id,
                  values: { name: 'Renamed by plan' },
                },
              },
            ],
          })
        ).json()
      ).data as PlanOutcome['plan'];
    const plan = await propose();
    expect(plan.steps[0].check?.changes).toEqual([
      { field: 'name', from: 'Stale target', to: 'Renamed by plan' },
    ]);
    await new Promise((done) => setTimeout(done, 5));
    await service.save(actor('rep'), 'leads', { company: 'Changed' }, lead.id);
    const stale = await (
      await request(`/plans/${plan.id}/execute`, 'rep', 'POST', {
        revision: plan.revision,
      })
    ).json();
    expect(stale.data).toMatchObject({
      status: 'stale',
      failure: { position: 1, code: 'stale' },
    });
    expect((await service.get(actor('rep'), 'leads', lead.id)).name).toBe(
      'Stale target',
    );

    const second = await propose();
    const voided = await (
      await request(`/plans/${second.id}/void`, 'rep', 'POST', {
        revision: second.revision,
      })
    ).json();
    expect(voided.data.status).toBe('voided');
    expect(planOutcomes.at(-1)).toMatchObject({ decision: 'voided' });
    const listed = await (await request('/plans?status=voided', 'rep')).json();
    expect(listed.data.map((p: { id: string }) => p.id)).toContain(second.id);
  });

  it('lets the person change a waiting step on the card, rehearsing the plan again', async () => {
    const plan = (
      await (
        await asRun('/plans', ['crm.plans/create'], 'POST', {
          title: 'Register the lead',
          steps: [
            {
              op: 'record.create',
              params: {
                entity: 'leads',
                values: { name: 'Placeholder name', source: 'exhibition' },
              },
            },
          ],
        })
      ).json()
    ).data as PlanOutcome['plan'];
    const revise = (revision: number, values: Record<string, unknown>) =>
      request(`/plans/${plan.id}/steps/1`, 'rep', 'PATCH', {
        revision,
        values,
      });
    // A value the step would be refused for leaves the plan as it was.
    const refused = await revise(plan.revision, { name: '' });
    expect(refused.status).toBe(400);
    expect((await refused.json()).error).toMatchObject({
      reason: 'PLAN_STEP_REFUSED',
      metadata: { field: 'steps.1' },
    });
    const changed = (
      await (await revise(plan.revision, { name: 'Qzxrevised' })).json()
    ).data as PlanOutcome['plan'];
    expect(changed.revision).toBe(plan.revision + 1);
    expect(changed.steps[0].params.values).toMatchObject({
      name: 'Qzxrevised',
      source: 'exhibition',
    });
    expect(changed.steps[0].check?.changes).toContainEqual({
      field: 'name',
      from: null,
      to: 'Qzxrevised',
    });
    // The card still showing the plan before cannot change or carry it out.
    expect((await revise(plan.revision, { name: 'Stale' })).status).toBe(409);
    // Nor can the agent's run: the person changes their plan.
    expect(
      (
        await asRun(
          `/plans/${plan.id}/steps/1`,
          ['crm.plans/create'],
          'PATCH',
          { revision: changed.revision, values: { name: 'By the agent' } },
        )
      ).status,
    ).toBe(403);
    const done = await (
      await request(`/plans/${plan.id}/execute`, 'rep', 'POST', {
        revision: changed.revision,
      })
    ).json();
    expect(done.data.status).toBe('executed');
    // What the plan created carries the value as changed.
    const created = await service.list(actor('rep'), 'leads', {
      search: 'Qzxrevised',
    });
    expect(created.data.map((lead) => lead.name)).toEqual(['Qzxrevised']);
  });

  it('decides an approval and a suggestion and sends an email in a plan the person confirms', async () => {
    // An email needs a mailbox of the person's that sends.
    const noMailbox = await asRun('/plans', ['crm.plans/create'], 'POST', {
      title: 'Write to the buyer',
      steps: [
        {
          op: 'mail.send',
          params: {
            to: ['buyer@example.com'],
            subject: 'Quote',
            text: 'Attached.',
          },
        },
      ],
    });
    expect(noMailbox.status).toBe(400);
    expect(await noMailbox.json()).toMatchObject({
      error: {
        reason: 'PLAN_STEP_REFUSED',
        metadata: { detail: 'noMailbox' },
      },
    });

    const sent: { actorId: string; input: Record<string, unknown> }[] = [];
    let failing = false;
    const mail = {
      listAccounts: async ({ actorId }: { actorId: string }) =>
        actorId === 'manager'
          ? [
              {
                id: 'box-manager',
                address: 'manager@example.com',
                status: 'active',
                provider: { type: 'smtp', name: 'smtp' },
              },
            ]
          : [],
      listProviders: async () => [
        { type: 'smtp', name: 'smtp', capabilities: { send: true } },
      ],
      listIdentities: async () => [
        {
          id: 'identity-manager',
          accountId: 'box-manager',
          address: 'manager@example.com',
          isPrimary: true,
          canSend: true,
        },
      ],
      sendMessage: async (
        { actorId }: { actorId: string },
        input: Record<string, unknown>,
      ) => {
        if (failing) throw new Error('relay down');
        sent.push({ actorId, input });
        return {
          id: 'submission-1',
          accountId: 'box-manager',
          status: 'queued',
        };
      },
    };
    const synced: string[] = [];
    const engine = new CrmPlans(service, {
      leads: () => new LeadEvaluator(service, new ServiceContainer()),
      opportunities: () => undefined,
      mail: () => mail as never,
      mailSent: async (userId) => {
        synced.push(userId);
      },
    });
    const source = {
      agentId: 'agent-1',
      agentName: 'AI',
      runId: 'run-1',
      conversationId: 'conversation-1',
    };

    const company = await service.save(actor('rep'), 'companies', {
      name: 'Planned approval company',
    });
    const opportunity = await service.save(actor('rep'), 'opportunities', {
      name: 'Planned approval deal',
      companyId: company.id,
    });
    const approval = await service.save(actor('rep'), 'approvals', {
      name: 'Planned discount',
      opportunityId: opportunity.id,
      topic: 'discount',
      description: 'Ten percent',
      approverId: 'manager',
    });
    await service.approvalAction(actor('rep'), approval.id, 'submit');
    const decideApproval = {
      op: 'approval.decide' as const,
      params: {
        approvalId: approval.id,
        decision: 'approve',
        comment: 'Within the standard.',
      },
    };
    // Only its approver decides an approval, in a plan as on its page.
    await expect(
      engine.create(
        actor('rep'),
        { title: 'Approve my own', steps: [decideApproval] },
        source,
      ),
    ).rejects.toMatchObject({ code: 'planStepRefused', field: 'steps.1' });

    const lead = await service.save(actor('manager'), 'leads', {
      name: 'Planned nurture',
      source: 'website',
    });
    await database
      .query()
      .insertInto('crmHistory')
      .values({
        id: 'planned-suggestion',
        entity: 'leads',
        recordId: lead.id,
        actorId: 'manager',
        action: 'ai',
        source: 'ai',
        aiStatus: 'pending',
        ai: JSON.stringify({
          kind: 'evaluation',
          result: {
            recommendation: 'nurture',
            grade: 'C',
            summary: 'Not buying this year.',
            reasons: [],
            edition: null,
            invalidReason: null,
            nextStep: null,
            questions: [],
            reviewInDays: 30,
          },
        }),
        changes: JSON.stringify({}),
        createdAt: new Date().toISOString(),
      })
      .execute();

    const plan = await engine.create(
      actor('manager'),
      {
        title: 'Approve, nurture and tell the buyer',
        steps: [
          decideApproval,
          {
            op: 'suggestion.decide',
            params: { entity: 'leads', recordId: lead.id, decision: 'accept' },
          },
          {
            op: 'mail.send',
            params: {
              to: ['buyer@example.com'],
              subject: 'Your discount',
              text: 'It is approved.',
              entity: 'opportunities',
              recordId: opportunity.id,
            },
          },
        ],
      },
      source,
    );
    const [approved, accepted, email] = plan.steps;
    expect(approved.check?.changes).toEqual([
      { field: 'status', from: 'pending', to: 'approved' },
      { field: 'comment', from: null, to: 'Within the standard.' },
    ]);
    expect(accepted.check?.changes).toEqual(
      expect.arrayContaining([
        { field: 'suggestion', from: null, to: 'Not buying this year.' },
        { field: 'status', from: 'new', to: 'nurturing' },
        expect.objectContaining({ field: 'nextTask' }),
      ]),
    );
    expect(email.check).toMatchObject({
      entity: 'opportunities',
      id: opportunity.id,
      name: 'Planned approval deal',
      mail: {
        from: 'manager@example.com',
        to: ['buyer@example.com'],
        cc: [],
        subject: 'Your discount',
        text: 'It is approved.',
      },
    });
    // Rehearsed: nothing decided, nothing sent.
    expect(
      (await service.get(actor('manager'), 'approvals', approval.id)).status,
    ).toBe('pending');
    expect((await service.get(actor('manager'), 'leads', lead.id)).status).toBe(
      'new',
    );
    expect(sent).toEqual([]);

    const executed = await engine.execute(actor('manager'), plan.id, {
      revision: plan.revision,
    });
    expect(executed.status).toBe('executed');
    expect(
      (await service.get(actor('manager'), 'approvals', approval.id)).status,
    ).toBe('approved');
    expect((await service.get(actor('manager'), 'leads', lead.id)).status).toBe(
      'nurturing',
    );
    const entry = await database
      .query()
      .selectFrom('crmHistory')
      .select('aiStatus')
      .where('id', '=', 'planned-suggestion')
      .executeTakeFirst();
    expect(entry?.aiStatus).toBe('accepted');
    // Sent once committed, as the person, from their mailbox, once.
    expect(sent).toEqual([
      {
        actorId: 'manager',
        input: expect.objectContaining({
          accountId: 'box-manager',
          identityId: 'identity-manager',
          to: [{ address: 'buyer@example.com' }],
          subject: 'Your discount',
          text: 'It is approved.',
          idempotencyKey: `crm-plan:${plan.id}:${email.id}`,
        }),
      },
    ]);
    expect(synced).toEqual(['manager']);
    expect(executed.steps[2]).toMatchObject({
      status: 'done',
      result: { submissionId: 'submission-1', delivery: 'queued' },
    });

    // An email that does not go leaves the rest carried out and says so.
    failing = true;
    const unsent = await engine.create(
      actor('manager'),
      {
        title: 'Remind the buyer',
        steps: [
          {
            op: 'comment.create',
            params: { entity: 'leads', id: lead.id, text: 'Reminded.' },
          },
          {
            op: 'mail.send',
            params: {
              to: ['buyer@example.com'],
              subject: 'Reminder',
              text: 'Still interested?',
            },
          },
        ],
      },
      source,
    );
    const after = await engine.execute(actor('manager'), unsent.id, {
      revision: unsent.revision,
    });
    expect(after.status).toBe('executed');
    expect(after.steps.map((step) => step.status)).toEqual(['done', 'failed']);
    expect(after.steps[1].result).toEqual({ code: 'mailFailed' });
  });

  it('checks a record about to be created for duplicates, and looks a new company up on the web for the conversation', async () => {
    await service.save(actor('rep'), 'leads', {
      name: 'Dup Person',
      company: 'Dup Works',
      email: 'dup.person@dup.example',
      source: 'website',
    });
    const company = await service.save(actor('rep'), 'companies', {
      name: 'Dup Works',
    });
    const deal = await service.save(actor('rep'), 'opportunities', {
      name: 'Dup deal',
      companyId: company.id,
    });
    const check = async (query: string, actions = ['crm.search/view']) =>
      asRun(`/duplicateCheck?${query}`, actions);
    const leads = await (
      await check('entity=leads&email=DUP.person@dup.example')
    ).json();
    expect(leads.data).toContainEqual(
      expect.objectContaining({ entity: 'leads', matched: ['email'] }),
    );
    const companies = await (
      await check('entity=companies&name=Dup%20Works')
    ).json();
    expect(companies.data).toContainEqual(
      expect.objectContaining({ entity: 'companies', id: company.id }),
    );
    // A deal for a company: the company by its name, then its open deals.
    const deals = await (
      await check('entity=opportunities&company=Dup%20Works')
    ).json();
    expect(deals.data).toContainEqual(
      expect.objectContaining({ entity: 'opportunities', id: deal.id }),
    );
    expect((await check('entity=leads&name=x', [])).status).toBe(403);
    expect((await request('/duplicateCheck?entity=leads')).status).toBe(401);

    // A new company looked up for a plan: started at once, what it finds
    // told to the conversation.
    web.answers.push({
      text: JSON.stringify({
        name: 'Looked Up Ltd',
        website: 'https://looked.example.cn',
        industry: 'technology',
        uncertain: ['industry'],
        sources: [1],
      }),
      pages: [
        {
          index: 1,
          title: 'About',
          url: 'https://looked.example.cn',
          site: 'L',
        },
      ],
    });
    delivered.length = 0;
    const started = await asRun(
      '/companies/lookUp',
      ['crm.aiWork/request'],
      'POST',
      { name: 'Looked Up', note: 'In Hangzhou' },
    );
    expect(started.status).toBe(202);
    await vi.waitFor(() => expect(delivered).toHaveLength(1));
    expect(delivered[0]).toMatchObject({
      conversationId: 'conversation-1',
      news: {
        notice: {
          type: 'aiWork',
          title: 'Looked Up',
          params: { entity: 'companies', outcome: 'ready' },
        },
      },
    });
    const told = (delivered[0].news.input as { text: string }).text;
    expect(told).toContain('https://looked.example.cn');
    expect(told).toContain('"industry"');
    // Saving nothing.
    expect(
      (await service.list(actor('rep'), 'companies', { search: 'Looked Up' }))
        .total,
    ).toBe(0);
    expect(
      (await asRun('/companies/lookUp', [], 'POST', { name: 'Looked Up' }))
        .status,
    ).toBe(403);
  });

  it('replaces a waiting plan with a newer one that would do the same', async () => {
    const lead = await service.save(actor('rep'), 'leads', {
      name: 'Twice proposed',
      source: 'website',
    });
    const propose = async (title: string, steps: unknown[]) =>
      (
        await (
          await asRun('/plans', ['crm.plans/create'], 'POST', { title, steps })
        ).json()
      ).data as PlanOutcome['plan'];
    const rename = (name: string) => ({
      op: 'record.update',
      params: { entity: 'leads', id: lead.id, values: { name } },
    });
    const first = await propose('Rename it', [rename('First name')]);
    // A comment conflicts with nothing: the first still waits.
    await propose('Note it', [
      {
        op: 'comment.create',
        params: { entity: 'leads', id: lead.id, text: 'Called.' },
      },
    ]);
    expect((await plans.get(actor('rep'), first.id)).status).toBe('pending');
    // Changing the same field again replaces it.
    const second = await propose('Rename it better', [rename('Second name')]);
    expect(await plans.get(actor('rep'), first.id)).toMatchObject({
      status: 'superseded',
      failure: { code: 'superseded', supersededBy: second.id },
    });
    expect(second.status).toBe('pending');
    const late = await request(`/plans/${first.id}/execute`, 'rep', 'POST', {
      revision: first.revision,
    });
    expect(late.status).toBe(400);
    expect((await late.json()).error.reason).toBe('PLAN_DECIDED');
  });

  it('lets the assistant read as the person and turns its writes into plans in its conversation', async () => {
    const asAssistant = (
      path: string,
      method = 'GET',
      body?: unknown,
      user = 'rep',
    ): Promise<Response> =>
      router.request(path, {
        method,
        headers: {
          'x-test-user': user,
          'x-test-assistant': 'conversation-a',
          'Content-Type': 'application/json',
        },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      });
    // Reading what the person may read.
    expect((await asAssistant('/leads')).status).toBe(200);
    // A change is refused with the way to propose it.
    const created = await asAssistant('/leads', 'POST', {
      name: 'Proposed lead',
      source: 'website',
    });
    expect(created.status).toBe(400);
    expect((await created.json()).error).toMatchObject({
      reason: 'PLAN_REQUIRED',
    });
    // Deleting is never the assistant's.
    const lead = await service.save(actor('rep'), 'leads', {
      name: 'Kept lead',
      source: 'website',
    });
    const removed = await asAssistant(`/leads/${lead.id}`, 'DELETE');
    expect(removed.status).toBe(403);
    expect((await removed.json()).error).toMatchObject({
      reason: 'ACTION_NOT_ALLOWED',
    });
    // A plan it proposes waits for the person, in its conversation, as
    // Sales Expert's.
    const proposed = await asAssistant('/plans', 'POST', {
      title: 'Comment on the lead',
      steps: [
        {
          op: 'comment.create',
          params: { entity: 'leads', id: lead.id, text: 'Called them.' },
        },
      ],
    });
    expect(proposed.status).toBe(201);
    expect((await proposed.json()).data).toMatchObject({
      status: 'pending',
      agentId: 'crm-assistant',
      agentName: 'Sales Expert',
      conversationId: 'conversation-a',
    });
  });

  it("lets a run set the CRM's agents to work directly and tells its conversation what they came to", async () => {
    const lead = await service.save(actor('rep'), 'leads', {
      name: 'Asked by the agent',
      company: 'Asking Co',
      source: 'website',
    });
    // Without the action, refused; with it, the request reaches the route
    // itself rather than being turned into a plan (no AI worker here).
    expect(
      (await asRun(`/leads/${lead.id}/evaluate`, [], 'POST', {})).status,
    ).toBe(403);
    const asked = await asRun(
      `/leads/${lead.id}/evaluate`,
      ['crm.aiWork/request'],
      'POST',
      {},
    );
    expect(asked.status).toBe(503);
    expect((await asked.json()).error.reason).not.toBe('PLAN_REQUIRED');
    expect((await heldActions(service, 'rep')).has('crm.aiWork/request')).toBe(
      true,
    );
    expect(
      (await heldActions(service, 'outsider')).has('crm.aiWork/request'),
    ).toBe(false);

    // A follow-up the run asked for, once finished, is told to its
    // conversation once, with what it suggests.
    delivered.length = 0;
    await database
      .query()
      .insertInto('crmHistory')
      .values({
        id: 'watched-entry',
        entity: 'leads',
        recordId: lead.id,
        actorId: 'rep',
        action: 'ai',
        source: 'ai',
        aiStatus: 'pending',
        ai: JSON.stringify({
          kind: 'evaluation',
          result: { recommendation: 'nurture', summary: 'Not this year.' },
        }),
        changes: JSON.stringify({}),
        createdAt: new Date().toISOString(),
      })
      .execute();
    await watchAiWork(database, {
      id: 'watched-entry',
      entity: 'leads',
      recordId: lead.id,
      userId: 'rep',
      conversationId: 'conversation-9',
    });
    const tell = deliverAiWork(fakeAgents, service);
    await tell('watched-entry');
    await tell('watched-entry');
    expect(delivered).toHaveLength(1);
    expect(delivered[0]).toMatchObject({
      conversationId: 'conversation-9',
      news: {
        notice: {
          type: 'aiWork',
          title: 'Asked by the agent / Asking Co',
          params: { entity: 'leads', outcome: 'ready' },
        },
        input: { type: 'signal' },
      },
    });
    expect((delivered[0].news.input as { text: string }).text).toContain(
      'Not this year.',
    );
    // Work no conversation asked for tells no one.
    await tell('unwatched-entry');
    expect(delivered).toHaveLength(1);

    // A card already made, shown in the run's conversation as its card,
    // the agent not woken; only the record's latest, and only from a run.
    delivered.length = 0;
    const shown = await asRun(
      '/decisions/watched-entry/show',
      ['crm.aiWork/request'],
      'POST',
    );
    expect(await shown.json()).toEqual({ data: { shown: true } });
    expect(delivered).toEqual([
      {
        conversationId: 'conversation-1',
        news: {
          notice: {
            code: 'news',
            type: 'aiWork',
            title: 'Asked by the agent / Asking Co',
            params: {
              entity: 'leads',
              recordId: lead.id,
              entryId: 'watched-entry',
              outcome: 'shown',
            },
          },
        },
      },
    ]);
    // Once in a conversation, it is not put there again.
    await database
      .query()
      .insertInto('agConversationMessages')
      .values({
        id: 'shown-notice',
        conversationId: 'conversation-1',
        role: 'system',
        metadata: JSON.stringify({
          notice: (delivered[0].news as { notice: unknown }).notice,
        }),
      })
      .execute();
    await asRun(
      '/decisions/watched-entry/show',
      ['crm.aiWork/request'],
      'POST',
    );
    expect(delivered).toHaveLength(1);
    expect(
      await (
        await request('/decisions/watched-entry/show', 'rep', 'POST')
      ).json(),
    ).toEqual({ data: { shown: false } });
    expect(
      (
        await asRun(
          '/decisions/watched-entry/show',
          ['crm.aiWork/request'],
          'POST',
          undefined,
          'outsider',
        )
      ).status,
    ).toBe(403);
    await database
      .query()
      .insertInto('crmHistory')
      .values({
        id: 'newer-entry',
        entity: 'leads',
        recordId: lead.id,
        actorId: 'rep',
        action: 'ai',
        source: 'ai',
        aiStatus: 'pending',
        ai: JSON.stringify({
          kind: 'evaluation',
          result: { summary: 'Later.' },
        }),
        changes: JSON.stringify({}),
        createdAt: new Date(Date.now() + 1000).toISOString(),
      })
      .execute();
    const older = await asRun(
      '/decisions/watched-entry/show',
      ['crm.aiWork/request'],
      'POST',
    );
    expect(older.status).toBe(400);

    // A company's signals: started at once, the search going on, and what
    // it found told to the conversation.
    const company = await service.save(actor('rep'), 'companies', {
      name: 'Searched Co',
    });
    web.answers.push({
      text: JSON.stringify({
        events: [
          {
            type: 'funding',
            title: 'Searched Co raised a round.',
            date: new Date(Date.now() - 86_400_000).toISOString().slice(0, 10),
            refs: [1],
          },
        ],
      }),
      pages: [
        {
          index: 1,
          title: 'Round',
          url: 'https://n.example.cn/r',
          site: 'News',
        },
      ],
    });
    delivered.length = 0;
    const started = await asRun(
      `/companies/${company.id}/signals/request`,
      ['crm.aiWork/request'],
      'POST',
    );
    expect(started.status).toBe(202);
    await vi.waitFor(() => expect(delivered).toHaveLength(1));
    expect(delivered[0]).toMatchObject({
      conversationId: 'conversation-1',
      news: {
        notice: {
          type: 'aiWork',
          params: { entity: 'companies', outcome: 'ready' },
        },
      },
    });
    expect((delivered[0].news.input as { text: string }).text).toContain(
      'Searched Co raised a round.',
    );
    // Someone who may not edit the company is refused at once.
    expect(
      (
        await asRun(
          `/companies/${company.id}/signals/request`,
          ['crm.aiWork/request'],
          'POST',
          undefined,
          'outsider',
        )
      ).status,
    ).toBe(403);

    // A record's mail, read as the person from their own mailboxes.
    expect((await request(`/leads/${lead.id}/mail`)).status).toBe(401);
    expect((await request(`/leads/${lead.id}/mail`, 'outsider')).status).toBe(
      403,
    );
    expect(
      await (await asRun(`/leads/${lead.id}/mail`, ['crm.leads/view'])).json(),
    ).toEqual({ data: [] });
  });
});

describe('task preparation', () => {
  it("prepares a task for the people doing it alone, who write it into the task's description", async () => {
    const enabled = vi
      .spyOn(service, 'assistantEnabled')
      .mockResolvedValue(true);
    try {
      const preparation = {
        summary: 'Agree the date of the pilot.',
        brief: 'They asked for a quote last week and liked it.',
        people: [{ name: 'Lin Yue', note: 'Decision maker, cares about cost' }],
        company: 'Opened a plant in Suzhou (https://example.com/news)',
        questions: ['Who signs the order?'],
        bring: ['The quote'],
        risks: ['A competitor is cheaper'],
        agenda: ['Recap the quote', 'Agree the pilot date'],
      };
      const container = new ServiceContainer();
      const { prompts } = fakeModel(container, preparation);
      const preparer = new TaskPreparer(service, container);
      const company = await service.save(actor('rep'), 'companies', {
        name: 'Prep Works',
        ownerId: 'rep',
      });
      const task = await service.save(actor('rep'), 'tasks', {
        name: 'Pilot call',
        description: 'My own notes.',
        companyId: company.id,
        ownerId: 'rep',
        dueAt: new Date(Date.now() + 3_600_000).toISOString(),
      });
      // Only the people doing it may ask.
      await expect(
        preparer.request(actor('manager'), task.id),
      ).rejects.toMatchObject({ code: 'forbidden' });
      await preparer.request(actor('rep'), task.id);
      await preparer.idle();
      const latest = await latestPreparation(service, actor('rep'), task.id);
      expect(latest).toMatchObject({
        status: 'pending',
        ai: { result: { summary: 'Agree the date of the pilot.' } },
      });
      // Prepared in one turn from the skill and the task; no web research,
      // so no news of the company.
      expect(prompts).toHaveLength(1);
      expect(prompts[0]).toContain('# Task preparation');
      expect(prompts[0]).toContain('Pilot call');
      expect(latest?.ai.result?.company).toBeNull();
      // The owner's alone: no one else reads it, as the latest or in the
      // task's history.
      expect(
        await latestPreparation(service, actor('manager'), task.id),
      ).toBeNull();
      const told = async (who: string) =>
        (await service.historyOf(actor(who), 'tasks', task.id)).data.some(
          (event) => event.action === 'ai',
        );
      expect(await told('rep')).toBe(true);
      expect(await told('manager')).toBe(false);
      // A participant reads it too, and may ask for one.
      await service.save(
        actor('rep'),
        'tasks',
        { internalParticipants: ['manager'] },
        task.id,
      );
      expect(
        await latestPreparation(service, actor('manager'), task.id),
      ).not.toBeNull();
      expect(await told('manager')).toBe(true);
      // A participant may ask for it again.
      const asked = await preparer.request(actor('manager'), task.id);
      await preparer.idle();
      const redone = await latestPreparation(service, actor('rep'), task.id);
      expect(redone!.id).toBe(asked!.id);
      // Written in: the points under To prepare, the questions under To
      // ask, the owner's own notes kept.
      expect(
        await preparer.decide(actor('rep'), task.id, redone!.id, 'accept'),
      ).toMatchObject({ status: 'accepted' });
      const description = toText(
        (await service.get(actor('rep'), 'tasks', task.id)).description,
      );
      expect(description).toContain('My own notes.');
      expect(description).toContain('- Agree the pilot date');
      expect(description).toContain('- The quote');
      expect(description).toContain('- Who signs the order?');
    } finally {
      enabled.mockRestore();
    }
  });

  it("prepares on the morning only today's timed tasks with a record, once", async () => {
    const company = await service.save(actor('rep'), 'companies', {
      name: 'Morning Works',
      ownerId: 'rep',
    });
    const { timeZone } = await service.settings();
    const now = new Date();
    const later = new Date(
      Math.min(
        now.getTime() + 60_000,
        endOfDay(now, timeZone).getTime() - 60_000,
      ),
    );
    const timed = await service.save(actor('rep'), 'tasks', {
      name: 'Timed call',
      companyId: company.id,
      ownerId: 'rep',
      dueAt: later.toISOString(),
    });
    const unlinked = await service.save(actor('rep'), 'tasks', {
      name: 'Unlinked call',
      ownerId: 'rep',
      dueAt: later.toISOString(),
    });
    const dateOnly = await service.save(actor('rep'), 'tasks', {
      name: 'Date-only call',
      companyId: company.id,
      ownerId: 'rep',
      dueAt: endOfDay(now, timeZone).toISOString(),
    });
    const asked: string[] = [];
    const preparer = {
      available: async () => true,
      request: async (by: Actor, taskId: string, trigger: unknown) => {
        expect(by.id).toBe('rep');
        expect(trigger).toBe('daily');
        asked.push(taskId);
        await database
          .query()
          .insertInto('crmHistory')
          .values({
            id: `prep-${taskId}`,
            entity: 'tasks',
            recordId: taskId,
            actorId: by.id,
            action: 'ai',
            source: 'ai',
            aiStatus: 'pending',
            ai: JSON.stringify({ kind: 'evaluation', trigger }),
            changes: JSON.stringify({}),
            createdAt: new Date().toISOString(),
          })
          .execute();
        return { id: `prep-${taskId}` };
      },
    } as unknown as TaskPreparer;
    await scanTaskPreparation(service, preparer, now, 1000);
    expect(asked).toContain(timed.id);
    expect(asked).not.toContain(unlinked.id);
    expect(asked).not.toContain(dateOnly.id);
    // Once: the next pass leaves a prepared task alone.
    asked.length = 0;
    await scanTaskPreparation(service, preparer, now, 1000);
    expect(asked).not.toContain(timed.id);
  });
});

describe("The assistant's conversations on the Agents plugin", () => {
  // What the CRM registers on the plugin's context kinds, by kind.
  const resolvers = (): Map<
    string,
    (
      conn: unknown,
      userId: string,
      ids: readonly string[],
    ) => Promise<ReadonlyMap<string, { title: string; url: string | null }>>
  > => {
    const found = new Map();
    registerContextKinds(
      {
        conversations: {
          contextKinds: {
            register: (kind: string, resolve: unknown) => {
              found.set(kind, resolve);
              return () => undefined;
            },
          },
        },
      } as never,
      service,
      '/main',
    );
    return found;
  };

  // What the person may read, as their last workspace load leaves it.
  const remember = async (userId: string): Promise<void> => {
    const reads: Record<string, never> = {};
    for (const entity of entities)
      reads[`${entity}.read`] = (await conditions(
        actor(userId),
        entity,
        'read',
      ).catch(() => null)) as never;
    service.rememberReads(userId, reads);
  };

  it('names in a message only the records the person may read', async () => {
    await remember('rep');
    await remember('outsider');
    const lead = await service.save(actor('rep'), 'leads', {
      name: 'Context lead',
    });
    const id = toText(lead.id);
    const leads = resolvers().get('leads')!;
    // Inside a transaction, as the plugin calls them when a message is saved.
    const within = <T>(run: (conn: unknown) => Promise<T>): Promise<T> =>
      database.transaction((conn) => run(conn));
    const mine = await within((conn) => leads(conn, 'rep', [id, 'missing']));
    expect([...mine.keys()]).toEqual([id]);
    expect(mine.get(id)).toMatchObject({
      title: 'Context lead',
      url: `/main/crm/leads/${id}`,
    });
    // Someone who may not read it learns nothing of it.
    expect((await within((conn) => leads(conn, 'outsider', [id]))).size).toBe(
      0,
    );
  });

  it('names nothing without a recent snapshot of what the person may read', async () => {
    const lead = await service.save(actor('rep'), 'leads', {
      name: 'Unsnapshotted lead',
    });
    const leads = resolvers().get('leads')!;
    const seen = await database.transaction((conn) =>
      leads(conn, 'nobody-yet', [toText(lead.id)]),
    );
    expect(seen.size).toBe(0);
  });

  it('names an AI card for whoever reads its record, and for no one else', async () => {
    await remember('rep');
    await remember('outsider');
    const lead = await service.save(actor('rep'), 'leads', {
      name: 'Card lead',
    });
    const now = new Date().toISOString();
    await database
      .query()
      .insertInto('crmHistory')
      .values({
        id: 'card-1',
        entity: 'leads',
        recordId: toText(lead.id),
        actorId: 'rep',
        action: 'evaluation',
        source: 'ai',
        changes: JSON.stringify({}),
        createdAt: now,
      })
      .execute();
    const cards = resolvers().get('crm-evaluation')!;
    const within = <T>(run: (conn: unknown) => Promise<T>): Promise<T> =>
      database.transaction((conn) => run(conn));
    const seen = await within((conn) => cards(conn, 'rep', ['card-1']));
    expect(seen.get('card-1')).toMatchObject({
      title: 'AI follow-up: Card lead',
      url: `/main/crm/leads/${toText(lead.id)}?focus=card-1`,
    });
    expect(
      (await within((conn) => cards(conn, 'outsider', ['card-1']))).size,
    ).toBe(0);
  });

  it('gives every conversation the business guidance and the time zone', async () => {
    const rules = crmConversationRules(() => ({
      ...defaultSettings,
      timeZone: 'Europe/Berlin',
      aiLanguage: 'en-US',
    }));
    const lines = await rules({} as never, {} as never);
    expect(lines.rules?.some((rule) => rule.includes('Europe/Berlin'))).toBe(
      true,
    );
    // The mail it writes is signed by the person it works for.
    const named = await rules({} as never, { ownerName: '赵敏' } as never);
    expect(named.rules?.[0]).toContain('You work for 赵敏');
    expect(lines.rules?.some((rule) => rule.includes('web search'))).toBe(true);
    // The guidance's headings each lead a section.
    expect(lines.sections?.length).toBeGreaterThan(1);
    expect(
      lines.sections?.every((section) => section[0]?.startsWith('#')),
    ).toBe(true);
  });

  it('works from the guidance an administrator wrote, and from the shipped one once it is cleared', async () => {
    try {
      const saved = await service.saveSettings(actor('admin'), {
        businessGuidance: '# Our rules\n- Quote list prices only',
      });
      expect(saved.businessGuidance).toBe(
        '# Our rules\n- Quote list prices only',
      );
      expect(settingsGuidance(saved)).toBe(
        '# Our rules\n- Quote list prices only',
      );
      const lines = await crmConversationRules(() => saved)(
        {} as never,
        {} as never,
      );
      expect(lines.sections).toEqual([
        ['# Our rules', '- Quote list prices only'],
      ]);
      // Only an administrator writes it, within a long text's length.
      await expect(
        service.saveSettings(actor('rep'), { businessGuidance: 'x' }),
      ).rejects.toBeInstanceOf(Error);
      await expect(
        service.saveSettings(actor('admin'), {
          businessGuidance: 'x'.repeat(30_001),
        }),
      ).rejects.toMatchObject({
        code: 'invalidInput',
        field: 'businessGuidance',
      });
      // Blank is the shipped guidance again.
      const cleared = await service.saveSettings(actor('admin'), {
        businessGuidance: '  ',
      });
      expect(cleared.businessGuidance).toBe('');
      // (in the AI language these tests run with)
      expect(settingsGuidance(cleared)).toContain('NocoBase');
      expect(settingsGuidance(cleared)).not.toContain('# Our rules');
    } finally {
      await service.saveSettings(actor('admin'), { businessGuidance: '' });
    }
  });

  it("gives the assistant's conversations the CRM's prompt, its tools and every chat model, DeepSeek's first", async () => {
    const scopes = new Map<string, (context: unknown) => unknown>();
    const tools = new Map<string, unknown>();
    const resolvers: unknown[] = [];
    const container = new ServiceContainer();
    container.instance(authenticationToken, {
      addCredentialResolver: (resolver: unknown) => {
        resolvers.push(resolver);
        return () => undefined;
      },
    } as never);
    const fakeOnline = {
      onlineAgent: {
        configurator: {
          registerTool: (name: string, options: unknown) =>
            tools.set(name, options),
          registerOnlineAgentScope: (
            name: string,
            provider: (context: unknown) => unknown,
          ) => scopes.set(name, provider),
        },
      },
      models: {
        gateway: {
          catalog: () =>
            Promise.resolve({
              services: [
                {
                  name: 'qwen',
                  title: 'Qwen',
                  provider: 'alibaba',
                  models: [
                    { value: 'max', kind: 'chat' },
                    { value: 'embed', kind: 'embedding' },
                  ],
                },
                {
                  name: 'deepseek',
                  title: 'DeepSeek',
                  provider: 'deepseek',
                  models: [{ value: 'flash', kind: 'chat' }],
                },
              ],
            }),
        },
      },
    } as never;
    configureAssistant(
      { container, publicBasePath: '/main' } as never,
      fakeOnline,
      service,
      () => ({ ...defaultSettings, timeZone: 'Asia/Shanghai' }),
    );
    expect([...tools.keys()]).toEqual(['crm', 'crm_skill']);
    expect(resolvers).toHaveLength(1);
    const scope = (await scopes.get(ASSISTANT_SCOPE)?.({
      user: { id: 'rep' },
    })) as {
      agentId: string;
      tool: string[];
      model: string[];
      systemPromptTemplate: string;
    };
    expect(scope).toMatchObject({
      agentId: 'online',
      tool: ['crm', 'crm_skill'],
      model: ['deepseek/flash', 'qwen/max'],
    });
    const prompt = scope.systemPromptTemplate;
    // Who it works for, how it reaches the CRM, how changes are proposed,
    // and the time where the CRM works.
    expect(prompt).toContain('You work for rep:');
    expect(prompt).toContain('Find things with the `crm` tool');
    expect(prompt).toContain(
      "run `crm plan create` with the plan as the command's `body`",
    );
    expect(prompt).toContain('<crm-news>');
    expect(prompt).toContain('Asia/Shanghai');
    expect(prompt).not.toContain('--file /tmp/plan.json');
  });

  it('takes over once what an administrator set on the work agents an earlier release made', async () => {
    const query = database.query();
    await query
      .deleteFrom('crmSettings')
      .where('id', 'in', [
        'ai-work-agents',
        'agents-work-v1',
        'agents-background-v1',
      ])
      .execute();
    await query
      .deleteFrom('agAgents')
      .where('id', 'in', ['lead', 'review', 'archived', 'background'])
      .execute();
    await query
      .insertInto('crmSettings')
      .values([
        {
          id: 'agents-work-v1',
          value: JSON.stringify({
            version: 1,
            agentIds: { leads: 'lead', approvals: 'review', tasks: 'archived' },
          }),
          updatedAt: new Date(),
        },
        {
          id: 'agents-background-v1',
          value: JSON.stringify({ version: 1, agentId: 'background' }),
          updatedAt: new Date(),
        },
      ])
      .execute();
    const upgradedAt = '2026-10-21T06:00:00.000Z';
    await query
      .insertInto('agAgents')
      .values([
        // Its model chosen, its instructions changed.
        {
          id: 'lead',
          instructions: 'Follow every lead up in two lines.',
          modelEntries: JSON.stringify([
            { modelService: 'qwen', model: 'max' },
            { modelService: 'deepseek', model: 'flash' },
          ]),
          archivedAt: upgradedAt,
          deletedAt: upgradedAt,
        },
        // Its instructions as shipped.
        {
          id: 'review',
          instructions: workInstructions('approvals'),
          modelEntries: JSON.stringify([
            { modelService: 'deepseek', model: 'flash' },
          ]),
          archivedAt: upgradedAt,
          deletedAt: upgradedAt,
        },
        // Archived by a person before the upgrade.
        {
          id: 'archived',
          instructions: 'Old.',
          modelEntries: JSON.stringify([
            { modelService: 'qwen', model: 'max' },
          ]),
          archivedAt: '2026-10-01T00:00:00.000Z',
          deletedAt: upgradedAt,
        },
        // The Background AI, whose changed instructions a work without an
        // agent of its own takes.
        {
          id: 'background',
          instructions: 'Work for the CRM, briefly.',
          modelEntries: JSON.stringify([]),
          archivedAt: upgradedAt,
          deletedAt: upgradedAt,
        },
      ])
      .execute();
    await adoptLegacyWorkAgents(database);
    // Once: a later change of the old rows is not taken.
    await query
      .updateTable('agAgents')
      .set({ instructions: 'Changed after.' })
      .where('id', '=', 'lead')
      .execute();
    await adoptLegacyWorkAgents(database);
    expect(await workAgentSettings(database)).toEqual({
      leads: {
        model: { modelService: 'qwen', model: 'max' },
        instructions: 'Follow every lead up in two lines.',
      },
      approvals: {
        model: { modelService: 'deepseek', model: 'flash' },
        instructions: null,
      },
      opportunities: {
        model: null,
        instructions: 'Work for the CRM, briefly.',
      },
      signals: { model: null, instructions: 'Work for the CRM, briefly.' },
    });
  });

  it("names the work agents in the viewer's language, with the model each asks now", async () => {
    const names = await workAgentNames(
      {
        models: {
          gateway: {
            catalog: () =>
              Promise.resolve({
                services: [
                  {
                    name: 'qwen',
                    title: 'Qwen',
                    provider: 'alibaba',
                    models: [{ value: 'max', kind: 'chat' }],
                  },
                ],
              }),
          },
        },
      } as never,
      database,
    );
    expect(names.leads).toEqual({
      name: 'Lead follow-up',
      nameText: { key: 'crm.agentWork.names.leads', ns: 'crm' },
      description: null,
      descriptionText: { key: 'crm.agentWork.leads', ns: 'crm' },
      model: { modelService: 'qwen', model: 'max' },
    });
    expect(names.signals?.name).toBe('Company research');
  });

  it("names the configured model on the assistant's conversations that name none, so they can be read", async () => {
    const query = database.query();
    const ids = ['no-model', 'with-model', 'other-chat', 'later'];
    await query.deleteFrom('agConversations').where('id', 'in', ids).execute();
    const native = JSON.stringify({ onlineAgent: { version: 1 } });
    const row = (
      id: string,
      metadata: string | null,
      model: string | null,
    ) => ({
      id,
      userId: 'rep',
      source: 'crm',
      agentId: '0',
      mode: null,
      modelService: model ? 'qwen' : null,
      model,
      metadata,
      createdAt: '2026-10-21T09:00:00.000Z',
    });
    await query
      .insertInto('agConversations')
      .values([
        row('no-model', native, null),
        row('with-model', native, 'max'),
        row('other-chat', null, null),
        row('later', native, null),
      ])
      .execute();
    const app = {
      config: {
        get: () => ({
          deepseek: { enabledModels: [{ value: 'deepseek-flash' }] },
        }),
      },
    } as unknown as Parameters<typeof namePlaceholderModel>[0];
    // The import names only the conversations it made.
    await namePlaceholderModel(app, query, ['no-model']);
    const read = async () =>
      Object.fromEntries(
        (
          await query
            .selectFrom('agConversations')
            .select(['id', 'modelService', 'model'])
            .where('id', 'in', ids)
            .execute()
        ).map((found) => [found.id, `${found.modelService}/${found.model}`]),
      );
    expect(await read()).toMatchObject({
      'no-model': 'deepseek/deepseek-flash',
      later: 'null/null',
    });
    // At start, every one of the assistant's that names none.
    await namePlaceholderModel(app, query);
    expect(await read()).toEqual({
      'no-model': 'deepseek/deepseek-flash',
      'with-model': 'qwen/max',
      'other-chat': 'null/null',
      later: 'deepseek/deepseek-flash',
    });
    await query.deleteFrom('agConversations').where('id', 'in', ids).execute();
  });

  it('carries the conversations with the earlier assistant over to it once, in place', async () => {
    const query = database.query();
    await query
      .deleteFrom('crmSettings')
      .where('id', '=', 'agents-native-conversations-v1')
      .execute();
    await query
      .deleteFrom('agConversationMessages')
      .where('conversationId', '=', 'old-chat')
      .execute();
    await query
      .deleteFrom('agConversations')
      .where('id', '=', 'old-chat')
      .execute();
    await query
      .insertInto('agConversations')
      .values({
        id: 'old-chat',
        userId: 'rep',
        source: 'crm',
        agentId: 'removed-agent',
        mode: 'online',
        modelService: 'qwen',
        model: 'max',
        metadata: null,
        createdAt: '2026-10-19T09:00:00.000Z',
      })
      .execute();
    const context = {
      route: '/leads/l1',
      items: [
        {
          kind: 'leads',
          id: 'l1',
          title: 'Tang Rui',
          key: null,
          url: '/main/leads/l1',
        },
      ],
      dropped: 0,
    };
    await query
      .insertInto('agConversationMessages')
      .values([
        {
          id: 'old-1',
          conversationId: 'old-chat',
          seq: 1,
          role: 'user',
          content: JSON.stringify({ type: 'text', content: 'Is it worth it?' }),
          workContext: JSON.stringify(context),
          metadata: JSON.stringify({}),
          createdAt: '2026-10-19T09:00:00.000Z',
        },
        {
          id: 'old-2',
          conversationId: 'old-chat',
          seq: 2,
          role: 'assistant',
          content: JSON.stringify({ type: 'text', content: 'Yes, **soon**.' }),
          workContext: null,
          metadata: JSON.stringify({}),
          createdAt: '2026-10-19T09:01:00.000Z',
        },
        {
          id: 'old-3',
          conversationId: 'old-chat',
          seq: 3,
          role: 'system',
          content: JSON.stringify({ type: 'text', content: 'Add Acme' }),
          workContext: null,
          metadata: JSON.stringify({
            notice: {
              code: 'news',
              type: 'planDecided',
              title: 'Add Acme',
              params: { planId: 'p1', decision: 'executed' },
            },
          }),
          createdAt: '2026-10-19T09:02:00.000Z',
        },
      ])
      .execute();
    const resolved: unknown[] = [];
    const fakeOnline = {
      onlineAgent: {
        configurator: {
          resolve: (actor: { user: { id: string } }, options: unknown) => {
            resolved.push({ user: actor.user.id, options });
            return Promise.resolve({
              scope: ['crm'],
              systemPrompt: 'Prompt.',
              tool: ['crm'],
              toolVersions: { crm: '1' },
              model: ['deepseek/flash', 'qwen/max'],
              agentId: 'online',
            });
          },
        },
      },
    } as never;
    const warnings: unknown[] = [];
    const logger = { warn: (details: object) => warnings.push(details) };
    await adoptLegacyConversations(fakeOnline, service, logger);
    await adoptLegacyConversations(fakeOnline, service, logger);
    expect(warnings).toEqual([]);
    expect(resolved).toEqual([
      { user: 'rep', options: { scope: ['crm'], agentId: 'online' } },
    ]);
    const row = await query
      .selectFrom('agConversations')
      .selectAll()
      .where('id', '=', 'old-chat')
      .executeTakeFirst();
    // Bound to the assistant, on its own model while the scope offers it.
    expect(row).toMatchObject({
      agentId: '0',
      modelService: 'qwen',
      model: 'max',
    });
    expect(JSON.parse(toText(row?.metadata))).toMatchObject({
      onlineAgent: { kind: 'realtime', config: { scope: ['crm'] }, call: null },
    });
    const originals = (
      await query
        .selectFrom('agConversationMessages')
        .select(['id', 'content'])
        .where('conversationId', '=', 'old-chat')
        .orderBy('seq')
        .execute()
    ).map((message) => JSON.parse(toText(message.content)).original);
    expect(originals).toEqual([
      {
        id: 'old-1',
        role: 'user',
        metadata: {
          conversationId: 'old-chat',
          createdAt: '2026-10-19T09:00:00.000Z',
          revision: 1,
          seq: 1,
          context,
        },
        parts: [{ type: 'text', text: 'Is it worth it?' }],
      },
      {
        id: 'old-2',
        role: 'assistant',
        metadata: {
          conversationId: 'old-chat',
          createdAt: '2026-10-19T09:01:00.000Z',
          revision: 1,
          seq: 2,
        },
        parts: [{ type: 'text', text: 'Yes, **soon**.', state: 'done' }],
      },
      {
        id: 'old-3',
        role: 'system',
        metadata: {
          conversationId: 'old-chat',
          createdAt: '2026-10-19T09:02:00.000Z',
          revision: 1,
          seq: 3,
        },
        parts: [
          {
            type: 'data-notice',
            id: 'record:old-3',
            data: {
              type: 'planDecided',
              title: 'Add Acme',
              params: { planId: 'p1', decision: 'executed' },
            },
          },
        ],
      },
    ]);
  });

  it('puts the method skills into the library once, keeping one a person added', async () => {
    const created: string[] = [];
    const fakeAgents = {
      skills: {
        // A person added a lead follow-up skill of their own already.
        list: () => Promise.resolve([{ id: 'mine', slug: 'lead-follow-up' }]),
        create: (_by: null, input: { content: string }) => {
          created.push(/^name:\s*(\S+)$/mu.exec(input.content)?.[1] ?? '');
          return Promise.resolve({ id: `skill-${String(created.length)}` });
        },
      },
    } as never;
    await database
      .query()
      .deleteFrom('crmSettings')
      .where('id', '=', 'agents-skills-v1')
      .execute();
    const dir = resolve(process.cwd(), 'ai/skills');
    await provisionSkills(fakeAgents, database, dir);
    await provisionSkills(fakeAgents, database, dir);
    expect(created).toEqual([
      'opportunity-follow-up',
      'approval-review',
      'task-preparation',
      'company-signals',
    ]);
    const marker = await database
      .query()
      .selectFrom('crmSettings')
      .select('value')
      .where('id', '=', 'agents-skills-v1')
      .executeTakeFirst();
    expect(JSON.parse(toText(marker?.value)).skillIds['lead-follow-up']).toBe(
      'mine',
    );
  });

  it('adds the skills a start without their files missed, and never one already put there', async () => {
    const created: string[] = [];
    const fakeAgents = {
      skills: {
        list: () => Promise.resolve([]),
        create: (_by: null, input: { content: string }) => {
          created.push(/^name:\s*(\S+)$/mu.exec(input.content)?.[1] ?? '');
          return Promise.resolve({ id: `skill-${String(created.length)}` });
        },
        attached: () => Promise.resolve([]),
        attach: (_target: unknown, ids: string[]) => Promise.resolve(ids),
      },
    } as never;
    await database
      .query()
      .deleteFrom('crmSettings')
      .where('id', '=', 'agents-skills-v1')
      .execute();
    // A deployment built without the files: nothing to add, but the marker
    // is written.
    await provisionSkills(
      fakeAgents,
      database,
      resolve(process.cwd(), 'no-such-dir'),
    );
    expect(created).toEqual([]);
    // An administrator's deleted skill keeps its id in the marker.
    await database
      .query()
      .updateTable('crmSettings')
      .set({
        value: JSON.stringify({
          version: 1,
          skillIds: { 'lead-follow-up': 'deleted-one' },
        }),
      })
      .where('id', '=', 'agents-skills-v1')
      .execute();
    // The next start finds the files: the four never put there are added.
    const dir = resolve(process.cwd(), 'ai/skills');
    await provisionSkills(fakeAgents, database, dir);
    await provisionSkills(fakeAgents, database, dir);
    expect(created).toEqual([
      'opportunity-follow-up',
      'approval-review',
      'task-preparation',
      'company-signals',
    ]);
    const marker = await database
      .query()
      .selectFrom('crmSettings')
      .select('value')
      .where('id', '=', 'agents-skills-v1')
      .executeTakeFirst();
    expect(JSON.parse(toText(marker?.value))).toEqual({
      version: 1,
      skillIds: {
        'lead-follow-up': 'deleted-one',
        'opportunity-follow-up': 'skill-1',
        'approval-review': 'skill-2',
        'task-preparation': 'skill-3',
        'company-signals': 'skill-4',
      },
    });
  });
});

describe('the notifications the inbox describes', () => {
  it('tells its recipient alone who mentioned them, when, and in what comment', async () => {
    const lead = await service.save(actor('rep'), 'leads', {
      name: 'Notice Person',
      company: 'Notice Works',
      ownerId: 'rep',
    });
    await service.addComment(
      actor('rep'),
      'leads',
      toText(lead.id),
      'Please call them, @manager',
      ['manager'],
    );
    // Queued once the comment is saved; delivered, it carries a
    // notification id, as CrmProvider records it.
    await vi.waitFor(async () => {
      const queued = await database
        .query()
        .selectFrom('crmOutbox')
        .selectAll()
        .where('recordId', '=', toText(lead.id))
        .where('event', '=', 'mentioned')
        .executeTakeFirst();
      expect(queued).toBeTruthy();
    });
    const row = await database
      .query()
      .selectFrom('crmOutbox')
      .selectAll()
      .where('recordId', '=', toText(lead.id))
      .where('event', '=', 'mentioned')
      .executeTakeFirstOrThrow();
    expect(row.actorId).toBe('rep');
    await database
      .query()
      .updateTable('crmOutbox')
      .set({ status: 'submitted', notificationId: 'notice-test-1' })
      .where('id', '=', row.id)
      .execute();
    const [notice] = await noticesOf(service, actor('manager'), [
      'notice-test-1',
    ]);
    expect(notice).toMatchObject({
      notificationId: 'notice-test-1',
      source: 'crm',
      type: 'mentioned',
      subject: { type: 'leads', id: lead.id },
      data: {
        actorId: 'rep',
        comment: { text: 'Please call them, @manager', reply: false },
      },
    });
    // Someone else's notification is not theirs to describe.
    expect(await noticesOf(service, actor('other'), ['notice-test-1'])).toEqual(
      [],
    );
  });
});

describe('the attachment cleanup', () => {
  it('deletes a file nothing uses a week after it was found unused, and keeps one used', async () => {
    const query = database.query();
    const at = new Date();
    for (const id of ['sweep-used', 'sweep-unused', 'sweep-comment'])
      await query
        .insertInto('crmFiles')
        .values({
          id,
          disk: 'local',
          key: `${id}.txt`,
          filename: `${id}.txt`,
          createdAt: at,
          updatedAt: at,
        })
        .execute();
    // A record using one, and a comment carrying another.
    await query
      .insertInto('crmTasks')
      .values({
        id: 'sweep-task',
        name: 'Sweep task',
        ownerId: 'admin',
        createdById: 'admin',
        status: 'open',
        attachments: JSON.stringify(['sweep-used']),
        createdAt: at.toISOString(),
        updatedAt: at.toISOString(),
      })
      .execute();
    await query
      .insertInto('crmHistory')
      .values({
        id: 'sweep-note',
        entity: 'tasks',
        recordId: 'sweep-task',
        actorId: 'admin',
        action: 'comment',
        changes: JSON.stringify({
          text: 'with a file',
          attachments: ['sweep-comment'],
        }),
        createdAt: at.toISOString(),
      })
      .execute();
    const deleted: string[] = [];
    const disk = {
      delete: async (key: string) => {
        deleted.push(key);
      },
    };
    // The drive manager's `use(disk)`, named so as not to read as a hook.
    const pick = 'use';
    const drive = { [pick]: () => disk } as unknown as Parameters<
      typeof sweepFiles
    >[1];
    // Found unused, kept for now.
    const first = await sweepFiles(service, drive, at);
    expect(first.deleted).toBe(0);
    const left = async (): Promise<string[]> =>
      (
        await query
          .selectFrom('crmFiles')
          .select('id')
          .where('id', 'in', ['sweep-used', 'sweep-unused', 'sweep-comment'])
          .execute()
      )
        .map((row) => toText(row.id))
        .sort();
    expect(await left()).toEqual([
      'sweep-comment',
      'sweep-unused',
      'sweep-used',
    ]);
    // A week later: the unused one goes, its stored file with it.
    await sweepFiles(service, drive, new Date(at.getTime() + GRACE_MS + 1000));
    expect(await left()).toEqual(['sweep-comment', 'sweep-used']);
    expect(deleted).toContain('sweep-unused.txt');
  });
  it("finds a deal and a contact by their company's name, word by word", async () => {
    const company = await service.save(actor('rep'), 'companies', {
      name: 'Haoyang Energy',
    });
    const deal = await service.save(actor('rep'), 'opportunities', {
      name: 'Safety training system',
      companyId: company.id,
    });
    const contact = await service.save(actor('rep'), 'contacts', {
      name: 'Gu Lan',
      companyId: company.id,
    });
    const found = async (
      entity: 'opportunities' | 'contacts',
      search: string,
    ) =>
      (
        await service.list(actor('rep'), entity, { search, pageSize: 100 })
      ).data.map((row) => row.id);
    expect(await found('opportunities', 'Haoyang')).toContain(deal.id);
    expect(await found('opportunities', 'haoyang safety')).toContain(deal.id);
    expect(await found('opportunities', 'Haoyang nothing')).not.toContain(
      deal.id,
    );
    expect(await found('contacts', 'Haoyang')).toContain(contact.id);
  });
  it("keeps a search's AI answer as a conversation, deletes one left and sweeps those left behind", async () => {
    const query = service.database.query();
    const at = new Date('2026-10-01T09:00:00.000Z');
    const answer = async (
      id: string,
      userId: string,
      source = 'crm-search',
    ) => {
      await query
        .insertInto('agConversations')
        .values({ id, userId, source, createdAt: at.toISOString() })
        .execute();
      await query
        .insertInto('agConversationMessages')
        .values({ id: `${id}-m`, conversationId: id })
        .execute();
    };
    await answer('sa-kept', 'rep');
    await answer('sa-left', 'rep');
    await answer('sa-closed', 'rep');
    await answer('sa-recent', 'rep');
    await answer('sa-chat', 'rep', 'crm');
    // Going on asking makes it one of the CRM's conversations; not another's.
    expect(await keepSearchAnswer(service, 'manager', 'sa-kept')).toBe(false);
    expect(await keepSearchAnswer(service, 'rep', 'sa-kept')).toBe(true);
    // Leaving it deletes it, but never another's or one kept.
    await discardSearchAnswer(service, 'manager', 'sa-left');
    await discardSearchAnswer(service, 'rep', 'sa-kept');
    await discardSearchAnswer(service, 'rep', 'sa-left');
    const sources = async () =>
      Object.fromEntries(
        (
          await query
            .selectFrom('agConversations')
            .select(['id', 'source'])
            .where('id', 'like', 'sa-%')
            .execute()
        ).map((row) => [toText(row.id), toText(row.source)]),
      );
    expect(await sources()).toEqual({
      'sa-kept': 'crm',
      'sa-closed': 'crm-search',
      'sa-recent': 'crm-search',
      'sa-chat': 'crm',
    });
    // The daily sweep takes those left an hour or more, messages and all.
    await query
      .updateTable('agConversations')
      .set({ createdAt: new Date().toISOString() })
      .where('id', '=', 'sa-recent')
      .execute();
    expect((await sweepSearchAnswers(service)).deleted).toBe(1);
    expect(Object.keys(await sources()).sort()).toEqual([
      'sa-chat',
      'sa-kept',
      'sa-recent',
    ]);
    expect(
      await query
        .selectFrom('agConversationMessages')
        .select('id')
        .where('conversationId', '=', 'sa-closed')
        .execute(),
    ).toEqual([]);
  });
});

describe('WhatsApp', () => {
  const NUMBER = '1234567890';
  const sign = (body: string): string =>
    `sha256=${createHmac('sha256', 'app-secret').update(body).digest('hex')}`;
  const deliver = (body: unknown, signature?: string): Promise<Response> => {
    const text = JSON.stringify(body);
    return webhooks.request('/webhooks/whatsapp', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...(signature === undefined
          ? { 'x-hub-signature-256': sign(text) }
          : signature
            ? { 'x-hub-signature-256': signature }
            : {}),
      },
      body: text,
    });
  };
  // A delivery of one customer's messages, in Meta's shape.
  const delivery = (
    from: { waId?: string; userId?: string; name?: string },
    messages: Record<string, unknown>[],
    statuses: Record<string, unknown>[] = [],
  ) => ({
    object: 'whatsapp_business_account',
    entry: [
      {
        id: 'waba-1',
        changes: [
          {
            field: 'messages',
            value: {
              messaging_product: 'whatsapp',
              metadata: {
                display_phone_number: '15550001111',
                phone_number_id: NUMBER,
              },
              contacts: [
                {
                  profile: { name: from.name ?? 'Customer' },
                  ...(from.waId ? { wa_id: from.waId } : {}),
                  ...(from.userId ? { user_id: from.userId } : {}),
                },
              ],
              messages: messages.map((m) => ({
                ...(from.waId ? { from: from.waId } : {}),
                ...(from.userId ? { from_user_id: from.userId } : {}),
                ...m,
              })),
              statuses,
            },
          },
        ],
      },
    ],
  });
  const seconds = (at: Date): string => String(Math.floor(at.getTime() / 1000));
  const text = (id: string, body: string, at = new Date()) => ({
    id,
    timestamp: seconds(at),
    type: 'text',
    text: { body },
  });
  const outbox = async (recipientId: string, event: string) =>
    database
      .query()
      .selectFrom('crmOutbox')
      .selectAll()
      .where('recipientId', '=', recipientId)
      .where('event', '=', event)
      .execute();

  beforeAll(async () => {
    await whatsapp.saveApp({ appSecret: 'app-secret' });
    await whatsapp.addNumber({
      phoneNumberId: NUMBER,
      wabaId: 'waba-1',
      mode: 'coexistence',
      accessToken: 'token',
    });
  });

  it('answers Meta’s subscription check only with the verify token it made', async () => {
    const { verifyToken } = await whatsapp.connection();
    expect(verifyToken).toBeTruthy();
    const check = (token: string) =>
      webhooks.request(
        `/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=${encodeURIComponent(token)}&hub.challenge=4242`,
      );
    const ok = await check(toText(verifyToken));
    expect(ok.status).toBe(200);
    expect(await ok.text()).toBe('4242');
    expect((await check('wrong')).status).toBe(403);
    // The credentials are never returned, only that they are set.
    const view = await request('/whatsapp/connection', 'admin');
    expect(view.status).toBe(200);
    const { data } = (await view.json()) as { data: Row };
    expect(data).toMatchObject({
      configured: true,
      hasAppSecret: true,
      numbers: [
        {
          phoneNumberId: NUMBER,
          mode: 'coexistence',
          hasAccessToken: true,
        },
      ],
    });
    expect(JSON.stringify(data)).not.toContain('app-secret');
    expect(JSON.stringify(data)).not.toContain('"token"');
    expect((await request('/whatsapp/connection', 'rep')).status).toBe(403);
    expect((await request('/whatsapp/connection')).status).toBe(401);
  });

  it('adds, changes and removes numbers for the managers, and lists conversations by number', async () => {
    const OTHER = '2223334445';
    const add = {
      phoneNumberId: OTHER,
      mode: 'api',
      accessToken: 't2',
    };
    expect(
      (await request('/whatsapp/numbers', 'rep', 'POST', add)).status,
    ).toBe(403);
    expect(
      (await request('/whatsapp/numbers', undefined, 'POST', add)).status,
    ).toBe(401);
    await expect(
      whatsapp.addNumber({
        phoneNumberId: NUMBER,
        accessToken: 'x',
      }),
    ).rejects.toMatchObject({ code: 'numberExists' });
    // The CRM assigns no one to reply: a receptionist is no field of it.
    expect(
      (
        await request('/whatsapp/numbers', 'admin', 'POST', {
          ...add,
          defaultHandlerId: 'admin',
        })
      ).status,
    ).toBe(400);
    await expect(
      whatsapp.addNumber({ phoneNumberId: 'abc', accessToken: 'x' }),
    ).rejects.toMatchObject({ code: 'invalidInput' });
    await expect(
      whatsapp.addNumber({ phoneNumberId: '99988877766' }),
    ).rejects.toMatchObject({ code: 'required' });
    expect((await request('/whatsapp/numbers', 'admin', 'POST', add)).ok).toBe(
      true,
    );
    const other = (await whatsapp.numbers()).find(
      (n) => toText(n.phoneNumberId) === OTHER,
    );
    expect(other).toMatchObject({ mode: 'api' });
    const otherId = toText(other?.id);
    expect(
      (
        await request(`/whatsapp/numbers/${otherId}`, 'admin', 'PUT', {
          wabaId: 'waba-2',
        })
      ).ok,
    ).toBe(true);
    expect(
      (await whatsapp.numbers()).find((n) => toText(n.id) === otherId),
    ).toMatchObject({ wabaId: 'waba-2', mode: 'api' });
    expect(
      (await request(`/whatsapp/numbers/${otherId}`, 'rep', 'PUT', {})).status,
    ).toBe(403);
    // A customer writes to it: the conversation is that number's, and only
    // it shows under that number.
    const body = JSON.parse(
      JSON.stringify(
        delivery({ waId: '4930999000111', name: 'Two' }, [
          text('wamid.two-1', 'Hello there'),
        ]),
      ).replace(NUMBER, OTHER),
    ) as unknown;
    expect((await deliver(body)).status).toBe(200);
    await whatsapp.process();
    const listed = await request(
      `/whatsapp/conversations?view=all&numberId=${otherId}`,
      'manager',
    );
    const { data: rows } = (await listed.json()) as { data: Row[] };
    expect(rows).toHaveLength(1);
    expect(rows[0]).not.toHaveProperty('handlerId');
    expect(rows[0]).toMatchObject({
      unreadCount: 1,
      number: { id: otherId, mode: 'api' },
    });
    const labels = (await (
      await request('/whatsapp/numbers', 'manager')
    ).json()) as { data: Row[] };
    expect(labels.data.map((n) => n.id)).toContain(otherId);
    // On a number on the API alone, opening it stops it awaiting a reply.
    expect(
      (
        await request(
          `/whatsapp/conversations/${toText(rows[0].id)}/read`,
          'manager',
          'POST',
        )
      ).ok,
    ).toBe(true);
    expect(
      (
        await database
          .query()
          .selectFrom('crmWaConversations')
          .select('unreadCount')
          .where('id', '=', toText(rows[0].id))
          .executeTakeFirstOrThrow()
      ).unreadCount,
    ).toBe(0);
    // A number with conversations stays; one without goes.
    await expect(whatsapp.removeNumber(otherId)).rejects.toMatchObject({
      code: 'numberInUse',
    });
    await whatsapp.addNumber({
      phoneNumberId: '5556667778',
      accessToken: 't3',
    });
    const spare = (await whatsapp.numbers()).find(
      (n) => toText(n.phoneNumberId) === '5556667778',
    );
    expect(
      (await request(`/whatsapp/numbers/${toText(spare?.id)}`, 'rep', 'DELETE'))
        .status,
    ).toBe(403);
    expect(
      (
        await request(
          `/whatsapp/numbers/${toText(spare?.id)}`,
          'admin',
          'DELETE',
        )
      ).ok,
    ).toBe(true);
    expect(
      (await whatsapp.numbers()).map((n) => toText(n.phoneNumberId)),
    ).toEqual([NUMBER, OTHER]);
  });

  it('keeps only deliveries signed with the app secret, and a redelivered message once', async () => {
    const body = delivery({ waId: '4930123456789' }, [
      text('wamid.sig-1', 'Hallo'),
    ]);
    expect((await deliver(body, '')).status).toBe(401);
    expect((await deliver(body, 'sha256=00ff')).status).toBe(401);
    expect((await deliver(body)).status).toBe(200);
    expect((await deliver(body)).status).toBe(200);
    await whatsapp.process();
    const stored = await database
      .query()
      .selectFrom('crmWaMessages')
      .select('id')
      .where('waMessageId', '=', 'wamid.sig-1')
      .execute();
    expect(stored).toHaveLength(1);
    const health = await whatsapp.health();
    expect(health.failed).toBe(0);
    expect(health.pending).toBe(0);
  });

  it('links a customer to the one lead with their number, and writes the lead’s timeline', async () => {
    const lead = await service.save(actor('rep'), 'leads', {
      name: 'Olivia Grant',
      company: 'Grant Optics',
      phone: '+44 7700 900123',
      source: 'website',
    });
    const now = new Date();
    await deliver(
      delivery({ waId: '447700900123', userId: 'GB.1001', name: 'Olivia' }, [
        text('wamid.lead-1', 'Is the on-premises edition available?', now),
        text('wamid.lead-2', 'We are 40 people.', now),
      ]),
    );
    await whatsapp.process(now);
    const customer = await database
      .query()
      .selectFrom('crmWaContacts')
      .selectAll()
      .where('waId', '=', '447700900123')
      .executeTakeFirstOrThrow();
    expect(customer).toMatchObject({
      leadId: lead.id,
      state: 'linked',
      matchedBy: 'phone',
    });
    const history = await database
      .query()
      .selectFrom('crmHistory')
      .selectAll()
      .where('entity', '=', 'leads')
      .where('recordId', '=', lead.id)
      .where('action', '=', 'whatsapp')
      .execute();
    expect(history).toHaveLength(1);
    expect(JSON.parse(toText(history[0].changes))).toMatchObject({
      inbound: 2,
      outbound: 0,
      lastFrom: 'customer',
    });
    // Contact made: the lead is being worked, and counts as reached.
    expect((await service.get(actor('rep'), 'leads', lead.id)).status).toBe(
      'working',
    );
    expect((await lastExchanges(database.query(), 'leads')).has(lead.id)).toBe(
      true,
    );
    // Nobody is told: replies are made on WhatsApp.
    expect(
      (await outbox('rep', 'whatsapp')).filter((r) => r.recordId === lead.id),
    ).toHaveLength(0);
    // No one's own list: the CRM assigns no one.
    expect(
      (await request('/whatsapp/conversations?view=mine', 'rep')).status,
    ).toBe(400);
    // Its messages on the lead, for whoever may read it.
    const messages = await request(`/leads/${lead.id}/whatsappMessages`, 'rep');
    expect(messages.status).toBe(200);
    const { data } = (await messages.json()) as {
      data: { messages: Row[] };
    };
    expect(data.messages.map((m) => m.text)).toEqual([
      'Is the on-premises edition available?',
      'We are 40 people.',
    ]);
    expect(
      (await request(`/leads/${lead.id}/whatsappMessages`, 'outsider')).status,
    ).not.toBe(200);
  });

  it('reads a customer’s messages as stretches of conversation on the timeline, a message joining the stretches it bridges', async () => {
    const lead = await service.save(actor('rep'), 'leads', {
      name: 'Stretch Lee',
      company: 'Stretch Co',
      phone: '+44 7700 900789',
      source: 'website',
    });
    const now = Date.now();
    const daysAgo = (days: number) => new Date(now - days * 86_400_000);
    const lines = async () =>
      (
        await database
          .query()
          .selectFrom('crmHistory')
          .select(['changes', 'occurredAt'])
          .where('entity', '=', 'leads')
          .where('recordId', '=', lead.id)
          .where('action', '=', 'whatsapp')
          .orderBy('occurredAt')
          .execute()
      ).map((row) => JSON.parse(toText(row.changes)) as Row);
    const from = { waId: '447700900789', name: 'Stretch' };
    await deliver(
      delivery(from, [
        text('wamid.st-1', 'First', daysAgo(10)),
        text('wamid.st-2', 'Next day', daysAgo(9)),
        text('wamid.st-3', 'After five quiet days', daysAgo(4)),
      ]),
    );
    await whatsapp.process();
    // Five quiet days: two stretches.
    expect((await lines()).map((line) => line.inbound)).toEqual([2, 1]);
    // A message between them, under three days from each: one stretch.
    await deliver(delivery(from, [text('wamid.st-4', 'Between', daysAgo(7))]));
    await whatsapp.process();
    const [line, ...rest] = await lines();
    expect(rest).toEqual([]);
    expect(line).toMatchObject({
      inbound: 4,
      outbound: 0,
      lastFrom: 'customer',
    });
    expect(toText(line?.from).slice(0, 16)).toBe(
      daysAgo(10).toISOString().slice(0, 16),
    );
    // A line a day, as there were until 2026-10-16, is written again as
    // the stretches at start.
    const customerId = toText(line?.waContactId);
    await database
      .query()
      .insertInto('crmHistory')
      .values({
        id: randomUUID(),
        entity: 'leads',
        recordId: lead.id,
        actorId: 'system',
        action: 'whatsapp',
        changes: JSON.stringify({ waContactId: customerId, inbound: 1 }),
        source: 'whatsapp',
        sourceKey: `${customerId}:2026-01-01`,
        occurredAt: daysAgo(30).toISOString(),
        createdAt: daysAgo(30).toISOString(),
      })
      .execute();
    expect(await lines()).toHaveLength(2);
    await whatsapp.upgradeTimeline();
    expect((await lines()).map((l) => l.inbound)).toEqual([4]);
  });

  it('starts the follow-up once the customer has been quiet, not at every message', async () => {
    const calls: { entity: string; id: string }[] = [];
    whatsapp.customerReplied = (target) => calls.push(target);
    try {
      const lead = await service.save(actor('rep'), 'leads', {
        name: 'Quiet Customer',
        company: 'Quiet Co',
        phone: '+44 7700 900456',
        source: 'website',
      });
      const now = new Date();
      await deliver(
        delivery({ waId: '447700900456' }, [text('wamid.q-1', 'Hi', now)]),
      );
      await whatsapp.process(now);
      expect(calls).toEqual([]);
      await whatsapp.process(new Date(now.getTime() + QUIET_MS + 1000));
      const mine = () => calls.filter((call) => call.id === lead.id);
      expect(mine()).toEqual([{ entity: 'leads', id: lead.id }]);
      // Once only.
      await whatsapp.process(new Date(now.getTime() + 2 * QUIET_MS));
      expect(mine()).toHaveLength(1);
    } finally {
      whatsapp.customerReplied = undefined;
    }
  });

  it('keeps a stranger without a number unlinked, for the WhatsApp page, until someone links them', async () => {
    const now = new Date();
    await deliver(
      delivery({ userId: 'US.2002', name: 'Stranger' }, [
        text('wamid.s-1', 'Do you ship to Brazil?', now),
      ]),
    );
    await whatsapp.process(now);
    const list = await request('/whatsapp/conversations?view=unlinked', 'rep');
    expect(list.status).toBe(200);
    const { data } = (await list.json()) as { data: Row[] };
    const row = data.find((r) => r.name === 'Stranger');
    expect(row).toMatchObject({ state: 'unlinked' });
    // Nobody is told; it waits under Unlinked.
    expect(
      (await outbox('manager', 'whatsappNew')).some(
        (r) => r.recordId === row?.id,
      ),
    ).toBe(false);
    // Without the page, nothing.
    expect((await request('/whatsapp/conversations', 'outsider')).status).toBe(
      403,
    );
    // Linked to a contact the reader may edit: the contact's and its
    // company's timelines have the day's line.
    const company = await service.save(actor('rep'), 'companies', {
      name: 'Brasil Ltda',
      source: 'website',
    });
    const contact = await service.save(actor('rep'), 'contacts', {
      name: 'Ana Souza',
      companyId: company.id,
      gender: 'female',
    });
    const linked = await request(
      `/whatsapp/conversations/${toText(row?.id)}/link`,
      'rep',
      'POST',
      { contactId: contact.id },
    );
    expect(linked.status).toBe(200);
    for (const [entity, id] of [
      ['contacts', contact.id],
      ['companies', company.id],
    ])
      expect(
        await database
          .query()
          .selectFrom('crmHistory')
          .select('id')
          .where('entity', '=', entity)
          .where('recordId', '=', id)
          .where('action', '=', 'whatsapp')
          .execute(),
      ).toHaveLength(1);
    // A new id for the same customer (they changed their number) is theirs.
    await deliver(
      delivery({ userId: 'US.2002' }, [
        {
          id: 'wamid.s-2',
          timestamp: seconds(now),
          type: 'system',
          system: {
            type: 'user_changed_number',
            body: 'User changed number',
            new_user_id: 'US.3003',
            new_wa_id: '5511999990000',
          },
        },
      ]),
    );
    await deliver(
      delivery({ userId: 'US.3003', waId: '5511999990000' }, [
        text('wamid.s-3', 'New number, same Ana', now),
      ]),
    );
    await whatsapp.process(now);
    const customers = await database
      .query()
      .selectFrom('crmWaContacts')
      .selectAll()
      .where('contactId', '=', contact.id)
      .execute();
    expect(customers).toHaveLength(1);
    expect(customers[0].waId).toBe('5511999990000');
  });

  it('moves a customer\u2019s messages off a lead they are linked away from, and guards changes by the linked record', async () => {
    const lead = await service.save(actor('rep'), 'leads', {
      name: 'Relink Lead',
      company: 'Relink Co',
      phone: '+44 7700 900654',
      source: 'website',
    });
    const now = new Date();
    await deliver(
      delivery({ waId: '447700900654' }, [text('wamid.r-1', 'Hello', now)]),
    );
    await whatsapp.process(now);
    const conversation = await database
      .query()
      .selectFrom('crmWaConversations as c')
      .innerJoin('crmWaContacts as w', 'w.id', 'c.waContactId')
      .select(['c.id as id'])
      .where('w.waId', '=', '447700900654')
      .executeTakeFirstOrThrow();
    const id = toText(conversation.id);
    // Without the WhatsApp page, the conversation is not there.
    expect(
      (await request(`/whatsapp/conversations/${id}`, 'outsider')).status,
    ).toBe(403);
    // Another salesperson may not set aside a customer linked to a record
    // they may not edit.
    expect(
      (
        await request(`/whatsapp/conversations/${id}/link`, 'other', 'POST', {
          state: 'dismissed',
        })
      ).status,
    ).not.toBe(200);
    const company = await service.save(actor('rep'), 'companies', {
      name: 'Relink Company',
      source: 'website',
    });
    const contact = await service.save(actor('rep'), 'contacts', {
      name: 'Relink Person',
      companyId: company.id,
      gender: 'female',
    });
    expect(
      (
        await request(`/whatsapp/conversations/${id}/link`, 'rep', 'POST', {
          contactId: contact.id,
        })
      ).status,
    ).toBe(200);
    // The lead no longer shows them; the contact does.
    const messagesOf = async (path: string) =>
      (
        (await (await request(path, 'rep')).json()) as {
          data: { messages: unknown[] };
        }
      ).data.messages.length;
    expect(await messagesOf(`/leads/${lead.id}/whatsappMessages`)).toBe(0);
    expect(await messagesOf(`/contacts/${contact.id}/whatsappMessages`)).toBe(
      1,
    );
  });

  it('stores media within Meta’s minutes, readable by whoever reads the conversation', async () => {
    const lead = await service.save(actor('rep'), 'leads', {
      name: 'Media Sender',
      company: 'Pixels',
      phone: '+44 7700 900789',
      source: 'website',
    });
    waMedia.set('media-1', 'jpeg-bytes');
    const now = new Date();
    await deliver(
      delivery({ waId: '447700900789' }, [
        {
          id: 'wamid.m-1',
          timestamp: seconds(now),
          type: 'image',
          image: {
            id: 'media-1',
            mime_type: 'image/jpeg',
            caption: 'Our line',
          },
        },
        {
          id: 'wamid.m-2',
          timestamp: seconds(now),
          type: 'document',
          document: { id: 'gone', filename: 'spec.pdf' },
        },
      ]),
    );
    await whatsapp.process(now);
    const rows = await database
      .query()
      .selectFrom('crmWaMessages')
      .selectAll()
      .where('waMessageId', 'in', ['wamid.m-1', 'wamid.m-2'])
      .orderBy('waMessageId')
      .execute();
    expect(rows.map((r) => r.mediaStatus)).toEqual(['stored', 'unavailable']);
    const fileId = toText(rows[0].mediaFileId);
    expect(await service.canReadFile(actor('rep'), fileId)).toBe(true);
    expect(await service.canReadFile(actor('outsider'), fileId)).toBe(false);
    void lead;
  });

  it('moves a lead’s customer to the contact its conversion creates', async () => {
    const lead = await service.save(actor('rep'), 'leads', {
      name: 'Convert Me',
      company: 'Convert Co',
      phone: '+44 7700 900321',
      source: 'website',
    });
    const now = new Date();
    await deliver(
      delivery({ waId: '447700900321' }, [
        text('wamid.c-1', 'Ready to buy', now),
      ]),
    );
    await whatsapp.process(now);
    const converted = await convertLead(service, actor('rep'), lead.id, {});
    const customer = await database
      .query()
      .selectFrom('crmWaContacts')
      .selectAll()
      .where('waId', '=', '447700900321')
      .executeTakeFirstOrThrow();
    expect(customer.contactId).toBe(converted.convertedContactId);
    expect(
      await database
        .query()
        .selectFrom('crmHistory')
        .select('id')
        .where('entity', '=', 'contacts')
        .where('recordId', '=', toText(converted.convertedContactId))
        .where('action', '=', 'whatsapp')
        .execute(),
    ).toHaveLength(1);
  });

  it("keeps coexistence's echoes and history as the conversation's, counting only the customer's live messages as awaiting a reply", async () => {
    const waId = '4930555000111';
    const coexistence = (name: string, inner: Record<string, unknown>) => ({
      object: 'whatsapp_business_account',
      entry: [
        {
          id: 'waba-1',
          changes: [
            {
              field: name,
              value: {
                messaging_product: 'whatsapp',
                metadata: {
                  display_phone_number: '15550001111',
                  phone_number_id: NUMBER,
                },
                ...inner,
              },
            },
          ],
        },
      ],
    });
    const messageOf = async (waMessageId: string) =>
      database
        .query()
        .selectFrom('crmWaMessages')
        .selectAll()
        .where('waMessageId', '=', waMessageId)
        .executeTakeFirstOrThrow();
    // The customer writes: awaiting a reply; on a
    // coexistence number, opening it does not change that.
    await deliver(
      delivery({ waId, name: 'Co Ex' }, [text('wamid.co-1', 'Hi')]),
    );
    await whatsapp.process();
    expect(
      (
        await request(
          `/whatsapp/conversations/${toText((await messageOf('wamid.co-1')).conversationId)}/read`,
          'manager',
          'POST',
        )
      ).ok,
    ).toBe(true);
    expect(
      Number(
        (
          await database
            .query()
            .selectFrom('crmWaConversations')
            .select('unreadCount')
            .where(
              'id',
              '=',
              toText((await messageOf('wamid.co-1')).conversationId),
            )
            .executeTakeFirstOrThrow()
        ).unreadCount,
      ),
    ).toBe(1);
    // The team answers from the app: kept, theirs, and answered.
    await deliver(
      coexistence('smb_message_echoes', {
        message_echoes: [
          {
            from: '15550001111',
            to: waId,
            ...text('wamid.co-2', 'Hello, how can we help?'),
          },
        ],
      }),
    );
    await whatsapp.process();
    const reply = await messageOf('wamid.co-2');
    expect(reply).toMatchObject({ direction: 'out', origin: 'businessApp' });
    const conversation = await database
      .query()
      .selectFrom('crmWaConversations')
      .selectAll()
      .where('id', '=', toText(reply.conversationId))
      .executeTakeFirstOrThrow();
    // Answered: it no longer awaits a reply.
    expect(Number(conversation.unreadCount)).toBe(0);
    expect(conversation.lastDirection).toBe('out');
    // The history, imported: either way, in the same conversation, neither
    // awaiting a reply; its file a placeholder until its own delivery.
    const old = new Date(Date.now() - 30 * 86_400_000);
    await deliver(
      coexistence('history', {
        history: [
          {
            metadata: { phase: 0, chunk_order: 1, progress: 100 },
            threads: [
              {
                id: waId,
                messages: [
                  { from: waId, ...text('wamid.co-h1', 'Earlier', old) },
                  {
                    from: '15550001111',
                    to: waId,
                    id: 'wamid.co-h2',
                    timestamp: seconds(old),
                    type: 'media_placeholder',
                  },
                ],
              },
            ],
          },
        ],
      }),
    );
    await whatsapp.process();
    expect(await messageOf('wamid.co-h1')).toMatchObject({
      direction: 'in',
      origin: 'imported',
      conversationId: reply.conversationId,
    });
    expect(await messageOf('wamid.co-h2')).toMatchObject({
      direction: 'out',
      origin: 'imported',
      type: 'media_placeholder',
    });
    expect(
      Number(
        (
          await database
            .query()
            .selectFrom('crmWaConversations')
            .select('unreadCount')
            .where('id', '=', toText(reply.conversationId))
            .executeTakeFirstOrThrow()
        ).unreadCount,
      ),
    ).toBe(0);
    // The placeholder's file arrives: the message takes it.
    await deliver(
      delivery({ waId }, [
        {
          id: 'wamid.co-h2',
          timestamp: seconds(old),
          type: 'image',
          image: { id: 'media-co-h2', mime_type: 'image/jpeg' },
        },
      ]),
    );
    await whatsapp.process();
    expect(await messageOf('wamid.co-h2')).toMatchObject({
      type: 'image',
      mediaId: 'media-co-h2',
      direction: 'out',
      origin: 'imported',
    });
    // The team edits, then deletes, its answer on the app.
    await deliver(
      coexistence('smb_message_echoes', {
        message_echoes: [
          {
            from: '15550001111',
            to: waId,
            id: 'wamid.co-e1',
            timestamp: seconds(new Date()),
            type: 'edit',
            edit: {
              original_message_id: 'wamid.co-2',
              message: {
                type: 'text',
                text: { body: 'Hello! How can we help?' },
              },
            },
          },
        ],
      }),
    );
    await whatsapp.process();
    const edited = await messageOf('wamid.co-2');
    expect(edited.text).toBe('Hello! How can we help?');
    expect(edited.editedAt).toBeTruthy();
    await deliver(
      coexistence('smb_message_echoes', {
        message_echoes: [
          {
            from: '15550001111',
            to: waId,
            id: 'wamid.co-r1',
            timestamp: seconds(new Date()),
            type: 'revoke',
            revoke: { original_message_id: 'wamid.co-2' },
          },
        ],
      }),
    );
    await whatsapp.process();
    expect((await messageOf('wamid.co-2')).revokedAt).toBeTruthy();
    // Neither the edit nor the deletion is a message of its own.
    expect(
      await database
        .query()
        .selectFrom('crmWaMessages')
        .select('id')
        .where('waMessageId', 'in', ['wamid.co-e1', 'wamid.co-r1'])
        .execute(),
    ).toEqual([]);
  });

  it('records a sent message’s status without going back', async () => {
    const conversation = await database
      .query()
      .selectFrom('crmWaConversations')
      .select(['id', 'numberId'])
      .executeTakeFirstOrThrow();
    await database
      .query()
      .insertInto('crmWaMessages')
      .values({
        id: randomUUID(),
        waMessageId: 'wamid.out-1',
        conversationId: conversation.id,
        numberId: conversation.numberId,
        direction: 'out',
        origin: 'crm',
        type: 'text',
        text: 'Hello',
        mediaAttempts: 0,
        status: 'sent',
        occurredAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      })
      .execute();
    const status = (state: string) => ({
      id: 'wamid.out-1',
      status: state,
      timestamp: seconds(new Date()),
      recipient_id: '4930123456789',
      pricing: { billable: true, category: 'service', pricing_model: 'PMP' },
    });
    await deliver(delivery({}, [], [status('read'), status('delivered')]));
    await whatsapp.process();
    expect(
      await database
        .query()
        .selectFrom('crmWaMessages')
        .select(['status', 'pricingCategory', 'billable'])
        .where('waMessageId', '=', 'wamid.out-1')
        .executeTakeFirst(),
    ).toMatchObject({ status: 'read', pricingCategory: 'service' });
  });

  it('replies from the CRM within the window, as the team, and keeps a refusal as a failed message', async () => {
    const lead = await service.save(actor('rep'), 'leads', {
      name: 'Maya Lopez',
      company: 'Lopez Freight',
      phone: '+34 600 123 456',
      source: 'website',
    });
    const now = new Date();
    await deliver(
      delivery({ waId: '34600123456', name: 'Maya' }, [
        text('wamid.reply-1', 'Can you send the price list?', now),
      ]),
    );
    await whatsapp.process(now);
    const conversation = await database
      .query()
      .selectFrom('crmWaConversations as c')
      .innerJoin('crmWaContacts as w', 'w.id', 'c.waContactId')
      .select(['c.id as id'])
      .where('w.waId', '=', '34600123456')
      .executeTakeFirstOrThrow();
    const id = toText(conversation.id);
    const send = (
      user: string,
      fields: Record<string, string | File>,
    ): Promise<Response> => {
      const body = new FormData();
      for (const [name, value] of Object.entries(fields))
        body.append(name, value);
      return router.request(`/whatsapp/conversations/${id}/messages`, {
        method: 'POST',
        headers: { 'x-test-user': user },
        body,
      });
    };
    type Sent = { data: { messages: Row[]; unreadCount: number } };
    // Whoever has no WhatsApp page sends nothing; nor do empty words.
    expect((await send('outsider', { text: 'Hi' })).status).not.toBe(200);
    expect((await send('rep', { text: '   ' })).status).toBe(400);
    // Words, from the conversation's number, to the customer's.
    const before = waSent.length;
    const sent = await send('rep', { text: 'Here it is.' });
    expect(sent.status).toBe(200);
    const view = ((await sent.json()) as Sent).data;
    expect(view.unreadCount).toBe(0);
    expect(view.messages.at(-1)).toMatchObject({
      direction: 'out',
      origin: 'crm',
      type: 'text',
      text: 'Here it is.',
      sentById: 'rep',
      status: null,
      errorCode: null,
    });
    expect(waSent.slice(before)).toEqual([
      {
        url: expect.stringMatching(new RegExp(`/${NUMBER}/messages$`)),
        body: expect.objectContaining({
          messaging_product: 'whatsapp',
          to: '34600123456',
          type: 'text',
          text: { body: 'Here it is.', preview_url: false },
        }),
      },
    ]);
    // Meta's statuses move it on.
    const waId = toText(
      (
        await database
          .query()
          .selectFrom('crmWaMessages')
          .select('waMessageId')
          .where('conversationId', '=', id)
          .where('origin', '=', 'crm')
          .executeTakeFirstOrThrow()
      ).waMessageId,
    );
    await deliver(
      delivery(
        { waId: '34600123456' },
        [],
        [
          {
            id: waId,
            status: 'delivered',
            timestamp: seconds(new Date()),
            recipient_id: '34600123456',
          },
        ],
      ),
    );
    await whatsapp.process();
    expect(
      await database
        .query()
        .selectFrom('crmWaMessages')
        .select('status')
        .where('waMessageId', '=', waId)
        .executeTakeFirst(),
    ).toMatchObject({ status: 'delivered' });
    // A picture goes to Meta first, then as a photo with its caption.
    const picture = new File(
      [new Uint8Array([0x89, 0x50, 0x4e, 0x47])],
      'line.png',
      {
        type: 'image/png',
      },
    );
    const withFile = await send('rep', { text: 'Our line', file: picture });
    expect(withFile.status).toBe(200);
    expect(waSent.at(-2)?.url).toMatch(new RegExp(`/${NUMBER}/media$`));
    expect(waSent.at(-1)?.body).toMatchObject({
      type: 'image',
      image: { id: 'meta-media-1', caption: 'Our line' },
    });
    expect(
      ((await withFile.json()) as Sent).data.messages.at(-1),
    ).toMatchObject({
      type: 'image',
      caption: 'Our line',
      media: { status: 'stored', mimeType: 'image/png' },
    });
    // Refused by Meta: kept, failed, with Meta's reason.
    waRefuse = 131047;
    const refused = await send('rep', { text: 'Still there?' });
    expect(refused.status).toBe(200);
    expect(((await refused.json()) as Sent).data.messages.at(-1)).toMatchObject(
      {
        text: 'Still there?',
        status: 'failed',
        errorCode: 'meta_131047',
      },
    );
    // The team's reply is on the timeline's stretch.
    const lines = await database
      .query()
      .selectFrom('crmHistory')
      .select('changes')
      .where('action', '=', 'whatsapp')
      .where('entity', '=', 'leads')
      .where('recordId', '=', lead.id)
      .execute();
    expect(
      lines.some(
        (line) =>
          (JSON.parse(toText(line.changes)) as { outbound?: number })
            .outbound === 2,
      ),
    ).toBe(true);
    // A day after the customer's last message only templates may go.
    await database
      .query()
      .updateTable('crmWaConversations')
      .set({
        lastInboundAt: new Date(Date.now() - 25 * 3600 * 1000).toISOString(),
      })
      .where('id', '=', id)
      .execute();
    const late = await send('rep', { text: 'Hello again' });
    expect(late.status).toBe(400);
    expect(await late.json()).toMatchObject({
      error: { reason: 'WINDOW_CLOSED' },
    });
  });

  it("deletes a conversation for the connection's managers, with its messages, its customer and their timeline lines", async () => {
    const lead = await service.save(actor('rep'), 'leads', {
      name: 'Test Sender',
      company: 'Test Co',
      phone: '+34 611 222 333',
      source: 'website',
    });
    const now = new Date();
    await deliver(
      delivery({ waId: '34611222333', name: 'Tester' }, [
        text('wamid.delete-1', 'Just a test', now),
        text('wamid.delete-2', 'Another test', now),
      ]),
    );
    await whatsapp.process(now);
    const customer = await database
      .query()
      .selectFrom('crmWaContacts')
      .select(['id'])
      .where('waId', '=', '34611222333')
      .executeTakeFirstOrThrow();
    const conversation = await database
      .query()
      .selectFrom('crmWaConversations')
      .select(['id'])
      .where('waContactId', '=', toText(customer.id))
      .executeTakeFirstOrThrow();
    const id = toText(conversation.id);
    const lines = () =>
      database
        .query()
        .selectFrom('crmHistory')
        .select('id')
        .where('action', '=', 'whatsapp')
        .where('recordId', '=', toText(lead.id))
        .execute();
    expect(await lines()).toHaveLength(1);
    const path = `/whatsapp/conversations/${id}`;
    // Only whoever manages the connection deletes, not a reader.
    expect((await request(path, undefined, 'DELETE')).status).toBe(401);
    expect((await request(path, 'rep', 'DELETE')).status).toBe(403);
    expect((await request(path, 'admin', 'DELETE')).status).toBe(204);
    const left = async (table: string, column: string, value: string) =>
      (
        await database
          .query()
          .selectFrom(table as 'crmWaMessages')
          .select('id')
          .where(column as 'id', '=', value)
          .execute()
      ).length;
    expect(await left('crmWaMessages', 'conversationId', id)).toBe(0);
    expect(await left('crmWaConversations', 'id', id)).toBe(0);
    expect(await left('crmWaContacts', 'id', toText(customer.id))).toBe(0);
    expect(
      await left('crmWaIdentities', 'waContactId', toText(customer.id)),
    ).toBe(0);
    expect(await lines()).toHaveLength(0);
    expect((await request(path, 'admin')).status).toBe(404);
    expect((await request(path, 'admin', 'DELETE')).status).toBe(404);
    // A later message starts afresh.
    await deliver(
      delivery({ waId: '34611222333', name: 'Tester' }, [
        text('wamid.delete-3', 'Back again', new Date()),
      ]),
    );
    await whatsapp.process(new Date());
    expect(await lines()).toHaveLength(1);
  });
});
