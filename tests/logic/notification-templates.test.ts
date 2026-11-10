// @vitest-environment node

import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { register } from 'tsx/esm/api';
import { describe, expect, it } from 'vitest';
import { I18nRuntime } from '@nocobase/i18n';
import { ServiceContainer } from '@nocobase/service-provider';
import {
  NotificationTemplateRegistry,
  notificationTemplateRegistryToken,
} from '@nocobase/app-plugin-notification/server';
import { createAppTest } from '@nocobase/app-testing/server';
import {
  DEFAULT_ADMIN_CREDENTIALS,
  signIn,
} from '@nocobase/app-plugin-authentication/testing';
import { notificationLocales } from '../../server/locales/crm-notifications/index.js';
import {
  crmNotificationContent,
  crmNotificationLabels,
} from '../../server/providers/crm/notification-content.js';
import {
  crmNotificationTemplateIds,
  registerCrmNotificationTemplates,
} from '../../server/providers/crm/notification-templates.js';
import { createStandaloneServer } from '../../server/standalone.js';

// The CRM's in-app notifications in the template's notification template
// directory (server/providers/crm/notification-templates.ts): each renders
// through the builder the delivery pass sends with, from synthetic records,
// and only an administrator may read the directory.

// Application change: the CRM's seeds import its TypeScript server code
// (see tests/logic/authorization-assignment-safety.test.ts).
register();

const languages = Object.keys(notificationLocales);

async function directory(): Promise<{
  registry: NotificationTemplateRegistry;
  runtime: I18nRuntime;
  release: () => void;
}> {
  const runtime = new I18nRuntime({
    defaultLocale: 'en-US',
    locales: languages,
  });
  runtime.registry.register('crm-notifications', notificationLocales);
  await runtime.init();
  const registry = new NotificationTemplateRegistry();
  const container = new ServiceContainer();
  container.instance(notificationTemplateRegistryToken, registry);
  const release = registerCrmNotificationTemplates({
    container,
    i18n: runtime,
    notification: () => ({ channels: { inbox: { type: 'in-app' } } }),
    channel: 'inbox',
  });
  if (!release) throw new Error('Expected the CRM templates to register');
  return { registry, runtime, release };
}

describe('the CRM notification templates', () => {
  it('registers every message the outbox delivers, through the in-app inbox', async () => {
    const { registry, release } = await directory();
    expect(registry.list().map((item) => item.id)).toEqual(
      crmNotificationTemplateIds,
    );
    expect(crmNotificationTemplateIds).toEqual([
      'crm.record-assigned',
      'crm.task-invited',
      'crm.task-removed',
      'crm.task-cancelled',
      'crm.task-rescheduled',
      'crm.task-starting',
      'crm.comment-mentioned',
      'crm.comment-replied',
      'crm.company-signal',
      'crm.approval-pending',
      'crm.approval-withdrawn',
      'crm.approval-approved',
      'crm.approval-rejected',
    ]);
    for (const item of registry.list()) {
      expect(item.contributor).toBe('crm');
      expect(item.locales).toEqual(languages);
      expect(item.locales[0]).toBe('en-US');
      expect(item.channels).toEqual([
        { name: 'inbox', type: 'in-app', configured: true, enabled: true },
      ]);
    }
    release();
    expect(registry.list()).toEqual([]);
  });

  it('previews each template from synthetic records in English and Chinese', async () => {
    const { registry, release } = await directory();
    for (const id of crmNotificationTemplateIds)
      for (const locale of ['en-US', 'zh-CN']) {
        const preview = await registry.preview(id, locale);
        expect(preview, `${id} ${locale}`).toMatchObject({
          synthetic: true,
          effectiveLocale: locale,
        });
        const { content, definition } = preview!;
        expect(content.title, `${id} ${locale}`).not.toBe('');
        expect(content.title).not.toContain('{{');
        expect(content.title).not.toMatch(/^titles\./);
        expect(content.body).not.toContain('{{');
        expect(content.body).toMatch(/Example|Sample/);
        expect(definition.body).toBe('{{name}}');
        expect(definition.title).not.toMatch(/^titles\./);
      }
    // The exact wording the inbox shows.
    expect(
      (await registry.preview('crm.record-assigned', 'en-US'))?.content,
    ).toEqual({
      title: 'Lead assigned to you',
      body: 'Avery Sample / Example Trading Co.',
    });
    expect(
      (await registry.preview('crm.record-assigned', 'zh-CN'))?.content,
    ).toEqual({
      title: '线索已分配给你',
      body: 'Avery Sample / Example Trading Co.',
    });
    expect(
      (await registry.preview('crm.record-assigned', 'en-US'))?.definition,
    ).toEqual({ title: '{{entity}} assigned to you', body: '{{name}}' });
    expect(
      (await registry.preview('crm.comment-mentioned', 'en-US'))?.content,
    ).toEqual({
      title: 'Someone mentions you in an opportunity',
      body: 'Example Trading Co. / Sample renewal',
    });
    expect(
      (await registry.preview('crm.approval-pending', 'zh-CN'))?.content,
    ).toEqual({ title: '待审批申请', body: 'Sample discount request' });
    // A language the messages are not written in shows the first, English.
    expect(await registry.preview('crm.task-starting', 'xx-XX')).toMatchObject({
      effectiveLocale: 'en-US',
      content: { title: 'Task coming up' },
    });
    release();
  });

  it('builds exactly what the delivery pass sent before the builder was shared', async () => {
    const { runtime, release } = await directory();
    const events = Object.keys((await notificationLocales['en-US']()).titles);
    const entities = Object.keys(
      (await notificationLocales['en-US']()).entities,
    );
    for (const locale of languages) {
      await runtime.ensureLocaleLoaded(locale);
      const t = runtime.getFixedT('crm-notifications', locale);
      for (const event of events) {
        for (const entity of entities) {
          // The delivery pass's inline wording until the builder was shared.
          const title = t(`titles.${event}`, {
            entity: t(`entities.${entity}`),
            record: t(`records.${entity}`),
          });
          expect(
            crmNotificationContent(
              t,
              event,
              crmNotificationLabels(t, entity),
              'Quinn Sample / Example & Sons',
            ),
          ).toEqual({
            title,
            body: t('body', { title, name: 'Quinn Sample / Example & Sons' }),
          });
        }
        // A WhatsApp conversation linked to no record.
        const bare = t(`titles.${event}`);
        expect(crmNotificationContent(t, event, undefined, 'Sample')).toEqual({
          title: bare,
          body: t('body', { title: bare, name: 'Sample' }),
        });
      }
    }
    release();
  });
});

const test = createAppTest({
  createServer: createStandaloneServer,
  config: {
    app: { publicOrigin: 'http://localhost' },
    spa: {
      indexPath: fileURLToPath(new URL('../../index.html', import.meta.url)),
    },
    auth: { secret: 'notification-template-test-secret-at-least-32-chars' },
    // The CRM's in-app Channel, and a developer's SMTP_PASSWORD
    // (.env.local) made complete with a local sender that is never used
    // here (as tests/logic/authorization-assignment-safety.test.ts).
    notification: {
      channels: {
        inbox: { type: 'in-app' },
        'system-email': {
          type: 'smtp',
          host: 'localhost',
          port: 465,
          secure: true,
          auth: { user: 'test@example.test', pass: 'test-private-password' },
          from: 'test@example.test',
        },
      },
    },
  },
});

test('lists and previews for an administrator and refuses everyone else', async ({
  testApp,
  app,
  request,
}) => {
  expect(
    typeof app.config.get('client.notificationTemplates.invitationConfigured'),
  ).toBe('boolean');
  const page = await testApp.fetch(
    new Request(`http://localhost${testApp.publicBasePath}/`),
  );
  expect(page.status).toBe(200);
  const html = await page.text();
  expect(html).toContain('"invitationConfigured"');
  expect(html).not.toContain('test-private-password');

  expect((await request('/notifications/templates')).status).toBe(401);
  const admin = await signIn(testApp, DEFAULT_ADMIN_CREDENTIALS);
  const list = await admin.fetch('/notifications/templates');
  expect(list.status).toBe(200);
  const body = (await list.json()) as {
    data: { id: string; channels: unknown[] }[];
    meta: { total: number };
  };
  expect(JSON.stringify(body)).not.toContain('test-private-password');
  const ids = body.data.map((item) => item.id);
  expect(ids).toEqual(expect.arrayContaining([...crmNotificationTemplateIds]));
  // The Users plugin's invitation registers itself.
  expect(ids).toContain('users.invitation');
  expect(body.meta.total).toBe(body.data.length);
  expect(
    body.data.find((item) => item.id === 'crm.approval-pending')?.channels,
  ).toEqual([
    { name: 'inbox', type: 'in-app', configured: true, enabled: true },
  ]);
  const filtered = (await (
    await admin.fetch('/notifications/templates?category=Approvals')
  ).json()) as { data: { id: string }[] };
  expect(filtered.data.map((item) => item.id)).toEqual([
    'crm.approval-pending',
    'crm.approval-withdrawn',
    'crm.approval-approved',
    'crm.approval-rejected',
  ]);
  expect(
    (await admin.fetch('/notifications/templates/crm.task-starting')).status,
  ).toBe(200);

  const logsBefore = await (await admin.fetch('/notifications/logs')).json();
  const preview = (locale: string) => ({
    method: 'POST',
    headers: {
      origin: 'http://localhost',
      'content-type': 'application/json',
    },
    body: JSON.stringify({ locale }),
  });
  for (const id of crmNotificationTemplateIds)
    for (const locale of ['en-US', 'zh-CN']) {
      const response = await admin.fetch(
        `/notifications/templates/${id}/preview`,
        preview(locale),
      );
      expect(response.status, `${id} ${locale}`).toBe(200);
      const { data } = (await response.json()) as {
        data: { synthetic: boolean; content: { title: string } };
      };
      expect(data.synthetic).toBe(true);
      expect(data.content.title).not.toContain('{{');
    }
  const signal = (await (
    await admin.fetch(
      '/notifications/templates/crm.company-signal/preview',
      preview('zh-CN'),
    )
  ).json()) as { data: { content: unknown } };
  expect(signal.data.content).toEqual({
    title: '公司有新动态',
    body: 'Example Trading Co.',
  });
  // Previewing sends nothing.
  expect(await (await admin.fetch('/notifications/logs')).json()).toEqual(
    logsBefore,
  );

  // A person with no administrator grant: Member only.
  const member = {
    name: 'Synthetic template viewer',
    username: 'templateviewer',
    email: 'templateviewer@example.test',
    password: 'Synthetic-template-viewer-943!',
    roleScopes: { app: ['member'] },
  };
  const created = await admin.fetch('/users', {
    method: 'POST',
    headers: {
      origin: 'http://localhost',
      'content-type': 'application/json',
      'Idempotency-Key': `${Date.now()}.${randomUUID()}`,
    },
    body: JSON.stringify(member),
  });
  expect(created.status).toBe(201);
  const restricted = await signIn(testApp, {
    username: member.username,
    password: member.password,
  });
  for (const endpoint of [
    '',
    '/crm.record-assigned',
    '/crm.record-assigned/preview',
  ]) {
    const response = await restricted.fetch(
      `/notifications/templates${endpoint}`,
      endpoint.endsWith('/preview') ? preview('en-US') : undefined,
    );
    expect(response.status, `templates${endpoint}`).toBe(403);
  }
});
