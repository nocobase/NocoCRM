import { randomUUID } from 'node:crypto';
import type { Application } from '@nocobase/app-server/application';
import { agentsToken } from '@nocobase/app-plugin-agents/server/tokens';
import { mailServiceToken } from '@nocobase/app-plugin-mail/server';
import { inAppNotificationStoreToken } from '@nocobase/app-plugin-notification-in-app/server';
import { userManagementServiceToken } from '@nocobase/app-plugin-users/server/tokens';
import type {
  DemoAccountCreator,
  DemoChats,
  DemoInbox,
  DemoMailboxes,
} from '../providers/crm/demo.js';
import { crmToken } from '../providers/crm/index.js';
import {
  ASSISTANT_SCOPE,
  assistantActor,
} from '../providers/crm-agents/assistant.js';
import { jsonValue } from '../providers/crm/values.js';
import {
  DEMO_MAIL_NAME,
  DEMO_MAIL_SECRET,
  DEMO_MAIL_TYPE,
} from '../providers/crm/demo-mail.js';
import { CrmError, toText } from '../providers/crm/schema.js';

// What the demo dataset's import and removal do through other plugins: its
// accounts through the users plugin, its mailboxes through the Mail plugin,
// the importer's conversations through the Agents plugin, and the
// notifications about its records through the in-app notification plugin.
// The CRM's table for each kind a notification's route names; companies
// were accounts until 202610100001_crm_companies, ids unchanged.
const RECORD_TABLES: Record<string, string> = {
  leads: 'crmLeads',
  opportunities: 'crmOpportunities',
  companies: 'crmCompanies',
  accounts: 'crmCompanies',
  contacts: 'crmContacts',
  tasks: 'crmTasks',
  approvals: 'crmApprovals',
};

export function demoServices(app: Application): {
  demoAccounts: DemoAccountCreator;
  demoMailboxes: DemoMailboxes | undefined;
  demoChats: DemoChats | undefined;
  demoInbox: DemoInbox | undefined;
} {
  // The demo dataset's mailboxes, through the Mail plugin's service as the
  // user each belongs to (demo-mail.ts); none without the plugin.
  // A deployment that switched the demo provider off (enabled: false under
  // mail.providers) gets demo data without mail, as without the plugin.
  const demoProvider = app.config?.get<{
    providers?: Record<string, { enabled?: boolean }>;
  }>('mail')?.providers?.[DEMO_MAIL_NAME];
  const demoMailboxes: DemoMailboxes | undefined =
    app.container.has(mailServiceToken) && demoProvider?.enabled !== false
      ? {
          async connect(userId, mailbox) {
            const connect = () =>
              app.container.resolve(mailServiceToken).connectAccount(
                { actorId: userId },
                {
                  provider: { type: DEMO_MAIL_TYPE, name: DEMO_MAIL_NAME },
                  address: mailbox.address,
                  displayName: mailbox.name,
                  username: mailbox.address,
                  password: DEMO_MAIL_SECRET,
                  // Everything the import wrote: it is all from the last weeks.
                  initialSyncReceivedAfter: new Date(
                    Date.now() - 181 * 86_400_000,
                  ).toISOString(),
                },
              );
            // The plugin removes a mailbox in the background: an import
            // right after a removal waits for the old one to go, half a
            // minute at most.
            for (let attempt = 0; ; attempt += 1)
              try {
                return (await connect()).id;
              } catch (error) {
                const removing =
                  error instanceof Error && /remov/iu.test(error.message);
                if (!removing || attempt >= 15) throw error;
                await new Promise((resolve) => setTimeout(resolve, 2000));
              }
          },
          async remove(userId, accountId) {
            await app.container
              .resolve(mailServiceToken)
              .removeAccount({ actorId: userId }, accountId);
          },
        }
      : undefined;
  // The demo dataset creates its own accounts through the users plugin, so
  // they appear on the Users page like any account an administrator adds.
  const demoAccounts: DemoAccountCreator = {
    async create(input) {
      if (!app.container.has(userManagementServiceToken))
        throw new CrmError('demoAccounts', 500);
      try {
        const created = await app.container
          .resolve(userManagementServiceToken)
          .create({
            name: input.name,
            username: input.username,
            email: input.email,
            password: input.password,
            // The CRM's role scope is a multiple selection: the plugin
            // refuses a single value even for one role.
            roleScopes: { app: [input.role] },
          });
        return { id: created.id };
      } catch (error) {
        // The users plugin explains its refusal (a password rule, a taken
        // email); the notice shows that text under the CRM's own message.
        throw new CrmError(
          'demoAccounts',
          500,
          undefined,
          error instanceof Error ? error.message : undefined,
        );
      }
    },
    async resetPassword(id, password) {
      if (!app.container.has(userManagementServiceToken))
        throw new CrmError('demoAccounts', 500);
      try {
        await app.container
          .resolve(userManagementServiceToken)
          .resetPassword(id, password);
      } catch (error) {
        throw new CrmError(
          'demoAccounts',
          500,
          undefined,
          error instanceof Error ? error.message : toText(error),
        );
      }
    },
    async enable(id) {
      if (!app.container.has(userManagementServiceToken))
        throw new CrmError('demoAccounts', 500);
      try {
        await app.container.resolve(userManagementServiceToken).enable(id);
      } catch (error) {
        throw new CrmError(
          'demoAccounts',
          500,
          undefined,
          error instanceof Error ? error.message : toText(error),
        );
      }
    },
    async disable(id) {
      if (!app.container.has(userManagementServiceToken))
        throw new CrmError('demoAccounts', 500);
      try {
        await app.container.resolve(userManagementServiceToken).disable(id);
      } catch (error) {
        throw new CrmError(
          'demoAccounts',
          500,
          undefined,
          error instanceof Error ? error.message : toText(error),
        );
      }
    },
    async rename(id, name) {
      if (!app.container.has(userManagementServiceToken))
        throw new CrmError('demoAccounts', 500);
      try {
        await app.container
          .resolve(userManagementServiceToken)
          .update(id, { name });
      } catch (error) {
        throw new CrmError(
          'demoAccounts',
          500,
          undefined,
          error instanceof Error ? error.message : toText(error),
        );
      }
    },
  };
  // The importer's finished conversations with the CRM's assistant
  // (crm-agents/assistant.ts): the plugin makes the conversation, a native
  // chat of the assistant's scope, and the messages are written into its
  // table as its store writes them, since a conversation can only grow by
  // the model answering and the demo runs no model.
  // @temporary(nocobase-official): until the plugin can import a finished
  // conversation. None without the plugin.
  const demoChats: DemoChats | undefined = app.container.has(agentsToken)
    ? {
        async create(userId, chat) {
          const service = app.container.resolve(crmToken);
          const query = service.database.query();
          const session = await app.container
            .resolve(agentsToken)
            .onlineAgent.realtime(assistantActor(service, userId), {
              scope: [ASSISTANT_SCOPE],
              title: chat.title,
              source: 'crm',
            });
          const conversationId = session.sessionId;
          const first = chat.messages[0]?.at ?? new Date().toISOString();
          const last = chat.messages.at(-1)?.at ?? first;
          for (const [index, message] of chat.messages.entries()) {
            const id = randomUUID();
            // The first question carries the record it was asked from,
            // resolved as the plugin stores a page context.
            const context =
              index === 0 && chat.context
                ? {
                    route: chat.context.path,
                    items: [
                      {
                        kind: chat.context.kind,
                        id: chat.context.id,
                        title: chat.context.title,
                        key: null,
                        url: `${toText(app.publicBasePath)}${chat.context.path}`,
                      },
                    ],
                    dropped: 0,
                  }
                : null;
            const original = {
              id,
              role: message.role,
              metadata: {
                conversationId,
                createdAt: message.at,
                revision: 1,
                seq: index + 1,
                ...(context ? { context } : {}),
              },
              parts: [
                message.role === 'assistant'
                  ? { type: 'text', text: message.text, state: 'done' }
                  : { type: 'text', text: message.text },
              ],
            };
            await query
              .insertInto('agConversationMessages')
              .values({
                id,
                conversationId,
                seq: index + 1,
                role: message.role,
                content: JSON.stringify({
                  type: 'text',
                  content: message.text,
                  original,
                }),
                searchText: message.text,
                toolCalls: null,
                attachments: null,
                workContext: context ? JSON.stringify(context) : null,
                metadata: JSON.stringify({}),
                runId: null,
                runEventSeq: null,
                createdAt: message.at,
                updatedAt: message.at,
              })
              .execute();
          }
          await query
            .updateTable('agConversations')
            .set({
              lastSeq: chat.messages.length,
              lastMessageAt: last,
              createdAt: first,
              updatedAt: last,
            })
            .where('id', '=', conversationId)
            .execute();
          return conversationId;
        },
        async remove(ids) {
          if (!ids.length) return;
          const query = app.container.resolve(crmToken).database.query();
          await query
            .deleteFrom('agConversationMessages')
            .where('conversationId', 'in', [...ids])
            .execute();
          await query
            .deleteFrom('agConversations')
            .where('id', 'in', [...ids])
            .execute();
        },
      }
    : undefined;
  // Everyone's in-app notifications whose route target names a CRM record
  // that no longer exists: the demo's, once its records are deleted, and any
  // left by an earlier removal or a deleted record, which would only open a
  // record that is gone. Found by reading the plugin's items and the CRM's
  // tables, deleted through its store, as a person deleting one from their
  // inbox would.
  const demoInbox: DemoInbox | undefined = app.container.has(
    inAppNotificationStoreToken,
  )
    ? {
        async removeOrphans() {
          const store = app.container.resolve(inAppNotificationStoreToken);
          const query = app.container.resolve(crmToken).database.query();
          const items = await query
            .selectFrom('notificationInAppItems')
            .select(['id', 'userId', 'target'])
            // A record's page, /<entity>/<id>, or under /crm as a notice
            // sent before 2026-10-19 names it.
            .where((eb) =>
              eb.or(
                Object.keys(RECORD_TABLES).map((entity) =>
                  eb('target', 'like', `%/${entity}/%`),
                ),
              ),
            )
            .execute();
          const byTable = new Map<string, Set<string>>();
          const targets = items.flatMap((item) => {
            const target = (jsonValue(item.target) ?? {}) as {
              path?: unknown;
            };
            const match = /^(?:\/crm)?\/([a-z]+)\/([^/?#]+)/.exec(
              toText(target.path),
            );
            const table = match ? RECORD_TABLES[match[1] ?? ''] : undefined;
            if (!match || !table) return [];
            const id = match[2] ?? '';
            byTable.set(table, (byTable.get(table) ?? new Set()).add(id));
            return [{ item, table, id }];
          });
          const present = new Set<string>();
          for (const [table, ids] of byTable)
            for (let at = 0; at < ids.size; at += 500) {
              const rows = await query
                .selectFrom(table)
                .select('id')
                .where('id', 'in', [...ids].slice(at, at + 500))
                .execute();
              for (const row of rows) present.add(`${table}:${toText(row.id)}`);
            }
          for (const { item, table, id } of targets)
            if (!present.has(`${table}:${id}`))
              await store.update({
                id: toText(item.id),
                userId: toText(item.userId),
                action: 'delete',
              });
        },
      }
    : undefined;
  return { demoAccounts, demoMailboxes, demoChats, demoInbox };
}
