import type { Application } from '@nocobase/app-server/application';
import type { Agents } from '@nocobase/app-plugin-agents/server/tokens';
import { loggingToken } from '@nocobase/app-server/logging';
import type { CrmModelService } from '../../config/ai.js';

/**
 * The model services online agents call, created from the AI section of the
 * configuration (`ai.llmServices`, keys from the environment), so a
 * deployment configured for the CRM's assistant gets them without anyone
 * typing a key into the Models page.
 *
 * @temporary(nocobase-official) The Agents plugin reads model services only
 * from its Models page and API. Remove this once it can be configured from
 * the application's configuration. Checklist: a configured service with a
 * key appears on the Models page under the same name; one that exists is
 * never changed (an administrator's edits stand); without `secrets.keys` it
 * is skipped with a warning rather than failing the start.
 */

type ConfiguredService = CrmModelService;

// The provider names config.yml uses (the AI Employee plugin's, which the
// CRM once ran on), as the Agents plugin's.
const PROVIDERS: Record<string, string> = {
  dashscope: 'alibaba',
  openai: 'openai',
  deepseek: 'deepseek',
};
// The Agents plugin's Alibaba provider calls the international endpoint;
// the CRM's DashScope keys are the China region's.
const DASHSCOPE_CHINA = 'https://dashscope.aliyuncs.com/compatible-mode/v1';

export async function provisionModelServices(
  app: Application,
  agents: Agents,
): Promise<void> {
  const configured =
    app.config?.get<Record<string, ConfiguredService>>('ai.llmServices') ?? {};
  let existing: Set<string>;
  try {
    existing = new Set(
      (await agents.models.services.list()).map((service) => service.name),
    );
  } catch {
    return;
  }
  for (const [name, service] of Object.entries(configured)) {
    const provider = PROVIDERS[service.provider ?? ''];
    const apiKey = service.options?.apiKey;
    const models = service.enabledModels ?? [];
    if (
      existing.has(name) ||
      service.enabled === false ||
      !provider ||
      typeof apiKey !== 'string' ||
      !apiKey ||
      !models.length
    )
      continue;
    const baseUrl =
      typeof service.options?.baseURL === 'string'
        ? service.options.baseURL
        : provider === 'alibaba'
          ? DASHSCOPE_CHINA
          : null;
    try {
      // Created under its key, which the plugin makes its name from and
      // agents name it by, then given the title config.yml writes it under
      // (OpenAI rather than openai); the name never changes with the title.
      const created = await agents.models.services.create({
        title: name,
        provider: provider as never,
        baseUrl,
        apiKey,
        models: models.map((model) => ({
          value: model.value,
          label: model.label,
        })),
      });
      if (service.title && service.title !== created.title)
        await agents.models.services.update(created.name, {
          title: service.title,
        });
    } catch (error) {
      app.container
        .resolve(loggingToken)
        .getLogger('crm-agents')
        .warn({ service: name, error }, 'model service not created');
    }
  }
}
