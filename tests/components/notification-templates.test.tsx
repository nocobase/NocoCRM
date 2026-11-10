import { answerApi, renderWithApp } from '@nocobase/app-testing/client';
import { resolveAppClientContributions } from '@nocobase/app-client/plugins';
import type {
  NotificationTemplatePreview,
  NotificationTemplateView,
} from '@nocobase/app-plugin-notification/client';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes, useLocation } from 'react-router';
import { expect, it } from 'vitest';
import metadata from '../../package.json' with { type: 'json' };
import enUS from '../../client/locales/en-US.js';
import zhCN from '../../client/locales/zh-CN.js';
import NotificationTemplateDrawer from '../../client/pages/settings/notification-template-detail.js';
import NotificationTemplatesPage from '../../client/pages/settings/notification-templates.js';
import { createApplicationRoutes } from '../../client/routes.js';
import { RouteTreeProvider } from '../../client/routing/route-context.js';

// Settings → Notification management → Notification templates
// (client/pages/settings/notification-templates.tsx): the CRM's page over the
// Notification plugin's API, in the reader's language, grouped by category,
// a template opening in a drawer with its preview in the interface language.

const namespaces = {
  [metadata.name]: {
    'en-US': async () => ({ default: enUS }),
    'zh-CN': async () => ({ default: zhCN }),
  },
};

const { routes } = resolveAppClientContributions([
  {
    packageName: metadata.name,
    source: 'application',
    routes: createApplicationRoutes(),
  },
]);

const LOCALES = ['en-US', 'zh-CN'];
const channel = (type: string, name: string) => ({
  name,
  type,
  configured: true,
  enabled: true,
});
const view = (
  id: string,
  category: string,
  type = 'in-app',
): NotificationTemplateView => ({
  id,
  contributor: id.startsWith('crm.') ? 'crm' : '@nocobase/app-plugin-users',
  category,
  name: `Registered ${id}`,
  trigger: `Registered trigger of ${id}`,
  recipients: 'Registered recipients',
  businessRule: 'Registered rule',
  locales: LOCALES,
  languagePolicy: 'Registered language policy',
  variables: [{ name: 'name', description: 'Registered variable' }],
  channels: [channel(type, type === 'email' ? 'system-email' : 'inbox')],
});
const TEMPLATES = [
  view('users.invitation', 'Accounts', 'email'),
  view('crm.record-assigned', 'Records'),
  view('crm.approval-pending', 'Approvals'),
  view('acme.unknown', 'Elsewhere'),
];

function Where() {
  return <output aria-label='Route'>{useLocation().pathname}</output>;
}

async function mount(route = '/settings/notifications/templates') {
  const previews: string[] = [];
  const result = await renderWithApp(
    <RouteTreeProvider
      routes={routes}
      access={{ denied: new Set(), loading: false }}
    >
      <Routes>
        <Route
          path='/settings/notifications/templates'
          element={<NotificationTemplatesPage />}
        >
          <Route path=':templateId' element={<NotificationTemplateDrawer />} />
        </Route>
        <Route path='*' element={<Where />} />
      </Routes>
      <Where />
    </RouteTreeProvider>,
    {
      route,
      locale: 'zh-CN',
      namespace: metadata.name,
      namespaces,
      fetch: answerApi(({ path, json }) => {
        if (path === 'notifications/templates') return { data: TEMPLATES };
        const preview = /^notifications\/templates\/(.+)\/preview$/.exec(path);
        if (preview) {
          const locale = (json as { locale: string }).locale;
          previews.push(locale);
          const data: NotificationTemplatePreview = {
            synthetic: true,
            requestedLocale: locale,
            effectiveLocale: locale,
            content: { title: `Example in ${locale}`, body: 'Avery Sample' },
            definition: { title: `Template in ${locale}`, body: '{{name}}' },
          };
          return { data };
        }
        const one = /^notifications\/templates\/(.+)$/.exec(path);
        if (one)
          return {
            data: TEMPLATES.find(
              (item) => item.id === decodeURIComponent(one[1]!),
            ),
          };
        return { data: [] };
      }),
    },
  );
  return { ...result, previews };
}

it('lists the templates by category in the reader’s language, registered English for one it does not know', async () => {
  await mount();
  const records = await screen.findByRole('region', { name: '记录' });
  expect(within(records).getByText('记录分配给你')).toBeTruthy();
  expect(within(records).getByText('站内信')).toBeTruthy();
  const accounts = screen.getByRole('region', { name: '账号' });
  expect(within(accounts).getByText('用户邀请')).toBeTruthy();
  expect(within(accounts).getByText('邮件')).toBeTruthy();
  const elsewhere = screen.getByRole('region', { name: 'Elsewhere' });
  expect(within(elsewhere).getByText('Registered acme.unknown')).toBeTruthy();
});

it('searches the translated words and filters by channel', async () => {
  const user = userEvent.setup();
  await mount();
  await screen.findByRole('region', { name: '记录' });
  await user.type(screen.getByRole('textbox', { name: '搜索' }), '审批');
  await waitFor(() =>
    expect(screen.queryByRole('region', { name: '账号' })).toBeNull(),
  );
  expect(screen.getByText('收到审批申请')).toBeTruthy();
  await user.clear(screen.getByRole('textbox', { name: '搜索' }));
  await user.click(screen.getByRole('combobox', { name: '渠道' }));
  await user.click(await screen.findByRole('option', { name: '邮件' }));
  await waitFor(() =>
    expect(screen.queryByRole('region', { name: '记录' })).toBeNull(),
  );
  expect(screen.getByRole('region', { name: '账号' })).toBeTruthy();
});

it('opens a template from anywhere on its card in a drawer, its preview in the interface language', async () => {
  const user = userEvent.setup();
  const { previews } = await mount();
  await user.click(await screen.findByText('记录分配给你'));
  const drawer = await screen.findByRole('dialog');
  expect(
    await within(drawer).findByRole('heading', { name: '记录分配给你' }),
  ).toBeTruthy();
  expect(within(drawer).getByText('新负责人。')).toBeTruthy();
  expect(
    await within(drawer).findByText(/“记录变更通知”开启时发送/u),
  ).toBeTruthy();
  expect(await within(drawer).findByText('Example in zh-CN')).toBeTruthy();
  expect(previews).toEqual(['zh-CN']);
  expect(
    within(drawer).getByRole('combobox', { name: '预览语言' }),
  ).toBeTruthy();
  expect(within(drawer).getByText('NocoCRM')).toBeTruthy();
});

it('opens the drawer from a link of the plugin’s, ?template=<id>', async () => {
  await mount('/settings/notifications/templates?template=users.invitation');
  const drawer = await screen.findByRole('dialog');
  expect(
    await within(drawer).findByRole('heading', { name: '用户邀请' }),
  ).toBeTruthy();
  expect(
    within(drawer).getByText('通过邮件发送的邀请都会发出，没有关闭的开关。'),
  ).toBeTruthy();
  // One email in every language: no preview language to pick.
  expect(
    await within(drawer).findByText(
      '这封邮件一次包含所有语言，每位收件人收到的内容都相同。',
    ),
  ).toBeTruthy();
  expect(
    within(drawer).queryByRole('combobox', { name: '预览语言' }),
  ).toBeNull();
});
