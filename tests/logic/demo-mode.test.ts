// @vitest-environment node
import { register } from 'tsx/esm/api';
import { expect } from 'vitest';
import { createAppTest } from '@nocobase/app-testing/server';
import {
  DEFAULT_ADMIN_CREDENTIALS,
  signIn,
} from '@nocobase/app-plugin-authentication/testing';
import { createStandaloneServer } from '../../server/standalone.js';

register();
const test = createAppTest({
  createServer: createStandaloneServer,
  connections: ['main'],
  config: {
    app: { publicOrigin: 'http://localhost' },
    auth: {
      secret: 'test-auth-secret-at-least-32-characters',
      trustedOrigins: ['http://localhost'],
    },
    users: { initialAdmin: DEFAULT_ADMIN_CREDENTIALS },
    demoMode: { enabled: true },
    secrets: { keys: [{ version: 1, key: 'a'.repeat(64) }] },
    notification: {
      channels: {
        'system-email': {
          type: 'smtp',
          host: 'localhost',
          port: 465,
          secure: true,
          auth: { user: 'test@example.test', pass: 'test-password' },
          from: 'test@example.test',
        },
      },
    },
  },
});

test('demo keeps reads available and refuses mutations even for root', async ({
  testApp,
  request,
  connection,
}) => {
  expect((await request('/demoMode/status')).status).toBe(200);
  expect((await request('/leads')).status).toBe(401);
  const admin = await signIn(testApp, DEFAULT_ADMIN_CREDENTIALS);
  const document = await admin.fetch('/swagger');
  expect(document.status).toBe(200);
  // beta.1 enables integrated demo chat by default; CRM still refuses mutations.
  const policy = await admin.fetch('/demoMode/configuration');
  expect(policy.status).toBe(200);
  expect(await policy.json()).toMatchObject({
    data: { collections: [], chat: { enabled: true } },
  });
  const dataset = await admin
    .fetch('/demoMode/data')
    .then((response) => response.json());
  expect(dataset).toMatchObject({
    data: { available: true, datasetId: 'crm', present: false },
  });
  // Registration describes the existing dataset, without creating identities or records.
  expect(
    await request('/demoMode/accounts').then((response) => response.json()),
  ).toEqual({ data: [] });
  const beforeUsers = await connection.query
    .selectFrom('user')
    .select('id')
    .execute();
  for (const path of [
    '/workspace',
    '/leads',
    '/companies',
    '/contacts',
    '/opportunities',
    '/tasks',
    '/approvals',
    '/systemSettings',
    '/demoData',
    '/users',
    '/dashboard',
    '/decisions',
    '/decisions/count',
    '/aiAgents/running',
    '/approvalLifecycle',
    '/approverRule',
    '/notificationInApp/messages',
    '/notificationInApp/messages/unreadCount',
    '/scheduler/schedules',
    '/authorization/permissionSets',
    '/mail/providers',
    '/mail/accounts',
    '/mail/messages',
    '/mail/labels',
    '/agents',
    '/agents/conversations',
    '/agents/chatAgents',
    '/agents/chatPreferences',
    '/agents/chatSettings',
    '/agents/models',
    '/agents/services',
    '/agents/availableModels',
    '/agents/skills',
    '/agents/usage',
    '/demoMode/configuration',
    '/demoMode/data',
  ]) {
    const response = await admin.fetch(path);
    expect(response.status, `${path}: ${await response.text()}`).toBe(200);
  }
  for (const [method, path, json] of [
    [
      'POST',
      '/users',
      {
        name: 'Demo write test',
        email: 'blocked@example.test',
        password: 'test-password-123',
        roleScopes: { app: ['crm-sales-representative'] },
      },
    ],
    ['PATCH', '/leads/missing', { name: 'Must not change' }],
    ['DELETE', '/leads/missing', {}],
    ['POST', '/leads', { name: 'Must not be saved' }],
    ['PUT', '/systemSettings', { currency: 'USD' }],
    ['POST', '/demoData/import', {}],
    ['POST', '/demoData/remove', {}],
    ['POST', '/attachments/upload', {}],
    ['POST', '/mail/accounts', {}],
    ['POST', '/agents/conversations', {}],
  ] as const) {
    const response = await admin.fetch(path, {
      method,
      headers: {
        'content-type': 'application/json',
        origin: 'http://localhost',
      },
      body: JSON.stringify(json),
    });
    expect({ path, status: response.status }).toEqual({ path, status: 400 });
    expect(response.headers.get('server-timing')).toContain('demo-read-only');
    expect(await response.json()).toMatchObject({
      error: { reason: 'DEMO_READ_ONLY' },
    });
  }
  // Plugin management retains its authorization and optimistic revision checks.
  expect(
    (await request('/demoMode/data/reset', { method: 'POST' })).status,
  ).toBe(401);
  const current = await admin
    .fetch('/demoMode/configuration')
    .then((r) => r.json());
  const saved = await admin.fetch('/demoMode/configuration/schedule', {
    method: 'PUT',
    headers: { 'content-type': 'application/json', origin: 'http://localhost' },
    body: JSON.stringify({
      expectedRevision: current.data.revision,
      value: { ...current.data.schedule, enabled: false },
    }),
  });
  expect({ status: saved.status, body: await saved.text() }).toMatchObject({
    status: 200,
  });
  expect(
    await connection.query.selectFrom('user').select('id').execute(),
  ).toEqual(beforeUsers);
  expect(
    await connection.query
      .selectFrom('crmUserPreferences')
      .select('id')
      .execute(),
  ).toEqual([]);
});

test('failed reset preserves the executing demo administrator and can retry with the recorded actor', async ({
  app,
  testApp,
  connection,
}) => {
  const { demoDataToken } =
    await import('@nocobase/app-plugin-demo-mode/server/tokens');
  const { authorizationToken } =
    await import('@nocobase/app-plugin-authorization/server');
  const { clearDemoBusiness } =
    await import('../../server/providers/crm/demo-lifecycle.js');
  const demo = app.container.resolve(demoDataToken);
  const authz = app.container.resolve(authorizationToken);
  const root = await connection.query
    .selectFrom('user')
    .select('id')
    .executeTakeFirstOrThrow();
  let fail = false;
  let actorId = '';
  let visitorId = '';
  let executingActor = '';
  demo.register({
    id: 'crm',
    languages: ['zh-CN'],
    accounts: () => [],
    clear: () => clearDemoBusiness(app),
    generate: async (context) => {
      executingActor = context.actorId;
      await context.createPermissionSet({
        key: 'crm-demo-test-administrator',
        title: 'Demo test administrator',
        grants: [
          authz.settings.grant('crm', ['manage']),
          authz.settings.grant('demoMode.data', ['read', 'manage']),
          authz.settings.grant('demoMode.configuration', ['read', 'configure']),
        ],
      });
      actorId = await context.createAccount({
        username: 'demolifecycleadmin',
        name: 'Demo lifecycle administrator',
        email: 'demo-lifecycle-admin@example.test',
        password: 'DemoLifecycle123',
        roleScopes: { app: ['crm-sales-manager'] },
        permissionSets: ['crm-demo-test-administrator'],
      });
      visitorId = await context.createAccount({
        username: 'demolifecyclesales',
        name: 'Demo lifecycle salesperson',
        email: 'demo-lifecycle-sales@example.test',
        password: 'DemoLifecycle123',
        roleScopes: { app: ['crm-sales-representative'] },
      });
      if (fail) throw new Error('Intentional local generator failure');
    },
  });
  await demo.importNow(String(root.id), 'zh-CN');
  const admin = await signIn(testApp, {
    username: 'demolifecycleadmin',
    password: 'DemoLifecycle123',
  });
  const grants = async () =>
    (await authz.permissionSets.listAssignments())
      .filter((a) => a.subject.type === 'user' && a.subject.id === actorId)
      .map((a) => a.permissionSet)
      .sort();
  const before = await grants();
  fail = true;
  await expect(demo.reset(actorId, 'zh-CN', { wait: true })).rejects.toThrow(
    'Intentional local generator failure',
  );
  await demo.whenIdle();
  expect((await demo.status()).state).toBe('failed');
  expect((await admin.fetch('/demoMode/data')).status).toBe(200);
  expect((await admin.fetch('/demoMode/configuration')).status).toBe(200);
  expect(await grants()).toEqual(before);
  expect(
    await connection.query
      .selectFrom('user')
      .select('disabledAt')
      .where('id', '=', actorId)
      .executeTakeFirst(),
  ).toMatchObject({ disabledAt: null });
  expect(
    (
      await connection.query
        .selectFrom('user')
        .select('disabledAt')
        .where('id', '=', visitorId)
        .executeTakeFirst()
    )?.disabledAt,
  ).not.toBeNull();
  fail = false;
  await demo.reset(undefined, undefined, { wait: true });
  expect(executingActor).toBe(actorId);
  expect((await demo.status()).state).toBe('ready');
  expect((await admin.fetch('/demoMode/data')).status).toBe(200);
});
