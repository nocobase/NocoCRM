import CrmProvider from '../../server/providers/crm/index.js';
import { i18nToken } from '@nocobase/app-server/i18n';
import { I18nRuntime } from '@nocobase/i18n';
import { notificationServiceToken } from '@nocobase/app-plugin-notification/server';
import { notificationLocales } from '../../server/locales/crm-notifications/index.js';
import { statistics } from '../../server/providers/crm/statistics.js';
import { dashboard } from '../../server/providers/crm/dashboard.js';
import {
  fieldsFor,
  toText,
  entities,
} from '../../server/providers/crm/schema.js';
import geographyMigration from '../../database/main/migrations/202609100001_crm_geography_codes.js';
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
  type AppAuthorizationService,
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
import { run as notify } from '../../server/workflows/approval-notification/server/notify.js';
import { run as notifyRecord } from '../../server/workflows/record-notification/server/notify.js';
import { run as remind } from '../../server/workflows/activity-reminder/server/remind.js';
import { createCrmUserRoleScope } from '../../server/providers/crm/user-roles.js';
import { crmRecordTools } from '../../server/ai/tools/crm-records.js';
import { crmWriteTools } from '../../server/ai/tools/crm-writes.js';
import { screenProposal } from '../../server/ai/screen.js';
import crmEmployee, {
  crmAssistant,
} from '../../server/ai/employees/crm-assistant.js';
import { convertLead } from '../../server/providers/crm/conversion.js';
import { crmToken } from '../../server/providers/crm/index.js';
import { crmRoutes } from '../../server/routes/crm.js';
import { userManagementServiceToken } from '@nocobase/app-plugin-users/server/tokens';
import {
  DEMO_MARKER,
  demoAccounts,
  demoStatus,
} from '../../server/providers/crm/demo.js';
import type { Application } from '@nocobase/app-server/application';

let database: DatabaseManager;
let authorization: AppAuthorizationService;
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
    // Every object is a resource with the four operations, in the CRM's
    // business group; the capabilities are a resource of their own.
    const defined = authorization.resources.definitionsList();
    for (const entity of entities) {
      const resource = defined.find((d) => d.name === `crm.${entity}`);
      expect(resource?.group).toBe('crm');
      expect(resource?.actions.map((a) => a.name)).toEqual([
        'view',
        'create',
        'edit',
        'delete',
      ]);
      // View, edit and delete offer record scopes; create has none.
      expect(Object.keys(resource!.actions[0]!.scopes ?? {})).toEqual([
        'records',
      ]);
      expect(resource!.actions[1]!.scopes ?? {}).toEqual({});
    }
    expect(
      defined.find((d) => d.name === 'crm.sales')?.actions.map((a) => a.name),
    ).toEqual(['assign', 'approve', 'export']);
    // The provisioned sets grant the operations and the pages, nothing raw.
    const rep = await authorization.permissionSets.get(
      roleKey('sales-representative'),
    );
    const types = new Set(rep!.grants.map((g) => g.resource.type));
    expect([...types].sort()).toEqual(['page', 'resource']);
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
        leads?.actions.find((a) => a.action === 'edit')?.policy as Record<
          string,
          unknown
        >
      )?.records,
    ).toBe('recordsIOwn');
    const manager = await authorization.permissionSets.get(
      roleKey('sales-manager'),
    );
    expect(
      manager!.grants
        .find((g) => g.resource.id === 'crm.sales')
        ?.actions.map((a) => a.action),
    ).toEqual(['assign', 'approve', 'export']);
    // The administrator is the plugin's root set: unrestricted by
    // declaration, so it carries no CRM grants and is offered as the role.
    expect((await authorization.permissionSets.get('root'))?.grants).toEqual(
      [],
    );
    expect(await authorization.permissionSets.isUnrestricted('root')).toBe(
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
    ).toEqual(['assign', 'approve', 'export']);
    // A set provisioned before the operations existed is translated into
    // them once, keeping its scopes; grants the CRM does not own stay.
    const legacy = translateLegacyGrants([
      authorization.db.grant('crmLeads', {
        read: { fields: '*', recordAccess: ['allRecords'] },
        create: { fields: '*' },
        update: { fields: '*', recordAccess: ['recordsIOwn'] },
      }),
      authorization.db.grant('crmApprovals', {
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
  });
  it('enforces field permissions in records, history, export, search and updates', async () => {
    const readable = fieldsFor('leads').filter(
      (field) => !['email', 'message', 'attachments'].includes(field),
    );
    await authorization.permissionSets.create({
      key: 'limited',
      grants: [
        authorization.db.grant('crmLeads', {
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
    const delivered = send.mock.calls
      .map(
        (call) =>
          call[0] as {
            to: { id: string };
            content: { title: string; body: string; actionUrl: string };
          },
      )
      .filter((call) => call.content.actionUrl.endsWith(meeting.id));
    expect(delivered).toHaveLength(1);
    expect(delivered[0]).toMatchObject({
      to: { id: 'rep' },
      content: {
        title: '活动即将开始',
        body: expect.stringContaining('即将开始的会议'),
      },
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
      .map((call) => call[0] as { content: { body: string } })
      .find((call) => call.content.body.includes('提醒测试'));
    expect(leadMessage?.content.body).toContain('提醒测试 / 提醒公司');
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
      'approval_action',
      'convert_lead',
      'create_record',
      'delete_record',
      'get_record',
      'list_users',
      'search_records',
      'summarize_records',
      'update_record',
    ]);
    // Reports come from the plugin's report skill, whose tool the model
    // activates by loading it; skills have to be on for that.
    expect(crmEmployee.skills).toEqual(['business-analysis-report']);
    expect(crmEmployee.chatSettings?.enableSkills).toBe(true);
    expect(crmAssistant({ avatar: 'https://crm.example/x.png' }).avatar).toBe(
      'https://crm.example/x.png',
    );
    // The deployment's business guidance is part of the role itself.
    expect(crmAssistant({ avatar: 'x' }).systemPrompt).toContain(
      '云策数字咨询',
    );
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
    const populated = await request('/demo/populate', 'admin', 'POST', {});
    expect(populated.status).toBe(200);
    const status = (await populated.json()).data;
    expect(status.present).toBe(true);
    expect(status.records).toBeGreaterThan(100);
    expect(await count('accounts')).toBe(before.accounts + 8);
    expect(await count('opportunities')).toBe(before.opportunities + 30);
    expect(await count('leads')).toBe(before.leads + 16);
    expect(await count('approvals')).toBe(before.approvals + 3);
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
    expect((await migrator.latest()).executed).toHaveLength(26);
    expect(await isolated.builder().hasCollection('crmLeads')).toBe(true);
    expect((await migrator.latest()).executed).toEqual([]);
    expect((await migrator.rollback()).rolledBack).toHaveLength(26);
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
