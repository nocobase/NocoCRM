import type { PagePermissionTitles } from './page-permissions.js';
import { RECORD_ENTITIES } from '../../components/crm/record-route.js';

/** Permission labels for application pages without navigation/breadcrumb titles (including overlays).
 * Keys are existing route names; values are application translation keys.
 * Do not add navigation/breadcrumbs or change authorization ids just to name a permission.
 */
export const pagePermissionTitles: PagePermissionTitles = {
  // A record's page, one route a kind and a tab each, sharing one grant
  // (client/routes.ts).
  ...Object.fromEntries(
    RECORD_ENTITIES.flatMap((entity) => [
      `crm-record-${entity}`,
      `crm-record-${entity}-tab`,
    ]).map((name) => [name, 'crm.authz.pages.record']),
  ),
  // The inbox's AI suggestions, at their old address.
  'crm-decisions': 'crm.authz.pages.decisions',
  'settings-scheduled-tasks': 'crm.navigation.scheduledTasks',
  'settings-scheduled-task': 'crm.navigation.scheduledTasks',
  // The Agents plugin's page of the agents discovered from runners, which
  // the CRM routes itself (client/routes.ts) without a menu entry.
  agents: 'crm.authz.pages.runnerAgents',
  // Pages under another page, sharing its grant.
  'crm-mail-accounts': 'crm.navigation.mailbox',
  'crm-whatsapp-conversation': 'crm.authz.pages.whatsapp',
  'crm-whatsapp-link': 'crm.authz.pages.whatsapp',
  'crm-whatsapp-new-lead': 'crm.authz.pages.whatsapp',
  'crm-agent-chat-conversation': 'crm.authz.pages.agentChat',
  'crm-agents-tab': 'crm.authz.pages.agents',
  'skills-new': 'crm.navigation.skills',
  'skills-detail': 'crm.navigation.skills',
};
