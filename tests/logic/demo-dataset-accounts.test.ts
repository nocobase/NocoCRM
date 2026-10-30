// @vitest-environment node
import { register } from 'tsx/esm/api';
import { expect } from 'vitest';
import { createAppTest } from '@nocobase/app-testing/server';
import {
  DEFAULT_ADMIN_CREDENTIALS,
  signIn,
} from '@nocobase/app-plugin-authentication/testing';
import { authorizationToken } from '@nocobase/app-plugin-authorization/server';
import { demoDataToken } from '@nocobase/app-plugin-demo-mode/server/tokens';
import { createStandaloneServer } from '../../server/standalone.js';
import { existingCrmDemo } from '../../server/providers/crm/demo-presentation.js';

register();
// This username used to trigger the extra dataset-administrator path at boot.
const initialAdmin = { ...DEFAULT_ADMIN_CREDENTIALS, username: 'admin' };
const test = createAppTest({
  createServer: createStandaloneServer,
  connections: ['main'],
  config: {
    app: { publicOrigin: 'http://localhost' },
    auth: {
      secret: 'test-auth-secret-at-least-32-characters',
      trustedOrigins: ['http://localhost'],
    },
    users: { initialAdmin },
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

test('generates only sales accounts and keeps the importing administrator outside the dataset', async ({
  app,
  testApp,
  connection,
}) => {
  const dataset = existingCrmDemo(app);
  for (const language of ['zh-CN', 'en-US']) {
    const accounts = dataset.accounts(language);
    expect(accounts).toHaveLength(4);
    expect(accounts.some((account) => account.username === 'admin')).toBe(
      false,
    );
  }
  const root = await connection.query
    .selectFrom('user')
    .select(['id', 'username', 'name', 'email', 'disabledAt'])
    .where('username', '=', initialAdmin.username)
    .executeTakeFirstOrThrow();
  const credentials = () =>
    connection.query
      .selectFrom('account')
      .selectAll()
      .where('userId', '=', root.id)
      .execute();
  const beforeCredentials = await credentials();
  const admin = await signIn(testApp, initialAdmin);
  const demo = app.container.resolve(demoDataToken);
  await demo.importNow(String(root.id), 'zh-CN');
  expect((await demo.status()).state).toBe('ready');
  // The plugin's own summary, keyed as the settings page labels it.
  expect((await demo.status()).counts).toMatchObject({
    accounts: 4,
    crmLeads: 18,
    crmCompanies: 11,
    crmContacts: 22,
    crmOpportunities: 34,
    crmTasks: 117,
    crmApprovals: 6,
  });
  const users = await connection.query.selectFrom('user').selectAll().execute();
  expect(users).toHaveLength(5);
  expect(users.find((user) => user.id === root.id)).toMatchObject(root);
  expect(users.some((user) => user.email === 'admin@demo.example')).toBe(false);
  expect(await credentials()).toEqual(beforeCredentials);
  const assignments = await app.container
    .resolve(authorizationToken)
    .permissionSets.listAssignments();
  expect(
    assignments.filter((assignment) => assignment.permissionSet === 'root'),
  ).toMatchObject([{ subject: { type: 'user', id: root.id } }]);
  expect(
    await connection.query
      .selectFrom('crmOpportunities')
      .select('id')
      .where('ownerId', '=', root.id)
      .execute(),
  ).not.toHaveLength(0);
  await demo.clear(String(root.id));
  expect((await admin.fetch('/demoMode/data')).status).toBe(200);
  expect(await credentials()).toEqual(beforeCredentials);
  const remaining = await admin
    .fetch('/demoMode/accounts')
    .then((r) => r.json());
  expect(
    remaining.data.map((account: { username: string }) => account.username),
  ).toEqual([initialAdmin.username]);
}, 300_000);
