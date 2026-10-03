import CrmProvider from '../../server/providers/crm/index.js';
import { i18nToken } from '@nocobase/app-server/i18n';
import { I18nRuntime } from '@nocobase/i18n';
import { notificationServiceToken } from '@nocobase/app-plugin-notification/server';
import { notificationLocales } from '../../server/locales/crm-notifications/index.js';
import { statistics } from '../../server/providers/crm/statistics.js';
import { dashboard } from '../../server/providers/crm/dashboard.js';
import {
  fieldsFor,
  lostReasons,
  object,
  toText,
  entities,
  type CrmRecord,
} from '../../server/providers/crm/schema.js';
import geographyMigration from '../../database/main/migrations/202609100001_crm_geography_codes.js';
import phoneMigration from '../../database/main/migrations/202610030001_crm_phone_numbers.js';
import { normalizePhone } from '../../server/providers/crm/phone.js';
import legacyTimestampsMigration from '../../database/main/migrations/202609200001_legacy_epoch_timestamps.js';
// @vitest-environment node
import sqlite from '@nocobase/db-sqlite';
import { databaseManagerToken } from '@nocobase/db';
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
import { ServiceContainer } from '@nocobase/service-provider';
import { Hono, type MiddlewareHandler } from 'hono';
import {
  capability,
  registerCrmResources,
  provisionCrm,
  roleKey,
  translateLegacyGrants,
  type Actor,
} from '../../server/providers/crm/authorization.js';
import {
  crmPages,
  entityGrant,
  pageGrant,
  salesGrant,
} from '../../server/providers/crm/resources.js';
import { CrmService } from '../../server/providers/crm/service.js';
import {
  CrmSkillNotes,
  composeSkill,
} from '../../server/providers/crm/skills.js';
import type { SkillsEntity, SkillsManager } from '@nocobase/ai-employee';
import { run as notify } from '../../workflows/approval-notification/server/notify.js';
import { run as notifyRecord } from '../../workflows/record-notification/server/notify.js';
import { run as remind } from '../../workflows/activity-reminder/server/remind.js';
import { createCrmUserRoleScope } from '../../server/providers/crm/user-roles.js';
import { crmRecordTools } from '../../server/ai/tools/crm-records.js';
import { crmWriteTools } from '../../server/ai/tools/crm-writes.js';
import { screenProposal } from '../../server/ai/screen.js';
import crmEmployee, {
  crmAssistant,
} from '../../server/ai/employees/crm-assistant.js';
import {
  conversionPreview,
  convertLead,
} from '../../server/providers/crm/conversion.js';
import {
  CRM_INBOX_CHANNEL,
  crmToken,
} from '../../server/providers/crm/index.js';
import { crmRoutes } from '../../server/routes/crm.js';
import { captureLeads } from '../../server/providers/crm/lead-capture.js';
import {
  findDuplicates,
  matchReasons,
  mergeProposal,
} from '../../server/providers/crm/lead-merge.js';
import {
  followUpAfterActivity,
  organiseFeedback,
  recordOutcome,
} from '../../server/providers/crm/feedback.js';
import {
  agentServiceFactoryToken,
  aiConversationsManagerToken,
  aiManagerToken,
} from '@nocobase/app-plugin-ai-employee/server';
import {
  LeadEvaluator,
  contactTime,
  aiStates,
  latestEvaluation,
  pendingDecisions,
  researchDue,
  stringValues,
} from '../../server/providers/crm/lead-evaluation.js';
import {
  ApprovalReviewer,
  latestReview,
} from '../../server/providers/crm/approval-review.js';
import {
  OpportunityEvaluator,
  accountResearchDue,
  latestOpportunityEvaluation,
} from '../../server/providers/crm/opportunity-evaluation.js';
import {
  leadSignal,
  scanLeadSignals,
} from '../../server/providers/crm/lead-signals.js';
import { loggingToken } from '@nocobase/app-server/logging';
import { JobInterruptedError } from '@nocobase/jobs';
import { readEntry } from '../../server/providers/crm/ai-entries.js';
import type { FollowUpPayload } from '../../server/providers/crm/follow-up-jobs.js';
import { userManagementServiceToken } from '@nocobase/app-plugin-users/server/tokens';
import {
  DEMO_MARKER,
  demoAccounts,
  demoStatus,
} from '../../server/providers/crm/demo.js';
import type { Application } from '@nocobase/app-server/application';

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
// A workflow service that runs each CRM workflow's run script at once, in
// place of the plugin's runtime: the trigger is recorded, and the message
// the workflow would queue is queued through the given service.
function inlineWorkflows(crm: () => CrmService) {
  const triggers: {
    key: string;
    input: Record<string, unknown>;
    eventKey?: string;
  }[] = [];
  // The run scripts read the database from the handle CrmProvider publishes.
  (globalThis as Record<symbol, unknown>)[Symbol.for('nococrm.database')] =
    database;
  const options = () =>
    ({
      services: {
        has: () => true,
        resolve: () => crm(),
      },
      signal: new AbortController().signal,
      logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
    }) as unknown as Parameters<typeof notify>[1];
  const scripts: Record<
    string,
    (input: Record<string, unknown>) => Promise<unknown>
  > = {
    'approval-notification': (input) =>
      notify({ ...input, recordId: input.approvalId }, options()),
    'record-notification': (input) => notifyRecord(input, options()),
    'activity-reminder': (input) =>
      remind(
        {
          recordId: input.activityId,
          recipientId: input.recipientId,
          actorId: 'system',
          event: 'starting',
          at: input.startAt,
        },
        options(),
      ),
  };
  return {
    triggers,
    workflows: {
      registerInstruction: () => undefined,
      async trigger(
        key: string,
        input: Record<string, unknown>,
        opts?: { eventKey?: string },
      ) {
        triggers.push({ key, input, eventKey: opts?.eventKey });
        await scripts[key](input);
        return {
          status: 'accepted' as const,
          eventKey: opts?.eventKey ?? 'k',
          runId: String(triggers.length),
        };
      },
    },
  };
}
let folder: string;
let router: Hono;
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
  await database.builder().createCollection('user', (c) => {
    c.string('id');
    c.primary('id');
    c.string('name');
    c.string('username');
    c.string('email');
    // The authentication plugin's account-level switch and deletion record,
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
  const container = new ServiceContainer();
  const required = (): MiddlewareHandler => async (c, next) => {
    const id = c.req.header('x-test-user');
    if (!id) return c.json({ code: 'unauthorized' }, 401);
    c.set('auth', { user: { id } });
    await next();
  };
  container.instance(authenticationToken, { required } as unknown as ReturnType<
    typeof container.resolve<typeof authenticationToken>
  >);
  container.instance(authorizationToken, authorization);
  container.instance(crmToken, service);
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
  } as unknown as ReturnType<
    typeof container.resolve<typeof userManagementServiceToken>
  >);
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
  router.request(`/crm${path}`, {
    method,
    headers: {
      ...(user ? { 'x-test-user': user } : {}),
      'x-crm-request': '1',
      'Content-Type': 'application/json',
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });

describe('CRM API security and domain rules', () => {
  it('rejects anonymous and unpermitted requests and serves permitted users', async () => {
    expect((await request('/leads')).status).toBe(401);
    expect((await request('/leads', 'outsider')).status).toBe(403);
    expect((await request('/leads', 'rep')).status).toBe(200);
    expect((await request('/settings', 'rep')).status).toBe(403);
    expect((await request('/settings', 'manager')).status).toBe(403);
    expect((await request('/metadata', 'admin')).status).toBe(200);
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
    expect(
      (
        await router.request('/crm/leads', {
          method: 'POST',
          headers: { 'x-test-user': 'rep' },
          body: '{}',
        })
      ).status,
    ).toBe(403);
    expect((await router.request('/unrelated')).status).toBe(404);
  });
  it('offers the assistant only as the enabled AI employee and drops the retired AI switch', async () => {
    // Without the AI Employee plugin's table there is no employee to answer,
    // so the pages offer no assistant entry.
    const meta = (await (await request('/metadata', 'admin')).json()) as {
      data: { assistant: boolean; settings: Record<string, unknown> };
    };
    expect(meta.data.assistant).toBe(false);
    expect(meta.data.settings).not.toHaveProperty('aiEnabled');
    // An open settings tab from before still sends the switch; it is dropped.
    const current = (await (await request('/settings', 'admin')).json()) as {
      data: { settings: Record<string, unknown> };
    };
    const saved = await request('/settings', 'admin', 'PUT', {
      ...current.data.settings,
      aiEnabled: false,
    });
    expect(saved.status).toBe(200);
    const after = (await (await request('/metadata', 'admin')).json()) as {
      data: { settings: Record<string, unknown> };
    };
    expect(after.data.settings).not.toHaveProperty('aiEnabled');
    // The AI's language is one of three, Chinese by default, and a save
    // tells the provider (which registers the assistant's prompt again).
    expect(after.data.settings.aiLanguage).toBe('zh-CN');
    expect(
      (
        await request('/settings', 'admin', 'PUT', {
          ...current.data.settings,
          aiLanguage: 'fr-FR',
        })
      ).status,
    ).toBe(400);
    const announced: string[] = [];
    service.settingsSaved = (settings) => announced.push(settings.aiLanguage);
    try {
      await request('/settings', 'admin', 'PUT', {
        ...current.data.settings,
        aiLanguage: 'en-US',
      });
      expect(announced).toEqual(['en-US']);
    } finally {
      service.settingsSaved = undefined;
      await request('/settings', 'admin', 'PUT', {
        ...current.data.settings,
        aiLanguage: 'zh-CN',
      });
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
      200,
    );
    await expect(
      service.save(actor('rep'), 'leads', {
        name: 'Cannot assign',
        ownerId: 'other',
      }),
    ).rejects.toMatchObject({ code: 'forbidden' });
  });
  it('takes lead-only activities when a lead is deleted and keeps anchored ones', async () => {
    const lead = await service.save(actor('manager'), 'leads', {
      name: 'Lead with activities',
    });
    const account = await service.save(actor('manager'), 'accounts', {
      name: 'Anchor for kept activity',
    });
    const leadOnly = await service.save(actor('manager'), 'activities', {
      name: 'Lead only',
      startAt: '2026-09-01T09:00:00.000Z',
      endAt: '2026-09-01T10:00:00.000Z',
      leadId: lead.id,
    });
    const anchored = await service.save(actor('manager'), 'activities', {
      name: 'Also on the account',
      startAt: '2026-09-01T09:00:00.000Z',
      endAt: '2026-09-01T10:00:00.000Z',
      leadId: lead.id,
      accountId: account.id,
    });
    await service.remove(actor('manager'), 'leads', toText(lead.id));
    await expect(
      service.get(actor('manager'), 'activities', toText(leadOnly.id)),
    ).rejects.toMatchObject({ code: 'notFound' });
    // The survivor keeps every other link, so it still satisfies the rule that an
    // activity must reference a lead, account or opportunity.
    const kept = await service.get(
      actor('manager'),
      'activities',
      toText(anchored.id),
    );
    expect(kept.leadId).toBeNull();
    expect(kept.accountId).toBe(account.id);
    await expect(
      service.get(actor('manager'), 'leads', toText(lead.id)),
    ).rejects.toMatchObject({ code: 'notFound' });
  });
  it('deletes an account with only activities, cascading like a lead, and reports blockers', async () => {
    const account = await service.save(actor('manager'), 'accounts', {
      name: 'Account with activities',
    });
    const lead = await service.save(actor('manager'), 'leads', {
      name: 'Anchor lead',
    });
    const accountOnly = await service.save(actor('manager'), 'activities', {
      name: 'Account only',
      startAt: '2026-09-01T09:00:00.000Z',
      endAt: '2026-09-01T10:00:00.000Z',
      accountId: account.id,
    });
    const anchored = await service.save(actor('manager'), 'activities', {
      name: 'Also on a lead',
      startAt: '2026-09-01T09:00:00.000Z',
      endAt: '2026-09-01T10:00:00.000Z',
      accountId: account.id,
      leadId: lead.id,
    });
    // Activities alone do not block, so the detail reports nothing in the way.
    const before = await service.detail(
      actor('manager'),
      'accounts',
      toText(account.id),
    );
    expect(before.blockers).toEqual({});
    // A contact does block, and is named in the count.
    const contact = await service.save(actor('manager'), 'contacts', {
      name: 'Blocking contact',
      accountId: account.id,
    });
    const blocked = await service.detail(
      actor('manager'),
      'accounts',
      toText(account.id),
    );
    expect(blocked.blockers).toEqual({ contacts: 1 });
    await expect(
      service.remove(actor('manager'), 'accounts', toText(account.id)),
    ).rejects.toMatchObject({ code: 'relatedRecords' });
    // A contact deletes directly: it is taken out of the opportunity and
    // activity lists that mention it, and those records survive.
    const deal = await service.save(actor('manager'), 'opportunities', {
      name: 'Deal with contact',
      accountId: account.id,
      contacts: [{ contactId: contact.id, role: 'other' }],
    });
    await service.save(
      actor('manager'),
      'activities',
      { externalParticipants: [contact.id] },
      toText(anchored.id),
    );
    const contactDetail = await service.detail(
      actor('manager'),
      'contacts',
      toText(contact.id),
    );
    expect(contactDetail.blockers).toEqual({});
    expect(contactDetail.unlinks).toEqual({ opportunities: 1, activities: 1 });
    await service.remove(actor('manager'), 'contacts', toText(contact.id));
    expect(
      (await service.get(actor('manager'), 'opportunities', toText(deal.id)))
        .contacts,
    ).toEqual([]);
    expect(
      (await service.get(actor('manager'), 'activities', toText(anchored.id)))
        .externalParticipants,
    ).toEqual([]);
    // An opportunity's activities are unlinked, not deleted: an activity on
    // a deal always carries the deal's account too, so it keeps an anchor.
    const dealOnly = await service.save(actor('manager'), 'activities', {
      name: 'Deal only',
      startAt: '2026-09-02T09:00:00.000Z',
      endAt: '2026-09-02T10:00:00.000Z',
      opportunityId: deal.id,
    });
    await service.save(
      actor('manager'),
      'activities',
      { opportunityId: deal.id },
      toText(anchored.id),
    );
    expect(
      (await service.detail(actor('manager'), 'opportunities', toText(deal.id)))
        .blockers,
    ).toEqual({});
    await service.remove(actor('manager'), 'opportunities', toText(deal.id));
    const unlinked = await service.get(
      actor('manager'),
      'activities',
      toText(dealOnly.id),
    );
    expect(unlinked.opportunityId).toBeNull();
    expect(unlinked.accountId).toBe(account.id);
    expect(
      (await service.get(actor('manager'), 'activities', toText(anchored.id)))
        .opportunityId,
    ).toBeNull();
    await service.remove(actor('manager'), 'accounts', toText(account.id));
    await expect(
      service.get(actor('manager'), 'activities', toText(accountOnly.id)),
    ).rejects.toMatchObject({ code: 'notFound' });
    const kept = await service.get(
      actor('manager'),
      'activities',
      toText(anchored.id),
    );
    expect(kept.accountId).toBeNull();
    expect(kept.leadId).toBe(lead.id);
  });
  it('saves the values the person changed in the conversion dialog', async () => {
    const lead = await service.save(actor('rep'), 'leads', {
      name: 'Edited Person',
      company: 'Edited Works',
      jobTitle: 'Buyer',
      source: 'exhibition',
    });
    const converted = await convertLead(service, actor('rep'), lead.id, {
      account: { industry: 'manufacturing', website: 'https://edited.test' },
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
        'accounts',
        toText(converted.convertedAccountId),
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
  it('converts atomically, links historical activities and makes the lead immutable', async () => {
    const lead = await service.save(actor('rep'), 'leads', {
      name: 'Contact A',
      company: 'Company A',
      email: 'a@example.test',
    });
    const activity = await service.save(actor('rep'), 'activities', {
      name: 'Intro',
      leadId: lead.id,
      startAt: '2026-09-09T01:00:00Z',
      endAt: '2026-09-09T02:00:00Z',
    });
    expect((await service.get(actor('rep'), 'leads', lead.id)).status).toBe(
      'working',
    );
    const before = (await service.list(actor('rep'), 'accounts')).total;
    await expect(
      convertLead(service, actor('rep'), lead.id, {
        createOpportunity: true,
        amount: -1,
      }),
    ).rejects.toMatchObject({ code: 'invalidInput' });
    expect((await service.list(actor('rep'), 'accounts')).total).toBe(before);
    expect((await service.get(actor('rep'), 'leads', lead.id)).status).toBe(
      'working',
    );
    const converted = await convertLead(service, actor('rep'), lead.id, {
      createOpportunity: true,
      amount: 1200,
    });
    expect(converted.status).toBe('converted');
    const linked = await service.get(actor('rep'), 'activities', activity.id);
    expect(linked.accountId).toBe(converted.convertedAccountId);
    expect(linked.opportunityId).toBe(converted.convertedOpportunityId);
    expect(linked.externalParticipants).toContain(converted.convertedContactId);
    await expect(
      service.save(actor('rep'), 'leads', { name: 'No' }, lead.id),
    ).rejects.toMatchObject({ code: 'convertedReadOnly' });
    await expect(
      service.remove(actor('admin'), 'leads', lead.id),
    ).rejects.toMatchObject({ code: 'convertedReadOnly' });
  });
  it('finds the account, the contact and the open deals a conversion may duplicate', async () => {
    const account = await service.save(actor('rep'), 'accounts', {
      name: 'Duplicate Optics',
    });
    // The lead gave no phone or e-mail: its person is found by name at the
    // matching account, not by name alone elsewhere.
    const same = await service.save(actor('rep'), 'contacts', {
      name: 'Wei Zhang',
      accountId: account.id,
    });
    const elsewhere = await service.save(actor('rep'), 'accounts', {
      name: 'Unrelated Works',
    });
    await service.save(actor('rep'), 'contacts', {
      name: 'Wei Zhang',
      accountId: elsewhere.id,
    });
    const open = await service.save(actor('rep'), 'opportunities', {
      name: 'Optics rollout',
      accountId: account.id,
      amount: 100,
    });
    await service.save(actor('rep'), 'opportunities', {
      name: 'Optics pilot',
      accountId: account.id,
      amount: 100,
      stage: 'lost',
      lostReason: lostReasons[0],
    });
    const lead = await service.save(actor('rep'), 'leads', {
      name: 'Wei Zhang',
      company: 'Duplicate Optics',
    });
    const preview = await conversionPreview(service, actor('rep'), lead.id);
    expect((preview.accounts as CrmRecord[]).map((r) => r.id)).toEqual([
      account.id,
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
    ).toMatchObject({ accounts: [], contacts: [], opportunities: [] });
  });
  it('validates opportunity contacts and preserves customer status after reopening', async () => {
    const account = await service.save(actor('rep'), 'accounts', {
      name: 'Deal account',
    });
    const other = await service.save(actor('rep'), 'accounts', {
      name: 'Other account',
    });
    const contact = await service.save(actor('rep'), 'contacts', {
      name: 'Wrong company',
      accountId: other.id,
    });
    await expect(
      service.save(actor('rep'), 'opportunities', {
        name: 'Bad deal',
        accountId: account.id,
        contacts: [{ contactId: contact.id, role: 'other', primary: true }],
      }),
    ).rejects.toMatchObject({ code: 'accountMismatch' });
    const opportunity = await service.save(actor('rep'), 'opportunities', {
      name: 'Deal',
      accountId: account.id,
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
      (await service.get(actor('rep'), 'accounts', account.id)).status,
    ).toBe('customer');
    const reopened = await service.save(
      actor('rep'),
      'opportunities',
      { stage: 'negotiation' },
      opportunity.id,
    );
    expect(reopened.closedAt).toBeNull();
    expect(
      (await service.get(actor('rep'), 'accounts', account.id)).status,
    ).toBe('customer');
  });
  it('moves a deal to another account without its contacts, and never with activities', async () => {
    const [from, to] = await Promise.all(
      ['Move from', 'Move to'].map((name) =>
        service.save(actor('rep'), 'accounts', { name, source: 'website' }),
      ),
    );
    const contact = await service.save(actor('rep'), 'contacts', {
      name: 'Old account person',
      accountId: from.id,
      gender: 'unknown',
    });
    const deal = await service.save(actor('rep'), 'opportunities', {
      name: 'Moving deal',
      accountId: from.id,
      contacts: [{ contactId: contact.id, role: 'other' }],
    });
    // Its contacts are the old account's people: moving it alone is refused.
    await expect(
      service.save(
        actor('rep'),
        'opportunities',
        { accountId: to.id },
        deal.id,
      ),
    ).rejects.toMatchObject({ code: 'accountMismatch' });
    // Moved together with the contacts taken off, as the page confirms it.
    const moved = await service.save(
      actor('rep'),
      'opportunities',
      { accountId: to.id, contacts: [] },
      deal.id,
    );
    expect(moved.accountId).toBe(to.id);
    expect(moved.contacts).toEqual([]);
    // Once it has activities it stays with its account, and says so first.
    await service.save(actor('rep'), 'activities', {
      name: 'Deal call',
      opportunityId: deal.id,
      startAt: '2026-09-01T02:00:00.000Z',
      endAt: '2026-09-01T03:00:00.000Z',
    });
    await expect(
      service.save(
        actor('rep'),
        'opportunities',
        { accountId: from.id, contacts: [] },
        deal.id,
      ),
    ).rejects.toMatchObject({ code: 'opportunityHasActivities' });
  });
  it('enforces approval ownership, lock states, assigned approver and no self approval', async () => {
    const account = await service.save(actor('rep'), 'accounts', {
      name: 'Approval account',
    });
    const opportunity = await service.save(actor('rep'), 'opportunities', {
      name: 'Approval deal',
      accountId: account.id,
    });
    const approval = await service.save(actor('rep'), 'approvals', {
      name: 'Discount request',
      opportunityId: opportunity.id,
      topic: 'discount',
      description: 'Terms',
      approverId: 'manager',
    });
    await service.approvalAction(actor('rep'), approval.id, 'submit');
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
    // Messages are the approval-notification workflow's to send; this
    // service has no workflow service, so nothing is queued directly.
    const outbox = await database
      .query()
      .selectFrom('crmOutbox')
      .selectAll()
      .where('recordId', '=', approval.id)
      .execute();
    expect(outbox).toHaveLength(0);
  });

  it('refuses an approval for an opportunity the applicant may not edit', async () => {
    const account = await service.save(actor('manager'), 'accounts', {
      name: 'Manager account',
    });
    const opportunity = await service.save(actor('manager'), 'opportunities', {
      name: 'Manager deal',
      accountId: account.id,
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
    ).toBe(200);
    const pending = await service.save(actor('rep'), 'approvals', {
      name: 'Keep pending',
      opportunityId: opportunity.id,
      topic: 'discount',
      description: 'Discussion',
      approverId: 'manager',
    });
    await service.approvalAction(actor('rep'), pending.id, 'submit');
    expect(
      (await request('/approvals/' + pending.id, 'rep', 'DELETE')).status,
    ).toBe(409);
    await service.approvalAction(actor('rep'), pending.id, 'withdraw');
    expect(
      (await request('/approvals/' + pending.id, 'rep', 'DELETE')).status,
    ).toBe(200);
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
    ).toBe(409);
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
    ).toBe(200);
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
    expect((await request('/files/private-file', 'rep')).status).toBe(404);
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
    ).toEqual(['assign', 'approve', 'export', 'manageSkills']);
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
    ).toEqual(crmPages.map((p) => p.name).sort());
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
    ).toEqual(['assign', 'approve', 'export', 'manageSkills']);
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
    ).toEqual(['assign', 'approve', 'export', 'manageSkills']);
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
      message: 'Hidden note',
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
    const zeta = await service.save(actor('rep'), 'accounts', {
      name: 'Sortcase Zeta',
      source: 'website',
    });
    const alpha = await service.save(actor('rep'), 'accounts', {
      name: 'Sortcase Alpha',
      source: 'website',
    });
    for (const [name, accountId] of [
      ['Sortcase at Zeta', zeta.id],
      ['Sortcase at Alpha', alpha.id],
    ])
      await service.save(actor('rep'), 'contacts', {
        name,
        accountId,
        gender: 'unknown',
      });
    expect(
      (
        await service.list(actor('rep'), 'contacts', {
          search: 'Sortcase',
          sort: 'accountId',
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
    expect((await request('/leads?sort=-email', 'restricted')).status).toBe(
      400,
    );
  });
  it('computes statistics with real money, dates, status history, pagination and contact links', async () => {
    const account = await service.save(actor('rep'), 'accounts', {
      name: 'Statistics account',
    });
    const contact = await service.save(actor('rep'), 'contacts', {
      name: 'Statistics contact',
      accountId: account.id,
    });
    const opportunity = await service.save(actor('rep'), 'opportunities', {
      name: 'Statistics opportunity',
      accountId: account.id,
      amount: 1000,
      currency: 'CNY',
      contacts: [{ contactId: contact.id, role: 'other', primary: true }],
    });
    const planned = await service.save(actor('other'), 'activities', {
      name: 'Colleague next meeting',
      accountId: account.id,
      opportunityId: opportunity.id,
      startAt: new Date(Date.now() + 86400000).toISOString(),
      endAt: new Date(Date.now() + 90000000).toISOString(),
      internalParticipants: ['rep'],
    });
    expect(
      (
        await service.list(actor('rep'), 'opportunities', {
          contactId: contact.id,
        })
      ).data.map((r) => r.id),
    ).toContain(opportunity.id);
    // The workspace counts risks with the list pages' rules and lists the
    // reader's own planned activities.
    const board = await dashboard(service, actor('rep'), {});
    expect(board.attention).toMatchObject({ overdueOpportunities: 0 });
    expect(board.business).toMatchObject({ pipeline: { CNY: 1000 } });
    expect((board.today as { total: number }).total).toBe(0);
    expect(
      (board.funnel as { stage: string; count: number }[])[0],
    ).toMatchObject({ stage: 'contact' });
    // Each source's conversion rate follows the overall one: converted over
    // that source's leads that are not invalid.
    for (const row of board.sources as {
      source: string;
      converted: number;
      conversionRate: number | null;
    }[]) {
      const { data: fromSource } = await service.list(actor('rep'), 'leads', {
        source: row.source,
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
    await service.save(
      actor('rep'),
      'opportunities',
      { stage: 'won' },
      opportunity.id,
    );
    const accounts = await statistics(service, actor('rep'), 'accounts', {
      search: 'Statistics account',
    });
    expect(accounts.metrics).toMatchObject({
      customers: 1,
      churnedThisMonth: 0,
    });
    await service.save(
      actor('rep'),
      'accounts',
      { status: 'churned', churnReason: 'price' },
      account.id,
    );
    expect(
      (
        await statistics(service, actor('rep'), 'accounts', {
          search: 'Statistics account',
        })
      ).metrics,
    ).toMatchObject({ customers: 0, churnedThisMonth: 1 });
    const contacts = await statistics(service, actor('rep'), 'contacts', {
      accountId: account.id,
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
    expect(planned.status).toBe('planned');
  });

  it('delivers deduplicated reminders in the recipient language and checks current visibility', async () => {
    await service.rememberLocale(actor('rep'));
    await service.rememberLocale({ ...actor('rep'), locale: 'zh-CN' });
    const lead = await service.save(actor('rep'), 'leads', {
      name: '提醒测试',
      company: '提醒公司',
    });
    const meeting = await service.save(actor('rep'), 'activities', {
      name: '即将开始的会议',
      leadId: lead.id,
      startAt: new Date(Date.now() + 60000).toISOString(),
      endAt: new Date(Date.now() + 3600000).toISOString(),
    });
    const send = vi.fn().mockResolvedValue({ notificationId: 'test-delivery' });
    const container = new ServiceContainer();
    // The scan starts an activity-reminder run per recipient; here the
    // workflow runs inline and queues the reminder through this service.
    const inline = inlineWorkflows(() => reminding);
    const reminding = new CrmService(
      database,
      authorization,
      () => inline.workflows,
    );
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
      title: '活动即将开始',
      body: expect.stringContaining('即将开始的会议'),
      // A route without the deployment prefix, which the router adds.
      target: { type: 'route', path: `/crm/activities/${meeting.id}` },
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
    // Every scan asked for the same reminder by the same key; the second
    // start is deduplicated by the runtime and would queue nothing anyway.
    const reminderKeys = inline.triggers
      .filter((t) => t.key === 'activity-reminder')
      .map((t) => t.eventKey);
    expect(reminderKeys.length).toBeGreaterThanOrEqual(2);
    expect(new Set(reminderKeys)).toEqual(
      new Set([
        `activity:${toText(meeting.id)}:${toText(meeting.startAt)}:rep`,
      ]),
    );
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
  it('offers the AI employee read tools bound to the signed-in user', async () => {
    const tools = crmRecordTools(service, authorization);
    const byName = Object.fromEntries(
      tools.map((tool) => [tool.definition.name, tool]),
    );
    expect(Object.keys(byName).sort()).toEqual([
      'get_record',
      'list_users',
      'search_records',
      'summarize_records',
    ]);
    expect(crmEmployee.tools?.map((tool) => tool.name).sort()).toEqual([
      'add_note',
      'approval_action',
      'convert_lead',
      'create_record',
      'delete_record',
      'get_record',
      'list_users',
      'search_records',
      'subAgentWebSearch',
      'summarize_records',
      'update_record',
    ]);
    // Reports come from the plugin's report skill, whose tool the model
    // activates by loading it; skills have to be on for that.
    // It also loads the lead and deal follow-up skills when asked what to
    // do next.
    expect(crmEmployee.skills).toEqual([
      'business-analysis-report',
      'lead-follow-up',
      'opportunity-follow-up',
      'approval-review',
    ]);
    expect(crmEmployee.chatSettings?.enableSkills).toBe(true);
    expect(crmAssistant({ avatar: 'https://crm.example/x.png' }).avatar).toBe(
      'https://crm.example/x.png',
    );
    // The deployment's business guidance is part of the role itself.
    expect(crmAssistant({ avatar: 'x' }).systemPrompt).toContain(
      '公司名称：NocoBase',
    );
    // The language follows the setting: a fixed one unless the user asks
    // for another, or the user's own.
    expect(
      crmAssistant({ avatar: 'x', language: 'zh-CN' }).systemPrompt,
    ).toContain('Write everything in Chinese (简体中文)');
    expect(
      crmAssistant({ avatar: 'x', language: 'en-US' }).systemPrompt,
    ).toContain('unless the user asks you to use another language');
    expect(
      crmAssistant({ avatar: 'x', language: 'user' }).systemPrompt,
    ).toContain('in the language the user writes in');
    // A wandering conversation is carried into the CRM only through
    // proposals: offered after an answer, listed at its close and proposed
    // once picked; a lead's message, the enquiry as it arrived, is left be.
    const followThrough = crmAssistant({ avatar: 'x' }).systemPrompt;
    expect(followThrough).toContain('Shall I add');
    expect(followThrough).toContain(
      'a numbered list of the changes you propose',
    );
    expect(followThrough).toContain('Showing a list is not agreement');
    expect(followThrough).toContain("Never change a lead's message");
    // An exchange that took place is an activity; a note is for the rest.
    expect(followThrough).toContain('is logged as a completed activity');
    for (const tool of tools) {
      expect(tool.defaultPermission).toBe('ALLOW');
      expect(tool.execution).toBe('backend');
    }
    const runtime = { toolCallId: 'call', writer: () => undefined };
    // A refusal ends the call with the CRM's error body as the message.
    const invoke = (name: string, actorId: string, args: unknown) =>
      (
        byName[name]!.invoke(
          { actor: { id: actorId, roles: [], isRoot: false } },
          args,
          runtime,
        ) as Promise<Record<string, unknown>>
      ).then(
        (content) => ({ status: 'success', content }),
        (error: Error) => ({
          status: 'error',
          content: JSON.parse(error.message) as Record<string, unknown>,
        }),
      );
    const lead = await service.save(actor('rep'), 'leads', {
      name: 'Tool lead',
      company: 'Tool company',
    });
    const search = await invoke('search_records', 'rep', {
      entity: 'leads',
      search: 'Tool lead',
    });
    expect(search.status).toBe('success');
    expect(search.content.total).toBe(1);
    const users = (await invoke('list_users', 'rep', {}))
      .content as unknown as {
      id: string;
      roles: string[];
    }[];
    expect(users.map((user) => user.id).sort()).toEqual(
      expect.arrayContaining(['rep', 'manager', 'admin']),
    );
    expect(users.find((user) => user.id === 'manager')?.roles).toEqual([
      'sales-manager',
    ]);
    // A search narrows the list to the person named.
    expect(
      (
        (await invoke('list_users', 'rep', { search: 'MANAGER' }))
          .content as unknown as { id: string }[]
      ).map((user) => user.id),
    ).toEqual(['manager']);
    // The current user's access per object, for the model to respect.
    expect(
      (users.find((user) => user.id === 'rep') as { access?: unknown })?.access,
    ).toEqual({
      leads: 'view:all create edit:own',
      accounts: 'view:all create edit:own',
      contacts: 'view:all create edit:own',
      opportunities: 'view:all create edit:own',
      activities: 'view:all create edit:own',
      approvals: 'view:all create edit:own delete:own',
    });
    // The caller is marked, so the model knows whether it may own records.
    expect(
      users.filter((user) => (user as { current?: boolean }).current),
    ).toEqual([
      expect.objectContaining({
        id: 'rep',
        can: { assign: false, approve: false, export: false },
      }),
    ]);
    const asManager = (await invoke('list_users', 'manager', {}))
      .content as unknown as { id: string; can?: Record<string, boolean> }[];
    expect(asManager.find((user) => user.id === 'manager')?.can).toEqual(
      expect.objectContaining({ assign: true, approve: true }),
    );
    const read = await invoke('get_record', 'rep', {
      entity: 'leads',
      id: lead.id,
    });
    expect(read.status).toBe('success');
    expect((read.content.record as Record<string, unknown>).name).toBe(
      'Tool lead',
    );
    // A user outside the CRM roles cannot read through the tools either;
    // the refusal is the call's error, with the CRM's code.
    const refused = await invoke('get_record', 'outsider', {
      entity: 'leads',
      id: lead.id,
    });
    expect(refused.status).toBe('error');
    expect(refused.content.error).toBe('forbidden');
    await expect(
      byName.get_record!.invoke({}, { entity: 'leads', id: lead.id }, runtime),
    ).rejects.toThrow('signed-in user');
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
  it("summarizes records by field and period within the reader's scope, per currency", async () => {
    const account = await service.save(actor('rep'), 'accounts', {
      name: 'Summary account',
    });
    for (const [name, stage, amount, currency, expectedCloseAt] of [
      ['Summary A', 'contact', 100, 'CNY', '2026-07-15'],
      ['Summary B', 'contact', 50, 'CNY', '2026-08-01'],
      ['Summary C', 'qualification', 30, 'USD', '2026-08-20'],
    ] as const)
      await service.save(actor('rep'), 'opportunities', {
        name,
        accountId: account.id,
        stage,
        amount,
        currency,
        expectedCloseAt,
      });
    const byStage = await service.summarize(
      actor('rep'),
      'opportunities',
      { accountId: toText(account.id) },
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
      { accountId: toText(account.id) },
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
          { accountId: toText(account.id) },
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
    // The tool names the owners it groups by.
    const tool = crmRecordTools(service, authorization).find(
      (t) => t.definition.name === 'summarize_records',
    )!;
    const byOwner = (await tool.invoke(
      { actor: { id: 'rep', roles: [], isRoot: false } },
      {
        entity: 'opportunities',
        accountId: account.id,
        groupBy: 'ownerId',
      },
      { toolCallId: 'call', writer: () => undefined },
    )) as {
      groups: { key: string; count: number }[];
      names: Record<string, string>;
    };
    expect(byOwner.groups).toEqual([{ key: 'rep', count: 3, measures: [] }]);
    // (The test users are named after their ids.)
    expect(byOwner.names).toEqual({ rep: 'rep' });
    const byAccount = (await tool.invoke(
      { actor: { id: 'rep', roles: [], isRoot: false } },
      { entity: 'opportunities', accountId: account.id, groupBy: 'accountId' },
      { toolCallId: 'call', writer: () => undefined },
    )) as { names: Record<string, string> };
    // Activities filter by when they take place.
    await service.save(actor('rep'), 'activities', {
      name: 'Summary call',
      type: 'call',
      accountId: account.id,
      status: 'planned',
      startAt: '2026-08-10T02:00:00.000Z',
      endAt: '2026-08-10T03:00:00.000Z',
    });
    await service.save(actor('rep'), 'activities', {
      name: 'Summary meeting',
      type: 'meeting',
      accountId: account.id,
      status: 'planned',
      startAt: '2026-10-10T02:00:00.000Z',
      endAt: '2026-10-10T03:00:00.000Z',
    });
    const inQuarter = (await tool.invoke(
      { actor: { id: 'rep', roles: [], isRoot: false } },
      {
        entity: 'activities',
        accountId: account.id,
        startFrom: '2026-07-01T00:00:00.000Z',
        startTo: '2026-09-30T23:59:59.999Z',
        groupBy: 'type',
      },
      { toolCallId: 'call', writer: () => undefined },
    )) as { total: number; groups: { key: string }[] };
    expect(inQuarter.total).toBe(1);
    expect(inQuarter.groups.map((g) => g.key)).toEqual(['call']);
    expect(byAccount.names).toEqual({
      [toText(account.id)]: 'Summary account',
    });
  });
  it('screens a proposed write by the rules the tools apply, before the card offers confirmation', async () => {
    const theirs = await service.save(actor('other'), 'leads', {
      name: 'Screen target',
    });
    const mine = await service.save(actor('rep'), 'leads', {
      name: 'Screen own',
    });
    const account = await service.save(actor('other'), 'accounts', {
      name: 'Screen account',
    });
    const deal = await service.save(actor('other'), 'opportunities', {
      name: 'Screen deal',
      accountId: account.id,
    });
    const screen = (
      who: string,
      tool: string,
      input: Record<string, unknown>,
    ) => screenProposal(service, actor(who), tool, input);
    // Editing a record the user may not see, and handing a record to
    // someone else without the assign right, are refused; a manager may.
    expect(
      await screen('rep', 'update_record', {
        entity: 'leads',
        id: theirs.id,
        input: { phone: '1' },
      }),
    ).toEqual({ ok: false, code: 'notFound' });
    expect(
      await screen('rep', 'update_record', {
        entity: 'leads',
        id: mine.id,
        input: { phone: '1' },
      }),
    ).toEqual({ ok: true });
    expect(
      await screen('rep', 'create_record', {
        entity: 'leads',
        input: { name: 'x', ownerId: 'other' },
      }),
    ).toEqual({ ok: false, code: 'forbidden', field: 'ownerId' });
    expect(
      await screen('manager', 'create_record', {
        entity: 'leads',
        input: { name: 'x', ownerId: 'other' },
      }),
    ).toEqual({ ok: true });
    // A salesperson deletes no leads; an approval is raised on a deal the
    // user may edit; decisions belong to the approver while pending.
    expect(
      await screen('rep', 'delete_record', { entity: 'leads', id: mine.id }),
    ).toEqual({ ok: false, code: 'forbidden' });
    expect(
      await screen('rep', 'create_record', {
        entity: 'approvals',
        input: { opportunityId: deal.id, topic: 'discount', name: 'x' },
      }),
    ).toEqual({
      ok: false,
      code: 'approvalOpportunity',
      field: 'opportunityId',
    });
    const approval = await service.save(actor('other'), 'approvals', {
      name: 'Screen approval',
      opportunityId: deal.id,
      topic: 'discount',
      approverId: 'manager',
    });
    expect(
      await screen('manager', 'approval_action', {
        id: approval.id,
        action: 'approve',
      }),
    ).toEqual({ ok: false, code: 'approvalLocked' });
    await service.approvalAction(actor('other'), approval.id, 'submit');
    expect(
      await screen('manager', 'approval_action', {
        id: approval.id,
        action: 'approve',
      }),
    ).toEqual({ ok: true });
    expect(
      await screen('rep', 'approval_action', {
        id: approval.id,
        action: 'approve',
      }),
    ).toEqual({ ok: false, code: 'forbidden' });
    expect(
      await screen('other', 'approval_action', {
        id: approval.id,
        action: 'withdraw',
      }),
    ).toEqual({ ok: true });
    // A step on an existing record that names none cannot be checked.
    expect(
      await screen('rep', 'update_record', {
        entity: 'leads',
        input: { phone: '1' },
      }),
    ).toEqual({ ok: false, code: 'invalidInput', field: 'id' });
    // The card asks through the API, as the signed-in user.
    const response = await request('/ai/screen', 'rep', 'POST', {
      tool: 'delete_record',
      input: { entity: 'leads', id: mine.id },
    });
    expect(response.status).toBe(200);
    expect(((await response.json()) as { data: unknown }).data).toEqual({
      ok: false,
      code: 'forbidden',
    });
  });
  it('proposes CRM writes through tools the user confirms, under their own permissions', async () => {
    const tools = crmWriteTools(service, authorization);
    const byName = Object.fromEntries(
      tools.map((tool) => [tool.definition.name, tool]),
    );
    expect(Object.keys(byName).sort()).toEqual([
      'add_note',
      'approval_action',
      'convert_lead',
      'create_record',
      'delete_record',
      'update_record',
    ]);
    // Every write waits for the user's confirmation in the conversation.
    for (const tool of tools) {
      expect(tool.defaultPermission).toBe('ASK');
      expect(tool.execution).toBe('backend');
    }
    const runtime = { toolCallId: 'call', writer: () => undefined };
    // A refusal ends the call with the CRM's error body as the message.
    const invoke = (name: string, actorId: string, args: unknown) =>
      (
        byName[name]!.invoke(
          { actor: { id: actorId, roles: [], isRoot: false } },
          args,
          runtime,
        ) as Promise<Record<string, unknown>>
      ).then(
        (content) => ({ status: 'success', content }),
        (error: Error) => ({
          status: 'error',
          content: JSON.parse(error.message) as Record<string, unknown>,
        }),
      );
    const theirs = await service.save(actor('other'), 'leads', {
      name: 'Write target',
      company: 'Write company',
    });
    // Editing a record you may not see (reported as absent, as the pages
    // do), and handing a record to someone else without the assign right,
    // are refused as data; a manager may do both.
    const refused = await invoke('update_record', 'rep', {
      entity: 'leads',
      id: theirs.id,
      title: 'x',
      input: { phone: '1' },
    });
    expect(refused.status).toBe('error');
    expect(refused.content.error).toBe('notFound');
    expect(
      (
        await invoke('create_record', 'rep', {
          entity: 'leads',
          title: 'x',
          input: { name: 'x', ownerId: 'other' },
        })
      ).content.error,
    ).toBe('forbidden');
    const created = await invoke('create_record', 'manager', {
      entity: 'leads',
      title: 'x',
      input: { name: 'Tool created', company: 'Tool Co', ownerId: 'other' },
    });
    expect(created.status).toBe('success');
    expect(created.content.entity).toBe('leads');
    const createdId = toText(created.content.id);
    expect(
      (await service.get(actor('other'), 'leads', createdId)).ownerId,
    ).toBe('other');
    const moved = await invoke('update_record', 'manager', {
      entity: 'leads',
      id: theirs.id,
      title: 'x',
      input: { ownerId: 'rep' },
    });
    expect(moved.status).toBe('success');
    // A refusal by rule reports its code: an unknown field, a converted
    // lead, a decision that is not this user's to make.
    expect(
      (
        await invoke('update_record', 'rep', {
          entity: 'leads',
          id: theirs.id,
          title: 'x',
          input: { nonsense: 1 },
        })
      ).content.error,
    ).toBe('invalidInput');
    const converted = await invoke('convert_lead', 'rep', {
      id: theirs.id,
      title: 'x',
      createOpportunity: true,
      opportunityName: 'Tool deal',
      amount: 100,
    });
    expect(converted.status).toBe('success');
    expect(converted.content.recordStatus).toBe('converted');
    expect(
      (await invoke('convert_lead', 'rep', { id: theirs.id, title: 'x' }))
        .content.error,
    ).toBe('convertedReadOnly');
    const deal = (
      await service.list(actor('rep'), 'opportunities', { search: 'Tool deal' })
    ).data[0]!;
    const approval = await invoke('create_record', 'rep', {
      entity: 'approvals',
      title: 'x',
      input: {
        name: 'Tool approval',
        opportunityId: deal.id,
        topic: 'discount',
        approverId: 'manager',
      },
    });
    expect(approval.status).toBe('success');
    const approvalId = toText(approval.content.id);
    expect(
      (
        await invoke('approval_action', 'manager', {
          id: approvalId,
          action: 'approve',
          title: 'x',
        })
      ).content.error,
    ).toBe('forbidden');
    expect(
      (
        await invoke('approval_action', 'rep', {
          id: approvalId,
          action: 'submit',
          title: 'x',
        })
      ).status,
    ).toBe('success');
    expect(
      (
        await invoke('approval_action', 'rep', {
          id: approvalId,
          action: 'approve',
          title: 'x',
        })
      ).content.error,
    ).toBe('forbidden');
    expect(
      (
        await invoke('approval_action', 'manager', {
          id: approvalId,
          action: 'approve',
          title: 'x',
          comment: 'Fine',
        })
      ).content.recordStatus,
    ).toBe('approved');
    // A converted lead is history; its owner cannot delete it either.
    expect(
      (
        await invoke('delete_record', 'rep', {
          entity: 'leads',
          id: theirs.id,
          title: 'x',
        })
      ).status,
    ).toBe('error');
    // A salesperson deletes nothing but their own approval drafts; the
    // manager who created the lead may remove it.
    expect(
      (
        await invoke('delete_record', 'other', {
          entity: 'leads',
          id: createdId,
          title: 'x',
        })
      ).status,
    ).toBe('error');
    const removed = await invoke('delete_record', 'manager', {
      entity: 'leads',
      id: createdId,
      title: 'x',
    });
    expect(removed.status).toBe('success');
    await expect(
      service.get(actor('other'), 'leads', createdId),
    ).rejects.toMatchObject({ code: 'notFound' });
    await expect(
      byName.create_record!.invoke(
        {},
        { entity: 'leads', title: 'x', input: {} },
        runtime,
      ),
    ).rejects.toThrow('signed-in user');
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
    await expect(
      scope.assertCanDisable?.('rep', connection),
    ).resolves.toBeUndefined();
  });
});

describe('CRM skills', () => {
  it('appends the company notes to the skill the AI loads, and only there', async () => {
    const shipped: SkillsEntity = {
      name: 'lead-follow-up',
      scope: 'SPECIFIED',
      description: 'Follow a lead up.',
      content: '# 跟进线索\n\n内置做法。',
      introduction: { title: '跟进线索' },
    };
    const registered = new Map<string, SkillsEntity>([[shipped.name, shipped]]);
    const skills = {
      getSkills: async (name: string) => registered.get(name),
      registerSkills: async (skill: SkillsEntity) => {
        registered.set(skill.name, skill);
      },
      listSkills: async () => [...registered.values()],
      deleteSkills: async () => undefined,
    } as unknown as SkillsManager;
    const notes = new CrmSkillNotes(database, skills);
    await notes.start();
    // Without notes the AI loads the file as it is.
    expect(registered.get('lead-follow-up')?.content).toBe(shipped.content);
    // Everyone in the CRM reads the skills; a salesperson may not edit
    // the notes, a sales manager and an administrator may.
    expect(await notes.list(actor('rep'))).toMatchObject({
      canEdit: false,
      skills: [{ name: 'lead-follow-up', title: '跟进线索' }],
    });
    expect((await notes.list(actor('manager'))).canEdit).toBe(true);
    await expect(notes.list(actor('outsider'))).rejects.toMatchObject({
      code: 'forbidden',
    });
    await expect(
      notes.save(actor('rep'), 'lead-follow-up', { notes: 'x' }),
    ).rejects.toMatchObject({ code: 'forbidden' });
    expect(
      (
        await notes.save(actor('manager'), 'lead-follow-up', {
          notes: '经理补充',
        })
      ).updatedById,
    ).toBe('manager');
    const saved = await notes.save(actor('admin'), 'lead-follow-up', {
      notes: '政府和国企客户一律评为 A 级。',
    });
    // The page shows the shipped method apart from the notes …
    expect(saved).toMatchObject({
      content: shipped.content,
      notes: '政府和国企客户一律评为 A 级。',
      updatedById: 'admin',
    });
    // … and the AI loads both, the notes after the method.
    const composed = registered.get('lead-follow-up')!.content;
    expect(composed.startsWith(shipped.content)).toBe(true);
    expect(composed).toContain('## 本公司的补充说明');
    expect(composed).toContain('政府和国企客户一律评为 A 级。');
    expect(composed).toBe(
      composeSkill(shipped.content, '政府和国企客户一律评为 A 级。'),
    );
    // A restart loads the file again and puts the stored notes back.
    registered.set(shipped.name, shipped);
    await new CrmSkillNotes(database, skills).start();
    expect(registered.get('lead-follow-up')!.content).toBe(composed);
    // Only the CRM's own skills take notes.
    await expect(
      notes.save(actor('admin'), 'data-query', { notes: 'x' }),
    ).rejects.toMatchObject({ code: 'notFound' });
    // Clearing the notes gives the AI the file alone again.
    await notes.save(actor('admin'), 'lead-follow-up', { notes: '  ' });
    expect(registered.get('lead-follow-up')!.content).toBe(shipped.content);
    expect((await notes.list(actor('admin'))).skills[0]).toMatchObject({
      name: 'lead-follow-up',
      notes: '',
    });
    // Notes kept for the former lead evaluation skill join those of the
    // follow-up skill it was merged into, after them.
    await notes.save(actor('admin'), 'lead-follow-up', { notes: '跟进说明' });
    const row = await database
      .query()
      .selectFrom('crmSettings')
      .select('value')
      .where('id', '=', 'skill-notes')
      .executeTakeFirstOrThrow();
    const stored = (
      typeof row.value === 'string' ? JSON.parse(row.value) : row.value
    ) as Record<string, unknown>;
    await database
      .query()
      .updateTable('crmSettings')
      .set({
        value: JSON.stringify({
          ...stored,
          'lead-evaluation': { notes: '评估说明', updatedById: 'manager' },
        }),
      })
      .where('id', '=', 'skill-notes')
      .execute();
    expect((await notes.list(actor('admin'))).skills[0]).toMatchObject({
      name: 'lead-follow-up',
      notes: '跟进说明\n\n评估说明',
    });
  });

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

  it('gives existing sales roles the skills page, and managers its editing, once', async () => {
    const strip = async (role: string): Promise<void> => {
      const set = (await authorization.permissionSets.get(roleKey(role)))!;
      await authorization.permissionSets.update(set.key, {
        ...set,
        grants: set.grants
          .filter(
            (g) =>
              !(g.resource.type === 'page' && g.resource.id === 'crm-skills'),
          )
          .map((g) =>
            g.resource.id === 'crm.sales'
              ? {
                  ...g,
                  actions: g.actions.filter((a) => a.action !== 'manageSkills'),
                }
              : g,
          ),
      });
    };
    await strip('sales-representative');
    await strip('sales-manager');
    await database
      .query()
      .deleteFrom('crmSettings')
      .where('id', '=', 'crm-skills-v1')
      .execute();
    await provisionCrm(authorization, database);
    for (const role of ['sales-representative', 'sales-manager']) {
      const set = (await authorization.permissionSets.get(roleKey(role)))!;
      expect(
        set.grants.some(
          (g) => g.resource.type === 'page' && g.resource.id === 'crm-skills',
        ),
      ).toBe(true);
      expect(
        set.grants
          .find((g) => g.resource.id === 'crm.sales')
          ?.actions.some((a) => a.action === 'manageSkills') ?? false,
      ).toBe(role === 'sales-manager');
    }
    expect(await capability(actor('manager'), 'manageSkills')).toBe(true);
    expect(await capability(actor('rep'), 'manageSkills')).toBe(false);
  });
});

describe("an activity's outcome, written up by the AI", () => {
  it('turns the notes into feedback as the person who may record it', async () => {
    const prompts: string[] = [];
    const container = new ServiceContainer();
    container.instance(aiConversationsManagerToken, {
      create: async () => ({ sessionId: 'feedback-session' }),
    } as unknown as ReturnType<
      typeof container.resolve<typeof aiConversationsManagerToken>
    >);
    container.instance(agentServiceFactoryToken, {
      createAIEmployee: async () => ({
        invoke: async (input: {
          userMessages: { content: { content: string } }[];
        }) => {
          prompts.push(input.userMessages[0].content.content);
          return {
            message: {
              content: {
                type: 'text',
                content: '**对方反馈**\n- 下周看演示\n',
              },
            },
          };
        },
      }),
    } as unknown as ReturnType<
      typeof container.resolve<typeof agentServiceFactoryToken>
    >);
    container.instance(loggingToken, {
      getLogger: () => ({ warn: () => undefined }),
    } as unknown as ReturnType<typeof container.resolve<typeof loggingToken>>);
    const enabled = vi
      .spyOn(service, 'assistantEnabled')
      .mockResolvedValue(true);
    try {
      const lead = await service.save(actor('rep'), 'leads', {
        name: '反馈线索',
        company: '反馈科技',
        source: 'website',
      });
      const call = await service.save(actor('rep'), 'activities', {
        type: 'call',
        name: '需求电话',
        status: 'planned',
        startAt: '2026-10-05T02:00:00.000Z',
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
        (await service.get(actor('rep'), 'activities', toText(call.id)))
          .feedback,
      ).toBeFalsy();
      // Notes are needed, and someone who may not edit the activity gets
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
  // The AI employee plugin's services as captureLeads uses them: a
  // conversation to run in, and an employee whose run returns `result`.
  // `result` is the structured response, or `{ asText }` for a run that
  // wrote its answer as text instead.
  const capturing = (result: unknown) => {
    const runs: { username: string; prompt: string; from: unknown }[] = [];
    const warnings: unknown[] = [];
    const container = new ServiceContainer();
    container.instance(aiConversationsManagerToken, {
      create: async () => ({ sessionId: 'capture-session' }),
    } as unknown as ReturnType<
      typeof container.resolve<typeof aiConversationsManagerToken>
    >);
    container.instance(agentServiceFactoryToken, {
      createAIEmployee: async (options: {
        username: string;
        from: unknown;
      }) => ({
        invoke: async (input: {
          userMessages: { content: { content: string } }[];
        }) => {
          runs.push({
            username: options.username,
            from: options.from,
            prompt: input.userMessages[0].content.content,
          });
          return result && typeof result === 'object' && 'asText' in result
            ? {
                structuredResponse: undefined,
                message: { content: { type: 'text', content: result.asText } },
              }
            : { structuredResponse: result };
        },
      }),
    } as unknown as ReturnType<
      typeof container.resolve<typeof agentServiceFactoryToken>
    >);
    container.instance(loggingToken, {
      getLogger: () => ({ warn: (entry: unknown) => warnings.push(entry) }),
    } as unknown as ReturnType<typeof container.resolve<typeof loggingToken>>);
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
      await service.save(actor('rep'), 'accounts', { name: '华锐精工' });
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
      expect(runs[0]).toMatchObject({
        username: 'crm-assistant',
        from: 'sub-agent',
      });
      expect(runs[0].prompt).toContain(pasted);
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
        expect.objectContaining({ entity: 'accounts', name: '华锐精工' }),
      );
      // A source is filled only when the text states one; otherwise the
      // form or the batch review asks for it.
      expect(leads[1].input.source).toBe('website');
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
      expect(runs[0].prompt).toContain('周立的职位是 IT 总监');
      expect(runs[0].prompt).toContain('"ref": "r1"');
      expect(runs[0].prompt).not.toContain("ownerId is the lead's owner");
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
      expect(assigning.runs[0].prompt).toContain("ownerId is the lead's owner");
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
    // The employee is switched off (no aiEmployees row in these tests).
    await expect(
      captureLeads(service, container, actor('rep'), { text: pasted }, 'UTC'),
    ).rejects.toMatchObject({ code: 'assistantUnavailable', status: 409 });
    // No AI employee plugin at all.
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
    // The routes' container has no AI employee plugin.
    expect(
      (await request('/leads/capture', 'rep', 'POST', { text: pasted })).status,
    ).toBe(409);
  });
});

describe('CRM lead evaluation', () => {
  // The AI Employee plugin as the evaluator uses it: a conversation, the
  // lead-evaluation skill, and an employee whose run returns `verdict`.
  // `abortable`: the run gives up on a signal already aborted, as a model
  // call does when the application stops.
  const evaluating = (
    verdict: unknown,
    options: { abortable?: boolean } = {},
  ) => {
    const prompts: string[] = [];
    const container = new ServiceContainer();
    container.instance(aiConversationsManagerToken, {
      create: async () => ({ sessionId: 'evaluation-session' }),
    } as unknown as ReturnType<
      typeof container.resolve<typeof aiConversationsManagerToken>
    >);
    container.instance(aiManagerToken, {
      skillsManager: {
        // Only by its name: the run must load the follow-up skill.
        getSkills: async (name: string) =>
          name === 'lead-follow-up'
            ? { content: '# 跟进线索\n\n技能正文。' }
            : undefined,
      },
    } as unknown as ReturnType<
      typeof container.resolve<typeof aiManagerToken>
    >);
    container.instance(agentServiceFactoryToken, {
      createAIEmployee: async () => ({
        invoke: async (input: {
          userMessages: { content: { content: string } }[];
          signal?: AbortSignal;
        }) => {
          if (options.abortable && input.signal?.aborted)
            throw new Error('aborted');
          prompts.push(input.userMessages[0].content.content);
          return { structuredResponse: verdict };
        },
      }),
    } as unknown as ReturnType<
      typeof container.resolve<typeof agentServiceFactoryToken>
    >);
    container.instance(loggingToken, {
      getLogger: () => ({ warn: () => undefined }),
    } as unknown as ReturnType<typeof container.resolve<typeof loggingToken>>);
    return { evaluator: new LeadEvaluator(service, container), prompts };
  };
  const follow = {
    recommendation: 'follow',
    grade: 'A',
    summary: '三个厂区要私有化部署，问了企业版集群。',
    reasons: ['线索原文：三个厂区用 Excel 做设备点检'],
    edition: '企业版',
    invalidReason: null,
    nextStep: { type: 'call', subject: '电话了解部署规模', inDays: 0 },
    questions: ['有几个厂区要上线？'],
    enrich: [],
  };

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
      // The skill and the lead are in what the AI was given.
      // First the web research on the company, then the verdict from the
      // skill, the lead and what was found.
      expect(prompts[0]).toContain('先联网调查这条线索里的公司');
      expect(prompts[0]).toContain('评估精工');
      expect(prompts[1]).toContain('技能正文');
      expect(prompts[1]).toContain('评估精工');
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
      // Waiting on the owner; a manager sees it in the team's, and someone
      // who may not edit the lead does not see it at all.
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
      expect(
        (
          await pendingDecisions(service, actor('manager'), { scope: 'team' })
        ).data.map((e) => e.id),
      ).toContain(pending!.id);
      expect(
        (
          await pendingDecisions(service, actor('other'), { scope: 'team' })
        ).data.map((e) => e.id),
      ).not.toContain(pending!.id);

      // Someone who may not edit the lead may not decide.
      await expect(
        evaluator.decide(actor('outsider'), lead.id, pending!.id, 'accept'),
      ).rejects.toMatchObject({ code: 'forbidden' });
      // Accepting plans the first contact, which makes the lead working,
      // and both are recorded as the AI's proposal the rep confirmed.
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
      const activity = await service.get(
        actor('rep'),
        'activities',
        accepted.ai.activityId!,
      );
      expect(activity).toMatchObject({
        name: '电话了解部署规模',
        leadId: lead.id,
        status: 'planned',
      });
      expect((await service.get(actor('rep'), 'leads', lead.id)).status).toBe(
        'working',
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
        .where('recordId', 'in', [lead.id, toText(activity.id)])
        .execute();
      expect(rows).toContainEqual({ action: 'created', source: 'assistant' });
      expect(rows).toContainEqual({ action: 'status', source: 'assistant' });
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

  it('looks the company up again only when due, and converts or reviews as accepted', async () => {
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
      // The first follow-up searches the web, then gives its verdict.
      expect(first.prompts).toHaveLength(2);
      expect(
        (await latestEvaluation(service, actor('rep'), lead.id))?.ai
          .researchedAt,
      ).toBeTruthy();
      const lead2 = await service.get(actor('rep'), 'leads', lead.id);
      const recent = await researchDue(
        service,
        lead2,
        'none',
        new Date(Date.now() + 89 * 86_400_000),
      );
      expect(recent).toBe(false);
      expect(
        await researchDue(
          service,
          lead2,
          'none',
          new Date(Date.now() + 91 * 86_400_000),
        ),
      ).toBe(true);
      // The next one, with the company known and recently looked up, does
      // not search, and is told the previous recommendation.
      const again = evaluating({ ...follow, changes: ['没有变化'] });
      await again.evaluator.request(actor('rep'), lead.id);
      await again.evaluator.idle();
      expect(again.prompts).toHaveLength(1);
      expect(again.prompts[0]).toContain('上一次跟进建议');
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
        'activities',
        toText(decided.ai.activityId),
      );
      expect(review).toMatchObject({
        type: 'task',
        status: 'planned',
        leadId: nurtured.id,
      });
      const days =
        (Date.parse(toText(review.startAt)) - Date.now()) / 86_400_000;
      expect(days).toBeGreaterThan(28);
      expect(days).toBeLessThan(33);
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
      expect(second.prompts[0]).toContain('要修改的建议');
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
      // Accepting writes the findings still ticked with it, and plans the
      // activity as the person set it on the card.
      const accepted = await second.evaluator.decide(
        actor('rep'),
        lead.id,
        now!.id,
        'accept',
        ['website'],
        {
          name: '发送方案和报价',
          startAt: '2026-10-09T02:00:00.000Z',
          description: '先发方案，再约电话。',
        },
      );
      expect(accepted.ai).toMatchObject({
        enrichedFields: ['website'],
        enrichedById: 'rep',
      });
      expect((await service.get(actor('rep'), 'leads', lead.id)).website).toBe(
        'https://gaiyoujian.example',
      );
      const activity = await service.get(
        actor('rep'),
        'activities',
        toText(accepted.ai.activityId),
      );
      expect(activity).toMatchObject({
        type: 'email',
        name: '发送方案和报价',
        startAt: '2026-10-09T02:00:00.000Z',
        ownerId: 'rep',
      });
      // The description as the person wrote it on the card.
      expect(activity.description).toBe('先发方案，再约电话。');
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

  it('carries on a planned activity rather than planning another', async () => {
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
      const planned = await service.save(actor('rep'), 'activities', {
        type: 'call',
        name: '首次电话',
        status: 'planned',
        startAt: soon.toISOString(),
        endAt: new Date(+soon + 30 * 60000).toISOString(),
        leadId: lead.id,
        description: '已经准备的内容',
      });
      const reuse = {
        ...follow,
        nextStep: {
          type: 'call',
          subject: '首次电话',
          inDays: 2,
          activity: 'A1',
        },
        prep: ['带上制造业案例'],
        questions: ['谁来拍板？'],
      };
      const run = evaluating(reuse);
      await run.evaluator.request(actor('rep'), lead.id);
      await run.evaluator.idle();
      // The model reads the activity by its reference and the rules.
      const asked = run.prompts.at(-1)!;
      expect(asked).toContain('"ref": "A1"');
      expect(asked).toContain('"overdue": false');
      expect(asked).toContain('怎么对待线索的活动');
      const card = await latestEvaluation(service, actor('rep'), lead.id);
      expect(card?.ai.result?.nextStep).toMatchObject({
        activityId: planned.id,
      });
      // Accepting updates it: what to prepare is added, its time stays,
      // and no other activity is planned.
      await run.evaluator.decide(actor('rep'), lead.id, card!.id, 'accept');
      const after = await service.get(
        actor('rep'),
        'activities',
        toText(planned.id),
      );
      expect(after.startAt).toBe(planned.startAt);
      expect(toText(after.description)).toContain('已经准备的内容');
      expect(toText(after.description)).toContain('带上制造业案例');
      expect(
        (await service.list(actor('rep'), 'activities', { leadId: lead.id }))
          .total,
      ).toBe(1);
      // Overdue: done, with what came of it ...
      const past = new Date(Date.now() - 86_400_000);
      const missed = await service.save(actor('rep'), 'activities', {
        type: 'call',
        name: '逾期电话',
        status: 'planned',
        startAt: past.toISOString(),
        endAt: new Date(+past + 30 * 60000).toISOString(),
        leadId: lead.id,
      });
      const ask = async (): Promise<string> => {
        const again = evaluating({
          ...reuse,
          nextStep: { ...reuse.nextStep, inDays: 1, activity: 'A2' },
        });
        await again.evaluator.request(actor('rep'), lead.id);
        await again.evaluator.idle();
        expect(again.prompts.at(-1)).toContain('"overdue": true');
        return (await latestEvaluation(service, actor('rep'), lead.id))!.id;
      };
      // (A2: the activities come latest first, the upcoming one being A1.)
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
        await service.get(actor('rep'), 'activities', toText(missed.id)),
      ).toMatchObject({ status: 'completed', feedback: '对方确认下周看演示' });
      // A card already decided is not decided again.
      await expect(
        run.evaluator.decide(actor('rep'), lead.id, card!.id, 'accept'),
      ).rejects.toMatchObject({ code: 'evaluationDecided' });
      // Overdue and not done: moved to the day proposed.
      const late = await service.save(actor('rep'), 'activities', {
        type: 'meeting',
        name: '逾期会议',
        status: 'planned',
        startAt: new Date(+past - 3600_000).toISOString(),
        endAt: past.toISOString(),
        leadId: lead.id,
      });
      const moveRun = evaluating({
        ...reuse,
        nextStep: { ...reuse.nextStep, inDays: 1, activity: 'A3' },
      });
      await moveRun.evaluator.request(actor('rep'), lead.id);
      await moveRun.evaluator.idle();
      id = (await latestEvaluation(service, actor('rep'), lead.id))!.id;
      expect(
        (await latestEvaluation(service, actor('rep'), lead.id))?.ai.result
          ?.nextStep?.activityId,
      ).toBe(late.id);
      await moveRun.evaluator.decide(actor('rep'), lead.id, id, 'accept', [], {
        mode: 'reschedule',
      });
      const moved = await service.get(
        actor('rep'),
        'activities',
        toText(late.id),
      );
      expect(new Date(toText(moved.startAt)).getTime()).toBeGreaterThan(
        Date.now(),
      );
      expect(moved.status).toBe('planned');
      // An activity done meanwhile: the card about it asks to follow up
      // again rather than plan on it.
      const stale = evaluating(reuse);
      await stale.evaluator.request(actor('rep'), lead.id);
      await stale.evaluator.idle();
      const waiting = await latestEvaluation(service, actor('rep'), lead.id);
      await service.save(
        actor('rep'),
        'activities',
        { status: 'completed', feedback: '已经打过' },
        toText(planned.id),
      );
      await expect(
        stale.evaluator.decide(actor('rep'), lead.id, waiting!.id, 'accept'),
      ).rejects.toMatchObject({ code: 'activityChanged' });
      // One not yet due may be told as done too.
      const early = await service.save(actor('rep'), 'leads', {
        name: '提前完成',
        source: 'website',
      });
      const ahead = new Date(Date.now() + 86_400_000);
      const upcoming = await service.save(actor('rep'), 'activities', {
        type: 'call',
        name: '明天的电话',
        status: 'planned',
        startAt: ahead.toISOString(),
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
        await service.get(actor('rep'), 'activities', toText(upcoming.id)),
      ).toMatchObject({
        status: 'completed',
        feedback: '提前打了，对方要报价',
      });
      // Its outcome recorded, the lead is followed up anew, reading it.
      await doneRun.evaluator.idle();
      const next = await latestEvaluation(service, actor('rep'), early.id);
      expect(next?.id).not.toBe(doneCard!.id);
      expect(next?.status).toBe('pending');
      expect(doneRun.prompts.at(-1)).toContain('提前打了，对方要报价');
      // From the activity's own page too; unticked, nothing more runs.
      const second = await service.save(actor('rep'), 'activities', {
        type: 'meeting',
        name: '演示会',
        status: 'planned',
        startAt: ahead.toISOString(),
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
      const third = await service.save(actor('rep'), 'activities', {
        type: 'call',
        name: '回访',
        status: 'planned',
        startAt: ahead.toISOString(),
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
        await service.get(actor('rep'), 'activities', toText(third.id)),
      ).toMatchObject({ status: 'completed', feedback: '确认下周签约' });
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
      ).rejects.toMatchObject({ code: 'activityChanged' });
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
      expect(prompts).toHaveLength(3);
      expect(prompts[2]).toContain('只返回要求的那个 JSON 对象');
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
      expect(prompts[0]).toContain('用中文写');
      expect(prompts[1]).toContain('用中文写 summary');
      expect(await aiStates(service, [lead.id])).toEqual({
        [lead.id]: 'pending',
      });
      const count = await (await request('/decisions/count', 'rep')).json();
      expect(count.data.count).toBeGreaterThan(0);
      // The list says so for the board's cards.
      const list = await (await request(`/leads?ids=${lead.id}`, 'rep')).json();
      expect(list.ai).toEqual({ [lead.id]: 'pending' });
      expect(running).not.toBeNull();
    } finally {
      enabled.mockRestore();
    }
  });

  it('offers what the web says about the company and writes the picked findings', async () => {
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
      await service.addNote(
        actor('rep'),
        'leads',
        toText(lead.id),
        '已在用 SAP，只做对接',
      );
      await service.save(actor('rep'), 'activities', {
        type: 'call',
        name: '首次电话',
        status: 'completed',
        startAt: '2026-09-30T02:00:00.000Z',
        endAt: '2026-09-30T02:30:00.000Z',
        leadId: lead.id,
        feedback: '30 万预算只含软件，实施另算',
      });
      await evaluator.request(actor('rep'), lead.id);
      await evaluator.idle();
      // The search is allowed; the CRM tools are not needed.
      expect(prompts[0]).toContain('用 subAgentWebSearch 查');
      expect(prompts[1]).toContain('# 联网调查的结果');
      expect(prompts[1]).toContain('# 团队的备注');
      expect(prompts[1]).toContain('已在用 SAP，只做对接');
      expect(prompts[1]).toContain('# 线索的活动');
      expect(prompts[1]).toContain('30 万预算只含软件，实施另算');
      const entry = await latestEvaluation(service, actor('rep'), lead.id);
      expect(entry!.ai.result!.enrich).toEqual([
        {
          field: 'website',
          value: 'https://www.wgtech.example',
          source: 'https://www.wgtech.example/about',
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
    expect((await request(`/leads/${lead.id}/evaluation`)).status).toBe(401);
    expect(
      (await request(`/leads/${lead.id}/evaluation`, 'outsider')).status,
    ).toBe(403);
    expect(
      await (await request(`/leads/${lead.id}/evaluation`, 'rep')).json(),
    ).toEqual({ data: null });
    // The routes' container has no AI employee plugin.
    expect(
      (await request(`/leads/${lead.id}/evaluation`, 'rep', 'POST', {})).status,
    ).toBe(409);
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
  it('keeps what started a follow-up and looks a changed company up again', async () => {
    const enabled = vi
      .spyOn(service, 'assistantEnabled')
      .mockResolvedValue(true);
    try {
      const lead = await service.save(actor('rep'), 'leads', {
        name: '触发',
        company: '触发精工',
        source: 'website',
        // Particulars it already holds: an ordinary follow-up does not
        // look the company up again soon after.
        website: 'https://chufa.test',
        industry: 'manufacturing',
      });
      // The first follow-up looks the company up.
      const first = evaluating(follow);
      await first.evaluator.request(actor('rep'), lead.id);
      await first.evaluator.idle();
      expect(first.prompts).toHaveLength(2);
      // An activity done: followed up, the company looked up recently.
      const done = evaluating(follow);
      await done.evaluator.request(
        actor('rep'),
        lead.id,
        undefined,
        'activityDone',
      );
      await done.evaluator.idle();
      expect(done.prompts).toHaveLength(1);
      expect(
        (await latestEvaluation(service, actor('rep'), lead.id))?.ai,
      ).toMatchObject({ trigger: 'activityDone', result: { grade: 'A' } });
      // Its company changed: looked up again, however recent the last look.
      const changed = evaluating(follow);
      await changed.evaluator.request(
        actor('rep'),
        lead.id,
        undefined,
        'companyChanged',
      );
      await changed.evaluator.idle();
      expect(changed.prompts).toHaveLength(2);
      expect(changed.prompts[0]).toContain('先联网调查');
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
      await service.save(actor('rep'), 'activities', {
        type: 'call',
        name: '需求确认电话',
        status: 'completed',
        startAt: '2026-09-20T02:00:00Z',
        leadId: lead.id,
        feedback: '客户要先做收购到配送的跟踪',
      });
      const named = evaluating({
        ...follow,
        reasons: ['收购到配送跟踪是主要需求（A1反馈）'],
        nextStep: {
          type: 'call',
          subject: '预算沟通',
          inDays: 2,
          activity: null,
          owner: 'manager',
        },
      });
      await named.evaluator.request(actor('rep'), lead.id);
      await named.evaluator.idle();
      // Offered the people it may give the step to, by name.
      expect(named.prompts.at(-1)).toContain('可选负责人');
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
        await service.get(
          actor('manager'),
          'activities',
          toText(decided.ai.activityId),
        ),
      ).toMatchObject({ name: '预算沟通', ownerId: 'manager' });
      // A name it may not give it to is left out: the lead's owner keeps it.
      const stranger = evaluating({
        ...follow,
        nextStep: {
          type: 'call',
          subject: '回访',
          inDays: 2,
          activity: null,
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
  // The AI Employee plugin as the follow-up uses it: a conversation, the
  // opportunity-follow-up skill, and an employee whose run returns `verdict`.
  const following = (verdict: unknown) => {
    const prompts: string[] = [];
    const container = new ServiceContainer();
    container.instance(aiConversationsManagerToken, {
      create: async () => ({ sessionId: 'deal-session' }),
    } as unknown as ReturnType<
      typeof container.resolve<typeof aiConversationsManagerToken>
    >);
    container.instance(aiManagerToken, {
      skillsManager: {
        getSkills: async (name: string) =>
          name === 'opportunity-follow-up'
            ? { content: '# 推进商机\n\n技能正文。' }
            : undefined,
      },
    } as unknown as ReturnType<
      typeof container.resolve<typeof aiManagerToken>
    >);
    container.instance(agentServiceFactoryToken, {
      createAIEmployee: async () => ({
        invoke: async (input: {
          userMessages: { content: { content: string } }[];
        }) => {
          prompts.push(input.userMessages[0].content.content);
          return { structuredResponse: verdict };
        },
      }),
    } as unknown as ReturnType<
      typeof container.resolve<typeof agentServiceFactoryToken>
    >);
    container.instance(loggingToken, {
      getLogger: () => ({ warn: () => undefined }),
    } as unknown as ReturnType<typeof container.resolve<typeof loggingToken>>);
    return { evaluator: new OpportunityEvaluator(service, container), prompts };
  };
  const deal = async (name: string) => {
    const account = await service.save(actor('rep'), 'accounts', {
      name: `${name} 客户`,
    });
    const contact = await service.save(actor('rep'), 'contacts', {
      name: `${name} 王总`,
      accountId: account.id,
    });
    const opportunity = await service.save(actor('rep'), 'opportunities', {
      name,
      accountId: account.id,
      amount: 50000,
      stage: 'qualification',
      contacts: [{ contactId: contact.id, role: 'decisionMaker' }],
    });
    return { account, opportunity };
  };
  const advance = {
    recommendation: 'advance',
    confidence: 'medium',
    stage: 'validation',
    summary: '演示做过，客户在社区版上试用并反馈良好。',
    reasons: ['上周演示后客户试用了两个场景（活动）'],
    risks: ['还没见过拍板人'],
    nextStep: { type: 'meeting', subject: '技术评估会', inDays: 2 },
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
      const { account, opportunity } = await deal('跟进报工系统');
      await service.save(actor('rep'), 'activities', {
        type: 'meeting',
        name: '产品演示',
        status: 'completed',
        startAt: '2026-09-20T02:00:00Z',
        opportunityId: opportunity.id,
        accountId: account.id,
        feedback: '客户在社区版上试了两个场景，反馈良好',
      });
      const { evaluator, prompts } = following(advance);
      const entry = await evaluator.request(actor('rep'), opportunity.id);
      expect(entry).toMatchObject({ status: 'running' });
      await evaluator.idle();
      // The skill, the deal, its people and what came of its activities.
      // The account holds nothing about the company: it is looked up
      // first, then the follow-up reads that research.
      expect(prompts[0]).toContain('先联网调查这个商机的客户公司');
      expect(prompts.at(-1)).toContain('对客户公司的联网调查');
      expect(prompts.at(-1)).toContain('技能正文');
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
        opportunity: { name: '跟进报工系统', account: '跟进报工系统 客户' },
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
        'activities',
        toText(decided.ai.activityId),
      );
      expect(planned).toMatchObject({
        name: '技术评估会（含部署）',
        type: 'meeting',
        status: 'planned',
        opportunityId: opportunity.id,
        accountId: account.id,
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
        await service.get(
          actor('rep'),
          'activities',
          toText(decided.ai.activityId),
        ),
      ).toMatchObject({ type: 'task', name: '暂停的商机 resume' });

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
          'activities',
          toText(lostDecision.ai.activityId),
        ),
      ).toMatchObject({ type: 'task', name: '输掉的商机 revisit' });
      // A closed deal has nothing to follow up.
      await expect(
        lose.evaluator.request(actor('rep'), lost.id),
      ).rejects.toMatchObject({ code: 'opportunityClosed' });
    } finally {
      enabled.mockRestore();
    }
  });

  it('follows a deal up again after an outcome on one of its activities', async () => {
    const enabled = vi
      .spyOn(service, 'assistantEnabled')
      .mockResolvedValue(true);
    try {
      const { account, opportunity } = await deal('结果后跟进');
      const { evaluator } = following({ ...advance, stage: null });
      const activity = await service.save(actor('rep'), 'activities', {
        type: 'call',
        name: '电话确认',
        status: 'planned',
        startAt: new Date(Date.now() + 86_400_000).toISOString(),
        opportunityId: opportunity.id,
        accountId: account.id,
      });
      expect(
        await recordOutcome(
          service,
          { opportunities: evaluator },
          actor('rep'),
          toText(activity.id),
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
  it('looks the account up only when it holds nothing, was renamed since, or long ago', async () => {
    const { account } = await deal('调研时机');
    // Nothing about the company yet.
    expect(await accountResearchDue(service, account, 'none')).toBe(true);
    const filled = await service.save(
      actor('rep'),
      'accounts',
      { industry: 'manufacturing', employees: '51-200' },
      account.id,
    );
    // Filled by hand, its name and website untouched, never looked up: no
    // search. (A website filled or changed by hand would search.)
    expect(await accountResearchDue(service, filled, 'none')).toBe(false);
    // A follow-up that looked it up, then a person renaming the company.
    const opportunity = await service.save(actor('rep'), 'opportunities', {
      name: '调研时机二',
      accountId: account.id,
      stage: 'qualification',
    });
    await service.database
      .query()
      .insertInto('crmHistory')
      .values({
        id: 'research-entry',
        entity: 'opportunities',
        recordId: opportunity.id,
        actorId: 'rep',
        action: 'ai',
        changes: '{}',
        source: 'ai',
        aiStatus: 'dismissed',
        ai: JSON.stringify({
          kind: 'evaluation',
          researchedAt: new Date(Date.now() - 86_400_000).toISOString(),
        }),
        createdAt: new Date(Date.now() - 86_400_000).toISOString(),
      })
      .execute();
    expect(await accountResearchDue(service, filled, 'none')).toBe(false);
    const renamed = await service.save(
      actor('rep'),
      'accounts',
      { name: '调研时机 新名称' },
      account.id,
    );
    expect(await accountResearchDue(service, renamed, 'none')).toBe(true);
    // The same change written from a card's findings is no reason to look
    // again.
    const { account: found } = await deal('调研时机三');
    await service.save(
      { ...actor('rep'), via: 'assistant' },
      'accounts',
      { website: 'https://found.test', industry: 'manufacturing' },
      found.id,
    );
    expect(
      await accountResearchDue(
        service,
        await service.get(actor('rep'), 'accounts', found.id),
        'none',
      ),
    ).toBe(false);
    // Looked up more than 90 days before.
    expect(
      await accountResearchDue(
        service,
        renamed,
        'none',
        new Date(Date.now() + 120 * 86_400_000),
      ),
    ).toBe(true);
  });

  it('offers what the web says about the account and writes the picked findings with the accept', async () => {
    const enabled = vi
      .spyOn(service, 'assistantEnabled')
      .mockResolvedValue(true);
    try {
      const { account, opportunity } = await deal('联网补全');
      const { evaluator } = following({
        ...advance,
        updates: [],
        enrich: [
          {
            field: 'website',
            value: 'https://lianwang.test',
            source: 'https://lianwang.test/about',
          },
          { field: 'employees', value: '51-200', source: null },
          // Not an option: dropped.
          { field: 'industry', value: '光学', source: null },
        ],
      });
      await evaluator.request(actor('rep'), opportunity.id);
      await evaluator.idle();
      const pending = await latestOpportunityEvaluation(
        service,
        actor('rep'),
        opportunity.id,
      );
      expect(pending?.ai.researchedAt).toBeTruthy();
      expect(pending?.ai.result?.enrich).toEqual([
        {
          field: 'website',
          value: 'https://lianwang.test',
          source: 'https://lianwang.test/about',
          current: null,
        },
        { field: 'employees', value: '51-200', source: null, current: null },
      ]);
      const accepted = await evaluator.decide(
        actor('rep'),
        opportunity.id,
        pending!.id,
        'accept',
        ['website'],
      );
      expect(accepted.ai.enrichedFields).toEqual(['website']);
      expect(
        await service.get(actor('rep'), 'accounts', account.id),
      ).toMatchObject({ website: 'https://lianwang.test', employees: null });
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
        approvals: [
          {
            topic: 'discount',
            name: '一期 8 折',
            description: '客户要 8 折，标准折扣不超过 10%（A1）',
          },
          {
            topic: 'paymentTerms',
            name: '尾款验收后 90 天',
            description: '标准账期 30 天',
          },
          {
            topic: 'commitment',
            name: '3 月 15 日前上线',
            description: '要写进合同，延期按天扣款',
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
      const prompts: string[] = [];
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
      container.instance(aiConversationsManagerToken, {
        create: async () => ({ sessionId: 'review-session' }),
      } as unknown as ReturnType<
        typeof container.resolve<typeof aiConversationsManagerToken>
      >);
      container.instance(aiManagerToken, {
        skillsManager: {
          getSkills: async (name: string) =>
            name === 'approval-review'
              ? { content: '# 审批辅助\n\n技能正文。' }
              : undefined,
        },
      } as unknown as ReturnType<
        typeof container.resolve<typeof aiManagerToken>
      >);
      container.instance(agentServiceFactoryToken, {
        createAIEmployee: async () => ({
          invoke: async (input: {
            userMessages: { content: { content: string } }[];
          }) => {
            prompts.push(input.userMessages[0].content.content);
            return { structuredResponse: review };
          },
        }),
      } as unknown as ReturnType<
        typeof container.resolve<typeof agentServiceFactoryToken>
      >);
      container.instance(loggingToken, {
        getLogger: () => ({ warn: () => undefined }),
      } as unknown as ReturnType<
        typeof container.resolve<typeof loggingToken>
      >);
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
      expect(prompts.at(-1)).toContain('技能正文');
      expect(prompts.at(-1)).toContain('一期 8 折');
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
      expect(prompts.at(-1)).toContain('审批人的修改意见');
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
        (await latestReview(service, actor('manager'), second))?.status,
      ).toBe('superseded');
    } finally {
      enabled.mockRestore();
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
        [{ status: 'planned', startAt: daysAgo(-1) }],
        now,
      ),
    ).toBe(undefined);
    expect(
      leadSignal(
        { status: 'new', createdAt: daysAgo(3) },
        [{ status: 'completed', startAt: daysAgo(2) }],
        now,
      ),
    ).toBe(undefined);
    // Worked, nothing for fifteen days: silent; a cancelled one does not
    // count as something happening.
    expect(
      leadSignal(
        { status: 'working', createdAt: daysAgo(40) },
        [
          { status: 'completed', startAt: daysAgo(15) },
          { status: 'cancelled', startAt: daysAgo(3) },
        ],
        now,
      ),
    ).toBe('silent');
    expect(
      leadSignal(
        { status: 'working', createdAt: daysAgo(40) },
        [{ status: 'completed', startAt: daysAgo(10) }],
        now,
      ),
    ).toBe(undefined);
    // Nurtured, its review task due: due.
    expect(
      leadSignal(
        { status: 'nurturing', createdAt: daysAgo(90) },
        [{ status: 'planned', startAt: daysAgo(1) }],
        now,
      ),
    ).toBe('nurtureDue');
    expect(
      leadSignal(
        { status: 'nurturing', createdAt: daysAgo(90) },
        [{ status: 'planned', startAt: daysAgo(-5) }],
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

  it('follows up what an activity marked done belongs to, through the update route', async () => {
    const completed = vi.fn();
    const companyChanged = vi.fn();
    service.activityCompleted = completed;
    service.leadCompanyChanged = companyChanged;
    try {
      const lead = await service.save(actor('rep'), 'leads', {
        name: '路由信号',
        company: '旧公司',
        source: 'website',
      });
      const activity = await service.save(actor('rep'), 'activities', {
        type: 'call',
        name: '电话',
        status: 'planned',
        startAt: new Date().toISOString(),
        leadId: lead.id,
      });
      expect(
        (
          await request(`/activities/${toText(activity.id)}`, 'rep', 'PATCH', {
            status: 'completed',
          })
        ).status,
      ).toBe(200);
      expect(completed).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'rep' }),
        expect.objectContaining({ id: activity.id, leadId: lead.id }),
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
      service.activityCompleted = undefined;
      service.leadCompanyChanged = undefined;
    }
  });

  it('follows up the deal an activity belongs to, else its open lead', async () => {
    const leads = {
      request: vi.fn(async () => ({ id: 'l' })),
      available: async () => true,
    };
    const deals = {
      request: vi.fn(async () => ({ id: 'd' })),
      available: async () => true,
    };
    const account = await service.save(actor('rep'), 'accounts', {
      name: '活动归属客户',
    });
    const deal = await service.save(actor('rep'), 'opportunities', {
      name: '活动归属商机',
      accountId: account.id,
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
      await followUpAfterActivity(service, evaluators, actor('rep'), {
        opportunityId: deal.id,
        leadId: lead.id,
      }),
    ).toBe(true);
    expect(deals.request).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'rep' }),
      deal.id,
      undefined,
      'activityDone',
    );
    expect(leads.request).not.toHaveBeenCalled();
    expect(
      await followUpAfterActivity(service, evaluators, actor('rep'), {
        leadId: lead.id,
      }),
    ).toBe(true);
    expect(leads.request).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'rep' }),
      lead.id,
      undefined,
      'activityDone',
    );
  });
});

describe('demo dataset', () => {
  const count = async (entity: string): Promise<number> =>
    (await service.list(actor('admin'), entity as never, { pageSize: 1 }))
      .total;
  it('imports once for an administrator, creating the demo accounts', async () => {
    expect(
      (await request('/demo/populate', 'manager', 'POST', {})).status,
    ).toBe(403);
    const before = Object.fromEntries(
      await Promise.all(
        [
          'leads',
          'accounts',
          'contacts',
          'opportunities',
          'activities',
          'approvals',
        ].map(async (entity) => [entity, await count(entity)]),
      ),
    );
    expect(await demoStatus(service, actor('admin'))).toMatchObject({
      present: false,
      records: 0,
    });
    // Its approvals, submitted and decided, start no AI run.
    const submitted = vi.fn();
    const decided = vi.fn();
    service.approvalSubmitted = submitted;
    service.approvalDecided = decided;
    let populated: Response;
    try {
      populated = await request('/demo/populate', 'admin', 'POST', {});
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
    expect(status.records).toBeGreaterThan(100);
    expect(await count('accounts')).toBe(before.accounts + 8);
    expect(await count('opportunities')).toBe(before.opportunities + 30);
    expect(await count('leads')).toBe(before.leads + 16);
    expect(await count('approvals')).toBe(before.approvals + 3);
    // Every demo account and lead carries its whole region: the province
    // of its city as well as the country and the city.
    for (const entity of ['accounts', 'leads'] as const) {
      const { data } = await service.list(actor('admin'), entity, {
        pageSize: 500,
      });
      const demo = data.filter((r) => r.city);
      expect(demo.length).toBeGreaterThan(0);
      expect(demo.filter((r) => !r.state)).toEqual([]);
    }
    const shenzhen = (
      await service.list(actor('admin'), 'accounts', { pageSize: 500 })
    ).data.find((r) => r.city === '深圳');
    expect(shenzhen?.state).toBe('CN-44');
    // Activities cover a month back and three months ahead on every
    // working day, so the calendar and the agenda are never empty
    // whichever day the demo is opened on.
    const day = 86400000;
    const now = Date.now();
    const spread = await service.list(actor('admin'), 'activities', {
      pageSize: 500,
    });
    const starts = spread.data.map((a) => Date.parse(toText(a.startAt)));
    // Weekdays between thirty and twenty days back, whatever today is.
    expect(
      starts.filter((t) => t < now - 20 * day).length,
    ).toBeGreaterThanOrEqual(6);
    expect(starts.filter((t) => t > now + 60 * day).length).toBeGreaterThan(15);
    for (let ahead = 8; ahead <= 88; ahead += 7) {
      const from = now + ahead * day;
      expect(
        starts.some((t) => t >= from && t < from + 7 * day),
        `week ${String(ahead)} days ahead has activities`,
      ).toBe(true);
    }
    const users = await service.users(actor('admin'));
    for (const account of demoAccounts) {
      const user = users.find((u) => u.username === account.username);
      expect(user).toBeDefined();
      expect(user?.roles).toEqual([account.role]);
    }
    // The manager owns records; the administrator who imported owns none.
    const owned = await service.list(actor('admin'), 'opportunities', {
      pageSize: 1,
      ownerId: 'admin',
    });
    expect(owned.total).toBe(0);
    const again = await request('/demo/populate', 'admin', 'POST', {});
    expect(again.status).toBe(409);
    expect((await again.json()).code).toBe('demoExists');
    // The assignment notifications the import produced do not reach anyone.
    const queued = await database
      .query()
      .selectFrom('crmOutbox')
      .select('id')
      .where('recipientId', '=', 'demo-liming')
      .execute();
    expect(queued).toEqual([]);
    expect((await request('/demo/reset', 'rep', 'POST', {})).status).toBe(403);
    const reset = await request('/demo/reset', 'admin', 'POST', {});
    expect(reset.status).toBe(200);
    expect((await reset.json()).data.present).toBe(false);
    for (const [entity, total] of Object.entries(before))
      expect([entity, await count(entity)]).toEqual([entity, total]);
    expect(
      await database
        .query()
        .selectFrom('crmSettings')
        .select('id')
        .where('id', '=', DEMO_MARKER)
        .executeTakeFirst(),
    ).toBeUndefined();
    // The accounts are ordinary accounts now and stay.
    expect(
      (await service.users(actor('admin'))).some(
        (u) => u.username === 'liming',
      ),
    ).toBe(true);
    const missing = await request('/demo/reset', 'admin', 'POST', {});
    expect(missing.status).toBe(404);
  }, 120000);

  it('reuses the accounts on a second import and sets their passwords back', async () => {
    // The first import created the accounts, so nothing was reset then.
    expect(passwordResets).toEqual([]);
    const again = await request('/demo/populate', 'admin', 'POST', {});
    expect(again.status).toBe(200);
    expect([...passwordResets].sort()).toEqual(
      demoAccounts.map((a) => `demo-${a.username}`).sort(),
    );
    // Leave the database as the earlier tests expect it: without the demo.
    expect((await request('/demo/reset', 'admin', 'POST', {})).status).toBe(
      200,
    );
  }, 120000);
});

describe("a record's timeline and its activities", () => {
  it('tells when an activity is planned, done or moved, to who may see it', async () => {
    const lead = await service.save(actor('rep'), 'leads', {
      name: '动态里的活动',
      source: 'website',
    });
    const start = '2026-10-05T02:00:00.000Z';
    const call = await service.save(actor('rep'), 'activities', {
      type: 'call',
      name: '需求摸底电话',
      status: 'planned',
      startAt: start,
      endAt: '2026-10-05T02:30:00.000Z',
      leadId: lead.id,
    });
    // Moved, described and renamed (which the lead does not hear of), then
    // done.
    await service.save(
      actor('rep'),
      'activities',
      {
        startAt: '2026-10-06T02:00:00.000Z',
        endAt: '2026-10-06T02:30:00.000Z',
      },
      toText(call.id),
    );
    await service.save(
      actor('rep'),
      'activities',
      { description: '准备案例' },
      toText(call.id),
    );
    await service.save(
      actor('rep'),
      'activities',
      { name: '需求摸底电话（二）', description: '准备两个案例' },
      toText(call.id),
    );
    await service.save(
      actor('rep'),
      'activities',
      { status: 'completed', feedback: '下周给方案' },
      toText(call.id),
    );
    const feed = (await service.historyOf(actor('rep'), 'leads', lead.id)).data;
    const told = feed
      .filter((entry) => entry.entity === 'activities')
      .map((entry) => [entry.action, entry.toValue ?? null]);
    expect(told).toEqual([
      ['status', 'completed'],
      ['updated', null],
      ['created', null],
    ]);
    const moved = feed.find(
      (entry) =>
        entry.entity === 'activities' &&
        entry.action === 'updated' &&
        'startAt' in (entry.changes as object),
    );
    expect(moved).toMatchObject({
      changes: { startAt: '2026-10-06T02:00:00.000Z' },
      previous: { startAt: start },
      activity: {
        name: '需求摸底电话（二）',
        type: 'call',
        status: 'completed',
        feedback: '下周给方案',
      },
    });
    // The lead's own entries stay, and the count covers both.
    expect(feed.some((entry) => entry.entity === 'leads')).toBe(true);
    // Someone who may read the lead but not the activity hears nothing of
    // it.
    const hidden = await service.save(actor('manager'), 'activities', {
      type: 'meeting',
      name: '经理自己的会议',
      status: 'planned',
      ownerId: 'manager',
      startAt: start,
      endAt: '2026-10-05T03:00:00.000Z',
      leadId: lead.id,
    });
    const reps = (await service.historyOf(actor('rep'), 'leads', lead.id)).data;
    const managers = (
      await service.historyOf(actor('manager'), 'leads', lead.id)
    ).data;
    expect(managers.some((e) => e.recordId === hidden.id)).toBe(true);
    const repSees = (
      await service.list(actor('rep'), 'activities', { leadId: lead.id })
    ).data.some((a) => a.id === hidden.id);
    expect(reps.some((e) => e.recordId === hidden.id)).toBe(repSees);
    // The activity's own history is its own entries, as before.
    const own = (
      await service.historyOf(actor('rep'), 'activities', toText(call.id))
    ).data;
    expect(own.map((entry) => entry.action)).toEqual([
      'status',
      'updated',
      'updated',
      'updated',
      'created',
    ]);
    expect(own.every((entry) => !('activity' in entry))).toBe(true);
    // Handed to another owner, it is told with the owner alone.
    await service.save(
      actor('admin'),
      'activities',
      { ownerId: 'manager', description: '经理接手' },
      toText(call.id),
    );
    expect(
      (await service.historyOf(actor('admin'), 'leads', lead.id)).data[0],
    ).toMatchObject({
      entity: 'activities',
      action: 'updated',
      changes: { ownerId: 'manager' },
      previous: { ownerId: 'rep' },
    });
    // Deleted, it is told on the lead by name.
    await service.remove(actor('admin'), 'activities', toText(call.id));
    expect(
      (await service.historyOf(actor('rep'), 'leads', lead.id)).data[0],
    ).toMatchObject({
      entity: 'leads',
      action: 'activityDeleted',
      actorId: 'admin',
      changes: {
        activityId: call.id,
        name: '需求摸底电话（二）',
        type: 'call',
      },
    });
    // The notes tab stays the notes alone.
    expect(
      (
        await service.historyOf(actor('rep'), 'leads', lead.id, {
          action: 'note',
        })
      ).data,
    ).toEqual([]);
  });
});

describe('resolved titles and paged filters', () => {
  it('names every record a page refers to and filters activities by date', async () => {
    const account = await service.save(actor('rep'), 'accounts', {
      name: 'Titled account',
    });
    const contact = await service.save(actor('rep'), 'contacts', {
      name: 'Titled person',
      accountId: account.id,
    });
    const deal = await service.save(actor('rep'), 'opportunities', {
      name: 'Titled deal',
      accountId: account.id,
      amount: 12345,
      currency: 'CNY',
      contacts: [{ contactId: contact.id, role: 'other' }],
    });
    const activity = await service.save(actor('rep'), 'activities', {
      name: 'Titled call',
      accountId: account.id,
      opportunityId: deal.id,
      externalParticipants: [contact.id],
      startAt: '2031-03-10T09:00:00.000Z',
      endAt: '2031-03-10T10:00:00.000Z',
    });
    const approval = await service.save(actor('rep'), 'approvals', {
      name: 'Titled approval',
      opportunityId: deal.id,
      topic: 'discount',
      approverId: 'manager',
    });
    const page = async (path: string): Promise<Record<string, any>> =>
      (await request(path, 'rep').then((r) => r.json())) as Record<string, any>;
    // A contact and a deal carry their account in the title; the bare name
    // stays available for lists already scoped to that account.
    const contacts = await page(`/contacts?ids=${toText(contact.id)}`);
    expect(contacts.titles[toText(contact.id)]).toBe(
      'Titled person / Titled account',
    );
    expect(contacts.names[toText(contact.id)]).toBe('Titled person');
    const deals = await page(`/opportunities?ids=${toText(deal.id)}`);
    expect(deals.titles[toText(deal.id)]).toBe('Titled account / Titled deal');
    expect(deals.titles[toText(account.id)]).toBe('Titled account');
    expect(deals.titles[toText(contact.id)]).toBe(
      'Titled person / Titled account',
    );
    // The approval list names the deal and carries its size for the column.
    const approvals = await page(`/approvals?ids=${toText(approval.id)}`);
    expect(approvals.titles[toText(deal.id)]).toBe(
      'Titled account / Titled deal',
    );
    expect(approvals.opportunities[toText(deal.id)]).toEqual({
      amount: 12345,
      currency: 'CNY',
    });
    // A detail page gets the names of what it links to and, for a deal, the
    // account's contacts to offer.
    const detail = await page(`/opportunities/${toText(deal.id)}`);
    expect(detail.data.titles[toText(account.id)]).toBe('Titled account');
    expect(
      detail.data.related.contacts.map((c: { id: string }) => c.id),
    ).toContain(contact.id);
    // Activities by when they happen, for the calendar's month.
    const inMarch = await page(
      '/activities?startFrom=2031-03-01T00:00:00.000Z&startTo=2031-03-31T23:59:59.999Z',
    );
    expect(inMarch.data.map((r: { id: string }) => r.id)).toContain(
      activity.id,
    );
    expect(inMarch.titles[toText(deal.id)]).toBe(
      'Titled account / Titled deal',
    );
    const inApril = await page(
      '/activities?startFrom=2031-04-01T00:00:00.000Z&startTo=2031-04-30T23:59:59.999Z',
    );
    expect(inApril.data.map((r: { id: string }) => r.id)).not.toContain(
      activity.id,
    );
    // A picker leaves out one status, and the whole-table lookup is gone.
    const leads = await page('/leads?excludeStatus=new&pageSize=200');
    expect(
      leads.data.every((r: { status: string }) => r.status !== 'new'),
    ).toBe(true);
    expect((await request('/leads/lookup', 'rep')).status).toBe(404);
  });
  it("pages a detail page's related lists, its history and the AI actions", async () => {
    const account = await service.save(actor('rep'), 'accounts', {
      name: 'Busy account',
    });
    for (let i = 0; i < 23; i++)
      await service.save(actor('rep'), 'contacts', {
        name: `Person ${toText(i)}`,
        accountId: account.id,
      });
    // Twenty-two history entries: the creation and twenty-one renames.
    for (let i = 0; i < 21; i++)
      await service.save(
        actor('rep'),
        'accounts',
        { name: `Busy account ${toText(i)}` },
        toText(account.id),
      );
    const detail = (await request(
      `/accounts/${toText(account.id)}`,
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
      `/contacts?accountId=${toText(account.id)}&page=2&pageSize=20`,
      'rep',
    ).then((r) => r.json())) as { data: unknown[]; total: number };
    expect(contacts.data).toHaveLength(3);
    expect(contacts.total).toBe(23);
    const history = (await request(
      `/accounts/${toText(account.id)}/history?page=2&pageSize=20`,
      'rep',
    ).then((r) => r.json())) as {
      data: unknown[];
      total: number;
      page: number;
    };
    expect(history.page).toBe(2);
    expect(history.data).toHaveLength(2);
    expect(history.total).toBe(22);
    // History is read within the reader's access, like the record.
    expect(
      (await request(`/accounts/${toText(account.id)}/history`, 'outsider'))
        .status,
    ).toBe(403);
  });
  it('pages the workspace lists in fives and only for the reader', async () => {
    // Seven overdue activities of the reader's own, one of somebody else's.
    const late = await service.save(actor('rep'), 'accounts', {
      name: 'Late account',
    });
    for (let i = 0; i < 7; i++)
      await service.save(actor('rep'), 'activities', {
        name: `Overdue ${toText(i)}`,
        accountId: late.id,
        startAt: `2020-01-0${toText(i + 1)}T09:00:00.000Z`,
        endAt: `2020-01-0${toText(i + 1)}T10:00:00.000Z`,
      });
    await service.save(actor('other'), 'activities', {
      name: 'Someone else is late',
      accountId: late.id,
      startAt: '2020-02-01T09:00:00.000Z',
      endAt: '2020-02-01T10:00:00.000Z',
    });
    const board = (await request('/dashboard?scope=mine', 'rep').then((r) =>
      r.json(),
    )) as { data: { overdue: { data: { name: string }[]; total: number } } };
    expect(board.data.overdue.data).toHaveLength(5);
    const mine = await service.list(actor('rep'), 'activities', {
      status: 'planned',
      involvedId: 'rep',
      startTo: new Date().toISOString(),
      pageSize: 1,
    });
    expect(board.data.overdue.total).toBe(mine.total);
    expect(
      board.data.overdue.data.some((r) => r.name === 'Someone else is late'),
    ).toBe(false);
    const second = (await request(
      '/dashboard/overdue?scope=mine&page=2&pageSize=5',
      'rep',
    ).then((r) => r.json())) as { data: { name: string }[]; page: number };
    expect(second.page).toBe(2);
    expect(second.data.length).toBeGreaterThan(0);
    expect(second.data.length).toBeLessThanOrEqual(5);
    expect((await request('/dashboard/nothing', 'rep')).status).toBe(404);
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
    await migrator.latest();
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
    await isolated
      .query()
      .insertInto('crmActivities')
      .values({
        id: 'no-show',
        type: 'call',
        name: 'Missed call',
        status: 'noShow',
        ownerId: 'rep',
        startAt: at,
        endAt: at,
        createdById: 'rep',
        createdAt: at,
        updatedAt: at,
      })
      .execute();
    expect((await migrator.latest()).executed).toEqual([
      '202610020001_crm_activities_no_show_cancelled',
      '202610020002_crm_activities_end_optional',
      '202610030001_crm_phone_numbers',
    ]);
    // An activity may now have no end.
    await isolated
      .query()
      .insertInto('crmActivities')
      .values({
        id: 'no-end',
        type: 'email',
        name: 'Quick email',
        status: 'planned',
        ownerId: 'rep',
        startAt: at,
        endAt: null,
        createdById: 'rep',
        createdAt: at,
        updatedAt: at,
      })
      .execute();
    // ... is cancelled now.
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
    expect((await migrator.latest()).executed).toEqual([]);
    // Each run is a batch: the last one first, then the thirty before it.
    // Rolled back, an activity without an end takes its start.
    expect((await migrator.rollback()).rolledBack).toEqual([
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

describe('approval-notification workflow', () => {
  const approvalFor = async (crm: CrmService, name: string) => {
    const account = await crm.save(actor('rep'), 'accounts', { name });
    const opportunity = await crm.save(actor('rep'), 'opportunities', {
      name: `${name} deal`,
      accountId: account.id,
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
        .select(['id', 'event', 'recipientId'])
        .where('recordId', '=', recordId)
        .execute()
    ).map((r) => [toText(r.event), toText(r.recipientId), toText(r.id)]);

  it('starts the workflow for every approval event once it is committed', async () => {
    const trigger = vi.fn().mockResolvedValue({
      status: 'accepted',
      eventKey: 'k',
      runId: 'r',
    });
    const crm = new CrmService(database, authorization, () => ({
      trigger,
      registerInstruction: () => undefined,
    }));
    const approval = await approvalFor(crm, 'Workflow account');
    const submitted = await crm.approvalAction(
      actor('rep'),
      approval.id,
      'submit',
    );
    const withdrawn = await crm.approvalAction(
      actor('rep'),
      approval.id,
      'withdraw',
    );
    await crm.approvalAction(actor('rep'), approval.id, 'submit');
    const decided = await crm.approvalAction(
      actor('manager'),
      approval.id,
      'reject',
      'No',
    );
    const calls = trigger.mock.calls.map(([key, input, options]) => ({
      key,
      event: input.event,
      recipientId: input.recipientId,
      actorId: input.actorId,
      eventKey: options.eventKey,
    }));
    expect(calls.map((c) => c.key)).toEqual([
      'approval-notification',
      'approval-notification',
      'approval-notification',
      'approval-notification',
    ]);
    expect(calls.map((c) => [c.event, c.recipientId, c.actorId])).toEqual([
      ['pending', 'manager', 'rep'],
      ['withdrawn', 'manager', 'rep'],
      ['pending', 'manager', 'rep'],
      ['rejected', 'rep', 'manager'],
    ]);
    expect(calls[0].eventKey).toBe(
      `approval-notification:${toText(approval.id)}:pending:${toText(submitted.updatedAt)}`,
    );
    expect(calls[1].eventKey).toBe(
      `approval-notification:${toText(approval.id)}:withdrawn:${toText(withdrawn.updatedAt)}`,
    );
    expect(calls[3].eventKey).toBe(
      `approval-notification:${toText(approval.id)}:rejected:${toText(decided.updatedAt)}`,
    );
    // The workflow is the only sender: the service queued nothing itself.
    expect(await outboxEvents(approval.id)).toEqual([]);
  });

  it('sends nothing itself when the workflow is not running', async () => {
    const crm = new CrmService(database, authorization, () => ({
      trigger: vi
        .fn()
        .mockResolvedValue({ status: 'skipped', reason: 'disabled' }),
      registerInstruction: () => undefined,
    }));
    const approval = await approvalFor(crm, 'Skipped account');
    await crm.approvalAction(actor('rep'), approval.id, 'submit');
    const decided = await crm.approvalAction(
      actor('manager'),
      approval.id,
      'approve',
    );
    expect(decided.status).toBe('approved');
    expect(await outboxEvents(approval.id)).toEqual([]);
  });

  it('queues each message once from the run script, however often it reruns', async () => {
    const approval = await approvalFor(service, 'Script account');
    const at = new Date().toISOString();
    const args = {
      recordId: approval.id,
      recipientId: 'rep',
      actorId: 'manager',
      event: 'rejected',
      at,
    };
    const options = {
      services: {
        has: () => true,
        resolve: (token: unknown) =>
          token === databaseManagerToken ? database : service,
      },
      signal: new AbortController().signal,
      logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
    } as unknown as Parameters<typeof notify>[1];
    expect(await notify(args, options)).toEqual({ queued: true });
    expect(await notify(args, options)).toEqual({ queued: false });
    expect(
      await notify(
        { ...args, event: 'pending', recipientId: 'manager', actorId: 'rep' },
        options,
      ),
    ).toEqual({ queued: true });
    expect(
      (await outboxEvents(approval.id)).map(([event, recipient]) => [
        event,
        recipient,
      ]),
    ).toEqual([
      ['rejected', 'rep'],
      ['pending', 'manager'],
    ]);
    await expect(notify({ ...args, event: 'maybe' }, options)).rejects.toThrow(
      /event/,
    );
  });
});

describe('record-notification workflow', () => {
  it('starts a run for a change of hands and for participant changes, once committed', async () => {
    const inline = inlineWorkflows(() => crm);
    const crm = new CrmService(database, authorization, () => inline.workflows);
    const lead = await crm.save(actor('manager'), 'leads', {
      name: 'Handoff lead',
      ownerId: 'rep',
    });
    // The new owner is told; the manager who did it is not.
    expect(
      inline.triggers.map((t) => [
        t.key,
        t.input.event,
        t.input.recipientId,
        t.input.actorId,
      ]),
    ).toEqual([['record-notification', 'assigned', 'rep', 'manager']]);
    expect(inline.triggers[0].input).toMatchObject({
      entity: 'leads',
      recordId: lead.id,
      at: lead.updatedAt,
    });
    expect(inline.triggers[0].eventKey).toBe(
      `record-notification:leads:${toText(lead.id)}:assigned:rep:${toText(lead.updatedAt)}`,
    );
    inline.triggers.length = 0;
    const meeting = await crm.save(actor('rep'), 'activities', {
      name: 'Handoff meeting',
      leadId: lead.id,
      startAt: '2026-10-01T02:00:00.000Z',
      endAt: '2026-10-01T03:00:00.000Z',
      internalParticipants: ['other'],
    });
    await crm.save(
      actor('rep'),
      'activities',
      {
        startAt: '2026-10-01T04:00:00.000Z',
        endAt: '2026-10-01T05:00:00.000Z',
      },
      meeting.id,
    );
    await crm.save(
      actor('rep'),
      'activities',
      { internalParticipants: [] },
      meeting.id,
    );
    expect(
      inline.triggers.map((t) => [t.input.event, t.input.recipientId]),
    ).toEqual([
      ['invited', 'other'],
      ['rescheduled', 'other'],
      ['removed', 'other'],
    ]);
    // The workflow queued each message through the service by its key.
    const queued = await database
      .query()
      .selectFrom('crmOutbox')
      .select(['event', 'recipientId'])
      .where('recordId', '=', meeting.id)
      .execute();
    expect(queued.map((r) => [toText(r.event), toText(r.recipientId)])).toEqual(
      [
        ['invited', 'other'],
        ['rescheduled', 'other'],
        ['removed', 'other'],
      ],
    );
  });

  it('starts nothing when the change is rolled back', async () => {
    const inline = inlineWorkflows(() => crm);
    const crm = new CrmService(database, authorization, () => inline.workflows);
    await expect(
      crm.save(actor('manager'), 'leads', {
        name: 'Rolled back',
        ownerId: 'no-such-user',
      }),
    ).rejects.toBeDefined();
    expect(inline.triggers).toEqual([]);
  });
});

describe('notes in the activity feed', () => {
  it('lets anyone who may read a record add a note, and only its author change or remove it', async () => {
    const lead = await service.save(actor('rep'), 'leads', {
      name: 'Noted',
      source: 'website',
    });
    const id = toText(lead.id);
    // Unauthenticated, empty, or for someone who may not read the lead.
    expect(
      (await request(`/leads/${id}/notes`, undefined, 'POST', { text: 'x' }))
        .status,
    ).toBe(401);
    expect(
      (await request(`/leads/${id}/notes`, 'rep', 'POST', { text: '  ' }))
        .status,
    ).toBe(400);
    expect(
      (await request(`/leads/${id}/notes`, 'outsider', 'POST', { text: 'x' }))
        .status,
    ).toBe(403);
    // The owner, and another rep who may read but not edit the lead.
    const own = await (
      await request(`/leads/${id}/notes`, 'rep', 'POST', {
        text: 'Already runs SAP; wants an integration only.',
      })
    ).json();
    expect(
      (await request(`/leads/${id}/notes`, 'other', 'POST', { text: 'Seen' }))
        .status,
    ).toBe(200);
    const feed = await service.historyOf(actor('rep'), 'leads', id);
    const notes = feed.data.filter((entry) => entry.action === 'note');
    expect(notes.map((note) => object(note.changes).text).sort()).toEqual([
      'Already runs SAP; wants an integration only.',
      'Seen',
    ]);
    // The notes tab reads them alone, and the record says how many.
    expect(
      (
        await service.historyOf(actor('rep'), 'leads', id, { action: 'note' })
      ).data.every((entry) => entry.action === 'note'),
    ).toBe(true);
    expect((await service.detail(actor('rep'), 'leads', id)).notesTotal).toBe(
      2,
    );
    // A person's note counts among the people's entries.
    expect(
      (
        await service.historyOf(actor('rep'), 'leads', id, { source: 'user' })
      ).data.filter((entry) => entry.action === 'note'),
    ).toHaveLength(2);
    // Only the author changes or removes it.
    const noteId = toText(own.data.id);
    expect(
      (
        await request(`/notes/${noteId}`, 'other', 'PATCH', {
          text: 'Not mine',
        })
      ).status,
    ).toBe(403);
    expect((await request(`/notes/${noteId}`, 'other', 'DELETE')).status).toBe(
      403,
    );
    const edited = await (
      await request(`/notes/${noteId}`, 'rep', 'PATCH', {
        text: 'Runs SAP ECC; integration only.',
      })
    ).json();
    expect(object(edited.data.changes).text).toBe(
      'Runs SAP ECC; integration only.',
    );
    const [after] = (
      await service.historyOf(actor('rep'), 'leads', id)
    ).data.filter((entry) => entry.id === noteId);
    expect(after?.editedAt).toBeTruthy();
    expect(object(after?.previous).text).toBe(
      'Already runs SAP; wants an integration only.',
    );
    // The feed says, at the time of the edit, who changed which note (the
    // timeline leads there) and to what; the notes tab lists the note alone.
    expect(
      (await service.historyOf(actor('rep'), 'leads', id)).data,
    ).toContainEqual(
      expect.objectContaining({
        action: 'noteEdited',
        actorId: 'rep',
        changes: { text: 'Runs SAP ECC; integration only.', noteId },
      }),
    );
    expect(
      (
        await service.historyOf(actor('rep'), 'leads', id, { action: 'note' })
      ).data.some((entry) => entry.action === 'noteEdited'),
    ).toBe(false);
    // Other entries are not notes and stay as they are.
    const created = feed.data.find((entry) => entry.action === 'created');
    expect(
      (
        await request(`/notes/${toText(created?.id)}`, 'rep', 'PATCH', {
          text: 'x',
        })
      ).status,
    ).toBe(404);
    expect((await request(`/notes/${noteId}`, 'rep', 'DELETE')).status).toBe(
      200,
    );
    const after2 = (await service.historyOf(actor('rep'), 'leads', id)).data;
    expect(after2.some((entry) => entry.id === noteId)).toBe(false);
    // The feed says a note was removed, and by whom, without its text.
    expect(after2).toContainEqual(
      expect.objectContaining({
        action: 'noteDeleted',
        actorId: 'rep',
        changes: {},
      }),
    );
  });
  it('lets the AI propose a note, screened like the others and recorded as its proposal', async () => {
    const lead = await service.save(actor('rep'), 'leads', {
      name: 'AI noted',
      source: 'website',
    });
    const id = toText(lead.id);
    const input = { entity: 'leads', id, title: 'Note', text: 'Runs SAP' };
    // Anyone who may read the lead may note on it; nobody else, and not
    // with an empty note.
    expect(
      await screenProposal(service, actor('other'), 'add_note', input),
    ).toEqual({ ok: true });
    expect(
      (await screenProposal(service, actor('outsider'), 'add_note', input)).ok,
    ).toBe(false);
    expect(
      await screenProposal(service, actor('rep'), 'add_note', {
        ...input,
        text: ' ',
      }),
    ).toMatchObject({ ok: false, code: 'invalidInput', field: 'text' });
    const tool = crmWriteTools(service, authorization).find(
      (candidate) => candidate.definition.name === 'add_note',
    );
    const result = (await tool!.invoke(
      { actor: { id: 'other', roles: [], isRoot: false } },
      input,
      { toolCallId: 'call', writer: () => undefined },
    )) as Record<string, unknown>;
    expect(object(result.values).text).toBe('Runs SAP');
    const [note] = (
      await service.historyOf(actor('rep'), 'leads', id)
    ).data.filter((entry) => entry.action === 'note');
    expect(note).toMatchObject({ actorId: 'other', source: 'assistant' });
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
    await service.save(actor('rep'), 'activities', {
      type: 'call',
      name: '首次电话',
      status: 'planned',
      startAt: '2026-10-20T02:00:00Z',
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
  it('merges one lead into another: picked values, activities and notes moved, the merge on the timeline', async () => {
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
    const activity = await service.save(actor('rep'), 'activities', {
      type: 'call',
      name: '报价沟通',
      status: 'planned',
      startAt: '2026-10-21T02:00:00Z',
      leadId: merged.id,
    });
    await service.addNote(actor('rep'), 'leads', merged.id, '预算已批');
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
    expect(
      await service.get(actor('rep'), 'activities', activity.id),
    ).toMatchObject({ leadId: kept.id });
    const history = (await service.historyOf(actor('rep'), 'leads', kept.id))
      .data;
    expect(history.find((e) => e.action === 'note')).toMatchObject({
      changes: { text: '预算已批' },
    });
    expect(history.find((e) => e.action === 'merged')).toMatchObject({
      changes: {
        lead: { id: merged.id, company: '合并测试乙有限公司' },
        activities: 1,
        notes: 1,
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
            accountId: (
              await service.save(actor('rep'), 'accounts', {
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
