import type { Application } from '@nocobase/app-server/application';
import { generateDemo, clearDemoBusiness } from './demo-lifecycle.js';
import type { DemoDataset } from '@nocobase/app-plugin-demo-mode/server/tokens';
import { demoRoleTitles } from '../../locales/crm-ai/demo-mode.js';
import { demoAccountsIn, demoPassword } from './demo.js';

/** The plugin owns lifecycle and identities; the CRM retains its existing story. */
export function existingCrmDemo(app: Application): DemoDataset {
  return {
    id: 'crm',
    languages: ['zh-CN', 'en-US'],
    timeZone: (language) =>
      language === 'en-US' ? 'America/New_York' : 'Asia/Shanghai',
    accounts: (language) => {
      const locale = language === 'en-US' ? 'en-US' : 'zh-CN';
      return demoAccountsIn(locale).map(({ username, name, role }) => ({
        username,
        name,
        role: demoRoleTitles[role][locale === 'zh-CN' ? 0 : 1],
        password: demoPassword(username),
      }));
    },
    generate: (context) => generateDemo(app, context),
    clear: () => clearDemoBusiness(app),
  };
}
