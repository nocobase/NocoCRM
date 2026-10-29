import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { performance } from 'node:perf_hooks';
import { createTestApp } from '@nocobase/app-testing/server';
import {
  signIn,
  DEFAULT_ADMIN_CREDENTIALS,
} from '@nocobase/app-plugin-authentication/testing';
import { demoDataToken } from '@nocobase/app-plugin-demo-mode/server/tokens';
import { createStandaloneServer } from '../../server/standalone.js';
import { existingCrmDemo } from '../../server/providers/crm/demo-presentation.js';
import {
  demoAccountsIn,
  demoPassword,
} from '../../server/providers/crm/demo.js';

assert.equal(
  process.version,
  'v24.22.1',
  'Resource baseline requires Node v24.22.1',
);
assert.ok(global.gc, 'Run with --expose-gc');
// Fictional CRM mail and Demo Mode models are the fixed external-service adapters.
// Any accidental HTTP request fails instead of contacting a real provider.
globalThis.fetch = async () => {
  throw new Error('External HTTP is forbidden in the resource fixture');
};
const mib = (bytes: number) => bytes / 1024 ** 2;
const results: Record<string, unknown>[] = [];
let phase = 'boot';
let peakHeap = 0;
let peakRss = 0;
let allHeap = 0;
let allRss = 0;
const phases: Record<
  string,
  { ms: number; peakHeapMiB: number; peakRssMiB: number }
> = {};
const sample = () => {
  const memory = process.memoryUsage();
  peakHeap = Math.max(peakHeap, memory.heapUsed);
  peakRss = Math.max(peakRss, memory.rss);
  allHeap = Math.max(allHeap, memory.heapUsed);
  allRss = Math.max(allRss, memory.rss);
  const current = (phases[phase] ??= { ms: 0, peakHeapMiB: 0, peakRssMiB: 0 });
  current.peakHeapMiB = Math.max(current.peakHeapMiB, mib(memory.heapUsed));
  current.peakRssMiB = Math.max(current.peakRssMiB, mib(memory.rss));
};
const sampler = setInterval(sample, 10);
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
// Decorate, never replace, the actual registered clear/generate callbacks.
const dataset = existingCrmDemo(app.application);
async function measured<T>(name: string, run: () => Promise<T>): Promise<T> {
  const previous = phase;
  phase = name;
  const start = performance.now();
  try {
    return await run();
  } finally {
    sample();
    phases[name].ms += performance.now() - start;
    phase = previous;
  }
}
let milestones: { fraction: number; elapsedMs: number; heapMiB: number }[] = [];
demo.register({
  ...dataset,
  clear: (context) => measured('clear', () => dataset.clear(context)),
  generate: (context) =>
    measured('generate', async () => {
      const start = performance.now();
      await dataset.generate!({
        ...context,
        progress: async (fraction) => {
          sample();
          milestones.push({
            fraction,
            elapsedMs: performance.now() - start,
            heapMiB: mib(process.memoryUsage().heapUsed),
          });
          await context.progress(fraction);
        },
      });
    }),
});
const countTables = [
  'crmLeads',
  'crmCompanies',
  'crmContacts',
  'crmOpportunities',
  'crmTasks',
  'crmApprovals',
  'crmHistory',
  'crmWaMessages',
  'agConversations',
  'agConversationMessages',
];
async function counts() {
  const result: Record<string, number> = {};
  for (const table of countTables)
    result[table] = (
      await query.selectFrom(table).select('id').execute()
    ).length;
  return result;
}
async function settleMail() {
  const deadline = performance.now() + 120_000;
  for (;;) {
    const runs = await query
      .selectFrom('mailSyncRuns')
      .select(['status'])
      .execute();
    assert.ok(
      !runs.some((r) => ['failed', 'partial'].includes(String(r.status))),
      JSON.stringify(runs),
    );
    if (
      runs.length >= 5 &&
      runs.every((r) => ['completed', 'cancelled'].includes(String(r.status)))
    )
      return;
    assert.ok(
      performance.now() < deadline,
      `Mail did not settle: ${JSON.stringify(runs)}`,
    );
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
}
async function retained() {
  await new Promise((resolve) => setTimeout(resolve, 100));
  global.gc!();
  global.gc!();
  return mib(process.memoryUsage().heapUsed);
}
try {
  const actor = await query
    .selectFrom('user')
    .select('id')
    .executeTakeFirstOrThrow();
  const admin = await signIn(app, DEFAULT_ADMIN_CREDENTIALS);
  await demo.importNow(String(actor.id), 'en-US');
  await settleMail();
  const seat = demoAccountsIn('en-US')[0];
  const sales = await signIn(app, {
    username: seat.username,
    password: demoPassword(seat.username),
  });
  const users = await query
    .selectFrom('user')
    .select(['id', 'username'])
    .orderBy('id', 'asc')
    .execute();
  const expected = await counts();
  assert.equal(expected.crmLeads, 18);
  assert.equal(expected.crmCompanies, 11);
  assert.equal(expected.crmContacts, 22);
  assert.equal(expected.crmOpportunities, 34);
  assert.equal(expected.crmApprovals, 6);
  assert.ok(expected.crmHistory > 0 && expected.agConversationMessages > 0);
  const mailRows = (
    await query.selectFrom('mailMessages').select('id').execute()
  ).length;
  assert.ok(mailRows > 0);
  await demo.reset(String(actor.id), 'en-US', { wait: true }); // warm-up
  await settleMail();
  const initialRetainedMiB = await retained();
  for (let round = 1; round <= 5; round++) {
    const oldMail = await query
      .selectFrom('mailAccounts')
      .select('id')
      .execute();
    const oldLeads = await query.selectFrom('crmLeads').select('id').execute();
    peakHeap = 0;
    peakRss = 0;
    for (const key of Object.keys(phases)) delete phases[key];
    phase = 'reset';
    milestones = [];
    const start = performance.now();
    await demo.reset(String(actor.id), 'en-US', { wait: true });
    await settleMail();
    const elapsedMs = performance.now() - start;
    sample();
    assert.equal((await demo.status()).state, 'ready');
    assert.deepEqual(await counts(), expected);
    assert.deepEqual(
      await query
        .selectFrom('user')
        .select(['id', 'username'])
        .orderBy('id', 'asc')
        .execute(),
      users,
    );
    const mail = await query
      .selectFrom('mailAccounts')
      .select(['id', 'address', 'status'])
      .execute();
    assert.equal(mail.length, 5);
    assert.equal(new Set(mail.map((a) => a.address)).size, 5);
    assert.ok(
      mail.every(
        (a) => a.status === 'active' && !oldMail.some((b) => b.id === a.id),
      ),
    );
    assert.equal(
      (await query.selectFrom('mailMessages').select('id').execute()).length,
      mailRows,
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
    assert.equal(
      (
        await query
          .selectFrom('crmLeads')
          .select('id')
          .where(
            'id',
            'in',
            oldLeads.map((r) => r.id),
          )
          .execute()
      ).length,
      0,
    );
    assert.equal((await admin.fetch('/demoMode/data')).status, 200);
    assert.equal((await sales.fetch('/leads')).status, 200);
    const retainedHeapMiB = await retained(); // only after the measured active interval
    const row = {
      round,
      elapsedMs,
      peakHeapMiB: mib(peakHeap),
      peakRssMiB: mib(peakRss),
      retainedHeapMiB,
      phases: structuredClone(phases),
      milestones,
    };
    results.push(row);
    console.log(JSON.stringify(row));
    assert.ok(elapsedMs < 180_000, 'Reset time budget exceeded');
    assert.ok(peakHeap < 768 * 1024 ** 2, 'Heap budget exceeded');
    assert.ok(peakRss < 1200 * 1024 ** 2, 'RSS budget exceeded');
    assert.ok(
      retainedHeapMiB < 384 && retainedHeapMiB - initialRetainedMiB < 64,
      'Retained heap budget exceeded',
    );
  }
  await demo.clear(String(actor.id));
  assert.ok(Object.values(await counts()).every((n) => n === 0));
  assert.equal(
    (await query.selectFrom('mailAccounts').select('id').execute()).length,
    0,
  );
  assert.equal((await admin.fetch('/demoMode/data')).status, 200);
  assert.ok(allHeap < 768 * 1024 ** 2, 'Whole-process heap budget exceeded');
  assert.ok(allRss < 1200 * 1024 ** 2, 'Whole-process RSS budget exceeded');
  assert.ok(
    process.resourceUsage().maxRSS < 1200 * 1024,
    'OS RSS budget exceeded',
  );
  const report = {
    node: process.version,
    initialRetainedMiB,
    counts: expected,
    mailRows,
    rounds: results,
    allPeakHeapMiB: mib(allHeap),
    allPeakRssMiB: mib(allRss),
    osMaxRssKiB: process.resourceUsage().maxRSS,
  };
  writeFileSync(process.argv[2], JSON.stringify(report, null, 2) + '\n');
} finally {
  clearInterval(sampler);
  await app.close();
}
