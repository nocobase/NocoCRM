import { AIResourceRegistrar } from '@nocobase/app-plugin-ai-employee/server';
import type { AIEmployeeManager, ToolsManager } from '@nocobase/ai-employee';
import type { AppAuthorization } from '@nocobase/app-plugin-authorization/server';
import type { CrmService } from '../providers/crm/service.js';
import {
  CRM_ASSISTANT,
  crmAssistant,
  CRM_CHAT_SKILLS,
  REPORT_SKILLS,
  type CrmAssistantOptions,
} from './employees/crm-assistant.js';
import { crmRecordTools } from './tools/crm-records.js';
import { crmWriteTools } from './tools/crm-writes.js';
import { encodeRow } from '../providers/crm/values.js';

// Marks that the lead follow-up skill joined a saved skill selection.
const CHAT_SKILLS_MARKER = 'ai-skills-lead-follow-up-v1';

// The application's AI resources, registered with the AI Employee plugin
// from CrmProvider: the CRM assistant employee, its read tools and its
// write tools (the latter held for the user's confirmation by the plugin).
// Tools register before the employee, as the plugin expects.
export class CrmAiResources extends AIResourceRegistrar {
  constructor(
    private readonly service: CrmService,
    private readonly authz: Pick<AppAuthorization, 'for'>,
    private readonly options: CrmAssistantOptions,
  ) {
    super({ source: 'crm' });
  }
  protected override async registerAIEmployees(
    aiEmployeeManager: AIEmployeeManager,
  ): Promise<void> {
    await aiEmployeeManager.registerEmployee(crmAssistant(this.options));
    // Every general skill of the plugin is open to an employee whose skill
    // selection was never saved, and the plugin's data skills would give the
    // model table queries beside the CRM's own tools. The first registration
    // saves the report skill as the selection; an administrator may change
    // it on the employee's Skills tab, and registration keeps their choice.
    const employee = await aiEmployeeManager.getEmployee(CRM_ASSISTANT);
    if (employee && employee.skillSettings?.enabledSkills === undefined)
      await aiEmployeeManager.upsertEmployee({
        ...employee,
        skillSettings: {
          ...employee.skillSettings,
          enabledSkills: [...REPORT_SKILLS, ...CRM_CHAT_SKILLS],
        },
      });
    // A selection saved before the lead follow-up skill came gets it once
    // (marker in crmSettings); removed afterwards, it stays removed.
    else if (employee && !(await this.marked(CHAT_SKILLS_MARKER))) {
      const enabled = employee.skillSettings?.enabledSkills ?? [];
      await aiEmployeeManager.upsertEmployee({
        ...employee,
        skillSettings: {
          ...employee.skillSettings,
          enabledSkills: [
            ...enabled,
            ...CRM_CHAT_SKILLS.filter((name) => !enabled.includes(name)),
          ],
        },
      });
      await this.mark(CHAT_SKILLS_MARKER);
    }
  }
  private async marked(id: string): Promise<boolean> {
    return Boolean(
      await this.service.database
        .query()
        .selectFrom('crmSettings')
        .select('id')
        .where('id', '=', id)
        .executeTakeFirst(),
    );
  }
  private async mark(id: string): Promise<void> {
    await this.service.database
      .query()
      .insertInto('crmSettings')
      .values(encodeRow({ id, value: { version: 1 }, updatedAt: new Date() }))
      .execute();
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
