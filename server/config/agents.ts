import {
  defineAppConfig,
  type AppConfigFactory,
} from '@nocobase/app-server/config';
import type { AgentsConfig } from '@nocobase/app-plugin-agents/server/tokens';

/**
 * The Agents plugin's section. Agents call the CRM through its command line,
 * named `crm` here rather than after the application's mount path, so the
 * commands they run (the assistant's `crm` tool among them,
 * server/providers/crm-agents/assistant.ts), how to use them
 * (server/providers/crm-agents/skill.ts) and their help read alike.
 */
const agents: AppConfigFactory<AgentsConfig> = defineAppConfig({
  defaults: {
    cli: { name: 'crm' },
    app: { id: 'nococrm', name: 'NocoCRM' },
  },
});

export default agents;
