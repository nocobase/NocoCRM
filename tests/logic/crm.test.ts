import CrmProvider from '../../server/providers/crm/index.js';
import { i18nToken } from '@nocobase/app-server/i18n';
import { I18nRuntime } from '@nocobase/i18n';
import { notificationServiceToken } from '@nocobase/app-plugin-notification/server';
import { notificationLocales } from '../../server/locales/crm-notifications/index.js';
import { statistics } from '../../server/providers/crm/statistics.js';
import { dashboard } from '../../server/providers/crm/dashboard.js';
import { fieldsFor, toText } from '../../server/providers/crm/schema.js';
import geographyMigration from '../../database/main/migrations/202609100001_crm_geography_codes.js';
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
} from '@nocobase/app-plugin-authorization';
import { authenticationToken } from '@nocobase/app-plugin-authentication';
import { createConfigPaths } from '@nocobase/app-server/config';
import { ServiceContainer } from '@nocobase/service-provider';
import { Hono, type MiddlewareHandler } from 'hono';
import {
  registerCrmResources,
  provisionCrm,
  roleKey,
  type Actor,
} from '../../server/providers/crm/authorization.js';
import { CrmService } from '../../server/providers/crm/service.js';
import { createCrmUserRoleScope } from '../../server/providers/crm/user-roles.js';
import { convertLead } from '../../server/providers/crm/conversion.js';
import { crmToken, crmAiToken } from '../../server/providers/crm/index.js';
import { CrmAi, previewRecords } from '../../server/providers/crm/ai.js';
import { crmRoutes } from '../../server/routes/crm.js';
import { userManagementServiceToken } from '@nocobase/app-plugin-users/server/tokens';
import {
  DEMO_MARKER,
  demoAccounts,
  demoStatus,
} from '../../server/providers/crm/demo.js';
import type { Application } from '@nocobase/app-server/application';
import type { AIManager } from '@nocobase/ai-employee';

let database: DatabaseManager;
let authorization: AppAuthorization;
let service: CrmService;
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
    // The authentication plugin's account-level switch, read by the CRM.
    c.datetimeTz('disabledAt').nullable();
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
  authorization = createAppAuthorization({ connection: database.connection() });
  registerCrmResources(authorization);
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
  container.instance(crmAiToken, new CrmAi(service, {} as AIManager));
  // What the demo import needs from the users plugin: an account with a role.
  container.instance(userManagementServiceToken, {
    async create(input: {
      name: string;
      username: string;
      email: string;
      roleScopes: Record<string, string>;
    }) {
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
      await authorization.permissionSets.assign({
        permissionSet: input.roleScopes.app,
        subject: { type: 'user', id },
      });
      return { id };
    },
  } as unknown as ReturnType<
    typeof container.resolve<typeof userManagementServiceToken>
  >);
  router = await crmRoutes.createRouter({
    container,
    publicBasePath: '/test',
    paths: createConfigPaths({ rootDir: folder }),
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
  it('keeps AI list previews to summary fields', () => {
    const preview = previewRecords('leads', [
      {
        id: 'lead-1',
        name: 'Ada',
        company: 'Example',
        status: 'working',
        source: 'website',
        ownerId: 'rep',
        updatedAt: '2026-09-11T00:00:00.000Z',
        email: 'ada@example.test',
        phone: '+1 555 0100',
        message: 'Long enquiry text',
      },
    ]);
    expect(preview).toEqual([
      {
        id: 'lead-1',
        name: 'Ada',
        company: 'Example',
        status: 'working',
        source: 'website',
        ownerId: 'rep',
        updatedAt: '2026-09-11T00:00:00.000Z',
      },
    ]);
  });

  it('rejects anonymous and unpermitted requests and serves permitted users', async () => {
    expect((await request('/leads')).status).toBe(401);
    expect((await request('/leads', 'outsider')).status).toBe(403);
    expect((await request('/leads', 'rep')).status).toBe(200);
    expect((await request('/settings', 'rep')).status).toBe(403);
    expect((await request('/settings', 'manager')).status).toBe(403);
    expect((await request('/metadata', 'admin')).status).toBe(200);
    expect(
      await actor('admin').scope.can({
        resource: { type: 'authorization.settings', id: 'crm' },
        action: 'manage',
      }),
    ).toBe(true);
    expect(
      await actor('rep').scope.can({
        resource: { type: 'authorization.settings', id: 'crm' },
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
    const outbox = await database
      .query()
      .selectFrom('crmOutbox')
      .selectAll()
      .where('recordId', '=', approval.id)
      .execute();
    expect(outbox.map((r) => r.event)).toEqual(
      expect.arrayContaining(['pending', 'approved']),
    );
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
  it('enforces field permissions in records, history, export, search and updates', async () => {
    const readable = fieldsFor('leads').filter(
      (field) => !['email', 'message', 'attachments'].includes(field),
    );
    await authorization.permissionSets.create({
      key: 'limited',
      grants: [
        authorization.database.grant('crmLeads', {
          read: { fields: { output: readable }, recordAccess: ['allRecords'] },
          update: {
            fields: { input: ['name'], output: readable },
            recordAccess: ['allRecords'],
          },
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
        await request('/leads/lookup', 'restricted').then((r) => r.json()),
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
    expect((board.today as CrmRecord[]).length).toBe(0);
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
    });
    const meeting = await service.save(actor('rep'), 'activities', {
      name: '即将开始的会议',
      leadId: lead.id,
      startAt: new Date(Date.now() + 60000).toISOString(),
      endAt: new Date(Date.now() + 3600000).toISOString(),
    });
    const send = vi.fn().mockResolvedValue({ notificationId: 'test-delivery' });
    const container = new ServiceContainer();
    container.instance(crmToken, service);
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
    const count = send.mock.calls.length;
    await scan.call(provider);
    expect(send).toHaveBeenCalledTimes(count);
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
  it('screens AI proposals by the same rules execution applies', async () => {
    const ai = new CrmAi(service, {} as AIManager);
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
    const screen = (who: string, action: Record<string, unknown>) =>
      ai.screen(actor(who), action);
    // Editing a record you do not own, and handing a record to someone else
    // without the assign right, are refused; a manager may do both.
    expect(
      await screen('rep', {
        entity: 'leads',
        operation: 'update',
        recordId: theirs.id,
        input: { phone: '1' },
      }),
    ).toBe('forbidden');
    expect(
      await screen('rep', {
        entity: 'leads',
        operation: 'update',
        recordId: mine.id,
        input: { phone: '1' },
      }),
    ).toBe('ok');
    expect(
      await screen('rep', {
        entity: 'leads',
        operation: 'create',
        input: { name: 'x', ownerId: 'other' },
      }),
    ).toBe('forbidden');
    expect(
      await screen('manager', {
        entity: 'leads',
        operation: 'create',
        input: { name: 'x', ownerId: 'other' },
      }),
    ).toBe('ok');
    expect(
      await screen('manager', {
        entity: 'leads',
        operation: 'update',
        recordId: theirs.id,
        input: { ownerId: 'rep' },
      }),
    ).toBe('ok');
    // An approval is raised on a deal you can edit; only its approver, a
    // manager other than the applicant, decides it, and only while pending.
    expect(
      await screen('rep', {
        entity: 'approvals',
        operation: 'create',
        input: { opportunityId: deal.id, topic: 'discount', name: 'x' },
      }),
    ).toBe('forbidden');
    const approval = await service.save(actor('other'), 'approvals', {
      name: 'Screen approval',
      opportunityId: deal.id,
      topic: 'discount',
      // No description: optional since the subject carries the request.
      approverId: 'manager',
    });
    expect(
      await screen('manager', {
        entity: 'approvals',
        operation: 'approve',
        recordId: approval.id,
      }),
    ).toBe('inapplicable');
    await service.approvalAction(actor('other'), approval.id, 'submit');
    expect(
      await screen('manager', {
        entity: 'approvals',
        operation: 'approve',
        recordId: approval.id,
      }),
    ).toBe('ok');
    expect(
      await screen('rep', {
        entity: 'approvals',
        operation: 'approve',
        recordId: approval.id,
      }),
    ).toBe('forbidden');
    expect(
      await screen('other', {
        entity: 'approvals',
        operation: 'withdraw',
        recordId: approval.id,
      }),
    ).toBe('ok');
    expect(
      await screen('rep', {
        entity: 'approvals',
        operation: 'withdraw',
        recordId: approval.id,
      }),
    ).toBe('forbidden');
    // A step on an existing record that names none is not offered.
    expect(
      await screen('rep', {
        entity: 'leads',
        operation: 'update',
        input: { phone: '1' },
      }),
    ).toBe('unanchored');
  });

  it('exposes one CRM role per user to the Users page and keeps the last administrator', async () => {
    const scope = createCrmUserRoleScope(authorization);
    const connection = database.connection();
    expect((await scope.options()).map((o) => o.value)).toEqual([
      'crm-sales-representative',
      'crm-sales-manager',
      'crm-system-administrator',
    ]);
    expect(await scope.get('rep', connection)).toBe('crm-sales-representative');
    expect(await scope.findUserIds('crm-sales-manager', connection)).toEqual([
      'manager',
    ]);
    // Promotion replaces the role instead of adding a second one.
    await scope.replace('other', 'crm-sales-manager', connection);
    expect(await scope.get('other', connection)).toBe('crm-sales-manager');
    await scope.replace('other', ['crm-sales-representative'], connection);
    expect(await scope.get('other', connection)).toBe(
      'crm-sales-representative',
    );
    await expect(
      scope.replace(
        'other',
        ['crm-sales-manager', 'crm-sales-representative'],
        connection,
      ),
    ).rejects.toMatchObject({ code: 'INVALID_ROLE_SCOPE_VALUE' });
    await expect(
      scope.replace('other', 'editor', connection),
    ).rejects.toMatchObject({ code: 'INVALID_ROLE_SCOPE_VALUE' });
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
  it('requires AI confirmation and applies the current user permissions on execution', async () => {
    const ai = new CrmAi(service, {} as AIManager);
    const lead = await service.save(actor('other'), 'leads', {
      name: 'Other user AI target',
    });
    await database
      .query()
      .insertInto('crmAiActions')
      .values({
        id: 'action-test',
        ownerId: 'rep',
        messageId: 'test',
        entity: 'leads',
        recordId: lead.id,
        operation: 'update',
        title: 'Unpermitted update',
        input: JSON.stringify({ name: 'Wrong' }),
        assumptions: '[]',
        status: 'pending',
        createdAt: new Date().toISOString(),
      })
      .execute();
    await expect(
      ai.execute(actor('rep'), 'action-test', false),
    ).rejects.toMatchObject({ code: 'confirmationRequired' });
    await expect(
      ai.execute(actor('rep'), 'action-test', true),
    ).rejects.toMatchObject({ code: 'notFound' });
    expect(
      (
        await database
          .query()
          .selectFrom('crmAiActions')
          .select('status')
          .where('id', '=', 'action-test')
          .executeTakeFirst()
      )?.status,
    ).toBe('pending');
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
    expect((await migrator.latest()).executed).toHaveLength(23);
    expect(await isolated.builder().hasCollection('crmLeads')).toBe(true);
    expect((await migrator.latest()).executed).toEqual([]);
    expect((await migrator.rollback()).rolledBack).toHaveLength(23);
    expect(await isolated.builder().hasCollection('crmLeads')).toBe(false);
    expect(await isolated.builder().hasCollection('crmAccounts')).toBe(false);
  } finally {
    await isolated.destroy();
  }
});
