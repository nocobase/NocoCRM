import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { performance } from 'node:perf_hooks';
import { createTestApp } from '@nocobase/app-testing/server';
import {
  DEFAULT_ADMIN_CREDENTIALS,
  signIn,
} from '@nocobase/app-plugin-authentication/testing';
import { demoDataToken } from '@nocobase/app-plugin-demo-mode/server/tokens';
import { createStandaloneServer } from '../../server/standalone.js';
import { existingCrmDemo } from '../../server/providers/crm/demo-presentation.js';
import {
  demoAccountsIn,
  demoPassword,
} from '../../server/providers/crm/demo.js';
import { startPeakObservation } from './peak-observer.js';

assert.equal(process.version, 'v24.22.1');
assert.equal(process.env.CRM_RESET_PROFILE, '1', 'Diagnostic only');
assert.equal(
  global.gc,
  undefined,
  'This diagnostic must not expose or force GC',
);
globalThis.fetch = async () => {
  throw new Error('External HTTP is forbidden');
};
const app = await createTestApp({
  createServer: createStandaloneServer,
  connections: ['main'],
  env: { NOCOBASE_TEST_DB_DIALECT: 'sqlite' },
  config: {
    app: { publicOrigin: 'http://localhost' },
    auth: {
      secret: 'resource-test-secret-at-least-32-characters',
      trustedOrigins: ['http://localhost'],
    },
    users: { initialAdmin: DEFAULT_ADMIN_CREDENTIALS },
    demoMode: { enabled: true, dailyReset: { enabled: false } },
    secrets: { keys: [{ version: 1, key: 'a'.repeat(64) }] },
    ai: { llmServices: {} },
  },
});
const query = app.connection.query;
const demo = app.application.container.resolve(demoDataToken);
const expected = {
  crmLeads: 18,
  crmCompanies: 11,
  crmContacts: 22,
  crmOpportunities: 34,
  crmTasks: 117,
  crmApprovals: 6,
  crmHistory: 593,
  crmWaMessages: 222,
  agConversations: 4,
  agConversationMessages: 10,
  mailMessages: 162,
};
async function counts() {
  const result: Record<string, number> = {};
  for (const table of Object.keys(expected))
    result[table] = (
      await query.selectFrom(table).select('id').execute()
    ).length;
  return result;
}
async function settleMail() {
  const deadline = performance.now() + 120_000;
  for (;;) {
    const rows = await query
      .selectFrom('mailSyncRuns')
      .select('status')
      .execute();
    assert.ok(
      !rows.some((r) => ['failed', 'partial'].includes(String(r.status))),
    );
    if (
      rows.length >= 5 &&
      rows.every((r) => ['completed', 'cancelled'].includes(String(r.status)))
    )
      return;
    assert.ok(performance.now() < deadline, 'Mail convergence timed out');
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
}
try {
  const actor = await query
    .selectFrom('user')
    .select('id')
    .executeTakeFirstOrThrow();
  const admin = await signIn(app, DEFAULT_ADMIN_CREDENTIALS);
  await demo.importNow(String(actor.id), 'en-US'); // Full story precondition; no warm-up reset.
  await settleMail();
  assert.deepEqual(await counts(), expected);
  const users = await query
    .selectFrom('user')
    .select(['id', 'username'])
    .orderBy('id')
    .execute();
  const oldMail = await query.selectFrom('mailAccounts').select('id').execute();
  const seat = demoAccountsIn('en-US')[0];
  const sales = await signIn(app, {
    username: seat.username,
    password: demoPassword(seat.username),
  });
  const observation = await startPeakObservation(process.argv[2]);
  const dataset = existingCrmDemo(app.application);
  const captured = new Set<string>();
  demo.register({
    ...dataset,
    clear: async (context) => {
      observation.phase('clear');
      await dataset.clear(context);
      observation.checkpoint('clear-end');
      observation.phase('reset-between-clear-generate');
    },
    generate: async (context) => {
      observation.phase('generate');
      await dataset.generate!({
        ...context,
        progress: async (fraction) => {
          observation.progress(fraction);
          const label =
            Math.abs(fraction - 0.365) < 1e-6
              ? 'generate-35'
              : Math.abs(fraction - 0.635) < 1e-6
                ? 'generate-65'
                : undefined;
          if (label && !captured.has(label)) {
            captured.add(label);
            observation.checkpoint(label);
          }
          await context.progress(fraction);
        },
      });
      observation.checkpoint('generate-end');
      observation.phase('reset-after-generate');
    },
  });
  try {
    observation.checkpoint('reset-start');
    await demo.reset(String(actor.id), 'en-US', { wait: true }); // Exactly one reset.
    observation.phase('settleMail');
    observation.checkpoint('settle-start');
    await settleMail();
    observation.checkpoint('settle-end');
  } finally {
    await observation.stop();
  }
  assert.deepEqual(await counts(), expected);
  assert.deepEqual(
    await query
      .selectFrom('user')
      .select(['id', 'username'])
      .orderBy('id')
      .execute(),
    users,
  );
  const mail = await query
    .selectFrom('mailAccounts')
    .select(['id', 'address', 'status'])
    .execute();
  assert.equal(mail.length, 5);
  assert.equal(new Set(mail.map((r) => r.address)).size, 5);
  assert.ok(
    mail.every(
      (r) => r.status === 'active' && !oldMail.some((old) => old.id === r.id),
    ),
  );
  assert.equal(
    (
      await query
        .selectFrom('mailAccountRemovals')
        .select('accountId')
        .execute()
    ).length,
    0,
  );
  assert.equal((await admin.fetch('/demoMode/data')).status, 200);
  assert.equal((await sales.fetch('/leads')).status, 200);
  writeFileSync(
    `${process.argv[2]}/integrity.json`,
    JSON.stringify(
      { counts: expected, measuredResets: 1, warmupResets: 0, passed: true },
      null,
      2,
    ) + '\n',
  );
} finally {
  await app.close(); // No extra final clear; launcher disposes temporary DB/storage.
}
