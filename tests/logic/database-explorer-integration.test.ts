// @vitest-environment node

import { randomUUID } from 'node:crypto';
import { register } from 'tsx/esm/api';
import { expect } from 'vitest';
import { createAppTest } from '@nocobase/app-testing/server';
import {
  DEFAULT_ADMIN_CREDENTIALS,
  signIn,
} from '@nocobase/app-plugin-authentication/testing';
import { createStandaloneServer } from '../../server/standalone.js';

// The Database Explorer behind the System category's card
// (client/pages/settings/database-explorer/), against the running
// application: an administrator browses the real connections and tables, and
// a person without its page grant is refused by the API, whatever the card
// shows. The template tests the page against a signed-in browser client;
// the CRM has no such harness, so this reads the endpoints the page reads.

// The CRM's seeds import its TypeScript server code with `.js` specifiers,
// which Node resolves only through a TypeScript loader.
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

test('lets an administrator browse the connections and tables, and refuses a person without the grant', async ({
  testApp,
}) => {
  const admin = await signIn(testApp, DEFAULT_ADMIN_CREDENTIALS);
  const connections = await admin.fetch('/databaseExplorer/connections');
  expect(connections.status).toBe(200);
  const { data } = (await connections.json()) as {
    data: { name: string }[];
  };
  expect(data.map(({ name }) => name)).toContain('main');
  const tables = await admin.fetch(
    '/databaseExplorer/connections/main/collections',
  );
  expect(tables.status).toBe(200);
  const listing = (await tables.json()) as { data: unknown[] };
  expect(listing.data.length).toBeGreaterThan(0);

  const credentials = {
    email: 'explorer-member@example.test',
    password: 'explorer-member-password',
  };
  const created = await admin.fetch('/users', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      Origin: 'http://localhost',
      'Idempotency-Key': `${Date.now()}.${randomUUID()}`,
    },
    body: JSON.stringify({ name: 'Explorer member', ...credentials }),
  });
  expect(created.status).toBe(201);
  const member = await signIn(testApp, credentials);
  expect((await member.fetch('/databaseExplorer/connections')).status).toBe(
    403,
  );
  expect(
    (await member.fetch('/databaseExplorer/connections/main/collections'))
      .status,
  ).toBe(403);
});
