import { enableDemoMode } from '../setup/demo-mode.js';
import { apiClientToken } from '@nocobase/app-client';
import {
  AuthorizationClient,
  authorizationClientToken,
} from '@nocobase/app-plugin-authorization/client';
import demoMode from '@nocobase/app-plugin-demo-mode/client';
import { answerApi, renderWithApp } from '@nocobase/app-testing/client';
import { screen, within } from '@testing-library/react';
import { expect, it } from 'vitest';

import DemoEnvironmentPage from '../../client/pages/settings/demo-environment.js';
import enUS from '../../client/locales/en-US.js';
import zhCN from '../../client/locales/zh-CN.js';
import packageMetadata from '../../package.json';

it.each([
  {
    locale: 'en-US',
    copy: enUS,
    ready: 'Ready',
    schedule: 'Daily reset',
    leads: 'Leads',
  },
  {
    locale: 'zh-CN',
    copy: zhCN,
    ready: '已就绪',
    schedule: '每日重置',
    leads: '线索',
  },
])(
  'shows the real read-only demo overview in $locale even for root',
  async ({ locale, copy, ready, schedule, leads }) => {
    await renderWithApp(<DemoEnvironmentPage />, {
      route: '/settings/demo-data',
      namespace: packageMetadata.name,
      namespaces: { [packageMetadata.name]: copy },
      locale,
      plugins: [demoMode()],
      services: (app) => {
        enableDemoMode(app);
        app.container.singleton(
          authorizationClientToken,
          (resolver) =>
            new AuthorizationClient(resolver.resolve(apiClientToken)),
        );
      },
      fetch: answerApi(({ path }) => {
        switch (path) {
          case 'authorization/permissions':
            return { data: { unrestricted: true, permissions: [] } };
          case 'demoMode/data':
            return {
              data: {
                available: true,
                present: true,
                state: 'ready',
                importing: null,
                languages: ['en-US', 'zh-CN'],
                language: locale,
                finishedAt: '2026-10-25T03:00:00.000Z',
                counts: { crmLeads: 12 },
              },
            };
          case 'demoMode/configuration':
            return {
              data: {
                schedule: {
                  enabled: true,
                  hour: 3,
                  minute: 0,
                  timezone: 'UTC',
                  language: locale,
                },
              },
            };
          case 'demoMode/accounts':
            return {
              data: [
                {
                  username: 'admin',
                  name: 'Super Admin',
                  role: '',
                  current: true,
                },
              ],
            };
          default:
            return new Response(null, { status: 404 });
        }
      }),
    });

    expect(await screen.findByText(ready, { exact: true })).toBeInTheDocument();
    expect(
      await screen.findByText(schedule, { exact: true }),
    ).toBeInTheDocument();
    expect(screen.getByText('03:00')).toBeInTheDocument();
    expect(screen.getByText('UTC')).toBeInTheDocument();
    expect(screen.getByText(leads, { exact: true })).toBeInTheDocument();
    expect(screen.getByText('12', { exact: true })).toBeInTheDocument();
    const accounts = await screen.findByRole('list');
    expect(within(accounts).getByText('Super Admin')).toBeInTheDocument();
    // All interactive controls belong to account entry links, never data mutations.
    for (const button of screen.getAllByRole('button'))
      expect(accounts).toContainElement(button);
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
  },
);
