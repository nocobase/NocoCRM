// @vitest-environment node
import { register } from 'tsx/esm/api';
import { afterEach, expect, vi } from 'vitest';
import { createAppTest } from '@nocobase/app-testing/server';
import { mailServiceToken } from '@nocobase/app-plugin-mail/server';
import { driveManagerToken } from '@nocobase/app-server/drive';
import { createStandaloneServer } from '../../server/standalone.js';
import { clearDemoBusiness } from '../../server/providers/crm/demo-lifecycle.js';
import { DEMO_MAIL_SECRET } from '../../server/providers/crm/demo-mail.js';

register();
const test = createAppTest({
  createServer: createStandaloneServer,
  connections: ['main'],
  config: {
    app: { publicOrigin: 'http://localhost' },
    auth: { secret: 'test-auth-secret-at-least-32-characters' },
    secrets: { keys: [{ version: 1, key: 'a'.repeat(64) }] },
    ai: { llmServices: {} },
  },
});
afterEach(() => vi.restoreAllMocks());

test('real cleanup waits for Mail deletion, permits the same address and is repeatable', async ({
  app,
  connection,
}) => {
  const mail = app.container.resolve(mailServiceToken);
  const owner = await connection.query
    .selectFrom('user')
    .select('id')
    .executeTakeFirstOrThrow();
  const context = { actorId: String(owner.id) };
  const input = {
    provider: { type: 'crm-demo', name: 'crm-demo' },
    address: 'cleanup@demo.example',
    username: 'cleanup@demo.example',
    password: DEMO_MAIL_SECRET,
    initialSyncReceivedAfter: '2026-04-01T00:00:00Z',
  };
  const first = await mail.connectAccount(context, input);
  const getConfig = app.config.get.bind(app.config);
  const configRead = vi
    .spyOn(app.config, 'get')
    .mockImplementation((key) =>
      key === 'mail'
        ? { providers: { 'crm-demo': { enabled: false } } }
        : getConfig(key),
    );
  await clearDemoBusiness(app);
  configRead.mockRestore();
  expect(await mail.listAccounts(context)).toEqual([]);
  const second = await mail.connectAccount(context, input);
  expect(second.id).not.toBe(first.id);
  await clearDemoBusiness(app);
  await clearDemoBusiness(app);
  expect(await mail.listAccounts(context)).toEqual([]);
}, 60_000);

test('failure and stalled workers prevent business deletion; an in-flight retry is not resubmitted', async ({
  app,
  connection,
}) => {
  const mail = app.container.resolve(mailServiceToken);
  const owner = await connection.query
    .selectFrom('user')
    .select('id')
    .executeTakeFirstOrThrow();
  const context = { actorId: String(owner.id) };
  const account = await mail.connectAccount(context, {
    provider: { type: 'crm-demo', name: 'crm-demo' },
    address: 'failure@demo.example',
    password: DEMO_MAIL_SECRET,
    initialSyncReceivedAfter: '2026-04-01T00:00:00Z',
  });
  await connection.query
    .insertInto('crmSettings')
    .values({ id: 'demo-mail', value: '{}', updatedAt: new Date() })
    .execute();
  // Fault injection at Mail's public boundary; the application cleanup is real.
  const remove = vi
    .spyOn(mail, 'removeAccount')
    .mockResolvedValue({ ...account, status: 'removing' });
  const list = vi
    .spyOn(mail, 'listAccounts')
    .mockResolvedValue([
      { ...account, status: 'removing', removalFailed: true },
    ]);
  await expect(clearDemoBusiness(app)).rejects.toThrow('removalFailed');
  expect(
    await connection.query
      .selectFrom('crmSettings')
      .select('id')
      .where('id', '=', 'demo-mail')
      .execute(),
  ).toHaveLength(1);
  list.mockResolvedValue([{ ...account, status: 'removing' }]);
  let clock = 0;
  vi.spyOn(performance, 'now').mockImplementation(() => (clock += 180_001));
  await expect(clearDemoBusiness(app)).rejects.toThrow('timed out');
  vi.restoreAllMocks();
  // A real already-submitted removal must remain owned by Mail.
  await mail.removeAccount(context, account.id);
  const retry = vi.spyOn(mail, 'removeAccount');
  await clearDemoBusiness(app);
  expect(retry).not.toHaveBeenCalled();
  expect(remove).toHaveBeenCalledTimes(2);
}, 60_000);

test('clears more than one batch of visitor files and chats without skipping rows', async ({
  app,
  connection,
}) => {
  const query = connection.query;
  const owner = await query
    .selectFrom('user')
    .select('id')
    .executeTakeFirstOrThrow();
  const disk = app.container.resolve(driveManagerToken).use('local');
  for (let i = 0; i < 205; i++) {
    const id = `cleanup-${i}`;
    await disk.put(id, Buffer.from('fixture'));
    await query
      .insertInto('crmFiles')
      .values({
        id,
        filename: id,
        disk: 'local',
        key: id,
        mimeType: 'text/plain',
        size: 7,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .execute();
    await query
      .insertInto('crmFileUploads')
      .values({ id, ownerId: String(owner.id) })
      .execute();
    await query
      .insertInto('agConversations')
      .values({
        id,
        userId: String(owner.id),
        agentId: '0',
        source: i % 2 ? 'crm' : 'crm-search',
        title: id,
        titleSource: 'user',
        mode: 'online',
        category: 'chat',
        showInChatList: true,
        read: true,
        thread: 0,
        syncSeq: 0,
        lastSeq: 0,
        lastMessageAt: new Date(),
        modelService: 'demo',
        model: 'demo',
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .execute();
  }
  const deletion = vi
    .spyOn(disk, 'delete')
    .mockRejectedValueOnce(new Error('temporary storage failure'));
  await expect(clearDemoBusiness(app)).rejects.toThrow(
    'temporary storage failure',
  );
  expect(
    await query.selectFrom('crmFiles').select('id').execute(),
  ).toHaveLength(205);
  deletion.mockRestore();
  await clearDemoBusiness(app);
  for (const table of ['crmFiles', 'crmFileUploads', 'agConversations'])
    expect(await query.selectFrom(table).select('id').execute()).toEqual([]);
  expect(await disk.exists('cleanup-0')).toBe(false);
  expect(await disk.exists('cleanup-204')).toBe(false);
});
