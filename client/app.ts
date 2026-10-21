import {
  ClientApplication,
  defineAppClientRenderConfig,
  type AppClientRenderConfig,
} from '@nocobase/app-client';
import { I18nProvider } from '@nocobase/i18n/client';
import type { AppRuntimeContext } from '@nocobase/app-client/runtime';
import {
  createElement,
  type PropsWithChildren,
  type ReactElement,
} from 'react';

import {
  createAppSidebarPreferenceStore,
  SidebarPreferenceProvider,
} from './layouts/use-sidebar-preference.js';
import { CrmQueryProvider } from './components/crm/query-provider.js';
import { AppRouter } from './routing/app-router.js';
export function createApp(runtime: AppRuntimeContext): ClientApplication {
  // Outermost, so every provider and page below can translate.
  const AppI18nProvider = ({ children }: PropsWithChildren): ReactElement =>
    createElement(I18nProvider, { runtime: runtime.i18n }, children);

  const sidebarPreference = createAppSidebarPreferenceStore(runtime.basename);
  const AppSidebarPreferenceProvider = ({
    children,
  }: PropsWithChildren): ReactElement =>
    createElement(
      SidebarPreferenceProvider,
      { value: sidebarPreference },
      children,
    );

  const app = new ClientApplication({
    runtime,
    createRenderConfig: (): AppClientRenderConfig =>
      defineAppClientRenderConfig({
        basename: runtime.basename,
        reactProviders: [
          AppI18nProvider,
          AppSidebarPreferenceProvider,
          ...runtime.reactProviders.map((provider) => provider.component),
        ],
        // Application change: @nocobase/app-client mounts a query cache of its own around the routes, which the React
        // providers outside them (the CRM's assistant panel) cannot see; the CRM's one cache goes inside it as well, so
        // a page and the panel beside it read and invalidate the same queries (components/crm/query-client.ts).
        routes: createElement(
          CrmQueryProvider,
          null,
          createElement(AppRouter, { clientRoutes: runtime.routes }),
        ),
      }),
  });
  runtime.app = app;
  return app;
}
