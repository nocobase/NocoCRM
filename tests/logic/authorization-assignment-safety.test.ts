// @vitest-environment node

import { randomUUID } from 'node:crypto';
import { register } from 'tsx/esm/api';
import { expect, it } from 'vitest';
import { createAppTest } from '@nocobase/app-testing/server';
import {
  DEFAULT_ADMIN_CREDENTIALS,
  signIn,
} from '@nocobase/app-plugin-authentication/testing';
import { createStandaloneServer } from '../../server/standalone.js';

// Application change: the harness installs the application through Node,
// and the CRM's seeds import its TypeScript server code with `.js`
// specifiers (database/main/seeds/202610040001_crm_sales_permission_sets.ts),
// which Node resolves only through a TypeScript loader, as `pnpm dev` runs.
register();

type Assignment = {
  subjectType: unknown;
  subjectId: unknown;
  permissionSetKey: unknown;
};

function unexpectedGlobalAssignments(
  assignments: readonly Assignment[],
): Assignment[] {
  return assignments.filter((assignment) => assignment.subjectId === '*');
}

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
    // Application change: a developer's SMTP_PASSWORD (.env.local) makes the
    // system mailer's channel, which then needs its provider; a local one
    // that is never used here.
    notification: {
      channels: {
        'system-email': {
          type: 'smtp',
          host: 'localhost',
          port: 465,
          secure: true,
          // Complete without SMTP_PASSWORD (CI has none): the server
          // refuses an email channel without its password.
          auth: { user: 'test@example.test', pass: 'test-password' },
          from: 'test@example.test',
        },
      },
    },
  },
});

test('initialization does not silently grant business roles to every signed-in user', async ({
  connection,
}) => {
  const assignments = await connection.query
    .selectFrom('authorizationPermissionSetAssignments')
    .select(['subjectType', 'subjectId', 'permissionSetKey'])
    .execute();
  expect(
    unexpectedGlobalAssignments(assignments),
    'Global role assignments must be explicitly requested and editable in administration. Use per-user role assignments by default; do not remove this guard to make a feature accessible.',
  ).toEqual([]);
  const member = await connection.query
    .selectFrom('authorizationPermissionSets')
    .select(['grants'])
    .where('key', '=', 'member')
    .executeTakeFirstOrThrow();
  let grants: unknown = member.grants;
  // Database JSON codecs may preserve the serialized seed value as a string.
  while (typeof grants === 'string') grants = JSON.parse(grants) as unknown;
  expect(
    grants,
    'The inherited platform member role must not conceal application business grants. Assign a separate business role to explicit users.',
  ).toEqual([]);
});

test('shows editable Member defaults and keeps an explicitly roleless person without CRM access', async ({
  testApp,
}) => {
  const admin = await signIn(testApp, DEFAULT_ADMIN_CREDENTIALS);
  const send = (path: string, method: string, body: unknown) =>
    admin.fetch(path, {
      method,
      headers: {
        'content-type': 'application/json',
        Origin: 'http://localhost',
        // Each user write is one operation (template 1.0.0-beta.84).
        'Idempotency-Key': `${Date.now()}.${randomUUID()}`,
      },
      body: JSON.stringify(body),
    });
  const options = await admin.fetch('/users/options').then((r) => r.json());
  expect(
    options.data.roleScopes.find(
      (scope: { key: string }) => scope.key === 'app',
    ),
  ).toMatchObject({ defaultValue: ['member'] });
  const credentials = {
    email: 'member-test@example.test',
    password: 'member-test-password',
  };
  const created = await send('/users', 'POST', {
    name: 'Member test',
    ...credentials,
  });
  expect(created.status).toBe(201);
  const user = (await created.json()).data;
  expect(user.roleScopes.app).toEqual(['member']);
  const empty = await send('/users', 'POST', {
    name: 'Empty roles',
    email: 'empty-roles@example.test',
    password: credentials.password,
    roleScopes: { app: [] },
  });
  expect(empty.status).toBe(201);
  expect((await empty.json()).data.roleScopes.app).toEqual([]);
  expect(
    (await send(`/users/${user.id}`, 'PATCH', { roleScopes: { app: [] } }))
      .status,
  ).toBe(200);
  const edited = await send(`/users/${user.id}`, 'PATCH', {
    name: 'Still roleless',
  });
  expect(edited.status).toBe(200);
  expect((await edited.json()).data.roleScopes.app).toEqual([]);
  const person = await signIn(testApp, credentials);
  expect((await person.fetch('/auth/get-session')).status).toBe(200);
  expect((await person.fetch('/leads')).status).toBe(403);
  expect((await person.fetch('/users')).status).toBe(403);
});

it('detects wildcard recipients regardless of the role name, while preserving explicit user assignments', () => {
  const global = {
    subjectType: 'authenticated',
    subjectId: '*',
    permissionSetKey: 'task-member',
  };
  expect(
    unexpectedGlobalAssignments([
      {
        subjectType: 'authenticated',
        subjectId: '*',
        permissionSetKey: 'member',
      },
      {
        subjectType: 'user',
        subjectId: 'user-1',
        permissionSetKey: 'task-member',
      },
      global,
      { ...global, subjectType: 'everyone' },
    ]),
  ).toEqual([
    {
      subjectType: 'authenticated',
      subjectId: '*',
      permissionSetKey: 'member',
    },
    global,
    { ...global, subjectType: 'everyone' },
  ]);
});
