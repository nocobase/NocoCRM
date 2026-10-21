import {
  defineAppConfig,
  envString,
  type AppConfigFactory,
} from '@nocobase/app-server/config';

// A model service as config.yml declares it under `ai.llmServices`, keyed by
// its name.
export interface CrmModelService {
  title?: string;
  provider?: string;
  enabled?: boolean;
  sort?: number;
  options?: Record<string, unknown>;
  enabledModels?: { value: string; label?: string }[];
}

export interface CrmAiConfig {
  llmServices: Record<string, CrmModelService>;
}

/**
 * The model services a deployment configures for the CRM's AI, which
 * server/providers/crm-agents/model-services.ts creates on the Agents
 * plugin's Models page at start when they are not there yet. Application
 * section: the AI Employee plugin that once owned `ai` is gone, and the
 * Agents plugin reads its services only from that page.
 */
const ai: AppConfigFactory<CrmAiConfig> = defineAppConfig({
  // DeepSeek alone by default (since 2026-10-21), so a deployment supplies
  // only its key through the environment variable below (a hosting
  // platform's variables page, NocoBase Studio's included). config.yml may
  // still change it or add services (Qwen through DashScope, OpenAI…), and
  // the Models page adds any other; one left without a key is not created.
  defaults: {
    llmServices: {
      deepseek: {
        title: 'DeepSeek',
        provider: 'deepseek',
        enabledModels: [
          { label: 'DeepSeek-V4.1-Flash', value: 'deepseek-flash' },
        ],
        enabled: true,
        sort: 20,
      },
    },
  },
  // Its key comes from the environment (.env.local in development). It is
  // optional: without it the service is left out, and the AI is off without
  // any (crm-agents/model-services.ts), so a deployment platform such as
  // NocoBase Studio must not hold a release back for it.
  env: {
    DEEPSEEK_API_KEY: envString('llmServices.deepseek.options.apiKey', {
      description: "The DeepSeek model service's API key.",
      secret: true,
      required: false,
    }),
  },
});

export default ai;
