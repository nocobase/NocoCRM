import {
  DemoModeSettings,
  type DemoSettingsComponents,
} from '@nocobase/app-plugin-demo-mode/client/settings';
import type { ReactElement } from 'react';
import { PageContainer } from '../../components/page-container.js';
import { toText, useCrmText } from '../../components/crm/api.js';

// Settings already names the page; keep the plugin's cards without another
// header. The data card's actions (its language and Generate, Clear and
// Reset, the plugin's only CardAction) go too: every visitor may enter a
// demo site as its administrator, and those would wipe the demo for
// everyone. The counts, the daily reset and the accounts stay; a deliberate
// reset goes through the plugin's API or `pnpm nocobase demo-mode data reset`.
const components: DemoSettingsComponents = {
  Header: () => null,
  CardAction: () => null,
};
const counts: Record<string, string> = {
  crmLeads: 'entities.leads',
  crmCompanies: 'entities.companies',
  crmContacts: 'entities.contacts',
  crmOpportunities: 'entities.opportunities',
  crmTasks: 'entities.tasks',
  crmApprovals: 'entities.approvals',
  '@user': 'navigation.users',
};

export default function DemoEnvironmentPage(): ReactElement {
  const { text } = useCrmText();
  return (
    <PageContainer>
      <DemoModeSettings
        components={components}
        label={(_kind, id) =>
          counts[id] ? toText(text(counts[id])) : undefined
        }
      />
    </PageContainer>
  );
}
