import { aiManagerToken } from '@nocobase/app-plugin-ai-employee/server';
import { databaseManagerToken } from '@nocobase/db';
import { ServiceContainer } from '@nocobase/service-provider';
import { describe, expect, it } from 'vitest';
import { runModel } from '../../server/providers/crm/ai-model.js';

// The services enabled on the LLM services page, the lowest sort first.
const enabled = [
  {
    llmService: 'openai',
    provider: 'openai',
    enabledModels: [{ value: 'gpt' }],
  },
  {
    llmService: 'qwen',
    provider: 'dashscope',
    enabledModels: [{ value: 'qwen-max' }],
  },
];

const containerWith = (modelSettings: unknown) => {
  const container = new ServiceContainer();
  container.instance(aiManagerToken, {
    llmProviderManager: {
      listAllEnabledModels: async () => enabled,
      resolveModel: async () => ({ llmService: 'openai', model: 'gpt' }),
    },
  } as unknown as ReturnType<typeof container.resolve<typeof aiManagerToken>>);
  const chain = {
    selectFrom: () => chain,
    select: () => chain,
    where: () => chain,
    executeTakeFirst: async () => ({ modelSettings }),
  };
  container.instance(databaseManagerToken, {
    query: () => chain,
  } as unknown as ReturnType<
    typeof container.resolve<typeof databaseManagerToken>
  >);
  return container;
};

describe('CRM unattended run model', () => {
  it('uses the default service when the employee has no dedicated model', async () => {
    expect(await runModel(containerWith(null))).toEqual({ textJson: false });
  });

  it("follows the employee's dedicated model on the AI employees page", async () => {
    const run = await runModel(
      containerWith({
        enabled: true,
        models: [
          { llmService: 'deepseek', model: 'off' },
          { llmService: 'qwen', model: 'qwen-max' },
        ],
      }),
    );
    // The first of its models that is enabled, with Qwen's workarounds.
    expect(run).toEqual({
      model: {
        llmService: 'qwen',
        model: 'qwen-max',
        reasoning: { mode: 'off' },
      },
      textJson: true,
    });
  });

  it('ignores dedicated models that are switched off', async () => {
    const run = await runModel(
      containerWith(
        JSON.stringify({
          enabled: false,
          models: [{ llmService: 'qwen', model: 'qwen-max' }],
        }),
      ),
    );
    expect(run).toEqual({ textJson: false });
  });
});
