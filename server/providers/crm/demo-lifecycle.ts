import type { Application } from '@nocobase/app-server/application';
import { driveManagerToken } from '@nocobase/app-server/drive';
import type { DemoImportContext } from '@nocobase/app-plugin-demo-mode/server/tokens';
import { authorizationToken } from '@nocobase/app-plugin-authorization/server';
import { demoServices } from '../../routes/demo-services.js';
import { crmToken } from './index.js';
import { crmActor, roleKey } from './authorization.js';
import {
  demoAccountsIn,
  demoPassword,
  populateDemo,
  DEMO_MARKER,
} from './demo.js';
import { DEMO_MAIL_ROW, setDemoMailLanguage } from './demo-mail.js';
import { whatsappToken } from './whatsapp/service.js';

export async function generateDemo(
  app: Application,
  context: DemoImportContext,
  adminName?: string,
): Promise<void> {
  const crm = app.container.resolve(crmToken);
  const authz = app.container.resolve(authorizationToken);
  const language = context.language === 'en-US' ? 'en-US' : 'zh-CN';
  const services = demoServices(app);
  // Create/reuse identities through the plugin before invoking the shared story.
  // It owns tracking and session preservation across reset.
  for (const account of demoAccountsIn(language)) {
    await context.createAccount({
      username: account.username,
      name: account.name,
      email: `${account.username}@demo.example`,
      password: demoPassword(account.username),
      roleScopes: { app: [roleKey(account.role)] },
    });
  }
  let ownerId = context.actorId;
  if (adminName) {
    ownerId = await context.createAccount({
      username: 'admin',
      name: adminName,
      email: 'admin@demo.example',
      password: 'Demo@2026',
      roleScopes: { app: ['root'] },
    });
  }
  await context.progress(0.05);
  await populateDemo(
    crm,
    authz,
    crmActor(authz, { id: ownerId, locale: language }),
    services.demoAccounts,
    language,
    services.demoMailboxes,
    services.demoChats,
    app.container.resolve(whatsappToken),
    {
      identitiesPrepared: true,
      strict: true,
      progress: (fraction) => context.progress(0.05 + fraction * 0.9),
    },
  );
  const query = crm.database.query();
  const marker = await query
    .selectFrom('crmSettings')
    .select('value')
    .where('id', '=', DEMO_MARKER)
    .executeTakeFirst();
  if (marker)
    await context.setData({ manifest: JSON.parse(String(marker.value)) });
  for (const table of [
    'crmLeads',
    'crmCompanies',
    'crmContacts',
    'crmOpportunities',
    'crmTasks',
    'crmApprovals',
  ]) {
    const rows = await query.selectFrom(table).select('id').execute();
    await context.track(
      table,
      rows.map((row) => String(row.id)),
    );
  }
  await context.progress(1);
}

/** Full, retry-safe business cleanup, including partial imports and visitor rows. */
export async function clearDemoBusiness(app: Application): Promise<void> {
  const crm = app.container.resolve(crmToken);
  const query = crm.database.query();
  const { demoMailboxes, demoChats, demoInbox } = demoServices(app);
  if (demoMailboxes) {
    const accounts = await query
      .selectFrom('mailAccounts')
      .select(['id', 'userId'])
      .where('providerType', '=', 'crm-demo')
      .execute();
    for (const account of accounts)
      await demoMailboxes.remove(String(account.userId), String(account.id));
    // Mail removes its messages asynchronously. Wait before reconnecting the same
    // fictional addresses, otherwise generation can silently lose a mailbox.
    const deadline = Date.now() + 180_000;
    while (
      accounts.length &&
      (
        await query
          .selectFrom('mailAccounts')
          .select('id')
          .where(
            'id',
            'in',
            accounts.map((account) => String(account.id)),
          )
          .execute()
      ).length
    ) {
      if (Date.now() > deadline)
        throw new Error('Demo mailbox cleanup did not complete.');
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }
  if (demoChats) {
    const chats = await query
      .selectFrom('agConversations')
      .select('id')
      .where('source', 'in', ['crm', 'crm-search'])
      .execute();
    await demoChats.remove(chats.map((row) => String(row.id)));
  }
  const files = await query
    .selectFrom('crmFiles')
    .select(['id', 'disk', 'key'])
    .execute();
  for (const file of files) {
    await app.container
      .resolve(driveManagerToken)
      .use(String(file.disk))
      .delete(String(file.key));
    await query
      .deleteFrom('crmFileUploads')
      .where('id', '=', file.id)
      .execute();
    await query.deleteFrom('crmFiles').where('id', '=', file.id).execute();
  }
  await crm.database.transaction(async ({ query: q }) => {
    for (const table of [
      'crmPlanRows',
      'crmPlans',
      'crmAiWatches',
      'crmOutbox',
      'crmHistory',
      'crmSignals',
      'crmSignalChecks',
      'crmWaInbox',
      'crmWaMessages',
      'crmWaConversations',
      'crmWaIdentities',
      'crmWaContacts',
      'crmTasks',
      'crmApprovals',
      'crmOpportunities',
      'crmContacts',
      'crmLeads',
      'crmCompanies',
      'lifecycleParameterUsages',
      'lifecycleParameterSnapshots',
    ])
      await q.deleteFrom(table).allowAllRows().execute();
    for (const table of ['lifecycleEffectRuns', 'lifecycleTransitions'])
      await q.deleteFrom(table).where('lifecycle', '=', 'approvals').execute();
    await q.deleteFrom('crmWaNumbers').where('mode', '=', 'demo').execute();
    await q
      .deleteFrom('crmSettings')
      .where('id', 'in', [DEMO_MAIL_ROW, DEMO_MARKER, 'file-sweep'])
      .execute();
  });
  await demoInbox?.removeOrphans();
  setDemoMailLanguage(undefined);
}
