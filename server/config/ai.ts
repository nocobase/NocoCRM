import { envString, type AppConfigFactory } from '@nocobase/app-server/config';
import {
  defineAIConfig,
  type AIApplicationConfig,
} from '@nocobase/app-plugin-ai-employee/server/config';

const ai: AppConfigFactory<AIApplicationConfig> = defineAIConfig({
  // Map a secret onto the field of one service it sets, keyed by that
  // service's name, such as
  // `OPENAI_API_KEY: envString('llmServices.openai.options.apiKey')` or
  // `GITHUB_MCP_TOKEN: envString('mcpServers.github.headers.Authorization')`.
  // Application change: the CRM's services in config.yml (qwen, openai,
  // deepseek) take their keys from the environment (.env.local in
  // development), since the plugin no longer expands `${NAME}` there.
  env: {
    DASHSCOPE_API_KEY: envString('llmServices.qwen.options.apiKey'),
    OPENAI_API_KEY: envString('llmServices.openai.options.apiKey'),
    OPENAI_BASE_URL: envString('llmServices.openai.options.baseURL'),
    DEEPSEEK_API_KEY: envString('llmServices.deepseek.options.apiKey'),
  },
  defaults: () => ({
    storage: {},
    aiEmployee: { storage: {} },
    aiKnowledgeBase: {
      enabled: false,
      vectorDatabases: [],
      manifests: [],
    },
    llmServices: {},
    skills: { paths: [] },
    mcpServers: {},
  }),
});

export default ai;
