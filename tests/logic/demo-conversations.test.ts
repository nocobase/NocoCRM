// @vitest-environment node

import { register } from 'tsx/esm/api';
import { expect } from 'vitest';
import { agentsToken } from '@nocobase/app-plugin-agents/server/tokens';
import { createAppTest } from '@nocobase/app-testing/server';
import { demoServices } from '../../server/routes/demo-services.js';
import { createStandaloneServer } from '../../server/standalone.js';

// The demo's conversations with the assistant on a deployment without a chat
// model, where the Agents plugin opens none: the import still writes them,
// under the placeholder model, so they are listed and can be read.

// The CRM's seeds import its TypeScript server code with `.js` specifiers,
// which Node resolves only through a TypeScript loader.
register();

// A developer's key (.env.local) would provision the model service.
process.env.DEEPSEEK_API_KEY = '';

const test = createAppTest({
  createServer: createStandaloneServer,
  connections: ['main'],
  config: {
    app: { publicOrigin: 'http://localhost' },
    auth: { secret: 'test-auth-secret-at-least-32-characters' },
    // No key: no model service is provisioned, so no chat model.
    ai: {
      llmServices: {
        deepseek: {
          provider: 'deepseek',
          enabledModels: [{ value: 'deepseek-flash' }],
          enabled: true,
          options: { apiKey: '' },
        },
      },
    },
    // A developer's SMTP_PASSWORD (.env.local) makes the system mailer's
    // channel, which then needs its provider; a local one never used here.
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

test("imports the demo's conversations without a chat model", async ({
  app,
  connection,
}) => {
  const { id: userId } = await connection.query
    .selectFrom('user')
    .select('id')
    .executeTakeFirstOrThrow();
  const chats = demoServices(app).demoChats;
  expect(chats).toBeDefined();
  const id = await chats?.create(String(userId), {
    title: 'Follow up on the trade show lead',
    messages: [
      { role: 'user', text: 'Who first?', at: '2026-10-20T09:00:00.000Z' },
      {
        role: 'assistant',
        text: 'The one asking for a quote.',
        at: '2026-10-20T09:02:00.000Z',
      },
    ],
  });
  expect(id).toBeTruthy();
  const conversation = await connection.query
    .selectFrom('agConversations')
    .selectAll()
    .where('id', '=', String(id))
    .executeTakeFirstOrThrow();
  expect(conversation).toMatchObject({
    userId: String(userId),
    agentId: '0',
    source: 'crm',
    title: 'Follow up on the trade show lead',
    modelService: 'deepseek',
    model: 'deepseek-flash',
    lastSeq: 2,
  });
  let metadata: unknown = conversation.metadata;
  while (typeof metadata === 'string') metadata = JSON.parse(metadata);
  expect(metadata).toMatchObject({
    onlineAgent: { kind: 'realtime', config: { scope: ['crm'] } },
  });
  const messages = await connection.query
    .selectFrom('agConversationMessages')
    .select('seq')
    .where('conversationId', '=', String(id))
    .execute();
  expect(messages).toHaveLength(2);
  // And the plugin lists it for its owner, opens it and reads its messages.
  const conversations = app.container.resolve(agentsToken).conversations;
  const listed = await conversations.list(String(userId), {});
  expect(listed.items.map((item) => item.id)).toContain(String(id));
  await expect(
    conversations.get(String(userId), String(id)),
  ).resolves.toMatchObject({ title: 'Follow up on the trade show lead' });
  const page = await conversations.messages(String(userId), String(id), {});
  expect(page.items).toHaveLength(2);
});
