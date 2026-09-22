import { AIResourceRegistrar } from '@nocobase/app-plugin-ai-employee/server';
import type { AIEmployeeManager, ToolsManager } from '@nocobase/ai-employee';
import type { AppAuthorizationService } from '@nocobase/app-plugin-authorization/server';
import type { CrmService } from '../providers/crm/service.js';
import {
  crmAssistant,
  type CrmAssistantOptions,
} from './employees/crm-assistant.js';
import { crmRecordTools } from './tools/crm-records.js';
import { crmWriteTools } from './tools/crm-writes.js';

// The application's AI resources, registered with the AI Employee plugin
// from CrmProvider: the CRM assistant employee, its read tools and its
// write tools (the latter held for the user's confirmation by the plugin).
// Tools register before the employee, as the plugin expects.
export class CrmAiResources extends AIResourceRegistrar {
  constructor(
    private readonly service: CrmService,
    private readonly authz: Pick<AppAuthorizationService, 'for'>,
    private readonly options: CrmAssistantOptions,
  ) {
    super({ source: 'crm' });
  }
  protected override async registerAIEmployees(
    aiEmployeeManager: AIEmployeeManager,
  ): Promise<void> {
    await aiEmployeeManager.registerEmployee(crmAssistant(this.options));
  }
  protected override async registerTools(
    toolsManager: ToolsManager,
  ): Promise<void> {
    await toolsManager.registerTools([
      ...crmRecordTools(this.service, this.authz),
      ...crmWriteTools(this.service, this.authz),
    ]);
  }
}
