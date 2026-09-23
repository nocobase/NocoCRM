import {
  defineClientReactProviders,
  type AppClientReactProviderDefinition,
} from '@nocobase/app-client/plugins';

import { AppThemeProvider } from './theme/theme-provider.js';
import { CrmAssistantProvider } from './components/crm/ai-chat.js';
import { CrmQueryProvider } from './components/crm/query-provider.js';

export const reactProviders: readonly AppClientReactProviderDefinition[] =
  defineClientReactProviders([
    {
      component: CrmQueryProvider,
      layer: 'root',
      name: 'crm-query',
    },
    {
      component: AppThemeProvider,
      layer: 'root',
      name: 'theme',
    },
    {
      component: CrmAssistantProvider,
      layer: 'application',
      name: 'crm-assistant',
    },
  ]);

export default reactProviders;
