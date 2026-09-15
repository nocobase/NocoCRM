import { AppConfig } from '@nocobase/app-server/config';
import { coreConfigs } from '@nocobase/app-server';
import type { ResolvedAppRuntimeConfigContext } from '@nocobase/app-server/runtime';
import type { ConfigProvider } from '@nocobase/config';
import { fileProvider } from '@nocobase/config/providers/file';
import { yamlParser } from '@nocobase/config/parsers/yaml';
import { jsonParser } from '@nocobase/config/parsers/json';
import path from 'node:path';
import { existsSync } from 'node:fs';

// config.example.yml documents `apiKey: ${OPENAI_API_KEY}`, but nothing in the
// framework expands that: the framework's own mechanism is a plugin declaring
// envMappings for its namespace, and the AI plugin declares none. So the
// placeholder is expanded here, on the file's text, before it is parsed. A
// placeholder naming an unset variable fails loudly — left in place it would
// be sent to the provider as a literal key and fail later with a 401 that
// points nowhere.
const placeholder = /\$\{([A-Z_][A-Z0-9_]*)\}/g;

function expandingProvider(
  inner: ConfigProvider,
  environment: Record<string, string | undefined>,
): ConfigProvider {
  return {
    name: `${inner.name}+env`,
    async read(context) {
      const result = await inner.read(context);
      if (result.kind !== 'bytes') return result;
      const text = new TextDecoder().decode(result.value).replace(
        placeholder,
        (_match, name: string) => {
          const value = environment[name];
          if (value === undefined)
            throw new Error(
              `Configuration references \${${name}} but the environment variable is not set. Define it in .env.local or the process environment.`,
            );
          return value;
        },
      );
      return { ...result, value: new TextEncoder().encode(text) };
    },
  };
}

export function createAppConfig(
  context: ResolvedAppRuntimeConfigContext,
): AppConfig<ResolvedAppRuntimeConfigContext> {
  const config = new AppConfig<ResolvedAppRuntimeConfigContext>(
    [...coreConfigs, ...context.configs],
    {
      context,
      environment: context.environment,
    },
  );
  const configuredPath =
    context.configPath ?? context.environment.APP_CONFIG_FILE;
  const configPath = resolveConfigFile(
    context.paths.root(configuredPath ?? 'config'),
  );
  const extension = path.extname(configPath).toLowerCase();
  const parser =
    extension === '.json' ? jsonParser() : yamlParser();

  config.load(
    expandingProvider(
      fileProvider(configPath, { optional: configuredPath === undefined }),
      context.environment,
    ),
    parser,
  );

  return config;
}

// Mirrors AppConfig.loadFile's lookup: a bare name resolves to the first of
// .yml / .yaml / .json that exists, else .yml.
function resolveConfigFile(filePath: string): string {
  if (path.extname(filePath)) return filePath;
  for (const extension of ['.yml', '.yaml', '.json']) {
    const candidate = `${filePath}${extension}`;
    if (existsSync(candidate)) return candidate;
  }
  return `${filePath}.yml`;
}
