import {
  DemoModeSettings,
  type DemoSettingsComponents,
} from '@nocobase/app-plugin-demo-mode/client/settings';
import type { ReactElement } from 'react';
import { PageContainer } from '../../components/page-container.js';
import { toText, useCrmText } from '../../components/crm/api.js';

// Settings already names the page; keep the plugin's read-only cards without
// another header. Data operations are available through the plugin's API or CLI.
const components: DemoSettingsComponents = {
  Header: () => null,
};
const counts: Record<string, string> = {
  crmLeads: 'entities.leads',
  crmCompanies: 'entities.companies',
  crmContacts: 'entities.contacts',
  crmOpportunities: 'entities.opportunities',
  crmTasks: 'entities.tasks',
  crmApprovals: 'entities.approvals',
  accounts: 'navigation.users',
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
