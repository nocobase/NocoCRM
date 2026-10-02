import { aiManagerToken } from '@nocobase/app-plugin-ai-employee/server';
import { databaseManagerToken } from '@nocobase/db';
import type { ServiceResolver } from '@nocobase/service-provider';
import { CRM_ASSISTANT } from '../../ai/employees/crm-assistant.js';

// The model for an unattended run that needs a structured result (a lead
// organised from text, a lead's evaluation): the one the plugin would pick
// for the CRM employee anyway (its dedicated model, else the default), with
// thinking switched off where the provider refuses the forced tool call a
// structured result is made with while it thinks — DashScope's Qwen models
// answer "The tool_choice parameter does not support being set to required
// or object in thinking mode" (verified 2026-09-30 for qwen3.8-max,
// qwen3.8-flash and qwen3.7-plus; each works with thinking off). The plugin
// passes a run's `state.model` through as given, `reasoning` included,
// though its type names only the service and model. Undefined leaves the
// choice to the plugin.
export async function structuredRunModel(
  container: ServiceResolver,
): Promise<{ llmService: string; model: string } | undefined> {
  return (await runModel(container)).model;
}

// The same, with whether the structured result is better asked for as JSON
// in the reply (`textJson`): Qwen, given the plugin's structured result
// after an earlier turn, called two tools in one step, which the agent's
// graph refuses ("Invalid update for channel jumpTo", 2026-09-30).
export async function runModel(container: ServiceResolver): Promise<{
  model?: { llmService: string; model: string };
  textJson: boolean;
}> {
  if (!container.has(aiManagerToken)) return { textJson: false };
  const manager = container.resolve(aiManagerToken).llmProviderManager;
  try {
    const enabled = await manager.listAllEnabledModels();
    const model =
      (await dedicatedModel(container, enabled).catch(() => undefined)) ??
      (await manager.resolveModel());
    const service = enabled.find(
      (item) => item.llmService === model.llmService,
    );
    return service?.provider === 'dashscope'
      ? {
          model: { ...model, reasoning: { mode: 'off' } } as {
            llmService: string;
            model: string;
          },
          textJson: true,
        }
      : { textJson: false };
  } catch {
    return { textJson: false };
  }
}

// The model the plugin runs the CRM employee on when its dedicated model
// configuration (AI employees → the employee → Models) is on: the first of
// its models that is enabled, as the plugin's own `resolveModel(employee)`
// picks it. The plugin does not export that manager, so the setting is read
// here; without it, or when none of its models is enabled, the default
// applies (the enabled LLM service with the lowest sort).
async function dedicatedModel(
  container: ServiceResolver,
  enabled: { llmService: string; enabledModels: { value: string }[] }[],
): Promise<{ llmService: string; model: string } | undefined> {
  if (!container.has(databaseManagerToken)) return undefined;
  const row = await container
    .resolve(databaseManagerToken)
    .query()
    .selectFrom('aiEmployees')
    .select('modelSettings')
    .where('username', '=', CRM_ASSISTANT)
    .executeTakeFirst();
  let settings: unknown = row?.modelSettings;
  if (typeof settings === 'string') settings = JSON.parse(settings);
  const value = settings as
    | {
        enabled?: boolean;
        models?: { llmService?: string; model?: string }[];
        llmService?: string;
        model?: string;
      }
    | null
    | undefined;
  if (!value?.enabled) return undefined;
  const models = (Array.isArray(value.models) ? value.models : []).filter(
    (item): item is { llmService: string; model: string } =>
      Boolean(item?.llmService && item?.model),
  );
  if (!models.length && value.llmService && value.model)
    models.push({ llmService: value.llmService, model: value.model });
  return models.find((item) =>
    enabled.some(
      (service) =>
        service.llmService === item.llmService &&
        service.enabledModels.some((option) => option.value === item.model),
    ),
  );
}
